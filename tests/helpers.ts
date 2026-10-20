import type { Card, GameState, RealShape, RuleConfig, Shape } from '../lib/game/types.ts';
import { DEFAULT_RULES } from '../lib/game/rules.ts';
import { createGame } from '../lib/game/engine.ts';

export const c = (shape: Shape, number: number): Card => ({
  id: shape === 'whot' ? `whot-${number}` : `${shape}-${number}`,
  shape,
  number,
});
export const whot = (n = 1): Card => ({ id: `whot-${n}`, shape: 'whot', number: 20 });

export function rules(over: Partial<RuleConfig> = {}): RuleConfig {
  return { ...DEFAULT_RULES, ...over };
}

/** Deterministic rng: a simple LCG. */
export function seeded(seed = 1): (max: number) => number {
  let s = seed >>> 0;
  return (max) => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s % max;
  };
}

/** Build a game then overwrite hands, top card, market and turn for scripted scenarios. */
export function scenario(opts: {
  players?: string[];
  hands: Card[][];
  top: Card;
  calledShape?: RealShape | null;
  market?: Card[];
  current?: number;
  rules?: Partial<RuleConfig>;
}): GameState {
  const ids = opts.players ?? opts.hands.map((_, i) => `p${i + 1}`);
  const state = createGame(ids, rules(opts.rules), { rng: seeded(7) });
  state.players.forEach((p, i) => (p.hand = opts.hands[i].map((x) => ({ ...x }))));
  state.discard = [opts.top];
  state.calledShape = opts.calledShape ?? null;
  state.market = (opts.market ?? Array.from({ length: 20 }, (_, i) => c('square', 100 + i))).map((x) => ({ ...x }));
  state.currentIndex = opts.current ?? 0;
  return state;
}

export function must<T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> {
  if (!r.ok) throw new Error('expected ok but got: ' + JSON.stringify(r));
  return r as Extract<T, { ok: true }>;
}
