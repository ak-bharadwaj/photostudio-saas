'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import {
  FileText,
  Download,
  CheckCircle,
  Clock,
  AlertTriangle,
  Banknote,
  Building,
  Calendar,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';

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
  studio: { name: string };
  payments: Array<{ amount: number; paidAt: string }>;
}

const STATUS_CFG: Record<string, {
  variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary';
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  color: string;
  bg: string;
  border: string;
}> = {
  DRAFT:          { variant: 'default',   icon: FileText,      label: 'Draft',   color: '#4b5563', bg: 'rgba(75,85,99,0.08)', border: 'rgba(75,85,99,0.2)' },
  SENT:           { variant: 'info',      icon: Clock,         label: 'Sent',    color: '#2563eb', bg: 'rgba(37,99,235,0.08)',  border: 'rgba(37,99,235,0.2)' },
  PAID:           { variant: 'success',   icon: CheckCircle,   label: 'Paid',    color: '#059669', bg: 'rgba(5,150,105,0.08)', border: 'rgba(5,150,105,0.2)' },
  PARTIALLY_PAID: { variant: 'warning',   icon: Banknote,      label: 'Partial', color: '#d97706', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.2)' },
  OVERDUE:        { variant: 'danger',    icon: AlertTriangle, label: 'Overdue', color: '#dc2626', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.2)' },
};

/* ── Payment progress bar ── */
function PaymentProgress({ paid, total, status }: { paid: number; total: number; status: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  if (status === 'PAID') {
    return (
      <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
        <CheckCircle className="h-3.5 w-3.5" />
        Paid in full
      </div>
    );
  }
  if (pct === 0 && status !== 'PARTIALLY_PAID') return null;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px] font-bold" style={{ color: 'var(--foreground-tertiary)' }}>
        <span>{formatCurrency(paid)} paid</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: pct >= 100 ? 'var(--color-success, #059669)' : 'linear-gradient(90deg, var(--primary), var(--accent))',
          }}
        />
      </div>
    </div>
  );
}

