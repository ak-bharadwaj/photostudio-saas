'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import axios from 'axios';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import { Calendar, FileText, Download, Search, CheckCircle, Clock, LogIn, Chrome } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
    slug: string;
    logoUrl?: string;
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
  const { addToast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [data, setData] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('customer_token');
    if (token) {
      setIsAuthenticated(true);
      fetchDashboardData(token);
    }
  }, []);

  const fetchDashboardData = async (token: string) => {
    setLoading(true);
    try {
      const [bookingsRes, invoicesRes] = await Promise.all([
        axios.get(`${API_URL}/portal/bookings`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/portal/invoices`, { headers: { Authorization: `Bearer ` + token } })
      ]);
      setData({
        customer: { id: 'me', name: 'Valued Customer', phone: '' },
        bookings: bookingsRes.data.slice(0, 3), // Only recent 3
        invoices: invoicesRes.data.slice(0, 3), // Only recent 3
      });
    } catch (err: any) {
      if (err.response?.status === 401) {
        localStorage.removeItem('customer_token');
        setIsAuthenticated(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      setError('Please enter your phone number');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const bookingsResponse = await axios.get(`${API_URL}/customer-portal/bookings`, { params: { phone, email } });
      const invoicesResponse = await axios.get(`${API_URL}/customer-portal/invoices`, { params: { phone, email } });
      setData({
        customer: bookingsResponse.data.customer,
        bookings: bookingsResponse.data.bookings || [],
        invoices: invoicesResponse.data.invoices || [],
      });
      addToast('success', 'Information retrieved successfully.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Customer not found.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated && !data) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Card className="w-full max-w-md border-[var(--border)] shadow-[var(--shadow-xl)] animate-in fade-in slide-in-from-bottom-4 duration-700">
          <CardHeader className="text-center">
            <div className="h-16 w-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center mb-4 mx-auto">
              <LogIn className="h-8 w-8 text-[var(--primary)]" />
            </div>
            <CardTitle className="text-3xl font-black text-[var(--foreground)] tracking-tight">Welcome to the Portal</CardTitle>
            <p className="text-[var(--foreground-tertiary)] text-base font-medium mt-2">
              Manage your photography sessions and financial records securely.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button
              variant="outline"
              className="w-full h-14 text-base font-bold border-[var(--border)] hover:bg-[var(--surface-0)] transition-all bg-white shadow-sm rounded-xl"
              onClick={handleGoogleLogin}
            >
              <Chrome className="mr-2 h-5 w-5 text-[#4285F4]" />
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[var(--border)]" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                <span className="bg-[var(--background)] px-3 text-[var(--foreground-tertiary)]">
                  Or Guest Access
                </span>
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--foreground-secondary)] uppercase tracking-wider">Phone Number</label>
                <Input
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-[var(--surface-0)] border-[var(--border)] py-6"
                />
              </div>

              {error && (
                <p className="text-xs text-red-500 font-medium px-1 underline underline-offset-4">{error}</p>
              )}

              <Button type="submit" className="w-full h-14 font-bold shadow-lg shadow-[var(--primary)]/20 rounded-xl" disabled={loading}>
                {loading ? <LoadingSpinner className="mr-2" /> : <Search className="mr-2 h-5 w-5" />}
                Quick Find
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-[var(--foreground)] tracking-tighter italic">DASHBOARD</h1>
          <p className="text-[var(--foreground-tertiary)] font-medium">Welcome back, {data?.customer.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="font-bold border-[var(--border)]" onClick={() => router.push('/portal/bookings')}>
            View All Bookings
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Bookings */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-[var(--foreground)] flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[var(--primary)]" />
            Recent Activity
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data?.bookings.map(booking => (
              <Card key={booking.id} className="border-[var(--border)] hover:border-[var(--primary)] transition-all bg-[var(--background)]">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className="text-[10px] font-bold uppercase">{booking.status}</Badge>
                    <p className="text-[10px] text-[var(--foreground-tertiary)] font-bold">{formatDate(booking.scheduledAt)}</p>
                  </div>
                  <h4 className="font-bold text-[var(--foreground)] leading-tight">{booking.service.name}</h4>
                  <p className="text-xs text-[var(--foreground-tertiary)]">{booking.studio.name}</p>
                </CardContent>
              </Card>
            ))}
            <div
              className="border-2 border-dashed border-[var(--border)] rounded-2xl flex flex-col items-center justify-center p-6 bg-[var(--surface-0)]/30 hover:bg-[var(--surface-0)] transition-all cursor-pointer"
              onClick={() => router.push('/portal/bookings')}
            >
              <Search className="h-6 w-6 text-[var(--foreground-tertiary)] mb-2" />
              <p className="text-xs font-bold text-[var(--foreground-tertiary)]">Explore History</p>
            </div>
          </div>
        </div>

        {/* Quick Actions / Stats */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-[var(--foreground)] flex items-center gap-2">
            <FileText className="h-5 w-5 text-[var(--accent)]" />
            Overview
          </h2>
          <Card className="border-[var(--border)] shadow-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-white">
            <CardContent className="p-6 space-y-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest opacity-80">Pending Invoices</p>
                <p className="text-4xl font-black italic">
                  {data?.invoices?.filter(i => i.status !== 'PAID').length || 0}
                </p>
              </div>
              <Button
                variant="secondary"
                className="w-full font-bold bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md"
                onClick={() => router.push('/portal/invoices')}
              >
                Review Finances
              </Button>
            </CardContent>
          </Card>

          <Card className="border-[var(--border)] shadow-sm bg-[var(--background)]">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Account Verification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--foreground)]">Google Identity Active</p>
                  <p className="text-xs text-[var(--foreground-tertiary)]">All sessions synchronized</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
