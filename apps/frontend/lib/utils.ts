import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Booking statuses
    INQUIRY: 'bg-blue-100 text-blue-800',
    QUOTED: 'bg-purple-100 text-purple-800',
    CONFIRMED: 'bg-green-100 text-green-800',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-gray-100 text-gray-800',
    CANCELLED: 'bg-red-100 text-red-800',
    
    // Invoice statuses
    DRAFT: 'bg-gray-100 text-gray-800',
    SENT: 'bg-blue-100 text-blue-800',
    PARTIALLY_PAID: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-green-100 text-green-800',
    OVERDUE: 'bg-red-100 text-red-800',
    
    // Studio statuses
    ACTIVE: 'bg-green-100 text-green-800',
    SUSPENDED: 'bg-red-100 text-red-800',
    EXPIRED: 'bg-gray-100 text-gray-800',
    TRIAL: 'bg-blue-100 text-blue-800',
  };
  
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
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
