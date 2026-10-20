import { RotateCcw, RotateCw } from 'lucide-react';
import { Badge } from '../ui/badge.tsx';

export function TurnIndicator({ name, mine, direction }: { name: string; mine: boolean; direction: 1 | -1 }) {
  return (
    <Badge key={`${name}-${mine}`} variant={mine ? 'gold' : 'secondary'} className="h-8 animate-turn gap-2 px-3.5 text-sm font-bold" role="status" aria-live="polite">
      {mine ? 'Your turn' : `${name}’s turn`}
      {direction === 1 ? <RotateCw aria-label="Clockwise" /> : <RotateCcw aria-label="Anticlockwise" />}
    </Badge>
  );
}
