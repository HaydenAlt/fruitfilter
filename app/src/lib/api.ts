import type { StringKey } from './i18n'
import type { Lang } from './i18n'
import type {
  Analysis,
  ApiErrorBody,
  ChatMessage,
  ChatSource,
  EatWhen,
  ErrorCode,
  Goal,
  RecipeBundle,
} from './types'

export class AppError extends Error {
  code: ErrorCode | 'network'
  retryable: boolean

  constructor(code: ErrorCode | 'network', message: string, retryable = true) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.retryable = retryable
  }
}

async function postJson<T>(url: string, body: unknown, timeoutMs: number): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    const payload = (await response.json().catch(() => null)) as (ApiErrorBody & T) | null

    if (!response.ok || !payload || 'error' in payload) {
      const error = payload as ApiErrorBody | null
      throw new AppError(
        error?.error?.code ?? 'upstream',
        error?.error?.message ?? 'The service did not answer. Try again.',
        error?.error?.retryable ?? true,
      )
    }

    return payload
  } catch (error) {
    if (error instanceof AppError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new AppError('timeout', 'The request took too long. Try again.', true)
    }
    throw new AppError('network', "Can't reach the service. Check your connection.", true)
  } finally {
    clearTimeout(timer)
  }
}

export function analyze(input: {
  image: string
  lang: Lang
  eatWhen: EatWhen
}): Promise<Analysis> {
  return postJson<Analysis>('/api/identify', input, 32_000)
}

export function fetchRecipes(input: {
  fruit: string
  ripeness: string
  lang: Lang
  goal: Goal
  allergies: string[]
}): Promise<{ recipes: RecipeBundle['recipes']; model: string }> {
  return postJson('/api/recipes', input, 30_000)
}

export interface ChatReply {
  reply: string
  sources: ChatSource[]
  model: string
  web: boolean
}

export function sendChat(input: {
  fruit: string
  ripeness: string
  advice: string
  lang: Lang
  web: boolean
  allergies: string[]
  messages: ChatMessage[]
}): Promise<ChatReply> {
  return postJson<ChatReply>('/api/chat', input, 40_000)
}

const ERROR_KEYS: Record<string, StringKey> = {
  network: 'errNetwork',
  timeout: 'errTimeout',
  upstream: 'errUpstream',
  config: 'errConfig',
  bad_request: 'errBad',
  bad_response: 'errUpstream',
  internal: 'errUpstream',
  offline: 'errNetwork',
}

export function errorKey(code: string): StringKey {
  return ERROR_KEYS[code] ?? 'errUpstream'
}
