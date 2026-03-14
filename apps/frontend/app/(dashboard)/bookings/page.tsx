'use client';

import React, { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading';
import { Modal } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { bookingsApi, customersApi, servicesApi, invoicesApi } from '@/lib/api';
import { formatDate, formatCurrency, cn } from '@/lib/utils';
import { Plus, Search, Calendar, Eye, FileText, ChevronDown, Send, ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const BOOKINGS_PAGE_SIZE = 20;

interface Booking {
  id: string;
  scheduledAt: string;
  status: string;
  notes?: string;
  quoteAmount?: number;
  quoteRejectionNotes?: string;
  customer: { id: string; name: string; email: string };
  service: { id: string; name: string; price: number };
  invoices?: Array<{ id: string; status: string }>;
}

interface Customer { id: string; name: string; email: string }
interface Service { id: string; name: string; price: number }
interface BookingMeta { total: number; page: number; limit: number; totalPages: number }

const bookingSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  serviceId: z.string().min(1, 'Service is required'),
  bookingDate: z.string().min(1, 'Booking date is required'),
  notes: z.string().optional(),
});
type BookingFormData = z.infer<typeof bookingSchema>;

const STATUS_FLOW = [
  { value: 'INQUIRY', label: 'Inquiry', color: 'bg-[var(--surface-2)] text-[var(--foreground-secondary)] border-[var(--border)]' },
  { value: 'QUOTED', label: 'Quoted', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
  { value: 'CONFIRMED', label: 'Confirmed', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
];

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_FLOW.find(x => x.value === status);
  return (
    <span className={cn(
      "inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-all duration-300",
      s?.color ?? 'bg-[var(--surface-2)] text-[var(--foreground-secondary)] border-[var(--border)]'
    )}>
      {s?.label ?? status}
    </span>
  );
}

function StatusDropdown({ bookingId, current, onChanged }: { bookingId: string; current: string; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { addToast } = useToast();
  const listboxId = `status-listbox-${bookingId}`;

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
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={`Change status from ${STATUS_FLOW.find(s => s.value === current)?.label ?? current}`}
        className="flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] rounded-full"
      >
        <StatusBadge status={current} />
        {busy ? <LoadingSpinner className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-0.5 opacity-50" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            id={listboxId}
            role="listbox"
            aria-label="Select booking status"
            className="absolute left-0 top-full mt-1 z-20 w-40 rounded-xl bg-[var(--surface-0)] border border-[var(--border)] shadow-xl py-1 overflow-hidden"
          >
            {STATUS_FLOW.map(s => (
              <button
                key={s.value}
                role="option"
                aria-selected={s.value === current}
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

export default function BookingsPageWrapper() {
  return (
    <Suspense fallback={<div className="p-6 space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-14 w-full rounded-xl" />)}</div>}>
      <BookingsPage />
    </Suspense>
  );
}

function BookingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingMeta, setBookingMeta] = useState<BookingMeta>({ total: 0, page: 1, limit: BOOKINGS_PAGE_SIZE, totalPages: 1 });
  const [bookingPage, setBookingPage] = useState(1);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteBooking, setQuoteBooking] = useState<Booking | null>(null);
  const [quoteAmount, setQuoteAmount] = useState<number>(0);
  const [quoteNotes, setQuoteNotes] = useState('');
  const [sendingQuote, setSendingQuote] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null);
  
  // Date/Time Edit state
  const [isEditDateModalOpen, setIsEditDateModalOpen] = useState(false);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [editDate, setEditDate] = useState('');
  const [updatingDate, setUpdatingDate] = useState(false);

  const { addToast } = useToast();

  /* Auto-open create modal when ?create=1 is in the URL */
  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setIsCreateModalOpen(true);
      router.replace('/bookings', { scroll: false });
    }
  }, [searchParams, router]);
  const abortRef = useRef<AbortController | null>(null);

  // Debounce search term (500 ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when search or status filter changes
  useEffect(() => {
    setBookingPage(1);
  }, [debouncedSearch, statusFilter]);

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

  const handleUpdateDate = async () => {
    if (!editBooking || !editDate) return;
    try {
      setUpdatingDate(true);
      await bookingsApi.update(editBooking.id, {
        scheduledDate: new Date(editDate).toISOString(),
      });
      addToast('success', 'Booking date and time updated');
      setIsEditDateModalOpen(false);
      loadBookings();
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      addToast('error', err.response?.data?.message || 'Failed to update date');
    } finally {
      setUpdatingDate(false);
    }
  };

  const { register, handleSubmit, reset, formState: { errors } } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
  });

  const loadBookings = useCallback(async (silent = false) => {
    if (!silent) {
       abortRef.current?.abort();
       setIsLoading(true);
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const params: Record<string, string | number> = { limit: BOOKINGS_PAGE_SIZE, page: bookingPage };
      if (statusFilter) params.status = statusFilter;
      if (debouncedSearch) params.search = debouncedSearch;
      const response = await bookingsApi.getAll(params as Record<string, string | number>);
      if (ctrl.signal.aborted) return;
      const payload = response.data;
      if (payload?.data && payload?.meta) {
        setBookings(payload.data);
        setBookingMeta(payload.meta);
      } else {
        setBookings(payload || []);
        setBookingMeta({ total: (payload || []).length, page: 1, limit: BOOKINGS_PAGE_SIZE, totalPages: 1 });
      }
    } catch {
      if (abortRef.current?.signal.aborted) return;
      if (!silent) addToast('error', 'Failed to load bookings');
    } finally {
      if (!abortRef.current?.signal.aborted && !silent) setIsLoading(false);
    }
  }, [statusFilter, debouncedSearch, bookingPage, addToast]);

  useEffect(() => {
    loadBookings();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadBookings(true);
    }, 30000);

    customersApi.getAll({ limit: 100 }).then(r => setCustomers(r.data?.data || [])).catch(() => { });
    servicesApi.getAll({ limit: 100, isActive: true }).then(r => setServices(r.data?.data || [])).catch(() => { });
    
    return () => {
      abortRef.current?.abort();
      clearInterval(interval);
    };
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
      const unitPrice = Number(booking.quoteAmount || booking.service.price);
      await invoicesApi.create({
        bookingId: booking.id,
        customerId: booking.customer.id,
        lineItems: [{
          description: booking.service.name + (booking.quoteAmount ? ' (Negotiated Rate)' : ''),
          quantity: 1,
          rate: unitPrice,
          amount: unitPrice,
        }],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      addToast('success', 'Invoice generated — check the Invoices tab');
      loadBookings(true);
    } catch (e) {
      const err = e as { response?: { data?: { message?: string } } };
      addToast('error', err.response?.data?.message || 'Failed to generate invoice');
    } finally {
      setGeneratingInvoice(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Partner Management"
        title="Bookings"
        subtitle="Manage your business schedule and client inquiries with precision."
        accentColor="violet"
        actions={
          <>
            <Link
              href="/bookings/kanban"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-white/20 text-white/80 hover:border-white/40 hover:text-white transition-all duration-200 bg-white/5 backdrop-blur-sm"
              aria-label="Switch to Kanban view"
            >
              <LayoutGrid className="h-4 w-4" />
              Kanban View
            </Link>
            <Button onClick={() => setIsCreateModalOpen(true)} className="rounded-full shadow-[var(--shadow-glow-primary)]" size="lg">
              <Plus className="mr-2 h-5 w-5" /> Create Booking
            </Button>
          </>
        }
      />

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
            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              options={[{ value: '', label: 'All Statuses' }, ...STATUS_FLOW.map(s => ({ value: s.value, label: s.label }))]}
              aria-label="Filter by status"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table Section */}
      <Card className="overflow-hidden">
        <div className="px-4 sm:px-6 py-5 border-b border-[var(--border-light)] flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-[var(--foreground)] font-heading">Active Schedule</h2>
          <span className="text-xs font-bold text-[var(--primary)] bg-[var(--primary-light)] px-2.5 py-1 rounded-full uppercase tracking-widest">{bookingMeta.total} Total</span>
        </div>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-[var(--foreground-tertiary)]" />
              <h3 className="mt-3 text-sm font-semibold text-[var(--foreground)]">No bookings found</h3>
              <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
                {debouncedSearch || statusFilter ? 'No bookings match your filters.' : 'Create your first booking to get started.'}
              </p>
              {!debouncedSearch && !statusFilter && (
                <Button className="mt-4" onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> New Booking
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
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
                    {bookings.map((booking: Booking) => (
                      <TableRow key={booking.id}>
                        <TableCell>
                          <p className="font-medium text-[var(--foreground)]">{booking.customer.name}</p>
                          <p className="text-xs text-[var(--foreground-secondary)]">{booking.customer.email}</p>
                        </TableCell>
                        <TableCell className="text-[var(--foreground)]">
                          <p className="font-semibold">{booking.service.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                             <p className="text-sm font-black text-[var(--primary)]">{formatCurrency(booking.quoteAmount ?? booking.service.price)}</p>
                             {booking.quoteRejectionNotes && (
                               <Badge variant="warning" className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider animate-pulse bg-amber-500 text-white border-none shadow-lg">NEGOTIATION</Badge>
                             )}
                          </div>
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
                              <Button variant="ghost" size="sm" aria-label={`View booking for ${booking.customer.name}`}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[var(--primary)] hover:text-[var(--primary-hover)] hover:bg-[var(--primary-light)]"
                              aria-label={`Edit date for ${booking.customer.name}`}
                              onClick={() => {
                                setEditBooking(booking);
                                // truncate to local datetime string format for input
                                setEditDate(new Date(booking.scheduledAt).toISOString().slice(0, 16));
                                setIsEditDateModalOpen(true);
                              }}
                            >
                              <Calendar className="h-4 w-4" />
                            </Button>
                            {(booking.status === 'INQUIRY' || (booking.status === 'QUOTED' && booking.quoteRejectionNotes)) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-[var(--primary)] hover:text-[var(--primary-hover)] hover:bg-[var(--primary-light)]"
                                aria-label={`Send quote for ${booking.customer.name}`}
                                onClick={() => {
                                  setQuoteBooking(booking);
                                  setQuoteAmount(Number(booking.quoteAmount || booking.service.price));
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
                              aria-label={`Generate invoice for ${booking.customer.name}`}
                              disabled={generatingInvoice === booking.id}
                              onClick={() => handleGenerateInvoice(booking)}
                              className={cn(
                                "transition-all duration-200",
                                booking.invoices && booking.invoices.length > 0 
                                  ? "text-[var(--primary)] hover:bg-[var(--primary-light)]"
                                  : "text-[var(--success)] hover:bg-[var(--success)]/10"
                              )}
                            >
                              {generatingInvoice === booking.id ? (
                                <LoadingSpinner className="h-4 w-4" />
                              ) : booking.invoices && booking.invoices.length > 0 ? (
                                <div className="flex items-center gap-1.5">
                                  <FileText className="h-4 w-4" />
                                  <span className="text-[11px] font-bold uppercase tracking-wider">Invoiced</span>
                                </div>
                              ) : (
                                <FileText className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile card list */}
              <div className="sm:hidden divide-y divide-[var(--border)]">
                {bookings.map((booking: Booking) => (
                  <div key={booking.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-[var(--foreground)] text-sm">{booking.customer.name}</p>
                        <p className="text-xs text-[var(--foreground-secondary)] truncate max-w-[160px]">{booking.customer.email}</p>
                      </div>
                      <StatusDropdown
                        bookingId={booking.id}
                        current={booking.status}
                        onChanged={loadBookings}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{booking.service.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-[var(--primary)] font-bold">{formatCurrency(booking.quoteAmount ?? booking.service.price)}</p>
                          <p className="text-[var(--foreground-tertiary)]">· {formatDate(booking.scheduledAt)}</p>
                        </div>
                        {booking.quoteRejectionNotes && (
                           <div className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-white border-none shadow-md w-fit animate-pulse">
                              <span className="text-[10px] font-black uppercase tracking-wider">ACTION: NEGOTIATING</span>
                           </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Link href={`/bookings/${booking.id}`}>
                          <Button variant="ghost" size="sm" aria-label="View">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[var(--primary)]"
                          aria-label="Edit date"
                          onClick={() => {
                            setEditBooking(booking);
                            setEditDate(new Date(booking.scheduledAt).toISOString().slice(0, 16));
                            setIsEditDateModalOpen(true);
                          }}
                        >
                          <Calendar className="h-4 w-4" />
                        </Button>
                        {(booking.status === 'INQUIRY' || (booking.status === 'QUOTED' && booking.quoteRejectionNotes)) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[var(--primary)]"
                            aria-label={`Send quote for ${booking.customer.name}`}
                            onClick={() => {
                              setQuoteBooking(booking);
                              setQuoteAmount(Number(booking.quoteAmount || booking.service.price));
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
                          aria-label="Invoice"
                          disabled={generatingInvoice === booking.id}
                          onClick={() => handleGenerateInvoice(booking)}
                          className={cn(
                            "transition-all",
                            booking.invoices && booking.invoices.length > 0 ? "text-[var(--primary)]" : "text-[var(--success)]"
                          )}
                        >
                          {generatingInvoice === booking.id ? <LoadingSpinner className="h-4 w-4" /> : booking.invoices && booking.invoices.length > 0 ? <span className="text-[10px] font-bold uppercase tracking-wider">Invoiced</span> : <FileText className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Pagination controls */}
          {!isLoading && bookingMeta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-4 border-t border-[var(--border)]">
              <p className="text-sm text-[var(--foreground-secondary)]">
                Page {bookingMeta.page} of {bookingMeta.totalPages} &mdash; {bookingMeta.total} bookings total
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBookingPage((p) => Math.max(1, p - 1))}
                  disabled={bookingPage <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBookingPage((p) => Math.min(bookingMeta.totalPages, p + 1))}
                  disabled={bookingPage >= bookingMeta.totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
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
            options={services.map(s => ({ value: s.id, label: `${s.name} (${formatCurrency(s.price)})` }))}
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
          <div className="bg-[var(--primary-light)] p-4 rounded-xl border border-[var(--primary)]/20 mb-4">
            <p className="text-sm text-[var(--primary)]">
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

          <Textarea
            label="Notes for Customer"
            value={quoteNotes}
            onChange={(e) => setQuoteNotes(e.target.value)}
            rows={4}
            placeholder="e.g. Total includes travel cost and editing..."
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setIsQuoteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendQuote}
              disabled={sendingQuote}
            >
              {sendingQuote ? 'Sending...' : 'Send Quote'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Date Modal */}
      <Modal
        isOpen={isEditDateModalOpen}
        onClose={() => setIsEditDateModalOpen(false)}
        title="Edit Booking Date & Time"
        description={`Update schedule for ${editBooking?.customer.name}`}
      >
        <div className="space-y-4 py-4">
          <div className="bg-[var(--surface-2)] p-4 rounded-xl border border-[var(--border)] mb-4">
            <p className="text-sm font-medium">Current Schedule:</p>
            <p className="text-xl font-black text-[var(--primary)]">
              {editBooking ? formatDate(editBooking.scheduledAt) : '—'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
              New Date & Time
            </label>
            <Input
              type="datetime-local"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setIsEditDateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateDate}
              disabled={updatingDate || !editDate}
            >
              {updatingDate ? 'Updating...' : 'Update Schedule'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
