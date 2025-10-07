import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { SearchService } from './search.service.js';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Throttle({ default: { limit: 5, ttl: 1 } })
  async search(@Query('q') query = '') {
    return this.searchService.search(query, process.env.YOUTUBE_API_KEY);
  }
}
