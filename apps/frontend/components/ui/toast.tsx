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
      const id = crypto.randomUUID();
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
      className="fixed top-4 right-4 flex flex-col gap-3 max-w-[380px] w-full pointer-events-none"
      style={{ zIndex: 'var(--z-toast)' } as React.CSSProperties}
      aria-live="polite"
      aria-atomic="true"
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

/* Per-type design tokens */
const TOAST_CONFIG: Record<ToastType, {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  progressColor: string;
  accentBorder: string;
  label: string;
}> = {
  success: {
    icon: CheckCircle,
    iconBg: 'bg-[var(--success)]/15',
    iconColor: 'text-[var(--success)]',
    progressColor: 'bg-[var(--success)]',
    accentBorder: 'shadow-[inset_0_0_0_1px_rgba(34,197,94,0.2)]',
    label: 'Success',
  },
  error: {
    icon: AlertCircle,
    iconBg: 'bg-[var(--danger)]/15',
    iconColor: 'text-[var(--danger)]',
    progressColor: 'bg-[var(--danger)]',
    accentBorder: 'shadow-[inset_0_0_0_1px_rgba(239,68,68,0.2)]',
    label: 'Error',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-[var(--warning)]/15',
    iconColor: 'text-[var(--warning)]',
    progressColor: 'bg-[var(--warning)]',
    accentBorder: 'shadow-[inset_0_0_0_1px_rgba(234,179,8,0.2)]',
    label: 'Warning',
  },
  info: {
    icon: Info,
    iconBg: 'bg-[var(--primary)]/15',
    iconColor: 'text-[var(--primary)]',
    progressColor: 'bg-[var(--primary)]',
    accentBorder: 'shadow-[inset_0_0_0_1px_rgba(99,102,241,0.2)]',
    label: 'Info',
  },
};

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const cfg = TOAST_CONFIG[toast.type];
  const Icon = cfg.icon;

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(onClose, 220);
  }, [onClose]);

  useEffect(() => {
    if (progressRef.current && toast.duration && toast.duration > 0) {
      progressRef.current.style.transition = `width ${toast.duration}ms linear`;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (progressRef.current) {
            progressRef.current.style.width = '0%';
          }
        });
      });
    }
  }, [toast.duration]);

  return (
    <div
      className={cn(
        // Base
        'pointer-events-auto relative overflow-hidden',
        'flex items-start gap-3 p-4',
        'rounded-[var(--radius-xl)]',
        // Frosted glass surface
        'bg-[var(--surface-0)]/90 backdrop-blur-xl',
        // Border + subtle glow ring
        'border border-[var(--border)]',
        cfg.accentBorder,
        // Elevation
        'shadow-[var(--shadow-lg)]',
        // Animation
        isExiting ? 'animate-toast-out' : 'animate-toast-in',
      )}
      role="alert"
      aria-label={`${cfg.label}: ${toast.message}`}
    >
      {/* Colored icon container */}
      <div
        className={cn(
          'shrink-0 h-8 w-8 rounded-[var(--radius-md)]',
          'flex items-center justify-center',
          cfg.iconBg,
        )}
        aria-hidden="true"
      >
        <Icon className={cn('h-4 w-4', cfg.iconColor)} />
      </div>

      {/* Message */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--foreground-tertiary)] mb-0.5">
          {cfg.label}
        </p>
        <p className="text-sm font-medium leading-snug text-[var(--foreground)]">
          {toast.message}
        </p>
      </div>

      {/* Dismiss */}
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
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Progress bar */}
      {toast.duration && toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--surface-2)]">
          <div
            ref={progressRef}
            className={cn('h-full w-full rounded-full', cfg.progressColor)}
          />
        </div>
      )}
    </div>
  );
};
