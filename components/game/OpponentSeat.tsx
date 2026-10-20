import { Crown, WifiOff } from 'lucide-react';
import type { ReactionEvent } from '../../lib/socket/events.ts';
import { cn } from '../../lib/utils.ts';
import { PlayerAvatar } from './PlayerAvatar.tsx';
import { ReactionBubble } from './Reactions.tsx';
import { CardBack } from './WhotCard.tsx';

interface Props {
  name: string;
  handCount: number;
  active: boolean;
  connected: boolean;
  isHost: boolean;
  reaction?: ReactionEvent;
}

export function OpponentSeat({ name, handCount, active, connected, isHost, reaction }: Props) {
  const shown = Math.min(handCount, 6);
  return (
    <div
      className={cn('relative grid min-w-0 justify-items-center gap-1.5 rounded-2xl border border-white/10 bg-black/25 px-2.5 py-2 backdrop-blur-[1px] transition-colors', active && 'animate-pulse-ring border-gold bg-gold/10', !connected && 'opacity-55')}
      aria-label={`${name}, ${handCount} card${handCount === 1 ? '' : 's'}${active ? ', their turn' : ''}${connected ? '' : ', disconnected'}`}
    >
      <ReactionBubble reaction={reaction} />
      <div className="flex max-w-full items-center gap-2">
        <PlayerAvatar name={name} size="sm" />
        <span className="flex min-w-0 items-center gap-1 text-sm font-semibold">
          {isHost ? <Crown className="size-3.5 shrink-0 text-gold" aria-label="Host" /> : null}
          <span className="max-w-[9ch] truncate sm:max-w-[13ch]">{name}</span>
          {!connected ? <WifiOff className="size-3.5 shrink-0" aria-label="Disconnected" /> : null}
        </span>
      </div>
      <div className="flex" aria-hidden="true">
        {Array.from({ length: shown }, (_, i) => (
          <CardBack key={i} size="xs" className={i ? '-ml-4' : ''} />
        ))}
      </div>
      <span className="rounded-full bg-black/40 px-2 py-0.5 text-xs font-medium text-white/80">{handCount} card{handCount === 1 ? '' : 's'}</span>
    </div>
  );
}
