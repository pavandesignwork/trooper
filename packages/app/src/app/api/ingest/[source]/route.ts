import { NextRequest, NextResponse } from 'next/server'
import { ingest } from '@trooper/adapters'
import { triageTicket, enqueue } from '@trooper/core'
import { prisma } from '@trooper/db'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest, { params }: { params: { source: string } }) {
  try {
    // Rate limit by IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const rl = checkRateLimit(ip)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      )
    }

    // Validate webhook secret if configured
    const secret = process.env.TROOPER_WEBHOOK_SECRET
    if (secret) {
      const provided = req.headers.get('x-trooper-secret')
      if (provided !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const payload = await req.json()
    const headers = Object.fromEntries(req.headers.entries())

    const ticketId = await ingest(params.source, payload, headers)
    if (!ticketId) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    // Triage: score and store priority
    const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } })
    const triage = triageTicket({ type: ticket.type, title: ticket.title, body: ticket.body })

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { priority: triage.priority, priorityScore: triage.score },
    })

    await prisma.auditEntry.create({
      data: {
        ticketId,
        event: 'ticket.triaged',
        payload: JSON.stringify({ priority: triage.priority, score: triage.score, signals: triage.signals }),
      },
    })

    // Enqueue for the worker — survives server restarts, retries on failure
    await enqueue(ticketId)

    return NextResponse.json({ ok: true, ticketId, priority: triage.priority })
  } catch (err: any) {
    if (err.message?.includes('No adapter registered')) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[trooper] ingest error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
