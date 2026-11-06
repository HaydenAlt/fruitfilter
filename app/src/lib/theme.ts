export type ThemeMode = 'system' | 'light' | 'dark'
export type ThemeColor = 'light' | 'dark'

const THEME_COLOR = { light: '#1F4D2E', dark: '#0E1A12' }

export function resolveTheme(mode: ThemeMode): ThemeColor {
  if (mode === 'light' || mode === 'dark') return mode
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(mode: ThemeMode): ThemeColor {
  const resolved = resolveTheme(mode)
  document.documentElement.dataset.theme = resolved
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_COLOR[resolved])
  return resolved
}

export function watchSystemTheme(mode: ThemeMode, onChange: () => void): () => void {
  if (mode !== 'system') return () => undefined
  const query = window.matchMedia('(prefers-color-scheme: dark)')
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}
