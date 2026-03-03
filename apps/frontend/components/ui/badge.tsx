import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'outline';
  size?: 'sm' | 'md';
  /** Show a pulsing dot indicator */
  dot?: boolean;
  children: React.ReactNode;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', size = 'sm', dot, children, ...props }, ref) => {
    const variants: Record<string, string> = {
      default: [
        'bg-[var(--surface-2)] text-[var(--foreground-secondary)]',
        'border border-[var(--border)]',
      ].join(' '),
      success: [
        'bg-[var(--success-light)] text-[var(--success)]',
        'border border-[var(--success)]/20',
        'shadow-[0_0_8px_rgba(34,197,94,0.15)]',
      ].join(' '),
      warning: [
        'bg-[var(--warning-light)] text-[var(--warning-hover)]',
        'border border-[var(--warning)]/20',
        'shadow-[0_0_8px_rgba(245,158,11,0.15)]',
      ].join(' '),
      danger: [
        'bg-[var(--danger-light)] text-[var(--danger)]',
        'border border-[var(--danger)]/20',
        'shadow-[0_0_8px_rgba(239,68,68,0.15)]',
      ].join(' '),
      info: [
        'bg-[var(--primary-light)] text-[var(--primary)]',
        'border border-[var(--primary)]/20',
        'shadow-[0_0_8px_rgba(99,102,241,0.15)]',
      ].join(' '),
      secondary: [
        'bg-[var(--accent-light)] text-[var(--accent)]',
        'border border-[var(--accent)]/20',
        'shadow-[0_0_8px_rgba(139,92,246,0.15)]',
      ].join(' '),
      outline: [
        'border border-[var(--border-strong)] bg-transparent text-[var(--foreground-secondary)]',
      ].join(' '),
    };

    const dotColors: Record<string, string> = {
      default: 'bg-[var(--foreground-tertiary)]',
      success: 'bg-[var(--success)]',
      warning: 'bg-[var(--warning)]',
      danger: 'bg-[var(--danger)]',
      info: 'bg-[var(--primary)]',
      secondary: 'bg-[var(--accent)]',
      outline: 'bg-[var(--foreground-tertiary)]',
    };

    // Pulsing animation only for "active" statuses
    const dotPulse: Record<string, boolean> = {
      default: false,
      success: true,
      warning: true,
      danger: true,
      info: false,
      secondary: false,
      outline: false,
    };

    const sizes: Record<string, string> = {
      sm: 'px-2 py-0.5 text-[11px] tracking-wide',
      md: 'px-2.5 py-1 text-xs tracking-wide',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full font-semibold uppercase',
          'transition-all duration-150',
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'relative flex h-1.5 w-1.5 shrink-0',
            )}
            aria-hidden="true"
          >
            {dotPulse[variant] && (
              <span
                className={cn(
                  'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                  dotColors[variant],
                )}
              />
            )}
            <span
              className={cn(
                'relative inline-flex rounded-full h-1.5 w-1.5',
                dotColors[variant],
              )}
            />
          </span>
        )}
        {children}
      </span>
    );
  },
);

Badge.displayName = 'Badge';
