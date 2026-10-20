import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import type { Ack, ReactionEvent, RoomView, SessionInfo } from './events.ts';
import type { RealShape } from '../game/types.ts';

const STORAGE_KEY = 'whot:session';
export type ConnStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline';

function loadSession(): SessionInfo | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionInfo) : null;
  } catch {
    return null;
  }
}
function saveSession(s: SessionInfo | null): void {
  try {
    if (s) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable (private mode): reconnect-after-reload just won't work */
  }
}
function newActionId(): string {
  const b = new Uint8Array(12);
  globalThis.crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

const NO_CONN: Ack<any> = { ok: false, code: 'SERVER_BUSY', error: 'Not connected to the server yet. Please wait a moment.' };

/** One Socket.IO connection + the current room view. All game truth comes from the server. */
export function useWhot() {
  const socketRef = useRef<any>(null);
  const [status, setStatus] = useState<ConnStatus>('connecting');
  const [room, setRoom] = useState<RoomView | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  /** Latest reaction per player id (drives the floating emoji). */
  const [reactions, setReactions] = useState<Record<string, ReactionEvent>>({});
  const [lastReaction, setLastReaction] = useState<ReactionEvent | undefined>(undefined);
  const roomRef = useRef<RoomView | null>(null);
  roomRef.current = room;

  useEffect(() => {
    // Same-origin by default (dev proxy / single-host). On Vercel, set VITE_SOCKET_URL to the Render server URL.
    const url = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_SOCKET_URL;
    const socket = url ? io(url, { transports: ['websocket', 'polling'], reconnectionDelayMax: 4000 }) : io({ transports: ['websocket', 'polling'], reconnectionDelayMax: 4000 });
    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('connected');
      const saved = loadSession();
      if (!saved) {
        setRestoring(false);
        return;
      }
      // Reconnect: prove identity with the secret token; the server restores seat + hand.
      socket.timeout(8000).emit('room:reconnect', saved, (err: Error | null, res: Ack) => {
        if (err || !res) {
          setRestoring(false);
          return;
        }
        if (!res.ok) {
          saveSession(null);
          setRoom(null);
          if (res.code === 'ROOM_NOT_FOUND') setNotice('Your previous room has ended (the server may have restarted).');
          else if (res.code === 'BAD_TOKEN') setNotice('Your seat in the previous room has expired.');
        }
        setRestoring(false);
      });
    });
    socket.on('disconnect', () => setStatus(roomRef.current ? 'reconnecting' : 'offline'));
    socket.on('connect_error', () => setStatus(roomRef.current ? 'reconnecting' : 'offline'));
    socket.io.on('reconnect_attempt', () => setStatus((s) => (s === 'connected' ? s : 'reconnecting')));
    socket.on('room:state', (view: RoomView) => setRoom(view));
    socket.on('room:reaction', (e: ReactionEvent) => {
      setReactions((prev) => ({ ...prev, [e.playerId]: e }));
      setLastReaction(e);
    });
    socket.on('room:removed', (reason: string) => {
      saveSession(null);
      setRoom(null);
      setNotice(reason === 'kicked' ? 'The host removed you from the room.' : 'The room was closed.');
    });
    socket.on('session:replaced', () => {
      saveSession(null);
      setRoom(null);
      setNotice('You opened this game in another tab, so this tab was disconnected.');
    });
    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  const request = useCallback((event: string, payload?: unknown): Promise<Ack<any>> => {
    return new Promise((resolve) => {
      const s = socketRef.current;
      if (!s || !s.connected) return resolve(NO_CONN);
      const args = payload === undefined ? [] : [payload];
      s.timeout(8000).emit(event, ...args, (err: Error | null, res: Ack<any>) => {
        resolve(err || !res ? { ok: false, code: 'SERVER_BUSY', error: 'The server did not respond. Try again.' } : res);
      });
    });
  }, []);

  const create = useCallback(
    async (nickname: string, maxPlayers: number, rules: unknown) => {
      const r = await request('room:create', { nickname, maxPlayers, rules });
      if (r.ok) {
        saveSession(r.session);
        setNotice(null);
      }
      return r;
    },
    [request],
  );
  const join = useCallback(
    async (nickname: string, code: string) => {
      const r = await request('room:join', { nickname, code });
      if (r.ok) {
        saveSession(r.session);
        setNotice(null);
      }
      return r;
    },
    [request],
  );
  const leave = useCallback(async () => {
    await request('room:leave');
    saveSession(null);
    setRoom(null);
    setReactions({});
  }, [request]);

  return {
    status,
    room,
    restoring,
    notice,
    reactions,
    lastReaction,
    react: (reactionId: string) => request('room:react', { reactionId }),
    clearNotice: () => setNotice(null),
    create,
    join,
    leave,
    updateSettings: (p: { maxPlayers?: number; rules?: unknown }) => request('room:updateSettings', p),
    kick: (playerId: string) => request('room:kick', { playerId }),
    start: () => request('game:start'),
    play: (cardId: string, version: number, extra: { calledShape?: RealShape; reverse?: boolean } = {}) =>
      request('game:play', { cardId, version, actionId: newActionId(), ...extra }),
    draw: (version: number) => request('game:draw', { version, actionId: newActionId() }),
    endGame: () => request('game:end'),
    rematch: () => request('game:rematch'),
  };
}
export type WhotClient = ReturnType<typeof useWhot>;
