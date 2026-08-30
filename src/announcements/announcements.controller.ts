import { Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
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

  @Get('saved')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get saved announcements for the current member' })
  getSavedAnnouncements(@CurrentUser() user: { id: string }) {
    return this.announcementsService.getSavedAnnouncements(user.id);
  }

  @Post(':id/save')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save an announcement to the member dashboard' })
  saveAnnouncement(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.announcementsService.saveAnnouncement(user.id, id);
  }

  @Delete(':id/save')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove an announcement from saved items' })
  unsaveAnnouncement(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.announcementsService.unsaveAnnouncement(user.id, id);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a single announcement by id' })
  getAnnouncement(@Param('id') id: string) {
    return this.announcementsService.getAnnouncement(id);
  }
}
