import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { Ack } from '../lib/socket/events.ts';
import { Alert, AlertDescription } from './ui/alert.tsx';
import { Button } from './ui/button.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.tsx';
import { Input } from './ui/input.tsx';
import { Label } from './ui/label.tsx';

const clean = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);

export function JoinRoom({ initialCode, onSubmit, onBack, serverReady }: { initialCode?: string; onSubmit: (nickname: string, code: string) => Promise<Ack<any>>; onBack: () => void; serverReady: boolean }) {
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState(clean(initialCode ?? ''));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const nameError = nickname.trim().length === 0 ? 'Enter a nickname to continue.' : null;
  const codeError = code.length !== 5 ? 'Room codes have 5 characters.' : null;

  const submit = async () => {
    setTouched(true);
    if (nameError || codeError) return;
    setLoading(true);
    const r = await onSubmit(nickname.trim(), code);
    setLoading(false);
    if (!r.ok) setError(r.error);
  };

  return (
    <main className="mx-auto w-full max-w-md px-4 py-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-3">
        <ArrowLeft aria-hidden="true" /> Back
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Join a room</CardTitle>
          <CardDescription>{initialCode ? 'You’ve been invited. Pick a nickname to hop in.' : 'Enter the 5-character code your friend shared.'}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="jnick">Your nickname</Label>
              <Input id="jnick" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="e.g. Bola" maxLength={16} autoFocus autoComplete="off" aria-invalid={touched && nameError ? true : undefined} />
              {touched && nameError ? <p role="alert" className="text-sm text-red-300">{nameError}</p> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="jcode">Room code</Label>
              <Input id="jcode" value={code} onChange={(e) => setCode(clean(e.target.value))} placeholder="ABCDE" maxLength={5} autoComplete="off" className="text-center text-2xl font-black tracking-[0.4em] uppercase" aria-invalid={touched && codeError ? true : undefined} />
              {touched && codeError ? <p role="alert" className="text-sm text-red-300">{codeError}</p> : null}
            </div>
            {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
            {!serverReady ? <p role="status" className="text-sm text-muted-foreground">Cannot reach the game server yet. Retrying…</p> : null}
            <Button type="submit" size="lg" loading={loading} disabled={!serverReady} className="w-full">
              Join room
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
