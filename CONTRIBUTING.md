# Contributing to Trooper

Thank you for contributing. This guide covers everything you need — from first setup to opening a PR.

---

## Table of contents

- [Code of conduct](#code-of-conduct)
- [Before you start](#before-you-start)
- [Local setup](#local-setup)
- [Project structure](#project-structure)
- [What to work on](#what-to-work-on)
- [Adding an adapter](#adding-an-adapter-new-feedback-source)
- [Adding a model provider](#adding-a-model-provider)
- [Working on the dashboard](#working-on-the-dashboard)
- [Tests](#tests)
- [Opening a PR](#opening-a-pr)
- [Commit style](#commit-style)

---

## Code of conduct

Be respectful. Critique code, not people. We welcome contributors of all experience levels.

---

## Before you start

- **Check existing issues** before opening a new one — it may already be tracked.
- **For large changes** (new feature, architecture change), open an issue first to discuss before writing code. This saves everyone time.
- **For small changes** (bug fix, typo, docs), just open a PR directly.

---

## Local setup

**Requirements:** Node.js 18+, pnpm 8+

```bash
git clone https://github.com/pavandesignwork/trooper
cd trooper
pnpm install
cp .env.example .env
```

Fill in `.env` with at minimum:
```bash
TROOPER_MODEL_PROVIDER=ollama     # use Ollama locally — no API cost while developing
TROOPER_MODEL_NAME=llama3
TROOPER_GITHUB_TOKEN=ghp_...
TROOPER_REPO_OWNER=your-github-username
TROOPER_REPO_NAME=a-test-repo
DATABASE_PROVIDER=sqlite
DATABASE_URL=file:./trooper.db
```

```bash
pnpm db:migrate     # create the SQLite database
pnpm dev            # start the Next.js dashboard
```

In a second terminal:
```bash
node packages/core/src/worker.ts   # start the agent worker
```

Dashboard → `http://localhost:3000`

---

## Project structure

```
trooper/
├── packages/
│   ├── cli/        npx usetrooper — setup wizard and start commands
│   ├── app/        Next.js dashboard and API routes
│   ├── core/       Agent engine, model router, job queue, scheduler
│   │   └── src/
│   │       ├── agent/      Tool-use loop, repo-mapper, smoke-test
│   │       ├── models/     BYOK model providers (Claude, OpenAI, ...)
│   │       ├── queue/      SQLite job queue
│   │       ├── scheduler/  Stale ticket re-queuing
│   │       └── triage/     Priority scoring
│   ├── adapters/   Intake adapters — one file per source
│   └── db/         Prisma schema and client
└── .github/        CI, PR template, issue templates
```

**Dependency direction:** `app` → `core` + `adapters` → `db`. Never import `app` from `core` or `adapters`.

---

## What to work on

Good first issues are labelled [`good first issue`](https://github.com/pavandesignwork/trooper/issues?q=label%3A%22good+first+issue%22).

**High-value contributions:**

| Area | Examples |
|---|---|
| New adapters | Slack, Linear, Jira, Intercom, PagerDuty, Sentry |
| New model providers | Mistral, Cohere, AWS Bedrock |
| Dashboard improvements | Live ticket status, charts, dark/light theme |
| CLI improvements | Better error messages, `trooper logs`, `trooper status` |
| Test coverage | Unit tests for triage scoring, adapter parsing |

---

## Adding an adapter (new feedback source)

This is the most common contribution. Each adapter is a single file.

**1. Create the file**

```
packages/adapters/src/<name>/index.ts
```

**2. Implement `AdapterPlugin`**

```typescript
import type { AdapterPlugin, FeedbackEvent } from '../base.js'

export class SlackAdapter implements AdapterPlugin {
  readonly name = 'slack'

  async parse(payload: unknown, headers: Record<string, string>): Promise<FeedbackEvent | null> {
    const p = payload as Record<string, unknown>

    // Return null to skip events you don't care about
    if (p.type !== 'app_mention') return null

    return {
      source: 'slack',
      sourceRef: p.ts as string,           // unique ID from the source
      type: 'FEEDBACK',
      title: 'Slack mention',
      body: p.text as string,
      repoOwner: 'your-org',               // could come from channel config
      repoName: 'your-repo',
      metadata: { channel: p.channel, user: p.user },
    }
  }
}
```

**3. Register it**

In `packages/adapters/src/index.ts`, add:
```typescript
import { SlackAdapter } from './slack/index.js'
// ...
const registry = new Map<string, AdapterPlugin>([
  ['github', new GitHubAdapter()],
  ['webhook', new WebhookAdapter()],
  ['slack', new SlackAdapter()],   // add here
])
```

**4. Export it**

In `packages/adapters/package.json`, add to `exports`:
```json
"./slack": "./src/slack/index.ts"
```

**5. Test it**

```bash
curl -X POST http://localhost:3000/api/ingest/slack \
  -H 'content-type: application/json' \
  -d '{"type":"app_mention","ts":"123","text":"fix the login bug","channel":"C123","user":"U456"}'
```

---

## Adding a model provider

**1. Create the file**

```
packages/core/src/models/providers/<name>.ts
```

**2. Implement `AgentModel`**

```typescript
import type { AgentModel, CompletionOptions, CompletionResult } from '../types.js'

export class MyProviderModel implements AgentModel {
  constructor(private apiKey: string, private model: string) {}

  async complete(options: CompletionOptions): Promise<CompletionResult> {
    // call your provider's API
    return {
      content: '...',
      inputTokens: 0,
      outputTokens: 0,
      model: this.model,
      provider: 'myprovider',
    }
  }
}
```

**3. Add a case in the router**

In `packages/core/src/models/index.ts`:
```typescript
case 'myprovider':
  if (!config.apiKey) throw new Error('MyProvider requires an API key')
  return new MyProviderModel(config.apiKey, config.model)
```

**4. Add to `SUPPORTED_MODELS`** so the CLI wizard shows it.

---

## Working on the dashboard

The dashboard is a standard Next.js 14 app in `packages/app/`. Run it with:

```bash
pnpm --filter @trooper/app dev
```

API routes live in `src/app/api/`. Pages in `src/app/`. No CSS framework — plain inline styles to keep the bundle small and avoid dependency churn.

---

## Tests

```bash
pnpm test           # run all tests
pnpm typecheck      # TypeScript across all packages
pnpm lint           # ESLint
```

For new adapters, add a test in `packages/adapters/src/<name>/index.test.ts` that:
- Parses a real example payload and checks the output shape
- Returns `null` for events you don't handle

For new model providers, add a test that mocks the HTTP call and checks that `CompletionResult` is correctly shaped.

---

## Opening a PR

See [PR_GUIDE.md](.github/PR_GUIDE.md) for the full guide. Short version:

- One PR per change
- Fill in the PR template — especially the "what changed and why" section
- Make sure `pnpm typecheck` and `pnpm lint` pass before pushing
- Link the issue your PR closes with `Closes #123`

---

## Commit style

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(adapters): add Slack adapter
fix(agent): prevent path traversal in tool executor
docs: update README quick start
chore(deps): bump @anthropic-ai/sdk to 0.25.0
```

Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`

Scope is the package name: `adapters`, `core`, `app`, `cli`, `db`
