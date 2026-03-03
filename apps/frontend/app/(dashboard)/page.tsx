'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SkeletonCard } from '@/components/ui/loading';
import { bookingsApi, customersApi, invoicesApi } from '@/lib/api';
import { formatCurrency, formatDate, getBookingStatusBadge, getInvoiceStatusBadge } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { useAuthStore } from '@/lib/auth-store';
import {
  Calendar,
  Users,
  DollarSign,
  FileText,
  TrendingUp,
  ArrowUpRight,
  ArrowRight,
  Camera,
  Plus,
  Sparkles,
  Clock,
  ChevronRight,
  Link2,
  Copy,
  QrCode,
  Palette,
  Share2,
  ExternalLink,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */
interface DashboardStats {
  totalBookings: number;
  totalCustomers: number;
  totalRevenue: number;
  pendingInvoices: number;
}
interface Booking {
  id: string | number;
  scheduledAt: string;
  bookingDate?: string;
  status: string;
  customer: { name: string };
  service: { name: string };
}
interface Invoice {
  id: number;
  invoiceNumber: string;
  totalAmount: number;
  status: string;
  dueDate: string;
  customer: { name: string };
}

/* -------------------------------------------------------------------------- */
/*  Animated counter                                                           */
/* -------------------------------------------------------------------------- */
function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const pct = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - pct, 3);
      setValue(Math.round(ease * target));
      if (pct < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return value;
}

/* -------------------------------------------------------------------------- */
/*  Stat Card                                                                 */
/* -------------------------------------------------------------------------- */
interface StatCardProps {
  title: string;
  rawValue: number;
  displayValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  glow: string;
  href?: string;
  index?: number;
  prefix?: string;
  trend?: string;
  trendUp?: boolean;
}

