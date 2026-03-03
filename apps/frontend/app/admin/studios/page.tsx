'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Select } from '@/components/ui/input';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/table';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { adminApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import {
  Plus,
  Search,
  Building2,
  Users,
  Calendar,
  Eye,
  Pause,
  Play,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';

interface Studio {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  status: string;
  subscriptionTier: string;
  createdAt: string;
  _count: {
    bookings: number;
    customers: number;
    users: number;
  };
}

interface StudioListResponse {
  data: Studio[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function AdminStudiosPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [studios, setStudios] = useState<Studio[]>([]);
  const [meta, setMeta] = useState<StudioListResponse['meta'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [page, setPage] = useState(1);

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    action: 'suspend' | 'activate' | 'delete';
    studio: Studio | null;
  }>({ open: false, action: 'suspend', studio: null });
  const [actionLoading, setActionLoading] = useState(false);

  const loadStudios = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getStudios({
        page,
        limit: 20,
        status: statusFilter || undefined,
        tier: tierFilter || undefined,
      });
      setStudios(Array.isArray(res.data.data) ? res.data.data : []);
      setMeta(res.data.meta);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      addToast('error', e.response?.data?.message || 'Failed to load studios');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, tierFilter, addToast]);

  useEffect(() => {
    loadStudios();
  }, [loadStudios]);

  const handleAction = async () => {
    if (!confirmModal.studio) return;

    setActionLoading(true);
    try {
      if (confirmModal.action === 'suspend') {
        await adminApi.suspendStudio(confirmModal.studio.id);
        addToast('success', `${confirmModal.studio.name} has been suspended`);
      } else if (confirmModal.action === 'activate') {
        await adminApi.activateStudio(confirmModal.studio.id);
        addToast('success', `${confirmModal.studio.name} has been activated`);
      } else if (confirmModal.action === 'delete') {
        await adminApi.deleteStudio(confirmModal.studio.id);
        addToast('success', `${confirmModal.studio.name} has been deleted`);
      }
      setConfirmModal({ open: false, action: 'suspend', studio: null });
      loadStudios();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      addToast('error', e.response?.data?.message || `Failed to ${confirmModal.action} studio`);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <Badge variant="success" dot>{status}</Badge>;
      case 'TRIAL': return <Badge variant="info" dot>{status}</Badge>;
      case 'SUSPENDED': return <Badge variant="danger" dot>{status}</Badge>;
      case 'EXPIRED': return <Badge variant="warning" dot>{status}</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const filteredStudios = searchQuery
    ? studios.filter(
        (s) =>
          (s.name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.email ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.slug ?? '').toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : studios;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        eyebrow="Admin"
        title="Studios"
        subtitle="Manage all photography studios on the platform"
        accentColor="violet"
        actions={
          <button
            className="btn-shimmer inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)' }}
            onClick={() => router.push('/admin/studios/new')}
          >
            <Plus className="h-4 w-4" />
            Create Studio
          </button>
        }
      />

      {/* Filters */}
      <Card>
        <div className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search studios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
            />
          </div>
          <div className="w-40">
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              options={[
                { value: 'ACTIVE', label: 'Active' },
                { value: 'TRIAL', label: 'Trial' },
                { value: 'SUSPENDED', label: 'Suspended' },
                { value: 'EXPIRED', label: 'Expired' },
              ]}
              placeholder="All Statuses"
            />
          </div>
          <div className="w-40">
            <Select
              value={tierFilter}
              onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
              options={[
                { value: 'STARTER', label: 'Starter' },
                { value: 'PROFESSIONAL', label: 'Professional' },
                { value: 'STUDIO', label: 'Studio' },
                { value: 'ENTERPRISE', label: 'Enterprise' },
              ]}
              placeholder="All Tiers"
            />
          </div>
        </div>
      </Card>

      {/* Studios Table */}
      <Card>
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Studio</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Bookings</TableHead>
                <TableHead>Customers</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudios.length === 0 ? (
                <TableEmpty
                  icon={<Building2 className="h-6 w-6" />}
                  title="No studios found"
                  description={searchQuery ? 'Try adjusting your search' : 'Create your first studio to get started'}
                  colSpan={8}
                  action={
                    !searchQuery && (
                      <Button size="sm" onClick={() => router.push('/admin/studios/new')}>
                        Create Studio
                      </Button>
                    )
                  }
                />
              ) : (
                filteredStudios.map((studio) => (
                  <TableRow key={studio.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-[var(--primary-light)] flex items-center justify-center text-xs font-bold text-[var(--primary)] shrink-0">
                          {(studio.name || '?').charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--foreground)] truncate">{studio.name}</p>
                          <p className="text-xs text-[var(--foreground-tertiary)] truncate">{studio.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(studio.status)}</TableCell>
                    <TableCell>
                      <span className="text-xs font-medium text-[var(--foreground-secondary)]">{studio.subscriptionTier}</span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm">
                        <Users className="h-3.5 w-3.5 text-[var(--foreground-tertiary)]" />
                        {studio._count.users}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3.5 w-3.5 text-[var(--foreground-tertiary)]" />
                        {studio._count.bookings}
                      </span>
                    </TableCell>
                    <TableCell>{studio._count.customers}</TableCell>
                    <TableCell>
                      <span className="text-sm text-[var(--foreground-secondary)]">{formatDate(studio.createdAt)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                         <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => router.push(`/admin/studios/${studio.id}`)}
                          aria-label="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <a
                          href={`/studio/${studio.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center h-7 px-2 rounded-[var(--radius-sm)] text-[var(--foreground-secondary)] hover:bg-[var(--overlay-light)] hover:text-[var(--foreground)] transition-colors"
                          aria-label="View public page"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        {studio.status === 'ACTIVE' || studio.status === 'TRIAL' ? (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setConfirmModal({ open: true, action: 'suspend', studio })}
                            aria-label="Suspend studio"
                          >
                            <Pause className="h-4 w-4 text-[var(--warning)]" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => setConfirmModal({ open: true, action: 'activate', studio })}
                            aria-label="Activate studio"
                          >
                            <Play className="h-4 w-4 text-[var(--success)]" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setConfirmModal({ open: true, action: 'delete', studio })}
                          aria-label="Delete studio"
                        >
                          <Trash2 className="h-4 w-4 text-[var(--danger)]" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-light)]">
            <p className="text-sm text-[var(--foreground-secondary)]">
              Showing {(meta.page - 1) * meta.limit + 1} to {Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, action: 'suspend', studio: null })}
        title={
          confirmModal.action === 'delete'
            ? 'Delete Studio'
            : confirmModal.action === 'suspend'
              ? 'Suspend Studio'
              : 'Activate Studio'
        }
        description={
          confirmModal.action === 'delete'
            ? `Are you sure you want to permanently delete "${confirmModal.studio?.name}"? This action cannot be undone.`
            : confirmModal.action === 'suspend'
              ? `Are you sure you want to suspend "${confirmModal.studio?.name}"? Users will not be able to access this studio.`
              : `Are you sure you want to activate "${confirmModal.studio?.name}"?`
        }
        size="sm"
      >
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setConfirmModal({ open: false, action: 'suspend', studio: null })}
          >
            Cancel
          </Button>
          <Button
            variant={confirmModal.action === 'delete' ? 'danger' : confirmModal.action === 'activate' ? 'success' : 'primary'}
            onClick={handleAction}
            isLoading={actionLoading}
          >
            {confirmModal.action === 'delete' ? 'Delete' : confirmModal.action === 'suspend' ? 'Suspend' : 'Activate'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
