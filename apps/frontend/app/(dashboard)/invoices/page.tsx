'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
import { Plus, Search, FileText, Eye, Download, Send } from 'lucide-react';

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

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { addToast } = useToast();

  const loadInvoices = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: any = { limit: 200 };
      if (statusFilter) params.status = statusFilter;
      const response = await invoicesApi.getAll(params);
      // Backend returns { data: [...], meta: {...} }
      setInvoices(response.data?.data || response.data || []);
    } catch (e) {
      const error = e as { response?: { data?: { message?: string } } };
      console.error('Failed to load invoices:', error);
      addToast('error', error.response?.data?.message || 'Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, addToast]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const handleSendInvoice = async (invoiceId: string) => {
    try {
      await invoicesApi.send(invoiceId.toString());
      addToast('success', 'Invoice sent successfully');
      loadInvoices();
    } catch (e) {
      const error = e as { response?: { data?: { message?: string } } };
      addToast('error', error.response?.data?.message || 'Failed to send invoice');
    }
  };

  const handleDownloadPdf = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const response = await invoicesApi.downloadPdf(invoiceId.toString());
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      addToast('success', 'Invoice downloaded successfully');
    } catch (e) {
      const error = e as { response?: { data?: { message?: string } } };
      addToast('error', error.response?.data?.message || 'Failed to download invoice');
    }
  };

  const filteredInvoices = (invoices || []).filter((invoice) => {
    if (!invoice?.customer) return false;
    const search = searchTerm.toLowerCase();
    return (
      (invoice.invoiceNumber || '').toLowerCase().includes(search) ||
      (invoice.customer.name || '').toLowerCase().includes(search) ||
      (invoice.customer.email || '').toLowerCase().includes(search)
    );
  });

  const statuses = [
    { value: '', label: 'All Statuses' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'SENT', label: 'Sent' },
    { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
    { value: 'PAID', label: 'Paid' },
    { value: 'OVERDUE', label: 'Overdue' },
  ];

  // Calculate stats
  const getPaid = (inv: Invoice) => (inv.payments || []).reduce((s, p) => s + Number(p.amount), 0);
  const totalRevenue = (invoices || [])
    .filter(inv => inv?.status === 'PAID')
    .reduce((sum, inv) => sum + Number(inv?.total || 0), 0);
  const pendingAmount = (invoices || [])
    .filter(inv => inv && ['SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(inv.status))
    .reduce((sum, inv) => sum + Math.max(0, Number(inv?.total || 0) - getPaid(inv)), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-[var(--foreground)] font-heading">Billing</h1>
          <p className="mt-2 text-base text-[var(--foreground-secondary)] font-medium">Track your revenue, manage invoices and issue professional billing.</p>
        </div>
        <Link href="/invoices/new">
          <Button size="lg" className="rounded-full shadow-lg shadow-indigo-100">
            <Plus className="mr-2 h-5 w-5" /> New Invoice
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-10">
        <Card className="card-luxury p-8">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Total Invoices</div>
          <div className="text-4xl font-black text-[var(--foreground)] font-heading">{(invoices || []).length}</div>
        </Card>

        <Card className="card-luxury p-8 border-l-4 border-l-emerald-500">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Total Revenue</div>
          <div className="text-4xl font-black text-[var(--foreground)] font-heading">{formatCurrency(totalRevenue)}</div>
        </Card>

        <Card className="card-luxury p-8 border-l-4 border-l-amber-500">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Pending Amount</div>
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
          <CardTitle>All Invoices ({filteredInvoices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : (filteredInvoices || []).length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No invoices</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'No invoices match your search.' : 'Get started by creating your first invoice.'}
              </p>
              {!searchTerm && (
                <Link href="/invoices/new">
                  <Button className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    New Invoice
                  </Button>
                </Link>
              )}
            </div>
          ) : (
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
                {filteredInvoices.map((invoice) => (
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
                        <p className="font-medium text-gray-900">{invoice.customer.name}</p>
                        <p className="text-sm text-gray-500">{invoice.customer.email}</p>
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
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>

                        {invoice.status === 'DRAFT' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSendInvoice(invoice.id)}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadPdf(invoice.id, invoice.invoiceNumber)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
