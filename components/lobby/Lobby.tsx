import { useState } from 'react';
import { LogOut, Play } from 'lucide-react';
import type { RuleConfig } from '../../lib/game/types.ts';
import type { Ack, ReactionEvent, RoomView } from '../../lib/socket/events.ts';
import type { ConnStatus } from '../../lib/socket/useWhot.ts';
import { ReactionAnnouncer, ReactionPicker } from '../game/Reactions.tsx';
import { Alert, AlertDescription } from '../ui/alert.tsx';
import { Button } from '../ui/button.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card.tsx';
import { ConnectionBadge } from '../ui/ConnectionBadge.tsx';
import { GameSettings } from './GameSettings.tsx';
import { LobbyPlayerList } from './LobbyPlayerList.tsx';
import { RoomCode } from './RoomCode.tsx';

interface Props {
  room: RoomView;
  status: ConnStatus;
  reactions: Record<string, ReactionEvent>;
  lastReaction?: ReactionEvent;
  onReact: (id: string) => void;
  onUpdate: (p: { maxPlayers?: number; rules?: Partial<RuleConfig> }) => Promise<Ack<any>>;
  onKick: (id: string) => Promise<Ack<any>>;
  onStart: () => Promise<Ack<any>>;
  onLeave: () => void;
}

export function Lobby({ room, status, reactions, lastReaction, onReact, onUpdate, onKick, onStart, onLeave }: Props) {
  const isHost = room.hostId === room.youId;
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const ready = room.seats.length >= 2;
  const nameOf = (id: string) => room.names[id] ?? 'Someone';

  const track = async (p: Promise<Ack<any>>) => {
    const r = await p;
    setError(r.ok ? null : r.error);
    return r;
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:py-8">
      <header className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Game room</h1>
        <div className="flex items-center gap-2">
          <ReactionPicker onReact={onReact} />
          <ConnectionBadge status={status} />
        </div>
      </header>
      <ReactionAnnouncer reaction={lastReaction} nameOf={nameOf} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:items-start">
        <div className="grid gap-5">
          <RoomCode code={room.code} />
          <Card>
            <CardHeader>
              <CardTitle>
                Players ({room.seats.length}/{room.maxPlayers})
              </CardTitle>
              <CardDescription>{ready ? 'Ready when you are.' : 'Share the code or invite link to get friends in.'}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <LobbyPlayerList seats={room.seats} maxPlayers={room.maxPlayers} youId={room.youId} canKick={isHost} reactions={reactions} onKick={(id) => void track(onKick(id))} />
              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                {isHost ? (
                  <Button
                    size="lg"
                    disabled={!ready}
                    loading={starting}
                    onClick={async () => {
                      setStarting(true);
                      await track(onStart());
                      setStarting(false);
                    }}
                  >
                    <Play aria-hidden="true" /> Start game
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground" role="status">
                    Waiting for the host to start…
                  </p>
                )}
                <Button variant="ghost" onClick={onLeave}>
                  <LogOut aria-hidden="true" /> Leave room
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Game settings</CardTitle>
            <CardDescription>{isHost ? 'You’re the host: changes apply instantly for everyone.' : 'Only the host can change these.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <GameSettings rules={room.rules} maxPlayers={room.maxPlayers} readOnly={!isHost} onRules={(patch) => void track(onUpdate({ rules: patch }))} onMaxPlayers={(maxPlayers) => void track(onUpdate({ maxPlayers }))} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
