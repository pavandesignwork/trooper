import OpenAI from 'openai'
import type { AgentModel, CompletionOptions, CompletionResult } from '../types.js'

// Groq is OpenAI-compatible, so we reuse the OpenAI client with a different base URL
export class GroqModel implements AgentModel {
  private client: OpenAI
  private model: string

  constructor(apiKey: string, model = 'llama-3.1-70b-versatile') {
    this.client = new OpenAI({ apiKey, baseURL: 'https://api.groq.com/openai/v1' })
    this.model = model
  }

  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []

    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt })
    }

    for (const m of options.messages) {
      messages.push({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })
    }

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      max_tokens: options.maxTokens ?? 8096,
      temperature: options.temperature ?? 0.2,
    })

    const choice = response.choices[0]
    return {
      content: choice.message.content ?? '',
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      model: this.model,
      provider: 'groq',
    }
  }
}