function StatCard({ title, rawValue, displayValue, icon: Icon, gradient, glow, href, index = 0, prefix, trend, trendUp }: StatCardProps) {
  const counted = useCountUp(rawValue);
  const shown = displayValue ?? (prefix ? prefix + counted.toLocaleString() : counted.toLocaleString());

  const inner = (
    <div
      className="group relative rounded-[var(--radius-xl)] border border-[var(--border-light)] bg-[var(--surface-0)] p-5 overflow-hidden cursor-pointer
        shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]
        hover:-translate-y-1 transition-all duration-300 ease-out"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Gradient top shimmer on hover */}
      <div
        className="absolute inset-x-0 top-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-[var(--radius-xl)]"
        style={{ background: `linear-gradient(90deg, transparent, ${glow.replace('0.4', '1')}, transparent)` }}
        aria-hidden="true"
      />
      {/* Background glow blob */}
      <div
        className="absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"
        style={{ background: glow }}
        aria-hidden="true"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-[var(--foreground-tertiary)] tracking-[0.14em] uppercase mb-1.5">
            {title}
          </p>
          <p className="text-[28px] font-extrabold text-[var(--foreground)] tracking-tight tabular-nums leading-none">
            {shown}
          </p>
          {trend && (
            <div className={`mt-2 ${trendUp ? 'trend-up' : 'trend-down'}`}>
              <TrendingUp className={`h-3 w-3 ${!trendUp && 'rotate-180'}`} />
              {trend}
            </div>
          )}
        </div>
        <div
          className="flex items-center justify-center h-11 w-11 rounded-2xl shrink-0 transition-transform duration-300 group-hover:scale-110"
          style={{ background: gradient, boxShadow: `0 4px 16px ${glow}` }}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>

      {href && (
        <div className="mt-4 flex items-center gap-1 text-[11px] font-semibold text-[var(--foreground-tertiary)] group-hover:text-[var(--primary)] transition-colors duration-200">
          <span>View all</span>
          <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
        </div>
      )}
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

/* -------------------------------------------------------------------------- */
/*  Quick Action Button                                                       */
/* -------------------------------------------------------------------------- */
function QuickAction({ label, icon: Icon, href, color }: { label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; href: string; color: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 p-4 rounded-[var(--radius-lg)] border border-[var(--border-light)] bg-[var(--surface-0)] hover:border-[var(--border-strong)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] transition-all duration-200 group"
    >
      <div
        className="h-10 w-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
        style={{ background: color + '18' }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <span className="text-xs font-semibold text-[var(--foreground-secondary)] text-center leading-tight">{label}</span>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*  Booking Page Card                                                         */
/* -------------------------------------------------------------------------- */
function BookingPageCard({ slug, studioName }: { slug?: string; studioName?: string }) {
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();
  const bookingUrl = slug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/studio/${slug}` : '';

  const handleCopy = () => {
    if (!bookingUrl) return;
    navigator.clipboard.writeText(bookingUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      addToast('error', 'Failed to copy link to clipboard');
    });
  };

  return (
    <div
      className="relative rounded-[var(--radius-2xl)] border border-violet-500/20 overflow-hidden p-5 lg:p-6"
      style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(219,39,119,0.06) 100%)' }}
    >
      {/* Subtle glow */}
      <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full opacity-10 blur-3xl" style={{ background: '#7c3aed' }} aria-hidden="true" />

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        {/* Icon */}
        <div
          className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#db2777)' }}
        >
          <Link2 className="h-6 w-6 text-white" />
        </div>

        {/* Text + URL */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h2 className="text-base font-bold text-[var(--foreground)]" style={{ fontFamily: 'var(--font-heading)' }}>
              Your Public Booking Page
            </h2>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/15 text-green-500 border border-green-500/20">
              LIVE
            </span>
          </div>
          <p className="text-xs text-[var(--foreground-tertiary)] mb-2">
            Share this link with clients so they can book {studioName ? `with ${studioName}` : 'sessions'} directly — no login required.
          </p>

          {/* URL pill */}
          {slug ? (
            <div className="flex items-center gap-2 bg-[var(--surface-1)] border border-[var(--border-light)] rounded-[var(--radius-md)] px-3 py-2 max-w-sm">
              <span className="flex-1 text-xs font-mono text-[var(--foreground-secondary)] truncate">
                /studio/{slug}
              </span>
              <button
                onClick={handleCopy}
                className="shrink-0 flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md transition-all duration-200"
                style={{ color: copied ? '#10b981' : 'var(--primary)', background: copied ? 'rgba(16,185,129,0.1)' : 'rgba(124,58,237,0.1)' }}
              >
                <Copy className="h-3 w-3" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          ) : (
            <p className="text-xs text-[var(--warning)] flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              No studio slug set — configure in Settings.
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
          {slug && (
            <a
              href={`/studio/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold text-white transition-all duration-200 hover:opacity-90 shadow-sm"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#db2777)' }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View Live
            </a>
          )}
          <Link
            href="/my-studio"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold border border-[var(--border-light)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all duration-200 bg-[var(--surface-0)]"
          >
            <QrCode className="h-3.5 w-3.5" />
            QR &amp; Share
          </Link>
          <Link
            href="/branding"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold border border-[var(--border-light)] text-[var(--foreground-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all duration-200 bg-[var(--surface-0)]"
          >
            <Palette className="h-3.5 w-3.5" />
            Branding
          </Link>
          <Link
            href="/share-links"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-semibold border border-[var(--border-light)] text-[var(--foreground-secondary)] hover:border-[var(--info)] hover:text-[var(--info)] transition-all duration-200 bg-[var(--surface-0)]"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share Links
          </Link>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Dashboard Page                                                            */
/* -------------------------------------------------------------------------- */
export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({ totalBookings: 0, totalCustomers: 0, totalRevenue: 0, pendingInvoices: 0 });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const { addToast } = useToast();

  const firstName = user?.name?.split(' ')[0] || 'there';

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const loadData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      setIsLoading(true);
      const [bookingsRes, customersRes, invoicesRes, invoiceStatsRes] = await Promise.all([
        bookingsApi.getAll({ limit: 6 }),
        customersApi.getAll({ limit: 1 }),
        invoicesApi.getAll({ limit: 6 }),
        invoicesApi.getStats(),
      ]);
      if (ctrl.signal.aborted) return;

      setRecentBookings(bookingsRes.data?.data || []);
      setStats((p) => ({
        ...p,
        totalBookings: bookingsRes.data?.meta?.total || 0,
        totalCustomers: customersRes.data?.meta?.total || 0,
      }));

      const invoiceData = invoicesRes.data?.data || [];
      setRecentInvoices(invoiceData);

      const statsData = invoiceStatsRes.data || {};
      const totalRevenue =
        statsData.totalRevenue ?? statsData.paid ??
        invoiceData.filter((i: Invoice) => i.status === 'PAID').reduce((s: number, i: Invoice) => s + (i.totalAmount || 0), 0);
      const pending = invoiceData.filter((i: Invoice) => i.status === 'SENT' || i.status === 'PARTIALLY_PAID').length;
      setStats((p) => ({ ...p, totalRevenue, pendingInvoices: pending }));
    } catch (error) {
      if ((error as { name?: string }).name === 'CanceledError') return;
      if (abortRef.current?.signal.aborted) return;
      addToast('error', 'Failed to load dashboard data');
    } finally {
      if (!abortRef.current?.signal.aborted) setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadData(); return () => abortRef.current?.abort(); }, [loadData]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-[var(--surface-2)] rounded-lg animate-pulse" />
          <div className="h-4 w-72 bg-[var(--surface-2)] rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ---- Hero Header ---- */}
      <div className="relative rounded-[var(--radius-2xl)] overflow-hidden p-6 lg:p-8"
        style={{ background: 'linear-gradient(135deg, #1a0538 0%, #3b1278 40%, #7c3aed 80%, #be185d 100%)' }}
      >
        {/* Noise */}
        <div className="absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: '256px' }}
          aria-hidden="true"
        />
        {/* Orb */}
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full opacity-20 blur-3xl" style={{ background: '#e879f9' }} aria-hidden="true" />
        <div className="absolute right-24 bottom-0 w-40 h-40 rounded-full opacity-10 blur-2xl" style={{ background: '#fbbf24' }} aria-hidden="true" />

        <div className="relative z-10 flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-yellow-300/80" />
              <span className="text-white/60 text-sm font-medium">{greet()}</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              {firstName}&apos;s Studio Dashboard
            </h1>
            <p className="mt-1.5 text-white/50 text-sm">
              Here&apos;s what&apos;s happening with{' '}
              <span className="text-white/75 font-medium">{user?.studio?.name || 'your studio'}</span> today.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/bookings?create=1"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] bg-white/15 border border-white/20 text-white text-sm font-semibold hover:bg-white/25 transition-all duration-200 backdrop-blur-sm"
            >
              <Plus className="h-4 w-4" />
              New Booking
            </Link>
            <Link
              href="/customers?create=1"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--radius-md)] bg-white text-[#3b1278] text-sm font-bold hover:bg-white/90 transition-all duration-200 shadow-lg"
            >
              <Users className="h-4 w-4" />
              Add Customer
            </Link>
          </div>
        </div>
      </div>

      {/* ---- Stat Cards ---- */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard index={0} title="Total Bookings" rawValue={stats.totalBookings}
          icon={Calendar} gradient="linear-gradient(135deg,#4f46e5,#6366f1)" glow="rgba(99,102,241,0.4)"
          href="/bookings" trend="+12% this month" trendUp />
        <StatCard index={1} title="Customers" rawValue={stats.totalCustomers}
          icon={Users} gradient="linear-gradient(135deg,#0891b2,#06b6d4)" glow="rgba(6,182,212,0.4)"
          href="/customers" trend="+8% this month" trendUp />
        <StatCard index={2} title="Revenue" rawValue={stats.totalRevenue}
          displayValue={formatCurrency(stats.totalRevenue)}
          icon={DollarSign} gradient="linear-gradient(135deg,#059669,#10b981)" glow="rgba(16,185,129,0.4)"
          href="/payments" trend="+23% this month" trendUp />
        <StatCard index={3} title="Pending Invoices" rawValue={stats.pendingInvoices}
          icon={FileText} gradient="linear-gradient(135deg,#d97706,#f59e0b)" glow="rgba(245,158,11,0.4)"
          href="/invoices"
          trend={stats.pendingInvoices > 0 ? `${stats.pendingInvoices} need attention` : 'All clear'}
          trendUp={stats.pendingInvoices === 0}
        />
      </div>

      {/* ---- Your Public Booking Page Card ---- */}
      <BookingPageCard slug={user?.studio?.slug} studioName={user?.studio?.name} />

      {/* ---- Quick Actions ---- */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--foreground-tertiary)] tracking-[0.08em] uppercase mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction label="New Booking" icon={Calendar} href="/bookings?create=1" color="#6366f1" />
          <QuickAction label="Add Customer" icon={Users} href="/customers?create=1" color="#06b6d4" />
          <QuickAction label="Create Invoice" icon={FileText} href="/invoices/new" color="#10b981" />
          <QuickAction label="Portfolio" icon={Camera} href="/portfolio" color="#db2777" />
        </div>
      </div>

      {/* ---- Recent Activity ---- */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* Recent Bookings */}
        <Card glass>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Recent Bookings</CardTitle>
                  <p className="text-xs text-[var(--foreground-tertiary)]">{recentBookings.length} shown</p>
                </div>
              </div>
              <Link href="/bookings" className="flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline transition-colors">
                View all <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <EmptyState icon={Calendar} title="No bookings yet" desc="Create your first booking to get started." />
            ) : (
              <div className="space-y-0.5">
                {recentBookings.map((b) => (
                  <Link key={b.id} href={`/bookings/${b.id}`}
                    className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] hover:bg-[var(--overlay-light)] transition-colors duration-150 group"
                  >
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-[var(--primary)]"
                      style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}>
                      {(b.customer?.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--foreground)] truncate">{b.customer?.name || 'Unknown'}</p>
                      <p className="text-xs text-[var(--foreground-tertiary)] mt-0.5 truncate flex items-center gap-1">
                        <Clock className="h-3 w-3 shrink-0" />
                        {b.service.name} · {formatDate(b.scheduledAt || b.bookingDate || '')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <Badge {...getBookingStatusBadge(b.status)} dot>{b.status}</Badge>
                      <ArrowUpRight className="h-3.5 w-3.5 text-[var(--foreground-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card glass>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#10b981,#14b8a6)' }}>
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Recent Invoices</CardTitle>
                  <p className="text-xs text-[var(--foreground-tertiary)]">{recentInvoices.length} shown</p>
                </div>
              </div>
              <Link href="/invoices" className="flex items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline transition-colors">
                View all <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentInvoices.length === 0 ? (
              <EmptyState icon={FileText} title="No invoices yet" desc="Create an invoice from a booking." />
            ) : (
              <div className="space-y-0.5">
                {recentInvoices.map((inv) => (
                  <Link key={inv.id} href={`/invoices/${inv.id}`}
                    className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] hover:bg-[var(--overlay-light)] transition-colors duration-150 group"
                  >
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'color-mix(in srgb, var(--success) 10%, transparent)' }}>
                      <FileText className="h-3.5 w-3.5 text-[var(--success)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--foreground)] truncate">{inv.invoiceNumber}</p>
                      <p className="text-xs text-[var(--foreground-tertiary)] mt-0.5 truncate">
                        {inv.customer.name} · Due {formatDate(inv.dueDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 ml-2 shrink-0">
                      <p className="text-sm font-bold text-[var(--foreground)] tabular-nums">{formatCurrency(inv.totalAmount)}</p>
                      <Badge {...getInvoiceStatusBadge(inv.status)} dot>{inv.status}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Empty State                                                               */
/* -------------------------------------------------------------------------- */
function EmptyState({ icon: Icon, title, desc }: { icon: React.ComponentType<{className?: string}>; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="h-11 w-11 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center mb-3">
        <Icon className="h-5 w-5 text-[var(--foreground-tertiary)]" />
      </div>
      <p className="text-sm font-semibold text-[var(--foreground-secondary)]">{title}</p>
      <p className="text-xs text-[var(--foreground-tertiary)] mt-1 max-w-[200px]">{desc}</p>
    </div>
  );
}
