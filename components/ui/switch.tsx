import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '../../lib/utils.ts';

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn('peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-maroon-light data-[state=unchecked]:bg-white/15', className)}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-5 rounded-full bg-cream shadow-md ring-0 transition-transform data-[state=checked]:translate-x-[20px] data-[state=unchecked]:translate-x-[2px]" />
    </SwitchPrimitive.Root>
  );
}
export { Switch };
