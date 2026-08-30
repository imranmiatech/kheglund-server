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
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AdminSupportService } from './admin-support.service';
import {
  AdminReplyTicketDto,
  AdminTicketQueryDto,
  CreateFaqItemDto,
  UpdateFaqItemDto,
  UpdateSupportTicketDto,
} from './dto/admin-support.dto';

@ApiTags('Admin Support Requests & FAQs')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin/support')
export class AdminSupportController {
  constructor(private readonly adminSupportService: AdminSupportService) {}

  // --- SUPPORT TICKETS ---

  @Get(['tickets', 'requests'])
  @ApiOperation({
    summary:
      'Get paginated support request tickets with status filter (ALL, OPEN, IN_PROGRESS, RESOLVED) and search',
  })
  getTickets(@Query() query: AdminTicketQueryDto) {
    return this.adminSupportService.getTickets(query);
  }

  @Get(['tickets/:id', 'requests/:id'])
  @ApiOperation({ summary: 'Get single support ticket details by ID' })
  getTicketById(@Param('id') id: string) {
    return this.adminSupportService.getTicketById(id);
  }

  @Patch(['tickets/:id', 'requests/:id'])
  @ApiOperation({ summary: 'Update support ticket status, priority, or details' })
  updateTicket(
    @Param('id') id: string,
    @Body() dto: UpdateSupportTicketDto,
  ) {
    return this.adminSupportService.updateTicket(id, dto);
  }

  @Post(['tickets/:id/reply', 'requests/:id/reply'])
  @ApiOperation({ summary: 'Reply to customer support ticket' })
  replyTicket(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: AdminReplyTicketDto,
  ) {
    return this.adminSupportService.replyTicket(user.id, id, dto);
  }

  @Delete(['tickets/:id', 'requests/:id'])
  @ApiOperation({ summary: 'Delete a support ticket' })
  deleteTicket(@Param('id') id: string) {
    return this.adminSupportService.deleteTicket(id);
  }

  // --- FAQS ---

  @Public()
  @Get('faqs')
  @ApiOperation({ summary: 'Get FAQ entries list' })
  getFaqs() {
    return this.adminSupportService.getFaqs();
  }

  @Post('faqs')
  @ApiOperation({ summary: 'Create a new FAQ entry' })
  createFaq(@Body() dto: CreateFaqItemDto) {
    return this.adminSupportService.createFaq(dto);
  }

  @Patch('faqs/:id')
  @ApiOperation({ summary: 'Update an existing FAQ entry' })
  updateFaq(@Param('id') id: string, @Body() dto: UpdateFaqItemDto) {
    return this.adminSupportService.updateFaq(id, dto);
  }

  @Delete('faqs/:id')
  @ApiOperation({ summary: 'Delete an FAQ entry' })
  deleteFaq(@Param('id') id: string) {
    return this.adminSupportService.deleteFaq(id);
  }
}
