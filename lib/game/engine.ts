import type {
  Card,
  EndReason,
  EngineResult,
  GameResult,
  GameState,
  HistoryEntry,
  PlayerResult,
  RealShape,
  RuleConfig,
  Rng,
} from './types.ts';
import { SHAPES } from './types.ts';
import { buildDeck, secureRandomInt, shuffle } from './deck.ts';
import { canCounter, cardPenaltyKind, handTotal, isSpecialCard, penaltyAmount, pointValue } from './rules.ts';

/* ------------------------------------------------------------------ helpers */

function clone(state: GameState): GameState {
  return structuredClone(state);
}

function log(state: GameState, entry: Omit<HistoryEntry, 'seq'>): void {
  state.seq += 1;
  state.history.push({ seq: state.seq, ...entry });
  if (state.history.length > 200) state.history.splice(0, state.history.length - 200);
}

export function topCard(state: GameState): Card {
  return state.discard[state.discard.length - 1];
}

export function currentPlayerId(state: GameState): string {
  return state.players[state.currentIndex].id;
}

function indexOfPlayer(state: GameState, playerId: string): number {
  return state.players.findIndex((p) => p.id === playerId);
}

function step(state: GameState, from: number, steps = 1): number {
  const n = state.players.length;
  return (((from + state.direction * steps) % n) + n) % n;
}

/* ------------------------------------------------------------------ creation */

/** A card that can safely start the discard pile: not special, so no effect is "pending" at the start. */
function isOrdinary(card: Card, rules: RuleConfig): boolean {
  return !isSpecialCard(card, rules);
}

export function createGame(
  playerIds: readonly string[],
  rules: RuleConfig,
  options: { rng?: Rng; startIndex?: number; deck?: Card[] } = {},
): GameState {
  const rng = options.rng ?? secureRandomInt;
  if (playerIds.length < 2 || playerIds.length > 4) throw new Error('Whot needs 2 to 4 players.');
  if (new Set(playerIds).size !== playerIds.length) throw new Error('Duplicate player ids.');

  const market = options.deck ? options.deck.slice() : shuffle(buildDeck(), rng);
  const players = playerIds.map((id) => ({ id, hand: [] as Card[] }));

  if (market.length < playerIds.length * rules.cardsPerPlayer + 2) throw new Error('Deck too small for this deal.');

  for (let round = 0; round < rules.cardsPerPlayer; round++) {
    for (const p of players) p.hand.push(market.pop() as Card);
  }

  // First call card: the first ordinary card from the top. Special cards we skip stay in the market.
  let startIdx = -1;
  for (let i = market.length - 1; i >= 0; i--) {
    if (isOrdinary(market[i], rules)) {
      startIdx = i;
      break;
    }
  }
  if (startIdx === -1) throw new Error('No ordinary card available to start.');
  const [first] = market.splice(startIdx, 1);

  const state: GameState = {
    rules: { ...rules },
    players,
    market,
    discard: [first],
    currentIndex: ((options.startIndex ?? 0) % players.length + players.length) % players.length,
    direction: 1,
    calledShape: null,
    penalty: null,
    status: 'playing',
    result: null,
    history: [],
    seq: 0,
    version: 0,
    stalledPasses: 0,
  };
  log(state, { type: 'start', card: first });
  return state;
}

/* ------------------------------------------------------------------ legality */

/** Returns null when `card` may be played by the current player, otherwise a human-readable reason. */
export function playError(state: GameState, playerId: string, card: Card): string | null {
  if (state.status !== 'playing') return 'The game is over.';
  if (currentPlayerId(state) !== playerId) return 'It is not your turn.';
  const player = state.players[state.currentIndex];
  const { rules } = state;

  if (player.hand.length === 1 && !rules.finishOnSpecial && isSpecialCard(card, rules)) {
    return 'You cannot finish with a special card.';
  }

  if (state.penalty) {
    if (!rules.defence) return `You must pick ${state.penalty.pending} card${state.penalty.pending === 1 ? '' : 's'}.`;
    if (!canCounter(card, state.penalty, rules)) {
      return `Defend with a permitted penalty card, or pick ${state.penalty.pending}.`;
    }
    return null;
  }

  if (card.shape === 'whot') return null;
  if (state.calledShape) return card.shape === state.calledShape ? null : `Play a ${state.calledShape} or a Whot card.`;
  const top = topCard(state);
  if (card.shape === top.shape || card.number === top.number) return null;
  return 'That card matches neither the shape nor the number.';
}

export function playableCards(state: GameState, playerId: string): Card[] {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || state.status !== 'playing' || currentPlayerId(state) !== playerId) return [];
  return player.hand.filter((c) => playError(state, playerId, c) === null);
}

/* ------------------------------------------------------------------ drawing */

