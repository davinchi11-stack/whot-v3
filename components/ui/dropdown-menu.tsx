import * as React from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '../../lib/utils.ts';

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

function DropdownMenuContent({ className, sideOffset = 6, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn('z-50 min-w-48 overflow-hidden rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95', className)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}
function DropdownMenuItem({ className, variant, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & { variant?: 'default' | 'destructive' }) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn('relative flex cursor-default items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0', variant === 'destructive' && 'text-red-300 focus:bg-red-500/15 focus:text-red-200', className)}
      {...props}
    />
  );
}
function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return <DropdownMenuPrimitive.Separator data-slot="dropdown-menu-separator" className={cn('-mx-1.5 my-1.5 h-px bg-border', className)} {...props} />;
}
export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator };
