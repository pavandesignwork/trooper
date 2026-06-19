import { prisma } from '@trooper/db'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const tickets = await prisma.ticket.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { iterations: { orderBy: { iterationNumber: 'desc' }, take: 1 } },
  })

  const counts = {
    pending: tickets.filter((t) => t.status === 'PENDING').length,
    inProgress: tickets.filter((t) => ['PLANNING', 'IN_PROGRESS'].includes(t.status)).length,
    inReview: tickets.filter((t) => t.status === 'IN_REVIEW').length,
    merged: tickets.filter((t) => t.status === 'MERGED').length,
  }

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Trooper</h1>
        <p style={{ color: '#888', marginTop: 4 }}>Autonomous engineering agent</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Pending', value: counts.pending, color: '#888' },
          { label: 'In Progress', value: counts.inProgress, color: '#3b82f6' },
          { label: 'In Review', value: counts.inReview, color: '#f59e0b' },
          { label: 'Merged', value: counts.merged, color: '#22c55e' },
        ].map((stat) => (
          <div key={stat.label} style={{ background: '#1a1a1a', borderRadius: 8, padding: '1rem' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
            <div style={{ color: '#888', fontSize: '0.875rem' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#1a1a1a', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600 }}>Tickets</span>
          <Link href="/tickets/new" style={{ background: '#3b82f6', color: '#fff', padding: '0.4rem 1rem', borderRadius: 6, textDecoration: 'none', fontSize: '0.875rem' }}>
            + New ticket
          </Link>
        </div>
        {tickets.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#888' }}>
            No tickets yet. Connect a source or create one manually.
          </div>
        ) : (
          tickets.map((ticket) => {
            const latestPr = ticket.iterations[0]
            return (
              <Link key={ticket.id} href={`/tickets/${ticket.id}`} style={{ display: 'block', padding: '1rem', borderBottom: '1px solid #2a2a2a', textDecoration: 'none', color: 'inherit' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#888', fontFamily: 'monospace' }}>{ticket.id}</span>
                    <div style={{ marginTop: 2, fontWeight: 500 }}>{ticket.title}</div>
                    <div style={{ marginTop: 4, fontSize: '0.8rem', color: '#888' }}>
                      {ticket.source} · {ticket.repoOwner}/{ticket.repoName}
                      {latestPr?.prUrl && (
                        <> · <a href={latestPr.prUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: '#3b82f6' }}>PR #{latestPr.prNumber}</a></>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={ticket.status} type={ticket.type} />
                </div>
              </Link>
            )
          })
        )}
      </div>
    </main>
  )
}

function StatusBadge({ status, type }: { status: string; type: string }) {
  const colors: Record<string, string> = {
    PENDING: '#888',
    PLANNING: '#3b82f6',
    IN_PROGRESS: '#3b82f6',
    IN_REVIEW: '#f59e0b',
    NEEDS_REWORK: '#ef4444',
    MERGED: '#22c55e',
    CLOSED: '#888',
  }
  const typeColors: Record<string, string> = {
    BUG: '#ef4444',
    FEATURE: '#8b5cf6',
    FEEDBACK: '#888',
  }
  return (
    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
      <span style={{ fontSize: '0.7rem', background: typeColors[type] + '22', color: typeColors[type], padding: '2px 8px', borderRadius: 99, border: `1px solid ${typeColors[type]}44` }}>
        {type}
      </span>
      <span style={{ fontSize: '0.7rem', background: colors[status] + '22', color: colors[status], padding: '2px 8px', borderRadius: 99, border: `1px solid ${colors[status]}44` }}>
        {status.replace(/_/g, ' ')}
      </span>
    </div>
  )
}
