import { Module } from '@nestjs/common';
import { PlaybackService } from './playback.service.js';
import { PlaybackController } from './playback.controller.js';

@Module({
  providers: [PlaybackService],
  controllers: [PlaybackController],
  exports: [PlaybackService]
})
export class PlaybackModule {}
