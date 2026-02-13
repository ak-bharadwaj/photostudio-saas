'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, duration = 5000) => {
      const id = Math.random().toString(36).substring(2, 11);
      setToasts((prev) => [...prev, { id, type, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

/* -------------------------------------------------------------------------- */
/*  Toast Container                                                           */
/* -------------------------------------------------------------------------- */

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div
      className="fixed top-4 right-4 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      style={{ zIndex: 'var(--z-toast)' } as React.CSSProperties}
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Toast Item                                                                */
/* -------------------------------------------------------------------------- */

interface ToastItemProps {
  toast: Toast;
  onClose: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(onClose, 200); // match animation duration
  }, [onClose]);

  useEffect(() => {
    if (progressRef.current && toast.duration && toast.duration > 0) {
      progressRef.current.style.transition = `width ${toast.duration}ms linear`;
      // Trigger reflow then start animation
      requestAnimationFrame(() => {
        if (progressRef.current) {
          progressRef.current.style.width = '0%';
        }
      });
    }
  }, [toast.duration]);

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
    warning: <AlertTriangle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />,
  };

  const styles: Record<ToastType, string> = {
    success: 'bg-[var(--surface-0)] border-[var(--success)] text-[var(--foreground)]',
    error: 'bg-[var(--surface-0)] border-[var(--danger)] text-[var(--foreground)]',
    warning: 'bg-[var(--surface-0)] border-[var(--warning)] text-[var(--foreground)]',
    info: 'bg-[var(--surface-0)] border-[var(--primary)] text-[var(--foreground)]',
  };

  const iconColors: Record<ToastType, string> = {
    success: 'text-[var(--success)]',
    error: 'text-[var(--danger)]',
    warning: 'text-[var(--warning)]',
    info: 'text-[var(--primary)]',
  };

  const progressColors: Record<ToastType, string> = {
    success: 'bg-[var(--success)]',
    error: 'bg-[var(--danger)]',
    warning: 'bg-[var(--warning)]',
    info: 'bg-[var(--primary)]',
  };

  return (
    <div
      className={cn(
        'pointer-events-auto relative overflow-hidden',
        'flex items-start gap-3 p-4',
        'rounded-[var(--radius-lg)] border-l-4 shadow-[var(--shadow-lg)]',
        isExiting ? 'animate-toast-out' : 'animate-toast-in',
        styles[toast.type],
      )}
      role="alert"
    >
      <div className={cn('shrink-0 mt-0.5', iconColors[toast.type])}>
        {icons[toast.type]}
      </div>
      <p className="flex-1 text-sm font-medium leading-relaxed">{toast.message}</p>
      <button
        onClick={handleClose}
        className={cn(
          'shrink-0 mt-0.5 h-6 w-6 flex items-center justify-center rounded-[var(--radius-sm)]',
          'text-[var(--foreground-tertiary)] hover:text-[var(--foreground)]',
          'hover:bg-[var(--overlay-light)]',
          'transition-colors duration-[var(--transition-fast)]',
        )}
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Progress bar */}
      {toast.duration && toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--surface-2)]">
          <div
            ref={progressRef}
            className={cn('h-full w-full', progressColors[toast.type])}
          />
        </div>
      )}
    </div>
  );
};
