import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '../../lib/utils.ts';

const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
function TooltipContent({ className, sideOffset = 6, children, ...props }: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content data-slot="tooltip-content" sideOffset={sideOffset} className={cn('z-50 w-fit rounded-md bg-cream px-2.5 py-1 text-xs font-medium text-maroon-deep shadow-lg data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0', className)} {...props}>
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
