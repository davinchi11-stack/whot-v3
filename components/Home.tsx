import { BookOpen, DoorOpen, Plus, Smartphone, SlidersHorizontal, Users } from 'lucide-react';
import type { Card as CardT } from '../lib/game/types.ts';
import { DEFAULT_RULES } from '../lib/game/rules.ts';
import { WhotCard } from './game/WhotCard.tsx';
import { Alert, AlertDescription } from './ui/alert.tsx';
import { Button } from './ui/button.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.tsx';

const SAMPLE: CardT[] = [
  { id: 's1', shape: 'circle', number: 7 },
  { id: 's2', shape: 'triangle', number: 2 },
  { id: 's3', shape: 'whot', number: 20 },
  { id: 's4', shape: 'cross', number: 14 },
  { id: 's5', shape: 'star', number: 5 },
];

const FEATURES = [
  { icon: Smartphone, title: 'No accounts', text: 'Pick a nickname and play. Nothing to download or sign up for.' },
  { icon: Users, title: 'Live with 2–4 friends', text: 'Share a room code or invite link and everyone plays in real time.' },
  { icon: SlidersHorizontal, title: 'Your house rules', text: 'Rollover or Count scoring, Pick defence and stacking, and a running scoreboard.' },
];

export function Home({ onCreate, onJoin, onHowTo, notice, onDismissNotice }: { onCreate: () => void; onJoin: () => void; onHowTo: () => void; notice: string | null; onDismissNotice: () => void }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-16">
      <section className="grid justify-items-center gap-5 pt-8 text-center sm:pt-14">
        <div className="flex items-center gap-3" aria-label="Naija Whot">
          <span className="grid h-14 w-11 -rotate-6 place-items-center rounded-lg border-2 border-maroon-deep bg-cream text-3xl font-black text-maroon shadow-lg" aria-hidden="true">W</span>
          <span className="text-2xl font-extrabold tracking-wide">Naija Whot</span>
        </div>
        <h1 className="max-w-2xl text-4xl leading-[1.08] font-black tracking-tight text-balance sm:text-6xl">
          Play Nigerian Whot with friends. <span className="text-gold">No account needed.</span>
        </h1>
        <p className="max-w-xl text-base text-muted-foreground sm:text-lg">Pick a nickname, share a room code, and play live with 2 to 4 players on any phone or laptop.</p>
        {notice ? (
          <Alert variant="gold" className="max-w-md text-left">
            <AlertDescription>
              <span>{notice}</span>
              <button type="button" className="text-xs underline underline-offset-2" onClick={onDismissNotice}>Dismiss</button>
            </AlertDescription>
          </Alert>
        ) : null}
        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={onCreate}>
            <Plus aria-hidden="true" /> Create room
          </Button>
          <Button size="lg" variant="secondary" onClick={onJoin}>
            <DoorOpen aria-hidden="true" /> Join room
          </Button>
        </div>
        <Button variant="link" onClick={onHowTo}>
          <BookOpen aria-hidden="true" /> How to play
        </Button>
      </section>

      <div className="flex justify-center overflow-hidden py-10" aria-hidden="true">
        {SAMPLE.map((card, i) => (
          <div key={card.id} className="fan-card animate-deal" style={{ ['--i' as string]: i - 2, animationDelay: `${i * 70}ms` }}>
            <WhotCard card={card} rules={DEFAULT_RULES} size="lg" />
          </div>
        ))}
      </div>

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Features">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <Card key={title} className="gap-2">
            <CardHeader>
              <Icon className="mb-1 size-6 text-gold" aria-hidden="true" />
              <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{text}</CardContent>
          </Card>
        ))}
      </section>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How to play in a minute</CardTitle>
          <CardDescription>Five shapes plus the crown-marked Whot card.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid list-decimal gap-1.5 pl-5 text-sm text-muted-foreground [&_b]:text-foreground">
            <li><b>Match</b> the top card by shape or number.</li>
            <li><b>Specials:</b> 1 Hold On · 2 Pick 2 · 5 Pick 3 · 8 Suspend · 14 General Market · Whot calls a shape.</li>
            <li><b>Can’t play?</b> Draw one card.</li>
            <li><b>Win</b> by emptying your hand, or play a Count game where the market decides.</li>
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">Games live in server memory: if the server restarts, active rooms are lost.</p>
        </CardContent>
      </Card>
    </main>
  );
}
