import { prisma } from '@trooper/db'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function OverviewPage() {
  const [tickets, iterations, recentActivity] = await Promise.all([
    prisma.ticket.findMany({ select: { status: true, priority: true, createdAt: true } }),
    prisma.prIteration.findMany({ select: { prNumber: true, outcome: true } }),
    prisma.auditEntry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: { ticket: { select: { id: true, title: true } } },
    }),
  ])

  const stats = {
    total:       tickets.length,
    inProgress:  tickets.filter((t) => ['PLANNING', 'IN_PROGRESS'].includes(t.status)).length,
    inReview:    tickets.filter((t) => t.status === 'IN_REVIEW').length,
    rework:      tickets.filter((t) => t.status === 'NEEDS_REWORK').length,
    merged:      tickets.filter((t) => t.status === 'MERGED').length,
    prsOpened:   iterations.filter((i) => i.prNumber).length,
    prsApproved: iterations.filter((i) => i.outcome === 'approved').length,
    critical:    tickets.filter((t) => t.priority === 'CRITICAL').length,
  }

  return (
    <div style={{ padding: '36px 44px' }}>

      <div style={{ marginBottom: 36 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 600, color: '#e5e5e5' }}>Overview</h1>
        <p style={{ margin: 0, fontSize: 16, color: '#4b5563' }}>Autonomous engineering agent — live status</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 44 }}>
        <StatCard label="Total Tickets"  value={stats.total}      color="#e5e5e5" href="/tickets" />
        <StatCard label="In Progress"    value={stats.inProgress} color="#2563eb" href="/tickets?status=IN_PROGRESS" />
        <StatCard label="Waiting Review" value={stats.inReview}   color="#d97706" href="/tickets?status=IN_REVIEW" />
        <StatCard label="Merged"         value={stats.merged}     color="#16a34a" href="/tickets?status=MERGED" />
      </div>

      {/* Recent activity */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Recent Activity
          </span>
          <Link href="/tickets" style={{ fontSize: 14, color: '#2563eb', textDecoration: 'none' }}>
            View all tickets →
          </Link>
        </div>

        <div style={{ background: '#141414', border: '1px solid #1f1f1f', borderRadius: 4, overflow: 'hidden' }}>
          {recentActivity.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#374151', fontSize: 16 }}>
              No activity yet.{' '}
              <Link href="/tickets/new" style={{ color: '#2563eb' }}>Create a ticket</Link> to get started.
            </div>
          ) : (
            recentActivity.map((entry, i) => (
              <div key={entry.id} style={{
                display: 'flex', gap: 18, alignItems: 'baseline',
                padding: '13px 22px',
                borderBottom: i < recentActivity.length - 1 ? '1px solid #1a1a1a' : 'none',
              }}>
                <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#374151', flexShrink: 0, minWidth: 148 }}>
                  {new Date(entry.createdAt).toISOString().replace('T', ' ').slice(0, 16)}
                </span>
                <EventBadge event={entry.event} />
                <Link
                  href={`/tickets/${entry.ticket.id}`}
                  style={{ fontSize: 15, color: '#9ca3af', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}
                >
                  {entry.ticket.title}
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color, href }: { label: string; value: number; color: string; href?: string }) {
  const content = (
    <div style={{
      background: '#141414', border: '1px solid #1f1f1f', borderRadius: 4,
      padding: '22px 24px',
    }}>
      <div style={{ fontSize: 36, fontWeight: 700, color, lineHeight: 1, marginBottom: 10 }}>
        {value}
      </div>
      <div style={{ fontSize: 14, color: '#4b5563', fontWeight: 500 }}>{label}</div>
    </div>
  )

  if (href) {
    return <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>{content}</Link>
  }
  return content
}

function EventBadge({ event }: { event: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    'ticket.created':         { bg: '#172554', text: '#60a5fa' },
    'agent.started':          { bg: '#1e1b4b', text: '#a5b4fc' },
    'agent.completed':        { bg: '#14532d', text: '#86efac' },
    'pr.opened':              { bg: '#1c1917', text: '#fbbf24' },
    'pr.approved':            { bg: '#14532d', text: '#86efac' },
    'pr.rejected':            { bg: '#450a0a', text: '#fca5a5' },
    'scheduler.requeue':      { bg: '#1c1917', text: '#d97706' },
    'agent.smoke_test':       { bg: '#1a1a1a', text: '#6b7280' },
    'agent.blocked_by_tests': { bg: '#450a0a', text: '#fca5a5' },
  }

  const meta = colors[event] ?? { bg: '#1a1a1a', text: '#4b5563' }
  const label = event.replace(/\./g, ' › ')

  return (
    <span style={{
      fontSize: 12, fontWeight: 600,
      color: meta.text, background: meta.bg,
      padding: '3px 10px', borderRadius: 3, flexShrink: 0,
      minWidth: 148, textAlign: 'center', display: 'inline-block',
    }}>
      {label}
    </span>
  )
}
