import type { Card, CounterSet, PenaltyKind, PenaltyKindState, RuleConfig } from './types.ts';

export const DEFAULT_RULES: RuleConfig = {
  mode: 'rollover',
  cardsPerPlayer: 5,
  defence: true,
  stacking: true,
  pick2Counters: 'same-only',
  pick5Counters: 'same-only',
  fivePenalty: 3,
  suspension8: true,
  generalMarketPlaysAgain: true,
  directionChange: false,
  finishOnSpecial: true,
  starsCountDouble: false,
};

export function cardPenaltyKind(card: Card): PenaltyKind | null {
  if (card.shape === 'whot') return null;
  if (card.number === 2) return 'pick2';
  if (card.number === 5) return 'pick5';
  return null;
}

export function penaltyAmount(kind: PenaltyKind, rules: RuleConfig): number {
  return kind === 'pick2' ? 2 : rules.fivePenalty;
}

export function isSpecialCard(card: Card, rules: RuleConfig): boolean {
  if (card.shape === 'whot') return true;
  if (card.number === 1 || card.number === 2 || card.number === 5 || card.number === 14) return true;
  return card.number === 8 && rules.suspension8;
}

/** May `card` be played to answer `penalty` under these rules? (Does not check turn or hand.) */
export function canCounter(card: Card, penalty: PenaltyKindState, rules: RuleConfig): boolean {
  if (!rules.defence) return false;
  const kind = cardPenaltyKind(card);
  if (!kind) return false;
  if (kind === penalty.kind) return true;
  const set: CounterSet = kind === 'pick2' ? rules.pick2Counters : rules.pick5Counters;
  return set === 'any-penalty';
}

/** Scoring value of one card: its printed number (Whot = 20). Stars double only if the room enables it. */
export function pointValue(card: Card, rules: Pick<RuleConfig, 'starsCountDouble'>): number {
  if (card.shape === 'whot') return 20;
  return card.shape === 'star' && rules.starsCountDouble ? card.number * 2 : card.number;
}

/** Total of the values of the cards in a hand. */
export function handTotal(hand: readonly Card[], rules: Pick<RuleConfig, 'starsCountDouble'>): number {
  return hand.reduce((sum, c) => sum + pointValue(c, rules), 0);
}

type Check<T> = { ok: true; value: T } | { ok: false; error: string };

/** Validate untrusted rule input (e.g. from a socket). Missing fields fall back to defaults. */
export function normalizeRules(input: unknown): { ok: true; rules: RuleConfig } | { ok: false; error: string } {
  if (input === undefined || input === null) return { ok: true, rules: { ...DEFAULT_RULES } };
  if (typeof input !== 'object' || Array.isArray(input)) return { ok: false, error: 'Rules must be an object.' };
  const src = input as Record<string, unknown>;
  const out: RuleConfig = { ...DEFAULT_RULES };

  const oneOf = <T extends string | number>(key: string, allowed: readonly T[]): Check<T> | null => {
    if (!(key in src) || src[key] === undefined) return null;
    const v = src[key];
    return (allowed as readonly unknown[]).includes(v)
      ? { ok: true, value: v as T }
      : { ok: false, error: `Invalid value for ${key}.` };
  };
  const bool = (key: string): Check<boolean> | null => {
    if (!(key in src) || src[key] === undefined) return null;
    return typeof src[key] === 'boolean' ? { ok: true, value: src[key] as boolean } : { ok: false, error: `Invalid value for ${key}.` };
  };

  const checks: Array<[keyof RuleConfig, Check<any> | null]> = [
    ['mode', oneOf('mode', ['rollover', 'count'] as const)],
    ['cardsPerPlayer', oneOf('cardsPerPlayer', [3, 4, 5, 6, 7] as const)],
    ['defence', bool('defence')],
    ['stacking', bool('stacking')],
    ['pick2Counters', oneOf('pick2Counters', ['same-only', 'any-penalty'] as const)],
    ['pick5Counters', oneOf('pick5Counters', ['same-only', 'any-penalty'] as const)],
    ['fivePenalty', oneOf('fivePenalty', [3, 5] as const)],
    ['suspension8', bool('suspension8')],
    ['generalMarketPlaysAgain', bool('generalMarketPlaysAgain')],
    ['directionChange', bool('directionChange')],
    ['finishOnSpecial', bool('finishOnSpecial')],
    ['starsCountDouble', bool('starsCountDouble')],
  ];
  for (const [key, res] of checks) {
    if (!res) continue;
    if (!res.ok) return { ok: false, error: res.error };
    (out as unknown as Record<string, unknown>)[key] = res.value;
  }
  return { ok: true, rules: out };
}

export function describeRules(rules: RuleConfig): string[] {
  const lines: string[] = [];
  lines.push(
    rules.mode === 'rollover'
      ? 'Rollover: the round ends when someone plays their last card.'
      : 'Count: the round ends when someone plays their last card or the market runs out. Add up the values of the cards you hold — the lowest total wins.',
  );
  if (rules.mode === 'rollover') lines.push('Cards left in hand are added to your score — lowest overall is best.');
  lines.push(`${rules.cardsPerPlayer} cards each at the start.`);
  if (!rules.defence) lines.push('No defence: Pick cards must be drawn.');
  else if (rules.stacking) lines.push('Defence on, penalties stack.');
  else lines.push('Defence on, a counter passes the penalty on without stacking.');
  if (rules.defence) {
    if (rules.pick2Counters === 'any-penalty') lines.push('A 2 can answer a 5 penalty.');
    if (rules.pick5Counters === 'any-penalty') lines.push('A 5 can answer a 2 penalty.');
  }
  lines.push(`The 5-card makes the next player pick ${rules.fivePenalty}.`);
  if (rules.suspension8) lines.push('8 suspends the next player.');
  if (rules.starsCountDouble) lines.push('Stars count double when scoring.');
  if (!rules.finishOnSpecial) lines.push('You cannot finish on a special card.');
  if (rules.directionChange) lines.push('Pick cards may reverse direction.');
  return lines;
}
