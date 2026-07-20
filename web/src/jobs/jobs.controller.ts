import { Body, Controller, Get, MessageEvent, Param, Post, Req, Sse, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { Observable } from 'rxjs'
import { SessionAuthGuard } from '../common/session-auth.guard'
import { JobsService } from './jobs.service'

@Controller('api/jobs')
@UseGuards(SessionAuthGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  start(@Req() req: Request, @Body() body: { ids: string[] }): { jobId: string } {
    const jobId = this.jobsService.startDeleteJob(req.session.token!, body.ids)
    return { jobId }
  }

  @Sse(':jobId/progress')
  progress(@Param('jobId') jobId: string): Observable<MessageEvent> {
    return this.jobsService.getProgress(jobId) as Observable<MessageEvent>
  }
}
