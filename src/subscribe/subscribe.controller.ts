import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateSubscribeDto, SubscribeQueryDto } from './dto/subscribe.dto';
import { SubscribeService } from './subscribe.service';

@ApiTags('Newsletter Subscription')
@Controller()
export class SubscribeController {
  constructor(private readonly subscribeService: SubscribeService) {}

  @Public()
  @Post('subscribe')
  @ApiOperation({ summary: 'Subscribe to newsletter (Public)' })
  subscribe(@Body() dto: CreateSubscribeDto) {
    return this.subscribeService.createSubscriber(dto);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Get('admin/subscribe')
  @ApiOperation({ summary: 'Get newsletter subscribers list (Admin)' })
  getSubscribers(@Query() query: SubscribeQueryDto) {
    return this.subscribeService.getSubscribers(query);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Delete('admin/subscribe/:id')
  @ApiOperation({ summary: 'Delete a newsletter subscriber by ID (Admin)' })
  deleteSubscriber(@Param('id') id: string) {
    return this.subscribeService.deleteSubscriber(id);
  }
}
