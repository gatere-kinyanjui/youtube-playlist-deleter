import { IsString, IsOptional } from 'class-validator'

export class RenamePlaylistDto {
  @IsString()
  title: string

  @IsOptional()
  @IsString()
  description?: string
}
