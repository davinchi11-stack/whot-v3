import * as React from 'react';
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import { cn } from '../../lib/utils.ts';

function ToggleGroup({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return <ToggleGroupPrimitive.Root data-slot="toggle-group" className={cn('flex flex-wrap gap-1.5', className)} {...props} />;
}
function ToggleGroupItem({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn('inline-flex h-9 items-center justify-center rounded-lg border border-input px-3.5 text-sm font-medium text-foreground/85 transition-all outline-none hover:bg-accent/60 focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-45 data-[state=on]:border-maroon-light data-[state=on]:bg-primary data-[state=on]:text-primary-foreground', className)}
      {...props}
    />
  );
}
export { ToggleGroup, ToggleGroupItem };
