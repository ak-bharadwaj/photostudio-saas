'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { adminApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import {
  ArrowLeft,
  Building2,
  Users,
  Calendar,
  Layers,
  FileText,
  ExternalLink,
  Pause,
  Play,
  Trash2,
  Save,
  Mail,
  Phone,
} from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';

interface StudioDetail {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  status: string;
  subscriptionTier: string;
  logoUrl: string | null;
  brandingConfig: Record<string, unknown> | null;
  defaultTerms: string | null;
  createdAt: string;
  updatedAt: string;
  subscriptionExpiresAt: string | null;
  users: {
    id: string;
    email: string;
    role: string;
    createdAt: string;
  }[];
  _count: {
    bookings: number;
    customers: number;
    services: number;
    invoices: number;
  };
}

export default function StudioDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const studioId = params.id as string;

  const [studio, setStudio] = useState<StudioDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Edit form state
  const [editData, setEditData] = useState({
    name: '',
    email: '',
    phone: '',
    subscriptionTier: '',
    defaultTerms: '',
  });

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    action: 'suspend' | 'activate' | 'delete';
  }>({ open: false, action: 'suspend' });
  const [actionLoading, setActionLoading] = useState(false);

  const loadStudio = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminApi.getStudio(studioId);
      setStudio(res.data);
      setEditData({
        name: res.data.name,
        email: res.data.email || '',
        phone: res.data.phone || '',
        subscriptionTier: res.data.subscriptionTier,
        defaultTerms: res.data.defaultTerms || '',
      });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      addToast('error', e.response?.data?.message || 'Failed to load studio');
    } finally {
      setLoading(false);
    }
  }, [studioId, addToast]);

  useEffect(() => {
    loadStudio();
  }, [loadStudio]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminApi.updateStudio(studioId, {
        name: editData.name,
        email: editData.email,
        phone: editData.phone,
        subscriptionTier: editData.subscriptionTier,
        defaultTerms: editData.defaultTerms,
      });
      addToast('success', 'Studio updated successfully');
      setEditMode(false);
      loadStudio();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      addToast('error', e.response?.data?.message || 'Failed to update studio');
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async () => {
    setActionLoading(true);
    try {
      if (confirmModal.action === 'suspend') {
        await adminApi.suspendStudio(studioId);
        addToast('success', 'Studio suspended');
      } else if (confirmModal.action === 'activate') {
        await adminApi.activateStudio(studioId);
        addToast('success', 'Studio activated');
      } else if (confirmModal.action === 'delete') {
        await adminApi.deleteStudio(studioId);
        addToast('success', 'Studio deleted');
        router.push('/admin/studios');
        return;
      }
      setConfirmModal({ open: false, action: 'suspend' });
      loadStudio();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      addToast('error', e.response?.data?.message || `Failed to ${confirmModal.action} studio`);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <Badge variant="success" dot size="md">{status}</Badge>;
      case 'TRIAL': return <Badge variant="info" dot size="md">{status}</Badge>;
      case 'SUSPENDED': return <Badge variant="danger" dot size="md">{status}</Badge>;
      case 'EXPIRED': return <Badge variant="warning" dot size="md">{status}</Badge>;
      default: return <Badge size="md">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-40 w-full rounded-2xl" />
        <div className="skeleton h-64 w-full rounded-2xl" />
        <div className="skeleton h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!studio) {
    return (
      <div className="text-center py-20">
        <p className="text-[var(--foreground-secondary)]">Studio not found</p>
        <Link href="/admin/studios" className="mt-4 text-sm text-[var(--primary)] hover:underline">
          Back to Studios
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/admin/studios"
        className="inline-flex items-center gap-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Studios
      </Link>

      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-[var(--radius-lg)] bg-[var(--primary-light)] flex items-center justify-center text-xl font-bold text-[var(--primary)]">
            {studio.name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[var(--foreground)]">{studio.name}</h1>
              {getStatusBadge(studio.status)}
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-[var(--foreground-secondary)]">
              <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{studio.email}</span>
              {studio.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{studio.phone}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/studio/${studio.slug}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm" leftIcon={<ExternalLink className="h-4 w-4" />}>
              Public Page
            </Button>
          </a>
          {studio.status === 'ACTIVE' || studio.status === 'TRIAL' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmModal({ open: true, action: 'suspend' })}
              leftIcon={<Pause className="h-4 w-4" />}
            >
              Suspend
            </Button>
          ) : (
            <Button
              variant="success"
              size="sm"
              onClick={() => setConfirmModal({ open: true, action: 'activate' })}
              leftIcon={<Play className="h-4 w-4" />}
            >
              Activate
            </Button>
          )}
          <Button
            variant="danger"
            size="sm"
            onClick={() => setConfirmModal({ open: true, action: 'delete' })}
            leftIcon={<Trash2 className="h-4 w-4" />}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Staff Users', value: studio.users?.length || 0, icon: Users, color: 'text-[var(--primary)]', bg: 'bg-[var(--primary-light)]' },
          { label: 'Services', value: studio._count?.services || 0, icon: Layers, color: 'text-[var(--accent)]', bg: 'bg-[var(--accent-light)]' },
          { label: 'Bookings', value: studio._count?.bookings || 0, icon: Calendar, color: 'text-[var(--success)]', bg: 'bg-[var(--success-light)]' },
          { label: 'Invoices', value: studio._count?.invoices || 0, icon: FileText, color: 'text-[var(--warning)]', bg: 'bg-[var(--warning-light)]' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`flex items-center justify-center h-10 w-10 rounded-[var(--radius-md)] ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[var(--foreground)]">{stat.value}</p>
                  <p className="text-xs text-[var(--foreground-secondary)]">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Studio Details / Edit */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-5 w-5 text-[var(--foreground-secondary)]" />
                Studio Details
              </CardTitle>
              <CardDescription>Created on {formatDate(studio.createdAt)}</CardDescription>
            </div>
            {!editMode ? (
              <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditMode(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} isLoading={saving} leftIcon={<Save className="h-4 w-4" />}>
                  Save
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editMode ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Studio Name"
                  value={editData.name}
                  onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))}
                />
                <Select
                  label="Subscription Tier"
                  value={editData.subscriptionTier}
                  onChange={(e) => setEditData((p) => ({ ...p, subscriptionTier: e.target.value }))}
                  options={[
                    { value: 'STARTER', label: 'Starter' },
                    { value: 'PROFESSIONAL', label: 'Professional' },
                    { value: 'STUDIO', label: 'Studio' },
                    { value: 'ENTERPRISE', label: 'Enterprise' },
                  ]}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Email"
                  type="email"
                  value={editData.email}
                  onChange={(e) => setEditData((p) => ({ ...p, email: e.target.value }))}
                />
                <Input
                  label="Phone"
                  value={editData.phone}
                  onChange={(e) => setEditData((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <Textarea
                label="Default Terms & Conditions"
                value={editData.defaultTerms}
                onChange={(e) => setEditData((p) => ({ ...p, defaultTerms: e.target.value }))}
                rows={4}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
              <div>
                <p className="text-xs font-medium text-[var(--foreground-tertiary)] uppercase tracking-wider">Name</p>
                <p className="mt-0.5 text-sm text-[var(--foreground)]">{studio.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--foreground-tertiary)] uppercase tracking-wider">Slug</p>
                <p className="mt-0.5 text-sm text-[var(--foreground)]">{studio.slug}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--foreground-tertiary)] uppercase tracking-wider">Email</p>
                <p className="mt-0.5 text-sm text-[var(--foreground)]">{studio.email}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--foreground-tertiary)] uppercase tracking-wider">Phone</p>
                <p className="mt-0.5 text-sm text-[var(--foreground)]">{studio.phone || 'Not set'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--foreground-tertiary)] uppercase tracking-wider">Subscription Tier</p>
                <p className="mt-0.5 text-sm text-[var(--foreground)]">{studio.subscriptionTier}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--foreground-tertiary)] uppercase tracking-wider">Subscription Expires</p>
                <p className="mt-0.5 text-sm text-[var(--foreground)]">
                  {studio.subscriptionExpiresAt ? formatDate(studio.subscriptionExpiresAt) : 'N/A'}
                </p>
              </div>
              {studio.defaultTerms && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-[var(--foreground-tertiary)] uppercase tracking-wider">Default Terms</p>
                  <p className="mt-0.5 text-sm text-[var(--foreground)] whitespace-pre-wrap">{studio.defaultTerms}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-[var(--foreground-secondary)]" />
            Team Members ({studio.users?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!studio.users?.length ? (
            <p className="text-sm text-[var(--foreground-tertiary)] text-center py-4">No team members</p>
          ) : (
            <div className="space-y-2">
              {studio.users?.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--surface-1)]">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-[var(--primary-light)] flex items-center justify-center text-xs font-bold text-[var(--primary)]">
                      {(member.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">{member.email}</p>
                      <p className="text-xs text-[var(--foreground-tertiary)]">Joined {formatDate(member.createdAt)}</p>
                    </div>
                  </div>
                  <Badge variant={member.role === 'OWNER' ? 'info' : 'default'}>{member.role}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Modal */}
      <Modal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, action: 'suspend' })}
        title={
          confirmModal.action === 'delete'
            ? 'Delete Studio'
            : confirmModal.action === 'suspend'
              ? 'Suspend Studio'
              : 'Activate Studio'
        }
        description={
          confirmModal.action === 'delete'
            ? `Are you sure you want to permanently delete "${studio.name}"? This action cannot be undone and all data will be lost.`
            : confirmModal.action === 'suspend'
              ? `Are you sure you want to suspend "${studio.name}"? Users will not be able to access the studio.`
              : `Are you sure you want to activate "${studio.name}"?`
        }
        size="sm"
      >
        <ModalFooter>
          <Button variant="outline" onClick={() => setConfirmModal({ open: false, action: 'suspend' })}>
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
