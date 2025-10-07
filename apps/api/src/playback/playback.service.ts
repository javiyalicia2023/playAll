import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { playbackStateSchema } from '@playall/types';
import type { PlaybackStateDto } from '@playall/types';

@Injectable()
export class PlaybackService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlaybackState(roomId: string): Promise<PlaybackStateDto> {
    const state = await this.prisma.playbackState.findUnique({ where: { roomId } });
    if (!state) {
      return playbackStateSchema.parse({
        roomId,
        videoId: null,
        isPlaying: false,
        positionMs: 0,
        playbackRate: 1,
        updatedAt: new Date(0).toISOString()
      });
    }

    return playbackStateSchema.parse({
      roomId: state.roomId,
      videoId: state.videoId ?? null,
      isPlaying: state.isPlaying,
      positionMs: Number(state.positionMs),
      playbackRate: state.playbackRate,
      updatedAt: state.updatedAt.toISOString()
    });
  }

  async upsertState(
    roomId: string,
    data: { videoId?: string | null; isPlaying: boolean; positionMs: number; playbackRate: number }
  ): Promise<PlaybackStateDto> {
    const state = await this.prisma.playbackState.upsert({
      where: { roomId },
      update: {
        videoId: data.videoId ?? null,
        isPlaying: data.isPlaying,
        positionMs: BigInt(data.positionMs),
        playbackRate: data.playbackRate
      },
      create: {
        roomId,
        videoId: data.videoId ?? null,
        isPlaying: data.isPlaying,
        positionMs: BigInt(data.positionMs),
        playbackRate: data.playbackRate
      }
    });

    return playbackStateSchema.parse({
      roomId: state.roomId,
      videoId: state.videoId ?? null,
      isPlaying: state.isPlaying,
      positionMs: Number(state.positionMs),
      playbackRate: state.playbackRate,
      updatedAt: state.updatedAt.toISOString()
    });
  }
}
