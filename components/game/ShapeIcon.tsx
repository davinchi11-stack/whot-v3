import type { Shape } from '../../lib/game/types.ts';

export const SHAPE_NAMES: Record<Shape, string> = {
  circle: 'Circle',
  triangle: 'Triangle',
  cross: 'Cross',
  square: 'Square',
  star: 'Star',
  whot: 'Whot',
};

interface Props {
  shape: Shape;
  size?: number;
  className?: string;
  /** Star cards print a doubled "value" number inside the star on real Whot decks. */
  inner?: number;
}

/** Crisp vector silhouettes (colour from currentColor). Shape carries the meaning, not colour. */
export function ShapeIcon({ shape, size = 24, className, inner }: Props) {
  let body;
  switch (shape) {
    case 'circle':
      body = <circle cx="50" cy="50" r="40" />;
      break;
    case 'triangle':
      body = <polygon points="50,10 92,88 8,88" strokeLinejoin="round" stroke="currentColor" strokeWidth="5" />;
      break;
    case 'cross':
      body = <path d="M36 8h28v28h28v28H64v28H36V64H8V36h28z" />;
      break;
    case 'square':
      body = <rect x="11" y="11" width="78" height="78" rx="6" />;
      break;
    case 'star':
      body = (
        <>
          <polygon points="50,4 62,36 96,38 69,60 78,94 50,75 22,94 31,60 4,38 38,36" strokeLinejoin="round" stroke="currentColor" strokeWidth="3" />
          {inner !== undefined ? (
            <text x="50" y="62" textAnchor="middle" fontSize="27" fontWeight="900" fill="var(--cream)" stroke="none" fontFamily="ui-rounded, system-ui, sans-serif">
              {inner}
            </text>
          ) : null}
        </>
      );
      break;
    default:
      // Crown: the Whot card emblem
      body = <path d="M7 76L13 28l23 24 14-33 14 33 23-24 6 48z M9 82h82v10H9z" strokeLinejoin="round" />;
  }
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 100 100" fill="currentColor" role="img" aria-label={SHAPE_NAMES[shape]} focusable="false">
      {body}
    </svg>
  );
}
