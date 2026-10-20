import { ToggleGroup, ToggleGroupItem } from './toggle-group.tsx';
import { Label } from './label.tsx';
import { useId } from 'react';

/** Single-choice button group (shadcn ToggleGroup). Ignores the "deselect" event so one option is always on. */
export function Segmented<T extends string | number>({ label, hint, value, options, onChange, disabled }: { label: string; hint?: string; value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="grid gap-2">
      <Label id={id}>{label}</Label>
      <ToggleGroup type="single" value={String(value)} disabled={disabled} aria-labelledby={id} onValueChange={(v: string) => {
        if (!v) return;
        const found = options.find((o) => String(o.value) === v);
        if (found) onChange(found.value);
      }}>
        {options.map((o) => (
          <ToggleGroupItem key={String(o.value)} value={String(o.value)}>
            {o.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
