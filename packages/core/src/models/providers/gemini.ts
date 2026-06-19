import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AgentModel, CompletionOptions, CompletionResult } from '../types.js'

export class GeminiModel implements AgentModel {
  private client: GoogleGenerativeAI
  private model: string

  constructor(apiKey: string, model = 'gemini-1.5-pro') {
    this.client = new GoogleGenerativeAI(apiKey)
    this.model = model
  }

  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const genModel = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: options.systemPrompt,
    })

    const history = options.messages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

    const last = options.messages.at(-1)
    if (!last) throw new Error('No messages provided')

    const chat = genModel.startChat({ history })
    const result = await chat.sendMessage(last.content)
    const response = result.response

    return {
      content: response.text(),
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      model: this.model,
      provider: 'gemini',
    }
  }
}
