import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../../lib/utils.ts';

const Tabs = TabsPrimitive.Root;
function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List data-slot="tabs-list" className={cn('inline-flex h-10 w-full items-center rounded-lg bg-black/30 p-1', className)} {...props} />;
}
function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn('inline-flex h-8 flex-1 items-center justify-center rounded-md px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow', className)}
      {...props}
    />
  );
}
function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn('mt-4 flex-1 outline-none', className)} {...props} />;
}
export { Tabs, TabsList, TabsTrigger, TabsContent };
