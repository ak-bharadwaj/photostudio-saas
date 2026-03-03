'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import axios from 'axios';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import {
  Calendar,
  FileText,
  Wallet,
  ArrowRight,
  Phone,
  CheckCircle,
  TrendingUp,
  Clock,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Activity,
  ChevronRight,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const safeGetItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(key); } catch { return null; }
};
const safeRemoveItem = (key: string) => {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(key); } catch { /* noop */ }
};

interface Booking {
  id: string;
  status: string;
  scheduledAt: string;
  customerNotes?: string;
  service: { name: string; price: number; durationMinutes: number };
  studio: { name: string; slug: string; logoUrl?: string };
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  total: number;
  status: string;
  dueDate?: string;
  createdAt: string;
  studio: { name: string };
  payments: Array<{ amount: number; paidAt: string }>;
}

interface CustomerData {
  customer: { id: string; name: string; email?: string; phone: string };
  bookings: Booking[];
  invoices: Invoice[];
}

const STATUS_BADGE_VARIANT: Record<string, 'default' | 'info' | 'success' | 'warning' | 'secondary' | 'danger'> = {
  INQUIRY:     'default',
  QUOTED:      'info',
  CONFIRMED:   'success',
  IN_PROGRESS: 'warning',
  COMPLETED:   'secondary',
  CANCELLED:   'danger',
};

const STATUS_COLORS: Record<string, string> = {
  INQUIRY:     '#6b7280',
  QUOTED:      '#3b82f6',
  CONFIRMED:   '#10b981',
  IN_PROGRESS: '#f59e0b',
  COMPLETED:   '#8b5cf6',
  CANCELLED:   '#ef4444',
};

