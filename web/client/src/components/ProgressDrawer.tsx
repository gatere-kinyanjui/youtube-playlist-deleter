import { useEffect, useState } from 'react'
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

  useEffect(() => {
    if (!jobId) { setProgress(null); return }

    let timerId: ReturnType<typeof setTimeout> | null = null
    const es = new EventSource(`/api/jobs/${jobId}/progress`, { withCredentials: true })

    es.onmessage = (e: MessageEvent<string>) => {
      const data = JSON.parse(e.data) as ProgressEvent
      setProgress(data)
      if (data.complete) {
        es.close()
        timerId = setTimeout(onDone, 1500)
      }
    }
    es.onerror = () => { es.close(); onDone() }

    return () => {
      es.close()
      if (timerId !== null) clearTimeout(timerId)
    }
  }, [jobId, onDone])

  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0
  const visible = !!jobId

  return (
    <div className={`progress-drawer ${visible ? 'visible' : ''}`}>
      {progress?.error ? (
        <div className="progress-quota-msg">
          ⚠ {progress.error} ({progress.done}/{progress.total} deleted)
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
