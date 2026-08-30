import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AdminTicketQueryDto {
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

  @ApiPropertyOptional({ description: 'Search term for ticket number, subject, or member name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'all', 'open', 'in_progress', 'resolved'],
    default: 'ALL',
  })
  @IsOptional()
  @IsString()
  status?: string = 'ALL';
}

export class UpdateSupportTicketDto {
  @ApiPropertyOptional({ enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'In Progress', 'Opened', 'Resolved'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'Low', 'Medium', 'High', 'Urgent'] })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class AdminReplyTicketDto {
  @ApiProperty({ example: 'Thank you for reaching out. We have resolved the issue...' })
  @IsString()
  message: string;
}

export class CreateFaqItemDto {
  @ApiProperty({ example: 'What is Community Hub' })
  @IsString()
  question: string;

  @ApiProperty({ example: 'A community hub is a centralized space...' })
  @IsString()
  answer: string;

  @ApiPropertyOptional({ example: 'MEMBERSHIP' })
  @IsOptional()
  @IsString()
  page?: string = 'MEMBERSHIP';

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number = 0;
}

export class UpdateFaqItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  question?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  answer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}
