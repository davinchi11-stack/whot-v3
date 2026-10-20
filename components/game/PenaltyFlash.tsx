import { useEffect, useState } from 'react';
import type { PenaltyKindState, RuleConfig } from '../../lib/game/types.ts';
import { penaltyLabel } from './PenaltyAlert.tsx';

/**
 * Brief full-screen callout when a penalty starts or grows. Driven by the live penalty state (kind + pending total),
 * so a stacked Pick 2 + Pick 2 flashes "PICK 4", and it re-fires only when that state actually changes.
 */
export function PenaltyFlash({ penalty, rules, targetName, mine }: { penalty: PenaltyKindState | null; rules: RuleConfig; targetName: string; mine: boolean }) {
  const signature = penalty ? `${penalty.kind}:${penalty.pending}:${penalty.sourceId}` : '';
  const [shown, setShown] = useState<string | null>(null);

  useEffect(() => {
    if (!signature) {
      setShown(null);
      return;
    }
    setShown(signature);
    const t = setTimeout(() => setShown(null), 1900);
    return () => clearTimeout(t);
  }, [signature]);

  if (!penalty || !shown) return null;
  return (
    <div key={shown} className="pointer-events-none fixed top-[38%] left-1/2 z-40 animate-flash text-center" role="status" aria-live="assertive">
      <div className="rounded-3xl border-4 border-gold bg-maroon px-8 py-4 shadow-2xl shadow-black/60 sm:px-12 sm:py-6">
        <p className="text-4xl font-black tracking-tight text-cream sm:text-6xl">{penaltyLabel(penalty, rules)}</p>
        <p className="mt-1 text-sm font-semibold text-gold sm:text-base">{mine ? 'You' : targetName}</p>
      </div>
    </div>
  );
}
