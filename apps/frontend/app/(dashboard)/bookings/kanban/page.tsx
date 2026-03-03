'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { bookingsApi } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { ArrowLeft, Calendar, User, IndianRupee } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Booking {
  id: string;
  scheduledAt: string;
  status: BookingStatus;
  customerNotes?: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  service: {
    id: string;
    name: string;
    price: number;
  };
}

type BookingStatus =
  | 'INQUIRY'
  | 'QUOTED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

interface Column {
  id: BookingStatus;
  title: string;
  accent: string;      // border-top color
  bgStyle: React.CSSProperties;  // column background
  badgeStyle: React.CSSProperties; // count badge
}

const COLUMNS: Column[] = [
  { id: 'INQUIRY',     title: 'Inquiry',     accent: '#94a3b8',
    bgStyle: { background: 'color-mix(in srgb, #94a3b8 8%, var(--surface-0))' },
    badgeStyle: { background: 'color-mix(in srgb, #94a3b8 20%, transparent)', color: '#475569' } },
  { id: 'QUOTED',      title: 'Quoted',      accent: '#60a5fa',
    bgStyle: { background: 'color-mix(in srgb, #60a5fa 8%, var(--surface-0))' },
    badgeStyle: { background: 'color-mix(in srgb, #3b82f6 20%, transparent)', color: '#1d4ed8' } },
  { id: 'CONFIRMED',   title: 'Confirmed',   accent: '#34d399',
    bgStyle: { background: 'color-mix(in srgb, #34d399 8%, var(--surface-0))' },
    badgeStyle: { background: 'color-mix(in srgb, #10b981 20%, transparent)', color: '#065f46' } },
  { id: 'IN_PROGRESS', title: 'In Progress', accent: '#fbbf24',
    bgStyle: { background: 'color-mix(in srgb, #fbbf24 8%, var(--surface-0))' },
    badgeStyle: { background: 'color-mix(in srgb, #f59e0b 20%, transparent)', color: '#92400e' } },
  { id: 'COMPLETED',   title: 'Completed',   accent: '#a78bfa',
    bgStyle: { background: 'color-mix(in srgb, #a78bfa 8%, var(--surface-0))' },
    badgeStyle: { background: 'color-mix(in srgb, #8b5cf6 20%, transparent)', color: '#4c1d95' } },
  { id: 'CANCELLED',   title: 'Cancelled',   accent: '#f87171',
    bgStyle: { background: 'color-mix(in srgb, #f87171 8%, var(--surface-0))' },
    badgeStyle: { background: 'color-mix(in srgb, #ef4444 20%, transparent)', color: '#991b1b' } },
];

const STATUS_VARIANT: Record<BookingStatus, 'default' | 'info' | 'secondary' | 'success' | 'warning' | 'danger'> = {
  INQUIRY:     'info',
  QUOTED:      'secondary',
  CONFIRMED:   'success',
  IN_PROGRESS: 'warning',
  COMPLETED:   'default',
  CANCELLED:   'danger',
};

/* ── Booking Card ───────────────────────────────────────────────────────── */

