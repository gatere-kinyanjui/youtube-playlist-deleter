import { IsArray, IsString } from 'class-validator'

export class StartJobDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[]
}
