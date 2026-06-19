import { describe, it, expect } from 'vitest'
import { GitHubAdapter } from './index.js'

const adapter = new GitHubAdapter()

const issuesPayload = {
  action: 'opened',
  issue: {
    number: 42,
    title: 'Login button broken on mobile',
    body: 'Steps to reproduce: tap Login on iOS 17...',
    html_url: 'https://github.com/acme/app/issues/42',
    labels: [{ name: 'bug' }],
  },
  repository: {
    full_name: 'acme/app',
  },
}

describe('GitHubAdapter', () => {
  it('has name "github"', () => {
    expect(adapter.name).toBe('github')
  })

  it('parses an opened issue with bug label as BUG', async () => {
    const result = await adapter.parse(issuesPayload, { 'x-github-event': 'issues' })
    expect(result).not.toBeNull()
    expect(result?.type).toBe('BUG')
    expect(result?.title).toBe('Login button broken on mobile')
    expect(result?.repoOwner).toBe('acme')
    expect(result?.repoName).toBe('app')
    expect(result?.sourceRef).toBe('42')
    expect(result?.source).toBe('github')
  })

  it('parses an issue with enhancement label as FEATURE', async () => {
    const payload = {
      ...issuesPayload,
      issue: { ...issuesPayload.issue, labels: [{ name: 'enhancement' }] },
    }
    const result = await adapter.parse(payload, { 'x-github-event': 'issues' })
    expect(result?.type).toBe('FEATURE')
  })

  it('returns null for closed actions', async () => {
    const payload = { ...issuesPayload, action: 'closed' }
    const result = await adapter.parse(payload, { 'x-github-event': 'issues' })
    expect(result).toBeNull()
  })

  it('returns null for non-issues events', async () => {
    const result = await adapter.parse(issuesPayload, { 'x-github-event': 'push' })
    expect(result).toBeNull()
  })

  it('returns null for unlabelled issue as FEEDBACK type', async () => {
    const payload = {
      ...issuesPayload,
      issue: { ...issuesPayload.issue, labels: [] },
    }
    const result = await adapter.parse(payload, { 'x-github-event': 'issues' })
    expect(result?.type).toBe('FEEDBACK')
  })
})
