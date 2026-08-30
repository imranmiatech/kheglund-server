import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCheckoutSessionDto {
  @ApiProperty()
  @IsUUID()
  planId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}

export class CancelSubscriptionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
