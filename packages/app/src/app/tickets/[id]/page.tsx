import { prisma } from '@trooper/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function TicketPage({ params }: { params: { id: string } }) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: params.id },
    include: { iterations: { orderBy: { iterationNumber: 'asc' } }, auditLog: { orderBy: { createdAt: 'asc' } } },
  })
  if (!ticket) notFound()

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem' }}>
      <Link href="/" style={{ color: '#888', textDecoration: 'none', fontSize: '0.875rem' }}>← All tickets</Link>
      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span style={{ fontFamily: 'monospace', color: '#888', fontSize: '0.8rem' }}>{ticket.id}</span>
          <h1 style={{ margin: '4px 0 0', fontSize: '1.25rem' }}>{ticket.title}</h1>
          <div style={{ color: '#888', fontSize: '0.875rem', marginTop: 4 }}>
            {ticket.source} · {ticket.repoOwner}/{ticket.repoName} · {ticket.type}
          </div>
        </div>
        <span style={{ fontSize: '0.8rem', background: '#1a1a1a', border: '1px solid #333', padding: '4px 12px', borderRadius: 99 }}>
          {ticket.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div style={{ marginTop: '1.5rem', background: '#1a1a1a', borderRadius: 8, padding: '1rem', whiteSpace: 'pre-wrap', fontSize: '0.9rem', color: '#ccc' }}>
        {ticket.body}
      </div>

      {ticket.iterations.length > 0 && (
        <section style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Agent iterations</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {ticket.iterations.map((it) => (
              <div key={it.id} style={{ background: '#1a1a1a', borderRadius: 8, padding: '1rem', borderLeft: `3px solid ${it.outcome === 'approved' ? '#22c55e' : it.outcome === 'rejected' ? '#ef4444' : '#3b82f6'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>Iteration #{it.iterationNumber}</span>
                  {it.prUrl && (
                    <a href={it.prUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', fontSize: '0.875rem' }}>
                      PR #{it.prNumber} →
                    </a>
                  )}
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#888', marginBottom: 8 }}>
                  Branch: {it.branchName}
                </div>
                {it.reviewFeedback && (
                  <div style={{ background: '#ef444422', border: '1px solid #ef444444', borderRadius: 6, padding: '0.75rem', marginBottom: 8, fontSize: '0.875rem' }}>
                    <strong style={{ color: '#ef4444' }}>Rejection feedback:</strong>
                    <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{it.reviewFeedback}</div>
                  </div>
                )}
                <details>
                  <summary style={{ cursor: 'pointer', color: '#888', fontSize: '0.875rem' }}>Agent reasoning</summary>
                  <div style={{ marginTop: 8, whiteSpace: 'pre-wrap', fontSize: '0.8rem', color: '#aaa' }}>{it.agentReasoning}</div>
                </details>
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Audit log</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {ticket.auditLog.map((entry) => (
            <div key={entry.id} style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#888' }}>
              <span style={{ fontFamily: 'monospace', flexShrink: 0 }}>{new Date(entry.createdAt).toISOString().replace('T', ' ').slice(0, 19)}</span>
              <span style={{ color: '#aaa' }}>{entry.event}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
