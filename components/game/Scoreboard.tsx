import { Crown } from 'lucide-react';
import type { RoomView } from '../../lib/socket/events.ts';
import { cn } from '../../lib/utils.ts';
import { PlayerAvatar } from './PlayerAvatar.tsx';

/**
 * Cumulative standings. Every round each player's remaining-card total is ADDED to their running total,
 * so lower is better both per round and overall. Rows arrive pre-sorted from the server.
 */
export function Scoreboard({ room }: { room: RoomView }) {
  const name = (id: string) => room.names[id] ?? 'Former player';
  const rounds = room.rounds;
  if (room.scores.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No rounds finished yet. Scores appear here after the first round.</p>;
  }
  const leaderTotal = room.scores[0].total;
  return (
    <div className="grid gap-3">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Cumulative scoreboard. Lower totals are better.</caption>
          <thead>
            <tr className="text-xs text-muted-foreground uppercase">
              <th scope="col" className="w-8 px-1 py-2 text-left font-semibold">#</th>
              <th scope="col" className="py-2 text-left font-semibold">Player</th>
              {rounds.map((r) => (
                <th key={r.round} scope="col" className="px-2 py-2 text-right font-semibold">R{r.round}</th>
              ))}
              <th scope="col" className="px-2 py-2 text-right font-semibold">Wins</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {room.scores.map((s, i) => {
              const leading = s.total === leaderTotal;
              return (
                <tr key={s.playerId} className={cn('border-t', leading && 'bg-gold/10')}>
                  <td className="px-1 py-2.5 font-bold tabular-nums">{i + 1}</td>
                  <td className="py-2.5">
                    <span className="flex items-center gap-2 font-semibold">
                      <PlayerAvatar name={name(s.playerId)} size="sm" />
                      <span className="max-w-[11ch] truncate sm:max-w-[16ch]">{name(s.playerId)}</span>
                      {s.playerId === room.youId ? <span className="text-xs font-normal text-muted-foreground">(you)</span> : null}
                      {leading ? <Crown className="size-3.5 text-gold" aria-label="Leading" /> : null}
                    </span>
                  </td>
                  {rounds.map((r) => {
                    const res = r.results.find((x) => x.playerId === s.playerId);
                    return (
                      <td key={r.round} className={cn('px-2 py-2.5 text-right tabular-nums', res?.winner && 'font-bold text-gold')}>
                        {res ? res.points : '–'}
                      </td>
                    );
                  })}
                  <td className="px-2 py-2.5 text-right tabular-nums">{s.wins}</td>
                  <td className="px-2 py-2.5 text-right text-base font-extrabold tabular-nums">{s.total}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">Each round adds the values of the cards left in your hand (the player who goes out adds 0). <b className="text-foreground">Lowest total is best.</b> Gold = round winner.</p>
    </div>
  );
}
