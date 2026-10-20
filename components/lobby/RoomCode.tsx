import { useState } from 'react';
import { Check, Copy, Link2 } from 'lucide-react';
import { Button } from '../ui/button.tsx';
import { Card, CardContent } from '../ui/card.tsx';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function RoomCode({ code }: { code: string }) {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const link = typeof window === "undefined" ? "" : `${window.location.origin}/join/${code}`;
  const doCopy = async (what: 'code' | 'link') => {
    if (await copyText(what === 'code' ? code : link)) {
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    }
  };
  return (
    <Card className="overflow-hidden border-maroon-light/30 bg-gradient-to-b from-maroon/30 to-card">
      <CardContent className="grid justify-items-center gap-3 text-center">
        <span className="text-xs font-medium tracking-widest text-muted-foreground uppercase">Room code</span>
        <div className="flex gap-1.5" role="img" aria-label={`Room code ${code.split('').join(' ')}`}>
          {code.split('').map((ch, i) => (
            <span key={i} className="grid h-14 w-11 place-items-center rounded-lg bg-cream text-3xl font-black text-maroon shadow-md sm:h-16 sm:w-12 sm:text-4xl" aria-hidden="true">
              {ch}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => void doCopy('code')}>
            {copied === 'code' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />} {copied === 'code' ? 'Copied' : 'Copy code'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => void doCopy('link')}>
            {copied === 'link' ? <Check aria-hidden="true" /> : <Link2 aria-hidden="true" />} {copied === 'link' ? 'Link copied' : 'Copy invite link'}
          </Button>
        </div>
        <p className="max-w-full text-xs break-all text-muted-foreground" aria-label="Invitation link">
          {link}
        </p>
      </CardContent>
    </Card>
  );
}
