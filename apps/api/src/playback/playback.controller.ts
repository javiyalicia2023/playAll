import { Controller, Get, Param } from '@nestjs/common';
import { PlaybackService } from './playback.service.js';
import { playbackStateSchema } from '@playall/types';

@Controller('rooms/:roomId/playback')
export class PlaybackController {
  constructor(private readonly playbackService: PlaybackService) {}

  @Get()
  async getPlayback(@Param('roomId') roomId: string) {
    return playbackStateSchema.parse(await this.playbackService.getPlaybackState(roomId));
  }
}
