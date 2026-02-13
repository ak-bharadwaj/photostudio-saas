import React from 'react';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  Loading Spinner                                                           */
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
      <svg
        className={cn('animate-spin text-[var(--primary)]', sizes[size], className)}
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
    <div className="flex flex-col items-center justify-center min-h-screen animate-fade-in">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-sm text-[var(--foreground-secondary)]">{message}</p>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Skeleton — content placeholder                                            */
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
    <div
      className={cn('skeleton h-4 rounded-[var(--radius-sm)]', className)}
    />
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
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
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
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex gap-4 px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="flex gap-4 px-4 py-3 border-t border-[var(--border-light)]"
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
/*  Empty State                                                               */
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
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center', className)}>
      {icon && (
        <div className="flex items-center justify-center h-14 w-14 rounded-full bg-[var(--surface-2)] text-[var(--foreground-tertiary)] mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-medium text-[var(--foreground)]">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-[var(--foreground-tertiary)] max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
