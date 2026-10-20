import { SHAPES } from '../lib/game/types.ts';
import type { RealShape } from '../lib/game/types.ts';

const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;

export function cleanNickname(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const s = input.replace(CONTROL_CHARS, '').replace(/\s+/g, ' ').trim();
  if (s.length < 1 || s.length > 16) return null;
  return s;
}

export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 5;

export function normalizeCode(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const s = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (s.length !== CODE_LENGTH) return null;
  for (const ch of s) if (!CODE_ALPHABET.includes(ch)) return null;
  return s;
}

export function isShape(x: unknown): x is RealShape {
  return typeof x === 'string' && (SHAPES as readonly string[]).includes(x);
}

export function isShortString(x: unknown, max = 64): x is string {
  return typeof x === 'string' && x.length > 0 && x.length <= max;
}

export function isMaxPlayers(x: unknown): x is 2 | 3 | 4 {
  return x === 2 || x === 3 || x === 4;
}

/** Browser Origin check for Socket.IO. Empty allow-list = same-origin deployment, so no restriction is applied. */
export function originAllowed(allowed: readonly string[], origin: string | undefined): boolean {
  if (allowed.length === 0) return true;
  if (!origin) return false;
  const norm = (o: string) => o.replace(/\/+$/, '').toLowerCase();
  return allowed.some((a) => norm(a) === norm(origin));
}
