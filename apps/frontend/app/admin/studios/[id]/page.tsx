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
  Star,
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
  isRecommended: boolean;
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
    users: number;
  };
}

export default function PartnerDetailPage() {
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
    slug: '',
    email: '',
    phone: '',
    subscriptionTier: '',
    defaultTerms: '',
    isRecommended: false,
    subscriptionExpiresAt: '',
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
      const res = await adminApi.getPartner(studioId);
      setStudio(res.data);
      setEditData({
        name: res.data.name,
        slug: res.data.slug,
        email: res.data.email || '',
        phone: res.data.phone || '',
        subscriptionTier: res.data.subscriptionTier,
        defaultTerms: res.data.defaultTerms || '',
        isRecommended: res.data.isRecommended || false,
        subscriptionExpiresAt: res.data.subscriptionExpiresAt ? res.data.subscriptionExpiresAt.split('T')[0] : '',
      });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      addToast('error', e.response?.data?.message || 'Failed to load partner');
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
      await adminApi.updatePartner(studioId, {
        name: editData.name,
        slug: editData.slug,
        email: editData.email,
        phone: editData.phone,
        subscriptionTier: editData.subscriptionTier,
        defaultTerms: editData.defaultTerms,
        isRecommended: editData.isRecommended,
        subscriptionExpiresAt: editData.subscriptionExpiresAt || undefined,
      });
      addToast('success', 'Partner updated successfully');
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
        await adminApi.suspendPartner(studioId);
        addToast('success', 'Partner suspended');
      } else if (confirmModal.action === 'activate') {
        await adminApi.activatePartner(studioId);
        addToast('success', 'Partner activated');
      } else if (confirmModal.action === 'delete') {
        await adminApi.deletePartner(studioId);
        addToast('success', 'Partner deleted');
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
        <p className="text-[var(--foreground-secondary)]">Partner not found</p>
        <Link href="/admin/studios" className="mt-4 text-sm text-[var(--primary)] hover:underline">
          Back to Partners
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
        Back to Partners
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
              Partner Profile
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
          { label: 'Staff Users', value: studio._count?.users || 0, icon: Users, color: 'text-[var(--primary)]', bg: 'bg-[var(--primary-light)]' },
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
                Partner Details
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
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Partner Name"
                  value={editData.name}
                  onChange={(e) => setEditData((p) => ({ ...p, name: e.target.value }))}
                />
                <Select
                  label="Subscription Tier"
                  value={editData.subscriptionTier}
                  onChange={(e) => setEditData((p) => ({ ...p, subscriptionTier: e.target.value }))}
                  options={[
                    { value: 'PRO', label: 'Pro Plan' },
                  ]}
                />
              </div>
              
              <div className="p-4 rounded-xl bg-[var(--primary-light)] border border-[var(--primary)]/20 space-y-4">
                <div>
                  <label className="text-xs font-bold text-[var(--primary)] uppercase tracking-widest mb-2 block">Quick Duration Renewal</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: '+30 Days', days: 30 },
                      { label: '+90 Days', days: 90 },
                      { label: '+1 Year', days: 365 },
                      { label: '+2 Years', days: 730 },
                    ].map((opt) => (
                      <Button
                        key={opt.label}
                        variant="outline"
                        size="xs"
                        className="bg-white border-[var(--primary)]/30 text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white"
                        onClick={() => {
                          const base = editData.subscriptionExpiresAt 
                            ? new Date(editData.subscriptionExpiresAt) 
                            : new Date();
                          const next = new Date(base.getTime() + opt.days * 24 * 60 * 60 * 1000);
                          setEditData(p => ({ ...p, subscriptionExpiresAt: next.toISOString().split('T')[0] }));
                        }}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <Input
                  label="Subscription Expiry Date"
                  type="date"
                  className="bg-white"
                  value={editData.subscriptionExpiresAt}
                  onChange={(e) => setEditData((p) => ({ ...p, subscriptionExpiresAt: e.target.value }))}
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
              <Input
                label="URL Slug"
                value={editData.slug}
                onChange={(e) => setEditData((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                placeholder="my-awesome-partner"
              />
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
                <p className="mt-0.5 text-sm text-[var(--foreground)] text-[var(--primary)] font-mono">{studio.slug}</p>
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
                <Badge variant="info">Pro Plan</Badge>
              </div>
              <div>
                <p className="text-xs font-medium text-[var(--foreground-tertiary)] uppercase tracking-wider">Subscription Expires</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Calendar className="h-3.5 w-3.5 text-[var(--foreground-tertiary)]" />
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {studio.subscriptionExpiresAt ? formatDate(studio.subscriptionExpiresAt) : 'N/A'}
                  </p>
                </div>
              </div>
              {studio.defaultTerms && (
                <div className="sm:col-span-2">
                  <p className="text-xs font-medium text-[var(--foreground-tertiary)] uppercase tracking-wider">Default Terms</p>
                  <p className="mt-0.5 text-sm text-[var(--foreground)] whitespace-pre-wrap line-clamp-3 overflow-hidden">{studio.defaultTerms}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommended Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Star className="h-5 w-5 text-yellow-500" />
                Featured on Homepage
              </CardTitle>
              <CardDescription>
                When enabled, this partner appears in the &quot;Recommended Partners&quot; section on the homepage.
              </CardDescription>
            </div>
            <button
              onClick={async () => {
                const newVal = !(studio.isRecommended);
                try {
                  await adminApi.updatePartner(studioId, { isRecommended: newVal });
                  addToast('success', newVal ? 'Partner marked as recommended' : 'Partner removed from recommended');
                  loadStudio();
                } catch {
                  addToast('error', 'Failed to update recommendation status');
                }
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full border-2 transition-colors ${
                studio.isRecommended
                  ? 'bg-yellow-500 border-yellow-500'
                  : 'bg-foreground/10 border-transparent'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  studio.isRecommended ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </CardHeader>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-[var(--foreground-secondary)]" />
            Team Members ({studio._count?.users || 0})
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
            ? 'Delete Partner'
            : confirmModal.action === 'suspend'
              ? 'Suspend Partner'
              : 'Activate Partner'
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
