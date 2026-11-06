import type { ScanRecord } from './types'
import type { RecipeBundle } from './types'
import type { Lang } from './i18n'
import type { ThemeMode } from './theme'

const PROFILE_KEY = 'ff.profile.v1'
const HISTORY_KEY = 'ff.history.v1'
const INSTALL_KEY = 'ff.installHint.v1'
const SPEECH_KEY = 'ff.speech.v1'
const LANG_KEY = 'ff.lang.v1'
const THEME_KEY = 'ff.theme.v1'
const RECIPE_KEY = 'ff.recipes.v1'

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be unavailable (private mode). The app still works for this session.
  }
}

export function loadAllergies(): string[] {
  const value = read<unknown>(PROFILE_KEY, [])
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export function saveAllergies(allergies: string[]): void {
  write(PROFILE_KEY, allergies)
}

export function loadHistory(): ScanRecord[] {
  const value = read<unknown>(HISTORY_KEY, [])
  return Array.isArray(value) ? (value as ScanRecord[]).slice(0, 5) : []
}

export function addToHistory(record: ScanRecord): ScanRecord[] {
  const next = [record, ...loadHistory().filter((item) => item.id !== record.id)].slice(0, 5)
  write(HISTORY_KEY, next)
  return next
}

export function loadSpeechEnabled(): boolean {
  return read<boolean>(SPEECH_KEY, true)
}

export function saveSpeechEnabled(enabled: boolean): void {
  write(SPEECH_KEY, enabled)
}

export function installHintDismissed(): boolean {
  return read<boolean>(INSTALL_KEY, false)
}

export function dismissInstallHint(): void {
  write(INSTALL_KEY, true)
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function loadLang(): Lang {
  return read<string>(LANG_KEY, 'en') === 'zh-HK' ? 'zh-HK' : 'en'
}

export function saveLang(lang: Lang): void {
  write(LANG_KEY, lang)
}

export function loadTheme(): ThemeMode {
  const value = read<string>(THEME_KEY, 'system')
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
}

export function saveTheme(mode: ThemeMode): void {
  write(THEME_KEY, mode)
}

const RECIPE_CACHE_MAX = 8

export function loadRecipeCache(): Record<string, RecipeBundle> {
  const value = read<unknown>(RECIPE_KEY, {})
  return value && typeof value === 'object' ? (value as Record<string, RecipeBundle>) : {}
}

export function getCachedRecipes(key: string): RecipeBundle | null {
  return loadRecipeCache()[key] ?? null
}

export function setCachedRecipes(key: string, bundle: RecipeBundle): void {
  const cache = loadRecipeCache()
  cache[key] = bundle
  const keys = Object.keys(cache)
  if (keys.length > RECIPE_CACHE_MAX) {
    for (const stale of keys.slice(0, keys.length - RECIPE_CACHE_MAX)) delete cache[stale]
  }
  write(RECIPE_KEY, cache)
}
