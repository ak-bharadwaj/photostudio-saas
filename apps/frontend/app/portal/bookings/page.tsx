'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { portalApi } from '@/lib/api';
import axios from 'axios';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
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
  Star,
  X,
  Heart,
  Building2
} from 'lucide-react';
import { useWishlist } from '@/context/wishlist-context';
import { useToast } from '@/components/ui/toast';

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
  vision?: string;
  moodboardUrl?: string;
  quoteAmount?: number;
  quoteNotes?: string;
  quoteRejectionNotes?: string;
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
  INQUIRY: { variant: 'default', icon: MessageSquare, label: 'Inquiry', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.3)' },
  QUOTED: { variant: 'info', icon: MessageSquare, label: 'Quoted', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)' },
  CONFIRMED: { variant: 'success', icon: CheckCircle, label: 'Confirmed', color: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' },
  IN_PROGRESS: { variant: 'warning', icon: Loader, label: 'In Progress', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  COMPLETED: { variant: 'secondary', icon: CheckCircle, label: 'Completed', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.3)' },
  CANCELLED: { variant: 'danger', icon: Ban, label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' },
};

/* ── Status stepper pill ── */
const STATUS_STEPS = ['INQUIRY', 'QUOTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];

function StatusStepper({ status }: { status: string }) {
  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-destructive">
        <Ban className="h-3 w-3" />
        Protocol Aborted
      </div>
    );
  }
  const currentIndex = STATUS_STEPS.indexOf(status);
  return (
    <div className="flex items-center gap-1.5">
      {STATUS_STEPS.map((step, i) => {
        const done = i <= currentIndex;
        const active = i === currentIndex;
        return (
          <div
            key={step}
            className={`h-1.5 rounded-full transition-all duration-700 ${active ? 'w-10 bg-primary shadow-glow-primary' : done ? 'w-5 bg-primary/60' : 'w-5 bg-border-strong'}`}
          />
        );
      })}
    </div>
  );
}

export default function BookingsPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [reviewingBooking, setReviewingBooking] = useState<Booking | null>(null);
  const [briefingBooking, setBriefingBooking] = useState<Booking | null>(null);
  const [visionText, setVisionText] = useState('');
  const [moodboardUrl, setMoodboardUrl] = useState('');
  const [isUpdatingBrief, setIsUpdatingBrief] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [quotingBooking, setQuotingBooking] = useState<Booking | null>(null);
  const [quoteAction, setQuoteAction] = useState<'accept' | 'reject' | 'negotiate' | null>(null);
  const [quoteNotes, setQuoteNotes] = useState('');
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback((silent = false) => {
    const token = safeGetItem('accessToken');
    const guestPhone = safeGetItem('customer_guest_phone');

    if (!silent) {
      abortRef.current?.abort();
      setLoading(true);
    }
    
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setError(null);

    if (token) {
      fetchWithToken(token, ctrl, silent);
    } else if (guestPhone) {
      fetchGuest(guestPhone, safeGetItem('customer_guest_email'), ctrl, silent);
    } else {
      router.replace('/portal/login');
    }
     
  }, [router]);

  useEffect(() => {
    load();
    
    // Auto-refresh every 30 seconds for "real-time" experience without manual reload
    const interval = setInterval(() => {
      load(true);
    }, 30000);

    return () => {
      abortRef.current?.abort();
      clearInterval(interval);
    };
  }, [load]);

  const fetchWithToken = async (token: string, ctrl: AbortController, silent = false) => {
    try {
      const res = await axios.get(`${API_URL}/portal/bookings`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      setIsGuest(false);
      setBookings(res.data?.data ?? []);
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'CanceledError') return;
      const e = err as { response?: { data?: { message?: string } } };
      if (!silent) setError(e.response?.data?.message || 'Failed to load bookings.');
    } finally {
      if (!ctrl.signal.aborted && !silent) setLoading(false);
    }
  };

  const fetchGuest = async (phone: string, email: string | null, ctrl: AbortController, silent = false) => {
    try {
      const res = await axios.get(`${API_URL}/customer-portal/bookings`, {
        params: { phone, email: email || '' },
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      setIsGuest(true);
      setBookings(res.data?.data ?? res.data?.bookings ?? []);
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'CanceledError') return;
      if (!silent) setError('Failed to load bookings.');
    } finally {
      if (!ctrl.signal.aborted && !silent) setLoading(false);
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
          onClick={() => load()}
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

  const handleSubmitReview = async () => {
    if (!reviewingBooking) return;
    setIsSubmittingReview(true);
    try {
      await portalApi.createReview(reviewingBooking.id, {
        rating: reviewRating,
        comment: reviewComment
      });
      // Refresh bookings to reflect reviewed status (if we track it)
      setReviewingBooking(null);
      setReviewComment('');
      setReviewRating(5);
    } catch (err) {
      console.error('Failed to submit review', err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleUpdateBrief = async () => {
    if (!briefingBooking) return;
    setIsUpdatingBrief(true);
    try {
      // We'll use the bookings update API (mocking the metadata update if not directly supported)
      // For this SaaS, we can use the customer portal PATCH for booking details
      await axios.patch(`${API_URL}/portal/bookings/${briefingBooking.id}/metadata`, {
        vision: visionText,
        moodboardUrl: moodboardUrl
      }, {
        headers: { Authorization: `Bearer ${safeGetItem('accessToken')}` }
      });
      setBriefingBooking(null);
      load();
    } catch (err) {
      console.error('Failed to update booking details', err);
    } finally {
      setIsUpdatingBrief(false);
    }
  };

  const handleQuoteAction = async () => {
    if (!quotingBooking || !quoteAction) return;
    setIsSubmittingQuote(true);
    try {
      if (quoteAction === 'accept') {
        await portalApi.acceptQuote(quotingBooking.id);
        addToast('success', 'Quote accepted! Your booking is now confirmed.');
      } else if (quoteAction === 'reject') {
        await portalApi.rejectQuote(quotingBooking.id, quoteNotes);
        addToast('success', 'Quote rejected.');
      } else if (quoteAction === 'negotiate') {
        await portalApi.negotiateQuote(quotingBooking.id, quoteNotes);
        addToast('success', 'Negotiation request sent to the partner.');
      }
      setQuotingBooking(null);
      setQuoteAction(null);
      setQuoteNotes('');
      load();
    } catch (err) {
      console.error('Quote action failed', err);
      addToast('error', 'Failed to process quote action');
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-luxury-in">

      {/* ── Header ── */}
      <div
        className="relative overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] px-6 sm:px-10 py-8 sm:py-12 border border-white/5"
        style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)' }}
      >
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[100px] rounded-full -z-10 animate-pulse-soft" />
        <div className="absolute -bottom-10 -left-10 text-[15vw] font-black text-white/[0.02] select-none leading-none -z-10">ACTIVITY</div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Badge className="bg-primary/20 text-primary border-primary/30 py-0.5 px-3 rounded-lg font-black tracking-widest uppercase text-[9px]">
                COLLECTION REGISTRY
              </Badge>
              <div className="h-px w-8 bg-white/20" />
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tighter text-white leading-none" style={{ fontFamily: 'var(--font-heading)' }}>
              JOURNEY <span className="text-primary italic">LOG.</span>
            </h1>
            <p className="text-sm text-white/40 font-medium max-w-sm">
              Every interaction and feedback, archived.
            </p>
          </div>
          <div className="glass-ultra px-5 sm:px-8 py-4 sm:py-5 flex items-center gap-4 border-white/10 self-start sm:self-auto">
            <div className="h-9 sm:h-10 w-9 sm:w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Calendar className="h-4 sm:h-5 w-4 sm:w-5 text-primary" />
            </div>
            <div>
              <p className="text-[9px] font-black text-white/30 tracking-widest uppercase mb-0.5">TOTAL BOOKINGS</p>
              <p className="text-2xl font-black text-white tabular-nums leading-none">{bookings.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter pills ── */}
      {bookings.length > 0 && (
        <div className="flex flex-wrap gap-3 items-center px-2">
          <div className="text-[11px] font-black text-foreground-tertiary tracking-[0.2em] uppercase mr-2">
            Protocol Filter:
          </div>
          <button
            onClick={() => setActiveFilter(null)}
            className={`px-6 py-2.5 rounded-full text-[11px] font-black tracking-widest uppercase transition-all duration-500 border ${activeFilter === null
              ? 'bg-primary text-background border-primary shadow-glow-primary'
              : 'bg-white/5 text-foreground-tertiary border-white/5 hover:bg-white/10'
              }`}
          >
            ALL
          </button>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = statusCounts[key] ?? 0;
            if (count === 0) return null;
            return (
              <button
                key={key}
                onClick={() => setActiveFilter(activeFilter === key ? null : key)}
                className={`px-6 py-2.5 rounded-full text-[11px] font-black tracking-widest uppercase transition-all duration-500 border ${activeFilter === key
                  ? 'bg-foreground text-background border-foreground shadow-lg'
                  : 'bg-white/5 text-foreground-tertiary border-white/5 hover:bg-white/10'
                  }`}
              >
                {cfg.label}
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
            <Building2 className="h-12 w-12 text-[var(--primary)]" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-black text-[var(--foreground)] mb-2">No bookings yet</h3>
          <p className="text-sm text-[var(--foreground-tertiary)] max-w-xs">
            Visit a partner&apos;s page to schedule your first engagement.
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
        <div className="space-y-6 stagger-children">
          {filtered.map((booking, index) => {
            const cfg = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.INQUIRY;
            const StatusIcon = cfg.icon;
            const isCompleted = booking.status === 'COMPLETED';

            return (
              <div
                key={booking.id}
                className="avant-garde-card group p-0 overflow-hidden bg-surface-1 border-border hover:border-primary/30 transition-all duration-700"
              >
                <div className="flex flex-col lg:flex-row">
                  {/* Left branding stripe - visible only on lg+ */}
                  <div
                    className="w-1.5 shrink-0 hidden lg:block"
                    style={{ background: cfg.color }}
                  />
                  {/* Top branding bar - visible on mobile only */}
                  <div
                    className="h-1 w-full lg:hidden"
                    style={{ background: cfg.color }}
                  />

                  <div className="flex-1 p-5 sm:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 sm:mb-10">
                      <div className="flex gap-4">
                        <div
                          className="h-14 w-14 sm:h-20 sm:w-20 rounded-2xl sm:rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-2xl transition-transform duration-700 group-hover:scale-105"
                          style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                        >
                          <Building2 className="h-7 w-7 sm:h-10 sm:w-10" style={{ color: cfg.color }} strokeWidth={1} />
                        </div>
                        <div className="space-y-1 sm:space-y-2">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Badge className="bg-primary/10 text-primary border-transparent py-0.5 px-2 sm:px-3 rounded-lg font-black tracking-widest uppercase text-[8px]">
                              {booking.id.slice(0, 8)}
                            </Badge>
                            <span className="text-[11px] font-black text-foreground-tertiary tracking-widest uppercase hidden sm:inline">/ BOOKING ID</span>
                          </div>
                          <h3 className="text-xl sm:text-3xl font-black tracking-tighter leading-tight group-hover:text-primary transition-colors">
                            {booking.service?.name}
                          </h3>
                          <p className="text-[11px] font-black text-foreground-tertiary tracking-widest uppercase flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-primary" /> {booking.studio?.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex sm:flex-col sm:items-end items-center justify-between gap-2 sm:gap-3 sm:text-right">
                        <div className="flex flex-col items-end gap-1">
                          <div
                            className="px-3 sm:px-5 py-1.5 sm:py-2 rounded-full text-[11px] font-black tracking-widest uppercase flex items-center gap-2"
                            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                          >
                            <StatusIcon className="h-3 w-3" /> {cfg.label}
                          </div>
                          {booking.quoteRejectionNotes && (
                            <Badge variant="warning" className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider animate-pulse bg-amber-500 text-white border-none shadow-md">
                              Negotiating
                            </Badge>
                          )}
                        </div>
                        <div className="text-2xl sm:text-3xl font-black tracking-tighter tabular-nums">
                          {formatCurrency(booking.quoteAmount ?? booking.service?.price ?? 0)}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 mb-6 sm:mb-10 p-5 sm:p-8 bg-surface-2/50 rounded-[1.5rem] sm:rounded-[2rem] border border-border/30">
                      <div>
                        <p className="text-[9px] font-black text-foreground-tertiary tracking-widest uppercase mb-2">APPOINTMENT</p>
                        <p className="text-sm font-black tracking-tight">{formatDate(booking.scheduledAt)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-foreground-tertiary tracking-widest uppercase mb-2">DURATION</p>
                        <p className="text-sm font-black tracking-tight">{booking.service?.durationMinutes} MIN</p>
                      </div>
                      <div className="lg:col-span-2">
                        <p className="text-[9px] font-black text-foreground-tertiary tracking-widest uppercase mb-3">PROTOCOL PROGRESS</p>
                        <StatusStepper status={booking.status} />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-5 sm:pt-8 border-t border-border/50">
                      <div className="flex items-center gap-4">
                        {isCompleted ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-primary" />
                            <span className="text-[11px] font-black tracking-widest uppercase text-foreground-tertiary">Booking Archival Complete</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                            <span className="text-[11px] font-black tracking-widest uppercase text-foreground-tertiary">Real-time Engagement Active</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                        {isCompleted ? (
                          !isGuest ? (
                            <Button
                              variant="primary"
                              className="btn-luxury h-12 flex-1 sm:flex-none px-4 sm:px-8 rounded-xl text-[11px] font-black tracking-widest uppercase text-center"
                              onClick={() => setReviewingBooking(booking)}
                            >
                              LEAVE FEEDBACK <Star className="ml-2 h-4 w-4 fill-current hidden sm:inline-block" />
                            </Button>
                          ) : (
                            <div className="flex-1 sm:flex-none h-12 px-4 sm:px-8 rounded-xl flex items-center justify-center border border-white/10 bg-white/5">
                              <span className="text-[11px] font-black tracking-widest uppercase text-foreground-tertiary">Sign Up to Review</span>
                            </div>
                          )
                        ) : (
                          <div className="flex items-center gap-2 flex-1 sm:flex-none">
                            {booking.status === 'QUOTED' ? (
                              <div className="flex gap-2 w-full sm:w-auto">
                                  <Button
                                    variant="primary"
                                    className="h-12 flex-1 sm:px-6 rounded-xl text-[11px] font-black tracking-widest uppercase bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white"
                                    onClick={() => {
                                      setQuotingBooking(booking);
                                      setQuoteAction('accept');
                                    }}
                                  >
                                    ACCEPT
                                  </Button>
                                <Button
                                  variant="secondary"
                                  className="h-12 flex-1 sm:px-6 rounded-xl text-[11px] font-black tracking-widest uppercase"
                                  onClick={() => {
                                    setQuotingBooking(booking);
                                    setQuoteAction('negotiate');
                                  }}
                                >
                                  NEGOTIATE
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="primary"
                                className="btn-luxury h-12 flex-1 sm:flex-none px-4 sm:px-8 rounded-xl text-[11px] font-black tracking-widest uppercase"
                                onClick={() => setBriefingBooking(booking)}
                              >
                                OPEN BRIEF <Sparkles className="ml-2 h-4 w-4 hidden sm:inline-block" />
                              </Button>
                            )}
                          </div>
                        )}

                        <Button
                          variant="secondary"
                          className="h-12 w-12 shrink-0 rounded-xl flex items-center justify-center border border-border group/btn hover:bg-foreground hover:text-background transition-all"
                          onClick={() => router.push(`/portal/bookings/${booking.id}`)}
                        >
                          <ArrowUpRight className="h-5 w-5 transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── REVIEW MODAL ── */}
      {reviewingBooking && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in text-white">
          <div className="card-luxury w-full sm:max-w-md p-6 sm:p-8 bg-surface-1 border-t sm:border border-border-strong rounded-t-3xl sm:rounded-[2.5rem] animate-slide-up sm:animate-cinematic relative overflow-hidden shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            <div className="mx-auto w-12 h-1.5 bg-white/20 rounded-full mb-6 sm:hidden" />
            <div className="absolute top-4 sm:top-0 right-4 sm:right-0 sm:p-4">
              <button onClick={() => setReviewingBooking(null)} className="h-10 w-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-black tracking-[.3em] uppercase text-primary mb-2 block">HOW WAS YOUR EXPERIENCE?</span>
                <h3 className="text-2xl font-black">{reviewingBooking.service.name}</h3>
                <p className="text-xs text-foreground-tertiary">Partner: {reviewingBooking.studio.name}</p>
              </div>

              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className="h-12 w-12 flex items-center justify-center transition-all hover:scale-110"
                  >
                    <Star className={`h-8 w-8 ${star <= reviewRating ? 'fill-gold text-gold' : 'text-foreground-tertiary/20'}`} />
                  </button>
                ))}
              </div>

              <textarea
                placeholder="Share your experience (optional)"
                className="w-full h-32 bg-surface-2 border border-border rounded-2xl p-4 text-sm focus:border-primary transition-all outline-none"
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
              />

              <Button
                className="w-full h-14 rounded-full text-xs font-black tracking-[.2em]"
                variant="primary"
                disabled={isSubmittingReview}
                onClick={handleSubmitReview}
              >
                {isSubmittingReview ? 'SUBMITTING...' : 'SUBMIT TESTIMONIAL'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── SESSION BRIEFING MODAL ── */}
      {briefingBooking && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in text-white">
          <div className="card-luxury w-full sm:max-w-lg p-6 sm:p-8 bg-surface-1 border-t sm:border border-border-strong rounded-t-3xl sm:rounded-[2.5rem] animate-slide-up sm:animate-cinematic relative overflow-hidden shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            <div className="mx-auto w-12 h-1.5 bg-white/20 rounded-full mb-6 sm:hidden" />
            <div className="absolute top-4 sm:top-0 right-4 sm:right-0 sm:p-4">
              <button onClick={() => setBriefingBooking(null)} className="h-10 w-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-black tracking-[.3em] uppercase text-primary mb-2 block">COLLABORATIVE VISION</span>
                <h3 className="text-2xl font-black">Prepare Your Booking</h3>
                <p className="text-xs text-foreground-tertiary">Share specific requirements or objectives with the partner team.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest text-foreground-tertiary">Vibe & Vision</label>
                  <textarea
                    placeholder="Describe the desired aesthetic, objectives, or specific outcomes you have in mind..."
                    className="w-full h-32 bg-surface-2 border border-border rounded-xl p-4 text-sm focus:border-primary transition-all outline-none"
                    value={visionText}
                    onChange={(e) => setVisionText(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest text-foreground-tertiary">Moodboard / Pinterest URL</label>
                  <div className="relative">
                    <input
                      type="url"
                      placeholder="https://..."
                      className="w-full h-12 bg-surface-2 border border-border rounded-xl px-4 text-sm focus:border-primary transition-all outline-none"
                      value={moodboardUrl}
                      onChange={(e) => setMoodboardUrl(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  className="flex-1 h-14 rounded-full text-xs font-black tracking-[.15em] border-white/10"
                  variant="outline"
                  onClick={() => setBriefingBooking(null)}
                >
                  DISMISS
                </Button>
                <Button
                  className="flex-1 h-14 rounded-full text-xs font-black tracking-[.15em]"
                  variant="primary"
                  disabled={isUpdatingBrief}
                  onClick={handleUpdateBrief}
                >
                  {isUpdatingBrief ? 'SAVING...' : 'SAVE VISION'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── QUOTE ACTION MODAL ── */}
      {(quotingBooking && quoteAction) && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in text-white">
          <div className="card-luxury w-full sm:max-w-md p-6 sm:p-8 bg-surface-1 border-t sm:border border-border-strong rounded-t-3xl sm:rounded-[2.5rem] animate-slide-up sm:animate-cinematic relative overflow-hidden shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
            <div className="mx-auto w-12 h-1.5 bg-white/20 rounded-full mb-6 sm:hidden" />
            <div className="absolute top-4 sm:top-0 right-4 sm:right-0 sm:p-4">
              <button onClick={() => { setQuotingBooking(null); setQuoteAction(null); }} className="h-10 w-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-black tracking-[.3em] uppercase text-primary mb-2 block">
                  {quoteAction === 'accept' ? 'CONFIRM YOUR BOOKING' : quoteAction === 'negotiate' ? 'DISCUSS QUOTE' : 'REJECT QUOTE'}
                </span>
                <h3 className="text-2xl font-black">{quotingBooking.service.name}</h3>
                <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                  <p className="text-[9px] font-black text-foreground-tertiary tracking-widest uppercase mb-1">PARTNER QUOTE</p>
                  <p className="text-2xl font-black tracking-tighter">
                    {formatCurrency(quotingBooking.quoteAmount || quotingBooking.service.price)}
                  </p>
                  {quotingBooking.quoteNotes && (
                    <p className="mt-2 text-sm text-foreground-tertiary border-t border-white/5 pt-2 italic">
                      &quot;{quotingBooking.quoteNotes}&quot;
                    </p>
                  )}
                </div>
              </div>

              {(quoteAction === 'negotiate' || quoteAction === 'reject') && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-widest text-foreground-tertiary">
                    {quoteAction === 'negotiate' ? 'YOUR MESSAGE TO PARTNER' : 'REASON FOR REJECTION'}
                  </label>
                  <textarea
                    placeholder={quoteAction === 'negotiate' ? "Discuss pricing, dates, or specific requirements..." : "Please let us know why you're rejecting this quote..."}
                    className="w-full h-32 bg-surface-2 border border-border rounded-xl p-4 text-sm focus:border-primary transition-all outline-none"
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                  />
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  className="flex-1 h-14 rounded-full text-xs font-black tracking-[.15em] border-white/10"
                  variant="outline"
                  onClick={() => { setQuotingBooking(null); setQuoteAction(null); }}
                >
                  CANCEL
                </Button>
                <Button
                  className={cn(
                    "flex-1 h-14 rounded-full text-xs font-black tracking-[.15em]",
                    quoteAction === 'accept' ? "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent" :
                    quoteAction === 'reject' ? "bg-red-500 hover:bg-red-600 text-white border-transparent" : ""
                  )}
                  variant="primary"
                  disabled={isSubmittingQuote || (quoteAction === 'reject' && !quoteNotes)}
                  onClick={handleQuoteAction}
                >
                  {isSubmittingQuote ? 'PROCESSING...' : quoteAction === 'accept' ? 'CONFIRM & BOOK' : quoteAction === 'negotiate' ? 'SEND REQUEST' : 'CONFIRM REJECTION'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
