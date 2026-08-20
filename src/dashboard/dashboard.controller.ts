import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the authenticated member dashboard overview' })
  getOverview(@CurrentUser() user: { id: string }) {
    return this.dashboardService.getOverview(user.id);
  }
}
