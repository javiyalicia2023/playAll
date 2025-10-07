'use client';

import { useEffect, useState } from 'react';
import { api, isApiError } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { useRoomStore } from '@/store/useRoomStore';

export default function HomePage() {
  const router = useRouter();
  const { setUser, user } = useRoomStore();
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .createSession()
      .then(setUser)
      .catch((err) => setError(isApiError(err) ? err.message : 'Ocurrió un error inesperado.'));
  }, [setUser]);

  const createRoom = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const created = await api.createRoom(user.userId);
      router.push(`/r/${created.code}`);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'No pudimos crear la sala. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!user || roomCode.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.joinRoom(roomCode.toUpperCase(), user.userId);
      router.push(`/r/${roomCode.toUpperCase()}?roomId=${result.roomId}`);
    } catch (err) {
      setError(isApiError(err) ? err.message : 'No se pudo unir a la sala. Revisa el código e inténtalo otra vez.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 1rem', gap: '2rem' }}>
      <h1 style={{ fontSize: '2.5rem', margin: 0 }}>PlayAll</h1>
      <p style={{ maxWidth: 420, textAlign: 'center' }}>
        Crea una sala o únete a una existente para escuchar YouTube de manera sincronizada sin descargar contenido.
      </p>
      {error && <p style={{ color: '#f87171' }}>{error}</p>}
      <button onClick={createRoom} disabled={loading || !user} style={buttonStyles}>
        {loading ? 'Procesando…' : 'Crear sala como anfitrión'}
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
        <input
          value={roomCode}
          onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
          placeholder="Código de sala"
          maxLength={6}
          style={inputStyles}
        />
        <button onClick={joinRoom} disabled={loading || roomCode.length !== 6} style={buttonStyles}>
          Unirse como invitado
        </button>
      </div>
    </main>
  );
}

const buttonStyles: React.CSSProperties = {
  backgroundColor: '#1d4ed8',
  color: 'white',
  border: 'none',
  padding: '0.75rem 1.5rem',
  borderRadius: '9999px',
  fontWeight: 600
};

const inputStyles: React.CSSProperties = {
  padding: '0.75rem 1rem',
  borderRadius: '0.75rem',
  border: '1px solid #334155',
  backgroundColor: '#1e293b',
  color: '#f1f5f9',
  textTransform: 'uppercase',
  letterSpacing: '0.3rem'
};
