import type { RealShape, RuleConfig } from '../game/types.ts';
import type { GameView } from '../game/view.ts';
import type { ReactionId } from '../game/reactions.ts';

export type ErrorCode =
  | 'INVALID_INPUT'
  | 'INVALID_CODE'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'GAME_IN_PROGRESS'
  | 'NOT_HOST'
  | 'NOT_IN_ROOM'
  | 'BAD_TOKEN'
  | 'NAME_TAKEN'
  | 'WRONG_PHASE'
  | 'NOT_ENOUGH_PLAYERS'
  | 'STALE'
  | 'DUPLICATE'
  | 'ILLEGAL_MOVE'
  | 'RATE_LIMITED'
  | 'SERVER_BUSY';

export type Ack<T = object> = ({ ok: true } & T) | { ok: false; code: ErrorCode; error: string };

/** Returned only to the player it belongs to. The token is the reconnect secret. */
export interface SessionInfo {
  code: string;
  playerId: string;
  token: string;
}

/**
 * Cumulative scoring convention: GOLF-STYLE. After every round each player's remaining-card total is ADDED to
 * their running total, so a lower total is better everywhere (round result and overall) and the overall board
 * can never invert the round result. The player who goes out adds 0. `wins` counts rounds won.
 */
export interface ScoreRow {
  playerId: string;
  total: number;
  wins: number;
  rounds: number;
}
export interface RoundRecord {
  round: number;
  results: Array<{ playerId: string; points: number; winner: boolean }>;
}

export interface PublicSeat {
  id: string;
  nickname: string;
  connected: boolean;
  isHost: boolean;
}

export type RoomPhase = 'lobby' | 'playing' | 'finished';

/** Everything one player is allowed to see about a room. Contains no tokens and no hidden cards. */
export interface RoomView {
  code: string;
  phase: RoomPhase;
  hostId: string;
  maxPlayers: number;
  rules: RuleConfig;
  seats: PublicSeat[];
  /** id -> nickname, including players who have since left (for the activity log). */
  names: Record<string, string>;
  youId: string;
  game: GameView | null;
  gamesPlayed: number;
  /** Round number within the current game session (resets only when a new game starts from the lobby). */
  round: number;
  /** Cumulative standings, best (lowest total) first. */
  scores: ScoreRow[];
  /** Completed rounds of this session (most recent last). */
  rounds: RoundRecord[];
  graceMs: number;
  serverNow: number;
}

/** Ephemeral: never stored in game state, only fanned out to everyone in the room. */
export interface ReactionEvent {
  id: string;
  playerId: string;
  reactionId: ReactionId;
}

export interface PlayPayload {
  cardId: string;
  calledShape?: RealShape;
  reverse?: boolean;
  /** The game version the client was looking at; stale actions are rejected. */
  version: number;
  /** Client-generated unique id so retried/duplicated events are applied once. */
  actionId: string;
}
export interface DrawPayload {
  version: number;
  actionId: string;
}

export interface ClientToServerEvents {
  'room:create': (p: { nickname: string; maxPlayers: number; rules?: unknown }, ack: (r: Ack<{ session: SessionInfo }>) => void) => void;
  'room:join': (p: { nickname: string; code: string }, ack: (r: Ack<{ session: SessionInfo }>) => void) => void;
  'room:reconnect': (p: SessionInfo, ack: (r: Ack) => void) => void;
  'room:leave': (ack?: (r: Ack) => void) => void;
  'room:updateSettings': (p: { maxPlayers?: number; rules?: unknown }, ack?: (r: Ack) => void) => void;
  'room:kick': (p: { playerId: string }, ack?: (r: Ack) => void) => void;
  'room:react': (p: { reactionId: string }, ack?: (r: Ack) => void) => void;
  'game:start': (ack?: (r: Ack) => void) => void;
  'game:play': (p: PlayPayload, ack?: (r: Ack) => void) => void;
  /** Draws one card, or pays the active penalty. */
  'game:draw': (p: DrawPayload, ack?: (r: Ack) => void) => void;
  /** Host: abandon/finish and return everyone to the lobby. */
  'game:end': (ack?: (r: Ack) => void) => void;
  /** Host: start another game with the same players and settings (after a game has finished). */
  'game:rematch': (ack?: (r: Ack) => void) => void;
}

export interface ServerToClientEvents {
  'room:state': (view: RoomView) => void;
  'room:reaction': (e: ReactionEvent) => void;
  'room:removed': (reason: 'kicked' | 'expired' | 'closed') => void;
  'session:replaced': () => void;
}

export interface SocketData {
  session?: { code: string; playerId: string };
}
