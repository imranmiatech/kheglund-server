import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { AnnouncementsService } from './announcements.service';

@ApiTags('Announcements')
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published announcements' })
  listAnnouncements() {
    return this.announcementsService.listAnnouncements();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a single announcement by id' })
  getAnnouncement(@Param('id') id: string) {
    return this.announcementsService.getAnnouncement(id);
  }
}
