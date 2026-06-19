# Pull Request Guide

This guide covers what makes a good Trooper PR — from writing the description to getting it merged.

---

## Before you open a PR

- [ ] `pnpm typecheck` passes with no errors
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes (if tests exist for what you changed)
- [ ] You've read the relevant section of [CONTRIBUTING.md](../CONTRIBUTING.md)
- [ ] For a new adapter or provider: you've tested it locally with a real webhook or API call
- [ ] For a dashboard change: you've opened the page in a browser and clicked through the golden path

---

## PR title

Follow Conventional Commits format:

```
feat(adapters): add Slack adapter
fix(core): prevent path traversal in tool executor
docs: clarify webhook secret setup in README
chore(deps): bump openai to 4.53.0
```

Keep it under 72 characters. The scope is the package: `adapters`, `core`, `app`, `cli`, `db`.

---

## PR description

Fill in the template. The most important field is **"What changed and why"** — not what the diff shows (reviewers can read diffs), but why you made these decisions.

Bad: *"Added rate limiting"*
Good: *"Added per-IP rate limiting on `/api/ingest` because the endpoint was open to abuse — a single attacker could flood the queue with fake tickets and burn the operator's API credits. Used a sliding window in memory (resets on restart) which is good enough for single-instance self-hosted deployments."*

---

## PR size

**Keep PRs small and focused.** One logical change per PR.

- New adapter → one PR for the adapter only
- If you also want to update the README → separate PR, or include it in the same PR with a clear note
- Refactoring unrelated to your change → separate PR, or don't

Large PRs that touch many packages at once are hard to review and slow to merge.

---

## What reviewers look for

**Correctness**
- Does it do what the description says?
- Edge cases handled? (empty payloads, missing fields, provider API errors)

**Security**
- No new path traversal, injection, or credential exposure
- Webhook adapters sanitize input before storing

**Scope**
- Does it change only what the ticket requires?
- No unrelated refactoring or cleanup bundled in

**TypeScript**
- No `any` casts without a comment explaining why
- New public functions have parameter types

**Tests**
- New adapters should have a test that parses a real example payload
- New model providers should have a test that checks the `CompletionResult` shape

---

## Review turnaround

We aim to review PRs within **3 business days**. If you haven't heard back in a week, leave a comment on the PR.

Maintainers may:
- Request changes — address all comments, then re-request review
- Approve and merge
- Close with an explanation if it's out of scope

---

## After merge

Your change will be included in the next release. We don't have a fixed release cadence — releases happen when there's enough to ship.

Thank you for contributing.
