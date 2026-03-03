'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { invoicesApi, paymentsApi } from '@/lib/api';
import { formatDate, formatCurrency, getInvoiceStatusBadge } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Modal, ModalFooter } from '@/components/ui/modal';
import { Select, Textarea, Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import {
  ArrowLeft,
  Download,
  Send,
  Edit2,
  CreditCard,
  CheckCircle,
  FileText,
  User,
  Calendar,
  Hash,
  Receipt,
} from 'lucide-react';

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface Payment {
  id: string;
  amount: number;
  paymentMethod: string;
  transactionId?: string;
  notes?: string;
  paidAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  lineItems: LineItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  dueDate?: string;
  notes?: string;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    email?: string;
    phone: string;
  };
  booking?: {
    id: string;
    service: {
      name: string;
    };
  };
  payments: Payment[];
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  UPI: 'UPI',
  CARD: 'Card',
  OTHER: 'Other',
};

export default function InvoiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paymentMethod: 'CASH',
    transactionId: '',
    notes: '',
  });

  const abortRef = useRef<AbortController | null>(null);

  const loadInvoice = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const response = await invoicesApi.getOne(params.id as string);
      if (ctrl.signal.aborted) return;
      const data: Invoice = response.data;
      setInvoice(data);
      if (data) {
        setPaymentData((prev) => ({
          ...prev,
          amount: Math.max(0, (data.total || 0) - getTotalPaid(data.payments || [])),
        }));
      }
    } catch (error: unknown) {
      if (ctrl.signal.aborted) return;
      const err = error as { response?: { status?: number; data?: { message?: string } } };
      if (err?.response?.status === 404) {
        setNotFound(true);
      } else {
        addToast('error', err.response?.data?.message || 'Failed to load invoice');
        router.push('/invoices');
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [params.id, addToast, router]);

  useEffect(() => {
    loadInvoice();
    return () => abortRef.current?.abort();
  }, [loadInvoice]);

  const getTotalPaid = (payments: Payment[]) =>
    (payments || []).reduce((sum, p) => sum + Number(p?.amount || 0), 0);

  const handleSendInvoice = async () => {
    if (!invoice) return;
    setSending(true);
    try {
      await invoicesApi.send(invoice.id);
      addToast('success', 'Invoice sent successfully');
      loadInvoice();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      addToast('error', err.response?.data?.message || 'Failed to send invoice');
    } finally {
      setSending(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    setDownloading(true);
    try {
      const response = await invoicesApi.downloadPdf(invoice.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${invoice.invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast('success', 'Invoice downloaded');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      addToast('error', err.response?.data?.message || 'Failed to download invoice');
    } finally {
      setDownloading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice || isSubmittingPayment) return;
    setIsSubmittingPayment(true);
    try {
      await paymentsApi.create({ invoiceId: invoice.id, ...paymentData });
      addToast('success', 'Payment recorded successfully');
      setShowPaymentModal(false);
      loadInvoice();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      addToast('error', err.response?.data?.message || 'Failed to record payment');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  /* ── Loading / Not-found states ─────────────────────────────────────────── */

  if (loading) return (
    <div className="space-y-6">
      <div className="skeleton h-40 w-full rounded-2xl" />
      <div className="skeleton h-64 w-full rounded-2xl" />
      <div className="skeleton h-64 w-full rounded-2xl" />
    </div>
  );

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-luxury-in">
        <div className="h-20 w-20 rounded-full bg-[var(--surface-2)] flex items-center justify-center mb-6">
          <FileText className="h-10 w-10 text-[var(--foreground-tertiary)]" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">Invoice Not Found</h2>
        <p className="text-[var(--foreground-secondary)] mb-8 max-w-sm">
          This invoice may have been deleted or you don&apos;t have permission to view it.
        </p>
        <Link href="/invoices">
          <Button leftIcon={<ArrowLeft className="h-4 w-4" />}>Back to Invoices</Button>
        </Link>
      </div>
    );
  }

  if (!invoice) return null;

  const totalPaid = getTotalPaid(invoice.payments || []);
  const balance = Math.max(0, (invoice.total || 0) - totalPaid);
  const { variant: statusVariant } = getInvoiceStatusBadge(invoice.status);

  /* ── Main render ─────────────────────────────────────────────────────────── */

  return (
    <div className="space-y-6 animate-luxury-in">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/invoices">
            <Button variant="ghost" size="sm" className="mb-3 -ml-2" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to Invoices
            </Button>
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)] font-heading">
              {invoice.invoiceNumber}
            </h1>
            <Badge variant={statusVariant}>{invoice.status.replace('_', ' ')}</Badge>
          </div>
          <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
            Created {formatDate(invoice.createdAt)}
            {invoice.dueDate && ` · Due ${formatDate(invoice.dueDate)}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/invoices/${invoice.id}/edit`}>
            <Button variant="outline" size="sm" leftIcon={<Edit2 className="h-4 w-4" />}>
              Edit
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            isLoading={downloading}
            disabled={downloading}
            leftIcon={<Download className="h-4 w-4" />}
          >
            {downloading ? 'Downloading…' : 'Download PDF'}
          </Button>
          <Button
            size="sm"
            onClick={handleSendInvoice}
            isLoading={sending}
            disabled={sending || invoice.status === 'PAID'}
            leftIcon={<Send className="h-4 w-4" />}
          >
            {sending ? 'Sending…' : 'Send Invoice'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Invoice Details ────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="card-luxury overflow-hidden">
            {/* Bill-To / Meta */}
            <div className="p-6 border-b border-[var(--border-light)]">
              <div className="flex flex-wrap justify-between gap-6">
                {/* Customer */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground-tertiary)] uppercase tracking-wider mb-2">
                    <User className="h-3.5 w-3.5" /> Bill To
                  </div>
                  <p className="text-base font-semibold text-[var(--foreground)]">{invoice.customer.name}</p>
                  {invoice.customer.email && (
                    <p className="text-sm text-[var(--foreground-secondary)]">{invoice.customer.email}</p>
                  )}
                  <p className="text-sm text-[var(--foreground-secondary)]">{invoice.customer.phone}</p>
                </div>

                {/* Invoice meta */}
                <div className="space-y-1 text-right">
                  <div className="flex items-center justify-end gap-2 text-xs font-semibold text-[var(--foreground-tertiary)] uppercase tracking-wider mb-2">
                    <Hash className="h-3.5 w-3.5" /> Invoice Details
                  </div>
                  <p className="text-sm text-[var(--foreground-secondary)]">
                    <span className="font-medium">Number:</span> {invoice.invoiceNumber}
                  </p>
                  <p className="text-sm text-[var(--foreground-secondary)]">
                    <span className="font-medium">Date:</span> {formatDate(invoice.createdAt)}
                  </p>
                  {invoice.dueDate && (
                    <p className="text-sm text-[var(--foreground-secondary)]">
                      <span className="font-medium">Due:</span> {formatDate(invoice.dueDate)}
                    </p>
                  )}
                </div>
              </div>

              {invoice.booking && (
                <div className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--surface-1)] border border-[var(--border-light)]">
                  <Calendar className="h-4 w-4 text-[var(--primary)] shrink-0" />
                  <p className="text-sm text-[var(--foreground-secondary)]">
                    Related service:{' '}
                    <span className="font-semibold text-[var(--foreground)]">
                      {invoice.booking.service.name}
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Line Items table */}
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-light)]">
                      <th className="pb-3 text-left font-semibold text-[var(--foreground-secondary)]">Description</th>
                      <th className="pb-3 text-right font-semibold text-[var(--foreground-secondary)]">Qty</th>
                      <th className="pb-3 text-right font-semibold text-[var(--foreground-secondary)]">Rate</th>
                      <th className="pb-3 text-right font-semibold text-[var(--foreground-secondary)]">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-light)]">
                    {(invoice.lineItems || []).map((item, index) => (
                      <tr key={index} className="hover:bg-[var(--surface-1)] transition-colors">
                        <td className="py-3 text-[var(--foreground)]">{item?.description || '—'}</td>
                        <td className="py-3 text-right text-[var(--foreground-secondary)]">{item?.quantity ?? 0}</td>
                        <td className="py-3 text-right text-[var(--foreground-secondary)]">{formatCurrency(item?.rate)}</td>
                        <td className="py-3 text-right font-semibold text-[var(--foreground)]">{formatCurrency(item?.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="mt-6 ml-auto max-w-xs space-y-2">
                <div className="flex justify-between text-sm text-[var(--foreground-secondary)]">
                  <span>Subtotal</span>
                  <span>{formatCurrency(invoice.subtotal)}</span>
                </div>
                {(invoice.discount || 0) > 0 && (
                  <div className="flex justify-between text-sm text-[var(--success)]">
                    <span>Discount</span>
                    <span>−{formatCurrency(invoice.discount)}</span>
                  </div>
                )}
                {(invoice.tax || 0) > 0 && (
                  <div className="flex justify-between text-sm text-[var(--foreground-secondary)]">
                    <span>Tax</span>
                    <span>{formatCurrency(invoice.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-black pt-2 border-t border-[var(--border)] text-[var(--foreground)]">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.total)}</span>
                </div>
                {totalPaid > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-[var(--success)]">
                      <span>Paid</span>
                      <span>−{formatCurrency(totalPaid)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-[var(--foreground)] pt-1 border-t border-[var(--border)]">
                      <span>Balance Due</span>
                      <span className={balance > 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'}>
                        {formatCurrency(balance)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {invoice.notes && (
                <div className="mt-6 p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border-light)]">
                  <h3 className="text-xs font-semibold text-[var(--foreground-tertiary)] uppercase tracking-wider mb-2">Notes</h3>
                  <p className="text-sm text-[var(--foreground-secondary)] whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ── Right sidebar ────────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Payment Summary */}
          <Card className="card-luxury p-6">
            <div className="flex items-center gap-2 mb-5">
              <Receipt className="h-5 w-5 text-[var(--primary)]" />
              <h3 className="font-semibold text-[var(--foreground)]">Payment Summary</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--foreground-secondary)]">Invoice Total</span>
                <span className="font-semibold text-[var(--foreground)]">{formatCurrency(invoice.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--foreground-secondary)]">Amount Paid</span>
              <span className="font-semibold text-[var(--success)]">{formatCurrency(totalPaid)}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-3 border-t border-[var(--border-light)] text-[var(--foreground)]">
                <span>Balance Due</span>
                <span className={balance > 0 ? 'text-[var(--danger)]' : 'text-[var(--success)]'}>
                  {formatCurrency(balance)}
                </span>
              </div>
            </div>
            {balance > 0 && (
              <Button
                className="w-full mt-5"
                onClick={() => setShowPaymentModal(true)}
                leftIcon={<CreditCard className="h-4 w-4" />}
              >
                Record Payment
              </Button>
            )}
            {balance === 0 && totalPaid > 0 && (
              <div className="mt-4 flex items-center gap-2 text-[var(--success)] text-sm font-medium">
                <CheckCircle className="h-4 w-4 shrink-0" />
                Fully paid
              </div>
            )}
          </Card>

          {/* Payment History */}
          {(invoice.payments || []).length > 0 && (
            <Card className="card-luxury p-6">
              <h3 className="font-semibold text-[var(--foreground)] mb-4">Payment History</h3>
              <div className="space-y-3">
                {invoice.payments.map((payment) => (
                  <div key={payment.id} className="pb-3 border-b border-[var(--border-light)] last:border-0 last:pb-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-[var(--foreground)]">{formatCurrency(payment.amount)}</span>
                      <Badge variant="secondary" className="text-xs">
                        {METHOD_LABELS[payment.paymentMethod] || payment.paymentMethod}
                      </Badge>
                    </div>
                    <p className="text-xs text-[var(--foreground-tertiary)]">{formatDate(payment.paidAt)}</p>
                    {payment.transactionId && (
                      <p className="text-xs text-[var(--foreground-tertiary)]">Ref: {payment.transactionId}</p>
                    )}
                    {payment.notes && (
                      <p className="text-xs text-[var(--foreground-secondary)] mt-1">{payment.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ── Record Payment Modal ────────────────────────────────────────────── */}
      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Record Payment"
        description="Enter the payment details to record against this invoice."
        size="sm"
      >
        <form id="payment-form" onSubmit={handleRecordPayment} className="space-y-4">
          <div>
            <Input
              id="pay-amount"
              type="number"
              label="Amount"
              required
              step="1"
              min="1"
              max={balance}
              value={paymentData.amount}
              onChange={(e) => setPaymentData({ ...paymentData, amount: Number(e.target.value) })}
              helperText={`Balance due: ${formatCurrency(balance)}`}
            />
          </div>

          <div>
            <Select
              id="pay-method"
              label="Payment Method"
              required
              value={paymentData.paymentMethod}
              onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
              options={[
                { value: 'CASH', label: 'Cash' },
                { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                { value: 'UPI', label: 'UPI' },
                { value: 'CARD', label: 'Card' },
                { value: 'OTHER', label: 'Other' },
              ]}
            />
          </div>

          <div>
            <Input
              id="pay-txn"
              type="text"
              label="Transaction ID"
              placeholder="UTR / reference number"
              value={paymentData.transactionId}
              onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
              helperText="Optional"
            />
          </div>

          <div>
            <Textarea
              id="pay-notes"
              label="Notes"
              rows={3}
              placeholder="Any additional notes…"
              value={paymentData.notes}
              onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
              helperText="Optional"
            />
          </div>
        </form>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPaymentModal(false)}
            disabled={isSubmittingPayment}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="payment-form"
            isLoading={isSubmittingPayment}
            disabled={isSubmittingPayment}
            leftIcon={<CreditCard className="h-4 w-4" />}
          >
            Record Payment
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
