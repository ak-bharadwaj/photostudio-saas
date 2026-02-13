'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { invoicesApi, paymentsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingPage } from '@/components/ui/loading';
import { useToast } from '@/components/ui/toast';

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

export default function InvoiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    paymentMethod: 'CASH',
    transactionId: '',
    notes: '',
  });

  useEffect(() => {
    loadInvoice();
  }, [params.id]);

  const loadInvoice = async () => {
    try {
      const response = await invoicesApi.getOne(params.id as string);
      setInvoice(response.data);
      setPaymentData((prev) => ({ 
        ...prev, 
        amount: response.data.total - getTotalPaid(response.data.payments) 
      }));
    } catch (error: any) {
      addToast('error', error.response?.data?.message || 'Failed to load invoice');
      router.push('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const getTotalPaid = (payments: Payment[]) => {
    return payments.reduce((sum, p) => sum + Number(p.amount), 0);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'gray',
      SENT: 'blue',
      PARTIALLY_PAID: 'yellow',
      PAID: 'green',
      OVERDUE: 'red',
      CANCELLED: 'gray',
    };
    return colors[status] || 'gray';
  };

  const handleSendInvoice = async () => {
    if (!invoice) return;
    setSending(true);
    try {
      await invoicesApi.send(invoice.id);
      addToast('success', 'Invoice sent successfully');
      loadInvoice();
    } catch (error: any) {
      addToast('error', error.response?.data?.message || 'Failed to send invoice');
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
      addToast('success', 'Invoice downloaded');
    } catch (error: any) {
      addToast('error', error.response?.data?.message || 'Failed to download invoice');
    } finally {
      setDownloading(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    try {
      await paymentsApi.create({
        invoiceId: invoice.id,
        ...paymentData,
      });
      addToast('success', 'Payment recorded successfully');
      setShowPaymentModal(false);
      loadInvoice();
    } catch (error: any) {
      addToast('error', error.response?.data?.message || 'Failed to record payment');
    }
  };

  if (loading) return <LoadingPage />;
  if (!invoice) return <div>Invoice not found</div>;

  const totalPaid = getTotalPaid(invoice.payments);
  const balance = invoice.total - totalPaid;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{invoice.invoiceNumber}</h1>
          <p className="text-gray-500">
            Created on {new Date(invoice.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/invoices/${invoice.id}/edit`)}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={downloading}
          >
            {downloading ? 'Downloading...' : 'Download PDF'}
          </Button>
          <Button
            onClick={handleSendInvoice}
            disabled={sending || invoice.status === 'PAID'}
          >
            {sending ? 'Sending...' : 'Send Invoice'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Invoice Details */}
        <div className="col-span-2 space-y-6">
          <Card className="p-6">
            <div className="flex justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Bill To:</h2>
                <p className="font-medium">{invoice.customer.name}</p>
                {invoice.customer.email && <p className="text-sm text-gray-500">{invoice.customer.email}</p>}
                <p className="text-sm text-gray-500">{invoice.customer.phone}</p>
              </div>
              <div className="text-right">
                <Badge color={getStatusColor(invoice.status)}>{invoice.status}</Badge>
                {invoice.dueDate && (
                  <p className="text-sm text-gray-500 mt-2">
                    Due: {new Date(invoice.dueDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            {invoice.booking && (
              <div className="mb-6 p-4 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">
                  Related Service: <span className="font-medium">{invoice.booking.service.name}</span>
                </p>
              </div>
            )}

            {/* Line Items */}
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-2 font-semibold">Description</th>
                  <th className="pb-2 font-semibold text-right">Qty</th>
                  <th className="pb-2 font-semibold text-right">Rate</th>
                  <th className="pb-2 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="py-3">{item.description}</td>
                    <td className="py-3 text-right">{item.quantity}</td>
                    <td className="py-3 text-right">${Number(item.rate).toFixed(2)}</td>
                    <td className="py-3 text-right">${Number(item.amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="mt-6 ml-auto w-64 space-y-2">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span>${Number(invoice.subtotal).toFixed(2)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Discount:</span>
                  <span>-${Number(invoice.discount).toFixed(2)}</span>
                </div>
              )}
              {invoice.tax > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax:</span>
                  <span>${Number(invoice.tax).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold pt-2 border-t">
                <span>Total:</span>
                <span>${Number(invoice.total).toFixed(2)}</span>
              </div>
              {totalPaid > 0 && (
                <>
                  <div className="flex justify-between text-green-600">
                    <span>Paid:</span>
                    <span>-${totalPaid.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Balance Due:</span>
                    <span>${balance.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            {invoice.notes && (
              <div className="mt-6 p-4 bg-gray-50 rounded">
                <h3 className="font-semibold mb-2">Notes:</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Summary */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Payment Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Amount:</span>
                <span className="font-semibold">${Number(invoice.total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>Amount Paid:</span>
                <span className="font-semibold">${totalPaid.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-3 border-t">
                <span>Balance:</span>
                <span>${balance.toFixed(2)}</span>
              </div>
            </div>
            {balance > 0 && (
              <Button
                className="w-full mt-4"
                onClick={() => setShowPaymentModal(true)}
              >
                Record Payment
              </Button>
            )}
          </Card>

          {/* Payment History */}
          {invoice.payments.length > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Payment History</h3>
              <div className="space-y-3">
                {invoice.payments.map((payment) => (
                  <div key={payment.id} className="pb-3 border-b last:border-0">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium">${Number(payment.amount).toFixed(2)}</span>
                      <Badge color="gray">{payment.paymentMethod}</Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                      {new Date(payment.paidAt).toLocaleDateString()}
                    </p>
                    {payment.transactionId && (
                      <p className="text-xs text-gray-500">ID: {payment.transactionId}</p>
                    )}
                    {payment.notes && (
                      <p className="text-xs text-gray-600 mt-1">{payment.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Record Payment</h2>
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full px-3 py-2 border rounded"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({ ...paymentData, amount: Number(e.target.value) })}
                  max={balance}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Payment Method</label>
                <select
                  className="w-full px-3 py-2 border rounded"
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Transaction ID (Optional)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded"
                  value={paymentData.transactionId}
                  onChange={(e) => setPaymentData({ ...paymentData, transactionId: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                <textarea
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowPaymentModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Record Payment
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
