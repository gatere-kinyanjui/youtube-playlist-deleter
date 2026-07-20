import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { SessionAuthGuard } from '../common/session-auth.guard'
import { PlaylistsService } from './playlists.service'

@Controller('api/playlists')
@UseGuards(SessionAuthGuard)
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Get()
  list(
    @Req() req: Request,
    @Query('search') search?: string,
    @Query('days') days?: string,
  ) {
    const token = req.session.token!
    return this.playlistsService.listPlaylists(token, {
      search,
      days: days !== undefined ? Number(days) : undefined,
    })
  }

  @Get('duplicates')
  duplicates(@Req() req: Request) {
    return this.playlistsService.findDuplicates(req.session.token!)
  }

  @Get('tag-candidates')
  tagCandidates(@Req() req: Request) {
    return this.playlistsService.tagCandidates(req.session.token!)
  }
}
