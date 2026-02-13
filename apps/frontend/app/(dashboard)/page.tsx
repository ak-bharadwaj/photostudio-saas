'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import { bookingsApi, customersApi, invoicesApi } from '@/lib/api';
import { formatCurrency, formatDate, getBookingStatusBadge, getInvoiceStatusBadge } from '@/lib/utils';
import { Calendar, Users, DollarSign, FileText } from 'lucide-react';

interface DashboardStats {
  totalBookings: number;
  totalCustomers: number;
  totalRevenue: number;
  pendingInvoices: number;
}

interface Booking {
  id: number;
  bookingDate: string;
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
      
      // Load bookings
      const bookingsRes = await bookingsApi.getAll({ limit: 5 });
      setRecentBookings(bookingsRes.data.data);
      setStats(prev => ({ ...prev, totalBookings: bookingsRes.data.meta.total }));

      // Load customers
      const customersRes = await customersApi.getAll({ limit: 1 });
      setStats(prev => ({ ...prev, totalCustomers: customersRes.data.meta.total }));

      // Load invoices
      const invoicesRes = await invoicesApi.getAll({ limit: 5 });
      setRecentInvoices(invoicesRes.data.data);
      
      // Calculate total revenue (sum of paid invoices)
      const paidInvoices = invoicesRes.data.data.filter((inv: Invoice) => inv.status === 'PAID');
      const totalRevenue = paidInvoices.reduce((sum: number, inv: Invoice) => sum + inv.totalAmount, 0);
      setStats(prev => ({ ...prev, totalRevenue }));

      // Count pending invoices
      const pending = invoicesRes.data.data.filter(
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Bookings
            </CardTitle>
            <Calendar className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Customers
            </CardTitle>
            <Users className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending Invoices
            </CardTitle>
            <FileText className="h-5 w-5 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingInvoices}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <p className="text-gray-500 text-sm">No bookings yet</p>
            ) : (
              <div className="space-y-4">
                {recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {booking.customer.name}
                      </p>
                      <p className="text-xs text-gray-500">{booking.service.name}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(booking.bookingDate)}
                      </p>
                    </div>
                    <Badge {...getBookingStatusBadge(booking.status)}>
                      {booking.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {recentInvoices.length === 0 ? (
              <p className="text-gray-500 text-sm">No invoices yet</p>
            ) : (
              <div className="space-y-4">
                {recentInvoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {invoice.invoiceNumber}
                      </p>
                      <p className="text-xs text-gray-500">{invoice.customer.name}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Due: {formatDate(invoice.dueDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(invoice.totalAmount)}
                      </p>
                      <Badge {...getInvoiceStatusBadge(invoice.status)} className="mt-1">
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
