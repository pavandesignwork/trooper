import type { AdapterPlugin, FeedbackEvent } from '../base.js'

export class GitHubAdapter implements AdapterPlugin {
  readonly name = 'github'

  async parse(rawPayload: unknown, headers: Record<string, string>): Promise<FeedbackEvent | null> {
    const event = headers['x-github-event']
    const payload = rawPayload as Record<string, unknown>

    if (event === 'issues') {
      const action = payload['action'] as string
      if (!['opened', 'reopened'].includes(action)) return null

      const issue = payload['issue'] as Record<string, unknown>
      const repo = payload['repository'] as Record<string, unknown>
      const fullName = (repo['full_name'] as string).split('/')

      const labels = ((issue['labels'] as Array<Record<string, unknown>>) ?? []).map(
        (l) => l['name'] as string
      )

      const type = labels.includes('bug')
        ? 'BUG'
        : labels.includes('enhancement') || labels.includes('feature')
          ? 'FEATURE'
          : 'FEEDBACK'

      return {
        source: 'github',
        sourceRef: String(issue['number']),
        type,
        title: issue['title'] as string,
        body: (issue['body'] as string) ?? '',
        repoOwner: fullName[0],
        repoName: fullName[1],
        metadata: { issueUrl: issue['html_url'], labels },
      }
    }

    return null
  }
}
