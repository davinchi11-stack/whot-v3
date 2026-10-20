import { Wifi, WifiOff } from 'lucide-react';
import type { ConnStatus } from '../../lib/socket/useWhot.ts';
import { Badge } from './badge.tsx';

const LABEL: Record<ConnStatus, string> = { connecting: 'Connecting…', connected: 'Connected', reconnecting: 'Reconnecting…', offline: 'Offline' };

export function ConnectionBadge({ status }: { status: ConnStatus }) {
  const variant = status === 'connected' ? 'success' : status === 'offline' ? 'danger' : 'warning';
  return (
    <Badge variant={variant} role="status" aria-live="polite">
      {status === 'connected' ? <Wifi aria-hidden="true" /> : <WifiOff aria-hidden="true" />}
      {LABEL[status]}
    </Badge>
  );
}

/** Full-width notice while the socket is down, so players know their seat is being held. */
export function ReconnectBanner({ status, graceMs }: { status: ConnStatus; graceMs: number }) {
  if (status === 'connected') return null;
  return (
    <div role="alert" className="flex items-center gap-2 bg-maroon-deep px-4 py-2 text-sm text-cream">
      <WifiOff className="size-4 shrink-0" aria-hidden="true" />
      <span>
        {status === 'offline' ? 'Cannot reach the server.' : 'Connection lost — trying to reconnect.'} Your seat is held for about {Math.round(graceMs / 1000)}s.
      </span>
    </div>
  );
}
