import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AdminSettingsService } from './admin-settings.service';
import {
  AdminChangePasswordDto,
  SaveAdminPaymentInfoDto,
  UpdateAdminNotificationSettingsDto,
  UpdateAdminPaymentInfoDto,
  UpdateAdminProfileDto,
} from './dto/admin-settings.dto';

@ApiTags('Admin Settings & Profile')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(private readonly adminSettingsService: AdminSettingsService) {}

  @Get(['notifications', 'notification'])
  @ApiOperation({
    summary:
      'Get admin notification preferences (User join, Admin Alerts, Member Notifications, Payment Notifications)',
  })
  getNotificationSettings(@CurrentUser() user: { id: string }) {
    return this.adminSettingsService.getNotificationSettings(user.id);
  }

  @Patch(['notifications', 'notification'])
  @Put(['notifications', 'notification'])
  @ApiOperation({
    summary:
      'Update admin notification preference toggles',
  })
  updateNotificationSettings(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateAdminNotificationSettingsDto,
  ) {
    return this.adminSettingsService.updateNotificationSettings(user.id, dto);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current admin profile details' })
  getProfileSettings(@CurrentUser() user: { id: string }) {
    return this.adminSettingsService.getProfileSettings(user.id);
  }

  @Patch('profile')
  @Put('profile')
  @ApiOperation({ summary: 'Update admin profile name, email, or avatar' })
  updateProfileSettings(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateAdminProfileDto,
  ) {
    return this.adminSettingsService.updateProfileSettings(user.id, dto);
  }

  @Post('change-password')
  @Patch('change-password')
  @ApiOperation({ summary: 'Change current admin password' })
  changePassword(
    @CurrentUser() user: { id: string },
    @Body() dto: AdminChangePasswordDto,
  ) {
    return this.adminSettingsService.changePassword(user.id, dto);
  }

  // --- ADMIN BANK & PAYMENT RECEIVING INFO ---

  @Public()
  @Get(['payment-info/public', 'bank-info/public'])
  @ApiOperation({ summary: 'Public endpoint to view active admin payment receiving bank/card details' })
  getPublicPaymentInfo() {
    return this.adminSettingsService.getPaymentInfo();
  }

  @Get(['payment-info', 'bank-info', 'payment-details'])
  @ApiOperation({ summary: 'Get all configured admin receiving bank and card accounts' })
  getPaymentInfo() {
    return this.adminSettingsService.getPaymentInfo();
  }

  @Post(['payment-info', 'bank-info', 'payment-details'])
  @ApiOperation({ summary: 'Create or save a new admin receiving bank or card account' })
  savePaymentInfo(
    @CurrentUser() user: { id: string },
    @Body() dto: SaveAdminPaymentInfoDto,
  ) {
    return this.adminSettingsService.savePaymentInfo(user.id, dto);
  }

  @Patch(['payment-info/:id', 'bank-info/:id', 'payment-details/:id'])
  @Put(['payment-info/:id', 'bank-info/:id', 'payment-details/:id'])
  @ApiOperation({ summary: 'Update admin receiving bank or card details' })
  updatePaymentInfo(
    @Param('id') id: string,
    @Body() dto: UpdateAdminPaymentInfoDto,
  ) {
    return this.adminSettingsService.updatePaymentInfo(id, dto);
  }

  @Delete(['payment-info/:id', 'bank-info/:id', 'payment-details/:id'])
  @ApiOperation({ summary: 'Delete admin receiving bank or card entry' })
  deletePaymentInfo(@Param('id') id: string) {
    return this.adminSettingsService.deletePaymentInfo(id);
  }
}
