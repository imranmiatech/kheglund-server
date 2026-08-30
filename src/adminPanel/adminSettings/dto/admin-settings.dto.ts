import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateAdminNotificationSettingsDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  userJoinNotification?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  adminAlerts?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  memberNotifications?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  paymentNotifications?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  announcementsEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  productUpdatesEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  marketingEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  newsletterEnabled?: boolean;
}

export class UpdateAdminProfileDto {
  @ApiPropertyOptional({ example: 'Istiak Turjo' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'ia.turjo18@gmail.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarPath?: string;
}

export class AdminChangePasswordDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(6)
  newPassword?: string;
}

export class SaveAdminPaymentInfoDto {
  @ApiPropertyOptional({ example: 'Primary payout account' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ example: 'BANK_ACCOUNT', description: 'Supported: CARD, BANK_ACCOUNT, E_BANKING' })
  @IsOptional()
  @IsString()
  methodType?: string = 'BANK_ACCOUNT';

  @ApiPropertyOptional({ example: 'Mastercard' })
  @IsOptional()
  @IsString()
  providerName?: string;

  @ApiPropertyOptional({ example: 'Chase Bank' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ example: 'Admin Company LLC' })
  @IsOptional()
  @IsString()
  accountHolderName?: string;

  @ApiPropertyOptional({ example: '4654 6575 4356 4444' })
  @IsOptional()
  @IsString()
  cardNumber?: string;

  @ApiPropertyOptional({ example: '4444' })
  @IsOptional()
  @IsString()
  cardLast4?: string;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  expiryMonth?: number;

  @ApiPropertyOptional({ example: 2028 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  expiryYear?: number;

  @ApiPropertyOptional({ example: '123456789012' })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiPropertyOptional({ example: '110000000' })
  @IsOptional()
  @IsString()
  routingNumber?: string;

  @ApiPropertyOptional({ example: 'AE070331234567890123456' })
  @IsOptional()
  @IsString()
  iban?: string;

  @ApiPropertyOptional({ example: 'Main Branch' })
  @IsOptional()
  @IsString()
  branchName?: string;

  @ApiPropertyOptional({ example: 'acct_1QwErTyUiOp12345' })
  @IsOptional()
  @IsString()
  stripeConnectedAccountId?: string;

  @ApiPropertyOptional({ example: 'Include member email in transfer reference' })
  @IsOptional()
  @IsString()
  instructions?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

export class UpdateAdminPaymentInfoDto extends SaveAdminPaymentInfoDto {}
