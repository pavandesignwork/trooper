# Trooper

**Autonomous engineering agent — ingest feedback, write code, open PRs.**

Trooper connects to your feedback sources (GitHub Issues, webhooks, forms), turns them into tracked tickets, writes the code fix or feature using an AI agent, and opens a PR for your team to review. If the PR is rejected, the agent reads the feedback and tries again.

Zero infrastructure required. Bring your own AI key.

```bash
npx usetrooper
```

---

## How it works

```
Bug report / feature request / feedback
          ↓
  Intake & triage (priority scored)
          ↓
  Agent reads repo → plans → writes code → runs tests
          ↓
  PR opened on GitHub
          ↓
  Engineer reviews → approves or rejects with feedback
          ↓ (if rejected)
  Agent reads feedback → iterates → new PR
          ↓ (if approved)
  Merged · ticket closed
```

---

## Quick start

**Requirements:** Node.js 18+, a GitHub personal access token, an AI API key (or Ollama for free local inference).

```bash
# Run the setup wizard
npx trooper

# Answer 5 questions:
# · Which AI model? (Claude / OpenAI / Gemini / Groq / Ollama)
# · API key
# · GitHub token
# · Repo to connect (owner/repo)
# · Port (default 3000)

# Start the dashboard
npx trooper start

# In a second terminal, start the agent worker
npx trooper worker
```

Dashboard → `http://localhost:3000`

---

## Connecting feedback sources

Once running, point your tools at the webhook endpoints:

| Source | Endpoint | Setup |
|---|---|---|
| GitHub Issues | `POST /api/ingest/github` | Repo Settings → Webhooks → add URL, select "Issues" events |
| Custom / Slack / Linear | `POST /api/ingest/webhook` | Send a JSON body matching the schema below |
| Manual | `http://localhost:3000/tickets/new` | Use the dashboard form |

**Custom webhook payload:**
```json
{
  "source": "webhook",
  "type": "BUG",
  "title": "Login button broken on mobile",
  "body": "Steps to reproduce...",
  "repoOwner": "acme-corp",
  "repoName": "my-app"
}
```

**Optional webhook secret** (recommended in production):
```bash
# In your .env
TROOPER_WEBHOOK_SECRET=your-secret

# Send with every request
X-Trooper-Secret: your-secret
```

---

## Supported AI models (BYOK)

Trooper never touches your API key — it goes directly from your `.env` to the provider.

| Provider | Models | Cost |
|---|---|---|
| **Claude** (default) | `claude-sonnet-4-6`, `claude-opus-4-8`, `claude-haiku-4-5` | ~$0.06–0.90/ticket |
| **OpenAI** | `gpt-4o`, `gpt-4o-mini` | ~$0.05–0.80/ticket |
| **Google Gemini** | `gemini-1.5-pro`, `gemini-1.5-flash` | ~$0.03–0.60/ticket |
| **Groq** | `llama-3.1-70b-versatile` | ~$0.01–0.10/ticket |
| **Ollama** | `llama3`, `codellama`, `deepseek-coder` | **Free** (local GPU) |

Switch providers anytime by editing `.env`:
```bash
TROOPER_MODEL_PROVIDER=ollama
TROOPER_MODEL_NAME=codellama
# No API key needed for Ollama
```

---

## Self-hosting

### Option A — Persistent install
```bash
npm install -g trooper
trooper init
trooper start   # app
trooper worker  # agent worker (separate terminal)
```

### Option B — From source
```bash
git clone https://github.com/your-org/trooper
cd trooper
pnpm install
cp .env.example .env   # fill in your keys
pnpm db:migrate
pnpm dev
```

### Option C — Production (PostgreSQL + persistent worker)
```bash
# .env
DATABASE_PROVIDER=postgresql
DATABASE_URL=postgresql://user:pass@host:5432/trooper
```

---

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `TROOPER_MODEL_PROVIDER` | Yes | `claude` | `claude` \| `openai` \| `gemini` \| `groq` \| `ollama` |
| `TROOPER_MODEL_NAME` | Yes | `claude-sonnet-4-6` | Model name for the chosen provider |
| `TROOPER_API_KEY` | Conditional | — | API key (not needed for Ollama) |
| `TROOPER_GITHUB_TOKEN` | Yes | — | GitHub PAT with `repo` + `pull_requests` scopes |
| `TROOPER_REPO_OWNER` | Yes | — | Default GitHub org/user |
| `TROOPER_REPO_NAME` | Yes | — | Default repo name |
| `TROOPER_WEBHOOK_SECRET` | No | — | Secret header for webhook authentication |
| `DATABASE_PROVIDER` | No | `sqlite` | `sqlite` or `postgresql` |
| `DATABASE_URL` | No | `file:./trooper.db` | Database connection string |
| `PORT` | No | `3000` | Dashboard port |

---

## Adding a new feedback source (adapter)

Create `packages/adapters/src/linear/index.ts`:

```typescript
import type { AdapterPlugin, FeedbackEvent } from '../base.js'

export class LinearAdapter implements AdapterPlugin {
  readonly name = 'linear'

  async parse(payload: unknown, headers: Record<string, string>): Promise<FeedbackEvent | null> {
    // normalize Linear webhook payload → FeedbackEvent
    const p = payload as Record<string, unknown>
    if (p.type !== 'Issue') return null
    return {
      source: 'linear',
      sourceRef: p.id as string,
      type: 'FEATURE',
      title: p.title as string,
      body: p.description as string ?? '',
      repoOwner: 'your-org',
      repoName: 'your-repo',
    }
  }
}
```

Register it in `packages/adapters/src/index.ts`:
```typescript
import { LinearAdapter } from './linear/index.js'
registerAdapter(new LinearAdapter())
```

That's it — no changes needed anywhere else.

---

## Adding a new AI provider

Create `packages/core/src/models/providers/myprovider.ts`, implement `AgentModel`, add a case in `packages/core/src/models/index.ts`.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

---

## License

MIT — see [LICENSE](LICENSE).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

See [SECURITY.md](SECURITY.md).
