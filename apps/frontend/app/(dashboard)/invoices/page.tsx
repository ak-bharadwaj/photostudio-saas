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
import { invoicesApi } from '@/lib/api';
import { formatDate, formatCurrency, getInvoiceStatusBadge } from '@/lib/utils';
import { Plus, Search, FileText, Eye, Download, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';

const PAGE_SIZE = 20;

interface Payment { amount: number; paidAt: string; }
interface Invoice {
  id: string;
  invoiceNumber: string;
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  status: string;
  dueDate?: string;
  createdAt: string;
  customer: { id: string; name: string; email: string };
  payments?: Payment[];
  booking?: { id: string; scheduledAt?: string };
}

interface Meta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [stats, setStats] = useState({ totalRevenue: 0, pendingRevenue: 0 });
  // Per-row loading states
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const { addToast } = useToast();
  const abortRef = useRef<AbortController | null>(null);

  const loadInvoices = useCallback(async (silent = false) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      if (!silent) setIsLoading(true);
      const params: Record<string, string | number> = { limit: PAGE_SIZE, page };
      if (statusFilter) params.status = statusFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();
      const [response, statsRes] = await Promise.all([
        invoicesApi.getAll(params),
        invoicesApi.getStats()
      ]);
      if (ctrl.signal.aborted) return;
      const payload = response.data;
      // Backend returns { data: [...], meta: {...} } or plain array
      if (payload?.data && payload?.meta) {
        setInvoices(payload.data);
        setMeta(payload.meta);
      } else {
        setInvoices(payload || []);
        setMeta({ total: (payload || []).length, page: 1, limit: PAGE_SIZE, totalPages: 1 });
      }
      setStats(statsRes.data || { totalRevenue: 0, pendingRevenue: 0 });
    } catch (e) {
      if ((e as { name?: string }).name === 'CanceledError') return;
      if (!silent) {
        const error = e as { response?: { data?: { message?: string } } };
        addToast('error', error.response?.data?.message || 'Failed to load invoices');
      }
    } finally {
      if (!abortRef.current?.signal.aborted && !silent) setIsLoading(false);
    }
  }, [statusFilter, searchTerm, page, addToast]);

  useEffect(() => {
    loadInvoices();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadInvoices(true);
    }, 30000);

    return () => {
      abortRef.current?.abort();
      clearInterval(interval);
    };
  }, [loadInvoices]);

  // Reset to page 1 whenever the status filter or search term changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchTerm]);

  const handleSendInvoice = async (invoiceId: string) => {
    setSendingIds(prev => new Set(prev).add(invoiceId));
    try {
      await invoicesApi.send(invoiceId.toString());
      addToast('success', 'Invoice sent successfully');
      void loadInvoices();
    } catch (e) {
      const error = e as { response?: { data?: { message?: string } } };
      addToast('error', error.response?.data?.message || 'Failed to send invoice');
    } finally {
      setSendingIds(prev => { const s = new Set(prev); s.delete(invoiceId); return s; });
    }
  };

  const handleDownloadPdf = async (invoiceId: string, invoiceNumber: string) => {
    setDownloadingIds(prev => new Set(prev).add(invoiceId));
    try {
      const response = await invoicesApi.downloadPdf(invoiceId.toString());
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Revoke the blob URL to free memory — must happen after the click
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
      addToast('success', 'Invoice downloaded successfully');
    } catch (e) {
      const error = e as { response?: { data?: { message?: string } } };
      addToast('error', error.response?.data?.message || 'Failed to download invoice');
    } finally {
      setDownloadingIds(prev => { const s = new Set(prev); s.delete(invoiceId); return s; });
    }
  };

  const statuses = [
    { value: '', label: 'All Statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'SENT', label: 'Sent' },
    { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
    { value: 'PAID', label: 'Paid' },
    { value: 'OVERDUE', label: 'Overdue' },
  ];

  // Stats: computed from current page data — shown as "on this page" context
  // Full aggregate stats come from the meta total count
  const getPaid = (inv: Invoice) => (inv.payments || []).reduce((s, p) => s + Number(p.amount), 0);

  // Global stats from API
  const totalRevenue = stats.totalRevenue;
  const pendingAmount = stats.pendingRevenue;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance"
        title="Billing & Invoices"
        subtitle="Track your revenue, manage invoices and issue professional billing for your appointments."
        accentColor="violet"
        actions={
          <Link href="/invoices/new">
            <Button size="lg" className="rounded-full shadow-lg shadow-[var(--primary)]/20">
              <Plus className="mr-2 h-5 w-5" /> New Invoice
            </Button>
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-10">
        <Card className="card-luxury p-8">
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--foreground-tertiary)] mb-3">Total Invoices</div>
          <div className="text-4xl font-black text-[var(--foreground)] font-heading">{meta.total}</div>
        </Card>

        <Card className="card-luxury p-8 border-l-4 border-l-[var(--success)]">
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--foreground-tertiary)] mb-3">Revenue (this page)</div>
          <div className="text-4xl font-black text-[var(--foreground)] font-heading">{formatCurrency(totalRevenue)}</div>
        </Card>

        <Card className="card-luxury p-8 border-l-4 border-l-[var(--warning)]">
          <div className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--foreground-tertiary)] mb-3">Pending (this page)</div>
          <div className="text-4xl font-black text-[var(--foreground)] font-heading">{formatCurrency(pendingAmount)}</div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Search by invoice number or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={statuses}
            />
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Invoices ({meta.total})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : (invoices || []).length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-[var(--foreground-tertiary)]" />
              <h3 className="mt-2 text-sm font-semibold text-[var(--foreground)]">No invoices</h3>
              <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
                {searchTerm || statusFilter ? 'No invoices match your filters.' : 'Get started by creating your first invoice.'}
              </p>
              {!searchTerm && !statusFilter && (
                <Link href="/invoices/new">
                  <Button className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    New Invoice
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/invoices/${invoice.id}`}
                            className="text-[var(--primary)] hover:underline"
                          >
                            {invoice.invoiceNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-[var(--foreground)]">{invoice.customer.name}</p>
                            <p className="text-sm text-[var(--foreground-secondary)]">{invoice.customer.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(Number(invoice.total || 0))}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(getPaid(invoice))}
                        </TableCell>
                        <TableCell>{invoice.dueDate ? formatDate(invoice.dueDate) : '—'}</TableCell>
                        <TableCell>
                          <Badge {...getInvoiceStatusBadge(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link href={`/invoices/${invoice.id}`}>
                              <Button variant="ghost" size="sm" aria-label={`View invoice ${invoice.invoiceNumber}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>

                            {invoice.status === 'DRAFT' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                aria-label={`Send invoice ${invoice.invoiceNumber}`}
                                disabled={sendingIds.has(invoice.id)}
                                onClick={() => handleSendInvoice(invoice.id)}
                              >
                                {sendingIds.has(invoice.id)
                                  ? <LoadingSpinner className="h-4 w-4" />
                                  : <Send className="h-4 w-4" />}
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label={`Download invoice ${invoice.invoiceNumber} as PDF`}
                              disabled={downloadingIds.has(invoice.id)}
                              onClick={() => handleDownloadPdf(invoice.id, invoice.invoiceNumber)}
                            >
                              {downloadingIds.has(invoice.id)
                                ? <LoadingSpinner className="h-4 w-4" />
                                : <Download className="h-4 w-4" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List (Visible on mobile) */}
              <div className="sm:hidden grid grid-cols-1 gap-4">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="border border-border/40 rounded-2xl overflow-hidden bg-surface-0 shadow-sm">
                    <div className="p-4 flex items-center justify-between border-b border-border/10 bg-surface-1/30">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm tracking-tight">{invoice.invoiceNumber}</p>
                          <p className="text-[11px] text-foreground-tertiary font-black uppercase tracking-widest truncate max-w-[120px]">
                            {invoice.customer.name}
                          </p>
                        </div>
                      </div>
                      <Badge {...getInvoiceStatusBadge(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </div>
                    <div className="px-4 py-3 border-b border-border/5 bg-surface-0/50 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-black text-foreground-tertiary uppercase tracking-widest mb-1">Total Amount</p>
                        <p className="text-lg font-black text-foreground tabular-nums">{formatCurrency(Number(invoice.total || 0))}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-black text-foreground-tertiary uppercase tracking-widest mb-1">Due Date</p>
                        <p className="text-xs font-bold text-foreground">{invoice.dueDate ? formatDate(invoice.dueDate) : '—'}</p>
                      </div>
                    </div>
                    <div className="p-4 flex items-center justify-between bg-surface-1/20">
                      <Link href={`/invoices/${invoice.id}`}>
                        <Button variant="outline" size="sm" className="rounded-xl font-bold h-9">
                          <Eye className="h-4 w-4 mr-2" /> View
                        </Button>
                      </Link>
                      <div className="flex items-center gap-2">
                        {invoice.status === 'DRAFT' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl h-9 w-9 p-0"
                            disabled={sendingIds.has(invoice.id)}
                            onClick={() => handleSendInvoice(invoice.id)}
                          >
                            {sendingIds.has(invoice.id) ? <LoadingSpinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl h-9 w-9 p-0"
                          disabled={downloadingIds.has(invoice.id)}
                          onClick={() => handleDownloadPdf(invoice.id, invoice.invoiceNumber)}
                        >
                          {downloadingIds.has(invoice.id) ? <LoadingSpinner className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Pagination controls */}
          {!isLoading && meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
              <p className="text-sm text-[var(--foreground-secondary)]">
                Page {meta.page} of {meta.totalPages} &mdash; {meta.total} invoices total
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
