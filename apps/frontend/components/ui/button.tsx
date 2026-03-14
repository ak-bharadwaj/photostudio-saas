import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading,
      leftIcon,
      rightIcon,
      fullWidth,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const base = [
      'relative inline-flex items-center justify-center gap-2',
      'font-medium whitespace-nowrap select-none overflow-hidden',
      // Shimmer pseudo-element base (activated per variant)
      'transition-all duration-200 ease-out',
      'focus-visible:outline-none',
      'disabled:opacity-50 disabled:pointer-events-none',
      'active:scale-[0.97]',
    ].join(' ');

    const variants: Record<string, string> = {
      primary: [
        // Gradient fill
        'bg-gradient-to-br from-[var(--primary)] to-[var(--accent)]',
        'text-[var(--primary-foreground)]',
        // Hover: deepen + slight glow
        'hover:from-[var(--primary-hover)] hover:to-[var(--accent-hover)]',
        'hover:shadow-[var(--shadow-glow-primary)]',
        // Shadow
        'shadow-[var(--shadow-sm)]',
        // Focus ring
        'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--primary)]',
        // Shimmer sweep on hover
        'after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent',
        'after:translate-x-[-100%] hover:after:translate-x-[100%] after:transition-transform after:duration-500',
      ].join(' '),
      secondary: [
        'bg-[var(--surface-2)] text-[var(--foreground)]',
        'border border-[var(--border)]',
        'hover:bg-[var(--surface-3)] hover:border-[var(--border-strong)]',
        'shadow-[var(--shadow-xs)]',
        'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--primary)]',
      ].join(' '),
      outline: [
        'border border-[var(--border-strong)] bg-transparent text-[var(--foreground)]',
        'hover:bg-[var(--overlay-light)] hover:border-[var(--primary)]',
        'hover:text-[var(--primary)]',
        'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--primary)]',
      ].join(' '),
      ghost: [
        'bg-transparent text-[var(--foreground-secondary)]',
        'hover:bg-[var(--overlay-light)] hover:text-[var(--foreground)]',
        'focus-visible:ring-2 focus-visible:ring-[var(--primary)]',
      ].join(' '),
      danger: [
        'bg-gradient-to-br from-[var(--danger)] to-[var(--danger-hover)]',
        'text-[var(--danger-foreground)]',
        'hover:from-[var(--danger-hover)] hover:to-[var(--danger)]',
        'hover:shadow-[0_4px_16px_rgba(239,68,68,0.35)]',
        'shadow-[var(--shadow-sm)]',
        'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--danger)]',
        'after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/15 after:to-transparent',
        'after:translate-x-[-100%] hover:after:translate-x-[100%] after:transition-transform after:duration-500',
      ].join(' '),
      success: [
        'bg-gradient-to-br from-[var(--success)] to-[var(--success-hover)]',
        'text-[var(--success-foreground)]',
        'hover:from-[var(--success-hover)] hover:to-[var(--success)]',
        'hover:shadow-[var(--shadow-glow-success)]',
        'shadow-[var(--shadow-sm)]',
        'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--success)]',
        'after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/15 after:to-transparent',
        'after:translate-x-[-100%] hover:after:translate-x-[100%] after:transition-transform after:duration-500',
      ].join(' '),
    };

    const sizes: Record<string, string> = {
      xs: 'h-7 px-2.5 text-xs rounded-[var(--radius-sm)]',
      sm: 'h-8 px-3 text-sm rounded-[var(--radius-sm)]',
      md: 'h-10 px-4 text-sm rounded-[var(--radius-md)]',
      lg: 'h-12 px-6 text-base rounded-[var(--radius-md)]',
      icon: 'h-10 w-10 p-0 rounded-[var(--radius-md)]',
    };

    return (
      <button
        className={cn(
          base,
          variants[variant],
          sizes[size],
          fullWidth && 'w-full',
          className,
        )}
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        suppressHydrationWarning
        {...props}
      >
        {isLoading ? (
          <>
            {/* Gradient ring spinner */}
            <svg
              className="h-4 w-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="sr-only">Loading</span>
            <span aria-hidden="true">{children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
