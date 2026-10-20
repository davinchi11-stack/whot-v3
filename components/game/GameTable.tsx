import { useState } from 'react';
import { BookOpen, Ellipsis, LogOut, Trophy } from 'lucide-react';
import type { Card, RealShape } from '../../lib/game/types.ts';
import type { Ack, ReactionEvent, RoomView } from '../../lib/socket/events.ts';
import type { ConnStatus } from '../../lib/socket/useWhot.ts';
import { cardPenaltyKind, handTotal } from '../../lib/game/rules.ts';
import { HowToPlayDialog } from '../HowToPlayDialog.tsx';
import { Badge } from '../ui/badge.tsx';
import { Button } from '../ui/button.tsx';
import { ConnectionBadge, ReconnectBanner } from '../ui/ConnectionBadge.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog.tsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu.tsx';
import { Label } from '../ui/label.tsx';
import { Switch } from '../ui/switch.tsx';
import { ActivityLog } from './ActivityLog.tsx';
import { DefendDialog } from './DefendDialog.tsx';
import { DiscardPile } from './DiscardPile.tsx';
import { MarketPile } from './MarketPile.tsx';
import { OpponentSeat } from './OpponentSeat.tsx';
import { PenaltyAlert } from './PenaltyAlert.tsx';
import { PenaltyFlash } from './PenaltyFlash.tsx';
import { PlayerAvatar } from './PlayerAvatar.tsx';
import { PlayerHand } from './PlayerHand.tsx';
import { ReactionAnnouncer, ReactionBubble, ReactionPicker } from './Reactions.tsx';
import { SHAPE_NAMES } from './ShapeIcon.tsx';
import { ScoreboardDialog } from './ScoreboardDialog.tsx';
import { ShapePicker } from './ShapePicker.tsx';
import { TurnIndicator } from './TurnIndicator.tsx';

interface Props {
  room: RoomView;
  status: ConnStatus;
  reactions: Record<string, ReactionEvent>;
  lastReaction?: ReactionEvent;
  onReact: (id: string) => void;
  onPlay: (cardId: string, version: number, extra: { calledShape?: RealShape; reverse?: boolean }) => Promise<Ack<any>>;
  onDraw: (version: number) => Promise<Ack<any>>;
  onLeave: () => void;
  onEndGame: () => void;
}

/** Opponents are placed clockwise from the local player: the next player sits on the left. */
export function opponentPositions(count: number): Array<'left' | 'top' | 'right'> {
  if (count <= 1) return ['top'];
  if (count === 2) return ['left', 'right'];
  return ['left', 'top', 'right'];
}

// Mobile: opponents share one row. Desktop (lg): the top seat spans above, sides flank the centre.
const SLOT: Record<'left' | 'top' | 'right', string> = {
  left: 'col-start-1 row-start-1 lg:row-start-2 lg:self-center',
  top: 'col-start-2 row-start-1 lg:col-span-3 lg:col-start-1 lg:justify-self-center',
  right: 'col-start-3 row-start-1 lg:row-start-2 lg:self-center',
};

