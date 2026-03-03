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
      title: 'Total Studios',
      value: analytics?.studios.total || 0,
      icon: Building2,
      color: 'text-[var(--primary)]',
      bg: 'bg-[var(--primary-light)]',
    },
    {
      title: 'Active Studios',
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
      case 'ACTIVE': return <Badge variant="success" dot>{status}</Badge>;
      case 'TRIAL': return <Badge variant="info" dot>{status}</Badge>;
      case 'SUSPENDED': return <Badge variant="danger" dot>{status}</Badge>;
      case 'EXPIRED': return <Badge variant="warning" dot>{status}</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'ENTERPRISE': return <Badge variant="secondary">{tier}</Badge>;
      case 'STUDIO': return <Badge variant="info">{tier}</Badge>;
      case 'PROFESSIONAL': return <Badge variant="success">{tier}</Badge>;
      case 'STARTER': return <Badge>{tier}</Badge>;
      default: return <Badge>{tier}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        eyebrow="Admin"
        title="Platform Dashboard"
        subtitle="Overview of your Photo Studio SaaS platform"
        accentColor="violet"
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--foreground-secondary)]">{stat.title}</p>
                  <p className="mt-1 text-2xl font-bold text-[var(--foreground)]">{stat.value}</p>
                </div>
                <div className={`flex items-center justify-center h-11 w-11 rounded-[var(--radius-lg)] ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Subscription Tiers Breakdown */}
      {analytics?.studios.byTier && analytics.studios.byTier.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[var(--foreground-secondary)]" />
              Studios by Subscription Tier
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Studios */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[var(--foreground-secondary)]" />
                Recent Studios
              </CardTitle>
              <Link href="/admin/studios" className="text-sm text-[var(--primary)] hover:underline">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activities?.recentStudios?.length === 0 && (
                <p className="text-sm text-[var(--foreground-tertiary)] text-center py-4">No studios yet</p>
              )}
              {activities?.recentStudios?.map((studio) => (
                <Link
                  key={studio.id}
                  href={`/admin/studios/${studio.id}`}
                  className="flex items-center justify-between p-3 rounded-[var(--radius-md)] hover:bg-[var(--overlay-light)] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-[var(--primary-light)] flex items-center justify-center text-xs font-bold text-[var(--primary)] shrink-0">
                      {studio.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">{studio.name}</p>
                      <p className="text-xs text-[var(--foreground-tertiary)]">{formatDate(studio.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {getTierBadge(studio.subscriptionTier)}
                    {getStatusBadge(studio.status)}
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Bookings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[var(--foreground-secondary)]" />
              Recent Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activities?.recentBookings?.length === 0 && (
                <p className="text-sm text-[var(--foreground-tertiary)] text-center py-4">No bookings yet</p>
              )}
              {activities?.recentBookings?.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--surface-1)]"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">
                      {booking.customer?.name || 'Unknown Customer'}
                    </p>
                    <p className="text-xs text-[var(--foreground-tertiary)]">
                      {booking.studio?.name} &middot; {formatDate(booking.eventDate)}
                    </p>
                  </div>
                  {getStatusBadge(booking.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
