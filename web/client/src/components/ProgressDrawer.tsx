import { useEffect, useRef, useState } from 'react'
import './ProgressDrawer.css'

interface ProgressEvent {
  done: number; total: number; complete?: boolean; error?: string; current?: string
}

interface Props {
  jobId: string | null
  onDone: () => void
}

export function ProgressDrawer({ jobId, onDone }: Props) {
  const [progress, setProgress] = useState<ProgressEvent | null>(null)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!jobId) { setProgress(null); return }

    const es = new EventSource(`/api/jobs/${jobId}/progress`, { withCredentials: true })
    esRef.current = es

    es.onmessage = (e: MessageEvent<string>) => {
      const data = JSON.parse(e.data) as ProgressEvent
      setProgress(data)
      if (data.complete || data.error === 'quotaExceeded') {
        es.close()
        if (data.complete) setTimeout(onDone, 1200)
      }
    }
    es.onerror = () => { es.close(); onDone() }
    return () => { es.close() }
  }, [jobId, onDone])

  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0
  const visible = !!jobId

  return (
    <div className={`progress-drawer ${visible ? 'visible' : ''}`}>
      {progress?.error === 'quotaExceeded' ? (
        <div className="progress-quota-msg">
          ⚠ Quota exceeded — deleted {progress.done}/{progress.total}.
          Quota resets at midnight Pacific Time.
        </div>
      ) : (
        <>
          <div className="progress-label">
            Deleting {progress?.done ?? 0}/{progress?.total ?? 0}…
          </div>
          <div className="progress-track" style={{flex:1}}>
            <div className="progress-fill" style={{width:`${pct}%`}} />
          </div>
          <div className="progress-pct">{pct}%</div>
        </>
      )}
    </div>
  )
}
