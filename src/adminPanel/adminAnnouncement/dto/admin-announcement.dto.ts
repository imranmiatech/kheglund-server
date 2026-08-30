import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export enum AnnouncementFilterStatus {
  ALL = 'ALL',
  PUBLISHED = 'PUBLISHED',
  DRAFT = 'DRAFT',
}

export enum AnnouncementKind {
  ANNOUNCEMENT = 'ANNOUNCEMENT',
  NEWS_BLOG = 'NEWS_BLOG',
}

export class AdminAnnouncementQueryDto {
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
    enum: AnnouncementFilterStatus,
    default: AnnouncementFilterStatus.ALL,
  })
  @IsOptional()
  @IsString()
  filter?: string = 'ALL';

  @ApiPropertyOptional({
    enum: ['ANNOUNCEMENT', 'NEWS_BLOG', 'announcement', 'news_blog', 'blog'],
    default: 'ANNOUNCEMENT',
  })
  @IsOptional()
  @IsString()
  kind?: string = 'ANNOUNCEMENT';
}

export class CreateAnnouncementItemDto {
  @ApiProperty({ example: 'January Community Challenge Launched' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Short description for announcement or blog' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ example: 'Markdown or HTML body content...' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    enum: ['ANNOUNCEMENT', 'NEWS_BLOG', 'announcement', 'blog'],
    default: 'ANNOUNCEMENT',
  })
  @IsOptional()
  @IsString()
  kind?: string = 'ANNOUNCEMENT';

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

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean = false;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  shareWithAnyone?: boolean = false;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileUploadId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverImagePath?: string;
}

export class UpdateAnnouncementItemDto {
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
  kind?: string;

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
  isPinned?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  shareWithAnyone?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileUploadId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverImagePath?: string;
}

export class TogglePinDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}
