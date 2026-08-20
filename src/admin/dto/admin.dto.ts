import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
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
