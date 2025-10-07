import { useEffect, useRef } from 'react';
import { createRoomSocket } from '@/lib/socket';
import { useRoomStore } from '@/store/useRoomStore';
import type { Socket } from 'socket.io-client';
import { queueItemSchema, settingsUpdateSchema, stateSyncEventSchema } from '@playall/types';

export function useRoomSocket(roomId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const { user, setQueue, updateSettings, setPlayback, settings } = useRoomStore();

  useEffect(() => {
    if (!roomId || !user) {
      return undefined;
    }

    const socket = createRoomSocket();
    socketRef.current = socket;

    socket.emit('join', { roomId, userId: user.userId });

    socket.on('queue.sync', (items) => {
      const parsed = queueItemSchema.array().safeParse(items);
      if (parsed.success) {
        setQueue(parsed.data);
      }
    });

    socket.on('queue.updated', (items) => {
      const parsed = queueItemSchema.array().safeParse(items);
      if (parsed.success) {
        setQueue(parsed.data);
      }
    });

    socket.on('settings.updated', (payload) => {
      const parsed = settingsUpdateSchema.safeParse(payload);
      if (parsed.success) {
        updateSettings({
          allowGuestEnqueue: parsed.data.allowGuestEnqueue,
          allowGuestSkipVote: settings?.allowGuestSkipVote ?? false
        });
      }
    });

    socket.on('state.sync', (payload) => {
      const parsed = stateSyncEventSchema.safeParse(payload);
      if (parsed.success) {
        setPlayback(parsed.data);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, user, setQueue, updateSettings, setPlayback, settings]);

  return socketRef;
}
