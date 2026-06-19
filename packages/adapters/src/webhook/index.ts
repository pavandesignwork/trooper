import { FeedbackEventSchema, type AdapterPlugin, type FeedbackEvent } from '../base.js'

// Generic webhook adapter — accepts any payload that already matches FeedbackEvent shape.
// Useful for custom integrations (Slack bots, Intercom, internal tools).
export class WebhookAdapter implements AdapterPlugin {
  readonly name = 'webhook'

  async parse(rawPayload: unknown, _headers: Record<string, string>): Promise<FeedbackEvent | null> {
    const result = FeedbackEventSchema.safeParse(rawPayload)
    if (!result.success) return null
    return result.data
  }
}
