import { ShieldCheck, TriangleAlert } from 'lucide-react';
import type { PenaltyKindState, RuleConfig } from '../../lib/game/types.ts';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert.tsx';
import { Button } from '../ui/button.tsx';

export function penaltyLabel(p: PenaltyKindState, rules: RuleConfig): string {
  // The label reflects the pending total (stacking included), not just the last card played.
  return `PICK ${p.pending}`;
}

interface Props {
  penalty: PenaltyKindState;
  rules: RuleConfig;
  targetName: string;
  mine: boolean;
  /** True when the server says I hold at least one legal defence card right now. */
  canDefend: boolean;
  busy: boolean;
  onDefend: () => void;
  onPick: () => void;
}

/** Compact, state-driven alert. Everything shown here comes from the live penalty, never from the last card played. */
export function PenaltyAlert({ penalty, rules, targetName, mine, canDefend, busy, onDefend, onPick }: Props) {
  const label = penaltyLabel(penalty, rules);
  const stacked = penalty.pending > (penalty.kind === 'pick2' ? 2 : rules.fivePenalty);

  if (!mine) {
    return (
      <Alert variant="maroon" className="w-auto max-w-sm">
        <TriangleAlert aria-hidden="true" />
        <AlertTitle>{label}{stacked ? ' · stacked' : ''}</AlertTitle>
        <AlertDescription>{targetName} {rules.defence ? 'can defend or must pick' : 'must pick'} {penalty.pending}.</AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="maroon" className="w-auto max-w-sm gap-y-2 border-gold/60 shadow-xl shadow-black/40">
      <TriangleAlert aria-hidden="true" />
      <AlertTitle className="text-base">
        {label}{stacked ? ' · stacked' : ''}
      </AlertTitle>
      <AlertDescription>
        <span>
          {canDefend
            ? `Defend with a matching card, or pick ${penalty.pending}.`
            : rules.defence
              ? `You have no card that can defend. Pick ${penalty.pending}.`
              : `Defence is off. Pick ${penalty.pending}.`}
        </span>
        <span className="mt-1 flex flex-wrap gap-2">
          {canDefend ? (
            <Button variant="gold" size="sm" onClick={onDefend} disabled={busy} className="animate-pulse-ring">
              <ShieldCheck aria-hidden="true" /> DEFEND
            </Button>
          ) : null}
          <Button variant={canDefend ? 'secondary' : 'destructive'} size="sm" onClick={onPick} disabled={busy}>
            Pick {penalty.pending}
          </Button>
        </span>
      </AlertDescription>
    </Alert>
  );
}
