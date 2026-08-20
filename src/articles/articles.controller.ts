import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ArticleQueryDto, TrackArticleReadDto } from './dto/articles.dto';
import { ArticlesService } from './articles.service';

@ApiTags('Articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published articles and news updates' })
  listArticles(@Query() query: ArticleQueryDto) {
    return this.articlesService.listArticles(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get a published article by id' })
  getArticle(@Param('id') id: string) {
    return this.articlesService.getArticle(id);
  }

  @Post(':id/read')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Track article reading progress for the current user',
  })
  trackRead(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: TrackArticleReadDto,
  ) {
    return this.articlesService.trackRead(user.id, id, dto);
  }
}
