import { prisma } from '@trooper/db'

export async function enqueue(ticketId: string): Promise<string> {
  // Prevent duplicate jobs for the same ticket
  const existing = await prisma.job.findFirst({
    where: { ticketId, status: { in: ['PENDING', 'RUNNING'] } },
  })
  if (existing) return existing.id

  const job = await prisma.job.create({ data: { ticketId } })
  return job.id
}

// Atomically claim the next pending job.
// Uses a status transition (PENDING → RUNNING) as a lock so concurrent
// workers don't double-process the same job.
export async function dequeue(): Promise<{ id: string; ticketId: string } | null> {
  const job = await prisma.job.findFirst({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
  })
  if (!job) return null

  // Optimistic update — only succeeds if status is still PENDING
  const claimed = await prisma.job.updateMany({
    where: { id: job.id, status: 'PENDING' },
    data: { status: 'RUNNING', attempts: { increment: 1 } },
  })

  if (claimed.count === 0) return null // another worker claimed it first
  return { id: job.id, ticketId: job.ticketId }
}

export async function completeJob(jobId: string): Promise<void> {
  await prisma.job.update({ where: { id: jobId }, data: { status: 'DONE' } })
}

export async function failJob(jobId: string, error: string): Promise<void> {
  const job = await prisma.job.findUniqueOrThrow({ where: { id: jobId } })

  if (job.attempts < job.maxAttempts) {
    // Re-queue for retry
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'PENDING', error },
    })
  } else {
    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'FAILED', error },
    })
  }
}
