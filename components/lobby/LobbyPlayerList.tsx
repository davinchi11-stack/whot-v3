import { Crown, UserX, WifiOff } from 'lucide-react';
import type { PublicSeat, ReactionEvent } from '../../lib/socket/events.ts';
import { PlayerAvatar } from '../game/PlayerAvatar.tsx';
import { ReactionBubble } from '../game/Reactions.tsx';
import { Badge } from '../ui/badge.tsx';
import { Button } from '../ui/button.tsx';

interface Props {
  seats: PublicSeat[];
  maxPlayers: number;
  youId: string;
  canKick: boolean;
  reactions: Record<string, ReactionEvent>;
  onKick: (id: string) => void;
}

export function LobbyPlayerList({ seats, maxPlayers, youId, canKick, reactions, onKick }: Props) {
  const empty = Math.max(0, maxPlayers - seats.length);
  return (
    <ul className="grid gap-2" aria-label="Players in the room">
      {seats.map((s) => (
        <li key={s.id} className={`relative flex items-center gap-3 rounded-xl border bg-black/20 px-3 py-2.5 ${s.connected ? '' : 'opacity-60'} animate-deal`}>
          <ReactionBubble reaction={reactions[s.id]} />
          <PlayerAvatar name={s.nickname} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate font-semibold">
              {s.nickname}
              {s.id === youId ? <span className="text-xs font-normal text-muted-foreground">(you)</span> : null}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {s.connected ? (
                <>
                  <span className="size-2 rounded-full bg-emerald-400" aria-hidden="true" /> Connected
                </>
              ) : (
                <>
                  <WifiOff className="size-3" aria-hidden="true" /> Disconnected
                </>
              )}
            </p>
          </div>
          {s.isHost ? (
            <Badge variant="gold">
              <Crown aria-hidden="true" /> Host
            </Badge>
          ) : null}
          {canKick && s.id !== youId ? (
            <Button variant="ghost" size="sm" onClick={() => onKick(s.id)} aria-label={`Remove ${s.nickname}`}>
              <UserX aria-hidden="true" /> <span className="hidden sm:inline">Remove</span>
            </Button>
          ) : null}
        </li>
      ))}
      {Array.from({ length: empty }, (_, i) => (
        <li key={`empty-${i}`} className="flex items-center gap-3 rounded-xl border border-dashed border-white/20 px-3 py-3 text-sm text-muted-foreground">
          <span className="grid size-12 place-items-center rounded-full border border-dashed border-white/20 text-lg" aria-hidden="true">
            +
          </span>
          Waiting for player…
        </li>
      ))}
    </ul>
  );
}
