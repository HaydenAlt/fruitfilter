export type Ripeness = 'unripe' | 'ripe' | 'overripe' | 'unknown'

export interface Analysis {
  fruit: string
  display_name: string
  confidence: number
  ripeness: Ripeness
  ripeness_evidence: string[]
  advice: string
  alternatives: string[]
  is_food: boolean
  multiple: boolean
  model?: string
}

export interface ScanRecord {
  id: string
  createdAt: number
  thumb: string
  analysis: Analysis
}

export type ErrorCode =
  | 'offline'
  | 'timeout'
  | 'upstream'
  | 'bad_request'
  | 'bad_response'
  | 'config'
  | 'internal'

export interface ApiErrorBody {
  error: {
    code: ErrorCode
    message: string
    retryable: boolean
  }
}

export type EatWhen = 'now' | 'tomorrow' | 'later'
export type Goal = 'any' | 'high-protein' | 'low-sugar'

export interface Ingredient {
  name: string
  allergens: string[]
}

export interface Recipe {
  title: string
  summary: string
  minutes: number
  servings: number
  kcal: number
  protein_g: number
  sugar_g: number
  tags: string[]
  ingredients: Ingredient[]
  steps: string[]
}

export interface RecipeBundle {
  fruit: string
  goal: Goal
  lang: string
  recipes: Recipe[]
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatSource {
  title: string
  url: string
}
