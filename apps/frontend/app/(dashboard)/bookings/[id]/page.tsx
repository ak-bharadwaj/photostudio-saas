'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { Modal } from '@/components/ui/modal';
import { Select, Textarea, Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/components/ui/toast';
import { bookingsApi, invoicesApi } from '@/lib/api';
import { formatDate, formatCurrency, getBookingStatusBadge } from '@/lib/utils';
import {
  ArrowLeft,
  Calendar,
  User,
  Wrench,
  FileText,
  Trash2,
  MessageSquare,
  IndianRupee,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

interface Booking {
  id: string | number;
  scheduledAt: string;
  bookingDate?: string;
  status: string;
  notes?: string;
  cancellationReason?: string;
  quoteAmount?: number;
  quoteNotes?: string;
  quoteRejectionNotes?: string;
  customer: {
    id: string | number;
    name: string;
    email: string;
    phone?: string;
  };
  service: {
    id: string | number;
    name: string;
    description?: string;
    price: number;
    duration?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export default function BookingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Status modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Cancel modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellationNotes, setCancellationNotes] = useState('');

  // Quote modal
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [isSendingQuote, setIsSendingQuote] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);

  // Reschedule
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadBooking(true);
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadBooking(true, true);
    }, 30000);

    return () => {
      abortRef.current?.abort();
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const loadBooking = async (forceLoad = false, silent = false) => {
    if (!forceLoad && !silent) return; // Prevent extra calls
    try {
      if (!silent) setIsLoading(true);
      const response = await bookingsApi.getOne(params.id as string);
      if (abortRef.current?.signal.aborted) return;
      setBooking(response.data);
    } catch (error: unknown) {
      if ((error as { name?: string }).name === 'CanceledError') return;
      if (!silent) {
        addToast('error', 'Failed to load booking details');
        router.push('/bookings');
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const refresh = () => {
    loadBooking(true);
  };

  const handleStatusUpdate = async () => {
    if (!newStatus || !booking) return;
    try {
      setIsUpdating(true);
      await bookingsApi.updateStatus(booking.id.toString(), { status: newStatus });
      addToast('success', 'Booking status updated');
      setIsStatusModalOpen(false);
      setNewStatus('');
      refresh();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      addToast('error', err.response?.data?.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking) return;
    try {
      setIsUpdating(true);
      await bookingsApi.cancel(booking.id.toString(), cancellationNotes);
      addToast('success', 'Booking cancelled');
      setIsCancelModalOpen(false);
      refresh();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      addToast('error', err.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendQuote = async () => {
    if (!booking || !quoteAmount) return;
    const amount = parseFloat(quoteAmount);
    if (isNaN(amount) || amount <= 0) {
      addToast('error', 'Please enter a valid quote amount');
      return;
    }
    try {
      setIsSendingQuote(true);
      // Try the dedicated quote endpoint first; fall back to updateStatus
      try {
        await bookingsApi.sendQuote(booking.id.toString(), { amount, notes: quoteNotes });
      } catch {
        await bookingsApi.updateStatus(booking.id.toString(), {
          status: 'QUOTED',
          quoteAmount: amount,
          quoteNotes: quoteNotes || undefined,
        });
      }
      addToast('success', 'Quote sent successfully! The client will be notified.');
      setIsQuoteModalOpen(false);
      setQuoteAmount('');
      setQuoteNotes('');
      refresh();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      addToast('error', err.response?.data?.message || 'Failed to send quote');
    } finally {
      setIsSendingQuote(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!booking) return;
    setGeneratingInvoice(true);
    try {
      const unitPrice = Number(booking.service.price);
      await invoicesApi.create({
        bookingId: booking.id.toString(),
        customerId: booking.customer.id.toString(),
        lineItems: [{
          description: booking.service.name,
          quantity: 1,
          rate: unitPrice,
          amount: unitPrice,
        }],
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      addToast('success', 'Invoice generated successfully!');
      router.push('/invoices');
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      addToast('error', err.response?.data?.message || 'Failed to generate invoice');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleReschedule = async () => {
    if (!booking || !newDate) return;
    setIsRescheduling(true);
    try {
      await bookingsApi.update(booking.id.toString(), {
        scheduledAt: new Date(newDate).toISOString(),
      });
      addToast('success', 'Booking rescheduled successfully!');
      setIsRescheduleModalOpen(false);
      loadBooking(true);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } } };
      addToast('error', err.response?.data?.message || 'Failed to reschedule');
    } finally {
      setIsRescheduling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-40 w-full rounded-2xl" />
        <div className="skeleton h-64 w-full rounded-2xl" />
        <div className="skeleton h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
        <Calendar className="h-14 w-14 text-[var(--foreground-tertiary)]" />
        <h2 className="text-xl font-bold text-[var(--foreground)]">Booking not found</h2>
        <p className="text-sm text-[var(--foreground-secondary)]">
          This booking may have been deleted or you don&apos;t have access to it.
        </p>
        <Link href="/bookings">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bookings
          </Button>
        </Link>
      </div>
    );
  }

  const statusOptions = [
    { value: 'INQUIRY', label: 'Inquiry' },
    { value: 'QUOTED', label: 'Quoted' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  const canSendQuote = booking.status === 'INQUIRY' || booking.status === 'PENDING' || booking.status === 'QUOTED';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Link href="/bookings">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-[var(--foreground)]">Booking Details</h1>
            <p className="mt-0.5 text-[var(--foreground-secondary)] text-sm">Booking #{booking?.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {booking.status !== 'CANCELLED' && (
            <>
              {canSendQuote && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuoteAmount(booking.quoteAmount ? booking.quoteAmount.toString() : '');
                    setQuoteNotes(booking.quoteNotes || '');
                    setIsQuoteModalOpen(true);
                  }}
                  className="border-violet-500/30 text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {booking.status === 'QUOTED' ? 'Update Quote' : 'Send Quote'}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setNewDate(booking.scheduledAt.slice(0, 16));
                  setIsRescheduleModalOpen(true);
                }}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Reschedule
              </Button>
              <Button variant="outline" onClick={() => setIsStatusModalOpen(true)}>
                Update Status
              </Button>
              <Button
                variant="outline"
                onClick={handleGenerateInvoice}
                disabled={generatingInvoice}
                className="text-[var(--success)]"
              >
                {generatingInvoice ? (
                  <LoadingSpinner className="h-4 w-4" />
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Invoice
                  </>
                )}
              </Button>
              <Button variant="danger" onClick={() => setIsCancelModalOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Quote banner — if QUOTED status */}
          {booking.status === 'QUOTED' && booking.quoteAmount && (
            <div
              className="relative rounded-[var(--radius-xl)] border border-violet-500/20 p-5 overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.07) 0%, rgba(219,39,119,0.05) 100%)' }}
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg,#7c3aed,#db2777)' }}>
                  <IndianRupee className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-[var(--foreground)]">Quote Sent</h3>
                    <Badge variant="info" dot>QUOTED</Badge>
                  </div>
                  <p className="text-2xl font-extrabold text-[var(--foreground)] tabular-nums">{formatCurrency(booking.quoteAmount)}</p>
                  {booking.quoteNotes && (
                    <p className="text-sm text-[var(--foreground-secondary)] mt-1 leading-relaxed">{booking.quoteNotes}</p>
                  )}
                  <p className="text-xs text-[var(--foreground-tertiary)] mt-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Awaiting client response — they can accept or reject from their booking page.
                  </p>
                  {booking.quoteRejectionNotes && (
                    <div className="mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                       <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600 mb-1">Customer Requested Adjustment</p>
                       <p className="text-sm font-medium italic text-amber-900 dark:text-amber-100">&quot;{booking.quoteRejectionNotes}&quot;</p>
                       <p className="text-[10px] text-amber-600/60 mt-2">Update the quote below to respond.</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setQuoteAmount(booking.quoteAmount!.toString());
                    setQuoteNotes(booking.quoteNotes || '');
                    setIsQuoteModalOpen(true);
                  }}
                  className="shrink-0 text-xs font-semibold text-[var(--primary)] hover:underline"
                >
                  Edit
                </button>
              </div>
            </div>
          )}

          {/* Booking Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Booking Information</CardTitle>
                <Badge {...getBookingStatusBadge(booking?.status || 'INQUIRY')}>
                  {booking?.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-[var(--foreground-tertiary)] mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[var(--foreground-secondary)]">Booking Date</p>
                  <p className="text-base text-[var(--foreground)]">{formatDate(booking?.scheduledAt || (booking as { bookingDate?: string })?.bookingDate)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Wrench className="h-5 w-5 text-[var(--foreground-tertiary)] mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--foreground-secondary)]">Service</p>
                  <p className="text-base font-semibold text-[var(--foreground)]">{booking?.service?.name || 'N/A'}</p>
                  {booking?.service?.description && (
                    <p className="text-sm text-[var(--foreground-secondary)] mt-1">{booking.service.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    <p className="text-sm text-[var(--foreground)]">
                      <span className="font-medium">Price:</span> {formatCurrency(booking.quoteAmount ?? (booking?.service?.price || 0))}
                    </p>
                    {booking?.service?.duration && (
                      <p className="text-sm text-[var(--foreground)]">
                        <span className="font-medium">Duration:</span> {booking.service.duration} min
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {booking.notes && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-[var(--foreground-tertiary)] mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground-secondary)]">Notes</p>
                    <p className="text-base text-[var(--foreground)]">{booking.notes}</p>
                  </div>
                </div>
              )}

              {booking.cancellationReason && (
                <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-[var(--danger)]">Cancellation Reason</p>
                  <p className="text-sm text-[var(--danger)]/80 mt-1">{booking.cancellationReason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Quote CTA — for new inquiries */}
          {(booking.status === 'INQUIRY' || booking.status === 'PENDING') && (
            <div
              className="rounded-[var(--radius-xl)] border border-dashed border-violet-500/30 p-5 flex items-center gap-4 cursor-pointer hover:bg-violet-500/5 transition-colors duration-200 group"
              onClick={() => setIsQuoteModalOpen(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setIsQuoteModalOpen(true)}
            >
              <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform" style={{ background: 'linear-gradient(135deg,#7c3aed,#db2777)' }}>
                <Send className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--foreground)]">Send a Quote to This Client</p>
                <p className="text-xs text-[var(--foreground-tertiary)] mt-0.5">
                  Enter your price and a brief note — the client will be able to accept or reject it from their booking page.
                </p>
              </div>
              <Send className="h-4 w-4 text-[var(--primary)] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-[var(--foreground-secondary)]">Name</p>
                <Link
                  href={`/customers/${booking?.customer?.id}`}
                  className="text-base text-[var(--primary)] hover:underline"
                >
                  {booking?.customer?.name || 'Unknown'}
                </Link>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground-secondary)]">Email</p>
                <a
                  href={`mailto:${booking.customer.email}`}
                  className="text-base text-[var(--foreground)] hover:text-[var(--primary)]"
                >
                  {booking.customer.email}
                </a>
              </div>
              {booking.customer.phone && (
                <div>
                  <p className="text-sm font-medium text-[var(--foreground-secondary)]">Phone</p>
                  <a
                    href={`tel:${booking.customer.phone}`}
                    className="text-base text-[var(--foreground)] hover:text-[var(--primary)]"
                  >
                    {booking.customer.phone}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status guide */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Booking Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { status: 'INQUIRY', label: 'Inquiry received', icon: FileText, done: true },
                  { status: 'QUOTED', label: 'Quote sent to client', icon: IndianRupee, done: ['QUOTED','CONFIRMED','IN_PROGRESS','COMPLETED'].includes(booking.status) },
                  { status: 'CONFIRMED', label: 'Client accepted', icon: CheckCircle2, done: ['CONFIRMED','IN_PROGRESS','COMPLETED'].includes(booking.status) },
                  { status: 'IN_PROGRESS', label: 'Session in progress', icon: Clock, done: ['IN_PROGRESS','COMPLETED'].includes(booking.status) },
                  { status: 'COMPLETED', label: 'Completed', icon: CheckCircle2, done: booking.status === 'COMPLETED' },
                ].map(({ status, label, icon: Icon, done }) => (
                  <div key={status} className="flex items-center gap-3">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${done ? 'bg-green-500/20 text-green-500' : 'bg-[var(--surface-2)] text-[var(--foreground-tertiary)]'}`}>
                      {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    </div>
                    <span className={`text-xs font-medium ${done ? 'text-[var(--foreground)]' : 'text-[var(--foreground-tertiary)]'}`}>{label}</span>
                    {booking.status === status && (
                      <span className="ml-auto text-[10px] font-bold text-violet-500 bg-violet-500/10 px-1.5 py-0.5 rounded-full">NOW</span>
                    )}
                  </div>
                ))}
                {booking.status === 'CANCELLED' && (
                  <div className="flex items-center gap-3 mt-1">
                    <div className="h-6 w-6 rounded-full flex items-center justify-center shrink-0 bg-red-500/20 text-red-500">
                      <XCircle className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-medium text-red-500">Cancelled</span>
                    <span className="ml-auto text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-full">NOW</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-[var(--foreground-secondary)]">Created</p>
                <p className="text-sm text-[var(--foreground)]">{formatDate(booking.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground-secondary)]">Last Updated</p>
                <p className="text-sm text-[var(--foreground)]">{formatDate(booking.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Send Quote Modal ── */}
      <Modal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        title={booking?.status === 'QUOTED' ? 'Update Quote' : 'Send Quote to Client'}
        description="The client will receive a notification and can accept or reject your quote from their booking page."
      >
        <div className="space-y-4">
          {/* Amount */}
          <Input
            id="quote-amount-input"
            label="Quote Amount"
            type="number"
            min="0"
            step="0.01"
            value={quoteAmount}
            onChange={(e) => setQuoteAmount(e.target.value)}
            placeholder="e.g. 450.00"
            helperText="Enter the price you're quoting for this session"
            leftIcon={<IndianRupee className="h-4 w-4" />}
          />

          {/* Notes */}
          <Textarea
            id="quote-notes-input"
            label="Quote Notes (Optional)"
            value={quoteNotes}
            onChange={(e) => setQuoteNotes(e.target.value)}
            rows={3}
            placeholder="e.g. Includes 2-hour session, 50 edited photos, online gallery delivery within 7 days."
            helperText="Describe what's included in your quote. This is shown to the client."
          />

          {/* Preview */}
          {quoteAmount && parseFloat(quoteAmount) > 0 && (
            <div className="p-3 rounded-[var(--radius-lg)] bg-violet-500/5 border border-violet-500/15">
              <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wide mb-1">Preview — what the client sees</p>
              <p className="text-sm font-semibold text-[var(--foreground)]">
                {booking?.customer?.name} will see a quote for{' '}
                <span className="text-violet-600 font-extrabold">{formatCurrency(parseFloat(quoteAmount))}</span>
                {quoteNotes && ` · "${quoteNotes.slice(0, 60)}${quoteNotes.length > 60 ? '…' : ''}"`}
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsQuoteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendQuote}
              isLoading={isSendingQuote}
              disabled={!quoteAmount || parseFloat(quoteAmount) <= 0 || isSendingQuote}
              style={{ background: 'linear-gradient(135deg,#7c3aed,#db2777)', color: '#fff', border: 'none' }}
            >
              <Send className="h-4 w-4 mr-2" />
              {booking?.status === 'QUOTED' ? 'Update Quote' : 'Send Quote'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Update Status Modal ── */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Update Booking Status"
        description="Change the status of this booking"
      >
        <div className="space-y-4">
          <Select
            label="New Status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            placeholder="Select status"
            options={statusOptions.map((o) => ({ value: o.value, label: o.label }))}
          />
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleStatusUpdate}
              isLoading={isUpdating}
              disabled={!newStatus || isUpdating}
            >
              Update Status
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Cancel Booking Modal ── */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Booking"
        description="Are you sure you want to cancel this booking?"
      >
        <div className="space-y-4">
          <Textarea
            label="Cancellation Reason"
            value={cancellationNotes}
            onChange={(e) => setCancellationNotes(e.target.value)}
            rows={3}
            placeholder="Provide a reason for cancellation..."
            helperText="Optional"
          />
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setIsCancelModalOpen(false)}>
              Back
            </Button>
            <Button
              variant="danger"
              onClick={handleCancelBooking}
              isLoading={isUpdating}
              disabled={isUpdating}
            >
              Confirm Cancellation
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Reschedule Modal ── */}
      <Modal
        isOpen={isRescheduleModalOpen}
        onClose={() => setIsRescheduleModalOpen(false)}
        title="Reschedule Booking"
        description="Change the scheduled date and time for this booking"
      >
        <div className="space-y-4">
          <Input
            label="New Date & Time"
            type="datetime-local"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
          />
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsRescheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleReschedule}
              isLoading={isRescheduling}
              disabled={!newDate || isRescheduling}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
