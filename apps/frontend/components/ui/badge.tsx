import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary';
  size?: 'sm' | 'md';
  /** Show a pulsing dot indicator */
  dot?: boolean;
  children: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'sm', dot, children, ...props }, ref) => {
    const variants: Record<string, string> = {
      default: 'bg-[var(--surface-2)] text-[var(--foreground-secondary)]',
      success: 'bg-[var(--success-light)] text-[var(--success)]',
      warning: 'bg-[var(--warning-light)] text-[var(--warning)]',
      danger: 'bg-[var(--danger-light)] text-[var(--danger)]',
      info: 'bg-[var(--primary-light)] text-[var(--primary)]',
      secondary: 'bg-[var(--accent-light)] text-[var(--accent)]',
    };

    const dotColors: Record<string, string> = {
      default: 'bg-[var(--foreground-tertiary)]',
      success: 'bg-[var(--success)]',
      warning: 'bg-[var(--warning)]',
      danger: 'bg-[var(--danger)]',
      info: 'bg-[var(--primary)]',
      secondary: 'bg-[var(--accent)]',
    };

    const sizes: Record<string, string> = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-[var(--radius-full)] font-medium',
          'transition-colors duration-[var(--transition-fast)]',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full shrink-0',
              dotColors[variant],
            )}
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    );
  },
);

Badge.displayName = 'Badge';
