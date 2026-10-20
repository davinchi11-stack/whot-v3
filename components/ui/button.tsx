import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils.ts';

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50 aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 active:translate-y-px",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-md shadow-black/30 hover:bg-maroon-light',
        destructive: 'bg-destructive text-white hover:bg-destructive/90',
        outline: 'border border-input bg-transparent hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-accent',
        ghost: 'hover:bg-accent/70 hover:text-accent-foreground',
        gold: 'bg-gold text-maroon-deep hover:bg-gold/90 shadow-md shadow-black/30',
        link: 'text-muted-foreground underline underline-offset-4 hover:text-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 gap-1.5 rounded-md px-3 text-[13px]',
        lg: 'h-12 rounded-xl px-7 text-base',
        icon: 'size-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps extends React.ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Shows a spinner and disables the button while an action is in flight. */
  loading?: boolean;
}

function Button({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" /> : null}
      {children}
    </Comp>
  );
}

export { Button, buttonVariants };
