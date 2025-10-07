import { z } from 'zod';

export const roomRoleSchema = z.enum(['HOST', 'GUEST']);
export type RoomRole = z.infer<typeof roomRoleSchema>;

export const sessionResponseSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string()
});

export type SessionResponse = z.infer<typeof sessionResponseSchema>;

export const createRoomRequestSchema = z.object({
  hostUserId: z.string().uuid()
});

export const createRoomResponseSchema = z.object({
  roomId: z.string().uuid(),
  code: z.string().length(6)
});

export type CreateRoomRequest = z.infer<typeof createRoomRequestSchema>;
export type CreateRoomResponse = z.infer<typeof createRoomResponseSchema>;

export const joinRoomRequestSchema = z.object({
  code: z.string().length(6),
  userId: z.string().uuid()
});

export const roomSettingsSchema = z.object({
  allowGuestEnqueue: z.boolean(),
  allowGuestSkipVote: z.boolean().optional()
});

export const joinRoomResponseSchema = z.object({
  roomId: z.string().uuid(),
  role: roomRoleSchema,
  settings: roomSettingsSchema
});

export type JoinRoomRequest = z.infer<typeof joinRoomRequestSchema>;
export type JoinRoomResponse = z.infer<typeof joinRoomResponseSchema>;
export type RoomSettingsDto = z.infer<typeof roomSettingsSchema>;

export const roomMemberSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string(),
  role: roomRoleSchema,
  joinedAt: z.string()
});

export const roomDetailSchema = z.object({
  roomId: z.string().uuid(),
  code: z.string().length(6),
  hostUserId: z.string().uuid(),
  members: z.array(roomMemberSchema),
  settings: roomSettingsSchema
});

export type RoomDetailDto = z.infer<typeof roomDetailSchema>;

export const queueItemSchema = z.object({
  id: z.string().uuid(),
  roomId: z.string().uuid(),
  videoId: z.string(),
  title: z.string(),
  durationSeconds: z.number().nullable().optional(),
  addedById: z.string().uuid(),
  addedByDisplayName: z.string().optional(),
  position: z.number().int(),
  played: z.boolean()
});

export type QueueItemDto = z.infer<typeof queueItemSchema>;

export const createQueueItemSchema = z.object({
  videoId: z.string(),
  title: z.string(),
  durationSeconds: z.number().int().positive().optional()
});

export type CreateQueueItemRequest = z.infer<typeof createQueueItemSchema>;

export const playbackStateSchema = z.object({
  roomId: z.string().uuid(),
  videoId: z.string().nullable(),
  isPlaying: z.boolean(),
  positionMs: z.number().int(),
  playbackRate: z.number(),
  updatedAt: z.string()
});

export type PlaybackStateDto = z.infer<typeof playbackStateSchema>;

export const stateSyncEventSchema = z.object({
  roomId: z.string().uuid(),
  videoId: z.string().nullable(),
  isPlaying: z.boolean(),
  positionAtEmitMs: z.number().int(),
  startedAtServerMs: z.number().int(),
  playbackRate: z.number()
});

export type StateSyncEvent = z.infer<typeof stateSyncEventSchema>;

export const socketJoinPayloadSchema = z.object({
  roomId: z.string().uuid(),
  userId: z.string().uuid()
});

export const playbackControlPayloadSchema = z.object({
  roomId: z.string().uuid(),
  videoId: z.string().optional(),
  positionMs: z.number().int().nonnegative().optional(),
  playbackRate: z.number().positive().optional()
});

export const queueAddPayloadSchema = z.object({
  roomId: z.string().uuid(),
  videoId: z.string(),
  title: z.string(),
  durationSeconds: z.number().int().positive().optional()
});

export const queueRemovePayloadSchema = z.object({
  roomId: z.string().uuid(),
  itemId: z.string().uuid()
});

export const queueNextPayloadSchema = z.object({
  roomId: z.string().uuid()
});

export const settingsUpdateSchema = z.object({
  roomId: z.string().uuid(),
  allowGuestEnqueue: z.boolean()
});

export const errorResponseSchema = z.object({
  code: z.string(),
  message: z.string()
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

export const youtubeSearchResultSchema = z.object({
  videoId: z.string(),
  title: z.string(),
  channelTitle: z.string(),
  thumbnailUrl: z.string().url(),
  durationSeconds: z.number().int().positive().nullable()
});

export type YoutubeSearchResult = z.infer<typeof youtubeSearchResultSchema>;

export const youtubeSearchResponseSchema = z.object({
  items: z.array(youtubeSearchResultSchema)
});

export type YoutubeSearchResponse = z.infer<typeof youtubeSearchResponseSchema>;

export const socketEvents = {
  join: socketJoinPayloadSchema,
  'playback.load': playbackControlPayloadSchema.extend({ videoId: z.string() }),
  'playback.play': playbackControlPayloadSchema.extend({ positionMs: z.number().int() }),
  'playback.pause': playbackControlPayloadSchema.extend({ positionMs: z.number().int() }),
  'playback.seek': playbackControlPayloadSchema.extend({ positionMs: z.number().int() }),
  'queue.add': queueAddPayloadSchema,
  'queue.remove': queueRemovePayloadSchema,
  'queue.next': queueNextPayloadSchema
} as const;

export type SocketEventMap = typeof socketEvents;
