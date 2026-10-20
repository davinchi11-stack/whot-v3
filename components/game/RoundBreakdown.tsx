import { Crown } from 'lucide-react';
import type { GameResult } from '../../lib/game/types.ts';
import { cn } from '../../lib/utils.ts';
import { Badge } from '../ui/badge.tsx';
import { PlayerAvatar } from './PlayerAvatar.tsx';
import { ShapeIcon } from './ShapeIcon.tsx';

/** One round's count: each player's remaining cards with individual values, and the total. Lowest total wins. */
export function RoundBreakdown({ result, names, youId }: { result: GameResult; names: Record<string, string>; youId: string }) {
  const name = (id: string) => names[id] ?? 'Former player';
  return (
    <ol className="grid gap-2.5" aria-label="Round result, lowest total first">
      {result.ranking.map((r) => (
        <li key={r.playerId} className={cn('rounded-xl border bg-black/20 p-3', r.winner && 'border-gold/70 bg-gold/10 ring-1 ring-gold/40')}>
          <div className="flex items-center gap-2.5">
            <span className="w-5 text-center text-sm font-black tabular-nums text-muted-foreground">{r.rank}</span>
            <PlayerAvatar name={name(r.playerId)} size="sm" />
            <span className="min-w-0 flex-1 truncate text-sm font-bold">
              {name(r.playerId)}{r.playerId === youId ? ' (you)' : ''}
            </span>
            {r.winner ? (
              <Badge variant="gold">
                <Crown aria-hidden="true" /> Lowest
              </Badge>
            ) : null}
            <span className="min-w-12 text-right text-lg font-extrabold tabular-nums" aria-label={`${r.points} points`}>
              {r.points}
              <span className="ml-0.5 text-xs font-semibold text-muted-foreground">pts</span>
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-7">
            {r.hand.length === 0 ? (
              <span className="text-xs font-medium text-muted-foreground">Went out — no cards left</span>
            ) : (
              r.hand.map((h, i) => (
                <span key={`${h.card.id}-${i}`} className="inline-flex items-center gap-1 rounded-md border border-maroon-deep/60 bg-cream px-1.5 py-0.5 text-xs font-extrabold text-maroon" aria-label={`${h.card.shape} ${h.card.number}, worth ${h.value}`}>
                  <ShapeIcon shape={h.card.shape} size={11} />
                  {h.value}
                </span>
              ))
            )}
            {r.hand.length > 1 ? <span className="ml-1 text-xs text-muted-foreground">= {r.hand.map((h) => h.value).join(' + ')}</span> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
