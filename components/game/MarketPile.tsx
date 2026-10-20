import { cn } from '../../lib/utils.ts';
import { CardBack } from './WhotCard.tsx';

/** Layers drawn for a pile of `count` cards: 1 per card up to a cap, so the visual depth tracks the real count. */
export function stackLayers(count: number, cap = 5): number {
  return Math.max(0, Math.min(count, cap));
}

interface Props {
  count: number;
  canDraw: boolean;
  /** Cards owed when a penalty is active; the stack then says "Pick N". */
  penaltyPending: number | null;
  busy: boolean;
  /** Changes whenever the market count changes, to replay the little "card taken" bump. */
  bumpKey: number;
  onDraw: () => void;
}

/**
 * The market: ONE compact stack of face-down cards (never spread out). Depth is shown with small offsets and shadows,
 * one layer per card up to five. The whole stack is the draw target.
 */
export function MarketPile({ count, canDraw, penaltyPending, busy, bumpKey, onDraw }: Props) {
  const layers = stackLayers(count);
  const active = canDraw && !busy && count > 0;
  const caption = penaltyPending ? `Pick ${penaltyPending}` : canDraw ? 'Draw' : 'Market';
  return (
    <div className="grid justify-items-center gap-2">
      <button
        type="button"
        onClick={onDraw}
        disabled={!active}
        aria-label={penaltyPending ? `Pick ${penaltyPending} cards from the market (${count} left)` : `Draw one card from the market (${count} left)`}
        className={cn('relative rounded-[10px] outline-none transition-transform focus-visible:ring-[3px] focus-visible:ring-ring disabled:cursor-default', active && 'hover:-translate-y-1 active:translate-y-0')}
        style={{ width: 'var(--top-w, 108px)', aspectRatio: '5 / 7.3' }}
      >
        <span key={bumpKey} className="absolute inset-0 block animate-bump" aria-hidden="true">
          {layers === 0 ? <span className="absolute inset-0 block rounded-[10px] border-2 border-dashed border-white/25" /> : null}
          {Array.from({ length: layers }, (_, i) => {
            const depth = layers - 1 - i; // 0 = top of the stack
            return (
              <span key={i} className="absolute inset-0 block" style={{ transform: `translate(${depth * -2.5}px, ${depth * 2.5}px)`, filter: `brightness(${1 - depth * 0.07})` }}>
                <CardBack size="lg" className="!w-full" label="Market card" />
              </span>
            );
          })}
        </span>
        {active ? <span className="pointer-events-none absolute -inset-1.5 animate-pulse-ring rounded-[14px] ring-2 ring-gold/80" aria-hidden="true" /> : null}
      </button>
      <p className="text-xs font-semibold text-white/80" aria-live="polite">
        <span className={cn(penaltyPending ? 'text-gold' : '')}>{caption}</span> · {count}
      </p>
    </div>
  );
}
