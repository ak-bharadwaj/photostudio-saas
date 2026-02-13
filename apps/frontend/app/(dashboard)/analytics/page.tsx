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
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/components/ui/toast';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
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
      setLoading(true);

      const endDate = new Date().toISOString();
      const startDate = new Date(
        Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000
      ).toISOString();

      const params = { startDate, endDate };

      const [overview, revenue, bookingsStatus, servicePerformance, customerInsights] =
        await Promise.all([
          analyticsApi.getOverview(params),
          analyticsApi.getRevenue(params),
          analyticsApi.getBookingsByStatus(params),
          analyticsApi.getServicePerformance(params),
          analyticsApi.getCustomerInsights(params),
        ]);

      setOverviewData(overview.data);
      setRevenueData(revenue.data);
      setBookingsStatusData(bookingsStatus.data);
      setServicePerformanceData(servicePerformance.data);
      setCustomerInsightsData(customerInsights.data);
    } catch (error: any) {
      console.error('Failed to load analytics:', error);
      addToast(
        'error',
        error.response?.data?.message || 'Failed to load analytics'
      );
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <div className="flex gap-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
          </select>
          <Button onClick={exportToCSV}>Export CSV</Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="text-sm text-gray-600">Total Bookings</div>
          <div className="text-3xl font-bold mt-2">
            {overviewData?.totalBookings || 0}
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-gray-600">Total Revenue</div>
          <div className="text-3xl font-bold mt-2">
            ₹{overviewData?.totalRevenue?.toLocaleString() || 0}
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-gray-600">Pending Invoices</div>
          <div className="text-3xl font-bold mt-2">
            {overviewData?.pendingInvoices || 0}
          </div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-gray-600">Completed Bookings</div>
          <div className="text-3xl font-bold mt-2">
            {overviewData?.completedBookings || 0}
          </div>
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
