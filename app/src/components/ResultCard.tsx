import { useEffect, useRef } from 'react'
import { allergenKey, checkAllergens } from '../lib/allergens'
import { useLang, useT, type StringKey } from '../lib/i18n'
import { nutritionFor } from '../data/nutrition'
import type { Ripeness, ScanRecord } from '../lib/types'

interface ResultCardProps {
  record: ScanRecord
  allergies: string[]
  onScanAgain: () => void
  onSpeak: () => void
  onOpenAllergies: () => void
  onRecipes: () => void
  onChat: () => void
  stale?: boolean
}

const BAND_CLASS: Record<Ripeness, string> = {
  unripe: 'pill-unripe',
  ripe: 'pill-ripe',
  overripe: 'pill-overripe',
  unknown: 'pill-unknown',
}

const BAND_GLYPH: Record<Ripeness, string> = {
  unripe: '○',
  ripe: '●',
  overripe: '◐',
  unknown: '?',
}

function confidenceKey(confidence: number): StringKey {
  if (confidence >= 0.75) return 'highConfidence'
  if (confidence >= 0.5) return 'mediumConfidence'
  return 'lowConfidenceLabel'
}

export function ResultCard({
  record,
  allergies,
  onScanAgain,
  onSpeak,
  onOpenAllergies,
  onRecipes,
  onChat,
  stale = false,
}: ResultCardProps) {
  const t = useT()
  const lang = useLang()
  const heading = useRef<HTMLHeadingElement>(null)
  const analysis = record.analysis
  const conflicts = checkAllergens(analysis.fruit, allergies)
  const nutrition = nutritionFor(analysis.fruit)
  const percent = Math.round(analysis.confidence * 100)

  useEffect(() => {
    heading.current?.focus()
  }, [record.id])

  if (!analysis.is_food) {
    return (
      <section className="card result" aria-labelledby="result-title">
        {stale && <p className="stale">{t('cached')}</p>}
        <p className="eyebrow">{t('noFruitEyebrow')}</p>
        <h2 id="result-title" ref={heading} tabIndex={-1}>
          {t('noFruitTitle')}
        </h2>
        <p className="muted">{t('noFruitBody')}</p>
        <div className="result-actions">
          <button type="button" className="btn btn-primary" onClick={onScanAgain}>
            {t('scanAgain')}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="card result" aria-labelledby="result-title">
      {stale && <p className="stale">{t('cached')}</p>}

      <div className="result-head">
        <div className="result-title-block">
          <p className="eyebrow">{t('fruit')}</p>
          <h2 id="result-title" ref={heading} tabIndex={-1}>
            {analysis.display_name || analysis.fruit}
          </h2>
          <p className="confidence">
            {t('confidenceLine', {
              label: t(confidenceKey(analysis.confidence)),
              percent,
            })}
          </p>
        </div>
        <span className={`pill ${BAND_CLASS[analysis.ripeness]}`}>
          <span className="pill-glyph" aria-hidden="true">
            {BAND_GLYPH[analysis.ripeness]}
          </span>
          {t(analysis.ripeness)}
        </span>
      </div>

      {analysis.confidence < 0.6 && <p className="hint">{t('lowConfidence')}</p>}

      {analysis.alternatives.length > 0 && (
        <p className="alt">{t('couldAlsoBe', { list: analysis.alternatives.join('、') })}</p>
      )}

      {analysis.ripeness_evidence.length > 0 && (
        <ul className="evidence">
          {analysis.ripeness_evidence.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}

      <div className="advice">
        <p className="advice-label">{t('whatToDo')}</p>
        <p>{analysis.advice}</p>
      </div>

      {analysis.multiple && <p className="notice">{t('multiple')}</p>}

      {conflicts.length > 0 ? (
        <div className="alert" role="alert">
          <p className="alert-title">{t('allergenWarning')}</p>
          {conflicts.map((id) => (
            <div key={id} className="alert-row">
              <p className="alert-heading">
                {t(`warn_${allergenKey(id)}_title` as StringKey)}
              </p>
              <p>{t(`warn_${allergenKey(id)}_detail` as StringKey)}</p>
            </div>
          ))}
          <p className="alert-fine">{t('disclaimer')}</p>
        </div>
      ) : allergies.length > 0 ? (
        <p className="allergy-clear">
          {t('noConflict')}
          <span className="fine"> {t('disclaimer')}</span>
        </p>
      ) : (
        <div className="allergy-empty">
          <p>{t('addAllergiesPrompt')}</p>
          <button type="button" className="link-button" onClick={onOpenAllergies}>
            {t('addAllergiesLink')}
          </button>
        </div>
      )}

      {nutrition && (
        <div className="nutrition">
          <div className="nutrition-grid">
            <div className="nutrition-cell">
              <span className="nutrition-value">{nutrition.kcal}</span>
              <span className="nutrition-label">{t('kcal')}</span>
            </div>
            <div className="nutrition-cell">
              <span className="nutrition-value">{nutrition.fiber} g</span>
              <span className="nutrition-label">{t('fibre')}</span>
            </div>
            <div className="nutrition-cell">
              <span className="nutrition-value">{nutrition.vitaminC} mg</span>
              <span className="nutrition-label">{t('vitaminC')}</span>
            </div>
            <div className="nutrition-cell">
              <span className="nutrition-value">{nutrition.sugar} g</span>
              <span className="nutrition-label">{t('sugar')}</span>
            </div>
          </div>
          <p className="fine">{t('per100g')}</p>
        </div>
      )}

      <div className="result-meta">
        <span>
          {t('scannedAt', {
            time: new Date(record.createdAt).toLocaleTimeString(
              lang === 'zh-HK' ? 'zh-HK' : 'en',
              { hour: 'numeric', minute: '2-digit' },
            ),
          })}
        </span>
        <span>{t('estimatedRipeness')}</span>
      </div>

      <div className="result-actions">
        <button type="button" className="btn btn-secondary" onClick={onSpeak}>
          <SpeakerIcon />
          {t('hearIt')}
        </button>
        <button type="button" className="btn btn-primary" onClick={onScanAgain}>
          {t('scanAgain')}
        </button>
      </div>

      <div className="result-tools">
        <button
          type="button"
          className="tool-button"
          onClick={onRecipes}
          data-testid="result-recipes"
        >
          <RecipeIcon />
          {t('recipes')}
        </button>
        <button type="button" className="tool-button" onClick={onChat} data-testid="result-chat">
          <ChatIcon />
          {t('ask')}
        </button>
      </div>
    </section>
  )
}

function SpeakerIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none">
      <path
        d="M4 9.5v5h3.2L12 18V6L7.2 9.5H4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M15.5 9a4.2 4.2 0 0 1 0 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M18 6.5a8 8 0 0 1 0 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function RecipeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none">
      <path
        d="M6 3v8a3 3 0 0 0 6 0V3M9 3v18M17 3c-1.7 1.5-2.5 3.6-2.5 6s.8 3.5 2.5 4v8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none">
      <path
        d="M4 5.5h16v10H9l-5 4v-14Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M8 9h8M8 12h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
