import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateResourceDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  slug: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty({
    enum: ['PDF', 'AUDIO', 'VIDEO', 'TEMPLATE', 'GUIDE', 'ARCHIVE'],
  })
  @IsString()
  kind: string;

  @ApiProperty({ enum: ['PUBLIC', 'MEMBERS_ONLY'] })
  @IsString()
  visibility: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  tagIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileUploadId?: string;

  @ApiProperty()
  @IsBoolean()
  isPublished: boolean;
}

export class CreateArticleDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  slug: string;

  @ApiProperty()
  @IsString()
  summary: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty({ enum: ['PUBLIC', 'MEMBERS_ONLY'] })
  @IsString()
  visibility: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  tagIds?: string[];

  @ApiProperty()
  @IsBoolean()
  isPublished: boolean;
}

export class CreateAnnouncementDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  slug: string;

  @ApiProperty()
  @IsString()
  summary: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty({ enum: ['GENERAL', 'PRODUCT', 'EVENT', 'ALERT'] })
  @IsString()
  type: string;

  @ApiProperty({ enum: ['PUBLIC', 'MEMBERS_ONLY'] })
  @IsString()
  visibility: string;

  @ApiProperty()
  @IsBoolean()
  isPublished: boolean;
}

export class CreateContentPageDto {
  @ApiProperty()
  @IsString()
  slug: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty({ enum: ['PUBLIC', 'MEMBERS_ONLY'] })
  @IsString()
  visibility: string;

  @ApiProperty()
  @IsBoolean()
  isPublished: boolean;
}

export class CreateFaqDto {
  @ApiProperty({ enum: ['GENERAL', 'MEMBERSHIP', 'ABOUT', 'CONTACT'] })
  @IsString()
  page: string;

  @ApiProperty()
  @IsString()
  question: string;

  @ApiProperty()
  @IsString()
  answer: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder: number;

  @ApiProperty()
  @IsBoolean()
  isPublished: boolean;
}

export class CreateContactChannelDto {
  @ApiProperty({ enum: ['EMAIL', 'PHONE', 'SOCIAL', 'LOCATION'] })
  @IsString()
  type: string;

  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty()
  @IsString()
  value: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  helperText?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder: number;

  @ApiProperty()
  @IsBoolean()
  isPublished: boolean;
}

export class CreateResourceCategoryDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateTagDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  slug: string;
}

export class UpdateResourceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({
    enum: ['PDF', 'AUDIO', 'VIDEO', 'TEMPLATE', 'GUIDE', 'ARCHIVE'],
  })
  @IsOptional()
  @IsString()
  kind?: string;

  @ApiPropertyOptional({ enum: ['PUBLIC', 'MEMBERS_ONLY'] })
  @IsOptional()
  @IsString()
  visibility?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  tagIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fileUploadId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateArticleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ enum: ['PUBLIC', 'MEMBERS_ONLY'] })
  @IsOptional()
  @IsString()
  visibility?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  tagIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class UpdateAnnouncementDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ enum: ['GENERAL', 'PRODUCT', 'EVENT', 'ALERT'] })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ enum: ['PUBLIC', 'MEMBERS_ONLY'] })
  @IsOptional()
  @IsString()
  visibility?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class CreateAdminUserDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ enum: ['ADMIN', 'MEMBER'], default: 'MEMBER' })
  @IsOptional()
  @IsString()
  role?: 'ADMIN' | 'MEMBER';
}

export class AdminActivityQueryDto {
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
}

