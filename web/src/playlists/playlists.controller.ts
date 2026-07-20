import { Controller, Get, Query, Req } from '@nestjs/common'
import { Request } from 'express'
import { PlaylistsService } from './playlists.service'

@Controller('api/playlists')
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
