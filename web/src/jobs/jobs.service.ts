import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { Observable, Subject } from 'rxjs'
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
    this.jobs.set(jobId, { subject })
    this.runDeletions(token, ids, subject, jobId).catch(() => {
      subject.complete()
      this.jobs.delete(jobId)
    })
    return jobId
  }

  getProgress(jobId: string): Observable<ProgressEvent> {
    const job = this.jobs.get(jobId)
    if (!job) throw new NotFoundException(`Job ${jobId} not found`)
    return job.subject.asObservable()
  }

  private async runDeletions(
    token: TokenData,
    ids: string[],
    subject: Subject<ProgressEvent>,
    jobId: string,
  ): Promise<void> {
    const total = ids.length
    let done = 0

    for (const id of ids) {
      try {
        const accessToken = await this.authService.getValidAccessToken(token)
        await this.provider.deletePlaylist(accessToken, id)
        done++
        subject.next({ data: { done, total, current: id } })
      } catch (err: unknown) {
        const e = err as { reason?: string }
        if (e.reason === 'quotaExceeded') {
          subject.next({ data: { done, total, error: 'quotaExceeded' } })
          break
        }
        // non-quota errors: log and continue
        subject.next({ data: { done, total, current: id, error: (err as Error).message } })
      }
    }

    subject.next({ data: { done, total, complete: true } })
    subject.complete()
    this.jobs.delete(jobId)
  }
}
