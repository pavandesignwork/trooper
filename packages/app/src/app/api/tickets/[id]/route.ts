import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@trooper/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: { iterations: { orderBy: { iterationNumber: 'asc' } }, auditLog: { orderBy: { createdAt: 'asc' } } },
  })
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(ticket)
}

// Called by GitHub webhook when a PR is closed/merged
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { prNumber, outcome, reviewFeedback } = body as {
    prNumber: number
    outcome: 'approved' | 'rejected'
    reviewFeedback?: string
  }

  const iteration = await prisma.prIteration.findFirst({
    where: { ticketId: params.id, prNumber },
  })

  if (!iteration) return NextResponse.json({ error: 'Iteration not found' }, { status: 404 })

  await prisma.prIteration.update({
    where: { id: iteration.id },
    data: { outcome, reviewFeedback },
  })

  if (outcome === 'approved') {
    await prisma.ticket.update({ where: { id: params.id }, data: { status: 'MERGED' } })
    await prisma.auditEntry.create({ data: { ticketId: params.id, event: 'pr.approved', payload: JSON.stringify({ prNumber }) } })
  } else {
    await prisma.ticket.update({ where: { id: params.id }, data: { status: 'NEEDS_REWORK' } })
    await prisma.auditEntry.create({ data: { ticketId: params.id, event: 'pr.rejected', payload: JSON.stringify({ prNumber, reviewFeedback }) } })

    // Re-queue via the job queue — worker picks it up, retries on failure
    const { enqueue } = await import('@trooper/core')
    await enqueue(params.id)
  }

  return NextResponse.json({ ok: true })
}
