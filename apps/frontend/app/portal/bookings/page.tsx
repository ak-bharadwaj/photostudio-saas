'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  Calendar,
  Clock,
  MapPin,
  ArrowUpRight,
  Camera,
  CheckCircle,
  Loader,
  Ban,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Filter,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const safeGetItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(key); } catch { return null; }
};

interface Booking {
  id: string;
  status: string;
  scheduledAt: string;
  customerNotes?: string;
  service: { name: string; price: number; durationMinutes: number };
  studio: { name: string; email: string; phone: string; slug: string; logoUrl?: string };
}

const STATUS_CONFIG: Record<string, {
  variant: 'default' | 'info' | 'success' | 'warning' | 'secondary' | 'danger';
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  bg: string;
  border: string;
}> = {
  INQUIRY:     { variant: 'default',   icon: MessageSquare, label: 'Inquiry',     color: '#9ca3af', bg: 'rgba(156,163,175,0.08)', border: 'rgba(156,163,175,0.2)' },
  QUOTED:      { variant: 'info',      icon: MessageSquare, label: 'Quoted',      color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',  border: 'rgba(96,165,250,0.2)' },
  CONFIRMED:   { variant: 'success',   icon: CheckCircle,   label: 'Confirmed',   color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)' },
  IN_PROGRESS: { variant: 'warning',   icon: Loader,        label: 'In Progress', color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' },
  COMPLETED:   { variant: 'secondary', icon: CheckCircle,   label: 'Completed',   color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)' },
  CANCELLED:   { variant: 'danger',    icon: Ban,           label: 'Cancelled',   color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
};

/* ── Status stepper pill ── */
const STATUS_STEPS = ['INQUIRY', 'QUOTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];

function StatusStepper({ status }: { status: string }) {
  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: '#f87171' }}>
        <Ban className="h-3 w-3" />
        Cancelled
      </div>
    );
  }
  const currentIndex = STATUS_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-1">
      {STATUS_STEPS.map((step, i) => {
        const done = i <= currentIndex;
        const active = i === currentIndex;
        return (
          <React.Fragment key={step}>
            <div
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: active ? 20 : 12,
                background: done
                  ? active
                    ? 'linear-gradient(90deg, var(--primary), var(--accent))'
                    : 'var(--primary)'
                  : 'var(--border)',
                opacity: done ? 1 : 0.35,
              }}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(() => {
    const token = safeGetItem('customer_token');
    const guestPhone = safeGetItem('customer_guest_phone');

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);

    if (token) {
      fetchWithToken(token, ctrl);
    } else if (guestPhone) {
      fetchGuest(guestPhone, ctrl);
    } else {
      router.replace('/portal/login');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  const fetchWithToken = async (token: string, ctrl: AbortController) => {
    try {
      const res = await axios.get(`${API_URL}/portal/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      setBookings(res.data?.data ?? []);
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'CanceledError') return;
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to load bookings.');
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  };

  const fetchGuest = async (phone: string, ctrl: AbortController) => {
    try {
      const res = await axios.get(`${API_URL}/customer-portal/bookings`, {
        params: { phone },
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      setBookings(res.data?.data ?? res.data?.bookings ?? []);
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'CanceledError') return;
      setError('Failed to load bookings.');
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  };

  /* ── Skeleton ── */
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
        <div className="skeleton h-20 w-full rounded-3xl" />
        <div className="skeleton h-12 w-2/3 rounded-2xl" />
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="skeleton h-36 w-full rounded-3xl" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-5 px-4">
        <div
          className="h-20 w-20 rounded-3xl flex items-center justify-center"
          style={{ background: 'color-mix(in srgb, var(--danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 15%, transparent)' }}
        >
          <AlertTriangle className="h-10 w-10 text-[var(--danger)]" />
        </div>
        <div>
          <p className="font-black text-lg text-[var(--foreground)] mb-1">Failed to load bookings</p>
          <p className="text-sm text-[var(--foreground-tertiary)] max-w-xs">{error}</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-90 hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    );
  }

  /* ── Filter bookings ── */
  const filtered = activeFilter ? bookings.filter(b => b.status === activeFilter) : bookings;
  const statusCounts = Object.fromEntries(
    Object.keys(STATUS_CONFIG).map(key => [key, bookings.filter(b => b.status === key).length])
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-luxury-in">

      {/* ── Header ── */}
      <div
        className="relative overflow-hidden rounded-3xl px-7 py-6"
        style={{ background: 'linear-gradient(135deg, #07041a 0%, #110828 60%, #080510 100%)' }}
      >
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #7c3aed, transparent 65%)', transform: 'translate(30%, -30%)' }} />
        <div className="relative z-10 flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-3.5 w-3.5" style={{ color: '#db2777' }} />
              <span className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: 'rgba(255,255,255,0.3)' }}>My Sessions</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">Booking History</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {bookings.length} total sessions across all studios
            </p>
          </div>
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-black tabular-nums shrink-0"
            style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa' }}
          >
            <Calendar className="h-4 w-4" />
            {bookings.length}
          </div>
        </div>
      </div>

      {/* ── Filter pills ── */}
      {bookings.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--foreground-tertiary)]">
            <Filter className="h-3.5 w-3.5" />
            Filter:
          </div>
          <button
            onClick={() => setActiveFilter(null)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all duration-200"
            style={activeFilter === null ? {
              background: 'linear-gradient(135deg, var(--primary), var(--accent))',
              color: 'white',
              boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
            } : {
              background: 'var(--surface-1)',
              color: 'var(--foreground-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            All ({bookings.length})
          </button>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = statusCounts[key] ?? 0;
            if (count === 0) return null;
            return (
              <button
                key={key}
                onClick={() => setActiveFilter(activeFilter === key ? null : key)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all duration-200"
                style={activeFilter === key ? {
                  background: cfg.color + '22',
                  color: cfg.color,
                  border: `1px solid ${cfg.color}44`,
                } : {
                  background: 'var(--surface-1)',
                  color: 'var(--foreground-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.color }} />
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* ── Bookings list ── */}
      {bookings.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 text-center rounded-3xl"
          style={{ background: 'var(--surface-0)', border: '1.5px dashed var(--border-strong)' }}
        >
          <div
            className="h-24 w-24 rounded-3xl flex items-center justify-center mb-5"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(219,39,119,0.08))' }}
          >
            <Camera className="h-12 w-12 text-[var(--primary)]" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-black text-[var(--foreground)] mb-2">No bookings yet</h3>
          <p className="text-sm text-[var(--foreground-tertiary)] max-w-xs">
            Visit a studio&apos;s booking page to schedule your first session.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center rounded-3xl" style={{ background: 'var(--surface-0)', border: '1px solid var(--border)' }}>
          <p className="text-[var(--foreground-tertiary)] text-sm">No bookings match this filter.</p>
          <button onClick={() => setActiveFilter(null)} className="mt-3 text-sm font-bold text-[var(--primary)] hover:underline">
            Clear filter
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((booking, index) => {
            const cfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.INQUIRY;
            const StatusIcon = cfg.icon;
            const isActive = booking.status === 'CONFIRMED' || booking.status === 'IN_PROGRESS';

            return (
              <div
                key={booking.id}
                className="group relative overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:-translate-y-0.5 animate-fade-in"
                style={{
                  background: 'var(--surface-0)',
                  border: `1px solid var(--border)`,
                  animationDelay: `${index * 60}ms`,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 16px 48px rgba(0,0,0,0.1), 0 0 0 1px ${cfg.color}22`;
                  (e.currentTarget as HTMLDivElement).style.borderColor = cfg.color + '33';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.05)';
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
                }}
              >
                {/* Left accent stripe */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-l-3xl"
                  style={{ background: `linear-gradient(180deg, ${cfg.color}, ${cfg.color}44)` }}
                />

                {/* Active glow */}
                {isActive && (
                  <div
                    className="absolute top-0 right-0 w-40 h-40 rounded-full pointer-events-none opacity-[0.06]"
                    style={{ background: `radial-gradient(circle, ${cfg.color}, transparent 70%)`, transform: 'translate(30%, -30%)' }}
                  />
                )}

                <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                  {/* Service icon */}
                  <div
                    className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                  >
                    <Camera className="h-7 w-7" style={{ color: cfg.color }} strokeWidth={1.5} />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex flex-wrap items-start gap-2 justify-between">
                      <div>
                        <h3 className="font-black text-[var(--foreground)] text-base leading-tight">
                          {booking.service?.name ?? 'Service'}
                        </h3>
                        <p className="text-xs text-[var(--foreground-tertiary)] mt-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {booking.studio?.name ?? ''}
                        </p>
                      </div>
                      <Badge variant={cfg.variant} size="sm" className="shrink-0">
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {cfg.label}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-[var(--foreground-tertiary)]">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-[var(--primary)]" />
                        {formatDate(booking.scheduledAt)}
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <Clock className="h-3.5 w-3.5 text-[var(--accent)]" />
                        {booking.service?.durationMinutes} min
                      </span>
                    </div>

                    {/* Progress stepper */}
                    <div className="flex items-center justify-between gap-4">
                      <StatusStepper status={booking.status} />
                      <a
                        href={`/studio/${booking.studio?.slug}`}
                        className="flex items-center gap-1 text-xs font-bold transition-all sm:opacity-0 sm:group-hover:opacity-100 hover:underline underline-offset-4"
                        style={{ color: 'var(--primary)' }}
                        aria-label={`Book ${booking.service?.name ?? 'this service'} again`}
                      >
                        Book again
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    </div>

                    {booking.customerNotes && (
                      <div
                        className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs italic"
                        style={{ background: 'var(--surface-1)', border: '1px solid var(--border-light)', color: 'var(--foreground-tertiary)' }}
                      >
                        <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[var(--foreground-tertiary)]" />
                        &ldquo;{booking.customerNotes}&rdquo;
                      </div>
                    )}
                  </div>

                  {/* Price */}
                  <div className="shrink-0 text-right sm:text-right flex sm:flex-col items-center sm:items-end gap-3">
                    <p className="text-2xl font-black text-[var(--foreground)] tabular-nums">
                      {formatCurrency(booking.service?.price ?? 0)}
                    </p>
                    <span
                      className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full"
                      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                    >
                      {booking.service?.durationMinutes}min
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
