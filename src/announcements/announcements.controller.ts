import { Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AnnouncementsService } from './announcements.service';

@ApiTags('Announcements & Blogs (User Panel)')
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published announcements for user panel' })
  @ApiQuery({ name: 'search', required: false, type: String })
  listAnnouncements(
    @CurrentUser() user?: { id: string },
    @Query('search') search?: string,
  ) {
    return this.announcementsService.listAnnouncements({ search }, user?.id);
  }

  @Public()
  @Get('blogs')
  @ApiOperation({ summary: 'List published news & blogs for user panel' })
  @ApiQuery({ name: 'search', required: false, type: String })
  listBlogs(
    @CurrentUser() user?: { id: string },
    @Query('search') search?: string,
  ) {
    return this.announcementsService.listBlogs({ search }, user?.id);
  }

  @Get('saved')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get saved announcements and blogs for member' })
  getSavedAnnouncements(@CurrentUser() user: { id: string }) {
    return this.announcementsService.getSavedAnnouncements(user.id);
  }

  @Post(':id/save')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save an announcement or blog to member dashboard' })
  saveAnnouncement(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.announcementsService.saveAnnouncement(user.id, id);
  }

  @Delete(':id/save')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove an announcement or blog from saved items' })
  unsaveAnnouncement(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.announcementsService.unsaveAnnouncement(user.id, id);
  }

  @Public()
  @Get('blogs/:id')
  @ApiOperation({ summary: 'Get single news & blog post details by ID' })
  getBlog(@Param('id') id: string, @CurrentUser() user?: { id: string }) {
    return this.announcementsService.getAnnouncement(id, user?.id);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get single announcement details by ID' })
  getAnnouncement(@Param('id') id: string, @CurrentUser() user?: { id: string }) {
    return this.announcementsService.getAnnouncement(id, user?.id);
  }
}
