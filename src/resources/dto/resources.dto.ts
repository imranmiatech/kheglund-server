import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ResourceQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({
    enum: ['PDF', 'AUDIO', 'VIDEO', 'TEMPLATE', 'GUIDE', 'ARCHIVE'],
  })
  @IsOptional()
  @IsString()
  kind?: string;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional()
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  savedOnly?: boolean;
}
