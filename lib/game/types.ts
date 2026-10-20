export const SHAPES = ['circle', 'triangle', 'cross', 'square', 'star'] as const;
export type RealShape = (typeof SHAPES)[number];
export type Shape = RealShape | 'whot';

export interface Card {
  id: string;
  shape: Shape;
  number: number;
}

export type GameMode = 'rollover' | 'count';
/** Which penalty cards a given penalty card may be played on while defending. */
export type CounterSet = 'same-only' | 'any-penalty';
/** 'pick2' = the 2-card. 'pick5' = the 5-card (traditionally "Pick 3"; see RuleConfig.fivePenalty). */
export type PenaltyKind = 'pick2' | 'pick5';

export interface RuleConfig {
  mode: GameMode;
  cardsPerPlayer: number;
  /** When true, a player facing a penalty may answer with a permitted counter card. */
  defence: boolean;
  /** When true (and defence is on), counters add to the pending penalty; otherwise they deflect it. */
  stacking: boolean;
  /** Which penalties a 2-card may be played on. */
  pick2Counters: CounterSet;
  /** Which penalties a 5-card may be played on. */
  pick5Counters: CounterSet;
  /** Cards drawn per 5-card. Traditional Nigerian Whot = 3 ("Pick 3"). Some houses use 5. */
  fivePenalty: 3 | 5;
  /** 8-card skips the next player. */
  suspension8: boolean;
  /** Player of a 14 (General Market) plays again. */
  generalMarketPlaysAgain: boolean;
  /** Playing a 2 or 5 may reverse direction. */
  directionChange: boolean;
  /** Allow going out with a special card (1, 2, 5, 8, 14, Whot). */
  finishOnSpecial: boolean;
  /** Scoring: stars count double when totalling a hand. Off = every card scores its printed number (Whot = 20). */
  starsCountDouble: boolean;
}

export type PenaltyKindState = { kind: PenaltyKind; pending: number; sourceId: string };

export interface PlayerState {
  id: string;
  hand: Card[];
}

export type HistoryType =
  | 'start'
  | 'play'
  | 'draw'
  | 'penalty-draw'
  | 'general-market'
  | 'skip'
  | 'reshuffle'
  | 'forfeit'
  | 'end';

export interface HistoryEntry {
  seq: number;
  type: HistoryType;
  playerId?: string;
  card?: Card;
  calledShape?: RealShape;
  count?: number;
  targetIds?: string[];
  reversed?: boolean;
  note?: string;
}

export type EndReason = 'out-of-cards' | 'market-exhausted' | 'forfeit' | 'stalemate';

export interface ScoredCard {
  card: Card;
  /** Points this card is worth in the hand total. */
  value: number;
}

export interface PlayerResult {
  playerId: string;
  /** Cards still held at the end of the round, with their individual values. */
  hand: ScoredCard[];
  cards: number;
  /** Sum of the VALUES of the remaining cards. Lowest total wins the round. */
  points: number;
  rank: number;
  winner: boolean;
}

export interface GameResult {
  mode: GameMode;
  reason: EndReason;
  winnerIds: string[];
  ranking: PlayerResult[];
  explanation: string;
}

export interface GameState {
  rules: RuleConfig;
  players: PlayerState[];
  /** Face-down market. The TOP of the market is the END of the array. Never sent to clients. */
  market: Card[];
  /** Played pile. The TOP card is the END of the array. */
  discard: Card[];
  currentIndex: number;
  direction: 1 | -1;
  /** Shape demanded by the last Whot card, if still in force. */
  calledShape: RealShape | null;
  penalty: PenaltyKindState | null;
  status: 'playing' | 'finished';
  result: GameResult | null;
  history: HistoryEntry[];
  seq: number;
  /** Increments on every accepted action. Used to reject stale/duplicate client actions. */
  version: number;
  /** Consecutive draws that produced no card (market and discard both exhausted). */
  stalledPasses: number;
}

export type Rng = (maxExclusive: number) => number;
export type EngineResult = { ok: true; state: GameState } | { ok: false; error: string };
