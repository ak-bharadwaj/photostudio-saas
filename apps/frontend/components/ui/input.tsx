import React, { useId } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, leftIcon, rightIcon, type = 'text', id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? (label ? generatedId : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[13px] font-semibold text-[var(--foreground-secondary)] mb-1.5 tracking-wide"
          >
            {label}
          </label>
        )}
        <div className="relative group">
          {leftIcon && (
            <div
              className={cn(
                'absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none',
                'text-[var(--foreground-tertiary)] transition-colors duration-150',
                'group-focus-within:text-[var(--primary)]',
              )}
            >
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            className={cn(
              'flex h-10 w-full rounded-[var(--radius-md)]',
              'border border-[var(--border)] bg-[var(--surface-0)]',
              'px-3 py-2 text-sm text-[var(--foreground)]',
              'placeholder:text-[var(--foreground-tertiary)]',
              'transition-all duration-150',
              // Focus state: glow ring + border color shift
              'focus:outline-none focus:border-[var(--primary)]',
              'focus:shadow-[var(--shadow-focus)]',
              // Hover: slightly stronger border
              'hover:border-[var(--border-strong)]',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--surface-1)]',
              error && [
                'border-[var(--danger)]',
                'focus:border-[var(--danger)] focus:shadow-[var(--shadow-focus-danger)]',
              ],
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className,
            )}
            ref={ref}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            suppressHydrationWarning
            {...props}
          />
          {rightIcon && (
            <div
              className={cn(
                'absolute inset-y-0 right-0 flex items-center pr-3',
                'text-[var(--foreground-tertiary)] transition-colors duration-150',
                'group-focus-within:text-[var(--primary)]',
              )}
            >
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs font-medium text-[var(--danger)]" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1.5 text-xs text-[var(--foreground-tertiary)]">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

/* -------------------------------------------------------------------------- */
/*  Textarea                                                                  */
/* -------------------------------------------------------------------------- */

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? (label ? generatedId : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[13px] font-semibold text-[var(--foreground-secondary)] mb-1.5 tracking-wide"
          >
            {label}
          </label>
        )}
        <textarea
          id={inputId}
          className={cn(
            'flex min-h-[80px] w-full rounded-[var(--radius-md)]',
            'border border-[var(--border)] bg-[var(--surface-0)]',
            'px-3 py-2 text-sm text-[var(--foreground)]',
            'placeholder:text-[var(--foreground-tertiary)]',
            'transition-all duration-150',
            'focus:outline-none focus:border-[var(--primary)]',
            'focus:shadow-[var(--shadow-focus)]',
            'hover:border-[var(--border-strong)]',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--surface-1)]',
            'resize-y',
            error && [
              'border-[var(--danger)]',
              'focus:border-[var(--danger)] focus:shadow-[var(--shadow-focus-danger)]',
            ],
            className,
          )}
          ref={ref}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          suppressHydrationWarning
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs font-medium text-[var(--danger)]" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1.5 text-xs text-[var(--foreground-tertiary)]">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';

/* -------------------------------------------------------------------------- */
/*  Select                                                                    */
/* -------------------------------------------------------------------------- */

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, options, placeholder, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? (label ? generatedId : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[13px] font-semibold text-[var(--foreground-secondary)] mb-1.5 tracking-wide"
          >
            {label}
          </label>
        )}
        <select
          id={inputId}
          className={cn(
            'flex h-10 w-full rounded-[var(--radius-md)]',
            'border border-[var(--border)] bg-[var(--surface-0)]',
            'px-3 py-2 text-sm text-[var(--foreground)]',
            'transition-all duration-150',
            'focus:outline-none focus:border-[var(--primary)]',
            'focus:shadow-[var(--shadow-focus)]',
            'hover:border-[var(--border-strong)]',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-[var(--surface-1)]',
            error && [
              'border-[var(--danger)]',
              'focus:border-[var(--danger)] focus:shadow-[var(--shadow-focus-danger)]',
            ],
            className,
          )}
          ref={ref}
          aria-invalid={error ? 'true' : undefined}
          suppressHydrationWarning
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs font-medium text-[var(--danger)]" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1.5 text-xs text-[var(--foreground-tertiary)]">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';
