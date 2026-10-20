import type * as React from 'react';
import type { Card, RuleConfig } from '../../lib/game/types.ts';
import { cardName } from '../../lib/game/describe.ts';
import { ShapeIcon } from './ShapeIcon.tsx';

export type CardSize = 'xs' | 'sm' | 'md' | 'lg';

interface FaceProps {
  card: Card;
  /** Only used to decide whether Star cards print their doubled value (when the room scores stars double). */
  rules?: Pick<RuleConfig, 'starsCountDouble'>;
  size?: CardSize;
  playable?: boolean;
  /** Visually disabled (illegal move). Still focusable so tapping can explain why. */
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Traditional Whot card: number and shape only. No rules text, no effect labels — a card's effect comes from
 * the game rules, not from anything printed on it.
 */
export function WhotCard({ card, rules, size = 'md', playable, disabled, onClick, className }: FaceProps) {
  const isWhot = card.shape === 'whot';
  const label = `${cardName(card)}${playable ? ', playable' : ''}${disabled ? ', not playable now' : ''}`;
  const cls = ['w-card', `w-card--${size}`, playable && 'is-playable', disabled && 'is-disabled', onClick && 'is-interactive', className].filter(Boolean).join(' ');
  const inner = (
    <>
      <span className="w-card__corner w-card__corner--tl" aria-hidden="true">
        <b>{card.number}</b>
        <ShapeIcon shape={card.shape} size={14} />
      </span>
      <span className="w-card__center" aria-hidden="true">
        {isWhot ? (
          <span className="w-card__whot">
            <ShapeIcon shape="whot" size={40} className="w-card__crown" />
            <b>20</b>
            <i>WHOT</i>
          </span>
        ) : (
          <ShapeIcon shape={card.shape} size={52} className="w-card__symbol" inner={card.shape === 'star' && rules?.starsCountDouble ? card.number * 2 : undefined} />
        )}
      </span>
      <span className="w-card__corner w-card__corner--br" aria-hidden="true">
        <b>{card.number}</b>
        <ShapeIcon shape={card.shape} size={14} />
      </span>
    </>
  );
  if (!onClick) {
    return (
      <div className={cls} role="img" aria-label={label}>
        {inner}
      </div>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick} aria-label={label} aria-disabled={disabled || undefined}>
      {inner}
    </button>
  );
}

/** Face-down card: maroon sunburst back with the WHOT wordmark. */
export function CardBack({ size = 'md', label = 'Face-down card', className }: { size?: CardSize; label?: string; className?: string }) {
  return (
    <div className={`w-card w-card--${size} w-card--back ${className ?? ''}`} role="img" aria-label={label}>
      <span className="w-card__cartouche" aria-hidden="true">
        WHOT
      </span>
    </div>
  );
}

/** A blank card edge, used to suggest depth under the top of the discard pile. */
export function CardEdge({ size = 'lg', className, style }: { size?: CardSize; className?: string; style?: React.CSSProperties }) {
  return <div className={`w-card w-card--${size} w-card--edge ${className ?? ''}`} style={style} aria-hidden="true" />;
}
