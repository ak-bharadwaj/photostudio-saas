'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { customersApi, bookingsApi, invoicesApi } from '@/lib/api';
import { formatDate, formatCurrency, formatPhoneNumber, getBookingStatusBadge, getInvoiceStatusBadge } from '@/lib/utils';
import { ArrowLeft, User, Mail, Phone, MapPin, Edit2, FileText, Calendar, IndianRupee } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface Customer {
  id: number;
  name: string;
  email: string;
  phone?: string;
  metadata?: {
    address?: string;
    notes?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface CustomerStats {
  totalBookings: number;
  totalRevenue: number;
  pendingInvoices: number;
}

interface Booking {
  id: number;
  scheduledAt: string;
  bookingDate?: string;
  status: string;
  service: {
    name: string;
  };
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  totalAmount: number;
  status: string;
  dueDate: string;
}

const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.union([z.literal(''), z.string().email('Please enter a valid email address')]).optional(),
  phone: z.string().min(1, 'Phone is required').regex(/^\+?[\d\s\-().]{7,20}$/, 'Invalid phone format'),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export default function CustomerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
  });

  const loadCustomerData = useCallback(async (ctrl?: AbortController) => {
    try {
      setIsLoading(true);
      const [customerRes, statsRes, bookingsRes, invoicesRes] = await Promise.all([
        customersApi.getOne(params.id as string),
        customersApi.getStats(params.id as string),
        bookingsApi.getAll({ customerId: params.id as string, limit: 10 }),
        invoicesApi.getAll({ customerId: params.id as string, limit: 10 }),
      ]);

      if (ctrl?.signal.aborted) return;

      setCustomer(customerRes.data);
      setStats(statsRes.data);
      // bookingsApi.getAll returns { data: { data: [], meta: {} } }
      setBookings(bookingsRes.data?.data ?? []);
      // invoicesApi.getAll returns { data: { data: [], meta: {} } }
      setInvoices(invoicesRes.data?.data ?? []);

      // Reset form with customer data
      reset({
        name: customerRes.data.name,
        email: customerRes.data.email,
        phone: customerRes.data.phone || '',
        address: customerRes.data.metadata?.address || '',
        notes: customerRes.data.metadata?.notes || '',
      });
    } catch (error) {
      if ((error as { name?: string }).name === 'CanceledError') return;
      addToast('error', 'Failed to load customer details');
      router.push('/customers');
    } finally {
      if (!abortRef.current?.signal.aborted) setIsLoading(false);
    }
  }, [params.id, addToast, reset, router]);

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    loadCustomerData(ctrl);
    return () => ctrl.abort();
  }, [loadCustomerData]);

  const onUpdateCustomer = async (data: CustomerFormData) => {
    if (!customer) return;

    try {
      setIsSubmitting(true);
      const payload: any = {
        name: data.name,
        phone: data.phone,
      };
      if (data.email) payload.email = data.email;
      const metadata: any = { ...(customer.metadata || {}) };
      if (data.address) metadata.address = data.address; else delete metadata.address;
      if (data.notes) metadata.notes = data.notes; else delete metadata.notes;
      payload.metadata = metadata;

      await customersApi.update(customer.id.toString(), payload);

      addToast('success', 'Customer updated successfully');
      setIsEditModalOpen(false);
      loadCustomerData();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      addToast('error', err.response?.data?.message || 'Failed to update customer');
    } finally {
      setIsSubmitting(false);
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

  if (!customer) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/customers">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">{customer?.name}</h1>
            <p className="mt-1 text-[var(--foreground-secondary)]">Customer Details</p>
          </div>
        </div>
        <Button onClick={() => setIsEditModalOpen(true)}>
          <Edit2 className="h-4 w-4 mr-2" />
          Edit Customer
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[var(--foreground-secondary)]">
                Total Bookings
              </CardTitle>
              <Calendar className="h-5 w-5 text-[var(--primary)]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBookings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[var(--foreground-secondary)]">
                Total Revenue
              </CardTitle>
              <IndianRupee className="h-5 w-5 text-[var(--success)]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-[var(--foreground-secondary)]">
                Pending Invoices
              </CardTitle>
              <FileText className="h-5 w-5 text-[var(--warning)]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingInvoices}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Bookings */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              {bookings.length === 0 ? (
                <p className="text-sm text-[var(--foreground-secondary)]">No bookings found for this customer.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">{booking.service?.name ?? '—'}</TableCell>
                        <TableCell>{formatDate(booking.scheduledAt || booking.bookingDate || '')}</TableCell>
                        <TableCell>
                           <Badge variant={getBookingStatusBadge(booking.status).variant}>{booking.status}</Badge>
                         </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Recent Invoices */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-sm text-[var(--foreground-secondary)]">No invoices found for this customer.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono text-sm">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                        <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                        <TableCell>
                           <Badge variant={getInvoiceStatusBadge(invoice.status).variant}>{invoice.status}</Badge>
                         </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-[var(--foreground-tertiary)] mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[var(--foreground-secondary)]">Email</p>
                  <a
                    href={`mailto:${customer?.email}`}
                    className="text-base text-[var(--primary)] hover:underline"
                  >
                    {customer?.email}
                  </a>
                </div>
              </div>

              {customer.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-[var(--foreground-tertiary)] mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground-secondary)]">Phone</p>
                    <a
                      href={`tel:${customer?.phone}`}
                      className="text-base text-[var(--primary)] hover:underline"
                    >
                      {formatPhoneNumber(customer?.phone || '')}
                    </a>
                  </div>
                </div>
              )}

              {customer.metadata?.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-[var(--foreground-tertiary)] mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground-secondary)]">Address</p>
                    <p className="text-base text-[var(--foreground)]">{customer.metadata.address}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {customer.metadata?.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">{customer.metadata.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm font-medium text-[var(--foreground-secondary)]">Created</p>
                <p className="text-sm text-[var(--foreground)]">{formatDate(customer.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground-secondary)]">Last Updated</p>
                <p className="text-sm text-[var(--foreground)]">{formatDate(customer.updatedAt)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Customer Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Customer"
        description="Update customer information"
        size="lg"
      >
        <form onSubmit={handleSubmit(onUpdateCustomer)} className="space-y-4">
          <Input
            label="Name"
            placeholder="John Doe"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Email"
            type="email"
            placeholder="john@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Phone (Optional)"
            type="tel"
            placeholder="(555) 123-4567"
            error={errors.phone?.message}
            {...register('phone')}
          />

          <Input
            label="Address (Optional)"
            placeholder="123 Main St, City, State 12345"
            error={errors.address?.message}
            {...register('address')}
          />

          <Textarea
            label="Notes"
            {...register('notes')}
            rows={3}
            placeholder="Add any notes about this customer..."
            helperText="Optional"
          />

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
              Update Customer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
