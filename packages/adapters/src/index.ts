import { GitHubAdapter } from './github/index.js'
import { WebhookAdapter } from './webhook/index.js'
import type { AdapterPlugin, FeedbackEvent } from './base.js'
import { prisma } from '@trooper/db'
import { sendToDeadLetter, sanitizePayload } from './dead-letter.js'

export type { AdapterPlugin, FeedbackEvent }
export { FeedbackEventSchema } from './base.js'
export { GitHubAdapter } from './github/index.js'
export { WebhookAdapter } from './webhook/index.js'
export { sendToDeadLetter, sanitizePayload } from './dead-letter.js'

const registry = new Map<string, AdapterPlugin>([
  ['github', new GitHubAdapter()],
  ['webhook', new WebhookAdapter()],
])

// Third-party adapters register themselves here
export function registerAdapter(adapter: AdapterPlugin) {
  registry.set(adapter.name, adapter)
}

export function getAdapter(name: string): AdapterPlugin | undefined {
  return registry.get(name)
}

// Ingest a raw payload from any registered source, dedup, and persist a ticket.
// Failed transformations go to the dead-letter queue — never silently dropped.
export async function ingest(
  source: string,
  rawPayload: unknown,
  headers: Record<string, string>
): Promise<string | null> {
  const adapter = registry.get(source)
  if (!adapter) throw new Error(`No adapter registered for source: ${source}`)

  const sanitized = sanitizePayload(rawPayload)

  let event: FeedbackEvent | null
  try {
    event = await adapter.parse(sanitized, headers)
  } catch (err: any) {
    await sendToDeadLetter(source, rawPayload, err.message ?? 'parse error')
    return null
  }

  if (!event) return null

  // Dedup: if a ticket with the same sourceRef + repo already exists, skip
  if (event.sourceRef) {
    const existing = await prisma.ticket.findFirst({
      where: { source: event.source, sourceRef: event.sourceRef, repoOwner: event.repoOwner, repoName: event.repoName },
    })
    if (existing) return existing.id
  }

  const ticket = await prisma.ticket.create({
    data: {
      type: event.type,
      title: event.title,
      body: event.body,
      source: event.source,
      sourceRef: event.sourceRef,
      repoOwner: event.repoOwner,
      repoName: event.repoName,
      metadata: event.metadata ? JSON.stringify(event.metadata) : null,
    },
  })

  await prisma.auditEntry.create({
    data: { ticketId: ticket.id, event: 'ticket.created', payload: JSON.stringify({ source, sourceRef: event.sourceRef }) },
  })

  return ticket.id
}
