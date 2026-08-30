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
import { AdminContentService } from './admin-content.service';
import {
  AdminContentQueryDto,
  CreateContentDto,
  UpdateContentDto,
} from './dto/admin-content.dto';

@ApiTags('Admin Content')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminContentController {
  constructor(private readonly adminContentService: AdminContentService) {}

  @Get(['content', 'resources'])
  @ApiOperation({
    summary:
      'Get paginated content list for Content module (PDF and Article only)',
  })
  getContent(@Query() query: AdminContentQueryDto) {
    return this.adminContentService.getContent(query, { module: 'content' });
  }

  @Get('library')
  @ApiOperation({
    summary:
      'Get paginated content list for Library module (PDF, Article, Video, Audio, Link, Image)',
  })
  getLibrary(@Query() query: AdminContentQueryDto) {
    return this.adminContentService.getContent(query, { module: 'library' });
  }

  @Get(['content/:id', 'resources/:id'])
  @ApiOperation({ summary: 'Get detailed single content view by ID' })
  getContentById(@Param('id') id: string) {
    return this.adminContentService.getContentById(id);
  }

  @Post(['content', 'resources'])
  @ApiOperation({ summary: 'Create a new content item (article or PDF guide)' })
  createContent(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateContentDto,
  ) {
    return this.adminContentService.createContent(user.id, dto);
  }

  @Patch(['content/:id', 'resources/:id'])
  @ApiOperation({ summary: 'Update an existing content item' })
  updateContent(
    @Param('id') id: string,
    @Body() dto: UpdateContentDto,
  ) {
    return this.adminContentService.updateContent(id, dto);
  }

  @Delete(['content/:id', 'resources/:id'])
  @ApiOperation({ summary: 'Delete a content item' })
  deleteContent(@Param('id') id: string) {
    return this.adminContentService.deleteContent(id);
  }

  @Post(['uploads', 'content/uploads'])
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
  @ApiOperation({ summary: 'Upload a file for content/PDF/article association' })
  uploadFile(
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.adminContentService.uploadFile(file, user.id);
  }
}
