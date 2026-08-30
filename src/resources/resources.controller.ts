import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResourceQueryDto, CreateCommentDto } from './dto/resources.dto';
import { ResourcesService } from './resources.service';

@ApiTags('Resources')
@ApiBearerAuth()
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get()
  @ApiOperation({ summary: 'List member resources with search and filters' })
  listResources(
    @CurrentUser() user: { id: string },
    @Query() query: ResourceQueryDto,
  ) {
    return this.resourcesService.listResources(user.id, query);
  }

  @Get('library')
  @ApiOperation({
    summary:
      'Get the combined library flow for downloadable resources and readable articles',
  })
  getLibraryFeed(
    @CurrentUser() user: { id: string },
    @Query() query: ResourceQueryDto,
  ) {
    return this.resourcesService.getLibraryFeed(user.id, {
      ...query,
      targetModule: query.targetModule || 'LIBRARY',
    });
  }

  @Get('saved')
  @ApiOperation({ summary: 'Get saved resources for the current member' })
  getSavedResources(
    @CurrentUser() user: { id: string },
    @Query() query: ResourceQueryDto,
  ) {
    return this.resourcesService.getSavedResources(user.id, query);
  }

  @Get('downloads')
  @ApiOperation({
    summary: 'Get resource download history for the current member',
  })
  getDownloadedResources(@CurrentUser() user: { id: string }) {
    return this.resourcesService.getDownloadedResources(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single resource by id' })
  getResource(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.resourcesService.getResourceById(user.id, id);
  }

  @Post(':id/save')
  @ApiOperation({ summary: 'Save a resource to the member dashboard' })
  saveResource(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.resourcesService.saveResource(user.id, id);
  }

  @Delete(':id/save')
  @ApiOperation({ summary: 'Remove a resource from saved items' })
  unsaveResource(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.resourcesService.unsaveResource(user.id, id);
  }

  @Post(':id/download')
  @ApiOperation({
    summary: 'Track a resource download and return its file metadata',
  })
  downloadResource(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.resourcesService.markDownloaded(user.id, id);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Track that a member viewed a resource' })
  markRead(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.resourcesService.markRead(user.id, id);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add a comment to a resource/article' })
  addComment(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.resourcesService.addComment(user.id, id, dto.text);
  }
}
