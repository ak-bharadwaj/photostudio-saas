'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { customersApi } from '@/lib/api';
import { formatPhoneNumber } from '@/lib/utils';
import { Plus, Search, Users, Eye, Mail, Phone } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface Customer {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  createdAt: string;
}

const customerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerSchema>;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { addToast } = useToast();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
  });

  // Re-fetch customers when debounced search term changes
  useEffect(() => {
    loadCustomers(debouncedSearch);
  }, [debouncedSearch]);

  const loadCustomers = async (searchQuery: string = '') => {
    try {
      setIsLoading(true);
      const params: any = { limit: 50 }; // Fetch fewer by default for optimization
      if (searchQuery) {
        params.search = searchQuery;
      }
      const response = await customersApi.getAll(params);
      setCustomers(response.data?.data || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
      addToast('error', 'Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  };

  const onCreateCustomer = async (data: CustomerFormData) => {
    try {
      setIsSubmitting(true);
      await customersApi.create(data);

      addToast('success', 'Customer created successfully');
      setIsCreateModalOpen(false);
      reset();
      loadCustomers();
    } catch (error: any) {
      addToast('error', error.response?.data?.message || 'Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Client-side mapping since the API already filters
  const displayCustomers = customers || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="mt-2 text-gray-600">Manage your customer database</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Customer
        </Button>
      </div>

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
          <CardTitle>All Customers {displayCustomers.length >= 50 ? '(50+)' : `(${displayCustomers.length})`}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : displayCustomers.length === 0 ? (
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
                {displayCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
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
                          <Phone className="h-4 w-4 text-gray-400" />
                          <a
                            href={`tel:${customer.phone}`}
                            className="text-[var(--primary)] hover:underline"
                          >
                            {formatPhoneNumber(customer.phone)}
                          </a>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
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
