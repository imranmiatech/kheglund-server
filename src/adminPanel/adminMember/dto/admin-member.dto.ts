import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export enum MemberFilterStatus {
  ALL = 'ALL',
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
  SUSPENDED = 'SUSPENDED',
}

export enum MemberSortOption {
  NEWEST = 'NEWEST',
  OLDEST = 'OLDEST',
  RECENT_ACTIVITY = 'RECENT_ACTIVITY',
  ALPHABETICAL = 'ALPHABETICAL',
}

export enum MembershipType {
  FREE = 'Free',
  PREMIUM = 'Premium',
}

export enum PaymentMethod {
  FREE = 'Free',
  CASH = 'Cash',
  BANK_TRANSFER = 'Bank Transfer',
  E_BANKING = 'E-banking',
}

export class AdminMemberQueryDto {
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

  @ApiPropertyOptional({ description: 'Search term for name or email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: MemberFilterStatus,
    default: MemberFilterStatus.ALL,
  })
  @IsOptional()
  @IsEnum(MemberFilterStatus)
  filter?: MemberFilterStatus = MemberFilterStatus.ALL;

  @ApiPropertyOptional({
    enum: MemberSortOption,
    default: MemberSortOption.NEWEST,
  })
  @IsOptional()
  @IsEnum(MemberSortOption)
  sort?: MemberSortOption = MemberSortOption.NEWEST;
}

export class CreateMemberDto {
  @ApiProperty({ example: 'Sofia Martin' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'sofia@gmail.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'Password123!' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({
    enum: ['Free', 'Premium'],
    default: 'Free',
  })
  @IsOptional()
  @IsString()
  membership?: string = 'Free';

  @ApiPropertyOptional({
    enum: ['Free', 'Cash', 'Bank Transfer', 'E-banking'],
    default: 'Free',
  })
  @IsOptional()
  @IsString()
  paidBy?: string = 'Free';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarPath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;
}

export class UpdateMemberDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  membership?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarPath?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateMemberStatusDto {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'SUSPENDED'] })
  @IsOptional()
  @IsString()
  status?: 'ACTIVE' | 'SUSPENDED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