function reshuffleIfNeeded(state: GameState, rng: Rng): void {
  if (state.rules.mode !== 'rollover') return;
  if (state.market.length > 0 || state.discard.length <= 1) return;
  const top = state.discard.pop() as Card;
  state.market = shuffle(state.discard, rng);
  state.discard = [top];
  log(state, { type: 'reshuffle', count: state.market.length });
}

/** Draw up to `n` cards into a player's hand. Returns how many were drawn. */
function drawInto(state: GameState, playerIdx: number, n: number, rng: Rng): number {
  let drawn = 0;
  for (let i = 0; i < n; i++) {
    if (state.market.length === 0) reshuffleIfNeeded(state, rng);
    const c = state.market.pop();
    if (!c) break;
    state.players[playerIdx].hand.push(c);
    drawn++;
  }
  return drawn;
}

/* ------------------------------------------------------------------ results */

/**
 * Rank players by the SUM OF CARD VALUES left in their hand (lowest first). Ties share a rank.
 * This is computed here, from authoritative server state, never from anything a client sends.
 */
function buildRanking(state: GameState): PlayerResult[] {
  const rows = state.players.map((p) => ({
    playerId: p.id,
    hand: p.hand.map((card) => ({ card: { ...card }, value: pointValue(card, state.rules) })),
    cards: p.hand.length,
    points: handTotal(p.hand, state.rules),
  }));
  rows.sort((a, b) => a.points - b.points);
  let rank = 0;
  let prev: number | null = null;
  return rows.map((r, i) => {
    if (prev === null || r.points !== prev) rank = i + 1;
    prev = r.points;
    return { ...r, rank, winner: false };
  });
}

function finish(state: GameState, reason: EndReason, winnerIds: string[], explanation: string, ranking: PlayerResult[]): void {
  for (const r of ranking) r.winner = winnerIds.includes(r.playerId);
  const result: GameResult = { mode: state.rules.mode, reason, winnerIds, ranking, explanation };
  state.status = 'finished';
  state.result = result;
  state.penalty = null;
  log(state, { type: 'end', note: reason });
}

/** Lowest total wins; everyone tied on the lowest total shares the win. */
function lowestWinners(ranking: PlayerResult[]): string[] {
  const best = ranking[0].points;
  return ranking.filter((r) => r.points === best).map((r) => r.playerId);
}

function finishByEmptyHand(state: GameState, winnerId: string): void {
  finish(
    state,
    'out-of-cards',
    [winnerId],
    'A player played their last card, scoring 0. Everyone else scores the total of the values of the cards still in their hand. Lowest total wins.',
    buildRanking(state),
  );
}

function finishCount(state: GameState, reason: EndReason): void {
  const ranking = buildRanking(state);
  const winnerIds = lowestWinners(ranking);
  const why = reason === 'market-exhausted' ? 'The market ran out. ' : reason === 'stalemate' ? 'Nobody could draw any more cards. ' : '';
  finish(
    state,
    reason,
    winnerIds,
    `${why}Each player adds up the values of the cards in their hand (Whot = 20). The lowest total wins.` + (winnerIds.length > 1 ? ' Tied players share the win.' : ''),
    ranking,
  );
}

/** After any draw: end Count games when the market is exhausted. */
function checkCountEnd(state: GameState): void {
  if (state.status === 'playing' && state.rules.mode === 'count' && state.market.length === 0) {
    finishCount(state, 'market-exhausted');
  }
}

/* ------------------------------------------------------------------ actions */

export interface PlayOptions {
  calledShape?: RealShape;
  reverse?: boolean;
}

