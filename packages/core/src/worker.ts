import { config } from 'dotenv'
config()

import { dequeue, completeJob, failJob } from './queue/index.js'
import { runAgent } from './agent/index.js'
import { startScheduler } from './scheduler/index.js'
import type { ModelConfig } from './models/types.js'

const POLL_INTERVAL_MS = 5_000

const modelConfig: ModelConfig = {
  provider: (process.env.TROOPER_MODEL_PROVIDER ?? 'claude') as ModelConfig['provider'],
  model: process.env.TROOPER_MODEL_NAME ?? 'claude-sonnet-4-6',
  apiKey: process.env.TROOPER_API_KEY,
}

const githubToken = process.env.TROOPER_GITHUB_TOKEN

if (!githubToken) {
  console.error('[worker] TROOPER_GITHUB_TOKEN is required')
  process.exit(1)
}

async function processNext(): Promise<void> {
  const job = await dequeue()
  if (!job) return

  console.log(`[worker] processing job ${job.id} for ticket ${job.ticketId}`)

  try {
    await runAgent({ ticketId: job.ticketId, modelConfig, githubToken: githubToken as string })
    await completeJob(job.id)
    console.log(`[worker] job ${job.id} completed`)
  } catch (err: any) {
    console.error(`[worker] job ${job.id} failed:`, err.message)
    await failJob(job.id, err.message)
  }
}

async function poll(): Promise<void> {
  try {
    await processNext()
  } catch (err) {
    console.error('[worker] poll error:', err)
  } finally {
    setTimeout(poll, POLL_INTERVAL_MS)
  }
}

// Start the scheduler alongside the worker (runs in the same process)
startScheduler(5 * 60 * 1000, {
  runAgent: async (ticketId) => {
    const { enqueue } = await import('./queue/index.js')
    await enqueue(ticketId)
  },
})

console.log('[worker] started — polling every 5s')
poll()
