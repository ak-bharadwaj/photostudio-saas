'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/components/ui/toast';
import { paymentsApi } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Search, DollarSign, CreditCard, Receipt, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';

interface Payment {
  id: string;
  amount: number;
  paymentMethod: string;
  transactionId?: string;
  notes?: string;
  paidAt: string;
  invoice: {
    id: number;
    invoiceNumber: string;
    total: number;
    status: string;
    customer: {
      id: number;
      name: string;
      email: string;
    };
  };
}

interface PaymentStats {
  totalPayments: number;
  totalAmount: number;
  recentPayments: Payment[];
}

interface PaymentMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const PAYMENTS_PAGE_SIZE = 20;

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [meta, setMeta] = useState<PaymentMeta>({ total: 0, page: 1, limit: PAYMENTS_PAGE_SIZE, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const { addToast } = useToast();
  const abortRef = useRef<AbortController | null>(null);

  // Debounce search term (500 ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when search or method filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, methodFilter]);

  const loadData = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      setIsLoading(true);
      const params: Record<string, string | number> = { limit: PAYMENTS_PAGE_SIZE, page };
      if (methodFilter) params.paymentMethod = methodFilter;
      if (debouncedSearch) params.search = debouncedSearch;

      const [paymentsResponse, statsResponse] = await Promise.all([
        paymentsApi.getAll(params),
        paymentsApi.getStats(),
      ]);

      if (ctrl.signal.aborted) return;

      // API returns { data: Payment[], meta: {...} }
      setPayments(paymentsResponse.data?.data || paymentsResponse.data || []);
      if (paymentsResponse.data?.meta) {
        setMeta(paymentsResponse.data.meta);
      } else {
        const list = paymentsResponse.data?.data || paymentsResponse.data || [];
        setMeta({ total: list.length, page: 1, limit: PAYMENTS_PAGE_SIZE, totalPages: 1 });
      }
      setStats(statsResponse.data);
    } catch (error) {
      if ((error as { name?: string }).name === 'CanceledError') return;
      addToast('error', 'Failed to load payments');
    } finally {
      if (!ctrl.signal.aborted) setIsLoading(false);
    }
  }, [methodFilter, debouncedSearch, page, addToast]);

  useEffect(() => {
    loadData();
    return () => abortRef.current?.abort();
  }, [loadData]);

  const paymentMethods = [
    { value: '', label: 'All Methods' },
    { value: 'CASH', label: 'Cash' },
    { value: 'CREDIT_CARD', label: 'Credit Card' },
    { value: 'DEBIT_CARD', label: 'Debit Card' },
    { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
    { value: 'CHECK', label: 'Check' },
    { value: 'OTHER', label: 'Other' },
  ];

  const getPaymentMethodBadge = (method: string) => {
    const badgeMap: Record<string, { variant: 'default' | 'secondary' | 'success' | 'warning' | 'danger' }> = {
      CASH: { variant: 'success' },
      CREDIT_CARD: { variant: 'default' },
      DEBIT_CARD: { variant: 'default' },
      BANK_TRANSFER: { variant: 'secondary' },
      CHECK: { variant: 'warning' },
      OTHER: { variant: 'secondary' },
    };
    return badgeMap[method] || { variant: 'default' };
  };

  const formatPaymentMethod = (method: string) => {
    return method.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Payments"
        subtitle="Track all payment transactions and revenue flow."
        accentColor="violet"
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Card className="card-luxury p-6 overflow-hidden">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center shrink-0 shadow-lg shadow-[var(--primary)]/20">
                <Receipt className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--foreground-tertiary)]">Total Payments</p>
                <p className="text-3xl font-black text-[var(--foreground)] font-heading tabular-nums">{stats.totalPayments}</p>
              </div>
            </div>
          </Card>

          <Card className="card-luxury p-6 overflow-hidden">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[var(--success)] to-[var(--success)] flex items-center justify-center shrink-0 shadow-lg shadow-[var(--success)]/20">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--foreground-tertiary)]">Total Amount Received</p>
                <p className="text-3xl font-black text-[var(--foreground)] font-heading tabular-nums">{formatCurrency(Number(stats.totalAmount))}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--foreground-tertiary)]" />
              <Input
                placeholder="Search by invoice, customer, or transaction ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              options={paymentMethods}
              aria-label="Filter by payment method"
            />
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Payments ({meta.total})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="mx-auto h-12 w-12 text-[var(--foreground-tertiary)]" />
              <h3 className="mt-2 text-sm font-semibold text-[var(--foreground)]">No payments</h3>
              <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
                {debouncedSearch || methodFilter ? 'No payments match your filters.' : 'Payments will appear here once invoices are paid.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                 {payments.map((payment) => (
                   <TableRow key={payment.id}>
                     <TableCell className="font-medium">
                       {formatDate(payment.paidAt)}
                     </TableCell>
                     <TableCell>
                       {payment.invoice ? (
                         <Link
                           href={`/invoices/${payment.invoice.id}`}
                           className="text-[var(--primary)] hover:underline font-medium"
                         >
                           {payment.invoice.invoiceNumber}
                         </Link>
                       ) : (
                         <span className="text-[var(--foreground-tertiary)]">—</span>
                       )}
                     </TableCell>
                     <TableCell>
                       <div>
                         <p className="font-medium text-[var(--foreground)]">{payment.invoice?.customer?.name ?? '—'}</p>
                         <p className="text-sm text-[var(--foreground-secondary)]">{payment.invoice?.customer?.email ?? ''}</p>
                       </div>
                     </TableCell>
                     <TableCell className="font-semibold text-[var(--success)]">
                       {formatCurrency(Number(payment.amount))}
                     </TableCell>
                     <TableCell>
                       <Badge {...getPaymentMethodBadge(payment.paymentMethod)}>
                         {formatPaymentMethod(payment.paymentMethod)}
                       </Badge>
                     </TableCell>
                     <TableCell>
                       <span className="text-sm text-[var(--foreground-secondary)]">
                         {payment.transactionId || '-'}
                       </span>
                     </TableCell>
                     <TableCell>
                       {payment.invoice && (
                         <Link href={`/invoices/${payment.invoice.id}`}>
                           <Button variant="ghost" size="sm">
                             View Invoice
                           </Button>
                         </Link>
                       )}
                     </TableCell>
                   </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {!isLoading && meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-4 border-t border-[var(--border)]">
              <p className="text-sm text-[var(--foreground-secondary)]">
                Page {meta.page} of {meta.totalPages} &mdash; {meta.total} payments total
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
