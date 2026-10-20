import type { Card, RealShape, Rng } from './types.ts';

/**
 * Traditional Nigerian Whot deck: 54 cards.
 *
 * VERIFIED against two independent sources (checked 2026-10-15):
 *   - Wikipedia "Whot!" (card table for the standard 54-card Whot deck)
 *   - Pagat.com "Whot!" (suit composition table; "five Whot cards ... 54-card pack ... still used in Nigeria")
 * Both list exactly these numbers per shape. Some sold packs differ (e.g. British packs have 4 Whot
 * cards = 53 cards), so the distribution lives here as plain data. Edit DECK_DISTRIBUTION / WHOT_COUNT
 * to change the deck; nothing else in the engine hard-codes it.
 */
export const DECK_DISTRIBUTION: Record<RealShape, readonly number[]> = {
  circle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14], // 12
  triangle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14], // 12
  cross: [1, 2, 3, 5, 7, 10, 11, 13, 14], // 9
  square: [1, 2, 3, 5, 7, 10, 11, 13, 14], // 9
  star: [1, 2, 3, 4, 5, 7, 8], // 7
};
export const WHOT_COUNT = 5; // five "20" cards
export const WHOT_NUMBER = 20;

export function buildDeck(
  distribution: Record<RealShape, readonly number[]> = DECK_DISTRIBUTION,
  whotCount: number = WHOT_COUNT,
): Card[] {
  const cards: Card[] = [];
  for (const shape of Object.keys(distribution) as RealShape[]) {
    for (const number of distribution[shape]) {
      cards.push({ id: `${shape}-${number}`, shape, number });
    }
  }
  for (let i = 1; i <= whotCount; i++) {
    cards.push({ id: `whot-${i}`, shape: 'whot', number: WHOT_NUMBER });
  }
  return cards;
}

/** Unbiased random integer in [0, max) using the platform CSPRNG (browser + Node 20+). */
export const secureRandomInt: Rng = (max) => {
  if (!Number.isInteger(max) || max <= 0) throw new Error('max must be a positive integer');
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  for (;;) {
    globalThis.crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
};

/** Fisher–Yates. Returns a new array. */
export function shuffle<T>(items: readonly T[], rng: Rng = secureRandomInt): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rng(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
