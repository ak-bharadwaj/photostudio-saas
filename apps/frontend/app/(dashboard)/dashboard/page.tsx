'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
  Zap,
  Layout,
  Activity,
  Command,
  Maximize2
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
/*  Power-User Metric Slot                                                    */
/* -------------------------------------------------------------------------- */
function MetricSlot({ label, value, trend, trendUp, index = 0 }: { label: string; value: string | number; trend?: string; trendUp?: boolean; index?: number }) {
  return (
    <div className="p-6 border-r border-b border-border/40 last:border-r-0 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
      <p className="text-[10px] font-black uppercase tracking-[.2em] text-foreground-tertiary mb-3 flex items-center gap-2">
        <Activity className="h-3 w-3" /> {label}
      </p>
      <div className="flex items-end justify-between">
        <h3 className="text-4xl font-black tracking-tighter tabular-nums leading-none">{value}</h3>
        {trend && (
          <span className={`text-[10px] font-black px-2 py-0.5 rounded ${trendUp ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
            {trend}
          </span>
        )}
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
  const { addToast } = useToast();

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [bookingsRes, customersRes, invoicesRes, invoiceStatsRes] = await Promise.all([
        bookingsApi.getAll({ limit: 6 }),
        customersApi.getAll({ limit: 1 }),
        invoicesApi.getAll({ limit: 6 }),
        invoicesApi.getStats(),
      ]);

      setRecentBookings(bookingsRes.data?.data || []);
      const statsData = invoiceStatsRes.data || {};

      setStats({
        totalBookings: bookingsRes.data?.meta?.total || 0,
        totalCustomers: customersRes.data?.meta?.total || 0,
        totalRevenue: statsData.totalRevenue ?? 0,
        pendingInvoices: statsData.totalInvoices - statsData.paidInvoices, // All non-paid invoices
      });
      setRecentInvoices(invoicesRes.data?.data || []);
    } catch (error) {
      console.error('Dashboard load failed', error);
      addToast('error', 'Failed to synchronize dashboard telemetry');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => { loadData(); }, [loadData]);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-8 space-y-8">
        <div className="h-12 w-64 skeleton" />
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 border border-border/40 rounded-2xl overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 skeleton m-2" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-96 skeleton" />
          <div className="h-96 skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8 space-y-8 sm:space-y-12 animate-cinematic">

      {/* ── POWER-USER HEADER ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-primary shadow-glow-primary animate-pulse" />
            <span className="text-[10px] font-black tracking-[.4em] uppercase text-foreground-tertiary hidden sm:block">PARTNER COMMAND CENTER / v2.4</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tighter leading-none" style={{ fontFamily: 'var(--font-heading)' }}>
            Welcome, <span className="text-outline-luxury">{user?.name?.split(' ')[0].toUpperCase()}</span>.
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/settings">
            <Button variant="outline" size="sm" className="rounded-full px-4 sm:px-6 border-border-strong text-[10px] font-black group">
              <Command className="h-3 w-3 mr-2 group-hover:rotate-12 transition-transform" /> <span className="hidden sm:inline">COMMANDS</span><span className="sm:hidden">Settings</span>
            </Button>
          </Link>
          <Link href="/bookings?create=1">
            <Button variant="primary" size="sm" className="rounded-full px-5 sm:px-8 shadow-glow-primary text-[10px] font-black tracking-widest">
              <span className="hidden sm:inline">INITIATE BOOKING </span><span className="sm:hidden">New</span><Plus className="ml-1 sm:ml-2 h-4 w-4" strokeWidth={3} />
            </Button>
          </Link>
        </div>
      </header>

      {/* ── TELEMETRY GRID ── */}
      <section className="border border-border/60 rounded-[40px] overflow-hidden bg-surface-0 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricSlot label="Total Bookings" value={stats.totalBookings} index={0} />
        <MetricSlot label="Active Customers" value={stats.totalCustomers} index={1} />
        <MetricSlot label="Global Revenue" value={formatCurrency(stats.totalRevenue)} index={2} />
        <MetricSlot label="System Alerts" value={stats.pendingInvoices} index={3} />
      </section>

      {/* ── CORE OPERATIONS GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

        {/* LEFT: BOOKINGS LOG */}
        <div className="lg:col-span-12 xl:col-span-8 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xs font-black tracking-[.3em] uppercase text-foreground-tertiary flex items-center gap-3">
              <Calendar className="h-4 w-4 text-primary" /> UPCOMING BOOKINGS
            </h2>
            <Link href="/bookings" className="text-[10px] font-black text-primary hover:underline underline-offset-4 tracking-tighter">VIEW ALL</Link>
          </div>

          <div className="border border-border/40 rounded-[32px] overflow-hidden bg-surface-0">
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/40 bg-surface-1">
                    <th className="px-6 py-5 text-[10px] font-black tracking-widest text-foreground-tertiary">CLIENT</th>
                    <th className="px-6 py-5 text-[10px] font-black tracking-widest text-foreground-tertiary">SERVICE</th>
                    <th className="px-6 py-5 text-[10px] font-black tracking-widest text-foreground-tertiary">SCHEDULED</th>
                    <th className="px-6 py-5 text-[10px] font-black tracking-widest text-foreground-tertiary">STATUS</th>
                    <th className="px-6 py-5 text-[10px] font-black tracking-widest text-foreground-tertiary text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {recentBookings.map((b) => (
                    <tr key={b.id} className="group hover:bg-surface-1/50 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-surface-2 flex items-center justify-center font-black text-xs text-primary">{b.customer?.name?.[0]}</div>
                          <span className="text-sm font-bold tracking-tight">{b.customer?.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 font-medium text-sm text-foreground-secondary">{b.service.name}</td>
                      <td className="px-6 py-5 text-xs font-black text-foreground-tertiary tabular-nums">{formatDate(b.scheduledAt)}</td>
                      <td className="px-6 py-5">
                        <Badge variant="outline" className="rounded-full text-[10px] px-3 font-bold border-primary/20 text-primary bg-primary/5">{b.status}</Badge>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Link href={`/bookings/${b.id}`}>
                          <Button variant="ghost" size="sm" className="rounded-xl h-8 w-8 p-0 hover:bg-primary hover:text-white transition-all"><ChevronRight className="h-4 w-4" /></Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile card list (Bookings) */}
            <div className="sm:hidden divide-y divide-border/20">
              {recentBookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between gap-3 px-4 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 shrink-0 rounded-lg bg-surface-2 flex items-center justify-center font-black text-xs text-primary">{b.customer?.name?.[0]}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{b.customer?.name}</p>
                      <p className="text-xs text-foreground-tertiary truncate">{b.service.name} · {formatDate(b.scheduledAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="rounded-full text-[10px] px-2 font-bold border-primary/20 text-primary bg-primary/5">{b.status}</Badge>
                    <Link href={`/bookings/${b.id}`}>
                      <Button variant="ghost" size="sm" className="rounded-xl h-8 w-8 p-0"><ChevronRight className="h-4 w-4" /></Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between px-2 mt-12">
            <h2 className="text-xs font-black tracking-[.3em] uppercase text-foreground-tertiary flex items-center gap-3">
              <FileText className="h-4 w-4 text-primary" /> RECENT INVOICES
            </h2>
            <Link href="/invoices" className="text-[10px] font-black text-primary hover:underline underline-offset-4 tracking-tighter">VIEW ALL</Link>
          </div>

          <div className="border border-border/40 rounded-[32px] overflow-hidden bg-surface-0">
            {/* Desktop table (Invoices) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/40 bg-surface-1">
                    <th className="px-6 py-5 text-[10px] font-black tracking-widest text-foreground-tertiary">INV #</th>
                    <th className="px-6 py-5 text-[10px] font-black tracking-widest text-foreground-tertiary">CLIENT</th>
                    <th className="px-6 py-5 text-[10px] font-black tracking-widest text-foreground-tertiary">AMOUNT</th>
                    <th className="px-6 py-5 text-[10px] font-black tracking-widest text-foreground-tertiary">STATUS</th>
                    <th className="px-6 py-5 text-[10px] font-black tracking-widest text-foreground-tertiary text-right">DATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id} className="group hover:bg-surface-1/50 transition-colors cursor-pointer" onClick={() => window.location.href = `/invoices/${inv.id}`}>
                      <td className="px-6 py-5 font-bold text-sm text-primary">{inv.invoiceNumber}</td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-bold tracking-tight">{inv.customer?.name}</span>
                      </td>
                      <td className="px-6 py-5 font-black text-sm tabular-nums">{formatCurrency(inv.totalAmount)}</td>
                      <td className="px-6 py-5">
                        <Badge {...getInvoiceStatusBadge(inv.status)} className="rounded-full text-[10px] px-3 font-bold">{inv.status}</Badge>
                      </td>
                      <td className="px-6 py-5 text-xs font-black text-foreground-tertiary tabular-nums text-right">{formatDate(inv.dueDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile card list (Invoices) */}
            <div className="sm:hidden divide-y divide-border/20">
              {recentInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between gap-3 px-4 py-4" onClick={() => window.location.href = `/invoices/${inv.id}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-primary">{inv.invoiceNumber}</p>
                    <p className="text-xs font-medium truncate">{inv.customer?.name} · {formatCurrency(inv.totalAmount)}</p>
                  </div>
                  <Badge {...getInvoiceStatusBadge(inv.status)} className="rounded-full text-[10px] px-2 font-bold">{inv.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: CONTROL PANEL */}
        <div className="lg:col-span-12 xl:col-span-4 space-y-6">
          <h2 className="text-xs font-black tracking-[.3em] uppercase text-foreground-tertiary flex items-center gap-3 px-2">
            <Layout className="h-4 w-4 text-accent" /> SYSTEM CONTROLS
          </h2>

          <div className="grid grid-cols-1 gap-4">
            <div className="card-luxury bg-black text-white p-8 border-none relative overflow-hidden group h-48 flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700">
                <Zap className="h-20 w-20 text-primary fill-primary" />
              </div>
              <div>
                <span className="text-[10px] font-black tracking-[.2em] text-white/40 uppercase">MARKETPLACE STATUS</span>
                <h3 className="text-2xl font-black mt-2">Go Global.</h3>
              </div>
              <Link href="/my-studio">
                <Button variant="outline" size="sm" className="rounded-full border-white/20 text-white hover:bg-white hover:text-black text-[10px] font-black w-fit">
                  MANAGE PUBLIC PROFILE <ArrowRight className="ml-2 h-3 w-3" />
                </Button>
              </Link>
            </div>

            <div className="border border-border/40 rounded-[32px] p-8 space-y-8 bg-surface-0 shadow-sm">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-foreground-tertiary uppercase tracking-widest">RAPID ACTIONS</p>
                <p className="text-xs font-medium text-foreground-tertiary">Frequent operational workflows</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <QuickActionButton icon={Users} label="ADD CLIENT" href="/customers?create=1" />
                <QuickActionButton icon={FileText} label="BILLING" href="/invoices/new" />
                <QuickActionButton icon={Share2} label="SHARE LINK" href="/share-links" />
                <QuickActionButton icon={Maximize2} label="PORTFOLIO" href="/portfolio" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function QuickActionButton({ icon: Icon, label, href }: { icon: any, label: string, href: string }) {
  return (
    <Link href={href} className="flex flex-col items-center justify-center p-6 border border-border/40 rounded-3xl hover:border-primary group transition-all">
      <div className="h-10 w-10 rounded-2xl bg-surface-1 flex items-center justify-center mb-3 group-hover:bg-primary transition-all">
        <Icon className="h-4 w-4 text-foreground-tertiary group-hover:text-white" />
      </div>
      <span className="text-[10px] font-black tracking-tighter text-foreground-tertiary group-hover:text-primary">{label}</span>
    </Link>
  )
}

function Share2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}
