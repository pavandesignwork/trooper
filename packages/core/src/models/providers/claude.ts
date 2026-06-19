import Anthropic from '@anthropic-ai/sdk'
import type { AgentModel, CompletionOptions, CompletionResult } from '../types.js'

export class ClaudeModel implements AgentModel {
  private client: Anthropic
  private model: string

  constructor(apiKey: string, model = 'claude-sonnet-4-6') {
    this.client = new Anthropic({ apiKey })
    this.model = model
  }

  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const messages = options.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options.maxTokens ?? 8096,
      system: options.systemPrompt,
      messages,
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type from Claude')

    return {
      content: content.text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: this.model,
      provider: 'claude',
    }
  }
}
