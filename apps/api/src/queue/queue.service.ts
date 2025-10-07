import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RoomsService } from '../rooms/rooms.service.js';
import { ForbiddenStructuredException, NotFoundStructuredException } from '../common/errors.js';
import { queueItemSchema } from '@playall/types';
import type { QueueItemDto } from '@playall/types';
import { RoomsGateway } from '../sockets/rooms.gateway.js';

type QueueItemRecord = {
  id: string;
  roomId: string;
  videoId: string;
  title: string;
  durationSeconds: number | null;
  addedById: string;
  position: number;
  played: boolean;
  addedBy?: { displayName: string };
};

@Injectable()
export class QueueService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roomsService: RoomsService,
    @Inject(forwardRef(() => RoomsGateway)) private readonly roomsGateway: RoomsGateway
  ) {}

  async getQueue(roomId: string): Promise<QueueItemDto[]> {
    const items = (await this.prisma.queueItem.findMany({
      where: { roomId },
      orderBy: { position: 'asc' },
      include: {
        addedBy: true
      }
    })) as QueueItemRecord[];
    return items.map((item: QueueItemRecord) => {
      const addedByDisplayName = item.addedBy?.displayName ?? 'Unknown';
      return queueItemSchema.parse({
        id: item.id,
        roomId: item.roomId,
        videoId: item.videoId,
        title: item.title,
        durationSeconds: item.durationSeconds ?? null,
        addedById: item.addedById,
        addedByDisplayName,
        position: item.position,
        played: item.played
      });
    });
  }

  async addToQueue(
    roomId: string,
    userId: string,
    dto: { videoId: string; title: string; durationSeconds?: number }
  ): Promise<QueueItemDto> {
    const membership = await this.roomsService.assertMember(roomId, userId);
    const settings = await this.prisma.roomSettings.findUnique({ where: { roomId } });
    const allowGuestEnqueue = settings?.allowGuestEnqueue ?? true;

    if (membership.role === 'GUEST' && !allowGuestEnqueue) {
      throw new ForbiddenStructuredException(
        'GUEST_ENQUEUE_DISABLED',
        'Guests cannot enqueue tracks in this room.'
      );
    }

    const maxPosition = await this.prisma.queueItem.aggregate({
      where: { roomId },
      _max: { position: true }
    });

    const position = (maxPosition._max.position ?? -1) + 1;
    const item = (await this.prisma.queueItem.create({
      data: {
        roomId,
        videoId: dto.videoId,
        title: dto.title.trim(),
        durationSeconds: dto.durationSeconds ?? null,
        addedById: userId,
        position
      },
      include: {
        addedBy: true
      }
    })) as QueueItemRecord;

    await this.roomsGateway.emitQueueUpdated(roomId);

    return queueItemSchema.parse({
      id: item.id,
      roomId: item.roomId,
      videoId: item.videoId,
      title: item.title,
      durationSeconds: item.durationSeconds ?? null,
      addedById: item.addedById,
      addedByDisplayName: item.addedBy?.displayName ?? 'Unknown',
      position: item.position,
      played: item.played
    });
  }

  async removeFromQueue(roomId: string, itemId: string, userId: string): Promise<void> {
    const membership = await this.roomsService.assertMember(roomId, userId);
    const item = (await this.prisma.queueItem.findUnique({ where: { id: itemId } })) as QueueItemRecord | null;
    if (!item || item.roomId !== roomId) {
      throw new NotFoundStructuredException('QUEUE_ITEM_NOT_FOUND', 'Queue item not found.');
    }

    if (membership.role !== 'HOST' && item.addedById !== userId) {
      throw new ForbiddenStructuredException('CANNOT_REMOVE_ITEM', 'User cannot remove this item.');
    }

    await this.prisma.queueItem.delete({ where: { id: itemId } });
    await this.roomsGateway.emitQueueUpdated(roomId);
  }

  async takeNext(roomId: string): Promise<QueueItemDto | null> {
    const item = (await this.prisma.queueItem.findFirst({
      where: { roomId, played: false },
      orderBy: { position: 'asc' }
    })) as QueueItemRecord | null;
    if (!item) {
      return null;
    }
    await this.prisma.queueItem.update({ where: { id: item.id }, data: { played: true } });
    await this.roomsGateway.emitQueueUpdated(roomId);
    return queueItemSchema.parse({
      id: item.id,
      roomId: item.roomId,
      videoId: item.videoId,
      title: item.title,
      durationSeconds: item.durationSeconds ?? null,
      addedById: item.addedById,
      position: item.position,
      played: true
    });
  }
}
