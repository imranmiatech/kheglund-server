import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AdminDashboardService } from './admin-dashboard.service';
import {
  AdminActivityQueryDto,
  CreateAdminUserDto,
  UpdateAnnouncementDto,
  UpdateArticleDto,
  UpdateResourceDto,
} from './dto/admin-dashboard.dto';

import { AdminAnnouncementService } from '../adminAnnouncement/admin-announcement.service';

@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('dashboard/overview')
  @ApiOperation({
    summary: 'Get consolidated Admin Dashboard overview metrics, MRR, attention counts, and announcements',
  })
  getDashboardOverview(@CurrentUser() user: any) {
    const userId = user?.id || user?.sub || user?.userId;
    return this.adminDashboardService.getDashboardOverview(userId);
  }

  @Get('dashboard/activities')
  @ApiOperation({ summary: 'Get paginated recent activity stream' })
  getRecentActivities(@Query() query: AdminActivityQueryDto) {
    return this.adminDashboardService.getRecentActivities(
      query.page,
      query.limit,
    );
  }

  @Get('users')
  @ApiOperation({ summary: 'List members and users for admin management' })
  listUsers() {
    return this.adminDashboardService.listUsers();
  }

  @Post('users')
  @ApiOperation({ summary: 'Create or invite a new member user' })
  createUser(@Body() dto: CreateAdminUserDto) {
    return this.adminDashboardService.createAdminUser(dto);
  }

  @Patch('resources/:id')
  @ApiOperation({ summary: 'Update a managed resource' })
  updateResource(@Param('id') id: string, @Body() dto: UpdateResourceDto) {
    return this.adminDashboardService.updateResource(id, dto);
  }

  @Delete('resources/:id')
  @ApiOperation({ summary: 'Delete a managed resource' })
  deleteResource(@Param('id') id: string) {
    return this.adminDashboardService.deleteResource(id);
  }

  @Patch('articles/:id')
  @ApiOperation({ summary: 'Update an article' })
  updateArticle(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    return this.adminDashboardService.updateArticle(id, dto);
  }

  @Delete('articles/:id')
  @ApiOperation({ summary: 'Delete an article' })
  deleteArticle(@Param('id') id: string) {
    return this.adminDashboardService.deleteArticle(id);
  }
}
