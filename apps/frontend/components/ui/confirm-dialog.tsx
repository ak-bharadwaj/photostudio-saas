'use client';

import React from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from './modal';
import { Button } from './button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  description = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  const Icon = variant === 'danger' ? Trash2 : AlertTriangle;
  const iconColor = variant === 'danger' ? 'text-[var(--danger)]' : 'text-[var(--warning)]';
  const iconBgStyle =
    variant === 'danger'
      ? { background: 'color-mix(in srgb, var(--danger) 12%, transparent)' }
      : { background: 'color-mix(in srgb, var(--warning) 12%, transparent)' };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="sm">
      <div className="flex flex-col items-center text-center px-2 pb-2">
        {/* Icon */}
        <div
          className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4"
          style={iconBgStyle}
        >
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>

        {/* Text */}
        <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">
          {title}
        </h2>
        <p className="text-sm text-[var(--foreground-secondary)] leading-relaxed max-w-xs">
          {description}
        </p>

        {/* Actions */}
        <div className="flex gap-3 mt-6 w-full">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            className="flex-1"
            onClick={onConfirm}
            isLoading={isLoading}
            disabled={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
