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
  ApiBody,
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
@Controller('admin/announcements')
export class AdminAnnouncementController {
  constructor(
    private readonly adminAnnouncementService: AdminAnnouncementService,
  ) {}

  @Get()
  @ApiOperation({
    summary:
      'Get paginated announcements or news & blogs list with status tabs (All, Published, Draft) and search',
  })
  getAnnouncements(@Query() query: AdminAnnouncementQueryDto) {
    return this.adminAnnouncementService.getAnnouncements(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get detailed single announcement or blog by ID' })
  getAnnouncementById(@Param('id') id: string) {
    return this.adminAnnouncementService.getAnnouncementById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new announcement or blog post' })
  createAnnouncement(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateAnnouncementItemDto,
  ) {
    return this.adminAnnouncementService.createAnnouncement(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an announcement or blog post' })
  updateAnnouncement(
    @Param('id') id: string,
    @Body() dto: UpdateAnnouncementItemDto,
  ) {
    return this.adminAnnouncementService.updateAnnouncement(id, dto);
  }

  @Patch(':id/pin')
  @ApiOperation({ summary: 'Toggle pin/unpin status for an announcement' })
  togglePin(
    @Param('id') id: string,
    @Body() dto: TogglePinDto,
  ) {
    return this.adminAnnouncementService.togglePin(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Permanently delete an announcement or blog post' })
  deleteAnnouncement(@Param('id') id: string) {
    return this.adminAnnouncementService.deleteAnnouncement(id);
  }

  @Post('uploads')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @ApiOperation({ summary: 'Upload cover photo image for blog or announcement' })
  uploadFile(
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.adminAnnouncementService.uploadFile(file, user.id);
  }
}
