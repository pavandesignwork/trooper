# Security Policy

## Supported versions

Only the latest release receives security fixes.

| Version | Supported |
|---|---|
| latest | ✅ |
| older | ❌ |

---

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Email **security@trooper.dev** with:
- A description of the vulnerability
- Steps to reproduce it
- The potential impact
- Any suggested fix (optional)

We will acknowledge your report within **48 hours** and aim to release a fix within **7 days** for critical issues.

We do not currently offer a bug bounty, but we will credit you in the release notes if you wish.

---

## Threat model

Trooper is a self-hosted tool. Understanding its trust boundaries helps you deploy it safely.

### What Trooper can do

- Clone any repo the configured GitHub token has access to
- Write files and run commands inside a temporary working directory
- Open pull requests on your behalf
- Read environment variables passed to the process

### What Trooper cannot do

- Access repos outside the configured GitHub token's permissions
- Write files outside the cloned repo's working directory (path traversal is blocked)
- Run `rm -rf`, `curl`, `wget`, `sudo`, or `chmod 777` (blocked command list in the tool executor)
- Merge its own PRs — the human review gate is enforced by GitHub, not Trooper

### Trust boundaries

| Boundary | Risk | Mitigation |
|---|---|---|
| Incoming webhooks | Attacker floods with fake tickets, burning API credits | Rate limiting (30 req/min/IP) + `TROOPER_WEBHOOK_SECRET` |
| Agent tool calls | Model hallucinates a malicious file path | `safeResolve()` rejects paths outside `workDir` |
| Agent-written code | Agent writes malicious code in a PR | Human review gate — no auto-merge |
| API keys in `.env` | Key leaks if server is compromised | Keys never leave your server; never committed to git |
| GitHub token scope | Overpowered token increases blast radius | Use a fine-grained PAT scoped to the minimum repos needed |

---

## Recommended deployment hardening

**1. Use a fine-grained GitHub token**

Create a PAT scoped only to the specific repos Trooper should access, with only `Contents: Read & Write` and `Pull requests: Read & Write` permissions.

**2. Set a webhook secret**

```bash
TROOPER_WEBHOOK_SECRET=a-long-random-string
```

Send it as `X-Trooper-Secret: <secret>` from every webhook source. Requests without it are rejected with 401.

**3. Never expose Trooper to the public internet without auth**

The dashboard has no authentication. Run it behind a VPN, SSH tunnel, or reverse proxy with basic auth if multiple people need access.

**4. Rotate your API keys regularly**

Especially the GitHub token — if it leaks, an attacker can open PRs on your repos.

**5. Review every PR Trooper opens**

The agent can write incorrect or insecure code. The human review gate exists for this reason. Never configure GitHub to auto-merge Trooper PRs.

---

## Known limitations

- The dashboard has no built-in authentication — it is designed for private/internal use only.
- Rate limiting is in-memory and resets on server restart. For production, use a Redis-backed counter.
- The agent's blocked command list is not exhaustive — a sufficiently adversarial prompt could find gaps. The working directory isolation is the primary defence.
