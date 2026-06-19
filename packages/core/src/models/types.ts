export type ModelProvider = 'claude' | 'openai' | 'gemini' | 'ollama' | 'groq'

export interface ModelConfig {
  provider: ModelProvider
  model: string
  apiKey?: string   // not required for ollama
  baseUrl?: string  // custom endpoint (e.g. self-hosted ollama)
}

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface CompletionOptions {
  messages: Message[]
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
}

export interface CompletionResult {
  content: string
  inputTokens: number
  outputTokens: number
  model: string
  provider: ModelProvider
}

export interface AgentModel {
  complete(options: CompletionOptions): Promise<CompletionResult>
}
