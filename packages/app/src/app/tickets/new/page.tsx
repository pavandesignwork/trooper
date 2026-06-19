'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewTicketPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const res = await fetch('/api/ingest/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        source: 'webhook',
        type: form.get('type'),
        title: form.get('title'),
        body: form.get('body'),
        repoOwner: form.get('repoOwner'),
        repoName: form.get('repoName'),
      }),
    })
    const data = await res.json()
    if (data.ticketId) router.push(`/tickets/${data.ticketId}`)
    else setLoading(false)
  }

  const inputStyle = { width: '100%', background: '#111', border: '1px solid #333', color: '#e5e5e5', borderRadius: 6, padding: '0.6rem 0.75rem', fontSize: '0.95rem', boxSizing: 'border-box' as const }
  const labelStyle = { display: 'block', marginBottom: 6, color: '#aaa', fontSize: '0.875rem' }

  return (
    <main style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>New Ticket</h1>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label style={labelStyle}>Type</label>
          <select name="type" style={inputStyle}>
            <option value="BUG">Bug</option>
            <option value="FEATURE">Feature request</option>
            <option value="FEEDBACK">Feedback</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Title</label>
          <input name="title" required style={inputStyle} placeholder="Short description" />
        </div>
        <div>
          <label style={labelStyle}>Description</label>
          <textarea name="body" required rows={6} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Detailed description of the bug, feature, or feedback..." />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Repo owner</label>
            <input name="repoOwner" required style={inputStyle} defaultValue={process.env.NEXT_PUBLIC_REPO_OWNER} />
          </div>
          <div>
            <label style={labelStyle}>Repo name</label>
            <input name="repoName" required style={inputStyle} defaultValue={process.env.NEXT_PUBLIC_REPO_NAME} />
          </div>
        </div>
        <button type="submit" disabled={loading} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Creating...' : 'Create ticket & run agent'}
        </button>
      </form>
    </main>
  )
}
