import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsString, Min } from 'class-validator';

export class CreateMembershipPlanDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  slug: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  priceCents: number;

  @ApiProperty({ enum: ['MONTHLY', 'YEARLY', 'ONE_TIME'] })
  @IsString()
  billingPeriod: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  benefits: string[];

  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
}
