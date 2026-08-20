import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { MembershipsService } from './memberships.service';

@ApiTags('Memberships')
@Controller()
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'Get the public membership plans' })
  getPlans() {
    return this.membershipsService.getPlans();
  }

  @Get('subscriptions/me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current user subscription' })
  getMySubscription(@CurrentUser() user: { id: string }) {
    return this.membershipsService.getMySubscription(user.id);
  }
}
