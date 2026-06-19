import { prisma } from '@trooper/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const STATUS_COLOR: Record<string, string> = {
  PENDING:      '#4b5563',
  PLANNING:     '#2563eb',
  IN_PROGRESS:  '#2563eb',
  IN_REVIEW:    '#d97706',
  NEEDS_REWORK: '#dc2626',
  MERGED:       '#16a34a',
  CLOSED:       '#374151',
}

const TYPE_META: Record<string, { bg: string; text: string }> = {
  BUG:      { bg: '#450a0a', text: '#fca5a5' },
  FEATURE:  { bg: '#2e1065', text: '#c4b5fd' },
  FEEDBACK: { bg: '#1c1c1c', text: '#6b7280' },
}

export default async function TicketPage({ params }: { params: { id: string } }) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: {
      iterations: { orderBy: { iterationNumber: 'asc' } },
      auditLog:   { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!ticket) notFound()

  const statusColor = STATUS_COLOR[ticket.status] ?? '#4b5563'
  const typeMeta = TYPE_META[ticket.type] ?? TYPE_META.FEEDBACK

  return (
    <div style={{ maxWidth: 860, padding: '36px 44px' }}>

      <Link href="/tickets" style={{ fontSize: 15, color: '#4b5563', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 30 }}>
        ← All Tickets
      </Link>

      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 22 }}>
        <span style={{
          width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
          border: `2px solid ${statusColor}`,
          background: statusColor + '30',
          display: 'inline-block', marginTop: 5,
        }} />
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: '#e5e5e5', lineHeight: 1.35 }}>
          {ticket.title}
        </h1>
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 32, flexWrap: 'wrap', alignItems: 'center' }}>
        <Tag bg={typeMeta.bg} color={typeMeta.text}>{ticket.type}</Tag>
        <Tag bg={statusColor + '20'} color={statusColor}>{ticket.status.replace(/_/g, ' ')}</Tag>
        <Tag bg="#1a1a1a" color="#6b7280">{ticket.source}</Tag>
        <Tag bg="#1a1a1a" color="#6b7280">{ticket.repoOwner}/{ticket.repoName}</Tag>
        <span style={{ fontSize: 13, color: '#374151', fontFamily: 'monospace' }}>#{ticket.id.slice(-8)}</span>
      </div>

      {/* Description */}
      <div style={{ marginBottom: 40 }}>
        <SectionLabel>Description</SectionLabel>
        <div style={{
          background: '#141414', border: '1px solid #1f1f1f', borderRadius: 4,
          padding: '18px 22px', fontSize: 16, color: '#c4c4c4',
          whiteSpace: 'pre-wrap', lineHeight: 1.7,
        }}>
          {ticket.body || <span style={{ color: '#374151' }}>No description provided.</span>}
        </div>
      </div>

      {/* Iterations */}
      {ticket.iterations.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <SectionLabel>Agent Iterations</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {ticket.iterations.map((it) => {
              const borderColor = it.outcome === 'approved' ? '#16a34a' : it.outcome === 'rejected' ? '#dc2626' : '#2563eb'
              return (
                <div key={it.id} style={{
                  background: '#141414', border: '1px solid #1f1f1f',
                  borderLeft: `3px solid ${borderColor}`,
                  borderRadius: 4, padding: '18px 22px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: '#e5e5e5' }}>
                      Iteration {it.iterationNumber}
                    </span>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      {it.outcome && (
                        <Tag bg={borderColor + '20'} color={borderColor}>
                          {it.outcome.toUpperCase()}
                        </Tag>
                      )}
                      {it.prUrl && (
                        <a href={it.prUrl} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 15, color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
                          PR #{it.prNumber} ↗
                        </a>
                      )}
                    </div>
                  </div>

                  <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#4b5563', marginBottom: it.reviewFeedback || it.agentPlan ? 14 : 0 }}>
                    {it.branchName}
                  </div>

                  {it.reviewFeedback && (
                    <div style={{
                      background: '#1c0a0a', border: '1px solid #450a0a',
                      borderRadius: 4, padding: '14px 18px', marginBottom: 12,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 8, letterSpacing: '0.06em' }}>
                        REJECTION FEEDBACK
                      </div>
                      <div style={{ fontSize: 15, color: '#d4d4d4', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                        {it.reviewFeedback}
                      </div>
                    </div>
                  )}

                  {it.agentPlan && (
                    <details>
                      <summary style={{ cursor: 'pointer', fontSize: 15, color: '#4b5563', userSelect: 'none' }}>
                        Agent summary
                      </summary>
                      <div style={{ marginTop: 12, fontSize: 15, color: '#6b7280', whiteSpace: 'pre-wrap', lineHeight: 1.6, paddingLeft: 14, borderLeft: '2px solid #1f1f1f' }}>
                        {it.agentPlan}
                      </div>
                    </details>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Audit log */}
      <div>
        <SectionLabel>Audit Log</SectionLabel>
        <div style={{ background: '#141414', border: '1px solid #1f1f1f', borderRadius: 4, overflow: 'hidden' }}>
          {ticket.auditLog.map((entry, i) => (
            <div key={entry.id} style={{
              display: 'flex', gap: 28, padding: '12px 18px',
              borderBottom: i < ticket.auditLog.length - 1 ? '1px solid #1a1a1a' : 'none',
              fontSize: 15,
            }}>
              <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#374151', flexShrink: 0 }}>
                {new Date(entry.createdAt).toISOString().replace('T', ' ').slice(0, 19)}
              </span>
              <span style={{ color: '#6b7280' }}>{entry.event}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Tag({ bg, color, children }: { bg: string; color: string; children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 13, fontWeight: 600,
      color, background: bg,
      padding: '5px 12px', borderRadius: 3,
      display: 'inline-block',
    }}>
      {children}
    </span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
      {children}
    </div>
  )
}
