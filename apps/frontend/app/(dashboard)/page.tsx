'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import { bookingsApi, customersApi, invoicesApi } from '@/lib/api';
import { formatCurrency, formatDate, getBookingStatusBadge, getInvoiceStatusBadge } from '@/lib/utils';
import {
  Calendar,
  Users,
  DollarSign,
  FileText,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';

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
  customer: {
    name: string;
  };
  service: {
    name: string;
  };
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  totalAmount: number;
  status: string;
  dueDate: string;
  customer: {
    name: string;
  };
}

/* -------------------------------------------------------------------------- */
/*  Stat Card (Luxury Variant)                                                 */
/* -------------------------------------------------------------------------- */

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  glowColor: string;
}

function StatCard({ title, value, icon: Icon, accentColor, glowColor }: StatCardProps) {
  return (
    <div className="card-luxury group">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--foreground-tertiary)] tracking-wide uppercase">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-[var(--foreground)] tracking-tight">
            {value}
          </p>
        </div>
        <div
          className="flex items-center justify-center h-12 w-12 rounded-2xl transition-all duration-300 group-hover:scale-110"
          style={{
            background: accentColor,
            boxShadow: `0 0 20px -5px ${glowColor}`,
          }}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Dashboard Page                                                             */
/* -------------------------------------------------------------------------- */

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    pendingInvoices: 0,
  });
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      const bookingsRes = await bookingsApi.getAll({ limit: 5 });
      setRecentBookings(bookingsRes.data?.data || []);
      setStats(prev => ({ ...prev, totalBookings: bookingsRes.data?.meta?.total || 0 }));

      const customersRes = await customersApi.getAll({ limit: 1 });
      setStats(prev => ({ ...prev, totalCustomers: customersRes.data?.meta?.total || 0 }));

      const invoicesRes = await invoicesApi.getAll({ limit: 5 });
      const invoiceData = invoicesRes.data?.data || [];
      setRecentInvoices(invoiceData);

      const paidInvoices = invoiceData.filter((inv: Invoice) => inv.status === 'PAID');
      const totalRevenue = paidInvoices.reduce((sum: number, inv: Invoice) => sum + (inv.totalAmount || 0), 0);
      setStats(prev => ({ ...prev, totalRevenue }));

      const pending = invoiceData.filter(
        (inv: Invoice) => inv.status === 'SENT' || inv.status === 'PARTIALLY_PAID'
      ).length;
      setStats(prev => ({ ...prev, pendingInvoices: pending }));

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">
          Dashboard
        </h1>
        <p className="mt-1 text-[var(--foreground-secondary)]">
          Welcome back! Here&apos;s what&apos;s happening today.
        </p>
      </div>

      {/* Luxury Stat Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Bookings"
          value={stats.totalBookings}
          icon={Calendar}
          accentColor="linear-gradient(135deg, #4f46e5, #6366f1)"
          glowColor="rgba(79, 70, 229, 0.4)"
        />
        <StatCard
          title="Customers"
          value={stats.totalCustomers}
          icon={Users}
          accentColor="linear-gradient(135deg, #059669, #10b981)"
          glowColor="rgba(5, 150, 105, 0.4)"
        />
        <StatCard
          title="Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={DollarSign}
          accentColor="linear-gradient(135deg, #d97706, #f59e0b)"
          glowColor="rgba(217, 119, 6, 0.4)"
        />
        <StatCard
          title="Pending Invoices"
          value={stats.pendingInvoices}
          icon={FileText}
          accentColor="linear-gradient(135deg, #dc2626, #f87171)"
          glowColor="rgba(220, 38, 38, 0.4)"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Bookings */}
        <Card className="glass-luxury">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Bookings</CardTitle>
              <TrendingUp className="h-4 w-4 text-[var(--foreground-tertiary)]" />
            </div>
          </CardHeader>
          <CardContent>
            {(recentBookings || []).length === 0 ? (
              <p className="text-[var(--foreground-tertiary)] text-sm py-4 text-center">
                No bookings yet. Create your first booking to get started.
              </p>
            ) : (
              <div className="space-y-1">
                {recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-3 rounded-[var(--radius-md)] hover:bg-[var(--overlay-light)] transition-colors duration-[var(--transition-fast)] group cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">
                        {booking.customer.name}
                      </p>
                      <p className="text-xs text-[var(--foreground-tertiary)] mt-0.5">
                        {booking.service.name} · {formatDate(booking.scheduledAt || (booking as any).bookingDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge {...getBookingStatusBadge(booking.status)}>
                        {booking.status}
                      </Badge>
                      <ArrowUpRight className="h-3.5 w-3.5 text-[var(--foreground-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card className="glass-luxury">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Invoices</CardTitle>
              <DollarSign className="h-4 w-4 text-[var(--foreground-tertiary)]" />
            </div>
          </CardHeader>
          <CardContent>
            {(recentInvoices || []).length === 0 ? (
              <p className="text-[var(--foreground-tertiary)] text-sm py-4 text-center">
                No invoices yet. Create an invoice from a booking.
              </p>
            ) : (
              <div className="space-y-1">
                {recentInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 rounded-[var(--radius-md)] hover:bg-[var(--overlay-light)] transition-colors duration-[var(--transition-fast)] group cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">
                        {invoice.invoiceNumber}
                      </p>
                      <p className="text-xs text-[var(--foreground-tertiary)] mt-0.5">
                        {invoice.customer.name} · Due {formatDate(invoice.dueDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold text-[var(--foreground)] tabular-nums">
                        {formatCurrency(invoice.totalAmount)}
                      </p>
                      <Badge {...getInvoiceStatusBadge(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
