import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateRolePermissionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  publicVisitor?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  freeMember?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  premiumMember?: boolean;
}

export class PermissionMatrixItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty()
  @IsString()
  key: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty()
  @IsBoolean()
  publicVisitor: boolean;

  @ApiProperty()
  @IsBoolean()
  freeMember: boolean;

  @ApiProperty()
  @IsBoolean()
  premiumMember: boolean;
}

export class UpdatePermissionMatrixDto {
  @ApiProperty({ type: [PermissionMatrixItemDto] })
  @IsArray()
  permissions: PermissionMatrixItemDto[];
}
