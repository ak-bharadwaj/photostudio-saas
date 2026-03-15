'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { adminApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import {
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';

interface StudioRequest {
  id: string;
  studioName: string;
  ownerName: string;
  email: string;
  phone: string | null;
  city: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<StudioRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getRequests();
      setRequests(res.data);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch requests', err);
      setError('Failed to load partner requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await adminApi.updateRequestStatus(id, newStatus);
      // Refresh list
      fetchRequests();
    } catch (err) {
      console.error('Failed to update status', err);
      alert('Failed to update request status. Please try again.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-success/10 text-success border-success/20">Approved</Badge>;
      case 'REJECTED':
        return <Badge className="bg-danger/10 text-danger border-danger/20">Rejected</Badge>;
      default:
        return <Badge className="bg-gold/10 text-gold border-gold/20">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-10 w-48 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="skeleton h-64 rounded-xl" />
          <div className="skeleton h-64 rounded-xl" />
          <div className="skeleton h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--foreground)] flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-[var(--primary)] text-primary" />
            Partner Requests
          </h1>
          <p className="text-[var(--foreground-secondary)] mt-1">Review and manage business listing requests.</p>
        </div>
      </div>

      {error && (
        <div className="bg-danger/10 text-danger p-4 rounded-[var(--radius-md)] text-sm">
          {error}
        </div>
      )}

      {requests.length === 0 && !loading && !error && (
        <Card className="border-dashed bg-transparent">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <ClipboardList className="h-12 w-12 text-[var(--foreground-tertiary)] opacity-50 mb-4" />
            <p className="text-lg font-medium text-[var(--foreground-secondary)]">No new requests</p>
            <p className="text-sm text-[var(--foreground-tertiary)]">All partner requests have been processed.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {requests.map((request) => (
          <Card key={request.id} className="group hover:border-[var(--primary)] transition-all duration-300 shadow-sm hover:shadow-md bg-[var(--surface-1)]">
            <CardHeader className="pb-3 flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-lg font-bold text-[var(--foreground)] line-clamp-1">{request.studioName}</CardTitle>
                <p className="text-sm font-medium text-[var(--foreground-secondary)]">{request.ownerName}</p>
              </div>
              {getStatusBadge(request.status)}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-[var(--foreground-secondary)]">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 opacity-50" />
                  <a href={`mailto:${request.email}`} className="hover:text-[var(--primary)] truncate">{request.email}</a>
                </div>
                {request.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 opacity-50" />
                    <span>{request.phone}</span>
                  </div>
                )}
                {request.city && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 opacity-50" />
                    <span>{request.city}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 opacity-50" />
                  <span>{formatDate(request.createdAt)}</span>
                </div>
              </div>

              {request.notes && (
                <div className="p-3 bg-[var(--surface-2)] rounded-[var(--radius-sm)] text-xs text-[var(--foreground-secondary)] border border-[var(--border-light)]">
                  <p className="font-semibold text-[var(--foreground)] mb-1">Notes:</p>
                  <p className="italic">{request.notes}</p>
                </div>
              )}

              {request.status === 'PENDING' && (
                <div className="flex gap-3 pt-4 border-t border-[var(--border-light)]">
                  <Button
                    onClick={() => handleUpdateStatus(request.id, 'APPROVED')}
                    variant="success"
                    className="flex-1 gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </Button>
                  <Button
                    onClick={() => handleUpdateStatus(request.id, 'REJECTED')}
                    variant="danger"
                    className="flex-1 gap-2"
                  >
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
