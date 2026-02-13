'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { bookingsApi, customersApi, servicesApi } from '@/lib/api';
import { formatDate, getBookingStatusBadge } from '@/lib/utils';
import { Plus, Search, Calendar, Eye, LayoutGrid } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface Booking {
  id: number;
  bookingDate: string;
  status: string;
  notes?: string;
  customer: {
    id: number;
    name: string;
    email: string;
  };
  service: {
    id: number;
    name: string;
    price: number;
  };
}

interface Customer {
  id: number;
  name: string;
  email: string;
}

interface Service {
  id: number;
  name: string;
  price: number;
}

const bookingSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  serviceId: z.string().min(1, 'Service is required'),
  bookingDate: z.string().min(1, 'Booking date is required'),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingSchema>;

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
  });

  useEffect(() => {
    loadBookings();
    loadCustomers();
    loadServices();
  }, [statusFilter]);

  const loadBookings = async () => {
    try {
      setIsLoading(true);
      const params: any = { limit: 100 };
      if (statusFilter) params.status = statusFilter;
      
      const response = await bookingsApi.getAll(params);
      setBookings(response.data.data);
    } catch (error) {
      console.error('Failed to load bookings:', error);
      addToast('error', 'Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await customersApi.getAll({ limit: 1000 });
      setCustomers(response.data.data);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const loadServices = async () => {
    try {
      const response = await servicesApi.getAll({ limit: 1000, isActive: true });
      setServices(response.data.data);
    } catch (error) {
      console.error('Failed to load services:', error);
    }
  };

  const onCreateBooking = async (data: BookingFormData) => {
    try {
      setIsSubmitting(true);
      await bookingsApi.create({
        customerId: parseInt(data.customerId),
        serviceId: parseInt(data.serviceId),
        bookingDate: data.bookingDate,
        notes: data.notes,
      });
      
      addToast('success', 'Booking created successfully');
      setIsCreateModalOpen(false);
      reset();
      loadBookings();
    } catch (error: any) {
      addToast('error', error.response?.data?.message || 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch = 
      booking.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.service.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const statuses = [
    { value: '', label: 'All Statuses' },
    { value: 'INQUIRY', label: 'Inquiry' },
    { value: 'QUOTED', label: 'Quoted' },
    { value: 'CONFIRMED', label: 'Confirmed' },
    { value: 'IN_PROGRESS', label: 'In Progress' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
          <p className="mt-2 text-gray-600">Manage your studio bookings and appointments</p>
        </div>
        <div className="flex gap-2">
          <Link href="/bookings/kanban">
            <Button variant="secondary">
              <LayoutGrid className="mr-2 h-4 w-4" />
              Kanban View
            </Button>
          </Link>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by customer or service..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Bookings ({filteredBookings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No bookings</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'No bookings match your search.' : 'Get started by creating a new booking.'}
              </p>
              {!searchTerm && (
                <Button className="mt-4" onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Booking
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Booking Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">{booking.customer.name}</p>
                        <p className="text-sm text-gray-500">{booking.customer.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{booking.service.name}</TableCell>
                    <TableCell>{formatDate(booking.bookingDate)}</TableCell>
                    <TableCell>
                      <Badge {...getBookingStatusBadge(booking.status)}>
                        {booking.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/bookings/${booking.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Booking Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          reset();
        }}
        title="Create New Booking"
        description="Add a new booking for a customer"
        size="lg"
      >
        <form onSubmit={handleSubmit(onCreateBooking)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer
            </label>
            <select
              {...register('customerId')}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Select a customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} ({customer.email})
                </option>
              ))}
            </select>
            {errors.customerId && (
              <p className="mt-1 text-sm text-red-600">{errors.customerId.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service
            </label>
            <select
              {...register('serviceId')}
              className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">Select a service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} (${service.price})
                </option>
              ))}
            </select>
            {errors.serviceId && (
              <p className="mt-1 text-sm text-red-600">{errors.serviceId.message}</p>
            )}
          </div>

          <Input
            label="Booking Date"
            type="datetime-local"
            error={errors.bookingDate?.message}
            {...register('bookingDate')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Add any notes about this booking..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
              Create Booking
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
