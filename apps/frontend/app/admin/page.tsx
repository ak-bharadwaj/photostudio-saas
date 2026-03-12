'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { adminApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Building2,
  Users,
  Calendar,
  IndianRupee,
  TrendingUp,
  Activity,
} from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';

interface PlatformAnalytics {
  studios: {
    total: number;
    active: number;
    byTier: { subscriptionTier: string; _count: number }[];
  };
  bookings: {
    total: number;
  };
  revenue: {
    total: number;
  };
}

interface RecentActivity {
  recentStudios: {
    id: string;
    name: string;
    email: string;
    status: string;
    subscriptionTier: string;
    createdAt: string;
  }[];
  recentBookings: {
    id: string;
    status: string;
    eventDate: string;
    createdAt: string;
    studio: { name: string };
    customer: { name: string };
  }[];
}

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
  const [activities, setActivities] = useState<RecentActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, activitiesRes] = await Promise.all([
        adminApi.getAnalytics(),
        adminApi.getActivities(10),
      ]);
      setAnalytics(analyticsRes.data);
      setActivities(activitiesRes.data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-28 w-full rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--danger)]">{error}</p>
        <button onClick={loadData} className="mt-4 text-sm text-[var(--primary)] hover:underline">
          Retry
        </button>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Partners',
      value: analytics?.studios.total || 0,
      icon: Building2,
      color: 'text-[var(--primary)]',
      bg: 'bg-[var(--primary-light)]',
    },
    {
      title: 'Active Partners',
      value: analytics?.studios.active || 0,
      icon: Activity,
      color: 'text-[var(--success)]',
      bg: 'bg-[var(--success-light)]',
    },
    {
      title: 'Total Bookings',
      value: analytics?.bookings.total || 0,
      icon: Calendar,
      color: 'text-[var(--accent)]',
      bg: 'bg-[var(--accent-light)]',
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(analytics?.revenue.total || 0),
      icon: IndianRupee,
      color: 'text-[var(--success)]',
      bg: 'bg-[var(--success-light)]',
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'CONFIRMED':
        return <Badge className="bg-primary/10 text-primary border-primary/20 py-0.5 px-3 rounded-lg font-black tracking-widest uppercase text-[8px]">{status}</Badge>;
      case 'PENDING':
      case 'TRIAL':
        return <Badge className="bg-gold/10 text-gold border-gold/20 py-0.5 px-3 rounded-lg font-black tracking-widest uppercase text-[8px]">{status}</Badge>;
      case 'SUSPENDED':
      case 'CANCELLED':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20 py-0.5 px-3 rounded-lg font-black tracking-widest uppercase text-[8px]">{status}</Badge>;
      default:
        return <Badge className="bg-foreground/10 text-foreground border-foreground/20 py-0.5 px-3 rounded-lg font-black tracking-widest uppercase text-[8px]">{status}</Badge>;
    }
  };

  const getTierBadge = (tier: string) => {
    return <Badge className="bg-foreground text-background border-transparent py-0.5 px-3 rounded-lg font-black tracking-widest uppercase text-[8px]">{tier}</Badge>;
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      {/* ── CINEMATIC OVERVIEW ── */}
      <section className="relative pt-12 pb-20 px-8 rounded-[3rem] overflow-hidden border border-white/5" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)' }}>
        <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-primary/10 blur-[130px] rounded-full -z-10 animate-pulse-soft" />
        <div className="absolute -bottom-20 -right-20 text-[20vw] font-black text-white/[0.015] select-none leading-none -z-10 tracking-tighter">PLATFORM</div>

        <div className="max-w-full mx-auto space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4 animate-cinematic">
              <div className="flex items-center gap-3">
                <Badge className="bg-primary/20 text-primary border-primary/30 py-1 px-4 rounded-full font-black tracking-[0.3em] uppercase text-[9px]">
                  SYSTEM PROTOCOL
                </Badge>
                <div className="h-px w-12 bg-white/10" />
              </div>
              <h1 className="text-6xl font-black tracking-tighter text-white leading-[0.9]">
                PLATFORM<br />
                <span className="text-primary italic">ANALYTICS.</span>
              </h1>
            </div>

            <div className="flex items-center gap-4 animate-cinematic" style={{ animationDelay: '100ms' }}>
              <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-xl">
                <Activity className="h-6 w-6 text-primary animate-pulse" />
              </div>
              <div>
                <p className="text-[10px] font-black text-white/40 tracking-widest uppercase">SYSTEM STATUS</p>
                <p className="text-lg font-black text-white">OPERATIONAL</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-cinematic" style={{ animationDelay: '200ms' }}>
            {statCards.map((stat) => (
              <div key={stat.title} className="glass-ultra p-10 border-white/5 group hover:border-primary/40 transition-all duration-700 shadow-2xl relative overflow-hidden group">
                <div className="absolute -top-4 -right-4 h-24 w-24 bg-primary/[0.03] blur-2xl rounded-full group-hover:bg-primary/10 transition-colors" />
                <div className="flex flex-col justify-between h-full gap-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black tracking-[0.3em] uppercase text-white/30 group-hover:text-white/60 transition-colors">{stat.title}</span>
                    <stat.icon className={`h-4 w-4 text-white/20 group-hover:text-primary transition-colors`} />
                  </div>
                  <div className="text-4xl font-black tracking-tighter text-white group-hover:scale-110 origin-left transition-transform duration-700 tabular-nums">
                    {stat.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subscription Tiers Breakdown */}
      {analytics?.studios.byTier && analytics.studios.byTier.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[var(--foreground-secondary)]" />
              Partners by Subscription Tier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {analytics.studios.byTier.map((tier) => (
                <div key={tier.subscriptionTier} className="text-center p-4 rounded-[var(--radius-md)] bg-[var(--surface-1)]">
                  <p className="text-2xl font-bold text-[var(--foreground)]">{tier._count}</p>
                  <p className="text-xs font-medium text-[var(--foreground-secondary)] mt-1">{tier.subscriptionTier}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Recent Partners */}
        <div className="space-y-6 animate-cinematic" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[11px] font-black tracking-[.4em] uppercase text-foreground-tertiary flex items-center gap-3">
              <Building2 className="h-4 w-4 text-primary" /> PARTNER INTAKE
            </h2>
            <Link href="/admin/studios" className="text-[10px] font-black text-primary hover:text-primary-dark transition-colors tracking-widest uppercase">
              REVENUE CENTER →
            </Link>
          </div>

          <div className="flex flex-col gap-4 stagger-children">
            {activities?.recentStudios?.length === 0 && (
              <div className="p-12 rounded-[2.5rem] border-2 border-dashed border-border/50 text-center glass-ultra">
                <p className="text-[10px] font-black text-foreground-tertiary uppercase tracking-widest">NO ASSETS DETECTED</p>
              </div>
            )}
            {activities?.recentStudios?.map((studio) => (
              <Link
                key={studio.id}
                href={`/admin/studios/${studio.id}`}
                className="group flex items-center justify-between p-6 rounded-[2rem] bg-surface-1 border border-border hover:border-primary/50 hover:bg-surface-2 transition-all duration-500 shadow-sm hover:shadow-xl"
              >
                <div className="flex items-center gap-5">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                    <span className="text-xl font-black text-primary">{studio.name.charAt(0)}</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-black tracking-tight group-hover:text-primary transition-colors leading-none mb-1">{studio.name}</h4>
                    <p className="text-[10px] font-black text-foreground-tertiary tracking-widest uppercase">{formatDate(studio.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {getTierBadge(studio.subscriptionTier)}
                  {getStatusBadge(studio.status)}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="space-y-6 animate-cinematic" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[11px] font-black tracking-[.4em] uppercase text-foreground-tertiary flex items-center gap-3">
              <Calendar className="h-4 w-4 text-primary" /> ACTIVE BOOKING FLOW
            </h2>
            <Link href="/admin/bookings" className="text-[10px] font-black text-primary hover:text-primary-dark transition-colors tracking-widest uppercase">
              LIVE MONITOR →
            </Link>
          </div>

          <div className="flex flex-col gap-4 stagger-children">
            {activities?.recentBookings?.length === 0 && (
              <div className="p-12 rounded-[2.5rem] border-2 border-dashed border-border/50 text-center glass-ultra">
                <p className="text-[10px] font-black text-foreground-tertiary uppercase tracking-widest">NO FLOW DETECTED</p>
              </div>
            )}
            {activities?.recentBookings?.map((booking) => (
              <div
                key={booking.id}
                className="group flex items-center justify-between p-6 rounded-[2rem] bg-surface-1 border border-border hover:border-primary/20 transition-all duration-500 shadow-sm"
              >
                <div className="flex items-center gap-5">
                  <div className="h-14 w-14 rounded-2xl bg-surface-2 flex items-center justify-center border border-border group-hover:bg-primary/5 transition-all">
                    <Users className="h-5 w-5 text-foreground-tertiary opacity-40 group-hover:text-primary transition-colors" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black tracking-tight leading-none mb-1">{booking.customer?.name}</h4>
                    <p className="text-[10px] font-black text-foreground-tertiary tracking-widest uppercase">{booking.studio?.name} &bull; {formatDate(booking.eventDate)}</p>
                  </div>
                </div>
                {getStatusBadge(booking.status)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
