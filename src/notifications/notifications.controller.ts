import { Controller, Get, Patch, Delete, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user or admin notifications list' })
  getNotifications(@CurrentUser() user: any) {
    const userId = user?.id || user?.sub || user?.userId;
    const role = user?.role;
    return this.notificationsService.getUserNotifications(userId, role);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  getUnreadCount(@CurrentUser() user: any) {
    const userId = user?.id || user?.sub || user?.userId;
    const role = user?.role;
    return this.notificationsService.getUnreadCount(userId, role);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllAsRead(@CurrentUser() user: any) {
    const userId = user?.id || user?.sub || user?.userId;
    const role = user?.role;
    return this.notificationsService.markAllAsRead(userId, role);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark single notification as read' })
  markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
    const userId = user?.id || user?.sub || user?.userId;
    return this.notificationsService.markAsRead(id, userId);
  }

  @Delete('clear-all')
  @ApiOperation({ summary: 'Clear/Delete all notifications' })
  clearAllNotifications(@CurrentUser() user: any) {
    const userId = user?.id || user?.sub || user?.userId;
    const role = user?.role;
    return this.notificationsService.clearAllNotifications(userId, role);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete single notification' })
  deleteNotification(@Param('id') id: string, @CurrentUser() user: any) {
    const userId = user?.id || user?.sub || user?.userId;
    return this.notificationsService.deleteNotification(id, userId);
  }
}
