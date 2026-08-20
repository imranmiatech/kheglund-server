import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import {
  SettingsSecurityDto,
  UpdateNotificationPreferencesDto,
} from './dto/settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('notifications')
  @ApiOperation({
    summary: 'Get notification preferences for the current user',
  })
  getNotifications(@CurrentUser() user: { id: string }) {
    return this.settingsService.getNotificationPreferences(user.id);
  }

  @Patch('notifications')
  @ApiOperation({ summary: 'Update notification preferences' })
  updateNotifications(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.settingsService.updateNotificationPreferences(user.id, dto);
  }

  @Post('security')
  @ApiOperation({ summary: 'Change the current user password from settings' })
  changePassword(
    @CurrentUser() user: { id: string },
    @Body() dto: SettingsSecurityDto,
  ) {
    return this.settingsService.changePassword(user.id, dto);
  }

  @Public()
  @Get('privacy-policy')
  @ApiOperation({ summary: 'Get the privacy policy content page' })
  getPrivacyPolicy() {
    return this.settingsService.getPrivacyPolicy();
  }
}
