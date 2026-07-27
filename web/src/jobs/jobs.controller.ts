import { Body, Controller, MessageEvent, Param, Post, Req, Sse, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { Observable } from 'rxjs'
import { SessionAuthGuard } from '../common/session-auth.guard'
import { CsrfGuard } from '../common/csrf.guard'
import { JobsService } from './jobs.service'
import { StartJobDto } from './dto/start-job.dto'
import { getEncryptedRefreshToken } from '../auth/refresh-cookie'

@Controller('api/jobs')
@UseGuards(SessionAuthGuard, CsrfGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  start(@Req() req: Request, @Body() body: StartJobDto): { jobId: string } {
    const jobId = this.jobsService.startDeleteJob(
      req.session.token!,
      getEncryptedRefreshToken(req.headers.cookie),
      body.ids,
      req.sessionID,
    )
    return { jobId }
  }

  @Sse(':jobId/progress')
  progress(@Req() req: Request, @Param('jobId') jobId: string): Observable<MessageEvent> {
    return this.jobsService.getProgress(jobId, req.sessionID) as Observable<MessageEvent>
  }
}