export function applyPlay(prev: GameState, playerId: string, cardId: string, opts: PlayOptions = {}, rng: Rng = secureRandomInt): EngineResult {
  if (prev.status !== 'playing') return { ok: false, error: 'The game is over.' };
  if (currentPlayerId(prev) !== playerId) return { ok: false, error: 'It is not your turn.' };
  const card = prev.players[prev.currentIndex].hand.find((c) => c.id === cardId);
  if (!card) return { ok: false, error: 'You do not hold that card.' };
  const err = playError(prev, playerId, card);
  if (err) return { ok: false, error: err };
  if (card.shape === 'whot' && !(opts.calledShape && (SHAPES as readonly string[]).includes(opts.calledShape))) {
    return { ok: false, error: 'Choose a shape for your Whot card.' };
  }

  const state = clone(prev);
  const me = state.players[state.currentIndex];
  const meIdx = state.currentIndex;
  const rules = state.rules;
  const wasCounter = state.penalty !== null;

  me.hand = me.hand.filter((c) => c.id !== cardId);
  state.discard.push(card);
  state.calledShape = card.shape === 'whot' ? (opts.calledShape as RealShape) : null;
  state.stalledPasses = 0;
  state.version += 1;

  const kind = cardPenaltyKind(card);
  const reversing = Boolean(rules.directionChange && opts.reverse && kind);
  log(state, {
    type: 'play',
    playerId,
    card,
    calledShape: state.calledShape ?? undefined,
    reversed: reversing || undefined,
  });

  // Going out ends the game immediately; the card's effect no longer matters.
  if (me.hand.length === 0) {
    finishByEmptyHand(state, playerId);
    return { ok: true, state };
  }

  if (kind) {
    const amount = penaltyAmount(kind, rules);
    const pending = wasCounter && rules.stacking && state.penalty ? state.penalty.pending + amount : amount;
    state.penalty = { kind, pending, sourceId: playerId };
    if (reversing) state.direction = state.direction === 1 ? -1 : 1;
    state.currentIndex = step(state, meIdx);
    return { ok: true, state };
  }

  state.penalty = null;

  if (card.shape !== 'whot' && card.number === 1) {
    // Hold On: everyone else is skipped, same player continues.
    return { ok: true, state };
  }

  if (card.shape !== 'whot' && card.number === 14) {
    const targets: string[] = [];
    let idx = meIdx;
    for (let i = 0; i < state.players.length - 1; i++) {
      idx = step(state, idx);
      if (state.market.length === 0) reshuffleIfNeeded(state, rng);
      if (state.market.length === 0) break;
      drawInto(state, idx, 1, rng);
      targets.push(state.players[idx].id);
    }
    log(state, { type: 'general-market', playerId, targetIds: targets, count: 1 });
    if (state.rules.mode === 'count') checkCountEnd(state);
    if (state.status === 'finished') return { ok: true, state };
    if (!rules.generalMarketPlaysAgain) state.currentIndex = step(state, meIdx);
    return { ok: true, state };
  }

  if (card.shape !== 'whot' && card.number === 8 && rules.suspension8) {
    const skipped = state.players[step(state, meIdx)].id;
    log(state, { type: 'skip', playerId, targetIds: [skipped] });
    state.currentIndex = step(state, meIdx, 2);
    return { ok: true, state };
  }

  state.currentIndex = step(state, meIdx);
  return { ok: true, state };
}

/** Draw action: resolves an active penalty if there is one, otherwise draws one card and ends the turn. */
export function applyDraw(prev: GameState, playerId: string, rng: Rng = secureRandomInt): EngineResult {
  if (prev.status !== 'playing') return { ok: false, error: 'The game is over.' };
  if (currentPlayerId(prev) !== playerId) return { ok: false, error: 'It is not your turn.' };

  const state = clone(prev);
  const idx = state.currentIndex;
  state.version += 1;

  if (state.penalty) {
    const owed = state.penalty.pending;
    const drawn = drawInto(state, idx, owed, rng);
    log(state, { type: 'penalty-draw', playerId, count: drawn, note: drawn < owed ? 'market-short' : undefined });
    state.penalty = null;
    state.stalledPasses = drawn === 0 ? state.stalledPasses + 1 : 0;
  } else {
    const drawn = drawInto(state, idx, 1, rng);
    log(state, { type: 'draw', playerId, count: drawn });
    state.stalledPasses = drawn === 0 ? state.stalledPasses + 1 : 0;
  }

  if (state.rules.mode === 'count') checkCountEnd(state);
  if (state.status === 'finished') return { ok: true, state };

  if (state.stalledPasses >= state.players.length) {
    // Rollover market and discard pile are both exhausted and nobody can move: end fairly.
    const ranking = buildRanking(state);
    finish(state, 'stalemate', lowestWinners(ranking), 'No cards were left to draw and nobody could play, so the lowest total of card values wins.', ranking);
    return { ok: true, state };
  }

  state.currentIndex = step(state, idx);
  return { ok: true, state };
}

/**
 * Remove a player mid-game (left or reconnect grace expired). Their cards go to the bottom of the market.
 * If only one player remains, that player wins by forfeit.
 */
export function removePlayer(prev: GameState, playerId: string): GameState {
  const idx = indexOfPlayer(prev, playerId);
  if (idx === -1 || prev.status !== 'playing') return prev;
  const state = clone(prev);
  const [removed] = state.players.splice(idx, 1);
  state.market.unshift(...removed.hand);
  state.version += 1;
  log(state, { type: 'forfeit', playerId });

  const n = state.players.length;
  if (n === 1) {
    finish(state, 'forfeit', [state.players[0].id], 'All other players left the game.', buildRanking(state));
    return state;
  }

  if (idx < state.currentIndex) {
    state.currentIndex -= 1;
  } else if (idx === state.currentIndex) {
    // The player to act left. The next player in the current direction now sits at `idx` (forward) or idx-1 (backward).
    state.currentIndex = state.direction === 1 ? idx % n : (idx - 1 + n) % n;
    if (state.penalty) state.penalty = null;
  }
  state.currentIndex = ((state.currentIndex % n) + n) % n;
  return state;
}