/* ── Premium metric card ── */
function MetricCard({
  icon: Icon,
  value,
  label,
  sub,
  gradientFrom,
  gradientTo,
  onClick,
  index = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
  sub?: string;
  gradientFrom: string;
  gradientTo: string;
  onClick?: () => void;
  index?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-3xl p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl w-full animate-fade-in"
      style={{
        background: 'var(--surface-0)',
        border: '1px solid var(--border)',
        animationDelay: `${index * 80}ms`,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = gradientFrom + '55';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 20px 60px ${gradientFrom}18, 0 4px 16px rgba(0,0,0,0.08)`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';
      }}
    >
      {/* Top accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-0.5 rounded-t-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})` }}
      />

      {/* Glow blob behind icon */}
      <div
        className="absolute top-4 right-4 w-20 h-20 rounded-full opacity-10 group-hover:opacity-20 transition-opacity duration-300"
        style={{ background: `radial-gradient(circle, ${gradientFrom}, transparent 70%)` }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div
          className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform duration-300 group-hover:scale-110"
          style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
        <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-40 transition-opacity shrink-0 mt-0.5" style={{ color: gradientFrom }} />
      </div>

      <div className="mt-4">
        <p className="text-3xl font-black tracking-tight tabular-nums" style={{ color: 'var(--foreground)' }}>
          {value}
        </p>
        <p className="text-sm font-semibold mt-1" style={{ color: 'var(--foreground-secondary)' }}>{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--foreground-tertiary)' }}>{sub}</p>}
      </div>
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════
   Main Page
════════════════════════════════════════════════════════════════ */
export default function CustomerPortalPage() {
  const { addToast } = useToast();
  const router = useRouter();

  const [data, setData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleAuth, setIsGoogleAuth] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchAuthenticatedData = useCallback(async (token: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setError(null);

    try {
      const [bookingsRes, invoicesRes] = await Promise.all([
        axios.get(`${API_URL}/portal/bookings`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: ctrl.signal,
        }),
        axios.get(`${API_URL}/portal/invoices`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: ctrl.signal,
        }),
      ]);

      const customer =
        bookingsRes.data?.customer ||
        invoicesRes.data?.customer || { id: 'me', name: 'Your Account', phone: '' };

      setData({
        customer,
        bookings: (bookingsRes.data?.data ?? bookingsRes.data ?? []).slice(0, 5),
        invoices: (invoicesRes.data?.data ?? invoicesRes.data ?? []).slice(0, 5),
      });
      setIsGoogleAuth(true);
    } catch (err: unknown) {
      if (axios.isCancel(err)) return;
      const axiosErr = err as { response?: { status?: number } };
      if (axiosErr.response?.status === 401) {
        safeRemoveItem('customer_token');
        router.replace('/portal/login');
      } else {
        setError('Failed to load your dashboard. Check your connection and try again.');
        addToast('error', 'Failed to load your data.');
      }
    } finally {
      setLoading(false);
    }
  }, [addToast, router]);

  const fetchGuestData = useCallback(async (phone: string) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setError(null);

    try {
      const [bookingsRes, invoicesRes] = await Promise.all([
        axios.get(`${API_URL}/customer-portal/bookings`, { params: { phone }, signal: ctrl.signal }),
        axios.get(`${API_URL}/customer-portal/invoices`, { params: { phone }, signal: ctrl.signal }),
      ]);

      const customer = bookingsRes.data?.customer || {
        id: 'guest',
        name: safeGetItem('customer_guest_name') || 'Guest',
        phone,
      };

      setData({
        customer,
        bookings: (bookingsRes.data?.data ?? bookingsRes.data?.bookings ?? []).slice(0, 5),
        invoices: (invoicesRes.data?.data ?? invoicesRes.data?.invoices ?? []).slice(0, 5),
      });
    } catch (err: unknown) {
      if (axios.isCancel(err)) return;
      setError('Failed to load your dashboard. Check your connection and try again.');
      addToast('error', 'Failed to load your data.');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    const token = safeGetItem('customer_token');
    const guestPhone = safeGetItem('customer_guest_phone');

    if (token) {
      fetchAuthenticatedData(token);
    } else if (guestPhone) {
      fetchGuestData(guestPhone);
    } else {
      router.replace('/portal/login');
    }

    return () => { abortRef.current?.abort(); };
  }, [fetchAuthenticatedData, fetchGuestData, router]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    setData(null);
    const token = safeGetItem('customer_token');
    const guestPhone = safeGetItem('customer_guest_phone');
    if (token) fetchAuthenticatedData(token);
    else if (guestPhone) fetchGuestData(guestPhone);
    else router.replace('/portal/login');
  }, [fetchAuthenticatedData, fetchGuestData, router]);

  /* ── Skeleton loading ── */
  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        {/* Hero skeleton */}
        <div className="skeleton rounded-3xl h-44 w-full" />
        {/* Stats skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <div key={i} className="skeleton rounded-3xl h-32 w-full" />)}
        </div>
        {/* Content skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="skeleton rounded-3xl h-64 w-full" />
          <div className="skeleton rounded-3xl h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!data) {
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-5 px-4">
          <div
            className="h-20 w-20 rounded-3xl flex items-center justify-center"
            style={{ background: 'color-mix(in srgb, var(--danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 15%, transparent)' }}
          >
            <AlertTriangle className="h-10 w-10 text-[var(--danger)]" />
          </div>
          <div>
            <p className="font-black text-lg text-[var(--foreground)] mb-1">Failed to load overview</p>
            <p className="text-sm text-[var(--foreground-tertiary)] max-w-xs">{error}</p>
          </div>
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-90 hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      );
    }
    return null;
  }

  /* ── Derived stats ── */
  const pendingInvoices = data.invoices.filter((i) => i.status !== 'PAID');
  const totalOwed = pendingInvoices.reduce((s, i) => s + Number(i.total || 0), 0);
  const confirmedBookings = data.bookings.filter((b) => b.status === 'CONFIRMED').length;
  const inProgressCount = data.bookings.filter(b => b.status === 'IN_PROGRESS' || b.status === 'INQUIRY').length;
  const firstName = (data.customer.name || 'You').split(' ')[0];

  /* ── Combined recent activity feed ── */
  type ActivityItem =
    | { kind: 'booking'; id: string; title: string; studio: string; date: string; status: string; amount: number }
    | { kind: 'invoice'; id: string; title: string; studio: string; date: string; status: string; amount: number };

  const activity: ActivityItem[] = [
    ...data.bookings.map(b => ({
      kind: 'booking' as const,
      id: b.id,
      title: b.service.name,
      studio: b.studio?.name ?? '',
      date: b.scheduledAt,
      status: b.status,
      amount: b.service.price,
    })),
    ...data.invoices.map(inv => ({
      kind: 'invoice' as const,
      id: inv.id,
      title: `Invoice #${inv.invoiceNumber}`,
      studio: inv.studio?.name ?? '',
      date: inv.createdAt,
      status: inv.status,
      amount: Number(inv.total),
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-luxury-in">

      {/* ═══════════ HERO ═══════════ */}
      <div
        className="relative overflow-hidden rounded-3xl"
        style={{ background: 'linear-gradient(135deg, #07041a 0%, #120829 45%, #0a0818 100%)' }}
      >
        {/* Ambient layers */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-25" style={{ background: 'radial-gradient(circle, #7c3aed, transparent 65%)', transform: 'translate(25%, -35%)' }} />
          <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #db2777, transparent 65%)', transform: 'translate(-25%, 35%)' }} />
          <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(rgba(167,139,250,1) 1px, transparent 1px), linear-gradient(90deg, rgba(167,139,250,1) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        </div>

        <div className="relative z-10 p-7 sm:p-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" style={{ color: '#db2777' }} />
                <span className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  Customer Portal
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight text-white">
                Welcome back,{' '}
                <span style={{ background: 'linear-gradient(135deg, #a78bfa, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {firstName}
                </span>
              </h1>
              {data.customer.phone && (
                <p className="flex items-center gap-2 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  <Phone className="h-3.5 w-3.5" />
                  {data.customer.phone}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {/* Auth badge */}
              <div
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold"
                style={isGoogleAuth ? {
                  background: 'rgba(5,150,105,0.12)',
                  border: '1px solid rgba(5,150,105,0.25)',
                  color: '#34d399',
                } : {
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  color: 'rgba(255,255,255,0.45)',
                }}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                {isGoogleAuth ? 'Google Verified' : 'Guest Access'}
              </div>
              <Button
                size="sm"
                onClick={() => router.push('/portal/bookings')}
                className="rounded-2xl"
              >
                All Bookings
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Mini stats strip */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Sessions', value: data.bookings.length, icon: Calendar, color: '#a78bfa' },
              { label: 'Confirmed', value: confirmedBookings, icon: TrendingUp, color: '#34d399' },
              { label: 'In Progress', value: inProgressCount, icon: Activity, color: '#fbbf24' },
              { label: 'Pending Bills', value: pendingInvoices.length, icon: FileText, color: '#f472b6' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <Icon className="h-4 w-4 shrink-0" style={{ color }} />
                <div>
                  <p className="text-lg font-black leading-none text-white tabular-nums">{value}</p>
                  <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════ METRIC CARDS ═══════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          icon={Calendar}
          value={data.bookings.length}
          label="Recent Sessions"
          sub="tap to view all"
          gradientFrom="#7c3aed"
          gradientTo="#a855f7"
          onClick={() => router.push('/portal/bookings')}
          index={0}
        />
        <MetricCard
          icon={FileText}
          value={pendingInvoices.length}
          label="Pending Invoices"
          sub={pendingInvoices.length > 0 ? 'action needed' : 'all clear'}
          gradientFrom="#f59e0b"
          gradientTo="#f97316"
          onClick={() => router.push('/portal/invoices')}
          index={1}
        />
        <MetricCard
          icon={Wallet}
          value={formatCurrency(totalOwed)}
          label="Amount Due"
          sub={totalOwed > 0 ? 'outstanding balance' : 'nothing owed'}
          gradientFrom="#ef4444"
          gradientTo="#db2777"
          onClick={() => router.push('/portal/invoices')}
          index={2}
        />
      </div>

      {/* ═══════════ ACTIVITY + INVOICES ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Activity feed */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{ background: 'var(--surface-0)', border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
        >
          <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-light)' }}>
            <div className="flex items-center gap-3">
              <div
                className="h-8 w-8 rounded-xl flex items-center justify-center"
                style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}
              >
                <Activity className="h-4 w-4 text-[var(--primary)]" />
              </div>
              <div>
                <p className="font-bold text-sm text-[var(--foreground)]">Recent Activity</p>
                <p className="text-[10px] text-[var(--foreground-tertiary)]">Your latest sessions &amp; invoices</p>
              </div>
            </div>
            <button
              className="text-xs font-bold text-[var(--primary)] hover:underline underline-offset-4"
              onClick={() => router.push('/portal/bookings')}
            >
              View all →
            </button>
          </div>

          {activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div
                className="h-16 w-16 rounded-3xl flex items-center justify-center mb-4"
                style={{ background: 'color-mix(in srgb, var(--primary) 8%, transparent)' }}
              >
                <Sparkles className="h-8 w-8 text-[var(--primary)]" />
              </div>
              <p className="font-bold text-[var(--foreground)]">No activity yet</p>
              <p className="text-sm text-[var(--foreground-tertiary)] mt-1 max-w-xs">Book a session at any studio to get started.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-light)]">
              {activity.map((item, i) => {
                const dotColor = item.kind === 'booking'
                  ? STATUS_COLORS[item.status] ?? '#6b7280'
                  : item.status === 'PAID' ? '#10b981' : item.status === 'OVERDUE' ? '#ef4444' : '#f59e0b';

                return (
                  <div
                    key={`${item.kind}-${item.id}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--surface-1)] transition-colors cursor-pointer animate-fade-in"
                    style={{ animationDelay: `${i * 50}ms` }}
                    onClick={() => router.push(item.kind === 'booking' ? '/portal/bookings' : '/portal/invoices')}
                  >
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center shrink-0">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ background: dotColor, boxShadow: `0 0 8px ${dotColor}60` }} />
                    </div>

                    {/* Icon */}
                    <div
                      className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: item.kind === 'booking' ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'color-mix(in srgb, var(--warning) 8%, transparent)' }}
                    >
                      {item.kind === 'booking'
                        ? <Calendar className="h-4 w-4 text-[var(--primary)]" />
                        : <FileText className="h-4 w-4 text-[var(--warning)]" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--foreground)] truncate">{item.title}</p>
                      <p className="text-xs text-[var(--foreground-tertiary)] mt-0.5 truncate">{item.studio} · {formatDate(item.date)}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-[var(--foreground)] tabular-nums">{formatCurrency(item.amount)}</p>
                      <Badge
                        variant={STATUS_BADGE_VARIANT[item.status] ?? 'default'}
                        size="sm"
                        className="mt-1"
                      >
                        {item.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Recent Invoices card */}
          <div
            className="rounded-3xl overflow-hidden"
            style={{ background: 'var(--surface-0)', border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
          >
            <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <div className="flex items-center gap-3">
                <div
                  className="h-8 w-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'color-mix(in srgb, var(--warning) 10%, transparent)' }}
                >
                  <FileText className="h-4 w-4 text-[var(--warning)]" />
                </div>
                <div>
                  <p className="font-bold text-sm text-[var(--foreground)]">Recent Invoices</p>
                  <p className="text-[10px] text-[var(--foreground-tertiary)]">Billing &amp; payments</p>
                </div>
              </div>
              <button
                className="text-xs font-bold text-[var(--primary)] hover:underline underline-offset-4"
                onClick={() => router.push('/portal/invoices')}
              >
                View all →
              </button>
            </div>

            {data.invoices.length === 0 ? (
              <div className="py-10 text-center px-6">
                <p className="text-sm text-[var(--foreground-tertiary)]">No invoices yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-light)]">
                {data.invoices.slice(0, 3).map((inv, i) => {
                  const isOverdue = inv.status === 'OVERDUE';
                  return (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between gap-3 px-6 py-4 hover:bg-[var(--surface-1)] transition-colors animate-fade-in"
                      style={{ animationDelay: `${i * 60}ms`, borderLeft: isOverdue ? '2px solid var(--danger)' : undefined }}
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-[var(--foreground)]">#{inv.invoiceNumber}</p>
                        <p className="text-xs text-[var(--foreground-tertiary)] mt-0.5">
                          {inv.dueDate ? `Due ${formatDate(inv.dueDate)}` : formatDate(inv.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-black text-[var(--foreground)] tabular-nums">
                          {formatCurrency(Number(inv.total))}
                        </span>
                        <Badge variant={STATUS_BADGE_VARIANT[inv.status] ?? 'default'} size="sm">
                          {inv.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Account status card */}
          <div
            className="relative overflow-hidden rounded-3xl p-5"
            style={isGoogleAuth ? {
              background: 'linear-gradient(135deg, rgba(5,150,105,0.06), rgba(5,150,105,0.02))',
              border: '1px solid rgba(5,150,105,0.18)',
            } : {
              background: 'var(--surface-0)',
              border: '1px solid var(--border)',
            }}
          >
            {isGoogleAuth && (
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none opacity-20" style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)', transform: 'translate(30%, -30%)' }} />
            )}
            <div className="flex items-center gap-3">
              <div
                className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: isGoogleAuth ? 'rgba(5,150,105,0.12)' : 'var(--surface-2)' }}
              >
                <CheckCircle className={`h-5 w-5 ${isGoogleAuth ? 'text-[var(--success)]' : 'text-[var(--foreground-tertiary)]'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--foreground)]">
                  {isGoogleAuth ? 'Google Identity Verified' : 'Guest Access'}
                </p>
                <p className="text-xs text-[var(--foreground-tertiary)] mt-0.5">
                  {isGoogleAuth
                    ? 'Your account is fully secured via Google OAuth.'
                    : 'Sign in with Google for a persistent account.'}
                </p>
              </div>
              {!isGoogleAuth && (
                <Button
                  size="sm"
                  className="shrink-0 text-xs rounded-xl"
                  onClick={() => { window.location.href = `${API_URL}/auth/google`; }}
                >
                  Upgrade
                </Button>
              )}
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'My Bookings', href: '/portal/bookings', icon: Calendar, color: 'var(--primary)' },
              { label: 'Account',     href: '/portal/account',  icon: Clock,    color: 'var(--accent)' },
            ].map(({ label, href, icon: Icon, color }) => (
              <button
                key={href}
                onClick={() => router.push(href)}
                className="flex items-center gap-3 px-4 py-4 rounded-2xl text-sm font-semibold text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                style={{ background: 'var(--surface-0)', border: '1px solid var(--border)', color: 'var(--foreground-secondary)' }}
              >
                <div
                  className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `color-mix(in srgb, ${color} 10%, transparent)` }}
                >
                  <Icon className="h-4 w-4" style={{ color }} />
                </div>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
