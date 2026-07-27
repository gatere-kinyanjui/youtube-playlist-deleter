import { useEffect, useRef, useState } from 'react'
import { api, JobStatus } from '../api'
import './ProgressDrawer.css'

interface Props {
  jobId: string | null
  onDone: (status: JobStatus) => void
}

export function ProgressDrawer({ jobId, onDone }: Props) {
  const [progress, setProgress] = useState<JobStatus | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const doneRef = useRef(onDone)
  const jobRef = useRef<string | null>(null)
  const finishedRef = useRef(false)
  doneRef.current = onDone

  useEffect(() => {
    if (!jobId) { setProgress(null); return }
    jobRef.current = jobId
    finishedRef.current = false

    intervalRef.current = setInterval(async () => {
      if (finishedRef.current) return
      const currentJob = jobRef.current
      try {
        const status = await api.jobs.status(jobId)
        if (jobRef.current !== currentJob) return
        if (finishedRef.current) return
        setProgress(status)
        if (status.complete) {
          finishedRef.current = true
          if (intervalRef.current) clearInterval(intervalRef.current)
          intervalRef.current = null
          completeTimerRef.current = setTimeout(() => {
            completeTimerRef.current = null
            if (jobRef.current === jobId) doneRef.current(status)
          }, 1500)
        }
      } catch {
        if (jobRef.current !== currentJob) return
        if (finishedRef.current) return
        finishedRef.current = true
        if (intervalRef.current) clearInterval(intervalRef.current)
        intervalRef.current = null
        const errStatus: JobStatus = { done: 0, total: 0, failed: 0, deletedIds: [], complete: true, error: 'Connection lost' }
        setProgress(errStatus)
        doneRef.current(errStatus)
      }
    }, 1500)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current)
    }
  }, [jobId])

  if (!jobId || !progress) return null

  const pct = Math.round((progress.done / progress.total) * 100)

  return (
    <div className={`progress-drawer visible`}>
      {progress.complete ? (
        <div className="progress-complete">
          <span className="progress-check">✓</span>
          <span>
            {progress.error && progress.quotaExceeded
              ? `⚠ Quota exceeded — ${progress.done}/${progress.total} deleted. Resets at midnight Pacific.`
              : progress.error
              ? `⚠ ${progress.error} (${progress.done}/${progress.total})`
              : `Deleted ${progress.done} playlist${progress.done !== 1 ? 's' : ''}`}
          </span>
        </div>
      ) : progress.error ? (
        <div className="progress-complete">
          <span>⚠ {progress.error} ({progress.done}/{progress.total})</span>
        </div>
      ) : (
        <>
          <div className="progress-label">
            Deleting {progress.done}/{progress.total}…
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
