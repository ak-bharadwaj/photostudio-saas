'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { bookingsApi, customersApi, servicesApi, invoicesApi } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';
import { Plus, Search, Calendar, Eye, FileText, ChevronDown, Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface Booking {
  id: string;
  scheduledAt: string;
  status: string;
  notes?: string;
  customer: { id: string; name: string; email: string };
  service: { id: string; name: string; price: number };
}

interface Customer { id: string; name: string; email: string }
interface Service { id: string; name: string; price: number }

const bookingSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  serviceId: z.string().min(1, 'Service is required'),
  bookingDate: z.string().min(1, 'Booking date is required'),
  notes: z.string().optional(),
});
type BookingFormData = z.infer<typeof bookingSchema>;

const STATUS_FLOW = [
  { value: 'INQUIRY', label: 'Inquiry', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'QUOTED', label: 'Quoted', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'CONFIRMED', label: 'Confirmed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-slate-900 text-white border-slate-900' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-rose-50 text-rose-700 border-rose-200' },
];

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_FLOW.find(x => x.value === status);
  return (
    <span className={cn(
      "inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-all duration-300",
      s?.color ?? 'bg-slate-100 text-slate-700 border-slate-200'
    )}>
      {s?.label ?? status}
    </span>
  );
}

function StatusDropdown({ bookingId, current, onChanged }: { bookingId: string; current: string; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { addToast } = useToast();

  const change = useCallback(async (next: string) => {
    if (next === current) { setOpen(false); return; }
    setBusy(true);
    try {
      await bookingsApi.updateStatus(bookingId, { status: next });
      addToast('success', `Status updated to ${STATUS_FLOW.find(s => s.value === next)?.label}`);
      onChanged();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      addToast('error', err.response?.data?.message || 'Failed to update status');
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }, [bookingId, current, onChanged, addToast]);

  return (
    <div className="relative inline-block">
      <button
        disabled={busy}
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 focus:outline-none"
      >
        <StatusBadge status={current} />
        {busy ? <LoadingSpinner className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-0.5 opacity-50" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 w-40 rounded-xl bg-[var(--surface-0)] border border-[var(--border)] shadow-xl py-1 overflow-hidden">
            {STATUS_FLOW.map(s => (
              <button
                key={s.value}
                onClick={() => change(s.value)}
                className={`w-full text-left px-3 py-2 text-xs font-semibold hover:bg-[var(--surface-1)] transition-colors ${s.value === current ? 'opacity-50 cursor-default' : ''}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteBooking, setQuoteBooking] = useState<Booking | null>(null);
  const [quoteAmount, setQuoteAmount] = useState<number>(0);
  const [quoteNotes, setQuoteNotes] = useState('');
  const [sendingQuote, setSendingQuote] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null);

  const { addToast } = useToast();

  const handleSendQuote = async () => {
    if (!quoteBooking) return;
    try {
      setSendingQuote(true);
      await bookingsApi.sendQuote(quoteBooking.id, {
        amount: quoteAmount,
        notes: quoteNotes,
      });
      addToast('success', 'Quote sent to customer');
      setIsQuoteModalOpen(false);
      loadBookings();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      addToast('error', err.response?.data?.message || 'Failed to send quote');
    } finally {
      setSendingQuote(false);
    }
  };

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
  });

  const loadBookings = useCallback(async () => {
    try {
      setIsLoading(true);
      const params: Record<string, string | number> = { limit: 200 };
      if (statusFilter) params.status = statusFilter;
      const response = await bookingsApi.getAll(params as any);
      setBookings(response.data?.data || []);
    } catch {
      addToast('error', 'Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, addToast]);

  useEffect(() => {
    loadBookings();
    customersApi.getAll({ limit: 1000 }).then(r => setCustomers(r.data?.data || [])).catch(() => { });
    servicesApi.getAll({ limit: 1000, isActive: true }).then(r => setServices(r.data?.data || [])).catch(() => { });
  }, [loadBookings]);

  const onCreateBooking = async (data: BookingFormData) => {
    try {
      setIsSubmitting(true);
      await bookingsApi.createInternal({
        customerId: data.customerId,
        serviceId: data.serviceId,
        scheduledDate: data.bookingDate,
        notes: data.notes,
      });
      addToast('success', 'Booking created');
      setIsCreateModalOpen(false);
      reset();
      loadBookings();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      addToast('error', err.response?.data?.message || 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateInvoice = async (booking: Booking) => {
    setGeneratingInvoice(booking.id);
    try {
      const unitPrice = booking.service.price;
      await invoicesApi.create({
        bookingId: booking.id,
        customerId: booking.customer.id,
        lineItems: [{
          description: booking.service.name,
          quantity: 1,
          rate: unitPrice,
          amount: unitPrice,
        }],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      addToast('success', 'Invoice generated — check the Invoices tab');
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      addToast('error', err.response?.data?.message || 'Failed to generate invoice');
    } finally {
      setGeneratingInvoice(null);
    }
  };

  const filtered = bookings.filter(b => {
    if (!b?.customer || !b?.service) return false;
    const q = searchTerm.toLowerCase();
    return (
      b.customer.name.toLowerCase().includes(q) ||
      b.customer.email.toLowerCase().includes(q) ||
      b.service.name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-[var(--foreground)] font-heading">Bookings</h1>
          <p className="mt-2 text-base text-[var(--foreground-secondary)] font-medium">Manage your studio schedule and client inquiries with clinical precision.</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="rounded-full shadow-lg shadow-indigo-200 hover:shadow-indigo-300" size="lg">
          <Plus className="mr-2 h-5 w-5" /> Create Booking
        </Button>
      </div>

      {/* Filters */}
      <Card className="card-luxury mb-8">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row gap-4 p-5">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--foreground-tertiary)]" />
              <Input
                placeholder="Search customer / service…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="flex h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="">All Statuses</option>
              {STATUS_FLOW.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table Section */}
      <Card className="border-none shadow-premium overflow-hidden bg-white/50 backdrop-blur-sm">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--foreground)] font-heading">Active Schedule</h2>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-widest">{filtered.length} Bookings Found</span>
        </div>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10"><LoadingSpinner size="lg" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-[var(--foreground-tertiary)]" />
              <h3 className="mt-3 text-sm font-semibold text-[var(--foreground)]">No bookings found</h3>
              <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
                {searchTerm ? 'No bookings match your search.' : 'Create your first booking to get started.'}
              </p>
              {!searchTerm && (
                <Button className="mt-4" onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> New Booking
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(booking => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <p className="font-medium text-[var(--foreground)]">{booking.customer.name}</p>
                      <p className="text-xs text-[var(--foreground-secondary)]">{booking.customer.email}</p>
                    </TableCell>
                    <TableCell className="text-[var(--foreground)]">
                      <p>{booking.service.name}</p>
                      <p className="text-xs text-[var(--foreground-tertiary)]">₹{booking.service.price.toLocaleString()}</p>
                    </TableCell>
                    <TableCell className="text-sm text-[var(--foreground-secondary)]">
                      {formatDate(booking.scheduledAt)}
                    </TableCell>
                    <TableCell>
                      {/* ← Inline status change dropdown */}
                      <StatusDropdown
                        bookingId={booking.id}
                        current={booking.status}
                        onChanged={loadBookings}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Link href={`/bookings/${booking.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {booking.status === 'INQUIRY' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                            title="Send Quote"
                            onClick={() => {
                              setQuoteBooking(booking);
                              setQuoteAmount(Number(booking.service.price));
                              setQuoteNotes('');
                              setIsQuoteModalOpen(true);
                            }}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Generate Invoice"
                          disabled={generatingInvoice === booking.id}
                          onClick={() => handleGenerateInvoice(booking)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          {generatingInvoice === booking.id
                            ? <LoadingSpinner className="h-4 w-4" />
                            : <FileText className="h-4 w-4" />}
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

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); reset(); }}
        title="Create New Booking"
        description="Add a new booking for a customer"
        size="lg"
      >
        <form onSubmit={handleSubmit(onCreateBooking)} className="space-y-4 pt-4">
          <Select
            label="Customer"
            error={errors.customerId?.message}
            options={customers.map(c => ({ value: c.id, label: `${c.name} (${c.email})` }))}
            placeholder="Select a customer"
            {...register('customerId')}
          />

          <Select
            label="Service"
            error={errors.serviceId?.message}
            options={services.map(s => ({ value: s.id, label: `${s.name} (₹${s.price})` }))}
            placeholder="Select a service"
            {...register('serviceId')}
          />

          <Input
            label="Booking Date & Time"
            type="datetime-local"
            error={errors.bookingDate?.message}
            {...register('bookingDate')}
          />

          <Textarea
            label="Notes (Optional)"
            error={errors.notes?.message}
            {...register('notes')}
            rows={3}
            placeholder="Any notes about this booking…"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Button type="button" variant="outline" onClick={() => { setIsCreateModalOpen(false); reset(); }}>Cancel</Button>
            <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>Create Booking</Button>
          </div>
        </form>
      </Modal>

      {/* Send Quote Modal */}
      <Modal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        title="Send Quote"
      >
        <div className="space-y-4 py-4">
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-4">
            <p className="text-sm text-indigo-800">
              Sending a quote for <strong>{quoteBooking?.service.name}</strong> to <strong>{quoteBooking?.customer.name}</strong>.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
              Quote Amount
            </label>
            <Input
              type="number"
              value={quoteAmount}
              onChange={(e) => setQuoteAmount(Number(e.target.value))}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
              Notes for Customer
            </label>
            <textarea
              className="flex w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] h-24"
              value={quoteNotes}
              onChange={(e) => setQuoteNotes(e.target.value)}
              placeholder="e.g. Total includes travel cost and editing..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setIsQuoteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendQuote}
              disabled={sendingQuote}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {sendingQuote ? 'Sending...' : 'Send Quote'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
