import * as crypto from 'crypto'
import { HttpException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { Observable, Subject, finalize } from 'rxjs'
import { AuthService } from '../auth/auth.service'
import { SessionToken } from '../auth/session-token.interface'
import { MusicProvider, MUSIC_PROVIDER } from '@yt/shared'

interface ProgressEvent {
  data: {
    done: number
    total: number
    current?: string
    complete?: boolean
    error?: string
    quotaExceeded?: boolean
  }
}

interface JobState {
  subject: Subject<ProgressEvent>
  aborted: boolean
  sessionId: string
}

@Injectable()
export class JobsService {
  private readonly jobs = new Map<string, JobState>()

  constructor(
    @Inject(MUSIC_PROVIDER) private readonly provider: MusicProvider,
    private readonly authService: AuthService,
  ) {}

  startDeleteJob(token: SessionToken, encryptedRefreshToken: string | null, ids: string[], sessionId: string): string {
    const jobId = crypto.randomUUID().slice(0, 8)
    const subject = new Subject<ProgressEvent>()
    const job: JobState = { subject, aborted: false, sessionId }
    this.jobs.set(jobId, job)
    this.runDeletions(token, encryptedRefreshToken, ids, subject, jobId, job).catch((err: unknown) => {
      subject.next({ data: { done: 0, total: ids.length, error: (err as Error).message ?? 'Unexpected error' } })
      subject.next({ data: { done: 0, total: ids.length, complete: true } })
      subject.complete()
      setTimeout(() => this.jobs.delete(jobId), 30_000)
    })
    return jobId
  }

  getProgress(jobId: string, sessionId: string): Observable<ProgressEvent> {
    const job = this.jobs.get(jobId)
    if (!job) throw new NotFoundException(`Job ${jobId} not found`)
    if (job.sessionId !== sessionId) throw new NotFoundException(`Job ${jobId} not found`)
    return job.subject.asObservable().pipe(finalize(() => { job.aborted = true }))
  }

  private async runDeletions(
    token: SessionToken,
    encryptedRefreshToken: string | null,
    ids: string[],
    subject: Subject<ProgressEvent>,
    jobId: string,
    job: JobState,
  ): Promise<void> {
    const total = ids.length
    let done = 0
    let failed = 0

    for (const id of ids) {
      if (job.aborted) break
      try {
        const accessToken = await this.authService.getValidAccessToken(token, encryptedRefreshToken)
        if (job.aborted) break
        await this.provider.deletePlaylist(accessToken, id)
        if (job.aborted) break
        done++
        subject.next({ data: { done, total, current: id } })
      } catch (err: unknown) {
        if (err instanceof HttpException && err.getStatus() === 429) {
          subject.next({ data: { done, total, error: 'YouTube API quota exceeded — resets at midnight Pacific Time.', quotaExceeded: true } })
          break
        }
        failed++
      }
    }

    const completionError = failed > 0
      ? `${failed} playlist${failed === 1 ? '' : 's'} could not be deleted`
      : undefined
    subject.next({ data: { done, total, complete: true, error: completionError } })
    subject.complete()
    setTimeout(() => this.jobs.delete(jobId), 30_000)
  }
}
