import { RoomsService } from '../src/rooms/rooms.service.js';
import { ForbiddenStructuredException } from '../src/common/errors.js';

describe('RoomsService', () => {
  const hostUser = { id: 'host-1', displayName: 'Host' };
  const room = {
    id: 'room-1',
    code: 'ABCDEF',
    hostUserId: hostUser.id,
    isActive: true,
    settings: { allowGuestEnqueue: true, allowGuestSkipVote: false },
    members: [{ userId: hostUser.id, role: 'HOST', joinedAt: new Date(), user: hostUser }]
  };

  const prisma = {
    appUser: {
      findUnique: jest.fn().mockResolvedValue(hostUser)
    },
    room: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ ...room, settings: room.settings })
    },
    roomMember: {
      findUnique: jest.fn().mockResolvedValue({ roomId: room.id, userId: hostUser.id, role: 'HOST' }),
      create: jest.fn()
    },
    roomSettings: {
      findUnique: jest.fn().mockResolvedValue(room.settings)
    },
    $transaction: jest.fn(async (callback: any) => callback(prisma))
  } as any;

  it('creates a room for the host', async () => {
    const service = new RoomsService(prisma);
    const result = await service.createRoom(hostUser.id);
    expect(result.roomId).toBe(room.id);
    expect(result.code).toHaveLength(6);
  });

  it('asserts membership before protected operations', async () => {
    const service = new RoomsService(prisma);
    await expect(service.assertMember(room.id, 'someone')).rejects.toBeInstanceOf(ForbiddenStructuredException);
  });
});
