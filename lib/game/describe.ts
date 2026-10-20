import type { Card, HistoryEntry, RuleConfig } from './types.ts';

export const SHAPE_LABEL: Record<string, string> = {
  circle: 'Circle',
  triangle: 'Triangle',
  cross: 'Cross',
  square: 'Square',
  star: 'Star',
  whot: 'Whot',
};

export function cardName(card: Card): string {
  return card.shape === 'whot' ? 'Whot 20' : `${SHAPE_LABEL[card.shape]} ${card.number}`;
}

/** Human-readable line for the activity log. `name` maps a player id to a display name. */
export function describeEntry(e: HistoryEntry, name: (id: string) => string, rules: RuleConfig): string {
  const who = e.playerId ? name(e.playerId) : '';
  switch (e.type) {
    case 'start':
      return `Game started with ${e.card ? cardName(e.card) : 'a card'} on the table.`;
    case 'play': {
      let s = `${who} played ${e.card ? cardName(e.card) : 'a card'}`;
      if (e.card?.shape === 'whot' && e.calledShape) s += ` and called ${SHAPE_LABEL[e.calledShape]}`;
      if (e.card && e.card.shape !== 'whot') {
        if (e.card.number === 2) s += ' (Pick 2)';
        if (e.card.number === 5) s += ` (Pick ${rules.fivePenalty})`;
        if (e.card.number === 1) s += ' (Hold on)';
        if (e.card.number === 14) s += ' (General market)';
        if (e.card.number === 8 && rules.suspension8) s += ' (Suspension)';
      }
      if (e.reversed) s += ' and reversed direction';
      return s + '.';
    }
    case 'draw':
      return e.count ? `${who} drew a card.` : `${who} had nothing to draw.`;
    case 'penalty-draw':
      return `${who} picked ${e.count ?? 0} card${e.count === 1 ? '' : 's'}${e.note === 'market-short' ? ' (market ran short)' : ''}.`;
    case 'general-market':
      return `General market! Everyone else drew ${e.count ?? 1}.`;
    case 'skip':
      return `${e.targetIds && e.targetIds[0] ? name(e.targetIds[0]) : 'The next player'} was suspended.`;
    case 'reshuffle':
      return `Market empty: discard pile reshuffled (${e.count} cards).`;
    case 'forfeit':
      return `${who} left the game.`;
    case 'end':
      return 'Game over.';
  }
}
