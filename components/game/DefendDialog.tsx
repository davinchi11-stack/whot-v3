import type { Card, RuleConfig } from '../../lib/game/types.ts';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog.tsx';
import { WhotCard } from './WhotCard.tsx';

/** Shown only when more than one card can defend; with a single option DEFEND plays it straight away. */
export function DefendDialog({ open, cards, rules, onPick, onClose }: { open: boolean; cards: Card[]; rules: RuleConfig; onPick: (c: Card) => void; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choose a defence</DialogTitle>
          <DialogDescription>Any of these cards can answer the penalty.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap justify-center gap-3 py-2">
          {cards.map((c) => (
            <WhotCard key={c.id} card={c} rules={rules} size="md" playable onClick={() => onPick(c)} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
