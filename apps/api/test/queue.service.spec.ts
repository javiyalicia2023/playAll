import { QueueService } from '../src/queue/queue.service.js';
import { ForbiddenStructuredException } from '../src/common/errors.js';

describe('QueueService permissions', () => {
  const prisma = {
    roomSettings: {
      findUnique: jest.fn()
    },
    queueItem: {
      aggregate: jest.fn().mockResolvedValue({ _max: { position: 1 } }),
      create: jest.fn().mockResolvedValue({
        id: 'item-1',
        roomId: 'room-1',
        videoId: 'vid',
        title: 'Song',
        durationSeconds: 200,
        addedById: 'user-guest',
        position: 2,
        played: false,
        addedBy: { displayName: 'Guest' }
      }),
      findUnique: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      update: jest.fn()
    }
  } as any;

  const roomsService = {
    assertMember: jest.fn()
  } as any;

  const roomsGateway = {
    emitQueueUpdated: jest.fn().mockResolvedValue(undefined)
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows guests to enqueue when enabled', async () => {
    prisma.roomSettings.findUnique.mockResolvedValue({ allowGuestEnqueue: true });
    roomsService.assertMember.mockResolvedValue({ role: 'GUEST' });

    const service = new QueueService(prisma, roomsService, roomsGateway);
    await expect(
      service.addToQueue('room-1', 'user-guest', { videoId: 'vid', title: 'Song', durationSeconds: 200 })
    ).resolves.toMatchObject({ videoId: 'vid' });
    expect(roomsGateway.emitQueueUpdated).toHaveBeenCalledWith('room-1');
  });

  it('blocks guests when enqueue disabled', async () => {
    prisma.roomSettings.findUnique.mockResolvedValue({ allowGuestEnqueue: false });
    roomsService.assertMember.mockResolvedValue({ role: 'GUEST' });

    const service = new QueueService(prisma, roomsService, roomsGateway);
    await expect(
      service.addToQueue('room-1', 'user-guest', { videoId: 'vid', title: 'Song' })
    ).rejects.toBeInstanceOf(ForbiddenStructuredException);
  });

  it('allows host regardless of setting', async () => {
    prisma.roomSettings.findUnique.mockResolvedValue({ allowGuestEnqueue: false });
    roomsService.assertMember.mockResolvedValue({ role: 'HOST' });

    const service = new QueueService(prisma, roomsService, roomsGateway);
    await expect(service.addToQueue('room-1', 'host', { videoId: 'vid', title: 'Track' })).resolves.toMatchObject({
      videoId: 'vid'
    });
    expect(roomsGateway.emitQueueUpdated).toHaveBeenCalledWith('room-1');
  });
});
