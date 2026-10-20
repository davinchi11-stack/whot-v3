import { Button } from './ui/button.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog.tsx';

export function HowToPlayContent() {
  const h3 = 'mt-5 mb-1.5 text-sm font-bold tracking-wide text-cream uppercase';
  return (
    <div className="text-sm leading-relaxed text-muted-foreground [&_b]:text-foreground">
      <h3 className={h3 + ' mt-0'}>The goal</h3>
      <p>Get rid of your cards, or finish a round holding the lowest total of card values. The host picks Rollover or Count.</p>
      <h3 className={h3}>Matching</h3>
      <p>Play a card with the <b>same shape or number</b> as the top card. Can’t, or don’t want to? Draw one card — your turn then ends.</p>
      <h3 className={h3}>Special cards</h3>
      <ul className="grid list-disc gap-1 pl-5">
        <li><b>1 · Hold On</b> — everyone else is skipped; you play again.</li>
        <li><b>2 · Pick 2</b> — next player picks 2 unless they defend with another 2.</li>
        <li><b>5 · Pick 3</b> — like Pick 2 but 3 cards (traditional). The host can change it to 5.</li>
        <li><b>8 · Suspension</b> — the next player misses a turn.</li>
        <li><b>14 · General Market</b> — every other player draws 1; you play again.</li>
        <li><b>Whot (20, the crown)</b> — plays on anything; call any shape. The next player must follow it or play another Whot.</li>
      </ul>
      <h3 className={h3}>Defence and stacking</h3>
      <p>With <b>defence on</b> you can answer a penalty with a permitted card. With <b>stacking on</b> the penalty adds up (2 + 2 = 4) until someone can’t defend. With stacking off a defence passes the same penalty on. With <b>defence off</b> you simply draw it.</p>
      <h3 className={h3}>Modes</h3>
      <p><b>Rollover:</b> the round ends when someone plays their last card. <b>Count:</b> the round ends when someone plays their last card <i>or</i> the market runs out.</p>
      <h3 className={h3}>Scoring</h3>
      <p>When a round ends, add up the <b>values of the cards left in your hand</b> — the number on each card, and Whot counts 20 (a count of cards is never used). If you hold 2, 12 and a Whot, that’s 2 + 12 + 20 = 34. <b>The lowest total wins the round</b>; ties share it. Each round’s total is added to your running score, so the <b>lowest overall score is best</b>. “Next round” keeps the scoreboard; “New game” resets it.</p>
      <h3 className={h3}>When the market runs out</h3>
      <p>Rollover: the played pile (except the top card) is reshuffled. Count: the round ends and everyone counts their hand.</p>
      <h3 className={h3}>First game in 30 seconds</h3>
      <ol className="grid list-decimal gap-1 pl-5">
        <li>Glowing cards in your hand are legal plays — tap one.</li>
        <li>Played a Whot? Pick a shape.</li>
        <li>Nothing glowing? Tap <b>Draw card</b>.</li>
        <li>Pick alert? Tap <b>DEFEND</b> if you can, or tap <b>DEFEND</b>, or pick the cards.</li>
        <li>Send an emoji reaction any time with the <b>React</b> button.</li>
      </ol>
    </div>
  );
}

export function HowToPlayDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>How to play Whot</DialogTitle>
          <DialogDescription>Nigerian Whot in a nutshell.</DialogDescription>
        </DialogHeader>
        <HowToPlayContent />
        <DialogFooter>
          <Button onClick={onClose}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
