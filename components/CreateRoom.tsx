import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { RuleConfig } from '../lib/game/types.ts';
import { DEFAULT_RULES } from '../lib/game/rules.ts';
import type { Ack } from '../lib/socket/events.ts';
import { GameSettings } from './lobby/GameSettings.tsx';
import { Alert, AlertDescription } from './ui/alert.tsx';
import { Button } from './ui/button.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.tsx';
import { Input } from './ui/input.tsx';
import { Label } from './ui/label.tsx';

export function CreateRoom({ onSubmit, onBack, serverReady }: { onSubmit: (nickname: string, maxPlayers: number, rules: RuleConfig) => Promise<Ack<any>>; onBack: () => void; serverReady: boolean }) {
  const [nickname, setNickname] = useState('');
  const [maxPlayers, setMaxPlayers] = useState<2 | 3 | 4>(4);
  const [rules, setRules] = useState<RuleConfig>({ ...DEFAULT_RULES });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const nameError = nickname.trim().length === 0 ? 'Enter a nickname to continue.' : null;

  const submit = async () => {
    setTouched(true);
    if (nameError) return;
    setLoading(true);
    const r = await onSubmit(nickname.trim(), maxPlayers, rules);
    setLoading(false);
    if (!r.ok) setError(r.error);
  };

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-6">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-3">
        <ArrowLeft aria-hidden="true" /> Back
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create a room</CardTitle>
          <CardDescription>Set the rules, then invite your friends.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate className="grid gap-5">
            <div className="grid gap-2">
              <Label htmlFor="nick">Your nickname</Label>
              <Input id="nick" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="e.g. Ada" maxLength={16} autoFocus autoComplete="off" aria-invalid={touched && nameError ? true : undefined} aria-describedby={touched && nameError ? 'nick-err' : undefined} />
              {touched && nameError ? <p id="nick-err" role="alert" className="text-sm text-red-300">{nameError}</p> : null}
            </div>
            <GameSettings rules={rules} maxPlayers={maxPlayers} onRules={(p) => setRules((r) => ({ ...r, ...p }))} onMaxPlayers={setMaxPlayers} />
            {error ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}
            {!serverReady ? <p role="status" className="text-sm text-muted-foreground">Connecting to the game server… this can take a moment if it was asleep.</p> : null}
            <Button type="submit" size="lg" loading={loading} disabled={!serverReady} className="w-full">
              Create room
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
