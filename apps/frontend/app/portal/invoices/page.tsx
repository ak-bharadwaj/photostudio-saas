'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import axios from 'axios';
import { formatDate } from '@/lib/utils';
import { FileText, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

export default function InvoicesPage() {
    const { addToast } = useToast();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('customer_token');
        if (token) {
            fetchInvoices(token);
        } else {
            setLoading(false);
            setError('Please sign in to view your invoices.');
        }
    }, []);

    const fetchInvoices = async (token: string) => {
        try {
            const response = await axios.get(`${API_URL}/portal/invoices`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setInvoices(response.data);
        } catch (err) {
            const error = err as any;
            setError('Failed to load invoices.');
            addToast('error', error.response?.data?.message || 'Failed to load invoices.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadInvoice = async (invoiceNumber: string) => {
        try {
            const response = await axios.get(
                `${API_URL}/customer-portal/invoices/${invoiceNumber}/pdf`,
                {
                    responseType: 'blob',
                }
            );
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `invoice_${invoiceNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            addToast('success', 'Download started.');
        } catch (err) {
            const error = err as any;
            addToast('error', error.response?.data?.message || 'Failed to download invoice');
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' }> = {
            DRAFT: { variant: 'default' },
            SENT: { variant: 'info' },
            PAID: { variant: 'success' },
            PARTIALLY_PAID: { variant: 'warning' },
            OVERDUE: { variant: 'danger' },
        };
        return variants[status] || variants.DRAFT;
    };

    if (loading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">Financial History</h1>
                <Badge variant="outline" className="px-3 py-1 font-bold">
                    {invoices.length} Invoices
                </Badge>
            </div>

            <div className="space-y-4">
                {invoices.length === 0 ? (
                    <Card className="border-dashed border-[var(--border)]">
                        <CardContent className="text-center py-12">
                            <FileText className="mx-auto h-12 w-12 text-[var(--foreground-tertiary)]" />
                            <h3 className="mt-2 text-sm font-bold text-[var(--foreground)]">No invoices</h3>
                            <p className="mt-1 text-sm text-[var(--foreground-tertiary)]">You don't have any invoices yet.</p>
                        </CardContent>
                    </Card>
                ) : (
                    invoices.map((invoice) => (
                        <Card key={invoice.id} className="border-[var(--border)] hover:border-[var(--primary)] transition-all shadow-sm">
                            <CardContent className="py-5">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-bold text-[var(--foreground)] text-lg">
                                                Invoice #{invoice.invoiceNumber}
                                            </h3>
                                            <Badge {...getStatusBadge(invoice.status)}>{invoice.status}</Badge>
                                        </div>
                                        <p className="text-sm text-[var(--foreground-tertiary)] mt-1">{invoice.studio.name}</p>
                                        <div className="mt-3 flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-widest">
                                            <span className="bg-[var(--surface-0)] px-2 py-1 rounded border border-[var(--border)]">
                                                Created: {formatDate(invoice.createdAt)}
                                            </span>
                                            {invoice.dueDate && (
                                                <span className="bg-[var(--danger-light)] text-[var(--danger)] px-2 py-1 rounded border border-[var(--danger)]/10">
                                                    Due: {formatDate(invoice.dueDate)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-left sm:text-right border-t sm:border-t-0 pt-4 sm:pt-0">
                                        <p className="text-2xl font-bold text-[var(--foreground)] tabular-nums">
                                            ${Number(invoice.total).toFixed(2)}
                                        </p>
                                        {invoice.payments.length > 0 && (
                                            <div className="mt-1 flex items-center sm:justify-end text-[var(--success)] font-bold">
                                                <CheckCircle className="mr-1 h-4 w-4" />
                                                Paid: ${invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0).toFixed(2)}
                                            </div>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="mt-4 border-[var(--border)] hover:bg-[var(--surface-0)]"
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
        </div>
    );
}
