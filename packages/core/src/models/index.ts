import type { AgentModel, ModelConfig } from './types.js'
import { ClaudeModel } from './providers/claude.js'
import { OpenAIModel } from './providers/openai.js'
import { GeminiModel } from './providers/gemini.js'
import { OllamaModel } from './providers/ollama.js'
import { GroqModel } from './providers/groq.js'

export function createModel(config: ModelConfig): AgentModel {
  switch (config.provider) {
    case 'claude':
      if (!config.apiKey) throw new Error('Claude requires an API key')
      return new ClaudeModel(config.apiKey, config.model)

    case 'openai':
      if (!config.apiKey) throw new Error('OpenAI requires an API key')
      return new OpenAIModel(config.apiKey, config.model)

    case 'gemini':
      if (!config.apiKey) throw new Error('Gemini requires an API key')
      return new GeminiModel(config.apiKey, config.model)

    case 'ollama':
      return new OllamaModel(config.model, config.baseUrl)

    case 'groq':
      if (!config.apiKey) throw new Error('Groq requires an API key')
      return new GroqModel(config.apiKey, config.model)

    default:
      throw new Error(`Unknown model provider: ${config.provider}`)
  }
}

export const SUPPORTED_MODELS: Record<string, { label: string; models: string[]; requiresKey: boolean }> = {
  claude: {
    label: 'Claude (Anthropic)',
    models: ['claude-sonnet-4-6', 'claude-opus-4-8', 'claude-haiku-4-5-20251001'],
    requiresKey: true,
  },
  openai: {
    label: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    requiresKey: true,
  },
  gemini: {
    label: 'Google Gemini',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash'],
    requiresKey: true,
  },
  groq: {
    label: 'Groq (fast + cheap)',
    models: ['llama-3.1-70b-versatile', 'mixtral-8x7b-32768'],
    requiresKey: true,
  },
  ollama: {
    label: 'Ollama (local, free)',
    models: ['llama3', 'codellama', 'deepseek-coder'],
    requiresKey: false,
  },
}

export * from './types.js'
