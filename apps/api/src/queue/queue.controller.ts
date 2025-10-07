import { Body, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { QueueService } from './queue.service.js';
import { CreateQueueItemDto } from './dto.js';
import { queueItemSchema } from '@playall/types';
import { ForbiddenStructuredException } from '../common/errors.js';

@Controller('rooms/:roomId/queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  private getUserId(req: Request) {
    const userId = (req.signedCookies?.pa_session as string | undefined) ?? (req.body?.userId as string | undefined);
    if (!userId) {
      throw new ForbiddenStructuredException('SESSION_REQUIRED', 'User session is required.');
    }
    return userId;
  }

  @Get()
  async list(@Param('roomId') roomId: string) {
    return this.queueService.getQueue(roomId);
  }

  @Post()
  async add(@Param('roomId') roomId: string, @Body() body: CreateQueueItemDto, @Req() req: Request) {
    const userId = this.getUserId(req);
    const item = await this.queueService.addToQueue(roomId, userId, {
      videoId: body.videoId,
      title: body.title,
      durationSeconds: body.durationSeconds
    });
    return queueItemSchema.parse(item);
  }

  @Delete(':itemId')
  async remove(@Param('roomId') roomId: string, @Param('itemId') itemId: string, @Req() req: Request) {
    const userId = this.getUserId(req);
    await this.queueService.removeFromQueue(roomId, itemId, userId);
    return { ok: true };
  }
}
