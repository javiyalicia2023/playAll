'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api, isApiError } from '@/lib/api';
import { useRoomStore } from '@/store/useRoomStore';
import { useRoomSocket } from '@/hooks/useRoomSocket';
import YouTube from 'react-youtube';
import type { YoutubeSearchResult } from '@playall/types';

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setUser, setRoom, setQueue, updateSettings, setPlayback, room, queue, settings, playback } = useRoomStore();
  const [role, setRole] = useState<'HOST' | 'GUEST'>('GUEST');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<YoutubeSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerRef = useRef<any>();
  const socketRef = useRoomSocket(room?.roomId ?? null);

  const code = useMemo(() => params.code.toUpperCase(), [params.code]);

  useEffect(() => {
    api
      .createSession()
      .then(async (session) => {
        setUser(session);
        const join = await api.joinRoom(code, session.userId);
        setRole(join.role);
        updateSettings({
          allowGuestEnqueue: join.settings.allowGuestEnqueue,
          allowGuestSkipVote: join.settings.allowGuestSkipVote ?? false
        });
        const roomId = join.roomId ?? searchParams.get('roomId') ?? '';
        const details = await api.getRoom(roomId);
        setRoom(details);
        const items = await api.getQueue(roomId);
        setQueue(items);
        const playbackState = await api.getPlayback(roomId);
        setPlayback({
          roomId,
          videoId: playbackState.videoId ?? null,
          isPlaying: playbackState.isPlaying,
          positionAtEmitMs: playbackState.positionMs,
          startedAtServerMs: Date.now(),
          playbackRate: playbackState.playbackRate
        });
      })
      .catch((err) => {
        setError(isApiError(err) ? err.message : 'No fue posible cargar la sala.');
        router.push('/');
      });
  }, [code, setQueue, setRoom, setUser, setPlayback, updateSettings, router, searchParams]);

  useEffect(() => {
    if (playback?.videoId && playerRef.current) {
      const player = playerRef.current;
      const videoData = player.getVideoData?.();
      if (!videoData || videoData.video_id !== playback.videoId) {
        player.loadVideoById(playback.videoId, playback.positionAtEmitMs / 1000);
      }
      const now = Date.now();
      const elapsed = (now - playback.startedAtServerMs) * playback.playbackRate;
      const targetSeconds = (playback.positionAtEmitMs + elapsed) / 1000;
      const currentSeconds = player.getCurrentTime?.() ?? 0;
      if (Math.abs(currentSeconds - targetSeconds) > 0.25) {
        player.seekTo(targetSeconds, true);
      }
      if (playback.isPlaying) {
        player.playVideo?.();
      } else {
        player.pauseVideo?.();
      }
      player.setPlaybackRate?.(playback.playbackRate);
    }
  }, [playback]);

  const emitPlay = (event: 'playback.play' | 'playback.pause' | 'playback.seek') => {
    if (!socketRef.current || !room || !playerRef.current) return;
    const positionMs = Math.floor((playerRef.current.getCurrentTime?.() ?? 0) * 1000);
    socketRef.current.emit(event, { roomId: room.roomId, positionMs });
  };

  const emitLoad = (videoId: string) => {
    if (!socketRef.current || !room) return;
    socketRef.current.emit('playback.load', { roomId: room.roomId, videoId });
  };

  const emitNext = () => {
    if (!socketRef.current || !room) return;
    socketRef.current.emit('queue.next', { roomId: room.roomId });
  };

  const toggleAllowGuest = async () => {
    if (!room || !settings) return;
    const updated = await api.updateSettings(room.roomId, { allowGuestEnqueue: !settings.allowGuestEnqueue });
    updateSettings(updated);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    try {
      const results = await api.search(searchTerm.trim());
      setSearchResults(results.items);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'La búsqueda falló. Intenta de nuevo.');
    } finally {
      setSearching(false);
    }
  };

  const enqueue = async (video: YoutubeSearchResult) => {
    if (!room) return;
    try {
      await api.addToQueue(room.roomId, {
        videoId: video.videoId,
        title: video.title,
        durationSeconds: video.durationSeconds ?? undefined
      });
      const items = await api.getQueue(room.roomId);
      setQueue(items);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'No se pudo agregar a la cola.');
    }
  };

  const allowGuestEnqueue = settings?.allowGuestEnqueue ?? true;
  const isGuestBlocked = role === 'GUEST' && !allowGuestEnqueue;

  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2rem 1rem', maxWidth: 960, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
        <div>
          <h1 style={{ margin: 0 }}>Sala {code}</h1>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#94a3b8' }}>Tu rol: {role === 'HOST' ? 'Anfitrión' : 'Invitado'}</p>
        </div>
        {role === 'HOST' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" checked={allowGuestEnqueue} onChange={toggleAllowGuest} />
            Permitir que invitados encolen
          </label>
        )}
      </header>
      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      <section style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px', background: '#1e293b', padding: '1rem', borderRadius: '0.75rem' }}>
          <h2 style={{ marginTop: 0 }}>Cola</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {queue.map((item) => (
              <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'center' }}>
                <div>
                  <strong>{item.title}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Añadido por: {item.addedByDisplayName ?? item.addedById}</div>
                </div>
                {role === 'HOST' && (
                  <button onClick={() => emitLoad(item.videoId)} style={secondaryButton}>
                    Cargar
                  </button>
                )}
              </li>
            ))}
            {queue.length === 0 && <li style={{ color: '#94a3b8' }}>La cola está vacía.</li>}
          </ul>
        </div>
        <div style={{ flex: '1 1 320px', background: '#1e293b', padding: '1rem', borderRadius: '0.75rem' }}>
          <h2 style={{ marginTop: 0 }}>Controles</h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button onClick={() => emitPlay('playback.play')} disabled={role !== 'HOST'} style={primaryButton}>
              Play
            </button>
            <button onClick={() => emitPlay('playback.pause')} disabled={role !== 'HOST'} style={primaryButton}>
              Pause
            </button>
            <button onClick={() => emitPlay('playback.seek')} disabled={role !== 'HOST'} style={primaryButton}>
              Sincronizar
            </button>
            <button onClick={emitNext} disabled={role !== 'HOST'} style={primaryButton}>
              Siguiente
            </button>
          </div>
          <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#94a3b8' }}>
            Drift local: {driftInfo(playback, playerRef.current)}
          </div>
        </div>
      </section>
      <section style={{ background: '#1e293b', padding: '1rem', borderRadius: '0.75rem' }}>
        <h2 style={{ marginTop: 0 }}>Buscar en YouTube</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar canciones"
            style={{ flex: 1, minWidth: 200, padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid #334155', background: '#0f172a', color: '#f8fafc' }}
          />
          <button onClick={handleSearch} disabled={searching} style={primaryButton}>
            {searching ? 'Buscando…' : 'Buscar'}
          </button>
        </div>
        {isGuestBlocked && <p style={{ color: '#fbbf24', marginTop: '0.5rem' }}>El anfitrión ha bloqueado que los invitados encolen canciones.</p>}
        <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {searchResults.map((video) => (
            <li key={video.videoId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
              <div>
                <strong>{video.title}</strong>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{video.channelTitle}</div>
              </div>
              <button onClick={() => enqueue(video)} disabled={isGuestBlocked} style={secondaryButton}>
                Agregar
              </button>
            </li>
          ))}
          {searchResults.length === 0 && <li style={{ color: '#94a3b8' }}>No hay resultados todavía.</li>}
        </ul>
      </section>
      <div style={{ width: 0, height: 0, overflow: 'hidden' }}>
        <YouTube
          videoId={playback?.videoId ?? undefined}
          opts={{ playerVars: { autoplay: 0 } }}
          onReady={(event) => {
            playerRef.current = event.target;
          }}
        />
      </div>
    </main>
  );
}

const primaryButton: React.CSSProperties = {
  backgroundColor: '#2563eb',
  color: '#f8fafc',
  border: 'none',
  padding: '0.65rem 1.25rem',
  borderRadius: '9999px',
  fontWeight: 600
};

const secondaryButton: React.CSSProperties = {
  ...primaryButton,
  backgroundColor: '#475569'
};

function driftInfo(playback: ReturnType<typeof useRoomStore>['playback'], player: any) {
  if (!playback || !player) return '0ms';
  const now = Date.now();
  const elapsed = (now - playback.startedAtServerMs) * playback.playbackRate;
  const target = (playback.positionAtEmitMs + elapsed) / 1000;
  const current = player.getCurrentTime?.() ?? 0;
  return `${Math.round((current - target) * 1000)}ms`;
}
