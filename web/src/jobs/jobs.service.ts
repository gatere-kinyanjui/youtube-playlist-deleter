import { HttpException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { Observable, Subject, finalize } from 'rxjs'
import { AuthService } from '../auth/auth.service'
import { TokenData } from '../auth/token-data.interface'
import { MusicProvider, MUSIC_PROVIDER } from '../providers/music-provider.interface'

interface ProgressEvent {
  data: {
    done: number
    total: number
    current?: string
    complete?: boolean
    error?: string
  }
}

interface JobState {
  subject: Subject<ProgressEvent>
  aborted: boolean
}

@Injectable()
export class JobsService {
  private readonly jobs = new Map<string, JobState>()

  constructor(
    @Inject(MUSIC_PROVIDER) private readonly provider: MusicProvider,
    private readonly authService: AuthService,
  ) {}

  startDeleteJob(token: TokenData, ids: string[]): string {
    const jobId = Math.random().toString(36).slice(2, 10)
    const subject = new Subject<ProgressEvent>()
    const job: JobState = { subject, aborted: false }
    this.jobs.set(jobId, job)
    this.runDeletions(token, ids, subject, jobId, job).catch((err: unknown) => {
      subject.next({ data: { done: 0, total: ids.length, error: (err as Error).message ?? 'Unexpected error' } })
      subject.next({ data: { done: 0, total: ids.length, complete: true } })
      subject.complete()
      setTimeout(() => this.jobs.delete(jobId), 30_000)
    })
    return jobId
  }

  getProgress(jobId: string): Observable<ProgressEvent> {
    const job = this.jobs.get(jobId)
    if (!job) throw new NotFoundException(`Job ${jobId} not found`)
    // finalize fires on both normal completion and SSE client disconnect;
    // setting aborted stops the deletion loop when the client navigates away
    return job.subject.asObservable().pipe(finalize(() => { job.aborted = true }))
  }

  private async runDeletions(
    token: TokenData,
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
        const accessToken = await this.authService.getValidAccessToken(token)
        await this.provider.deletePlaylist(accessToken, id)
        done++
        subject.next({ data: { done, total, current: id } })
      } catch (err: unknown) {
        if (err instanceof HttpException && err.getStatus() === 429) {
          subject.next({ data: { done, total, error: err.message } })
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
