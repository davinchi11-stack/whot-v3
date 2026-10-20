import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useWhot } from '../lib/socket/useWhot.ts';
import { CreateRoom } from './CreateRoom.tsx';
import { GameResult } from './game/GameResult.tsx';
import { GameTable } from './game/GameTable.tsx';
import { Home } from './Home.tsx';
import { HowToPlayDialog } from './HowToPlayDialog.tsx';
import { JoinRoom } from './JoinRoom.tsx';
import { Lobby } from './lobby/Lobby.tsx';
import { Button } from './ui/button.tsx';
import { ConnectionBadge } from './ui/ConnectionBadge.tsx';
import { TooltipProvider } from './ui/tooltip.tsx';

export default function WhotApp({ initialCode }: { initialCode?: string }) {
  const w = useWhot();
  const [screen, setScreen] = useState<'home' | 'create' | 'join'>(initialCode ? 'join' : 'home');
  const [howTo, setHowTo] = useState(false);
  const [busy, setBusy] = useState(false);
  const serverReady = w.status === 'connected';

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };

  if (w.restoring && w.status !== 'offline') {
    return (
      <main className="grid min-h-[60vh] place-items-center">
        <p className="text-muted-foreground" role="status">Connecting…</p>
      </main>
    );
  }

  const room = w.room;
  const react = (id: string) => void w.react(id);
  let body;
  if (room && room.phase === 'lobby') {
    body = <Lobby room={room} status={w.status} reactions={w.reactions} lastReaction={w.lastReaction} onReact={react} onUpdate={w.updateSettings} onKick={w.kick} onStart={w.start} onLeave={() => void w.leave()} />;
  } else if (room && room.phase === 'playing' && room.game) {
    body = <GameTable room={room} status={w.status} reactions={w.reactions} lastReaction={w.lastReaction} onReact={react} onPlay={w.play} onDraw={w.draw} onLeave={() => void w.leave()} onEndGame={() => void w.endGame()} />;
  } else if (room && room.phase === 'finished' && room.game?.result) {
    body = <GameResult room={room} busy={busy} reactions={w.reactions} lastReaction={w.lastReaction} onReact={react} onRematch={() => void act(w.rematch)} onLobby={() => void act(w.endGame)} onLeave={() => void w.leave()} />;
  } else if (screen === 'create') {
    body = <CreateRoom serverReady={serverReady} onBack={() => setScreen('home')} onSubmit={(n, m, r) => w.create(n, m, r)} />;
  } else if (screen === 'join') {
    body = <JoinRoom serverReady={serverReady} initialCode={initialCode} onBack={() => { setScreen('home'); if (initialCode) window.history.replaceState(null, '', '/'); }} onSubmit={(n, c) => w.join(n, c)} />;
  } else {
    body = <Home onCreate={() => setScreen('create')} onJoin={() => setScreen('join')} onHowTo={() => setHowTo(true)} notice={w.notice} onDismissNotice={w.clearNotice} />;
  }

  return (
    <TooltipProvider delayDuration={150}>
      {!room ? (
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 pt-3">
          <ConnectionBadge status={w.status} />
          <Button variant="link" size="sm" onClick={() => setHowTo(true)}><BookOpen aria-hidden="true" /> How to play</Button>
        </div>
      ) : null}
      {body}
      <HowToPlayDialog open={howTo} onClose={() => setHowTo(false)} />
    </TooltipProvider>
  );
}
