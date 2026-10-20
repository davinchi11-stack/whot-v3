import type { Card, RealShape, RuleConfig } from '../../lib/game/types.ts';
import { Badge } from '../ui/badge.tsx';
import { SHAPE_NAMES, ShapeIcon } from './ShapeIcon.tsx';
import { stackLayers } from './MarketPile.tsx';
import { CardEdge, WhotCard } from './WhotCard.tsx';

/** Played pile: the top card face-up, with a few card edges beneath it. Re-keyed per card so each play animates in. */
export function DiscardPile({ top, count, calledShape, rules }: { top: Card; count: number; calledShape: RealShape | null; rules: RuleConfig }) {
  const edges = Math.max(0, stackLayers(count, 4) - 1);
  return (
    <div className="grid justify-items-center gap-2">
      <div className="relative" style={{ width: 'var(--top-w, 108px)', aspectRatio: '5 / 7.3' }}>
        {Array.from({ length: edges }, (_, i) => (
          <CardEdge key={i} size="lg" className="!absolute !w-full" style={{ transform: `translate(${(i + 1) * 2.5}px, ${(i + 1) * 2.5}px) rotate(${(i % 2 ? 1 : -1) * (i + 1) * 1.5}deg)` }} />
        ))}
        <WhotCard key={top.id} card={top} rules={rules} size="lg" className="animate-play !absolute !w-full" />
      </div>
      {calledShape ? (
        <Badge variant="gold" role="status" className="h-7 text-sm">
          <ShapeIcon shape={calledShape} size={14} /> {SHAPE_NAMES[calledShape]}
        </Badge>
      ) : (
        <p className="text-xs font-semibold text-white/80">Played · {count}</p>
      )}
    </div>
  );
}
