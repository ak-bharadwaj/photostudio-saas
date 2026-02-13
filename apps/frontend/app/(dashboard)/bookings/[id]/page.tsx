'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingPage } from '@/components/ui/loading';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { bookingsApi } from '@/lib/api';
import { formatDate, formatCurrency, getBookingStatusBadge } from '@/lib/utils';
import { ArrowLeft, Calendar, User, Wrench, FileText, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface Booking {
  id: number;
  bookingDate: string;
  status: string;
  notes?: string;
  cancellationReason?: string;
  customer: {
    id: number;
    name: string;
    email: string;
    phone?: string;
  };
  service: {
    id: number;
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
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [cancellationNotes, setCancellationNotes] = useState('');

  useEffect(() => {
    loadBooking();
  }, [params.id]);

  const loadBooking = async () => {
    try {
      setIsLoading(true);
      const response = await bookingsApi.getOne(params.id as string);
      setBooking(response.data);
    } catch (error) {
      console.error('Failed to load booking:', error);
      addToast('error', 'Failed to load booking details');
      router.push('/bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus || !booking) return;

    try {
      setIsUpdating(true);
      await bookingsApi.updateStatus(booking.id.toString(), { status: newStatus });
      addToast('success', 'Booking status updated successfully');
      setIsStatusModalOpen(false);
      loadBooking();
    } catch (error: any) {
      addToast('error', error.response?.data?.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!booking) return;

    try {
      setIsUpdating(true);
      await bookingsApi.cancel(booking.id.toString(), cancellationNotes);
      addToast('success', 'Booking cancelled successfully');
      setIsCancelModalOpen(false);
      loadBooking();
    } catch (error: any) {
      addToast('error', error.response?.data?.message || 'Failed to cancel booking');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <LoadingPage message="Loading booking details..." />;
  }

  if (!booking) {
    return null;
  }

  const statusOptions = [
    { value: 'INQUIRY', label: 'Inquiry' },
    { value: 'QUOTED', label: 'Quoted' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/bookings">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Booking Details</h1>
            <p className="mt-1 text-gray-600">Booking #{booking.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {booking.status !== 'CANCELLED' && (
            <>
              <Button variant="outline" onClick={() => setIsStatusModalOpen(true)}>
                Update Status
              </Button>
              <Button variant="danger" onClick={() => setIsCancelModalOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Cancel Booking
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Booking Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Booking Information</CardTitle>
                <Badge {...getBookingStatusBadge(booking.status)}>
                  {booking.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Booking Date</p>
                  <p className="text-base text-gray-900">{formatDate(booking.bookingDate)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Wrench className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Service</p>
                  <p className="text-base font-semibold text-gray-900">{booking.service.name}</p>
                  {booking.service.description && (
                    <p className="text-sm text-gray-600 mt-1">{booking.service.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">Price:</span> {formatCurrency(booking.service.price)}
                    </p>
                    {booking.service.duration && (
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">Duration:</span> {booking.service.duration} minutes
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {booking.notes && (
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Notes</p>
                    <p className="text-base text-gray-900">{booking.notes}</p>
                  </div>
                </div>
              )}

              {booking.cancellationReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-red-800">Cancellation Reason</p>
                  <p className="text-sm text-red-700 mt-1">{booking.cancellationReason}</p>
                </div>
              )}
            </CardContent>
          </Card>
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
                <p className="text-sm font-medium text-gray-500">Name</p>
                <Link 
                  href={`/customers/${booking.customer.id}`}
                  className="text-base text-blue-600 hover:underline"
                >
                  {booking.customer.name}
                </Link>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Email</p>
                <a 
                  href={`mailto:${booking.customer.email}`}
                  className="text-base text-gray-900 hover:text-blue-600"
                >
                  {booking.customer.email}
                </a>
              </div>
              {booking.customer.phone && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Phone</p>
                  <a 
                    href={`tel:${booking.customer.phone}`}
                    className="text-base text-gray-900 hover:text-blue-600"
                  >
                    {booking.customer.phone}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-500">Created</p>
                <p className="text-sm text-gray-900">{formatDate(booking.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Last Updated</p>
                <p className="text-sm text-gray-900">{formatDate(booking.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Update Status Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Update Booking Status"
        description="Change the status of this booking"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Select status</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

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

      {/* Cancel Booking Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Booking"
        description="Are you sure you want to cancel this booking?"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cancellation Reason (Optional)
            </label>
            <textarea
              value={cancellationNotes}
              onChange={(e) => setCancellationNotes(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Provide a reason for cancellation..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsCancelModalOpen(false)}>
              Keep Booking
            </Button>
            <Button 
              variant="danger"
              onClick={handleCancelBooking}
              isLoading={isUpdating}
              disabled={isUpdating}
            >
              Cancel Booking
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
