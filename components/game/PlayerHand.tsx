import { useEffect, useRef } from 'react';
import type { Card, RuleConfig } from '../../lib/game/types.ts';
import { WhotCard } from './WhotCard.tsx';

interface Props {
  hand: Card[];
  playableIds: string[];
  myTurn: boolean;
  rules: RuleConfig;
  onCard: (card: Card) => void;
}

/** Scrollable overlapping hand. Newly drawn cards animate in from the market; playable cards lift and glow. */
export function PlayerHand({ hand, playableIds, myTurn, rules, onCard }: Props) {
  const playable = new Set(playableIds);
  const previous = useRef<Set<string> | null>(null);
  const fresh = new Set<string>();
  if (previous.current) for (const c of hand) if (!previous.current.has(c.id)) fresh.add(c.id);
  useEffect(() => {
    previous.current = new Set(hand.map((c) => c.id));
  });

  return (
    <div className="snap-x snap-proximity overflow-x-auto overflow-y-visible px-2 pt-7 pb-3 [-webkit-overflow-scrolling:touch]" role="group" aria-label={`Your hand, ${hand.length} cards`}>
      <div className="hand-row flex w-max min-w-full justify-center px-3 max-sm:justify-start">
        {hand.map((card) => {
          const can = myTurn && playable.has(card.id);
          return <WhotCard key={card.id} card={card} rules={rules} size="md" playable={can} disabled={myTurn && !can} onClick={() => onCard(card)} className={fresh.has(card.id) ? 'animate-draw-in' : undefined} />;
        })}
      </div>
    </div>
  );
}
