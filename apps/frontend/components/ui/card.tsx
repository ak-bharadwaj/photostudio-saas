import React from 'react';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  Card                                                                      */
/* -------------------------------------------------------------------------- */

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  /** Adds hover lift effect + gradient top-border reveal */
  interactive?: boolean;
  /** Removes padding (useful for full-bleed content like tables) */
  noPadding?: boolean;
  /** Glass morphism variant */
  glass?: boolean;
  /** Stat card variant — stronger icon bg support */
  variant?: 'default' | 'stat' | 'elevated';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, children, interactive, noPadding, glass, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base
          'relative rounded-[var(--radius-lg)] border border-[var(--border-light)]',
          'transition-all duration-300 ease-out',
          // Gradient top-line pseudo via CSS — revealed on hover
          'before:absolute before:inset-x-0 before:top-0 before:h-px before:rounded-t-[var(--radius-lg)]',
          'before:bg-gradient-to-r before:from-transparent before:via-[var(--primary)] before:to-transparent',
          'before:opacity-0 before:transition-opacity before:duration-300',
          // Default surface
          !glass && 'bg-[var(--surface-0)] shadow-[var(--shadow-card)]',
          // Glass variant
          glass && [
            'bg-[var(--glass-bg)] backdrop-blur-xl',
            'border-[var(--glass-border)]',
            'shadow-[var(--shadow-card)]',
          ],
          // Stat variant — slightly elevated
          variant === 'stat' && 'shadow-[var(--shadow-md)]',
          variant === 'elevated' && 'shadow-[var(--shadow-lg)]',
          // Interactive: lift + glow + reveal gradient line
          interactive && [
            'cursor-pointer',
            'hover:shadow-[var(--shadow-card-hover)]',
            'hover:-translate-y-0.5',
            'hover:border-[var(--border)]',
            'hover:before:opacity-100',
          ],
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';

/* -------------------------------------------------------------------------- */
/*  Card Header                                                               */
/* -------------------------------------------------------------------------- */

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col space-y-1.5 p-6', className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

CardHeader.displayName = 'CardHeader';

/* -------------------------------------------------------------------------- */
/*  Card Title                                                                */
/* -------------------------------------------------------------------------- */

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export const CardTitle = React.forwardRef<HTMLParagraphElement, CardTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn(
          'text-lg font-semibold leading-none tracking-tight text-[var(--foreground)]',
          className,
        )}
        {...props}
      >
        {children}
      </h3>
    );
  },
);

CardTitle.displayName = 'CardTitle';

/* -------------------------------------------------------------------------- */
/*  Card Description                                                          */
/* -------------------------------------------------------------------------- */

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn('text-sm text-[var(--foreground-secondary)]', className)}
        {...props}
      >
        {children}
      </p>
    );
  },
);

CardDescription.displayName = 'CardDescription';

/* -------------------------------------------------------------------------- */
/*  Card Content                                                              */
/* -------------------------------------------------------------------------- */

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('p-6 pt-0', className)} {...props}>
        {children}
      </div>
    );
  },
);

CardContent.displayName = 'CardContent';

/* -------------------------------------------------------------------------- */
/*  Card Footer                                                               */
/* -------------------------------------------------------------------------- */

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center p-6 pt-0', className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);

CardFooter.displayName = 'CardFooter';
