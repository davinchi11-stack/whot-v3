import type { HistoryEntry, RuleConfig } from '../../lib/game/types.ts';
import { describeEntry } from '../../lib/game/describe.ts';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card.tsx';

export function ActivityLog({ history, names, rules }: { history: HistoryEntry[]; names: Record<string, string>; rules: RuleConfig }) {
  const name = (id: string) => names[id] ?? 'Former player';
  return (
    <Card className="gap-3 py-4">
      <CardHeader>
        <CardTitle className="text-base">Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="grid max-h-60 gap-1.5 overflow-auto pr-1 text-sm text-muted-foreground lg:max-h-[55vh]" aria-live="polite" aria-label="Move history, newest first">
          {history.slice().reverse().map((e, i) => (
            <li key={e.seq} className={i === 0 ? 'font-medium text-foreground' : ''}>
              {describeEntry(e, name, rules)}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
