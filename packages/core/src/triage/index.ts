// Borrowed from gbrain signal-detector:
// "captures original thinking and entity mentions with equal priority"
// "operates continuously on inbound signals"
// "ideas are intellectual capital, entities are bookkeeping"
//
// Adapted for Trooper: instead of capturing ideas for a knowledge graph,
// we score incoming tickets for priority so the agent queue is ordered smartly.

export type TicketPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW'

export interface TriageResult {
  priority: TicketPriority
  score: number       // 0–100
  signals: string[]   // human-readable reasons for the score
}

// Signal weights (adapted from gbrain's entity/idea detection phases)
const SIGNALS: Array<{ pattern: RegExp; weight: number; label: string }> = [
  // Critical signals
  { pattern: /crash|down|outage|500|broken|not working|production/i, weight: 30, label: 'production issue' },
  { pattern: /security|vulnerability|exploit|injection|xss|sqli/i, weight: 35, label: 'security concern' },
  { pattern: /data loss|deleted|corrupted|lost/i, weight: 30, label: 'data integrity issue' },

  // High signals
  { pattern: /login|auth|payment|checkout|signup|onboarding/i, weight: 20, label: 'critical user path' },
  { pattern: /all users|everyone|blocking/i, weight: 15, label: 'broad impact' },
  { pattern: /regression|worked before|used to work/i, weight: 15, label: 'regression' },

  // Normal signals
  { pattern: /feature|request|would be nice|enhancement/i, weight: 5, label: 'feature request' },
  { pattern: /performance|slow|lag|timeout/i, weight: 10, label: 'performance issue' },

  // Low signals
  { pattern: /typo|cosmetic|style|color|font|spacing/i, weight: -10, label: 'cosmetic only' },
  { pattern: /nice to have|someday|low priority|not urgent/i, weight: -15, label: 'explicitly low priority' },
]

export function triageTicket(ticket: { type: string; title: string; body: string }): TriageResult {
  const text = `${ticket.title} ${ticket.body}`
  let score = 50 // base score
  const signals: string[] = []

  // Bug type starts higher, feedback starts lower
  if (ticket.type === 'BUG') score += 10
  if (ticket.type === 'FEEDBACK') score -= 10

  for (const signal of SIGNALS) {
    if (signal.pattern.test(text)) {
      score += signal.weight
      signals.push(signal.label)
    }
  }

  score = Math.max(0, Math.min(100, score))

  const priority: TicketPriority =
    score >= 80 ? 'CRITICAL' :
    score >= 60 ? 'HIGH' :
    score >= 35 ? 'NORMAL' : 'LOW'

  return { priority, score, signals }
}
