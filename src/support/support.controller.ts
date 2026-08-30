import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateSupportTicketDto, CreateTicketMessageDto } from './dto/support.dto';
import { SupportService } from './support.service';

@ApiTags('Support (User Panel)')
@ApiBearerAuth()
@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Post('tickets')
  @ApiOperation({ summary: 'Create a new support ticket' })
  createTicket(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateSupportTicketDto,
  ) {
    return this.supportService.createTicket(user.id, dto);
  }

  @Get('tickets')
  @ApiOperation({ summary: 'Get list of support tickets for the current logged-in user' })
  getUserTickets(@CurrentUser() user: { id: string }) {
    return this.supportService.getUserTickets(user.id);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get single support ticket details for current user' })
  getTicketById(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.supportService.getTicketById(user.id, id);
  }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'Add a message or reply to a support ticket' })
  addTicketMessage(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: CreateTicketMessageDto,
  ) {
    return this.supportService.addTicketMessage(user.id, id, dto.message);
  }
}
