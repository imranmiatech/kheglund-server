import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import { ChangePasswordDto } from '../../users/dto/users.dto';

export class UpdateNotificationPreferencesDto {
  @ApiProperty()
  @IsBoolean()
  announcementsEnabled: boolean;

  @ApiProperty()
  @IsBoolean()
  productUpdatesEnabled: boolean;

  @ApiProperty()
  @IsBoolean()
  marketingEnabled: boolean;

  @ApiProperty()
  @IsBoolean()
  newsletterEnabled: boolean;
}

export class SettingsSecurityDto extends ChangePasswordDto {}
