// Simple in-memory sliding window rate limiter.
// Good enough for self-hosted single-instance deployments.
// For multi-instance: swap the Map for a Redis counter.

interface Window {
  count: number
  resetAt: number
}

const windows = new Map<string, Window>()
const WINDOW_MS = 60_000   // 1 minute window
const MAX_REQUESTS = 30    // max ingest calls per IP per minute

export function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const existing = windows.get(ip)

  if (!existing || now > existing.resetAt) {
    windows.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true }
  }

  if (existing.count >= MAX_REQUESTS) {
    return { allowed: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) }
  }

  existing.count++
  return { allowed: true }
}

// Prune stale entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now()
  for (const [ip, window] of windows) {
    if (now > window.resetAt) windows.delete(ip)
  }
}, 5 * 60_000)
