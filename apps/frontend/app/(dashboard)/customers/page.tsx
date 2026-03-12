'use client';

import React, { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { customersApi } from '@/lib/api';
import { formatPhoneNumber } from '@/lib/utils';
import { Plus, Search, Users, Eye, Mail, Phone, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
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
}

interface CustomerMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const CUSTOMERS_PAGE_SIZE = 20;

const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.union([z.literal(''), z.string().email('Please enter a valid email address')]).optional(),
  phone: z.string().min(1, 'Phone is required').regex(/^\+?[\d\s\-().]{7,20}$/, 'Invalid phone format'),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export default function CustomersPageWrapper() {
  return (
    <Suspense fallback={<div className="p-6 space-y-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-14 w-full rounded-xl" />)}</div>}>
      <CustomersPage />
    </Suspense>
  );
}

function CustomersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [meta, setMeta] = useState<CustomerMeta>({ total: 0, page: 1, limit: CUSTOMERS_PAGE_SIZE, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { addToast } = useToast();
  const abortRef = useRef<AbortController | null>(null);

  /* Auto-open create modal when ?create=1 is in the URL */
  useEffect(() => {
    if (searchParams.get('create') === '1') {
      setIsCreateModalOpen(true);
      router.replace('/customers', { scroll: false });
    }
  }, [searchParams, router]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
  });

  const loadCustomers = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      setIsLoading(true);
      const params: Record<string, string | number> = { limit: CUSTOMERS_PAGE_SIZE, page };
      if (debouncedSearch) params.search = debouncedSearch;
      const response = await customersApi.getAll(params);
      if (ctrl.signal.aborted) return;
      setCustomers(response.data?.data || []);
      if (response.data?.meta) {
        setMeta(response.data.meta);
      } else {
        const list = response.data?.data || [];
        setMeta({ total: list.length, page: 1, limit: CUSTOMERS_PAGE_SIZE, totalPages: 1 });
      }
    } catch (error) {
      if ((error as { name?: string }).name === 'CanceledError') return;
      addToast('error', 'Failed to load customers');
    } finally {
      if (!ctrl.signal.aborted) setIsLoading(false);
    }
  }, [debouncedSearch, page, addToast]);

  // Re-fetch when page or search changes
  useEffect(() => {
    loadCustomers();
    return () => abortRef.current?.abort();
  }, [loadCustomers]);

  const onCreateCustomer = async (data: CustomerFormData) => {
    try {
      setIsSubmitting(true);
      const payload: any = {
        name: data.name,
        phone: data.phone,
      };
      if (data.email) payload.email = data.email;
      
      const metadata: any = {};
      if (data.address) metadata.address = data.address;
      if (data.notes) metadata.notes = data.notes;
      if (Object.keys(metadata).length > 0) {
        payload.metadata = metadata;
      }

      await customersApi.create(payload);

      addToast('success', 'Customer created successfully');
      setIsCreateModalOpen(false);
      reset();
      loadCustomers();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      addToast('error', err.response?.data?.message || 'Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="CRM"
        title="Customers"
        subtitle="Manage your customer database and relationships."
        accentColor="violet"
        actions={
          <Button onClick={() => setIsCreateModalOpen(true)} size="lg" className="rounded-full shadow-lg shadow-[var(--primary)]/20">
            <Plus className="mr-2 h-4 w-4" /> New Customer
          </Button>
        }
      />

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Customers ({meta.total})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-[var(--foreground-tertiary)]" />
              <h3 className="mt-2 text-sm font-semibold text-[var(--foreground)]">No customers</h3>
              <p className="mt-1 text-sm text-[var(--foreground-tertiary)]">
                {searchTerm ? 'No customers match your search.' : 'Get started by adding your first customer.'}
              </p>
              {!searchTerm && (
                <Button className="mt-4" onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Customer
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer: Customer) => (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-[var(--foreground-tertiary)]" />
                            <a
                              href={`mailto:${customer.email}`}
                              className="text-[var(--primary)] hover:underline"
                            >
                              {customer.email}
                            </a>
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.phone ? (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-[var(--foreground-tertiary)]" />
                              <a
                                href={`tel:${customer.phone}`}
                                className="text-[var(--primary)] hover:underline"
                              >
                                {formatPhoneNumber(customer.phone)}
                              </a>
                            </div>
                          ) : (
                            <span className="text-[var(--foreground-tertiary)]">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Link href={`/customers/${customer.id}`}>
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
              </div>

              {/* Mobile Card List (Visible on mobile) */}
              <div className="sm:hidden grid grid-cols-1 gap-4">
                {customers.map((customer) => (
                  <div key={customer.id} className="border border-border/40 rounded-2xl overflow-hidden bg-surface-0 shadow-sm">
                    <div className="p-4 flex items-center justify-between border-b border-border/10 bg-surface-1/30">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center font-black text-primary">
                          {customer.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm tracking-tight">{customer.name}</p>
                          <p className="text-[9px] text-foreground-tertiary font-black uppercase tracking-widest truncate">
                            {customer.email}
                          </p>
                        </div>
                      </div>
                      <Link href={`/customers/${customer.id}`}>
                        <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 p-0">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                    <div className="px-4 py-3 flex gap-4">
                      <div className="flex flex-1 items-center gap-2 text-[10px] font-bold text-foreground-tertiary">
                        <Mail className="h-3 w-3 opacity-40 text-primary" /> EMAIL
                      </div>
                      <div className="flex flex-1 items-center gap-2 text-[10px] font-bold text-foreground-tertiary">
                        <Phone className="h-3 w-3 opacity-40 text-primary" /> PHONE
                      </div>
                    </div>
                    <div className="px-4 pb-4 flex gap-4">
                      <div className="flex-1 min-w-0">
                        <a href={`mailto:${customer.email}`} className="text-xs font-bold text-primary truncate block hover:underline">
                          {customer.email.split('@')[0]}...
                        </a>
                      </div>
                      <div className="flex-1 min-w-0">
                        <a href={`tel:${customer.phone}`} className="text-xs font-bold text-primary truncate block hover:underline">
                          {customer.phone ? formatPhoneNumber(customer.phone) : '—'}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Pagination */}
          {!isLoading && meta.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-4 border-t border-[var(--border)]">
              <p className="text-sm text-[var(--foreground-secondary)]">
                Page {meta.page} of {meta.totalPages} &mdash; {meta.total} customers total
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Customer Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          reset();
        }}
        title="Create New Customer"
        description="Add a new customer to your database"
        size="lg"
      >
        <form onSubmit={handleSubmit(onCreateCustomer)} className="space-y-4">
          <Input
            label="Name"
            placeholder="John Doe"
            error={errors.name?.message}
            {...register('name')}
            leftIcon={<Users className="h-4 w-4" />}
          />

          <Input
            label="Email"
            type="email"
            placeholder="john@example.com"
            error={errors.email?.message}
            {...register('email')}
            leftIcon={<Mail className="h-4 w-4" />}
          />

          <Input
            label="Phone (Optional)"
            type="tel"
            placeholder="(555) 123-4567"
            error={errors.phone?.message}
            {...register('phone')}
            leftIcon={<Phone className="h-4 w-4" />}
          />

          <Input
            label="Address (Optional)"
            placeholder="123 Main St, City, State 12345"
            error={errors.address?.message}
            {...register('address')}
          />

          <Textarea
            label="Notes (Optional)"
            {...register('notes')}
            rows={3}
            placeholder="Add any notes about this customer..."
            error={errors.notes?.message}
          />

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
              Create Customer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
