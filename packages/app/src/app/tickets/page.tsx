import { prisma } from '@trooper/db'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STATUS_GROUPS = [
  { label: 'In Progress',  statuses: ['PLANNING', 'IN_PROGRESS'], color: '#2563eb' },
  { label: 'In Review',    statuses: ['IN_REVIEW'],               color: '#d97706' },
  { label: 'Needs Rework', statuses: ['NEEDS_REWORK'],            color: '#dc2626' },
  { label: 'Pending',      statuses: ['PENDING'],                 color: '#4b5563' },
  { label: 'Merged',       statuses: ['MERGED'],                  color: '#16a34a' },
  { label: 'Closed',       statuses: ['CLOSED'],                  color: '#374151' },
]

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH:     '#d97706',
  NORMAL:   '#4b5563',
  LOW:      '#1f2937',
}

const TYPE_BG: Record<string, { bg: string; text: string }> = {
  BUG:      { bg: '#450a0a', text: '#fca5a5' },
  FEATURE:  { bg: '#2e1065', text: '#c4b5fd' },
  FEEDBACK: { bg: '#1c1c1c', text: '#6b7280' },
}

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: { status?: string; source?: string; type?: string }
}) {
  const where: Record<string, unknown> = {}
  if (searchParams.status) where.status = searchParams.status
  if (searchParams.source) where.source = searchParams.source
  if (searchParams.type)   where.type   = searchParams.type

  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: [{ priorityScore: 'desc' }, { createdAt: 'desc' }],
    take: 200,
    include: { iterations: { orderBy: { iterationNumber: 'desc' }, take: 1 } },
  })

  const grouped = STATUS_GROUPS
    .map((g) => ({ ...g, tickets: tickets.filter((t) => g.statuses.includes(t.status)) }))
    .filter((g) => g.tickets.length > 0)

  const activeCount = tickets.filter((t) =>
    ['PLANNING', 'IN_PROGRESS', 'IN_REVIEW'].includes(t.status)
  ).length

  const pageTitle = searchParams.status
    ? STATUS_GROUPS.find((g) => g.statuses.includes(searchParams.status!))?.label ?? searchParams.status
    : searchParams.source ? `Source: ${searchParams.source}`
    : searchParams.type   ? `Type: ${searchParams.type}`
    : 'All Tickets'

  return (
    <div>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 36px', borderBottom: '1px solid #1a1a1a',
        position: 'sticky', top: 0, background: '#0d0d0d', zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#e5e5e5' }}>{pageTitle}</h1>
          {activeCount > 0 && !searchParams.status && (
            <span style={{ fontSize: 13, background: '#172554', color: '#60a5fa', padding: '4px 12px', borderRadius: 3, fontWeight: 600 }}>
              {activeCount} active
            </span>
          )}
        </div>
        <Link href="/tickets/new" style={{
          background: '#2563eb', color: '#fff',
          padding: '10px 20px', borderRadius: 4,
          textDecoration: 'none', fontSize: 15, fontWeight: 600,
        }}>
          + New Ticket
        </Link>
      </div>

      {tickets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '100px 32px', color: '#4b5563' }}>
          <div style={{ fontSize: 16, marginBottom: 10 }}>No tickets found.</div>
          <Link href="/tickets/new" style={{ color: '#2563eb', fontSize: 15 }}>Create the first one →</Link>
        </div>
      ) : (
        grouped.map((group) => (
          <div key={group.label}>

            {/* Group header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '22px 36px 12px',
              borderBottom: '1px solid #161616',
            }}>
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: group.color, display: 'inline-block' }} />
              <span style={{ fontSize: 15, fontWeight: 600, color: '#9ca3af' }}>{group.label}</span>
              <span style={{ fontSize: 13, color: '#374151', background: '#1a1a1a', padding: '2px 10px', borderRadius: 3 }}>
                {group.tickets.length}
              </span>
            </div>

            {/* Column header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '32px 100px 1fr 90px 90px 100px 90px',
              padding: '8px 36px',
              borderBottom: '1px solid #161616',
              fontSize: 12,
              color: '#374151',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              <span />
              <span>ID</span>
              <span>Title</span>
              <span>Type</span>
              <span>Source</span>
              <span>Priority</span>
              <span style={{ textAlign: 'right' }}>Date</span>
            </div>

            {/* Rows */}
            {group.tickets.map((ticket) => {
              const pr = ticket.iterations[0]
              const typeMeta = TYPE_BG[ticket.type] ?? TYPE_BG.FEEDBACK
              return (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '32px 100px 1fr 90px 90px 100px 90px',
                    alignItems: 'center',
                    padding: '14px 36px',
                    borderBottom: '1px solid #151515',
                    textDecoration: 'none',
                    color: 'inherit',
                  }}
                >
                  {/* Status dot */}
                  <span style={{
                    width: 13, height: 13, borderRadius: '50%',
                    border: `2px solid ${group.color}`,
                    background: ['PLANNING','IN_PROGRESS'].includes(ticket.status) ? group.color + '40' : 'transparent',
                    display: 'inline-block',
                  }} />

                  {/* ID */}
                  <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#4b5563' }}>
                    #{ticket.id.slice(-8)}
                  </span>

                  {/* Title + PR */}
                  <div style={{ overflow: 'hidden' }}>
                    <span style={{ fontSize: 16, color: '#d4d4d4', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ticket.title}
                    </span>
                    {pr?.prNumber && (
                      <a
                        href={pr.prUrl ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: 13, color: '#2563eb', textDecoration: 'none', marginTop: 2, display: 'inline-block' }}
                      >
                        PR #{pr.prNumber} ↗
                      </a>
                    )}
                  </div>

                  {/* Type */}
                  <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: typeMeta.text, background: typeMeta.bg,
                    padding: '4px 10px', borderRadius: 3,
                    display: 'inline-block', width: 'fit-content',
                  }}>
                    {ticket.type}
                  </span>

                  {/* Source */}
                  <span style={{ fontSize: 14, color: '#6b7280' }}>{ticket.source}</span>

                  {/* Priority */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: PRIORITY_COLOR[ticket.priority] ?? '#374151', display: 'inline-block' }} />
                    <span style={{ fontSize: 13, color: '#6b7280' }}>{ticket.priority}</span>
                  </div>

                  {/* Date */}
                  <span style={{ fontSize: 13, color: '#4b5563', textAlign: 'right' }}>
                    {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </Link>
              )
            })}
          </div>
        ))
      )}
    </div>
  )
}
