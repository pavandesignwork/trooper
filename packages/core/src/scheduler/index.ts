import { prisma } from '@trooper/db'

export interface SchedulerOptions {
  stalePendingMinutes?: number  // re-queue after N minutes pending (default: 30)
  quietHoursStart?: number      // hour to stop scheduling (default: 23)
  quietHoursEnd?: number        // hour to resume scheduling (default: 8)
  onRequeue?: (ticketId: string, reason: string) => Promise<void>
}

export async function runScheduler(options: SchedulerOptions = {}): Promise<{ requeued: string[] }> {
  const {
    stalePendingMinutes = 30,
    quietHoursStart = 23,
    quietHoursEnd = 8,
    onRequeue,
  } = options

  // Respect quiet hours — no agent runs late at night
  const hour = new Date().getHours()
  const inQuietHours =
    quietHoursStart > quietHoursEnd
      ? hour >= quietHoursStart || hour < quietHoursEnd
      : hour >= quietHoursStart && hour < quietHoursEnd

  if (inQuietHours) return { requeued: [] }

  const requeued: string[] = []
  const staleThreshold = new Date(Date.now() - stalePendingMinutes * 60 * 1000)

  // Find stale PENDING tickets
  const stalePending = await prisma.ticket.findMany({
    where: { status: 'PENDING', updatedAt: { lt: staleThreshold } },
    orderBy: { updatedAt: 'asc' },
    take: 5, // max 5 per scheduler run to avoid collisions (gbrain pattern: max 1 per slot)
  })

  for (const ticket of stalePending) {
    await prisma.auditEntry.create({
      data: { ticketId: ticket.id, event: 'scheduler.requeue', payload: JSON.stringify({ reason: 'stale_pending', staleSinceMinutes: stalePendingMinutes }) },
    })
    requeued.push(ticket.id)
    await onRequeue?.(ticket.id, 'stale_pending')
  }

  // Find NEEDS_REWORK tickets not retried in 10 minutes
  const reworkThreshold = new Date(Date.now() - 10 * 60 * 1000)
  const needsRework = await prisma.ticket.findMany({
    where: { status: 'NEEDS_REWORK', updatedAt: { lt: reworkThreshold } },
    orderBy: { updatedAt: 'asc' },
    take: 3,
  })

  for (const ticket of needsRework) {
    await prisma.auditEntry.create({
      data: { ticketId: ticket.id, event: 'scheduler.requeue', payload: JSON.stringify({ reason: 'needs_rework_retry' }) },
    })
    requeued.push(ticket.id)
    await onRequeue?.(ticket.id, 'needs_rework_retry')
  }

  return { requeued }
}

// Simple in-process interval scheduler (no Redis/BullMQ required)
// For production, swap this with a proper cron job or BullMQ repeatable job
export function startScheduler(
  intervalMs: number,
  options: SchedulerOptions & { runAgent: (ticketId: string) => Promise<void> }
): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      const { requeued } = await runScheduler({
        ...options,
        onRequeue: async (ticketId) => {
          await options.runAgent(ticketId)
        },
      })
      if (requeued.length > 0) {
        console.log(`[trooper:scheduler] requeued ${requeued.length} ticket(s):`, requeued)
      }
    } catch (err) {
      console.error('[trooper:scheduler] error:', err)
    }
  }, intervalMs)
}
