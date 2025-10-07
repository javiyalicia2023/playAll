import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RoomsService } from '../rooms/rooms.service.js';
import { roomSettingsSchema } from '@playall/types';
import { ForbiddenStructuredException } from '../common/errors.js';
import { RoomsGateway } from '../sockets/rooms.gateway.js';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roomsService: RoomsService,
    @Inject(forwardRef(() => RoomsGateway)) private readonly roomsGateway: RoomsGateway
  ) {}

  async updateAllowGuestEnqueue(roomId: string, userId: string, allowGuestEnqueue: boolean) {
    const membership = await this.roomsService.assertMember(roomId, userId);
    if (membership.role !== 'HOST') {
      throw new ForbiddenStructuredException('ONLY_HOST', 'Only the host can update settings.');
    }

    const settings = await this.prisma.roomSettings.upsert({
      where: { roomId },
      create: {
        roomId,
        allowGuestEnqueue,
        allowGuestSkipVote: false
      },
      update: {
        allowGuestEnqueue
      }
    });

    await this.roomsGateway.emitSettingsUpdated(roomId);

    return roomSettingsSchema.parse({
      allowGuestEnqueue: settings.allowGuestEnqueue,
      allowGuestSkipVote: settings.allowGuestSkipVote
    });
  }
}
