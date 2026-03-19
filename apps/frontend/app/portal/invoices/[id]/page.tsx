'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading';
import axios from 'axios';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import {
  FileText,
  Download,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Building,
  CreditCard,
  History,
  TrendingUp,
  Receipt,
  User,
  Link as LinkIcon,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const safeGetItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(key); } catch { return null; }
};

interface Invoice {
  id: string;
  invoiceNumber: string;
  total: number;
  status: string;
  dueDate?: string;
  createdAt: string;
  notes?: string;
  studio: { 
    name: string; 
    slug: string;
    email: string; 
    phone: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  booking: {
    id: string;
    scheduledAt: string;
    service: {
      name: string;
      price: number;
    };
  };
  payments: Array<{
    id: string;
    amount: number;
    paidAt: string;
    method: string;
    transactionId?: string;
  }>;
}

const STATUS_CFG: Record<string, {
  variant: 'default' | 'success' | 'warning' | 'danger' | 'info';
  label: string;
  color: string;
  bg: string;
}> = {
  DRAFT: { variant: 'default', label: 'Draft', color: '#4b5563', bg: 'rgba(75,85,99,0.1)' },
  SENT: { variant: 'info', label: 'Awaiting Payment', color: '#2563eb', bg: 'rgba(37,99,235,0.1)' },
  PAID: { variant: 'success', label: 'Fully Paid', color: '#059669', bg: 'rgba(5,150,105,0.1)' },
  PARTIALLY_PAID: { variant: 'warning', label: 'Partially Paid', color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
  OVERDUE: { variant: 'danger', label: 'Overdue', color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
};

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { addToast } = useToast();
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const fetchInvoice = useCallback(async () => {
    const token = safeGetItem('accessToken');
    if (!token) {
      router.replace('/portal/login');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}/portal/invoices/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvoice(res.data);
    } catch (err) {
      console.error('Failed to load invoice', err);
      setError('Invoice retrieval protocol failed. Access denied or record missing.');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handleDownload = async () => {
    if (!invoice) return;
    setDownloading(true);
    try {
      const token = safeGetItem('accessToken');
      const response = await axios.get(
        `${API_URL}/portal/invoices/${id}/pdf`,
        {
          responseType: 'blob',
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${invoice.invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast('success', 'Invoice downloaded successfully.');
    } catch {
      addToast('error', 'PDF generation failed. Please contact partner support.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" />
        <p className="text-[10px] font-black tracking-widest uppercase text-foreground-tertiary mt-4">FETCHING FINANCIAL DATA</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="h-20 w-20 rounded-3xl bg-danger/10 flex items-center justify-center mb-6">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-2xl font-black mb-2">Invoice Not Found</h2>
        <p className="text-foreground-tertiary max-w-xs mb-8">{error || 'The requested invoice could not be located.'}</p>
        <Button onClick={() => router.push('/portal/invoices')} variant="outline" className="rounded-xl px-8">
          <ArrowLeft className="mr-2 h-4 w-4" /> BACK TO BILLING
        </Button>
      </div>
    );
  }

  const status = STATUS_CFG[invoice.status] || STATUS_CFG.DRAFT;
  const paidAmount = (invoice.payments ?? []).reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const balance = invoice.total - paidAmount;

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-fade-in pb-20">
      {/* ── BREADCRUMB ── */}
      <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[.3em] text-foreground-tertiary">
        <Link href="/portal" className="hover:text-primary transition-colors">DASHBOARD</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/portal/invoices" className="hover:text-primary transition-colors">BILLING</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">INVOICE #{invoice.invoiceNumber}</span>
      </div>

      {/* ── TOP ACTION BAR ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">Tax Invoice</h1>
          <p className="text-foreground-tertiary text-sm mt-1">Generated on {formatDate(invoice.createdAt)}</p>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <Button 
            variant="outline" 
            className="flex-1 sm:flex-none rounded-2xl h-12 px-6 font-black tracking-widest text-[10px] uppercase border-border hover:bg-surface-2"
            onClick={() => router.push('/portal/invoices')}
          >
             BACK
          </Button>
          <Button 
            variant="primary" 
            className="flex-1 sm:flex-none rounded-2xl h-12 px-6 font-black tracking-widest text-[10px] uppercase"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? <LoadingSpinner size="sm" /> : <><Download className="mr-2 h-4 w-4" /> DOWNLOAD PDF</>}
          </Button>
        </div>
      </div>

      {/* ── MAIN INVOICE BODY ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-10">
          
          {/* SENDER & RECEIVER */}
          <div className="glass-ultra rounded-[2rem] border border-border p-8 sm:p-10 grid grid-cols-1 sm:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-black tracking-widest uppercase text-primary block mb-3">ISSUED BY</span>
                <h3 className="text-xl font-black">{invoice.studio.name}</h3>
                <div className="mt-3 text-sm text-foreground-secondary space-y-1 leading-relaxed">
                  <p>{invoice.studio.address}</p>
                  <p>{invoice.studio.city}, {invoice.studio.state} {invoice.studio.zipCode}</p>
                  <p className="pt-2 font-bold">{invoice.studio.email}</p>
                  <p>{invoice.studio.phone}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-black tracking-widest uppercase text-primary block mb-3">BILL TO</span>
                <h3 className="text-xl font-black">{invoice.customer.name}</h3>
                <div className="mt-3 text-sm text-foreground-secondary space-y-1 leading-relaxed text-right sm:text-left">
                  <p className="font-bold">{invoice.customer.email}</p>
                  <p>{invoice.customer.phone}</p>
                </div>
              </div>
            </div>
          </div>

          {/* LINE ITEMS */}
          <div className="glass-ultra rounded-[2rem] border border-border overflow-hidden">
             <div className="p-8 border-b border-border bg-surface-1/50">
                <h3 className="text-xs font-black tracking-[0.3em] uppercase text-foreground-tertiary">LINE ITEMS</h3>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead>
                   <tr className="bg-surface-2/50 text-[10px] font-black uppercase tracking-widest text-foreground-tertiary">
                     <th className="px-8 py-4">Service Details</th>
                     <th className="px-8 py-4 text-right">Price</th>
                     <th className="px-8 py-4 text-center">Qty</th>
                     <th className="px-8 py-4 text-right">Total</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-border">
                   <tr className="text-sm">
                     <td className="px-8 py-8">
                        <div className="flex items-start gap-4">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Receipt className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-black text-base">{invoice.booking.service.name}</p>
                            <p className="text-xs text-foreground-tertiary mt-1 flex items-center gap-2">
                              <LinkIcon className="h-3 w-3" /> Engagement #{invoice.booking.id.slice(-6).toUpperCase()} · {formatDate(invoice.booking.scheduledAt)}
                            </p>
                          </div>
                        </div>
                     </td>
                     <td className="px-8 py-8 text-right font-bold tabular-nums">
                       {formatCurrency(invoice.booking.service.price)}
                     </td>
                     <td className="px-8 py-8 text-center font-bold">1</td>
                     <td className="px-8 py-8 text-right font-black tabular-nums">
                       {formatCurrency(invoice.total)}
                     </td>
                   </tr>
                 </tbody>
               </table>
             </div>
             
             <div className="p-8 bg-surface-1/30 flex flex-col items-end border-t border-border">
               <div className="w-full sm:w-64 space-y-4">
                 <div className="flex justify-between text-sm font-bold text-foreground-tertiary">
                   <span>SUBTOTAL</span>
                   <span className="tabular-nums">{formatCurrency(invoice.total)}</span>
                 </div>
                 <div className="flex justify-between text-sm font-bold text-foreground-tertiary">
                   <span>TAX (0%)</span>
                   <span className="tabular-nums">{formatCurrency(0)}</span>
                 </div>
                 <div className="h-px bg-border w-full" />
                 <div className="flex justify-between items-center pt-2">
                   <span className="text-xs font-black tracking-widest uppercase text-foreground">TOTAL AMOUNT</span>
                   <span className="text-2xl font-black tracking-tighter text-primary tabular-nums">{formatCurrency(invoice.total)}</span>
                 </div>
               </div>
             </div>
          </div>

          {/* PAYMENT HISTORY */}
          <div className="glass-ultra rounded-[2rem] border border-border p-8 sm:p-10">
            <h3 className="text-xs font-black tracking-[0.3em] uppercase text-foreground-tertiary mb-8 flex items-center gap-3">
              <History className="h-4 w-4" /> PAYMENT TRANSACTIONS
            </h3>
            
            {invoice.payments.length === 0 ? (
              <div className="text-center py-10 bg-surface-2/30 rounded-3xl border border-dashed border-border-strong">
                <CreditCard className="h-8 w-8 text-foreground-tertiary mx-auto mb-3 opacity-20" />
                <p className="text-sm font-bold text-foreground-tertiary">No payments recorded for this invoice.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {invoice.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-5 bg-surface-1 border border-border rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="font-black text-sm uppercase tracking-widest">{payment.method}</p>
                        <p className="text-[10px] font-bold text-foreground-tertiary">{formatDate(payment.paidAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-emerald-500 tabular-nums">{formatCurrency(payment.amount)}</p>
                      {payment.transactionId && (
                        <p className="text-[9px] font-mono text-foreground-tertiary truncate max-w-[100px]">{payment.transactionId}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR: STATUS & TOTALS */}
        <div className="space-y-8">
           <div className="glass-ultra rounded-[2rem] border border-border p-8 space-y-6">
              <div>
                <span className="text-[10px] font-black tracking-widest uppercase text-foreground-tertiary block mb-4">LATEST STATUS</span>
                <div 
                  className="inline-flex items-center gap-2.5 px-6 py-3 rounded-full text-[11px] font-black uppercase tracking-widest shadow-xl border"
                  style={{ backgroundColor: status.bg, borderColor: `${status.color}44`, color: status.color }}
                >
                  <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: status.color }} />
                  {status.label}
                </div>
              </div>

              <div className="space-y-5 pt-4">
                 <div className="flex justify-between items-center group">
                    <div>
                      <p className="text-[10px] font-black text-foreground-tertiary uppercase tracking-widest">Ammount Paid</p>
                      <p className="text-xl font-black text-emerald-500 tabular-nums">{formatCurrency(paidAmount)}</p>
                    </div>
                    <TrendingUp className="h-5 w-5 text-emerald-500/20 group-hover:text-emerald-500 transition-colors" />
                 </div>
                 
                 <div className="h-px bg-border" />

                 <div className="flex justify-between items-center group">
                    <div>
                      <p className="text-[10px] font-black text-foreground-tertiary uppercase tracking-widest">Remaining Balance</p>
                      <p className={cn("text-xl font-black tabular-nums", balance > 0 ? "text-primary" : "text-foreground-secondary")}>
                        {formatCurrency(balance)}
                      </p>
                    </div>
                    <Receipt className="h-5 w-5 text-primary/20 group-hover:text-primary transition-colors" />
                 </div>

                 {invoice.dueDate && (
                    <div className="mt-6 p-4 rounded-2xl bg-surface-2 border border-border flex items-center gap-4">
                       <Clock className="h-8 w-8 text-primary/40" />
                       <div>
                         <p className="text-[9px] font-black uppercase tracking-[.2em] text-foreground-tertiary">HARD DEADLINE</p>
                         <p className="text-sm font-black">{formatDate(invoice.dueDate)}</p>
                       </div>
                    </div>
                 )}
              </div>
           </div>

           <div className="glass-ultra rounded-[2rem] border border-border bg-foreground text-background p-8 overflow-hidden relative">
              <div className="absolute -bottom-4 -right-4 opacity-5 pointer-events-none">
                <Receipt size={140} />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-[.3em] text-background/40 mb-6">QUICK ACTIONS</h3>
              <div className="space-y-4">
                 <Link href={`/portal/bookings/${invoice.booking.id}`} className="flex items-center justify-between p-4 rounded-2xl bg-background/5 hover:bg-background/10 transition-colors group">
                    <span className="text-xs font-bold">In-Person Engagement Detail</span>
                    <ChevronRight className="h-4 w-4 opacity-40 group-hover:translate-x-1 transition-all" />
                 </Link>
                 <Link href={`/studio/${invoice.studio.slug}`} className="flex items-center justify-between p-4 rounded-2xl bg-background/5 hover:bg-background/10 transition-colors group">
                    <span className="text-xs font-bold">Contact Partner Team</span>
                    <ChevronRight className="h-4 w-4 opacity-40 group-hover:translate-x-1 transition-all" />
                 </Link>
              </div>
           </div>

           {invoice.notes && (
             <div className="p-8 rounded-[2rem] bg-amber-500/5 border border-amber-500/20">
                <span className="text-[10px] font-black tracking-widest uppercase text-amber-500 mb-4 block">OFFICIAL NOTES</span>
                <p className="text-sm text-foreground-secondary italic leading-relaxed">
                  &quot;{invoice.notes}&quot;
                </p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
