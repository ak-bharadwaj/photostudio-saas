import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
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
      'font-medium whitespace-nowrap select-none',
      'transition-all duration-[var(--transition-fast)]',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:opacity-50 disabled:pointer-events-none',
      'active:scale-[0.98]',
    ].join(' ');

    const variants: Record<string, string> = {
      primary: [
        'bg-[var(--primary)] text-[var(--primary-foreground)]',
        'hover:bg-[var(--primary-hover)]',
        'focus-visible:ring-[var(--primary)]',
        'shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]',
      ].join(' '),
      secondary: [
        'bg-[var(--surface-2)] text-[var(--foreground)]',
        'hover:bg-[var(--surface-3)]',
        'focus-visible:ring-[var(--secondary)]',
      ].join(' '),
      outline: [
        'border border-[var(--border)] bg-transparent text-[var(--foreground)]',
        'hover:bg-[var(--overlay-light)] hover:border-[var(--foreground-tertiary)]',
        'focus-visible:ring-[var(--primary)]',
      ].join(' '),
      ghost: [
        'bg-transparent text-[var(--foreground-secondary)]',
        'hover:bg-[var(--overlay-light)] hover:text-[var(--foreground)]',
        'focus-visible:ring-[var(--primary)]',
      ].join(' '),
      danger: [
        'bg-[var(--danger)] text-[var(--danger-foreground)]',
        'hover:bg-[var(--danger-hover)]',
        'focus-visible:ring-[var(--danger)]',
        'shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]',
      ].join(' '),
      success: [
        'bg-[var(--success)] text-[var(--success-foreground)]',
        'hover:bg-[var(--success-hover)]',
        'focus-visible:ring-[var(--success)]',
        'shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]',
      ].join(' '),
    };

    const sizes: Record<string, string> = {
      xs: 'h-7 px-2.5 text-xs rounded-[var(--radius-sm)]',
      sm: 'h-8 px-3 text-sm rounded-[var(--radius-sm)]',
      md: 'h-10 px-4 text-sm rounded-[var(--radius-md)]',
      lg: 'h-12 px-6 text-base rounded-[var(--radius-md)]',
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
        {...props}
      >
        {isLoading ? (
          <>
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
            <span>{children}</span>
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