function BookingCard({ booking }: { booking: Booking }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: booking.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-[var(--surface-0)] rounded-xl shadow-sm border border-[var(--border-light)] cursor-grab active:cursor-grabbing hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200"
    >
      <Link
        href={`/bookings/${booking.id}`}
        className="block p-4"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      >
        {/* Customer name + status */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <h4 className="font-semibold text-sm text-[var(--foreground)] leading-snug hover:text-[var(--primary)] transition-colors line-clamp-1">
            {booking.customer.name}
          </h4>
          <Badge variant={STATUS_VARIANT[booking.status]} className="text-[10px] shrink-0">
            {booking.status.replace('_', ' ')}
          </Badge>
        </div>

        {/* Details */}
        <div className="space-y-1.5 text-xs text-[var(--foreground-secondary)]">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-[var(--foreground-tertiary)]" />
            <span>{formatDate(booking.scheduledAt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 shrink-0 text-[var(--foreground-tertiary)]" />
            <span className="truncate">{booking.service.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <IndianRupee className="h-3.5 w-3.5 shrink-0 text-[var(--foreground-tertiary)]" />
            <span className="font-semibold text-[var(--foreground)]">{formatCurrency(Number(booking.service.price))}</span>
          </div>
        </div>

        {booking.customerNotes && (
          <p className="mt-2.5 text-xs text-[var(--foreground-tertiary)] line-clamp-2 italic border-t border-[var(--border-light)] pt-2">
            {booking.customerNotes}
          </p>
        )}
      </Link>
    </div>
  );
}

/* ── Kanban Column ─────────────────────────────────────────────────────── */

function KanbanColumn({
  column,
  bookings,
}: {
  column: Column;
  bookings: Booking[];
}) {
  return (
    <div
      className="flex-1 min-w-[260px] max-w-[320px] rounded-2xl border border-[var(--border)] flex flex-col overflow-hidden"
      style={{ ...column.bgStyle, borderTop: `3px solid ${column.accent}` }}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface-0)]/60 backdrop-blur-sm border-b border-[var(--border-light)]">
        <h3 className="text-sm font-bold text-[var(--foreground)]">{column.title}</h3>
        <span
          className="px-2 py-0.5 rounded-full text-xs font-bold"
          style={column.badgeStyle}
        >
          {bookings.length}
        </span>
      </div>

      {/* Cards */}
      <SortableContext items={bookings.map((b) => b.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 p-3 space-y-2 min-h-[200px] overflow-y-auto">
          {bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
          {bookings.length === 0 && (
            <p className="text-center text-[var(--foreground-tertiary)] text-xs py-10 italic">
              No bookings
            </p>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function BookingsKanbanPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { addToast } = useToast();
  const abortRef = useRef<AbortController | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    fetchBookings();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBookings = async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      setLoading(true);
      const response = await bookingsApi.getAll({ page: 1, limit: 200 });
      if (ctrl.signal.aborted) return;
      setBookings(response.data?.data || []);
    } catch (error: unknown) {
      if (ctrl.signal.aborted) return;
      const err = error as { response?: { data?: { message?: string } } };
      addToast('error', err.response?.data?.message || 'Failed to fetch bookings');
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeBooking = bookings.find((b) => b.id === active.id);
    if (!activeBooking) return;

    // Determine target column
    const columnIds = COLUMNS.map((c) => c.id) as string[];
    let newStatus: BookingStatus | undefined;

    if (columnIds.includes(over.id as string)) {
      newStatus = over.id as BookingStatus;
    } else {
      // Dropped on a card — find which column that card is in
      const overBooking = bookings.find((b) => b.id === over.id);
      if (overBooking) newStatus = overBooking.status;
    }

    if (!newStatus || newStatus === activeBooking.status) return;

    // Optimistic update
    setBookings((prev) =>
      prev.map((b) => (b.id === activeBooking.id ? { ...b, status: newStatus! } : b)),
    );

    try {
      await bookingsApi.updateStatus(activeBooking.id, { status: newStatus });
      addToast('success', `Moved to ${newStatus.replace('_', ' ')}`);
    } catch (error: unknown) {
      // Revert
      setBookings((prev) =>
        prev.map((b) => (b.id === activeBooking.id ? { ...b, status: activeBooking.status } : b)),
      );
      const err = error as { response?: { data?: { message?: string } } };
      addToast('error', err.response?.data?.message || 'Failed to update status');
    }
  };

  const getByStatus = (status: BookingStatus) => bookings.filter((b) => b.status === status);
  const activeBooking = bookings.find((b) => b.id === activeId);

  if (loading) return (
    <div className="space-y-6">
      <div className="skeleton h-40 w-full rounded-2xl" />
      <div className="flex gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-64 flex-1 min-w-[200px] rounded-2xl" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-luxury-in">
      {/* Header */}
      <div>
        <Link href="/bookings">
          <Button variant="ghost" size="sm" className="-ml-2 mb-3" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back to List
          </Button>
        </Link>
        <PageHeader
          eyebrow="Bookings"
          title="Kanban Board"
          subtitle="Drag and drop cards to update booking status instantly."
          accentColor="violet"
        />
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-3">
        {COLUMNS.map((col) => (
          <div
            key={col.id}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-0)] text-sm"
          >
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: col.accent }}
            />
            <span className="font-medium text-[var(--foreground)]">{col.title}</span>
            <span className="font-bold text-[var(--foreground-secondary)]">{getByStatus(col.id).length}</span>
          </div>
        ))}
      </div>

      {/* Kanban Board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-6">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              bookings={getByStatus(column.id)}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.18,0.67,0.6,1.22)' }}>
          {activeBooking ? (
            <div className="rotate-2 scale-105 shadow-2xl rounded-xl ring-2 ring-[var(--primary)]/50">
              <BookingCard booking={activeBooking} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
