'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/components/ui/toast';
import { bookingsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Calendar, User, DollarSign } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Booking {
  id: string;
  scheduledAt: string;
  status: 'INQUIRY' | 'QUOTED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
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

type BookingStatus = 'INQUIRY' | 'QUOTED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

const COLUMNS: { id: BookingStatus; title: string; color: string }[] = [
  { id: 'INQUIRY', title: 'Inquiry', color: 'bg-gray-100 border-gray-300' },
  { id: 'QUOTED', title: 'Quoted', color: 'bg-blue-50 border-blue-300' },
  { id: 'CONFIRMED', title: 'Confirmed', color: 'bg-green-50 border-green-300' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'bg-yellow-50 border-yellow-300' },
  { id: 'COMPLETED', title: 'Completed', color: 'bg-purple-50 border-purple-300' },
];

function BookingCard({ booking }: { booking: Booking }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: booking.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      INQUIRY: 'bg-gray-200 text-gray-800',
      QUOTED: 'bg-blue-200 text-blue-800',
      CONFIRMED: 'bg-green-200 text-green-800',
      IN_PROGRESS: 'bg-yellow-200 text-yellow-800',
      COMPLETED: 'bg-purple-200 text-purple-800',
      CANCELLED: 'bg-red-200 text-red-800',
    };
    return variants[status] || 'bg-gray-200 text-gray-800';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-move hover:shadow-md transition-shadow mb-3"
    >
      <Link href={`/bookings/${booking.id}`} className="block" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold text-gray-900 hover:text-blue-600">{booking.customer.name}</h4>
          <Badge className={`text-xs ${getStatusBadge(booking.status)}`}>{booking.status}</Badge>
        </div>
        
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(booking.scheduledAt)}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <User className="w-4 h-4" />
            <span>{booking.service.name}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            <span className="font-medium">${Number(booking.service.price).toFixed(2)}</span>
          </div>
        </div>

        {booking.customerNotes && (
          <p className="mt-2 text-xs text-gray-500 line-clamp-2">{booking.customerNotes}</p>
        )}
      </Link>
    </div>
  );
}

function KanbanColumn({ 
  column, 
  bookings 
}: { 
  column: { id: BookingStatus; title: string; color: string }; 
  bookings: Booking[];
}) {
  return (
    <div className={`flex-1 min-w-[280px] ${column.color} rounded-lg p-4 border-2`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{column.title}</h3>
        <Badge className="bg-white border border-gray-300">
          {bookings.length}
        </Badge>
      </div>

      <SortableContext items={bookings.map(b => b.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 min-h-[200px]">
          {bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
          {bookings.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">No bookings</p>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export default function BookingsKanbanPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { addToast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await bookingsApi.getAll({ page: 1, limit: 1000 });
      setBookings(response.data || []);
    } catch (error: any) {
      addToast('error', error.response?.data?.message || 'Failed to fetch bookings');
    } finally {
      setLoading(false);
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
    const overColumn = COLUMNS.find((col) => 
      bookings.filter((b) => b.status === col.id).some((b) => b.id === over.id)
    );

    if (!activeBooking) return;

    // Determine the new status based on which column the card was dropped in
    let newStatus: BookingStatus | undefined;

    // If dropped directly on a column or on a card in that column
    if (over.id === 'INQUIRY' || over.id === 'QUOTED' || over.id === 'CONFIRMED' || 
        over.id === 'IN_PROGRESS' || over.id === 'COMPLETED') {
      newStatus = over.id as BookingStatus;
    } else if (overColumn) {
      newStatus = overColumn.id;
    }

    if (!newStatus || newStatus === activeBooking.status) return;

    // Optimistic update
    setBookings((prev) =>
      prev.map((b) => (b.id === activeBooking.id ? { ...b, status: newStatus! } : b))
    );

    try {
      await bookingsApi.updateStatus(activeBooking.id, { status: newStatus });
      addToast('success', `Booking moved to ${newStatus}`);
    } catch (error: any) {
      // Revert on error
      setBookings((prev) =>
        prev.map((b) => (b.id === activeBooking.id ? { ...b, status: activeBooking.status } : b))
      );
      addToast('error', error.response?.data?.message || 'Failed to update booking status');
    }
  };

  const getBookingsByStatus = (status: BookingStatus) => {
    return bookings.filter((booking) => booking.status === status);
  };

  const activeBooking = bookings.find((b) => b.id === activeId);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/bookings">
            <Button variant="ghost" className="mb-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to List
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Bookings Kanban</h1>
          <p className="text-gray-500 mt-1">Drag and drop bookings to update their status</p>
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              bookings={getBookingsByStatus(column.id)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeBooking ? (
            <div className="bg-white p-4 rounded-lg shadow-lg border-2 border-blue-500 opacity-90">
              <BookingCard booking={activeBooking} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {COLUMNS.map((column) => (
              <div key={column.id} className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {getBookingsByStatus(column.id).length}
                </p>
                <p className="text-sm text-gray-500">{column.title}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
