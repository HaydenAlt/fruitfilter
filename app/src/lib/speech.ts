import { allergenKey, type AllergenId } from './allergens'
import { t, type Lang, type StringKey } from './i18n'
import type { Analysis } from './types'

let unlocked = false

export function unlockSpeech(): void {
  if (unlocked || typeof window === 'undefined' || !('speechSynthesis' in window)) return
  unlocked = true
  try {
    const warm = new SpeechSynthesisUtterance(' ')
    warm.volume = 0
    window.speechSynthesis.speak(warm)
  } catch {
    // Speech is unavailable; the on-screen text is always the source of truth.
  }
}

function findVoice(lang: Lang): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  const targets =
    lang === 'zh-HK' ? ['zh-HK', 'zh-TW', 'zh'] : ['en', navigator.language || 'en-US']

  for (const target of targets) {
    const exact = voices.find((voice) => voice.lang.toLowerCase() === target.toLowerCase())
    if (exact) return exact
    const prefix = voices.find((voice) =>
      voice.lang.toLowerCase().startsWith(target.toLowerCase()),
    )
    if (prefix) return prefix
  }
  return undefined
}

export function speak(text: string, lang: Lang): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false
  try {
    const synth = window.speechSynthesis
    synth.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang === 'zh-HK' ? 'zh-HK' : 'en'
    utterance.rate = 0.98
    utterance.pitch = 1
    const voice = findVoice(lang)
    if (voice) utterance.voice = voice
    synth.speak(utterance)
    return true
  } catch {
    return false
  }
}

export function spokenSummary(
  analysis: Analysis,
  conflicts: AllergenId[],
  selectedCount: number,
  lang: Lang,
): string {
  if (!analysis.is_food) {
    return `${t(lang, 'noFruitTitle')}. ${t(lang, 'noFruitBody')}`
  }

  const parts = [analysis.display_name, `${t(lang, analysis.ripeness)}.`]

  if (analysis.ripeness_evidence.length > 0) {
    parts.push(`${analysis.ripeness_evidence[0]}.`)
  }

  parts.push(analysis.advice)

  if (conflicts.length > 0) {
    parts.push(t(lang, `warn_${allergenKey(conflicts[0])}_detail` as StringKey))
  } else if (selectedCount > 0) {
    parts.push(t(lang, 'noConflict'))
  }

  if (analysis.multiple) {
    parts.push(t(lang, 'multiple'))
  }

  return parts.join(' ')
}