export default function InvoicesPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback((silent = false) => {
    const token = safeGetItem('accessToken');
    const guestPhone = safeGetItem('customer_guest_phone');

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    
    if (!silent) {
      setLoading(true);
      setError(null);
    }

    if (token) {
      fetchWithToken(token, ctrl, silent);
    } else if (guestPhone) {
      fetchGuest(guestPhone, safeGetItem('customer_guest_email'), ctrl, silent);
    } else if (!silent) {
      router.replace('/portal/login');
    }
     
  }, [router]);

  useEffect(() => {
    load();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      load(true);
    }, 30000);

    return () => {
      abortRef.current?.abort();
      clearInterval(interval);
    };
  }, [load]);

  const fetchWithToken = async (token: string, ctrl: AbortController, silent: boolean) => {
    try {
      const res = await axios.get(`${API_URL}/portal/invoices`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      const list = res.data?.data ?? res.data;
      setInvoices(Array.isArray(list) ? list : []);
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'CanceledError') return;
      if (!silent) setError('Failed to load invoices. Check your connection and try again.');
    } finally {
      if (!ctrl.signal.aborted && !silent) setLoading(false);
    }
  };

  const fetchGuest = async (phone: string, email: string | null, ctrl: AbortController, silent: boolean) => {
    try {
      const res = await axios.get(`${API_URL}/customer-portal/invoices`, {
        params: { phone, email: email || '' },
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      const list = res.data?.data ?? res.data?.invoices ?? res.data;
      setInvoices(Array.isArray(list) ? list : []);
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'CanceledError') return;
      if (!silent) setError('Failed to load invoices. Check your connection and try again.');
    } finally {
      if (!ctrl.signal.aborted && !silent) setLoading(false);
    }
  };

  const handleDownload = async (invoiceId: string, invoiceNumber: string) => {
    setDownloading(invoiceId);
    try {
      const token = safeGetItem('accessToken');
      let response;
      if (token) {
        response = await axios.get(
          `${API_URL}/portal/invoices/${invoiceId}/pdf`,
          {
            responseType: 'blob',
            headers: { Authorization: `Bearer ${token}` },
          },
        );
      } else {
        const phone = safeGetItem('customer_guest_phone') || '';
        const email = safeGetItem('customer_guest_email') || '';
        response = await axios.get(
          `${API_URL}/customer-portal/invoices/${invoiceNumber}/pdf`,
          {
            params: { phone, email },
            responseType: 'blob',
          },
        );
      }
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast('success', 'Download started.');
    } catch {
      addToast('error', 'PDF download is not available right now.');
    } finally {
      setDownloading(null);
    }
  };

  /* ── Skeleton ── */
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-5 animate-fade-in">
        <div className="skeleton h-28 w-full rounded-3xl" />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <div key={i} className="skeleton h-24 rounded-3xl" />)}
        </div>
        {[0, 1, 2].map(i => <div key={i} className="skeleton h-36 w-full rounded-3xl" style={{ animationDelay: `${i * 80}ms` }} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-5 px-4">
        <div
          className="h-20 w-20 rounded-3xl flex items-center justify-center"
          style={{ background: 'color-mix(in srgb, var(--danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 15%, transparent)' }}
        >
          <AlertTriangle className="h-10 w-10 text-[var(--danger)]" />
        </div>
        <div>
          <p className="font-black text-lg text-[var(--foreground)] mb-1">Failed to load invoices</p>
          <p className="text-sm text-[var(--foreground-tertiary)] max-w-xs">{error}</p>
        </div>
        <button
          onClick={() => load()}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-90 hover:-translate-y-0.5"
          style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    );
  }

  /* Derived totals */
  const totalPaid = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + Number(i.total), 0);
  const totalOwed = invoices.filter(i => i.status !== 'PAID' && i.status !== 'DRAFT').reduce((s, i) => s + Number(i.total), 0);
  const overdueCount = invoices.filter(i => i.status === 'OVERDUE').length;
  const paidCount = invoices.filter(i => i.status === 'PAID').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-luxury-in">

      {/* ── Header ── */}
      <div
        className="relative overflow-hidden rounded-3xl px-7 py-6"
        style={{ background: 'linear-gradient(135deg, #07041a 0%, #110828 60%, #080510 100%)' }}
      >
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #db2777, transparent 65%)', transform: 'translate(30%, -30%)' }} />
        <div className="relative z-10 flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-3.5 w-3.5" style={{ color: '#db2777' }} />
              <span className="text-[11px] font-black uppercase tracking-[0.25em]" style={{ color: 'rgba(255,255,255,0.3)' }}>Billing</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">Financial History</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} across all partners
              {overdueCount > 0 && <span className="ml-2 font-bold" style={{ color: '#f87171' }}>· {overdueCount} overdue</span>}
            </p>
          </div>
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-black tabular-nums shrink-0"
            style={{ background: 'rgba(219,39,119,0.2)', border: '1px solid rgba(219,39,119,0.3)', color: '#f472b6' }}
          >
            <FileText className="h-4 w-4" />
            {invoices.length}
          </div>
        </div>
      </div>

      {/* ── Summary cards ── */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: CheckCircle,
              label: 'Total Paid',
              value: formatCurrency(totalPaid),
              sub: `${paidCount} paid invoice${paidCount !== 1 ? 's' : ''}`,
              gradFrom: '#10b981',
              gradTo: '#34d399',
            },
            {
              icon: Wallet,
              label: 'Outstanding',
              value: formatCurrency(totalOwed),
              sub: totalOwed > 0 ? 'action required' : 'you\'re all clear',
              gradFrom: '#f59e0b',
              gradTo: '#f97316',
            },
            {
              icon: TrendingUp,
              label: 'Total Invoiced',
              value: formatCurrency(invoices.reduce((s, i) => s + Number(i.total), 0)),
              sub: `${invoices.length} invoice${invoices.length !== 1 ? 's' : ''} total`,
              gradFrom: '#7c3aed',
              gradTo: '#a855f7',
            },
          ].map(({ icon: Icon, label, value, sub, gradFrom, gradTo }, i) => (
            <div
              key={label}
              className="relative overflow-hidden rounded-3xl p-5 animate-fade-in"
              style={{ background: 'var(--surface-0)', border: '1px solid var(--border)', animationDelay: `${i * 80}ms`, boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
            >
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full pointer-events-none opacity-[0.07]" style={{ background: `radial-gradient(circle, ${gradFrom}, transparent 70%)`, transform: 'translate(20%, -20%)' }} />
              <div className="flex items-start justify-between">
                <div
                  className="h-10 w-10 rounded-2xl flex items-center justify-center shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})` }}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-black tabular-nums text-[var(--foreground)]">{value}</p>
                <p className="text-sm font-semibold mt-1 text-[var(--foreground-secondary)]">{label}</p>
                <p className="text-xs mt-0.5 text-[var(--foreground-tertiary)]">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Invoice list ── */}
      {invoices.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 text-center rounded-3xl"
          style={{ background: 'var(--surface-0)', border: '1.5px dashed var(--border-strong)' }}
        >
          <div
            className="h-24 w-24 rounded-3xl flex items-center justify-center mb-5"
            style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(219,39,119,0.08))' }}
          >
            <FileText className="h-12 w-12 text-[var(--primary)]" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-black text-[var(--foreground)] mb-2">No invoices yet</h3>
          <p className="text-sm text-[var(--foreground-tertiary)]">
            Invoices from your engagements will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice, index) => {
            const cfg = STATUS_CFG[invoice.status] ?? STATUS_CFG.DRAFT;
            const StatusIcon = cfg.icon;
            const paidAmount = (invoice.payments ?? []).reduce((s, p) => s + Number(p.amount), 0);
            const isOverdue = invoice.status === 'OVERDUE';

            return (
              <div
                key={invoice.id}
                className="group relative overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:-translate-y-0.5 animate-fade-in"
                style={{
                  background: isOverdue
                    ? 'color-mix(in srgb, var(--danger) 3%, var(--surface-0))'
                    : 'var(--surface-0)',
                  border: isOverdue
                    ? '1px solid color-mix(in srgb, var(--danger) 20%, var(--border))'
                    : '1px solid var(--border)',
                  animationDelay: `${index * 60}ms`,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 16px 48px rgba(0,0,0,0.1), 0 0 0 1px ${cfg.color}22`;
                  (e.currentTarget as HTMLDivElement).style.borderColor = cfg.color + '33';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.05)';
                  (e.currentTarget as HTMLDivElement).style.borderColor = isOverdue
                    ? 'color-mix(in srgb, var(--danger) 20%, var(--border))'
                    : 'var(--border)';
                }}
              >
                {/* Left accent stripe */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-l-3xl"
                  style={{ background: `linear-gradient(180deg, ${cfg.color}, ${cfg.color}44)` }}
                />

                {/* Overdue urgency glow */}
                {isOverdue && (
                  <div
                    className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none opacity-[0.06]"
                    style={{ background: 'radial-gradient(circle, #ef4444, transparent 70%)', transform: 'translate(30%, -30%)' }}
                  />
                )}

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
                  {/* Left: info */}
                  <div className="flex-1 space-y-3 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div
                        className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                      >
                        <StatusIcon className="h-5 w-5" style={{ color: cfg.color }} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-[var(--foreground)] text-base">
                          Invoice #{invoice.invoiceNumber}
                        </h3>
                        {isOverdue && (
                          <p className="text-xs font-bold text-red-600 dark:text-red-400">Overdue — immediate attention required</p>
                        )}
                      </div>
                      <Badge variant={cfg.variant} size="sm" className="ml-auto sm:ml-0">
                        {cfg.label}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-[var(--foreground-tertiary)]">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Building className="h-3.5 w-3.5 text-[var(--primary)]" />
                        {invoice.studio?.name ?? ''}
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-[var(--foreground-tertiary)]" />
                        Created {formatDate(invoice.createdAt)}
                      </span>
                      {invoice.dueDate && (
                        <span
                          className={cn("flex items-center gap-1.5 font-bold", isOverdue ? "text-red-600 dark:text-red-400" : "text-[var(--foreground-tertiary)]")}
                        >
                          <Clock className="h-3.5 w-3.5" />
                          Due {formatDate(invoice.dueDate)}
                        </span>
                      )}
                    </div>

                    {/* Payment progress */}
                    <PaymentProgress
                      paid={paidAmount}
                      total={Number(invoice.total)}
                      status={invoice.status}
                    />
                  </div>

                  {/* Right: amount + download */}
                  <div className="flex sm:flex-col items-center sm:items-end gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-2xl font-black text-[var(--foreground)] tabular-nums">
                        {formatCurrency(Number(invoice.total))}
                      </p>
                      {invoice.status === 'PAID' && (
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Paid in full</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-2xl shrink-0 font-bold"
                      style={{ minWidth: 90 }}
                      disabled={downloading === invoice.id}
                      onClick={() => handleDownload(invoice.id, invoice.invoiceNumber)}
                    >
                      {downloading === invoice.id ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        <>
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          PDF
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
