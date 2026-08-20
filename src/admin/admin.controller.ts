import {
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CreateMembershipPlanDto } from '../memberships/dto/memberships.dto';
import { MembershipsService } from '../memberships/memberships.service';
import { AdminService } from './admin.service';
import {
  CreateAnnouncementDto,
  CreateArticleDto,
  CreateContactChannelDto,
  CreateContentPageDto,
  CreateFaqDto,
  CreateResourceDto,
  CreateResourceCategoryDto,
  CreateTagDto,
} from './dto/admin.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly membershipsService: MembershipsService,
  ) {}

  @Get('resources')
  @ApiOperation({ summary: 'List all resources for admin management' })
  listResources() {
    return this.adminService.listResources();
  }

  @Post('resources')
  @ApiOperation({ summary: 'Create a new managed resource' })
  createResource(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateResourceDto,
  ) {
    return this.adminService.createResource(user.id, dto);
  }

  @Get('articles')
  @ApiOperation({ summary: 'List all articles for admin management' })
  listArticles() {
    return this.adminService.listArticles();
  }

  @Post('articles')
  @ApiOperation({ summary: 'Create a new article' })
  createArticle(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateArticleDto,
  ) {
    return this.adminService.createArticle(user.id, dto);
  }

  @Get('announcements')
  @ApiOperation({ summary: 'List all announcements for admin management' })
  listAnnouncements() {
    return this.adminService.listAnnouncements();
  }

  @Post('announcements')
  @ApiOperation({ summary: 'Create a new announcement' })
  createAnnouncement(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateAnnouncementDto,
  ) {
    return this.adminService.createAnnouncement(user.id, dto);
  }

  @Get('plans')
  @ApiOperation({ summary: 'List all membership plans for admin management' })
  listPlans() {
    return this.adminService.listPlans();
  }

  @Post('plans')
  @ApiOperation({ summary: 'Create a new membership plan' })
  createPlan(@Body() dto: CreateMembershipPlanDto) {
    return this.membershipsService.createPlan(dto);
  }

  @Get('content-pages')
  @ApiOperation({ summary: 'List content pages' })
  listContentPages() {
    return this.adminService.listContentPages();
  }

  @Post('content-pages')
  @ApiOperation({ summary: 'Create or update a content page' })
  createContentPage(@Body() dto: CreateContentPageDto) {
    return this.adminService.createContentPage(dto);
  }

  @Get('faqs')
  @ApiOperation({ summary: 'List FAQ entries' })
  listFaqs() {
    return this.adminService.listFaqs();
  }

  @Post('faqs')
  @ApiOperation({ summary: 'Create an FAQ entry' })
  createFaq(@Body() dto: CreateFaqDto) {
    return this.adminService.createFaq(dto);
  }

  @Get('contact-channels')
  @ApiOperation({ summary: 'List contact channels' })
  listContactChannels() {
    return this.adminService.listContactChannels();
  }

  @Post('contact-channels')
  @ApiOperation({ summary: 'Create a contact channel' })
  createContactChannel(@Body() dto: CreateContactChannelDto) {
    return this.adminService.createContactChannel(dto);
  }

  @Get('contact-submissions')
  @ApiOperation({ summary: 'List contact form submissions' })
  listContactSubmissions() {
    return this.adminService.listContactSubmissions();
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
  @ApiOperation({
    summary: 'Upload a file for later resource/article association',
  })
  uploadFile(
    @CurrentUser() user: { id: string },
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.adminService.uploadFile(file, user.id);
  }

  @Get('resource-categories')
  @ApiOperation({ summary: 'List resource categories' })
  listResourceCategories() {
    return this.adminService.listResourceCategories();
  }

  @Post('resource-categories')
  @ApiOperation({ summary: 'Create or update a resource category' })
  createResourceCategory(@Body() dto: CreateResourceCategoryDto) {
    return this.adminService.createResourceCategory(dto);
  }

  @Get('resource-tags')
  @ApiOperation({ summary: 'List resource tags' })
  listResourceTags() {
    return this.adminService.listResourceTags();
  }

  @Post('resource-tags')
  @ApiOperation({ summary: 'Create or update a resource tag' })
  createResourceTag(@Body() dto: CreateTagDto) {
    return this.adminService.createResourceTag(dto);
  }

  @Get('article-tags')
  @ApiOperation({ summary: 'List article tags' })
  listArticleTags() {
    return this.adminService.listArticleTags();
  }

  @Post('article-tags')
  @ApiOperation({ summary: 'Create or update an article tag' })
  createArticleTag(@Body() dto: CreateTagDto) {
    return this.adminService.createArticleTag(dto);
  }
}
