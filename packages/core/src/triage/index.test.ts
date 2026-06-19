import { describe, it, expect } from 'vitest'
import { triageTicket } from './index.js'

describe('triageTicket', () => {
  it('scores a production crash as CRITICAL', () => {
    const result = triageTicket({
      type: 'BUG',
      title: 'App crash in production',
      body: 'The server is down and returning 500 errors for all users.',
    })
    expect(result.priority).toBe('CRITICAL')
    expect(result.score).toBeGreaterThanOrEqual(80)
    expect(result.signals).toContain('production issue')
  })

  it('scores a security issue as CRITICAL', () => {
    const result = triageTicket({
      type: 'BUG',
      title: 'SQL injection vulnerability in search',
      body: 'Found a sqli exploit on the /search endpoint.',
    })
    expect(result.priority).toBe('CRITICAL')
    expect(result.signals).toContain('security concern')
  })

  it('scores a feature request as NORMAL or LOW', () => {
    const result = triageTicket({
      type: 'FEATURE',
      title: 'Add dark mode',
      body: 'Would be nice to have a dark theme option.',
    })
    expect(['NORMAL', 'LOW']).toContain(result.priority)
  })

  it('scores a cosmetic-only issue as LOW', () => {
    const result = triageTicket({
      type: 'FEEDBACK',
      title: 'Minor color spacing issue',
      body: 'The button color and font spacing looks slightly off. Low priority, not urgent.',
    })
    expect(result.priority).toBe('LOW')
    expect(result.score).toBeLessThan(35)
  })

  it('clamps score between 0 and 100', () => {
    const result = triageTicket({
      type: 'BUG',
      title: 'Security vulnerability data loss crash production outage',
      body: 'All users blocked, data corrupted, server down, 500 error, regression.',
    })
    expect(result.score).toBeLessThanOrEqual(100)
    expect(result.score).toBeGreaterThanOrEqual(0)
  })

  it('returns signals array explaining the score', () => {
    const result = triageTicket({
      type: 'BUG',
      title: 'Login is broken',
      body: 'Users cannot log in. This is a regression — it worked before.',
    })
    expect(result.signals.length).toBeGreaterThan(0)
  })
})
