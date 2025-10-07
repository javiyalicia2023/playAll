import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { YoutubeService } from './youtube.service.js';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { youtubeSearchResponseSchema } from '@playall/types';

@Controller('search')
@UseGuards(ThrottlerGuard)
export class SearchController {
  constructor(private readonly youtubeService: YoutubeService) {}

  @Get()
  @Throttle(5, 1)
  async search(@Query('q') q: string) {
    const query = (q ?? '').trim();
    if (!query) {
      return youtubeSearchResponseSchema.parse({ items: [] });
    }
    return youtubeSearchResponseSchema.parse(await this.youtubeService.searchVideos(query));
  }
}
