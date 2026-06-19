import { simpleGit } from 'simple-git'
import { Octokit } from '@octokit/rest'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs/promises'
import { prisma } from '@trooper/db'
import { createModel } from '../models/index.js'
import { SYSTEM_PROMPT, buildPlanningPrompt } from './prompts.js'
import { mapRepo, formatRepoMapForPrompt } from './repo-mapper.js'
import { runSmokeTest, formatSmokeTestFailure } from './smoke-test.js'
import { parseToolCalls, executeTool, formatToolResult, TOOLS_SYSTEM_ADDENDUM } from './tools.js'
import type { ModelConfig, Message } from '../models/types.js'

const MAX_TOOL_ITERATIONS = 20  // prevent infinite loops

export interface AgentRunOptions {
  ticketId: string
  modelConfig: ModelConfig
  githubToken: string
}

export async function runAgent(options: AgentRunOptions): Promise<void> {
  const { ticketId, modelConfig, githubToken } = options
  const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } })

  await prisma.ticket.update({ where: { id: ticketId }, data: { status: 'PLANNING' } })
  await audit(ticketId, 'agent.started', { provider: modelConfig.provider, model: modelConfig.model })

  const prevIterations = await prisma.prIteration.findMany({
    where: { ticketId },
    orderBy: { iterationNumber: 'desc' },
  })
  const iterationNumber = (prevIterations[0]?.iterationNumber ?? 0) + 1
  const previousFeedback = prevIterations[0]?.reviewFeedback ?? undefined

  const model = createModel(modelConfig)
  const octokit = new Octokit({ auth: githubToken })

  // ── 1. Clone repo ────────────────────────────────────────────────────────
  const workDir = path.join(os.tmpdir(), `trooper-${ticketId}-${iterationNumber}`)
  await fs.mkdir(workDir, { recursive: true })
  const git = simpleGit(workDir)
  await git.clone(
    `https://x-access-token:${githubToken}@github.com/${ticket.repoOwner}/${ticket.repoName}.git`,
    workDir,
    ['--depth=1']
  )
  const branchName = `trooper/${ticketId}/v${iterationNumber}`
  await git.checkoutLocalBranch(branchName)

  // ── 2. Map the repo (repo-architecture skill) ─────────────────────────────
  const repoMap = await mapRepo(workDir)
  await audit(ticketId, 'agent.repo_mapped', {
    language: repoMap.language,
    frameworks: repoMap.frameworks,
    testCommand: repoMap.testCommand,
  })

  await prisma.ticket.update({ where: { id: ticketId }, data: { status: 'IN_PROGRESS' } })

  // ── 3. Tool-use loop: plan → read → write → repeat until <done> ──────────
  const systemPrompt = SYSTEM_PROMPT + '\n\n' + TOOLS_SYSTEM_ADDENDUM

  const messages: Message[] = [
    {
      role: 'user',
      content: buildPlanningPrompt({
        id: ticket.id,
        type: ticket.type,
        title: ticket.title,
        body: ticket.body,
        previousFeedback,
        repoContext: formatRepoMapForPrompt(repoMap),
      }),
    },
  ]

  let agentSummary = ''
  let totalTokens = 0
  let iterations = 0
  let done = false

  while (!done && iterations < MAX_TOOL_ITERATIONS) {
    iterations++

    const result = await model.complete({ systemPrompt, messages, maxTokens: 8096 })
    totalTokens += result.inputTokens + result.outputTokens

    messages.push({ role: 'assistant', content: result.content })

    const toolCalls = parseToolCalls(result.content)

    if (toolCalls.length === 0) {
      // Model produced text but no tool calls — ask it to continue with tools
      messages.push({
        role: 'user',
        content: 'Continue. Use the XML tool format to read files, write changes, or call <done> when finished.',
      })
      continue
    }

    const toolResults: string[] = []

    for (const call of toolCalls) {
      if (call.type === 'done') {
        agentSummary = call.summary
        done = true
        break
      }
      const toolResult = await executeTool(call, workDir)
      toolResults.push(formatToolResult(toolResult))
      await audit(ticketId, `agent.tool.${call.type}`, {
        path: 'path' in call ? call.path : undefined,
        error: toolResult.error,
      })
    }

    if (!done && toolResults.length > 0) {
      messages.push({ role: 'user', content: toolResults.join('\n\n') })
    }
  }

  await audit(ticketId, 'agent.completed', { iterations, totalTokens, summary: agentSummary })

  // ── 4. Smoke test (smoke-test skill) ─────────────────────────────────────
  const smokeResult = await runSmokeTest(workDir, repoMap.testCommand)
  await audit(ticketId, 'agent.smoke_test', { passed: smokeResult.passed })

  if (!smokeResult.passed) {
    // Feed failures back into the agent for one fix attempt
    const fixPrompt = `Tests failed after your changes. Fix them before we can open the PR.\n\n${formatSmokeTestFailure(smokeResult)}`
    messages.push({ role: 'user', content: fixPrompt })

    let fixDone = false
    let fixIterations = 0

    while (!fixDone && fixIterations < 10) {
      fixIterations++
      const fixResult = await model.complete({ systemPrompt, messages, maxTokens: 8096 })
      totalTokens += fixResult.inputTokens + fixResult.outputTokens
      messages.push({ role: 'assistant', content: fixResult.content })

      const fixCalls = parseToolCalls(fixResult.content)
      const fixToolResults: string[] = []

      for (const call of fixCalls) {
        if (call.type === 'done') { fixDone = true; break }
        const r = await executeTool(call, workDir)
        fixToolResults.push(formatToolResult(r))
      }

      if (!fixDone && fixToolResults.length > 0) {
        messages.push({ role: 'user', content: fixToolResults.join('\n\n') })
      }
    }

    // Re-run smoke test after fix attempt
    const retrySmoke = await runSmokeTest(workDir, repoMap.testCommand)
    await audit(ticketId, 'agent.smoke_test_retry', { passed: retrySmoke.passed })

    if (!retrySmoke.passed) {
      await audit(ticketId, 'agent.blocked_by_tests', {})
      await prisma.ticket.update({ where: { id: ticketId }, data: { status: 'NEEDS_REWORK' } })
      await fs.rm(workDir, { recursive: true, force: true })
      return
    }
  }

  // ── 5. Commit ─────────────────────────────────────────────────────────────
  const status = await git.status()
  if (status.files.length === 0) {
    await audit(ticketId, 'agent.no_changes', {})
    await fs.rm(workDir, { recursive: true, force: true })
    return
  }

  await git.add('.')
  await git.commit(`fix(${ticketId}): ${ticket.title} [trooper v${iterationNumber}]`)
  await git.push('origin', branchName)

  // ── 6. Open PR ────────────────────────────────────────────────────────────
  const prIteration = await prisma.prIteration.create({
    data: {
      ticketId,
      iterationNumber,
      branchName,
      agentPlan: agentSummary,
      agentReasoning: messages
        .filter((m) => m.role === 'assistant')
        .map((m) => m.content)
        .join('\n\n---\n\n')
        .slice(0, 10000),
    },
  })

  const prBody = buildPrBody(ticket, agentSummary, repoMap, iterationNumber, previousFeedback)
  const pr = await octokit.pulls.create({
    owner: ticket.repoOwner,
    repo: ticket.repoName,
    title: `[Trooper #${ticket.id}] ${ticket.title}`,
    body: prBody,
    head: branchName,
    base: 'main',
  })

  await prisma.prIteration.update({
    where: { id: prIteration.id },
    data: { prNumber: pr.data.number, prUrl: pr.data.html_url, outcome: 'pending' },
  })

  await prisma.ticket.update({ where: { id: ticketId }, data: { status: 'IN_REVIEW' } })
  await audit(ticketId, 'pr.opened', { prNumber: pr.data.number, prUrl: pr.data.html_url })

  await fs.rm(workDir, { recursive: true, force: true })
}

function buildPrBody(
  ticket: { id: string; type: string; title: string; body: string },
  agentSummary: string,
  repoMap: { language: string; frameworks: string[]; testCommand: string },
  iterationNumber: number,
  previousFeedback?: string
): string {
  return `## Trooper PR — Ticket \`${ticket.id}\`

**Type:** ${ticket.type} · **Iteration:** ${iterationNumber} · **Language:** ${repoMap.language}

---

### Original request
${ticket.body}

${previousFeedback ? `### Previous rejection feedback\n> ${previousFeedback.split('\n').join('\n> ')}\n` : ''}

### What the agent did
${agentSummary}

### Automated checks
- [x] Smoke tests passed (\`${repoMap.testCommand}\`)
- [ ] Human review required before merge

---
*Opened automatically by [Trooper](https://github.com/pavandesignwork/trooper). Review carefully before merging.*`
}

async function audit(ticketId: string, event: string, payload: object) {
  await prisma.auditEntry.create({
    data: { ticketId, event, payload: JSON.stringify(payload) },
  })
}
