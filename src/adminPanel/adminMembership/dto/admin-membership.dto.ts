import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AdminSubscriptionQueryDto {
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

  @ApiPropertyOptional({ description: 'Search term for member name or email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ['ALL', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'all', 'active', 'expired', 'cancelled'],
    default: 'ALL',
  })
  @IsOptional()
  @IsString()
  status?: string = 'ALL';
}

export class CreateMembershipPlanItemDto {
  @ApiProperty({ example: 'Premium Membership' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Full access to all content and research library' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 500, description: 'Price in cents (e.g. 500 = $5.00)' })
  @IsInt()
  priceCents: number;

  @ApiPropertyOptional({ enum: ['MONTHLY', 'YEARLY'], default: 'MONTHLY' })
  @IsOptional()
  @IsString()
  billingPeriod?: string = 'MONTHLY';

  @ApiPropertyOptional({ example: ['Access to all content', 'Research library', 'Priority support'] })
  @IsOptional()
  @IsArray()
  benefits?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateMembershipPlanItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  priceCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  billingPeriod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  benefits?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
