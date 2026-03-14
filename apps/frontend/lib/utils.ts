import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number | null | undefined,
  currency = 'INR',
): string {
  const val = amount || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch (_error: unknown) {
    return 'Invalid Date';
  }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return new Intl.DateTimeFormat('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch (_error: unknown) {
    return 'Invalid Date';
  }
}

export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return 'N/A';

  // Strip all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Indian 10-digit mobile number (with or without leading country code)
  // Accepts: 9876543210  or  919876543210  or  +919876543210
  const tenDigit = cleaned.length === 10 ? cleaned : cleaned.length === 12 && cleaned.startsWith('91') ? cleaned.slice(2) : null;
  if (tenDigit) {
    return `+91 ${tenDigit.slice(0, 5)} ${tenDigit.slice(5)}`;
  }

  // Already includes a country code we don't recognise — return as-is
  return phone;
}

export function getBookingStatusBadge(status: string): { variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' } {
  const variants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary'> = {
    INQUIRY: 'info',
    QUOTED: 'secondary',
    CONFIRMED: 'success',
    IN_PROGRESS: 'warning',
    COMPLETED: 'default',
    CANCELLED: 'danger',
  };
  return { variant: variants[status] || 'default' };
}

export function getInvoiceStatusBadge(status: string): { variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' } {
  const variants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary'> = {
    DRAFT: 'default',
    SENT: 'info',
    PARTIALLY_PAID: 'warning',
    PAID: 'success',
    OVERDUE: 'danger',
  };
  return { variant: variants[status] || 'default' };
}

export function getOptimizedImageUrl(url: string | null | undefined, options: { width?: number; quality?: number } = {}): string {
  if (!url) return '';
  const { width = 1200, quality = 80 } = options;
  
  // If it's an Unsplash URL, append optimization params
  if (url.includes('images.unsplash.com')) {
    const baseUrl = url.split('?')[0];
    return `${baseUrl}?auto=format&fit=crop&q=${quality}&w=${width}`;
  }
  
  return url;
}
