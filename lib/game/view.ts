import type { Card, GameResult, HistoryEntry, PenaltyKindState, RealShape, RuleConfig } from './types.ts';
import type { GameState } from './types.ts';
import { currentPlayerId, playableCards, topCard } from './engine.ts';

/** What one player is allowed to know about the game. Built per recipient; never the raw GameState. */
export interface GameView {
  status: 'playing' | 'finished';
  version: number;
  rules: RuleConfig;
  /** Seat order, with public hand sizes only. */
  seats: Array<{ id: string; handCount: number }>;
  you: { id: string; hand: Card[]; playableCardIds: string[]; canDraw: boolean };
  topCard: Card;
  calledShape: RealShape | null;
  marketCount: number;
  discardCount: number;
  currentPlayerId: string;
  direction: 1 | -1;
  penalty: PenaltyKindState | null;
  history: HistoryEntry[];
  result: GameResult | null;
}

/**
 * The single place that turns internal game state into something a client may see.
 * Deliberately builds a fresh object field by field so new internal fields are private by default.
 * Never includes: other players' hands, market order/contents, discard contents below the top card.
 */
export function sanitizeGame(state: GameState, viewerId: string): GameView {
  const me = state.players.find((p) => p.id === viewerId);
  const myTurn = state.status === 'playing' && currentPlayerId(state) === viewerId;
  return {
    status: state.status,
    version: state.version,
    rules: { ...state.rules },
    seats: state.players.map((p) => ({ id: p.id, handCount: p.hand.length })),
    you: {
      id: viewerId,
      hand: me ? me.hand.map((c) => ({ ...c })) : [],
      playableCardIds: playableCards(state, viewerId).map((c) => c.id),
      canDraw: myTurn,
    },
    topCard: { ...topCard(state) },
    calledShape: state.calledShape,
    marketCount: state.market.length,
    discardCount: state.discard.length,
    currentPlayerId: currentPlayerId(state),
    direction: state.direction,
    penalty: state.penalty ? { ...state.penalty } : null,
    history: state.history.slice(-40).map((h) => ({ ...h })),
    result: state.result ? structuredClone(state.result) : null,
  };
}
