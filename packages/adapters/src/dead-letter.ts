import { prisma } from '@trooper/db'

// Borrowed from gbrain webhook-transforms + ingest:
// "raw payloads stored in dead-letter queue if transformation fails"
// "every transformed event undergoes entity extraction and sanitization"
// Failed ingestions are never silently dropped — they're stored for inspection and retry.

export interface DeadLetterEntry {
  id: string
  source: string
  rawPayload: string
  error: string
  retryCount: number
  createdAt: Date
}

export async function sendToDeadLetter(source: string, rawPayload: unknown, error: string): Promise<void> {
  await prisma.config.upsert({
    where: { key: `dlq:${source}:${Date.now()}` },
    update: {},
    create: {
      key: `dlq:${source}:${Date.now()}`,
      value: JSON.stringify({ source, rawPayload, error, retryCount: 0, createdAt: new Date().toISOString() }),
    },
  })
}

// Sanitize incoming payload before processing — prevent XSS/injection via webhook payloads
// Borrowed from gbrain webhook-transforms: "sanitization to prevent security vulnerabilities"
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
