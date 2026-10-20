import * as React from 'react';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils.ts';

const alertVariants = cva('relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-xl border px-4 py-3 text-sm has-[>svg]:grid-cols-[1rem_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5', {
  variants: {
    variant: {
      default: 'bg-card text-card-foreground',
      destructive: 'border-red-400/40 bg-red-500/10 text-red-200 [&>svg]:text-current',
      gold: 'border-gold/40 bg-gold/10 text-foreground [&>svg]:text-gold',
      maroon: 'border-maroon-light bg-maroon-deep/90 text-cream [&>svg]:text-gold',
    },
  },
  defaultVariants: { variant: 'default' },
});

function Alert({ className, variant, ...props }: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}
function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-title" className={cn('col-start-2 line-clamp-1 min-h-4 font-bold tracking-tight', className)} {...props} />;
}
function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="alert-description" className={cn('col-start-2 grid justify-items-start gap-1 text-sm opacity-90', className)} {...props} />;
}
export { Alert, AlertTitle, AlertDescription };
