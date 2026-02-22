'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import axios from 'axios';
import { formatDate } from '@/lib/utils';
import { Calendar, FileText, Download, Search, CheckCircle, Clock } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface Booking {
  id: string;
  status: string;
  scheduledAt: string;
  customerNotes?: string;
  service: {
    name: string;
    price: number;
    durationMinutes: number;
  };
  studio: {
    name: string;
    email: string;
    phone: string;
  };
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  total: number;
  status: string;
  dueDate?: string;
  createdAt: string;
  studio: {
    name: string;
  };
  payments: Array<{
    amount: number;
    paidAt: string;
  }>;
}

interface CustomerData {
  customer: {
    id: string;
    name: string;
    email?: string;
    phone: string;
  };
  bookings: Booking[];
  invoices?: Invoice[];
}

export default function CustomerPortalPage() {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [data, setData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bookings' | 'invoices'>('bookings');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone && !email) {
      setError('Please enter your phone number or email');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch bookings
      const bookingsResponse = await axios.get(`${API_URL}/customer-portal/bookings`, {
        params: { phone, email },
      });

      // Fetch invoices
      const invoicesResponse = await axios.get(`${API_URL}/customer-portal/invoices`, {
        params: { phone, email },
      });

      setData({
        customer: bookingsResponse.data.customer,
        bookings: bookingsResponse.data.bookings,
        invoices: invoicesResponse.data.invoices,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Customer not found. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (invoiceNumber: string) => {
    try {
      const response = await axios.get(
        `${API_URL}/customer-portal/invoices/${invoiceNumber}/pdf`,
        {
          params: { phone },
          responseType: 'blob',
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download invoice');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' }> = {
      INQUIRY: { variant: 'default' },
      QUOTED: { variant: 'info' },
      CONFIRMED: { variant: 'success' },
      IN_PROGRESS: { variant: 'warning' },
      COMPLETED: { variant: 'secondary' },
      CANCELLED: { variant: 'danger' },
      DRAFT: { variant: 'default' },
      SENT: { variant: 'info' },
      PAID: { variant: 'success' },
      PARTIALLY_PAID: { variant: 'warning' },
      OVERDUE: { variant: 'danger' },
    };
    return variants[status] || variants.INQUIRY;
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-[var(--background-secondary)] flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-[var(--border)] shadow-[var(--shadow-xl)]">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-[var(--foreground)]">Customer Portal</CardTitle>
            <p className="text-[var(--foreground-tertiary)] text-center text-sm">
              Access your bookings and invoices
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-1">
                  Phone Number
                </label>
                <Input
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-[var(--surface-0)] border-[var(--border)] focus:border-[var(--primary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-1">
                  Email (Optional)
                </label>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-[var(--surface-0)] border-[var(--border)] focus:border-[var(--primary)]"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <LoadingSpinner className="mr-2" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    View My Details
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background-secondary)]">
      {/* Header */}
      <div className="bg-[var(--background)] border-b border-[var(--border)] shadow-[var(--shadow-sm)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">Welcome, {data.customer.name}</h1>
              <p className="text-sm text-[var(--foreground-tertiary)]">{data.customer.phone}</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setData(null);
                setPhone('');
                setEmail('');
              }}
            >
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-6 border-b border-[var(--border)]">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('bookings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'bookings'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--foreground-tertiary)] hover:text-[var(--foreground-secondary)] hover:border-[var(--border)]'
                }`}
            >
              <Calendar className="inline-block mr-2 h-4 w-4" />
              My Bookings ({data.bookings.length})
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'invoices'
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-transparent text-[var(--foreground-tertiary)] hover:text-[var(--foreground-secondary)] hover:border-[var(--border)]'
                }`}
            >
              <FileText className="inline-block mr-2 h-4 w-4" />
              My Invoices ({data.invoices?.length || 0})
            </button>
          </div>
        </div>

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.bookings.length === 0 ? (
              <Card className="col-span-2 border-[var(--border)]">
                <CardContent className="text-center py-12">
                  <Calendar className="mx-auto h-12 w-12 text-[var(--foreground-tertiary)]" />
                  <h3 className="mt-2 text-sm font-semibold text-[var(--foreground)]">No bookings</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-tertiary)]">You don't have any bookings yet.</p>
                </CardContent>
              </Card>
            ) : (
              data.bookings.map((booking) => (
                <Card key={booking.id} className="border-[var(--border)] hover:border-[var(--primary)] transition-colors shadow-sm">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg text-[var(--foreground)] font-bold">{booking.service.name}</CardTitle>
                        <p className="text-sm text-[var(--foreground-tertiary)]">{booking.studio.name}</p>
                      </div>
                      <Badge {...getStatusBadge(booking.status)}>{booking.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center text-sm text-[var(--foreground-secondary)]">
                      <Calendar className="mr-2 h-4 w-4 text-[var(--foreground-tertiary)]" />
                      <span>{formatDate(booking.scheduledAt)}</span>
                    </div>

                    <div className="flex items-center text-sm text-[var(--foreground-secondary)]">
                      <Clock className="mr-2 h-4 w-4 text-[var(--foreground-tertiary)]" />
                      <span>{booking.service.durationMinutes} minutes</span>
                    </div>

                    <div className="pt-3 border-t border-[var(--border-light)]">
                      <p className="text-lg font-bold text-[var(--foreground)] tabular-nums">${Number(booking.service.price).toFixed(2)}</p>
                    </div>

                    {booking.customerNotes && (
                      <div className="pt-2">
                        <p className="text-xs text-[var(--foreground-tertiary)] uppercase tracking-wider font-semibold">Notes:</p>
                        <p className="text-sm text-[var(--foreground-secondary)] mt-1">{booking.customerNotes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            {data.invoices?.length === 0 ? (
              <Card className="col-span-2 border-[var(--border)]">
                <CardContent className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-[var(--foreground-tertiary)]" />
                  <h3 className="mt-2 text-sm font-bold text-[var(--foreground)]">No invoices</h3>
                  <p className="mt-1 text-sm text-[var(--foreground-tertiary)]">You don't have any invoices yet.</p>
                </CardContent>
              </Card>
            ) : (
              data.invoices?.map((invoice) => (
                <Card key={invoice.id} className="border-[var(--border)] hover:border-[var(--primary)] transition-colors shadow-sm">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-bold text-[var(--foreground)]">
                            Invoice #{invoice.invoiceNumber}
                          </h3>
                          <Badge {...getStatusBadge(invoice.status)}>{invoice.status}</Badge>
                        </div>
                        <p className="text-sm text-[var(--foreground-tertiary)] mt-1">{invoice.studio.name}</p>
                        <div className="mt-2 flex items-center gap-4 text-xs font-medium uppercase tracking-wider">
                          <span className="text-[var(--foreground-tertiary)]">
                            Created: {formatDate(invoice.createdAt)}
                          </span>
                          {invoice.dueDate && (
                            <span className="text-[var(--foreground-tertiary)]">
                              Due: {formatDate(invoice.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-bold text-[var(--foreground)] tabular-nums">
                          ${Number(invoice.total).toFixed(2)}
                        </p>
                        {invoice.payments.length > 0 && (
                          <div className="mt-1 flex items-center justify-end text-sm text-[var(--success)] font-bold">
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Paid: ${invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0).toFixed(2)}
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          className="mt-3"
                          onClick={() => handleDownloadInvoice(invoice.invoiceNumber)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download PDF
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
