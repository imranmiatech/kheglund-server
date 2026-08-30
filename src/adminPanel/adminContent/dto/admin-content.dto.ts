import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export enum ContentFilterStatus {
  ALL = 'ALL',
  PUBLISHED = 'PUBLISHED',
  DRAFT = 'DRAFT',
}

export enum ContentAccessLevel {
  ALL = 'All',
  PUBLIC = 'Public',
  FREE = 'Free',
  PREMIUM = 'Premium',
}

export enum ContentFileType {
  PDF = 'pdf',
  ARTICLE = 'article',
}

export class AdminContentQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Search term for title or summary' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ContentFilterStatus,
    default: ContentFilterStatus.ALL,
  })
  @IsOptional()
  @IsString()
  filter?: string = 'ALL';

  @ApiPropertyOptional({
    enum: ['pdf', 'article', 'PDF', 'ARTICLE'],
    description: 'Filter by file type',
  })
  @IsOptional()
  @IsString()
  fileType?: string;
}

export class CreateContentDto {
  @ApiProperty({ example: 'Running Form Fundament' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Comprehensive guide to running form' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ example: 'Markdown or HTML body content...' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    enum: ['pdf', 'article', 'PDF', 'ARTICLE'],
    default: 'pdf',
  })
  @IsOptional()
  @IsString()
  fileType?: string = 'pdf';

  @ApiPropertyOptional({
    enum: ['All', 'Public', 'Free', 'Premium', 'PUBLIC', 'MEMBERS_ONLY'],
    default: 'Public',
  })
  @IsOptional()
  @IsString()
  accessLevel?: string = 'Public';

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  allowDownload?: boolean = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  allowComments?: boolean = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  showAllComments?: boolean = true;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileUploadId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  tagIds?: string[];
}

export class UpdateContentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accessLevel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowDownload?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  showAllComments?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileUploadId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  tagIds?: string[];
}
