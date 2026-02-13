'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/components/ui/toast';
import { paymentsApi } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Search, DollarSign, CreditCard, Receipt } from 'lucide-react';

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
  recentPayments: any[];
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const { addToast } = useToast();

  useEffect(() => {
    loadData();
  }, [methodFilter]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const params: any = { limit: 100 };
      if (methodFilter) params.paymentMethod = methodFilter;
      
      const [paymentsResponse, statsResponse] = await Promise.all([
        paymentsApi.getAll(params),
        paymentsApi.getStats(),
      ]);
      
      setPayments(paymentsResponse.data);
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Failed to load payments:', error);
      addToast('error', 'Failed to load payments');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPayments = payments.filter((payment) => {
    const search = searchTerm.toLowerCase();
    return (
      payment.invoice.invoiceNumber.toLowerCase().includes(search) ||
      payment.invoice.customer.name.toLowerCase().includes(search) ||
      payment.invoice.customer.email.toLowerCase().includes(search) ||
      payment.transactionId?.toLowerCase().includes(search) ||
      ''
    );
  });

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
          <p className="mt-2 text-gray-600">Track all payment transactions</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <Receipt className="mr-2 h-4 w-4" />
                Total Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPayments}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
                <DollarSign className="mr-2 h-4 w-4" />
                Total Amount Received
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(Number(stats.totalAmount))}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by invoice, customer, or transaction ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {paymentMethods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Payments ({filteredPayments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No payments</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'No payments match your search.' : 'Payments will appear here once invoices are paid.'}
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
                {filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {formatDate(payment.paidAt)}
                    </TableCell>
                    <TableCell>
                      <Link 
                        href={`/invoices/${payment.invoice.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {payment.invoice.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{payment.invoice.customer.name}</p>
                        <p className="text-sm text-gray-500">{payment.invoice.customer.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {formatCurrency(Number(payment.amount))}
                    </TableCell>
                    <TableCell>
                      <Badge {...getPaymentMethodBadge(payment.paymentMethod)}>
                        {formatPaymentMethod(payment.paymentMethod)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {payment.transactionId || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Link href={`/invoices/${payment.invoice.id}`}>
                        <Button variant="ghost" size="sm">
                          View Invoice
                        </Button>
                      </Link>
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
