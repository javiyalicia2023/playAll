import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { generateRoomCode } from '../common/room-code.js';
import {
  createRoomResponseSchema,
  joinRoomResponseSchema,
  roomDetailSchema,
  roomMemberSchema,
  roomSettingsSchema
} from '@playall/types';
import { ForbiddenStructuredException, NotFoundStructuredException } from '../common/errors.js';
import type { RoomRole } from '@playall/types';

type RoomMemberRecord = {
  roomId: string;
  userId: string;
  role: RoomRole;
  joinedAt: Date;
  user?: { displayName: string };
};

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async createRoom(hostUserId: string) {
    const host = await this.prisma.appUser.findUnique({ where: { id: hostUserId } });
    if (!host) {
      throw new NotFoundStructuredException('HOST_NOT_FOUND', 'Host user does not exist.');
    }

    let code = generateRoomCode();
    for (let i = 0; i < 5; i += 1) {
      const exists = await this.prisma.room.findUnique({ where: { code } });
      if (!exists) break;
      code = generateRoomCode();
    }

    const room = await this.prisma.$transaction(async (tx) => {
      const created = await tx.room.create({
        data: {
          code,
          hostUserId: host.id,
          members: {
            create: {
              userId: host.id,
              role: 'HOST'
            }
          },
          settings: {
            create: {
              allowGuestEnqueue: true,
              allowGuestSkipVote: false
            }
          }
        },
        include: {
          settings: true
        }
      });
      return created;
    });

    return createRoomResponseSchema.parse({ roomId: room.id, code: room.code });
  }

  async joinRoom(code: string, userId: string) {
    const room = await this.prisma.room.findUnique({
      where: { code },
      include: {
        settings: true,
        members: true
      }
    });

    if (!room || !room.isActive) {
      throw new NotFoundStructuredException('ROOM_NOT_FOUND', 'Room not found.');
    }

    const existingMembership = room.members.find(
      (member: RoomMemberRecord) => member.userId === userId
    ) as RoomMemberRecord | undefined;
    const role: RoomRole = existingMembership?.role ?? 'GUEST';

    if (!existingMembership) {
      await this.prisma.roomMember.create({
        data: {
          roomId: room.id,
          userId,
          role
        }
      });
    }

    return joinRoomResponseSchema.parse({
      roomId: room.id,
      role,
      settings: roomSettingsSchema.parse({
        allowGuestEnqueue: room.settings?.allowGuestEnqueue ?? true,
        allowGuestSkipVote: room.settings?.allowGuestSkipVote ?? false
      })
    });
  }

  async assertMember(roomId: string, userId: string): Promise<RoomMemberRecord> {
    const membership = (await this.prisma.roomMember.findUnique({
      where: {
        roomId_userId: { roomId, userId }
      }
    })) as RoomMemberRecord | null;
    if (!membership) {
      throw new ForbiddenStructuredException('NOT_A_MEMBER', 'User is not part of this room.');
    }
    return membership;
  }

  async getRoomDetails(roomId: string) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: {
            user: true
          }
        },
        settings: true
      }
    });
    if (!room) {
      throw new NotFoundStructuredException('ROOM_NOT_FOUND', 'Room not found.');
    }

    return roomDetailSchema.parse({
      roomId: room.id,
      code: room.code,
      hostUserId: room.hostUserId,
      members: room.members.map((member: RoomMemberRecord & { user: { displayName: string } }) =>
        roomMemberSchema.parse({
          userId: member.userId,
          displayName: member.user.displayName,
          role: member.role,
          joinedAt: member.joinedAt.toISOString()
        })
      ),
      settings: roomSettingsSchema.parse({
        allowGuestEnqueue: room.settings?.allowGuestEnqueue ?? true,
        allowGuestSkipVote: room.settings?.allowGuestSkipVote ?? false
      })
    });
  }
}
