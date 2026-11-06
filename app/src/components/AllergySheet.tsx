import { useEffect, useRef } from 'react'
import { ALLERGEN_IDS, allergenKey } from '../lib/allergens'
import { useT, type StringKey } from '../lib/i18n'

interface AllergySheetProps {
  open: boolean
  selected: string[]
  onToggle: (id: string) => void
  onClose: () => void
}

export function AllergySheet({ open, selected, onToggle, onClose }: AllergySheetProps) {
  const t = useT()
  const panel = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return

    const previous = document.activeElement as HTMLElement | null
    document.body.classList.add('sheet-open')

    const getFocusable = () =>
      Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      )

    getFocusable()[0]?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = getFocusable()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('sheet-open')
      previous?.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="sheet-backdrop" onClick={() => closeRef.current()}>
      <div
        ref={panel}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="allergy-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-grab" aria-hidden="true" />
        <h2 id="allergy-title">{t('allergyTitle')}</h2>
        <p className="muted">{t('allergyIntro')}</p>

        <div className="sheet-chips">
          {ALLERGEN_IDS.map((id) => {
            const active = selected.includes(id)
            return (
              <button
                key={id}
                type="button"
                className={`chip ${active ? 'chip-active' : ''}`}
                aria-pressed={active}
                onClick={() => onToggle(id)}
              >
                {active ? '✓ ' : ''}
                {t(`allergen_${allergenKey(id)}` as StringKey)}
              </button>
            )
          })}
        </div>

        <p className="fine">{t('allergyFine')}</p>

        <button type="button" className="btn btn-primary btn-block" onClick={() => closeRef.current()}>
          {t('done')}
        </button>
      </div>
    </div>
  )
}
