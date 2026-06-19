import { Ollama } from 'ollama'
import type { AgentModel, CompletionOptions, CompletionResult } from '../types.js'

export class OllamaModel implements AgentModel {
  private client: Ollama
  private model: string

  constructor(model = 'llama3', baseUrl = 'http://localhost:11434') {
    this.client = new Ollama({ host: baseUrl })
    this.model = model
  }

  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const messages = options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }))

    if (options.systemPrompt) {
      messages.unshift({ role: 'system', content: options.systemPrompt })
    }

    const response = await this.client.chat({
      model: this.model,
      messages,
      options: { temperature: options.temperature ?? 0.2 },
    })

    return {
      content: response.message.content,
      inputTokens: response.prompt_eval_count ?? 0,
      outputTokens: response.eval_count ?? 0,
      model: this.model,
      provider: 'ollama',
    }
  }
}
