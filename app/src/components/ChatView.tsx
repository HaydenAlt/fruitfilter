import { useEffect, useRef, useState } from 'react'
import { sendChat } from '../lib/api'
import { useLang, useT } from '../lib/i18n'
import type { ChatMessage, ChatSource, ScanRecord } from '../lib/types'

export interface UiMessage extends ChatMessage {
  sources?: ChatSource[]
}

interface ChatViewProps {
  record: ScanRecord
  allergies: string[]
  messages: UiMessage[]
  onMessages: (messages: UiMessage[]) => void
  onBack: () => void
}

type Status = 'idle' | 'sending' | 'error'

export function ChatView({
  record,
  allergies,
  messages,
  onMessages,
  onBack,
}: ChatViewProps) {
  const t = useT()
  const lang = useLang()
  const [input, setInput] = useState('')
  const [web, setWeb] = useState(true)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const fruit = record.analysis.fruit
  const fruitName = record.analysis.display_name || fruit

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' })
  }, [messages.length, status])

  const run = async (next: UiMessage[]) => {
    setStatus('sending')
    setError('')

    try {
      const result = await sendChat({
        fruit,
        ripeness: record.analysis.ripeness,
        advice: record.analysis.advice,
        lang,
        web,
        allergies,
        messages: next.slice(-8).map(({ role, content }) => ({ role, content })),
      })
      onMessages([
        ...next,
        { role: 'assistant', content: result.reply, sources: result.sources },
      ])
      setStatus('idle')
    } catch {
      setError(t('chatError'))
      setStatus('error')
    }
  }

  const submit = (text: string) => {
    const value = text.trim()
    if (!value || status === 'sending') return
    const next: UiMessage[] = [...messages, { role: 'user', content: value }]
    setInput('')
    onMessages(next)
    void run(next)
  }

  const quick = [
    t('quickStorage'),
    t('quickBreakfast'),
    t('quickSnack'),
  ]

  return (
    <section className="view chat-view" aria-labelledby="chat-title">
      <div className="view-head">
        <button type="button" className="back-button" onClick={onBack} data-testid="back">
          <BackIcon />
          {t('back')}
        </button>
        <p className="eyebrow">{t('chatTitle')}</p>
        <h1 id="chat-title">{fruitName}</h1>
        <p className="muted">{t('chatIntro', { fruit: fruitName })}</p>
      </div>

      {messages.length === 0 && (
        <div className="quick-row">
          {quick.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="chip"
              onClick={() => submit(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      <div className="chat-log" role="log" aria-live="polite" aria-relevant="additions" data-testid="chat-log">
        {messages.map((message, index) => (
          <div key={`${index}-${message.role}`} className={`bubble bubble-${message.role}`}>
            <span className="visually-hidden">
              {message.role === 'user' ? t('you') : t('assistant')}:
            </span>
            <RichText text={message.content} />
            {message.sources && message.sources.length > 0 && (
              <div className="chat-sources">
                <p className="fine">{t('sources')}</p>
                <ul>
                  {message.sources.map((source) => (
                    <li key={source.url}>
                      <a href={source.url} target="_blank" rel="noopener noreferrer">
                        {source.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
        {status === 'sending' && (
          <div className="bubble bubble-assistant">
            <span className="typing">{t('chatThinking')}</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {status === 'error' && (
        <p className="chat-error" role="alert">
          {error}
          <button
            type="button"
            className="link-button"
            onClick={() => {
              if (messages.length > 0 && messages[messages.length - 1].role === 'user') {
                void run(messages)
              }
            }}
          >
            {t('tryAgain')}
          </button>
        </p>
      )}

      <form
        className="chat-form"
        onSubmit={(event) => {
          event.preventDefault()
          submit(input)
        }}
      >
        <label className="visually-hidden" htmlFor="chat-input">
          {t('chatPlaceholder')}
        </label>
        <input
          id="chat-input"
          className="chat-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t('chatPlaceholder')}
          autoComplete="off"
          maxLength={1000}
          data-testid="chat-input"
        />
        <button
          type="submit"
          className="btn btn-primary btn-send"
          disabled={status === 'sending' || input.trim().length === 0}
          data-testid="chat-send"
        >
          {t('send')}
        </button>
      </form>

      <label className="web-toggle">
        <input
          type="checkbox"
          checked={web}
          onChange={(event) => setWeb(event.target.checked)}
        />
        <span>{t('webSearch')}</span>
      </label>

      <p className="fine chat-disclaimer" id="chat-disclaimer">
        {t('chatDisclaimer')}
      </p>
    </section>
  )
}

function RichText({ text }: { text: string }) {
  const nodes: React.ReactNode[] = []
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  let key = 0

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index))
    nodes.push(
      <a key={key++} href={match[2]} target="_blank" rel="noopener noreferrer">
        {match[1]}
      </a>,
    )
    lastIndex = match.index + match[0].length
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex))
  return <p className="chat-text">{nodes}</p>
}

function BackIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none">
      <path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
