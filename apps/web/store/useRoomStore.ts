import { create } from 'zustand';
import type {
  QueueItemDto,
  RoomDetailDto,
  RoomSettingsDto,
  SessionResponse,
  StateSyncEvent
} from '@playall/types';

interface RoomState {
  user: SessionResponse | null;
  room: RoomDetailDto | null;
  queue: QueueItemDto[];
  settings: RoomSettingsDto | null;
  playback: StateSyncEvent | null;
  setUser(user: SessionResponse): void;
  setRoom(room: RoomDetailDto): void;
  setQueue(queue: QueueItemDto[]): void;
  addQueueItem(item: QueueItemDto): void;
  removeQueueItem(itemId: string): void;
  updateSettings(settings: RoomSettingsDto): void;
  setPlayback(state: StateSyncEvent): void;
}

export const useRoomStore = create<RoomState>((set) => ({
  user: null,
  room: null,
  queue: [],
  settings: null,
  playback: null,
  setUser: (user) => set({ user }),
  setRoom: (room) => set({ room }),
  setQueue: (queue) => set({ queue }),
  addQueueItem: (item) => set((state) => ({ queue: [...state.queue, item] })),
  removeQueueItem: (itemId) => set((state) => ({ queue: state.queue.filter((item) => item.id !== itemId) })),
  updateSettings: (settings) => set({ settings }),
  setPlayback: (playback) => set({ playback })
}));
