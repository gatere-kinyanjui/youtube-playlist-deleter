import * as crypto from 'crypto'
import { HttpException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import { AuthService } from '../auth/auth.service'
import { SessionToken } from '../auth/session-token.interface'
import { MusicProvider, MUSIC_PROVIDER } from '@yt/shared'

export interface JobStatus {
  done: number
  total: number
  failed: number
  deletedIds: string[]
  complete: boolean
  error?: string
  quotaExceeded?: boolean
}

interface JobState {
  status: JobStatus
  lastPolledAt: number
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
    const job: JobState = {
      status: { done: 0, total: ids.length, failed: 0, deletedIds: [], complete: false },
      lastPolledAt: Date.now(),
      sessionId,
    }
    this.jobs.set(jobId, job)
    this.runDeletions(token, encryptedRefreshToken, ids, jobId, job).catch((err: unknown) => {
      job.status.error = (err as Error).message ?? 'Unexpected error'
      job.status.complete = true
      setTimeout(() => this.jobs.delete(jobId), 30_000)
    })
    return jobId
  }

  getStatus(jobId: string, sessionId: string): JobStatus {
    const job = this.jobs.get(jobId)
    if (!job) throw new NotFoundException(`Job ${jobId} not found`)
    if (job.sessionId !== sessionId) throw new NotFoundException(`Job ${jobId} not found`)
    job.lastPolledAt = Date.now()
    return job.status
  }

  private async runDeletions(
    token: SessionToken,
    encryptedRefreshToken: string | null,
    ids: string[],
    jobId: string,
    job: JobState,
  ): Promise<void> {
    for (const id of ids) {
      if (Date.now() - job.lastPolledAt > 10_000) break
      try {
        const accessToken = await this.authService.getValidAccessToken(token, encryptedRefreshToken)
        if (Date.now() - job.lastPolledAt > 10_000) break
        await this.provider.deletePlaylist(accessToken, id)
        if (Date.now() - job.lastPolledAt > 10_000) break
        job.status.done++
        job.status.deletedIds.push(id)
      } catch (err: unknown) {
        if (err instanceof HttpException && err.getStatus() === 429) {
          job.status.quotaExceeded = true
          job.status.error = 'YouTube API quota exceeded — resets at midnight Pacific Time.'
          break
        }
        job.status.failed++
      }

      await new Promise(r => setTimeout(r, 300))
    }

    if (!job.status.error) {
      const failed = job.status.failed
      if (failed > 0) {
        job.status.error = `${failed} playlist${failed === 1 ? '' : 's'} could not be deleted`
      }
    }
    job.status.complete = true
    setTimeout(() => this.jobs.delete(jobId), 30_000)
  }
}
