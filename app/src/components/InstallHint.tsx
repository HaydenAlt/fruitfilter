import { useEffect, useRef, useState } from 'react'
import { useT } from '../lib/i18n'
import { dismissInstallHint, installHintDismissed } from '../lib/storage'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Mode = 'hidden' | 'ios' | 'android'

export function InstallHint() {
  const t = useT()
  const [mode, setMode] = useState<Mode>('hidden')
  const promptEvent = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (installHintDismissed()) return

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    if (standalone) return

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    const isAndroid = /android/i.test(navigator.userAgent)

    if (isIOS) {
      setMode('ios')
    }

    const onPrompt = (event: Event) => {
      event.preventDefault()
      if (!isAndroid) return
      promptEvent.current = event as BeforeInstallPromptEvent
      setMode('android')
    }

    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  useEffect(() => {
    if (mode === 'hidden') return
    document.body.classList.add('has-install')
    return () => document.body.classList.remove('has-install')
  }, [mode])

  if (mode === 'hidden') return null

  const dismiss = () => {
    dismissInstallHint()
    setMode('hidden')
  }

  return (
    <aside className="install" aria-label={t('installTitle')}>
      <div className="install-copy">
        <strong>{t('installTitle')}</strong>
        <span>{mode === 'ios' ? t('installIOS') : t('installAndroid')}</span>
      </div>
      {mode === 'android' && (
        <button
          type="button"
          className="btn btn-small btn-primary"
          onClick={async () => {
            await promptEvent.current?.prompt()
            dismiss()
          }}
        >
          {t('installAction')}
        </button>
      )}
      <button type="button" className="install-close" onClick={dismiss} aria-label={t('dismiss')}>
        ✕
      </button>
    </aside>
  )
}
