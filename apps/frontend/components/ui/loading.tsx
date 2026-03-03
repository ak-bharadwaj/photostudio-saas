import React from 'react';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  Loading Spinner — gradient stroke ring                                    */
/* -------------------------------------------------------------------------- */

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
}) => {
  const sizes: Record<string, string> = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-10 w-10',
  };

  return (
    <div className="flex items-center justify-center" role="status" aria-label="Loading">
      {/* Outer gradient ring via box-shadow trick */}
      <div
        className={cn(
          'rounded-full animate-spin',
          sizes[size],
          className,
        )}
        style={{
          background: 'conic-gradient(from 0deg, transparent 0%, var(--primary) 70%, transparent 100%)',
          WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
          mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))',
        }}
        aria-hidden="true"
      />
      <span className="sr-only">Loading</span>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Full-page Loading                                                         */
/* -------------------------------------------------------------------------- */

export interface LoadingPageProps {
  message?: string;
}

export const LoadingPage: React.FC<LoadingPageProps> = ({
  message = 'Loading...',
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 animate-fade-in">
      <div className="relative">
        <LoadingSpinner size="lg" />
        {/* Glow behind spinner */}
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-40 animate-pulse-soft"
          style={{ background: 'var(--primary)' }}
          aria-hidden="true"
        />
      </div>
      <p className="text-sm font-medium text-[var(--foreground-secondary)]">{message}</p>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Skeleton — shimmer placeholder                                            */
/* -------------------------------------------------------------------------- */

export interface SkeletonProps {
  className?: string;
  /** Number of lines to render (default 1) */
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, lines = 1 }) => {
  if (lines > 1) {
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'skeleton h-4 rounded-[var(--radius-sm)]',
              i === lines - 1 && 'w-3/4', // last line shorter
              className,
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('skeleton h-4 rounded-[var(--radius-sm)]', className)} />
  );
};

/* -------------------------------------------------------------------------- */
/*  Skeleton Card — card-shaped placeholder                                   */
/* -------------------------------------------------------------------------- */

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--border-light)]',
        'bg-[var(--surface-0)] p-6 space-y-4',
        'shadow-[var(--shadow-card)]',
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton lines={3} />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Skeleton Table Row                                                        */
/* -------------------------------------------------------------------------- */

export interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
  className,
}) => {
  return (
    <div className={cn('space-y-0', className)}>
      {/* Header */}
      <div className="flex gap-6 px-6 py-3 border-b border-[var(--border-light)] bg-[var(--surface-1)]">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className={cn(
            'flex gap-6 px-6 py-4 border-b border-[var(--border-light)]',
            rowIdx % 2 === 1 && 'bg-[var(--surface-1)]/40',
          )}
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton key={colIdx} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Empty State — rich centered placeholder                                   */
/* -------------------------------------------------------------------------- */

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-20 px-4 text-center',
        'animate-fade-in',
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            'flex items-center justify-center h-16 w-16 rounded-2xl mb-4',
            'bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface-3)]',
            'text-[var(--foreground-tertiary)]',
            'shadow-[var(--shadow-md)]',
            'border border-[var(--border-light)]',
          )}
        >
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-[var(--foreground-tertiary)] max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};
