import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AdminAnnouncementService } from './admin-announcement.service';
import {
  AdminAnnouncementQueryDto,
  CreateAnnouncementItemDto,
  TogglePinDto,
  UpdateAnnouncementItemDto,
} from './dto/admin-announcement.dto';

@ApiTags('Admin Announcements & Blogs')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller()
export class AdminAnnouncementController {
  constructor(
    private readonly adminAnnouncementService: AdminAnnouncementService,
  ) {}

  // ==========================================
  // 1. ANNOUNCEMENTS ROUTES (/admin/announcements)
  // ==========================================

  @Get('admin/announcements')
  @ApiOperation({ summary: 'Get paginated announcements list for admin' })
  getAnnouncements(@Query() query: AdminAnnouncementQueryDto) {
    return this.adminAnnouncementService.getAnnouncementsOnly(query);
  }

  @Post('admin/announcements')
  @ApiOperation({ summary: 'Create a new announcement' })
  createAnnouncement(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateAnnouncementItemDto,
  ) {
    return this.adminAnnouncementService.createAnnouncementOnly(user.id, dto);
  }

  @Get('admin/announcements/:id')
  @ApiOperation({ summary: 'Get detailed single announcement by ID' })
  getAnnouncementById(@Param('id') id: string) {
    return this.adminAnnouncementService.getAnnouncementById(id);
  }

  @Patch('admin/announcements/:id')
  @ApiOperation({ summary: 'Update an announcement' })
  updateAnnouncement(
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementItemDto,
  ) {
    return this.adminAnnouncementService.updateAnnouncementOnly(id, dto);
  }

  @Patch('admin/announcements/:id/pin')
  @ApiOperation({ summary: 'Toggle pin/unpin status for an announcement' })
  togglePin(
    @Param('id') id: string,
    @Body() dto: TogglePinDto,
  ) {
    return this.adminAnnouncementService.togglePin(id, dto);
  }

  @Delete('admin/announcements/:id')
  @ApiOperation({ summary: 'Permanently delete an announcement' })
  deleteAnnouncement(@Param('id') id: string) {
    return this.adminAnnouncementService.deleteAnnouncement(id);
  }

  // ==========================================
  // 2. NEWS & BLOGS ROUTES (/admin/blogs)
  // ==========================================

  @Get('admin/blogs')
  @ApiOperation({ summary: 'Get paginated news & blogs list for admin' })
  getBlogs(@Query() query: AdminAnnouncementQueryDto) {
    return this.adminAnnouncementService.getBlogsOnly(query);
  }

  @Post('admin/blogs')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Create a new News & Blog post with cover photo file' })
  createBlog(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateAnnouncementItemDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.adminAnnouncementService.createBlogWithImage(user.id, dto, file);
  }

  @Get('admin/blogs/:id')
  @ApiOperation({ summary: 'Get detailed single blog by ID' })
  getBlogById(@Param('id') id: string) {
    return this.adminAnnouncementService.getAnnouncementById(id);
  }

  @Patch('admin/blogs/:id')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({ summary: 'Update a news & blog post with optional cover photo file' })
  updateBlog(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateAnnouncementItemDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.adminAnnouncementService.updateBlogWithImage(id, dto, file, user.id);
  }

  @Delete('admin/blogs/:id')
  @ApiOperation({ summary: 'Permanently delete a news & blog post' })
  deleteBlog(@Param('id') id: string) {
    return this.adminAnnouncementService.deleteAnnouncement(id);
  }
}
