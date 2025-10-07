import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { RoomsService } from '../rooms/rooms.service.js';
import { QueueService } from '../queue/queue.service.js';
import { PlaybackService } from '../playback/playback.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  socketEvents,
  stateSyncEventSchema,
  playbackStateSchema,
  settingsUpdateSchema,
  RoomRole
} from '@playall/types';
import { ForbiddenStructuredException } from '../common/errors.js';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

type RoomSocketData = {
  userId?: string;
  roomId?: string;
  role?: RoomRole;
  currentVideo?: string | null;
};

type RoomSocket = Socket & { data: RoomSocketData };

@WebSocketGateway({ namespace: '/rooms', cors: { origin: true, credentials: true } })
@Injectable()
export class RoomsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer()
  server!: Namespace;

  private readonly logger = new Logger(RoomsGateway.name);
  private redisPub?: Redis;
  private redisSub?: Redis;
  private syncIntervals = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly roomsService: RoomsService,
    private readonly queueService: QueueService,
    private readonly playbackService: PlaybackService,
    private readonly prisma: PrismaService
  ) {}

  async afterInit() {
    const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
    try {
      this.redisPub = new Redis(redisUrl, { lazyConnect: true });
      this.redisSub = this.redisPub.duplicate();
      await Promise.all([this.redisPub.connect(), this.redisSub!.connect()]);
      const redisAdapter = createAdapter(this.redisPub, this.redisSub);
      this.server.adapter(redisAdapter as unknown as any);
      this.logger.log('Socket.IO Redis adapter initialised');
    } catch (error) {
      this.logger.error('Failed to initialise Redis adapter, falling back to in-memory adapter', error as Error);
      await this.redisPub?.quit();
      await this.redisSub?.quit();
      this.redisPub = undefined;
      this.redisSub = undefined;
    }
  }

  async handleConnection(client: RoomSocket) {
    this.logger.log(`Client connected ${client.id}`);
  }

  async handleDisconnect(client: RoomSocket) {
    this.logger.log(`Client disconnected ${client.id}`);
  }

  async onModuleDestroy() {
    this.syncIntervals.forEach((interval) => clearInterval(interval));
    await this.redisPub?.quit();
    await this.redisSub?.quit();
  }

  private parse<EventName extends keyof typeof socketEvents>(event: EventName, payload: unknown) {
    return socketEvents[event].parse(payload);
  }

  @SubscribeMessage('join')
  async handleJoin(@ConnectedSocket() client: RoomSocket, @MessageBody() payload: unknown) {
    const data = this.parse('join', payload);
    const membership = await this.roomsService.assertMember(data.roomId, data.userId);
    client.data.userId = data.userId;
    client.data.roomId = data.roomId;
    client.data.role = membership.role;
    await client.join(`room:${data.roomId}`);
    const queue = await this.queueService.getQueue(data.roomId);
    client.emit('queue.sync', queue);
    const playback = await this.playbackService.getPlaybackState(data.roomId);
    client.emit('playback.state', playbackStateSchema.parse(playback));
  }

  @SubscribeMessage('playback.load')
  async handlePlaybackLoad(@ConnectedSocket() client: RoomSocket, @MessageBody() payload: unknown) {
    const data = this.parse('playback.load', payload);
    await this.ensureHost(client, data.roomId);
    await this.playbackService.upsertState(data.roomId, {
      videoId: data.videoId,
      isPlaying: false,
      positionMs: 0,
      playbackRate: 1
    });
    client.data.currentVideo = data.videoId;
    this.broadcastStateSync(data.roomId, {
      videoId: data.videoId,
      isPlaying: false,
      positionMs: 0,
      playbackRate: 1
    });
  }

  @SubscribeMessage('playback.play')
  async handlePlaybackPlay(@ConnectedSocket() client: RoomSocket, @MessageBody() payload: unknown) {
    const data = this.parse('playback.play', payload);
    await this.ensureHost(client, data.roomId);
    const current = await this.playbackService.getPlaybackState(data.roomId);
    await this.playbackService.upsertState(data.roomId, {
      videoId: current.videoId,
      isPlaying: true,
      positionMs: data.positionMs,
      playbackRate: data.playbackRate ?? current.playbackRate
    });
    this.broadcastStateSync(data.roomId, {
      videoId: current.videoId,
      isPlaying: true,
      positionMs: data.positionMs,
      playbackRate: data.playbackRate ?? current.playbackRate
    });
  }

  @SubscribeMessage('playback.pause')
  async handlePlaybackPause(@ConnectedSocket() client: RoomSocket, @MessageBody() payload: unknown) {
    const data = this.parse('playback.pause', payload);
    await this.ensureHost(client, data.roomId);
    const current = await this.playbackService.getPlaybackState(data.roomId);
    await this.playbackService.upsertState(data.roomId, {
      videoId: current.videoId,
      isPlaying: false,
      positionMs: data.positionMs,
      playbackRate: data.playbackRate ?? current.playbackRate
    });
    this.broadcastStateSync(data.roomId, {
      videoId: current.videoId,
      isPlaying: false,
      positionMs: data.positionMs,
      playbackRate: data.playbackRate ?? current.playbackRate
    });
  }

  @SubscribeMessage('playback.seek')
  async handlePlaybackSeek(@ConnectedSocket() client: RoomSocket, @MessageBody() payload: unknown) {
    const data = this.parse('playback.seek', payload);
    await this.ensureHost(client, data.roomId);
    const current = await this.playbackService.getPlaybackState(data.roomId);
    await this.playbackService.upsertState(data.roomId, {
      videoId: current.videoId,
      isPlaying: true,
      positionMs: data.positionMs,
      playbackRate: data.playbackRate ?? current.playbackRate
    });
    this.broadcastStateSync(data.roomId, {
      videoId: current.videoId,
      isPlaying: true,
      positionMs: data.positionMs,
      playbackRate: data.playbackRate ?? current.playbackRate
    });
  }

  @SubscribeMessage('queue.add')
  async handleQueueAdd(@ConnectedSocket() client: RoomSocket, @MessageBody() payload: unknown) {
    const data = this.parse('queue.add', payload);
    const userId = this.ensureUser(client);
    await this.queueService.addToQueue(data.roomId, userId, {
      videoId: data.videoId,
      title: data.title,
      durationSeconds: data.durationSeconds
    });
  }

  @SubscribeMessage('queue.remove')
  async handleQueueRemove(@ConnectedSocket() client: RoomSocket, @MessageBody() payload: unknown) {
    const data = this.parse('queue.remove', payload);
    const userId = this.ensureUser(client);
    await this.queueService.removeFromQueue(data.roomId, data.itemId, userId);
  }

  @SubscribeMessage('queue.next')
  async handleQueueNext(@ConnectedSocket() client: RoomSocket, @MessageBody() payload: unknown) {
    const data = this.parse('queue.next', payload);
    await this.ensureHost(client, data.roomId);
    const next = await this.queueService.takeNext(data.roomId);
    if (next) {
      client.data.currentVideo = next.videoId;
      this.broadcastStateSync(data.roomId, {
        videoId: next.videoId,
        isPlaying: false,
        positionMs: 0,
        playbackRate: 1
      });
    }
  }

  async emitQueueUpdated(roomId: string): Promise<void> {
    const items = await this.queueService.getQueue(roomId);
    this.server.to(`room:${roomId}`).emit('queue.updated', items);
  }

  broadcastStateSync(
    roomId: string,
    state: { videoId?: string | null; isPlaying: boolean; positionMs: number; playbackRate: number }
  ) {
    const startedAtServerMs = Date.now();
    const syncPayload = stateSyncEventSchema.parse({
      roomId,
      videoId: state.videoId ?? null,
      isPlaying: state.isPlaying,
      positionAtEmitMs: state.positionMs,
      startedAtServerMs,
      playbackRate: state.playbackRate
    });
    this.server.to(`room:${roomId}`).emit('state.sync', syncPayload);
    this.ensureSyncInterval(roomId);
  }

  private ensureSyncInterval(roomId: string) {
    if (this.syncIntervals.has(roomId)) return;
    const interval = setInterval(async () => {
      const state = await this.playbackService.getPlaybackState(roomId);
      this.server.to(`room:${roomId}`).emit(
        'state.sync',
        stateSyncEventSchema.parse({
          roomId,
          videoId: state.videoId ?? null,
          isPlaying: state.isPlaying,
          positionAtEmitMs: state.positionMs,
          startedAtServerMs: Date.now(),
          playbackRate: state.playbackRate
        })
      );
    }, 7000);
    this.syncIntervals.set(roomId, interval);
  }

  private ensureUser(client: RoomSocket) {
    const userId = client.data.userId as string | undefined;
    if (!userId) {
      throw new ForbiddenStructuredException('SESSION_REQUIRED', 'Socket missing user session.');
    }
    return userId;
  }

  async ensureHost(client: RoomSocket, roomId: string) {
    const userId = this.ensureUser(client);
    const membership = await this.roomsService.assertMember(roomId, userId);
    if (membership.role !== 'HOST') {
      throw new ForbiddenStructuredException('ONLY_HOST', 'Only host may perform this action.');
    }
    return membership;
  }

  async emitSettingsUpdated(roomId: string): Promise<void> {
    const settings = await this.prisma.roomSettings.findUnique({ where: { roomId } });
    if (settings) {
      this.server
        .to(`room:${roomId}`)
        .emit('settings.updated', settingsUpdateSchema.parse({ roomId, allowGuestEnqueue: settings.allowGuestEnqueue }));
    }
  }
}
