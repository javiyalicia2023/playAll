import {
  CreateRoomResponse,
  JoinRoomResponse,
  PlaybackStateDto,
  QueueItemDto,
  RoomDetailDto,
  RoomSettingsDto,
  SessionResponse
} from '@playall/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333/api';

type ErrorPayload = {
  message?: string;
  code?: string;
  [key: string]: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly payload?: ErrorPayload | string;

  constructor(params: { status: number; statusText: string; payload?: ErrorPayload | string }) {
    const { status, statusText, payload } = params;
    const message =
      typeof payload === 'string'
        ? payload || statusText
        : payload?.message || statusText || 'Solicitud fallida';

    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = typeof payload === 'object' && payload ? payload.code : undefined;
    this.payload = payload;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {})
    },
    credentials: 'include'
  });

  if (!response.ok) {
    let payload: ErrorPayload | string | undefined;
    try {
      payload = await response.clone().json();
    } catch {
      payload = await response.text();
    }

    throw new ApiError({ status: response.status, statusText: response.statusText, payload });
  }

  if (response.status === 204 || response.status === 205) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  createSession: () => request<SessionResponse>('/session', { method: 'POST' }),
  createRoom: (hostUserId: string) => request<CreateRoomResponse>('/rooms', { method: 'POST', body: JSON.stringify({ hostUserId }) }),
  joinRoom: (code: string, userId: string) => request<JoinRoomResponse>('/rooms/join', { method: 'POST', body: JSON.stringify({ code, userId }) }),
  getRoom: (roomId: string) => request<RoomDetailDto>(`/rooms/${roomId}`),
  getQueue: (roomId: string) => request<QueueItemDto[]>(`/rooms/${roomId}/queue`),
  addToQueue: (roomId: string, payload: { videoId: string; title: string; durationSeconds?: number }) =>
    request<QueueItemDto>(`/rooms/${roomId}/queue`, { method: 'POST', body: JSON.stringify(payload) }),
  updateSettings: (roomId: string, payload: { allowGuestEnqueue: boolean }) =>
    request<RoomSettingsDto>(`/rooms/${roomId}/settings`, { method: 'POST', body: JSON.stringify(payload) }),
  getPlayback: (roomId: string) => request<PlaybackStateDto>(`/rooms/${roomId}/playback`)
};
