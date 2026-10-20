import { SHAPES } from '../../lib/game/types.ts';
import type { RealShape } from '../../lib/game/types.ts';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog.tsx';
import { SHAPE_NAMES, ShapeIcon } from './ShapeIcon.tsx';

export function ShapePicker({ open, onPick, onCancel }: { open: boolean; onPick: (s: RealShape) => void; onCancel: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Whot! Call a shape</DialogTitle>
          <DialogDescription>The next player must follow this shape, or play another Whot.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
          {SHAPES.map((s) => (
            <button key={s} type="button" onClick={() => onPick(s)} className="grid justify-items-center gap-1.5 rounded-xl border-2 border-maroon-deep bg-cream px-2 py-3.5 text-sm font-bold text-maroon outline-none transition-transform hover:-translate-y-0.5 hover:bg-white focus-visible:ring-[3px] focus-visible:ring-ring">
              <ShapeIcon shape={s} size={38} />
              {SHAPE_NAMES[s]}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
