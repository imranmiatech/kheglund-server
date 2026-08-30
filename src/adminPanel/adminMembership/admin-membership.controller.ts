import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AdminMembershipService } from './admin-membership.service';
import {
  AdminSubscriptionQueryDto,
  CreateMembershipPlanItemDto,
  UpdateMembershipPlanItemDto,
} from './dto/admin-membership.dto';

@ApiTags('Admin Membership & Payments')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminMembershipController {
  constructor(
    private readonly adminMembershipService: AdminMembershipService,
  ) {}

  // --- PLAN TAB ENDPOINTS (Image 2) ---

  @Get(['memberships/plans', 'plans'])
  @ApiOperation({
    summary:
      'Get all membership plan cards (Free Account, Premium Membership) with subscriber counts and benefits',
  })
  getPlans() {
    return this.adminMembershipService.getPlans();
  }

  @Post(['memberships/plans', 'plans'])
  @ApiOperation({ summary: 'Create a new membership plan' })
  createPlan(@Body() dto: CreateMembershipPlanItemDto) {
    return this.adminMembershipService.createPlan(dto);
  }

  @Patch(['memberships/plans/:id', 'plans/:id'])
  @Put(['memberships/plans/:id', 'plans/:id'])
  @ApiOperation({ summary: 'Update an existing membership plan' })
  updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdateMembershipPlanItemDto,
  ) {
    return this.adminMembershipService.updatePlan(id, dto);
  }

  @Patch(['memberships/plans/:id/deactivate', 'plans/:id/deactivate'])
  @Post(['memberships/plans/:id/deactivate', 'plans/:id/deactivate'])
  @ApiOperation({ summary: 'Deactivate or toggle membership plan status' })
  deactivatePlan(@Param('id') id: string) {
    return this.adminMembershipService.deactivatePlan(id);
  }

  // --- SUBSCRIPTION TAB ENDPOINTS (Image 1) ---

  @Get(['memberships/subscriptions', 'subscriptions'])
  @ApiOperation({
    summary:
      'Get paginated member subscriptions table (Michael Hall, Nicholas Turner, etc.) with status filter, search, and summary counts',
  })
  getSubscriptions(@Query() query: AdminSubscriptionQueryDto) {
    return this.adminMembershipService.getSubscriptions(query);
  }
}
