'use client';

import { useState, useEffect, useRef } from 'react';
import { analyticsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/components/ui/toast';
import { PageHeader } from '@/components/ui/page-header';

// ─── CSS var colors for charts (theme-adaptive) ───────────────────────────────
// Recharts does not consume CSS variables natively, so we read them at runtime
function getCssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

const CHART_COLORS = [
  '#6366f1', // indigo (--primary)
  '#10b981', // emerald (--success)
  '#f59e0b', // amber (--warning)
  '#ef4444', // red (--danger)
  '#8b5cf6', // violet (--accent)
  '#ec4899', // pink
];

// ─── Data shape interfaces ─────────────────────────────────────────────────────
interface OverviewData {
  totalBookings: number;
  totalRevenue: number;
  pendingInvoices: number;
  completedBookings: number;
  cancelledBookings?: number;
}

interface RevenuePoint {
  date: string;
  revenue: number;
}

interface BookingStatusPoint {
  status: string;
  count: number;
}

interface ServicePerformancePoint {
  name: string;
  bookings: number;
  revenue: number;
}

interface CustomerInsightsData {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  totalRevenue: number;
  averageRevenuePerCustomer: number;
}

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const { addToast } = useToast();
  const abortRef = useRef<AbortController | null>(null);

  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const [bookingsStatusData, setBookingsStatusData] = useState<BookingStatusPoint[]>([]);
  const [servicePerformanceData, setServicePerformanceData] = useState<ServicePerformancePoint[]>([]);
  const [customerInsightsData, setCustomerInsightsData] = useState<CustomerInsightsData | null>(null);

  // Read CSS vars at runtime (client-side only) for Recharts stroke colors
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [successColor, setSuccessColor] = useState('#10b981');

  useEffect(() => {
    // getCssVar is safe here — we're guaranteed to be on the client
    setPrimaryColor(getCssVar('--primary', '#6366f1'));
    setSuccessColor(getCssVar('--success', '#10b981'));
  }, []);

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    loadAnalytics(ctrl);
    return () => ctrl.abort();
  }, [dateRange]);

  const loadAnalytics = async (ctrl: AbortController) => {
    try {
      setIsLoading(true);

      const endDate = new Date().toISOString();
      const startDate = new Date(
        Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000
      ).toISOString();

      const params = { startDate, endDate };

      // Fetch each independently so one failure doesn't block the rest
      const settled = await Promise.allSettled([
        analyticsApi.getOverview(params),
        analyticsApi.getRevenue(params),
        analyticsApi.getBookingsByStatus(params),
        analyticsApi.getServicePerformance(params),
        analyticsApi.getCustomerInsights(params),
      ]);

      const [overview, revenue, bookingsStatus, servicePerformance, customerInsights] = settled;

      if (ctrl.signal.aborted) return;
      if (overview.status === 'fulfilled') setOverviewData(overview.value.data);
      if (revenue.status === 'fulfilled') setRevenueData(Array.isArray(revenue.value.data) ? revenue.value.data : []);
      if (bookingsStatus.status === 'fulfilled') setBookingsStatusData(Array.isArray(bookingsStatus.value.data) ? bookingsStatus.value.data : []);
      if (servicePerformance.status === 'fulfilled') setServicePerformanceData(Array.isArray(servicePerformance.value.data) ? servicePerformance.value.data : []);
      if (customerInsights.status === 'fulfilled') setCustomerInsightsData(customerInsights.value.data);

      // Surface individual failures as a single consolidated toast (no console noise)
      const failedEndpoints = settled
        .map((r, i) => ({ r, name: ['overview', 'revenue', 'bookings-by-status', 'service-performance', 'customer-insights'][i] }))
        .filter(({ r }) => r.status === 'rejected')
        .map(({ name }) => name);

      if (failedEndpoints.length > 0 && failedEndpoints.length < 5) {
        addToast('warning', `Some analytics sections failed to load: ${failedEndpoints.join(', ')}`);
      }
    } catch (error: unknown) {
      if ((error as { name?: string }).name === 'CanceledError') return;
      addToast('error', 'Failed to load analytics');
    } finally {
      if (!ctrl.signal.aborted) setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!revenueData || revenueData.length === 0) {
      addToast('error', 'No data to export');
      return;
    }

    // Create CSV content
    const headers = ['Date', 'Revenue'];
    const rows = revenueData.map((item) => [item.date, item.revenue]);
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${dateRange}days.csv`;
    link.click();
    setTimeout(() => window.URL.revokeObjectURL(url), 100);

    addToast('success', 'Analytics exported successfully');
  };

  // Compute success rate from real data
  const successRate = overviewData
    ? overviewData.totalBookings > 0
      ? Math.round((overviewData.completedBookings / overviewData.totalBookings) * 100)
      : 0
    : 0;

  // Compute data-driven progress bar widths (capped 0–100)
  const bookingsProgress = overviewData
    ? Math.min(100, overviewData.totalBookings > 0 ? (overviewData.completedBookings / overviewData.totalBookings) * 100 : 0)
    : 0;
  // Revenue fill ratio: fraction of revenue-bearing days out of total days in the range
  const revenueProgress = overviewData
    ? Math.min(100, revenueData.length > 0
        ? (revenueData.filter((d) => d.revenue > 0).length / revenueData.length) * 100
        : 0)
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Insights"
          title="Studio Analytics"
          subtitle="Data-driven insights to grow your photography business."
          accentColor="violet"
        />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-36 w-full rounded-2xl" />
          ))}
        </div>
        <div className="skeleton h-80 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="skeleton h-72 w-full rounded-2xl" />
          <div className="skeleton h-72 w-full rounded-2xl" />
        </div>
        <div className="skeleton h-40 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Insights"
        title="Studio Analytics"
        subtitle="Data-driven insights to grow your photography business."
        accentColor="violet"
        actions={
          <div className="flex gap-4 items-end">
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              options={[
                { value: '7', label: 'Last 7 Days' },
                { value: '30', label: 'Last 30 Days' },
                { value: '90', label: 'Last 90 Days' },
              ]}
              className="w-48"
            />
            <Button onClick={exportToCSV} variant="outline" className="rounded-full px-6 h-10">
              <Download className="mr-2 h-4 w-4" /> Export Data
            </Button>
          </div>
        }
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <Card className="card-luxury p-8">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--foreground-tertiary)] mb-3">Total Bookings</div>
          <div className="text-4xl font-black text-[var(--foreground)] font-heading">
            {overviewData?.totalBookings || 0}
          </div>
          <div className="mt-4 h-1.5 w-full bg-[var(--surface-2)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--primary)] rounded-full transition-all duration-700" style={{ width: `${bookingsProgress}%` }} />
          </div>
        </Card>
        <Card className="card-luxury p-8">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--foreground-tertiary)] mb-3">Total Revenue</div>
          <div className="text-4xl font-black text-[var(--foreground)] font-heading">
            {formatCurrency(overviewData?.totalRevenue || 0)}
          </div>
          <div className="mt-4 h-1.5 w-full bg-[var(--surface-2)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--success)] rounded-full transition-all duration-700" style={{ width: `${revenueProgress}%` }} />
          </div>
        </Card>
        <Card className="card-luxury p-8 border-l-4 border-l-[var(--warning)]">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--foreground-tertiary)] mb-3">Pending Invoices</div>
          <div className="text-4xl font-black text-[var(--foreground)] font-heading">
            {overviewData?.pendingInvoices || 0}
          </div>
          <p className="mt-3 text-xs font-bold text-[var(--warning)] font-heading tracking-widest uppercase">Requires Review</p>
        </Card>
        <Card className="card-luxury p-8 border-l-4 border-l-[var(--primary)]">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--foreground-tertiary)] mb-3">Completed Sessions</div>
          <div className="text-4xl font-black text-[var(--foreground)] font-heading">
            {overviewData?.completedBookings || 0}
          </div>
          <p className="mt-3 text-xs font-bold text-[var(--primary)] font-heading tracking-widest uppercase">
            Success Rate: {successRate}%
          </p>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-[var(--foreground)]">Revenue Over Time</h2>
        {revenueData.length === 0 ? (
          <p className="text-center py-10 text-[var(--foreground-tertiary)]">No revenue data for this period.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--foreground-tertiary)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--foreground-tertiary)', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: 'var(--surface-0)', border: '1px solid var(--border)', borderRadius: 8 }}
                labelStyle={{ color: 'var(--foreground)' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke={primaryColor || '#6366f1'}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bookings by Status */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-[var(--foreground)]">Bookings by Status</h2>
          {bookingsStatusData.length === 0 ? (
            <p className="text-center py-10 text-[var(--foreground-tertiary)]">No booking data for this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={bookingsStatusData}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {bookingsStatusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--surface-0)', border: '1px solid var(--border)', borderRadius: 8 }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Service Performance */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-[var(--foreground)]">Service Performance</h2>
          {servicePerformanceData.length === 0 ? (
            <p className="text-center py-10 text-[var(--foreground-tertiary)]">No service data for this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={servicePerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fill: 'var(--foreground-tertiary)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--foreground-tertiary)', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface-0)', border: '1px solid var(--border)', borderRadius: 8 }}
                />
                <Legend />
                <Bar dataKey="bookings" fill={primaryColor || '#6366f1'} radius={[4, 4, 0, 0]} />
                <Bar dataKey="revenue" fill={successColor || '#10b981'} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Customer Insights */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-[var(--foreground)]">Customer Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div>
            <div className="text-sm text-[var(--foreground-secondary)]">Total Customers</div>
            <div className="text-2xl font-bold mt-2 text-[var(--foreground)]">
              {customerInsightsData?.totalCustomers || 0}
            </div>
          </div>
          <div>
            <div className="text-sm text-[var(--foreground-secondary)]">New Customers</div>
            <div className="text-2xl font-bold mt-2 text-[var(--foreground)]">
              {customerInsightsData?.newCustomers || 0}
            </div>
          </div>
          <div>
            <div className="text-sm text-[var(--foreground-secondary)]">Returning Customers</div>
            <div className="text-2xl font-bold mt-2 text-[var(--foreground)]">
              {customerInsightsData?.returningCustomers || 0}
            </div>
          </div>
          <div>
            <div className="text-sm text-[var(--foreground-secondary)]">Total Revenue</div>
            <div className="text-2xl font-bold mt-2 text-[var(--foreground)]">
              {formatCurrency(customerInsightsData?.totalRevenue || 0)}
            </div>
          </div>
          <div>
            <div className="text-sm text-[var(--foreground-secondary)]">Avg Revenue/Customer</div>
            <div className="text-2xl font-bold mt-2 text-[var(--foreground)]">
              {formatCurrency(customerInsightsData?.averageRevenuePerCustomer || 0)}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
