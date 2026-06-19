import { z } from 'zod'

// Every adapter must normalize its payload into this shape.
// This is the contract collaborators implement when adding new sources.
export const FeedbackEventSchema = z.object({
  source: z.string(),           // "github" | "slack" | "linear" | "webhook" | ...
  sourceRef: z.string().optional(), // external ID (e.g. GitHub issue number)
  type: z.enum(['BUG', 'FEATURE', 'FEEDBACK']),
  title: z.string(),
  body: z.string(),
  repoOwner: z.string(),
  repoName: z.string(),
  metadata: z.record(z.unknown()).optional(),
})

export type FeedbackEvent = z.infer<typeof FeedbackEventSchema>

// The interface every adapter must implement.
// To add a new source (e.g. Linear, Jira, Intercom), create a class
// that implements AdapterPlugin and register it in the adapter registry.
export interface AdapterPlugin {
  readonly name: string
  parse(rawPayload: unknown, headers: Record<string, string>): Promise<FeedbackEvent | null>
}
