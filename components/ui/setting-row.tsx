import { useId } from 'react';
import { Switch } from './switch.tsx';
import { Label } from './label.tsx';

export function SettingRow({ label, hint, checked, onChange, disabled }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const id = useId();
  return (
    <div className={`flex items-start justify-between gap-4 rounded-lg border border-white/5 bg-black/15 px-3.5 py-3 ${disabled ? 'opacity-55' : ''}`}>
      <div className="grid gap-1">
        <Label htmlFor={id}>{label}</Label>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}
