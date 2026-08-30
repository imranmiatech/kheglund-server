import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export const RESOURCE_KINDS = [
  'PDF',
  'AUDIO',
  'VIDEO',
  'TEMPLATE',
  'GUIDE',
  'ARCHIVE',
] as const;

export const LIBRARY_KINDS = [...RESOURCE_KINDS, 'ARTICLE'] as const;
export const RESOURCE_FILTER_TYPES = [
  'ALL_RESOURCE',
  'PDF',
  'ARTICLE',
] as const;

const normalizeLibraryKind = (value: unknown) => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().toUpperCase().replaceAll(' ', '_');
  return normalized === 'ALL' || normalized === 'ALL_RESOURCES'
    ? undefined
    : normalized;
};

const normalizeResourceFilterType = (value: unknown) => {
  if (typeof value !== 'string') {
    return value;
  }

  const normalized = value.trim().toUpperCase().replaceAll(' ', '_');
  return normalized === 'ALL_RESOURCES' ? 'ALL_RESOURCE' : normalized;
};

export class ResourceQueryDto {
  @ApiPropertyOptional({
    enum: RESOURCE_FILTER_TYPES,
    description: 'Library filter: ALL_RESOURCE, PDF, or ARTICLE.',
  })
  @IsOptional()
  @Transform(({ value }) => normalizeResourceFilterType(value))
  @IsIn(RESOURCE_FILTER_TYPES)
  type?: (typeof RESOURCE_FILTER_TYPES)[number];

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
    enum: LIBRARY_KINDS,
    description:
      'Resource kind, or ARTICLE to return published articles from the library.',
  })
  @IsOptional()
  @Transform(({ value }) => normalizeLibraryKind(value))
  @IsIn(LIBRARY_KINDS)
  kind?: (typeof LIBRARY_KINDS)[number];

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    enum: ['CONTENT', 'LIBRARY', 'content', 'library'],
    description: 'Filter by target module (CONTENT or LIBRARY)',
  })
  @IsOptional()
  @IsString()
  targetModule?: string;

  @ApiPropertyOptional({
    enum: ['CONTENT', 'LIBRARY', 'content', 'library'],
    description: 'Filter by target module (CONTENT or LIBRARY)',
  })
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional()
  @Type(() => Boolean)
  @IsOptional()
  @IsBoolean()
  savedOnly?: boolean;
}

export class CreateCommentDto {
  @ApiProperty({ example: 'Great breakdown of the nutrition concepts!' })
  @IsString()
  @IsNotEmpty()
  text: string;
}
