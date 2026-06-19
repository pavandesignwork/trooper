'use client'
import { useEffect, useState } from 'react'

const PROVIDERS = ['claude', 'openai', 'gemini', 'groq', 'ollama']
const MODELS: Record<string, string[]> = {
  claude: ['claude-sonnet-4-6', 'claude-opus-4-8', 'claude-haiku-4-5-20251001'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  gemini: ['gemini-1.5-pro', 'gemini-1.5-flash'],
  groq:   ['llama-3.1-70b-versatile', 'mixtral-8x7b-32768'],
  ollama: ['llama3', 'codellama', 'deepseek-coder'],
}

type Fields = {
  model_provider: string
  model_name: string
  api_key: string
  github_token: string
  repo_owner: string
  repo_name: string
}

type Source = Record<string, string>

export default function SettingsPage() {
  const [fields, setFields] = useState<Fields>({
    model_provider: '', model_name: '', api_key: '',
    github_token: '', repo_owner: '', repo_name: '',
  })
  const [source, setSource] = useState<Source>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(({ active, source }: { active: Fields; source: Source }) => {
        setFields(active)
        setSource(source)
      })
      .catch((err: unknown) => {
        setFetchError(err instanceof Error ? err.message : 'Failed to load settings')
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(fields),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const set = (key: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFields((f) => ({ ...f, [key]: e.target.value }))

  return (
    <div style={{ maxWidth: 680, padding: '36px 44px' }}>
      <h1 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 600, color: '#e5e5e5' }}>Settings</h1>
      <p style={{ margin: '0 0 36px', fontSize: 16, color: '#4b5563' }}>
        Keys saved here are stored in the local database. Environment variables in{' '}
        <code style={{ color: '#9ca3af', background: '#1a1a1a', padding: '2px 7px', borderRadius: 3, fontSize: 14 }}>.env</code>{' '}
        always take precedence. Restart the worker after changing model or GitHub settings.
      </p>

      {fetchError && (
        <div style={{ fontSize: 14, color: '#fca5a5', background: '#1c0a0a', border: '1px solid #450a0a', borderRadius: 4, padding: '10px 14px', marginBottom: 24 }}>
          Could not load saved settings: {fetchError}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 32, opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>

        <Section title="AI Model">
          <Field label="Provider" source={source.model_provider}>
            <select value={fields.model_provider} onChange={set('model_provider')} style={selectStyle}>
              <option value="">Select provider…</option>
              {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>

          <Field label="Model" source={source.model_name}>
            <select value={fields.model_name} onChange={set('model_name')} style={selectStyle}>
              <option value="">Select model…</option>
              {(MODELS[fields.model_provider] ?? []).map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>

          <Field label="API Key" source={source.api_key} hint={fields.model_provider === 'ollama' ? 'Not required for Ollama' : undefined}>
            <input
              type="password" value={fields.api_key}
              onChange={set('api_key')}
              placeholder={fields.model_provider === 'ollama' ? 'Not required' : 'sk-ant-… / sk-… / AIza…'}
              disabled={fields.model_provider === 'ollama'}
              style={{ ...inputStyle, opacity: fields.model_provider === 'ollama' ? 0.4 : 1 }}
            />
          </Field>
        </Section>

        <Section title="GitHub">
          <Field label="Personal Access Token" source={source.github_token} hint="Needs repo and pull_request scopes">
            <input type="password" value={fields.github_token} onChange={set('github_token')} placeholder="ghp_…" style={inputStyle} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            <Field label="Default repo owner" source={source.repo_owner}>
              <input value={fields.repo_owner} onChange={set('repo_owner')} placeholder="acme-corp" style={inputStyle} />
            </Field>
            <Field label="Default repo name" source={source.repo_name}>
              <input value={fields.repo_name} onChange={set('repo_name')} placeholder="my-app" style={inputStyle} />
            </Field>
          </div>
        </Section>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button type="submit" disabled={saving} style={{
            background: saving ? '#1e3a5f' : '#2563eb', color: '#fff',
            border: 'none', borderRadius: 4, padding: '12px 28px',
            fontSize: 16, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
          }}>
            {saving ? 'Saving…' : 'Save Settings'}
          </button>

          {saved && (
            <span style={{ fontSize: 15, color: '#16a34a' }}>
              ✓ Saved — restart the worker to apply changes
            </span>
          )}
        </div>
      </form>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid #1f1f1f' }}>
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, source, hint, children }: { label: string; source?: string; hint?: string; children: React.ReactNode }) {
  const sourceColor = source === 'env' ? '#d97706' : source === 'db' ? '#16a34a' : '#374151'
  const sourceLabel = source === 'env' ? 'from .env' : source === 'db' ? 'saved' : 'not set'

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <label style={{ fontSize: 15, color: '#9ca3af', fontWeight: 500 }}>{label}</label>
        <span style={{ fontSize: 12, color: sourceColor, fontWeight: 600 }}>{sourceLabel}</span>
      </div>
      {children}
      {hint && <div style={{ fontSize: 13, color: '#374151', marginTop: 6 }}>{hint}</div>}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#141414', border: '1px solid #1f1f1f',
  color: '#e2e2e2', borderRadius: 4, padding: '11px 14px',
  fontSize: 16, boxSizing: 'border-box', outline: 'none',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle, cursor: 'pointer',
}
