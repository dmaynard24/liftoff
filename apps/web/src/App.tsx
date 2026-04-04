import { useState, useRef } from 'react'

const API_URL = import.meta.env.VITE_API_URL ?? ''

interface ProgressEvent {
  step: number
  total: number
  label: string
  status: 'running' | 'done' | 'error'
  error?: string
  jobId?: string
}

interface Step {
  label: string
  status: 'pending' | 'running' | 'done' | 'error'
  error?: string
}

type AppState = 'input' | 'extracting' | 'done' | 'error'

export default function App() {
  const [url, setUrl] = useState('')
  const [appState, setAppState] = useState<AppState>('input')
  const [steps, setSteps] = useState<Step[]>([])
  const [jobId, setJobId] = useState<string | null>(null)
  const [fatalError, setFatalError] = useState<string | null>(null)
  const esRef = useRef<EventSource | null>(null)

  function reset() {
    esRef.current?.close()
    setUrl('')
    setSteps([])
    setJobId(null)
    setFatalError(null)
    setAppState('input')
  }

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()

    let normalized = url.trim()
    if (!normalized) return
    if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`

    setAppState('extracting')
    setSteps([])
    setJobId(null)
    setFatalError(null)

    const es = new EventSource(`${API_URL}/api/extract?url=${encodeURIComponent(normalized)}`)
    esRef.current = es

    es.addEventListener('progress', (e) => {
      const event: ProgressEvent = JSON.parse(e.data)
      setSteps((prev) => {
        const next = [...prev]
        const idx = event.step - 1
        next[idx] = { label: event.label, status: event.status, error: event.error }
        return next
      })
    })

    es.addEventListener('complete', (e) => {
      const { jobId } = JSON.parse(e.data)
      setJobId(jobId)
      setAppState('done')
      es.close()
    })

    es.addEventListener('error', (e: MessageEvent) => {
      try {
        const event: ProgressEvent = JSON.parse(e.data)
        setSteps((prev) => {
          const next = [...prev]
          const idx = event.step - 1
          next[idx] = { label: event.label, status: 'error', error: event.error }
          return next
        })
        setFatalError(event.error ?? 'An error occurred')
      } catch {
        setFatalError('Connection lost')
      }
      setAppState('error')
      es.close()
    })
  }

  return (
    <div className="min-h-screen bg-[#0f0f11] text-[#c1c1c8] flex flex-col items-center justify-center px-4 font-sans">

      {/* Header */}
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-white mb-2">Liftoff</h1>
        <p className="text-sm text-[#6b6b78]">Paste a URL. Get a design system styleguide.</p>
      </header>

      {/* Input state */}
      {appState === 'input' && (
        <form onSubmit={handleSubmit} className="w-full max-w-xl flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://stripe.com"
              className="flex-1 bg-[#19191d] border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#7c6dfa] transition-colors"
              autoFocus
            />
            <button
              type="submit"
              disabled={!url.trim()}
              className="bg-[#7c6dfa] hover:bg-[#6a5ce8] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-3 rounded-lg transition-colors"
            >
              Extract
            </button>
          </div>
          <p className="text-xs text-white/25 text-center">
            Works with server-rendered sites and SPAs
          </p>
        </form>
      )}

      {/* Extracting / done / error states */}
      {(appState === 'extracting' || appState === 'done' || appState === 'error') && (
        <div className="w-full max-w-xl">
          <div className="bg-[#19191d] border border-white/8 rounded-xl p-6 mb-4">
            <ul className="flex flex-col gap-3">
              {steps.map((step, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <StatusIcon status={step.status} />
                  <span className={step.status === 'done' ? 'text-white' : step.status === 'running' ? 'text-[#7c6dfa]' : step.status === 'error' ? 'text-red-400' : 'text-white/30'}>
                    {step.label}
                  </span>
                  {step.status === 'error' && step.error && (
                    <span className="text-xs text-red-400/70 ml-auto truncate max-w-[160px]" title={step.error}>{step.error}</span>
                  )}
                </li>
              ))}
              {appState === 'extracting' && (
                <li className="flex items-center gap-3 text-sm text-white/25">
                  <span className="w-4 h-4 flex-shrink-0" />
                  <span>Working…</span>
                </li>
              )}
            </ul>
          </div>

          {appState === 'done' && jobId && (
            <div className="flex flex-col gap-3 items-center">
              <a
                href={`${API_URL}/api/jobs/${jobId}/styleguide`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full text-center bg-[#7c6dfa] hover:bg-[#6a5ce8] text-white text-sm font-medium px-5 py-3 rounded-lg transition-colors"
              >
                View Styleguide ↗
              </a>
              <button onClick={reset} className="text-sm text-white/40 hover:text-white/70 transition-colors">
                Start over
              </button>
            </div>
          )}

          {appState === 'error' && (
            <div className="flex flex-col gap-3 items-center">
              <p className="text-sm text-red-400 text-center">{fatalError}</p>
              <button onClick={reset} className="text-sm text-white/40 hover:text-white/70 transition-colors">
                Try again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatusIcon({ status }: { status: Step['status'] }) {
  if (status === 'done') {
    return (
      <svg className="w-4 h-4 flex-shrink-0 text-[#7c6dfa]" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (status === 'running') {
    return (
      <svg className="w-4 h-4 flex-shrink-0 text-[#7c6dfa] animate-spin" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
        <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  if (status === 'error') {
    return (
      <svg className="w-4 h-4 flex-shrink-0 text-red-400" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 5v3M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  return <span className="w-4 h-4 flex-shrink-0 rounded-full border border-white/15" />
}
