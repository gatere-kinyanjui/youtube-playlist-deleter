import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import './ProgressDrawer.css'

interface ProgressEvent {
  done: number; total: number; complete?: boolean; error?: string; quotaExceeded?: boolean
}

interface Props {
  jobId: string | null
  onDone: () => void
}

export function ProgressDrawer({ jobId, onDone }: Props) {
  const [progress, setProgress] = useState<ProgressEvent | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    if (!jobId) { setProgress(null); return }

    intervalRef.current = setInterval(async () => {
      try {
        const status = await api.jobs.status(jobId)
        setProgress(status)
        if (status.complete) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          setTimeout(() => doneRef.current(), 1500)
        }
      } catch {
        if (intervalRef.current) clearInterval(intervalRef.current)
        doneRef.current()
      }
    }, 1500)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [jobId])

  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0
  const visible = !!jobId

  return (
    <div className={`progress-drawer ${visible ? 'visible' : ''}`}>
      {progress?.error && progress.quotaExceeded ? (
        <div className="progress-quota-msg">
          ⚠ Quota exceeded — {progress.done}/{progress.total} deleted. Resets at midnight Pacific.
        </div>
      ) : progress?.error ? (
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
