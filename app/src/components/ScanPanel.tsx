import { useRef } from 'react'
import { useT } from '../lib/i18n'
import type { EatWhen } from '../lib/types'

interface ScanPanelProps {
  allergies: string[]
  speechOn: boolean
  busy: boolean
  eatWhen: EatWhen
  onEatWhen: (value: EatWhen) => void
  onFile: (file: File) => void
  onOpenAllergies: () => void
  onToggleSpeech: () => void
}

const EAT_OPTIONS: { id: EatWhen; key: 'eatNow' | 'eatTomorrow' | 'eatLater' }[] = [
  { id: 'now', key: 'eatNow' },
  { id: 'tomorrow', key: 'eatTomorrow' },
  { id: 'later', key: 'eatLater' },
]

export function ScanPanel({
  allergies,
  speechOn,
  busy,
  eatWhen,
  onEatWhen,
  onFile,
  onOpenAllergies,
  onToggleSpeech,
}: ScanPanelProps) {
  const t = useT()
  const cameraInput = useRef<HTMLInputElement>(null)
  const libraryInput = useRef<HTMLInputElement>(null)

  const pick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onFile(file)
    event.target.value = ''
  }

  return (
    <section className="scan" aria-busy={busy}>
      <div className="hero">
        <h1>{t('heroTitle')}</h1>
        <p className="lede">{t('heroLede')}</p>
      </div>

      <div className="timing">
        <p className="field-label" id="eat-when-label">
          {t('eatingWhen')}
        </p>
        <div className="segmented" role="group" aria-labelledby="eat-when-label">
          {EAT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`segment ${eatWhen === option.id ? 'segment-active' : ''}`}
              aria-pressed={eatWhen === option.id}
              onClick={() => onEatWhen(option.id)}
            >
              {t(option.key)}
            </button>
          ))}
        </div>
      </div>

      <div className="scan-actions">
        <button
          type="button"
          className="btn btn-primary btn-xl"
          onClick={() => cameraInput.current?.click()}
          disabled={busy}
          data-testid="scan-camera"
        >
          <CameraIcon />
          {t('takePhoto')}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => libraryInput.current?.click()}
          disabled={busy}
        >
          {t('chooseLibrary')}
        </button>
      </div>

      <input
        ref={cameraInput}
        className="visually-hidden"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={pick}
        tabIndex={-1}
        aria-label={t('takePhoto')}
      />
      <input
        ref={libraryInput}
        className="visually-hidden"
        type="file"
        accept="image/*"
        onChange={pick}
        tabIndex={-1}
        aria-label={t('chooseLibrary')}
      />

      <div className="prefs">
        <button type="button" className="pref-button" onClick={onOpenAllergies}>
          <span className="pref-label">{t('allergies')}</span>
          <span className="pref-value">
            {allergies.length === 0
              ? t('addAllergies')
              : t('selectedCount', { count: allergies.length })}
          </span>
          <ChevronIcon />
        </button>

        <button
          type="button"
          className="pref-button"
          aria-pressed={speechOn}
          onClick={onToggleSpeech}
        >
          <span className="pref-label">{t('speakResults')}</span>
          <span className="pref-value">{speechOn ? t('on') : t('off')}</span>
          <span className={`switch ${speechOn ? 'switch-on' : ''}`} aria-hidden="true">
            <span className="switch-dot" />
          </span>
        </button>
      </div>

      <p className="privacy">{t('privacy')}</p>
    </section>
  )
}

function CameraIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path
        d="M4 8.5h2.2l1.3-2h9l1.3 2H20a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18v-8A1.5 1.5 0 0 1 4 8.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13.8" r="3.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none">
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