export function GameTable({ room, status, reactions, lastReaction, onReact, onPlay, onDraw, onLeave, onEndGame }: Props) {
  const game = room.game!;
  const [busy, setBusy] = useState(false);
  const [wildCard, setWildCard] = useState<Card | null>(null);
  const [reverse, setReverse] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [scoresOpen, setScoresOpen] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);
  const [defendOpen, setDefendOpen] = useState(false);

  const nameOf = (id: string) => room.names[id] ?? 'Former player';
  const seatInfo = (id: string) => room.seats.find((s) => s.id === id);
  const myTurn = game.currentPlayerId === room.youId && game.status === 'playing';
  const isHost = room.hostId === room.youId;
  const rules = game.rules;

  const myIdx = game.seats.findIndex((s) => s.id === room.youId);
  const others = game.seats.map((_, i) => game.seats[(myIdx + 1 + i) % game.seats.length]).filter((s) => s.id !== room.youId);
  const positions = opponentPositions(others.length);

  // While a penalty is active the server only marks counter cards as playable, so those ARE the defence options.
  const defenceCards = game.penalty && myTurn ? game.you.hand.filter((c) => game.you.playableCardIds.includes(c.id)) : [];
  const canDefend = defenceCards.length > 0;

  const run = async (fn: () => Promise<Ack<any>>) => {
    if (busy) return;
    setBusy(true);
    const r = await fn();
    setBusy(false);
    setHint(r.ok ? null : r.error);
  };

  const explain = () =>
    game.penalty
      ? rules.defence
        ? `Defend with a permitted card, or pick ${game.penalty.pending}.`
        : `You must pick ${game.penalty.pending}.`
      : game.calledShape
        ? `Play a ${SHAPE_NAMES[game.calledShape].toLowerCase()} or a Whot card, or draw.`
        : 'That card matches neither the shape nor the number. Pick another or draw.';

  const handleCard = (card: Card) => {
    if (!myTurn) return setHint('Wait for your turn.');
    if (!game.you.playableCardIds.includes(card.id)) return setHint(explain());
    if (card.shape === 'whot') return setWildCard(card);
    void run(() => onPlay(card.id, game.version, { reverse: rules.directionChange && reverse && cardPenaltyKind(card) ? true : undefined }));
  };

  const startDefend = () => {
    if (defenceCards.length === 1) handleCard(defenceCards[0]);
    else setDefendOpen(true);
  };
  const draw = () => void run(() => onDraw(game.version));

  const defaultHint = myTurn ? (game.penalty ? '' : game.you.playableCardIds.length ? 'Play a glowing card, or draw.' : 'No playable card — draw.') : '';
  const myTotal = handTotal(game.you.hand, rules);
  const targetName = nameOf(game.currentPlayerId);

  return (
    <div className="flex min-h-dvh flex-col">
      <ReconnectBanner status={status} graceMs={room.graceMs} />
      <header className="flex flex-wrap items-center justify-between gap-2 px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 sm:px-5">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-8 px-3 text-sm">
            <b className="tracking-[0.18em] text-cream">{room.code}</b>
          </Badge>
          <Badge variant="secondary" className="hidden h-8 px-3 sm:inline-flex">
            Round {room.round} · {rules.mode === 'count' ? 'Count' : 'Rollover'}
          </Badge>
        </div>
        <TurnIndicator name={nameOf(game.currentPlayerId)} mine={myTurn} direction={game.direction} />
        <div className="flex items-center gap-2">
          <ReactionPicker onReact={onReact} />
          <span className="hidden md:block"><ConnectionBadge status={status} /></span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" aria-label="Game menu"><Ellipsis aria-hidden="true" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setScoresOpen(true)}><Trophy aria-hidden="true" /> Scoreboard</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setHowToOpen(true)}><BookOpen aria-hidden="true" /> How to play</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setExitOpen(true)}><LogOut aria-hidden="true" /> Leave game</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <ReactionAnnouncer reaction={lastReaction} nameOf={nameOf} />
      <PenaltyFlash penalty={game.penalty} rules={rules} targetName={targetName} mine={game.currentPlayerId === room.youId} />

      <div className="grid flex-1 gap-3 px-2 pb-3 sm:px-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="table-felt relative grid min-w-0 grid-cols-3 grid-rows-[auto_1fr_auto] gap-2 rounded-[1.75rem] border-[5px] border-[#0d2a1e] p-2 sm:rounded-[2.25rem] sm:border-[7px] sm:p-4" aria-label="Game table">
          {others.map((s, i) => {
            const info = seatInfo(s.id);
            return (
              <div key={s.id} className={`min-w-0 ${SLOT[positions[i]]}`}>
                <OpponentSeat name={nameOf(s.id)} handCount={s.handCount} active={game.currentPlayerId === s.id} connected={info?.connected ?? false} isHost={info?.isHost ?? false} reaction={reactions[s.id]} />
              </div>
            );
          })}

          <div className="col-span-3 row-start-2 grid content-center justify-items-center gap-3 py-2 lg:col-span-1 lg:col-start-2">
            {game.penalty ? (
              <PenaltyAlert penalty={game.penalty} rules={rules} targetName={targetName} mine={game.currentPlayerId === room.youId} canDefend={canDefend} busy={busy} onDefend={startDefend} onPick={draw} />
            ) : null}
            <div className="flex items-start justify-center gap-7 sm:gap-14">
              <MarketPile count={game.marketCount} canDraw={myTurn && game.you.canDraw && !game.penalty} penaltyPending={game.penalty && myTurn ? game.penalty.pending : null} busy={busy} bumpKey={game.marketCount} onDraw={draw} />
              <DiscardPile top={game.topCard} count={game.discardCount} calledShape={game.calledShape} rules={rules} />
            </div>
          </div>

          <div className="relative col-span-3 row-start-3 max-sm:sticky max-sm:bottom-0 max-sm:-mx-2 max-sm:-mb-2 max-sm:bg-gradient-to-t max-sm:from-[#0a2119] max-sm:via-[#0a2119]/90 max-sm:to-transparent max-sm:px-2 max-sm:pb-[env(safe-area-inset-bottom)]">
            <div className="relative flex flex-wrap items-center gap-x-3 gap-y-1 px-1.5 pt-1">
              <div className="relative flex items-center gap-2">
                <ReactionBubble reaction={reactions[room.youId]} />
                <PlayerAvatar name={nameOf(room.youId)} size="sm" />
                <span className="text-sm font-bold">You</span>
                <Badge variant="secondary" aria-label={`${game.you.hand.length} cards worth ${myTotal} points`}>
                  {game.you.hand.length} cards · {myTotal} pts
                </Badge>
              </div>
              {rules.directionChange ? (
                <div className="flex items-center gap-2">
                  <Switch id="rev" checked={reverse} onCheckedChange={setReverse} />
                  <Label htmlFor="rev" className="text-xs text-white/75">Reverse on Pick cards</Label>
                </div>
              ) : null}
              <p role="status" aria-live="polite" className={`ml-auto min-h-5 text-sm font-medium max-sm:ml-0 max-sm:w-full ${hint ? 'text-gold' : 'text-white/70'}`}>{hint ?? defaultHint}</p>
            </div>
            <PlayerHand hand={game.you.hand} playableIds={game.you.playableCardIds} myTurn={myTurn} rules={rules} onCard={handleCard} />
          </div>
        </section>

        <aside>
          <ActivityLog history={game.history} names={room.names} rules={rules} />
        </aside>
      </div>

      <ShapePicker
        open={wildCard !== null}
        onCancel={() => setWildCard(null)}
        onPick={(shape) => {
          const card = wildCard;
          setWildCard(null);
          if (card) void run(() => onPlay(card.id, game.version, { calledShape: shape }));
        }}
      />
      <DefendDialog open={defendOpen} cards={defenceCards} rules={rules} onClose={() => setDefendOpen(false)} onPick={(c) => { setDefendOpen(false); handleCard(c); }} />
      <ScoreboardDialog open={scoresOpen} room={room} onClose={() => setScoresOpen(false)} />
      <HowToPlayDialog open={howToOpen} onClose={() => setHowToOpen(false)} />

      <Dialog open={exitOpen} onOpenChange={setExitOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Leave this game?</DialogTitle>
            <DialogDescription>Leaving gives up your seat. Your cards go back to the market and the others keep playing.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExitOpen(false)}>Stay</Button>
            {isHost ? <Button variant="secondary" onClick={onEndGame}>End game for everyone</Button> : null}
            <Button variant="destructive" onClick={onLeave}>Leave game</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
