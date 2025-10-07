import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:3333';

export function createRoomSocket(): Socket {
  return io(`${SOCKET_URL}/rooms`, {
    withCredentials: true,
    transports: ['websocket']
  });
}
