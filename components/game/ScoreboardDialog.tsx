import type { RoomView } from '../../lib/socket/events.ts';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog.tsx';
import { Scoreboard } from './Scoreboard.tsx';

export function ScoreboardDialog({ open, room, onClose }: { open: boolean; room: RoomView; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Scoreboard</DialogTitle>
          <DialogDescription>{room.rounds.length ? `After ${room.rounds.length} round${room.rounds.length === 1 ? '' : 's'}` : `Round ${room.round} is in progress`}</DialogDescription>
        </DialogHeader>
        <Scoreboard room={room} />
      </DialogContent>
    </Dialog>
  );
}
