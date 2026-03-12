'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';

interface Props {
  children: React.ReactNode;
  /** Custom fallback UI. Receives reset callback to retry. */
  fallback?: (reset: () => void) => React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Class-based error boundary (React requires a class component for
 * componentDidCatch / getDerivedStateFromError).
 *
 * Usage:
 *   <ErrorBoundary>
 *     <MyPage />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (process.env.NODE_ENV === 'development') {
       
      console.error('[ErrorBoundary]', error, info.componentStack);
    }
  }

  reset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.reset);
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-4 py-12 space-y-4">
          <div className="h-16 w-16 rounded-full bg-[var(--danger-light,#fee2e2)] flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-[var(--danger,#dc2626)]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-[var(--foreground)]">Something went wrong</h2>
            <p className="text-sm text-[var(--foreground-secondary)] max-w-sm">
              An unexpected error occurred while rendering this page. Your data is safe — this is a display issue only.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="mt-4 text-left text-xs bg-[var(--surface-1)] border border-[var(--border)] rounded-lg p-4 max-w-xl overflow-auto text-[var(--danger)]">
                {this.state.error.message}
              </pre>
            )}
          </div>
          <Button
            variant="outline"
            onClick={this.reset}
            className="mt-2"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
