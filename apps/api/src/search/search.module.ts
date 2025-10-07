import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SearchController } from './search.controller.js';
import { YoutubeService } from './youtube.service.js';

@Module({
  imports: [HttpModule],
  controllers: [SearchController],
  providers: [YoutubeService]
})
export class SearchModule {}
