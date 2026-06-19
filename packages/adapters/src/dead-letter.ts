import { prisma } from '@trooper/db'
import { randomUUID } from 'node:crypto'

export async function sendToDeadLetter(source: string, rawPayload: unknown, error: string): Promise<void> {
  // Use a UUID suffix to avoid key collisions on high-throughput ingestion
  await prisma.config.create({
    data: {
      key: `dlq:${source}:${randomUUID()}`,
      value: JSON.stringify({ source, rawPayload, error, retryCount: 0, createdAt: new Date().toISOString() }),
    },
  })
}

export function sanitizePayload(input: unknown): unknown {
  if (typeof input === 'string') {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .trim()
  }
  if (Array.isArray(input)) return input.map(sanitizePayload)
  if (input && typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input as Record<string, unknown>).map(([k, v]) => [k, sanitizePayload(v)])
    )
  }
  return input
}
