import { useEffect, useRef, useState } from 'react';
import { SmilePlus } from 'lucide-react';
import { REACTIONS, reactionEmoji, reactionLabel } from '../../lib/game/reactions.ts';
import type { ReactionEvent } from '../../lib/socket/events.ts';
import { Button } from '../ui/button.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover.tsx';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip.tsx';

/** Emoji picker (shadcn Popover). Players choose from a fixed set; the server only accepts these ids. */
export function ReactionPicker({ onReact, size = 'sm' }: { onReact: (id: string) => void; size?: 'sm' | 'default' }) {
  const [open, setOpen] = useState(false);
  const [cooling, setCooling] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const pick = (id: string) => {
    if (cooling) return;
    onReact(id);
    setOpen(false);
    setCooling(true);
    timer.current = setTimeout(() => setCooling(false), 1200);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="secondary" size={size} aria-label="Send an emoji reaction">
          <SmilePlus aria-hidden="true" /> <span className="hidden sm:inline">React</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="end">
        <div role="group" aria-label="Choose a reaction" className="grid grid-cols-4 gap-1">
          {REACTIONS.map((r) => (
            <Tooltip key={r.id}>
              <TooltipTrigger asChild>
                <button type="button" onClick={() => pick(r.id)} disabled={cooling} aria-label={r.label} className="grid size-11 place-items-center rounded-lg text-2xl transition-transform outline-none hover:scale-125 hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/60 disabled:opacity-40">
                  {r.emoji}
                </button>
              </TooltipTrigger>
              <TooltipContent>{r.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Floating emoji above a player's seat. Re-keyed per reaction so each one replays the animation. */
export function ReactionBubble({ reaction }: { reaction?: ReactionEvent }) {
  if (!reaction) return null;
  return (
    <span key={reaction.id} className="pointer-events-none absolute -top-3 left-1/2 z-20 animate-reaction text-4xl drop-shadow-lg select-none" aria-hidden="true">
      {reactionEmoji(reaction.reactionId)}
    </span>
  );
}

/** Screen-reader announcement of the latest reaction (the bubble itself is decorative). */
export function ReactionAnnouncer({ reaction, nameOf }: { reaction?: ReactionEvent; nameOf: (id: string) => string }) {
  return (
    <p className="sr-only" role="status" aria-live="polite">
      {reaction ? `${nameOf(reaction.playerId)} reacted: ${reactionLabel(reaction.reactionId)}` : ''}
    </p>
  );
}
