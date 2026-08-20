import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Max, Min } from 'class-validator';

export class ArticleQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tag?: string;
}

export class TrackArticleReadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Min(0)
  @Max(100)
  progressPercent?: number;
}
