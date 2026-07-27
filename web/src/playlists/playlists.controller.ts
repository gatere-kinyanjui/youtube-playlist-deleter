import { Body, Controller, Get, HttpCode, Param, Put, Query, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { SessionAuthGuard } from '../common/session-auth.guard'
import { CsrfGuard } from '../common/csrf.guard'
import { PlaylistsService } from './playlists.service'
import { RenamePlaylistDto } from './dto/rename-playlist.dto'
import { getEncryptedRefreshToken } from '../auth/refresh-cookie'

@Controller('api/playlists')
@UseGuards(SessionAuthGuard, CsrfGuard)
export class PlaylistsController {
  constructor(private readonly playlistsService: PlaylistsService) {}

  @Get()
  list(
    @Req() req: Request,
    @Query('search') search?: string,
    @Query('days') days?: string,
  ) {
    const token = req.session.token!
    const encrypted = getEncryptedRefreshToken(req.headers.cookie)
    return this.playlistsService.listPlaylists(token, encrypted, {
      search,
      days: days !== undefined ? Number(days) : undefined,
    })
  }

  @Get('duplicates')
  duplicates(@Req() req: Request) {
    return this.playlistsService.findDuplicates(req.session.token!, getEncryptedRefreshToken(req.headers.cookie))
  }

  @Get('tag-candidates')
  tagCandidates(@Req() req: Request) {
    return this.playlistsService.tagCandidates(req.session.token!, getEncryptedRefreshToken(req.headers.cookie))
  }

  @Put(':id')
  @HttpCode(204)
  rename(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: RenamePlaylistDto,
  ) {
    return this.playlistsService.renameOne(req.session.token!, getEncryptedRefreshToken(req.headers.cookie), id, body.title, body.description ?? '')
  }
}
