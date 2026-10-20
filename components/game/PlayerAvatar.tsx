import { cn } from '../../lib/utils.ts';

const TINTS = ['bg-maroon text-cream', 'bg-maroon-light text-cream', 'bg-[#1f5a3f] text-cream', 'bg-[#8a5a12] text-cream', 'bg-[#3b3f6b] text-cream', 'bg-[#6b2f5e] text-cream'];

function tintFor(name: string): string {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : (parts[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}

export function PlayerAvatar({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const dim = size === 'sm' ? 'size-7 text-[11px]' : size === 'lg' ? 'size-12 text-base' : 'size-9 text-sm';
  return (
    <span aria-hidden="true" className={cn('inline-grid shrink-0 place-items-center rounded-full font-bold ring-2 ring-white/15', dim, tintFor(name), className)}>
      {initials(name)}
    </span>
  );
}
