import { useLang, useT } from '../lib/i18n'
import type { Ripeness, ScanRecord } from '../lib/types'

interface HistoryStripProps {
  items: ScanRecord[]
  onSelect: (record: ScanRecord) => void
}

export function HistoryStrip({ items, onSelect }: HistoryStripProps) {
  const t = useT()
  const lang = useLang()

  if (items.length === 0) return null

  return (
    <section className="history" aria-labelledby="history-title">
      <div className="history-head">
        <h2 id="history-title">{t('recentScans')}</h2>
        <span className="fine">{t('storedDevice')}</span>
      </div>
      <div className="history-row">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="history-item"
            onClick={() => onSelect(item)}
          >
            <img src={item.thumb} alt="" className="history-thumb" />
            <span className="history-name">{item.analysis.display_name || item.analysis.fruit}</span>
            <span className={`history-band band-${item.analysis.ripeness}`}>
              {t(item.analysis.ripeness as Ripeness)}
            </span>
            <span className="history-time">
              {new Date(item.createdAt).toLocaleTimeString(lang === 'zh-HK' ? 'zh-HK' : 'en', {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
