import { useEffect, useState } from 'react'
import { AllergySheet } from './components/AllergySheet'
import { ChatView, type UiMessage } from './components/ChatView'
import { HistoryStrip } from './components/HistoryStrip'
import { InstallHint } from './components/InstallHint'
import { RecipesView } from './components/RecipesView'
import { ResultCard } from './components/ResultCard'
import { ScanPanel } from './components/ScanPanel'
import { analyze, errorKey } from './lib/api'
import { checkAllergens } from './lib/allergens'
import {
  LangContext,
  t,
  useLangSideEffects,
  type Lang,
} from './lib/i18n'
import { applyTheme, watchSystemTheme, type ThemeMode } from './lib/theme'
import {
  addToHistory,
  loadAllergies,
  loadHistory,
  loadLang,
  loadSpeechEnabled,
  loadTheme,
  newId,
  saveAllergies,
  saveLang,
  saveSpeechEnabled,
  saveTheme,
} from './lib/storage'
import type { Analysis, EatWhen, ScanRecord } from './lib/types'
import { prepareImage } from './lib/image'
import { speak, spokenSummary, unlockSpeech } from './lib/speech'

type Status = 'idle' | 'working' | 'done' | 'error'
type View = 'home' | 'recipes' | 'chat'

export default function App() {
  const [lang, setLang] = useState<Lang>(() => loadLang())
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => loadTheme())
  const [status, setStatus] = useState<Status>('idle')
  const [record, setRecord] = useState<ScanRecord | null>(null)
  const [lastGood, setLastGood] = useState<ScanRecord | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [history, setHistory] = useState<ScanRecord[]>([])
  const [allergies, setAllergies] = useState<string[]>([])
  const [speechOn, setSpeechOn] = useState(true)
  const [eatWhen, setEatWhen] = useState<EatWhen>('now')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [online, setOnline] = useState(true)
  const [view, setView] = useState<View>('home')
  const [chatMessages, setChatMessages] = useState<UiMessage[]>([])

  useLangSideEffects(lang)

  useEffect(() => {
    const stored = loadHistory()
    setHistory(stored)
    if (stored[0]) {
      setLastGood(stored[0])
      if (!navigator.onLine) {
        setRecord(stored[0])
        setStatus('done')
      }
    }
    setAllergies(loadAllergies())
    setSpeechOn(loadSpeechEnabled())
    setOnline(navigator.onLine)

    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices()
    }

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  useEffect(() => {
    applyTheme(themeMode)
    return watchSystemTheme(themeMode, () => applyTheme(themeMode))
  }, [themeMode])

  const announce = (analysis: Analysis, selected: string[], speechLang: Lang) => {
    speak(spokenSummary(analysis, checkAllergens(analysis.fruit, selected), selected.length, speechLang), speechLang)
  }

  const handleFile = async (file: File) => {
    unlockSpeech()
    setStatus('working')
    setErrorCode(null)
    setView('home')

    try {
      const prepared = await prepareImage(file)
      const analysis = await analyze({ image: prepared.image, lang, eatWhen })
      const nextRecord: ScanRecord = {
        id: newId(),
        createdAt: Date.now(),
        thumb: prepared.thumb,
        analysis,
      }

      setRecord(nextRecord)
      setLastGood(nextRecord)
      setHistory(addToHistory(nextRecord))
      setChatMessages([])
      setStatus('done')

      if (speechOn) {
        const selected = allergies
        const speechLang = lang
        window.setTimeout(() => announce(analysis, selected, speechLang), 400)
      }
    } catch (caught) {
      const code =
        caught && typeof caught === 'object' && 'code' in caught
          ? String((caught as { code: unknown }).code)
          : 'upstream'
      setErrorCode(code)
      setStatus('error')
    }
  }

  const toggleAllergy = (id: string) => {
    setAllergies((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
      saveAllergies(next)
      return next
    })
  }

  const toggleSpeech = () => {
    setSpeechOn((current) => {
      saveSpeechEnabled(!current)
      return !current
    })
  }

  const cycleLang = () => {
    const next: Lang = lang === 'en' ? 'zh-HK' : 'en'
    setLang(next)
    saveLang(next)
  }

  const cycleTheme = () => {
    const order: ThemeMode[] = ['system', 'light', 'dark']
    const next = order[(order.indexOf(themeMode) + 1) % order.length]
    setThemeMode(next)
    saveTheme(next)
  }

  const scanAgain = () => {
    setStatus('idle')
    setRecord(null)
    setErrorCode(null)
    setView('home')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const showRecord = (item: ScanRecord) => {
    setRecord(item)
    setStatus('done')
    setErrorCode(null)
    setView('home')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const themeLabel = t(lang, themeMode === 'system' ? 'auto' : themeMode)
  const langLabel = lang === 'en' ? 'English' : '中文（香港）'
  const langVisible = lang === 'en' ? '中' : 'EN'

  return (
    <LangContext.Provider value={lang}>
      <a className="skip-link" href="#main">
        {t(lang, 'skipToContent')}
      </a>

      <div className="app">
        <header className="top">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 64 64" width="34" height="34">
                <rect width="64" height="64" rx="16" fill="#1F4D2E" />
                <circle cx="32" cy="35" r="15" fill="#E8A33D" />
                <ellipse cx="39" cy="24" rx="11" ry="5" transform="rotate(-32 39 24)" fill="#D9E7CF" />
              </svg>
            </span>
            <span className="brand-name">FruitFilter</span>
          </div>
          <div className="top-actions">
            <button
              type="button"
              className="icon-button"
              onClick={cycleLang}
              aria-label={`${langVisible} — ${t(lang, 'language')}: ${langLabel}`}
              title={t(lang, 'language')}
            >
              {langVisible}
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={cycleTheme}
              aria-label={`${t(lang, 'appearance')}: ${themeLabel}`}
              title={`${t(lang, 'appearance')}: ${themeLabel}`}
            >
              {themeMode === 'dark' ? <MoonIcon /> : themeMode === 'light' ? <SunIcon /> : <AutoIcon />}
            </button>
          </div>
        </header>

        {!online && (
          <div className="offline-banner" role="status">
            {t(lang, 'offline')}
          </div>
        )}

        <main className="main" id="main">
          {view === 'recipes' && record && (
            <RecipesView record={record} allergies={allergies} onBack={() => setView('home')} />
          )}

          {view === 'chat' && record && (
            <ChatView
              record={record}
              allergies={allergies}
              messages={chatMessages}
              onMessages={setChatMessages}
              onBack={() => setView('home')}
            />
          )}

          {view === 'home' && status === 'idle' && (
            <ScanPanel
              allergies={allergies}
              speechOn={speechOn}
              busy={false}
              eatWhen={eatWhen}
              onEatWhen={setEatWhen}
              onFile={handleFile}
              onOpenAllergies={() => setSheetOpen(true)}
              onToggleSpeech={toggleSpeech}
            />
          )}

          {view === 'home' && status === 'working' && (
            <section className="card working" aria-live="polite">
              <div className="skeleton skeleton-pill" />
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line short" />
              <p className="working-label">{t(lang, 'workingLabel')}</p>
              <p className="fine">{t(lang, 'workingHint')}</p>
            </section>
          )}

          {view === 'home' && status === 'done' && record && (
            <ResultCard
              record={record}
              allergies={allergies}
              onScanAgain={scanAgain}
              onSpeak={() => announce(record.analysis, allergies, lang)}
              onOpenAllergies={() => setSheetOpen(true)}
              onRecipes={() => setView('recipes')}
              onChat={() => setView('chat')}
            />
          )}

          {view === 'home' && status === 'error' && (
            <section className="card error-card" role="alert">
              <p className="eyebrow">{t(lang, 'errorEyebrow')}</p>
              <h2>{t(lang, 'errorTitle')}</h2>
              <p className="muted">{t(lang, errorKey(errorCode ?? 'upstream'))}</p>
              {!online && (
                <p className="notice">
                  {lastGood
                    ? `${t(lang, 'offline')}. ${t(lang, 'errorOfflineLast')}`
                    : `${t(lang, 'offline')}. ${t(lang, 'errorOfflineNone')}`}
                </p>
              )}
              <div className="result-actions">
                <button type="button" className="btn btn-primary" onClick={scanAgain}>
                  {t(lang, 'tryAgain')}
                </button>
              </div>
            </section>
          )}

          {view === 'home' && status === 'error' && lastGood && (
            <ResultCard
              record={lastGood}
              allergies={allergies}
              onScanAgain={scanAgain}
              onSpeak={() => announce(lastGood.analysis, allergies, lang)}
              onOpenAllergies={() => setSheetOpen(true)}
              onRecipes={() => setView('recipes')}
              onChat={() => setView('chat')}
              stale
            />
          )}
        </main>

        {view === 'home' && status !== 'working' && (
          <HistoryStrip items={history} onSelect={showRecord} />
        )}

        {view === 'home' && status !== 'working' && (
          <HistoryStrip items={history} onSelect={showRecord} />
        )}

        <AllergySheet
          open={sheetOpen}
          selected={allergies}
          onToggle={toggleAllergy}
          onClose={() => setSheetOpen(false)}
        />
        <InstallHint />
      </div>
    </LangContext.Provider>
  )
}

function SunIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none">
      <path
        d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function AutoIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" />
    </svg>
  )
}
