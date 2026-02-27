'use client';

import { useState, useEffect } from 'react';
import { analyticsApi } from '@/lib/api';
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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const { addToast } = useToast();

  const [overviewData, setOverviewData] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [bookingsStatusData, setBookingsStatusData] = useState<any[]>([]);
  const [servicePerformanceData, setServicePerformanceData] = useState<any[]>([]);
  const [customerInsightsData, setCustomerInsightsData] = useState<any>(null);

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  const loadAnalytics = async () => {
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

      if (overview.status === 'fulfilled') setOverviewData(overview.value.data);
      if (revenue.status === 'fulfilled') setRevenueData(Array.isArray(revenue.value.data) ? revenue.value.data : []);
      if (bookingsStatus.status === 'fulfilled') setBookingsStatusData(Array.isArray(bookingsStatus.value.data) ? bookingsStatus.value.data : []);
      if (servicePerformance.status === 'fulfilled') setServicePerformanceData(Array.isArray(servicePerformance.value.data) ? servicePerformance.value.data : []);
      if (customerInsights.status === 'fulfilled') setCustomerInsightsData(customerInsights.value.data);

      // Log any individual failures for debugging
      settled.forEach((result, i) => {
        if (result.status === 'rejected') {
          const names = ['overview', 'revenue', 'bookings-by-status', 'service-performance', 'customer-insights'];
          console.warn(`Analytics: ${names[i]} failed`, result.reason?.response?.data || result.reason?.message);
        }
      });
    } catch (error: any) {
      console.error('Analytics load error:', error);
      addToast('error', 'Failed to load analytics');
    } finally {
      setIsLoading(false);
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
    window.URL.revokeObjectURL(url);

    addToast('success', 'Analytics exported successfully');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-[var(--foreground)] font-heading">Studio Analytics</h1>
          <p className="mt-2 text-base text-[var(--foreground-secondary)] font-medium">Data-driven insights to grow your photography business.</p>
        </div>
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
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <Card className="card-luxury p-8">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Total Bookings</div>
          <div className="text-4xl font-black text-[var(--foreground)] font-heading">
            {overviewData?.totalBookings || 0}
          </div>
          <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 rounded-full" style={{ width: '65%' }} />
          </div>
        </Card>
        <Card className="card-luxury p-8">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Total Revenue</div>
          <div className="text-4xl font-black text-[var(--foreground)] font-heading">
            ₹{overviewData?.totalRevenue?.toLocaleString() || 0}
          </div>
          <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '80%' }} />
          </div>
        </Card>
        <Card className="card-luxury p-8 border-l-4 border-l-amber-400">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Pending Invoices</div>
          <div className="text-4xl font-black text-[var(--foreground)] font-heading">
            {overviewData?.pendingInvoices || 0}
          </div>
          <p className="mt-3 text-xs font-bold text-amber-600 font-heading tracking-widest uppercase">Requires Review</p>
        </Card>
        <Card className="card-luxury p-8 border-l-4 border-l-indigo-600">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Completed Sessions</div>
          <div className="text-4xl font-black text-[var(--foreground)] font-heading">
            {overviewData?.completedBookings || 0}
          </div>
          <p className="mt-3 text-xs font-bold text-indigo-600 font-heading tracking-widest uppercase">Success Rate: 100%</p>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Revenue Over Time</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#3b82f6"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bookings by Status */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Bookings by Status</h2>
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
                {bookingsStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Service Performance */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Service Performance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={servicePerformanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="bookings" fill="#3b82f6" />
              <Bar dataKey="revenue" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Customer Insights */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Customer Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div>
            <div className="text-sm text-gray-600">Total Customers</div>
            <div className="text-2xl font-bold mt-2">
              {customerInsightsData?.totalCustomers || 0}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">New Customers</div>
            <div className="text-2xl font-bold mt-2">
              {customerInsightsData?.newCustomers || 0}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Returning Customers</div>
            <div className="text-2xl font-bold mt-2">
              {customerInsightsData?.returningCustomers || 0}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Total Revenue</div>
            <div className="text-2xl font-bold mt-2">
              ₹{customerInsightsData?.totalRevenue?.toLocaleString() || 0}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Avg Revenue/Customer</div>
            <div className="text-2xl font-bold mt-2">
              ₹{customerInsightsData?.averageRevenuePerCustomer?.toLocaleString() || 0}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
