import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SearchService } from './search.service';

@ApiTags('Search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Global search across resources, articles, announcements, and admin entities' })
  @ApiQuery({ name: 'q', required: false, type: String, description: 'Search term query' })
  @ApiQuery({ name: 'query', required: false, type: String, description: 'Alternative search term query' })
  search(
    @Query('q') qParam?: string,
    @Query('query') queryParam?: string,
    @CurrentUser() user?: any,
  ) {
    const searchTerm = qParam || queryParam || '';
    const userRole = user?.role;
    return this.searchService.search(searchTerm, userRole);
  }
}
