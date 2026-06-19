'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewTicketPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const form = new FormData(e.currentTarget)
    try {
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
      if (data.ticketId) {
        router.push(`/tickets/${data.ticketId}`)
      } else {
        setError(data.error ?? 'Something went wrong')
        setLoading(false)
      }
    } catch {
      setError('Network error')
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 660, padding: '36px 44px' }}>
      <Link href="/tickets" style={{ fontSize: 15, color: '#4b5563', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 30 }}>
        ← All Tickets
      </Link>

      <h1 style={{ margin: '0 0 30px', fontSize: 24, fontWeight: 600, color: '#e5e5e5' }}>New Ticket</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Field label="Type">
          <select name="type" style={selectStyle}>
            <option value="FEATURE">Feature</option>
            <option value="BUG">Bug</option>
            <option value="FEEDBACK">Feedback</option>
          </select>
        </Field>

        <Field label="Title">
          <input name="title" required style={inputStyle} placeholder="Short description of the issue or feature" />
        </Field>

        <Field label="Description">
          <textarea
            name="body" required rows={6}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            placeholder="Detailed description — the more context, the better the agent can understand and fix it."
          />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <Field label="Repo owner">
            <input name="repoOwner" required style={inputStyle} defaultValue={process.env.NEXT_PUBLIC_REPO_OWNER} placeholder="acme-corp" />
          </Field>
          <Field label="Repo name">
            <input name="repoName" required style={inputStyle} defaultValue={process.env.NEXT_PUBLIC_REPO_NAME} placeholder="my-app" />
          </Field>
        </div>

        {error && (
          <div style={{ fontSize: 15, color: '#fca5a5', background: '#1c0a0a', border: '1px solid #450a0a', borderRadius: 4, padding: '12px 16px' }}>
            {error}
          </div>
        )}

        <div>
          <button
            type="submit" disabled={loading}
            style={{ background: loading ? '#1e3a5f' : '#2563eb', color: '#fff', border: 'none', borderRadius: 4, padding: '12px 32px', fontWeight: 600, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Creating…' : 'Create Ticket'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 15, color: '#9ca3af', marginBottom: 8, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#141414', border: '1px solid #1f1f1f',
  color: '#e2e2e2', borderRadius: 4, padding: '11px 14px',
  fontSize: 16, boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
}

const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' }
