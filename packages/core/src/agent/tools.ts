import fs from 'node:fs/promises'
import path from 'node:path'
import { execSync } from 'node:child_process'

// Provider-agnostic tool loop using XML-style tool calls in plain text.
// Works with Claude, OpenAI, Gemini, Ollama, Groq — no native tool-use API needed.
//
// Model outputs blocks like:
//   <read_file><path>src/foo.ts</path></read_file>
//   <write_file><path>src/foo.ts</path><content>...</content></write_file>
//   <run_command><command>npm test</command></run_command>
//   <done>explanation of what was done</done>

export type ToolCall =
  | { type: 'read_file'; path: string }
  | { type: 'write_file'; path: string; content: string }
  | { type: 'list_files'; path: string }
  | { type: 'run_command'; command: string }
  | { type: 'done'; summary: string }

export interface ToolResult {
  tool: string
  output: string
  error?: boolean
}

export function parseToolCalls(text: string): ToolCall[] {
  const calls: ToolCall[] = []

  const readFile = /<read_file>\s*<path>([\s\S]*?)<\/path>\s*<\/read_file>/g
  for (const m of text.matchAll(readFile)) {
    calls.push({ type: 'read_file', path: m[1].trim() })
  }

  const writeFile = /<write_file>\s*<path>([\s\S]*?)<\/path>\s*<content>([\s\S]*?)<\/content>\s*<\/write_file>/g
  for (const m of text.matchAll(writeFile)) {
    calls.push({ type: 'write_file', path: m[1].trim(), content: m[2] })
  }

  const listFiles = /<list_files>\s*<path>([\s\S]*?)<\/path>\s*<\/list_files>/g
  for (const m of text.matchAll(listFiles)) {
    calls.push({ type: 'list_files', path: m[1].trim() })
  }

  const runCmd = /<run_command>\s*<command>([\s\S]*?)<\/command>\s*<\/run_command>/g
  for (const m of text.matchAll(runCmd)) {
    calls.push({ type: 'run_command', command: m[1].trim() })
  }

  const done = /<done>([\s\S]*?)<\/done>/
  const doneMatch = text.match(done)
  if (doneMatch) {
    calls.push({ type: 'done', summary: doneMatch[1].trim() })
  }

  return calls
}

function safeResolve(workDir: string, userPath: string): string | null {
  const resolved = path.resolve(workDir, userPath)
  // Reject any path that escapes the working directory
  if (!resolved.startsWith(path.resolve(workDir) + path.sep) && resolved !== path.resolve(workDir)) {
    return null
  }
  return resolved
}

export async function executeTool(call: ToolCall, workDir: string): Promise<ToolResult> {
  switch (call.type) {
    case 'read_file': {
      const fullPath = safeResolve(workDir, call.path)
      if (!fullPath) return { tool: 'read_file', output: `Blocked: path escapes working directory`, error: true }
      try {
        const content = await fs.readFile(fullPath, 'utf-8')
        return { tool: 'read_file', output: content }
      } catch {
        return { tool: 'read_file', output: `File not found: ${call.path}`, error: true }
      }
    }

    case 'write_file': {
      const fullPath = safeResolve(workDir, call.path)
      if (!fullPath) return { tool: 'write_file', output: `Blocked: path escapes working directory`, error: true }
      try {
        await fs.mkdir(path.dirname(fullPath), { recursive: true })
        await fs.writeFile(fullPath, call.content, 'utf-8')
        return { tool: 'write_file', output: `Written: ${call.path}` }
      } catch (err: any) {
        return { tool: 'write_file', output: `Failed to write ${call.path}: ${err.message}`, error: true }
      }
    }

    case 'list_files': {
      const fullPath = safeResolve(workDir, call.path)
      if (!fullPath) return { tool: 'list_files', output: `Blocked: path escapes working directory`, error: true }
      try {
        const entries = await fs.readdir(fullPath, { withFileTypes: true })

        const lines = entries
          .filter((e) => !['node_modules', '.git', '.next', 'dist'].includes(e.name))
          .map((e) => `${e.isDirectory() ? 'd' : 'f'} ${e.name}`)
        return { tool: 'list_files', output: lines.join('\n') }
      } catch {
        return { tool: 'list_files', output: `Directory not found: ${call.path}`, error: true }
      }
    }

    case 'run_command': {
      // Safety: block dangerous commands
      const blocked = /rm\s+-rf|>\/dev\/null|sudo|curl|wget|chmod\s+777/
      if (blocked.test(call.command)) {
        return { tool: 'run_command', output: `Blocked command: ${call.command}`, error: true }
      }
      try {
        const output = execSync(call.command, { cwd: workDir, timeout: 60_000, stdio: 'pipe' }).toString()
        return { tool: 'run_command', output: output.slice(0, 2000) }
      } catch (err: any) {
        const output = (err.stdout?.toString() ?? '') + (err.stderr?.toString() ?? '')
        return { tool: 'run_command', output: output.slice(0, 2000), error: true }
      }
    }

    case 'done':
      return { tool: 'done', output: call.summary }
  }
}

export function formatToolResult(result: ToolResult): string {
  return `<tool_result tool="${result.tool}"${result.error ? ' error="true"' : ''}>\n${result.output}\n</tool_result>`
}

export const TOOLS_SYSTEM_ADDENDUM = `
## Tools available to you

Use these XML tags to interact with the codebase. Call one or more tools per turn.

\`\`\`
<read_file>
<path>relative/path/to/file.ts</path>
</read_file>

<list_files>
<path>relative/path/</path>
</list_files>

<write_file>
<path>relative/path/to/file.ts</path>
<content>
full file content here
</content>
</write_file>

<run_command>
<command>npm test</command>
</run_command>

<done>
Brief summary of all changes made.
</done>
\`\`\`

Rules:
- Always read a file before writing it — never overwrite without seeing current content
- Use <done> only when all changes are complete and tested
- If <run_command> returns errors, fix them before calling <done>
- Write complete file contents — never partial or truncated
`
