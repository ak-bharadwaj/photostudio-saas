'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import axios from 'axios';
import { Mail, Calendar, Save, ShieldCheck, Camera, Pencil, Sparkles, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const safeGetItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(key); } catch { return null; }
};

interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export default function AccountPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [isGuest, setIsGuest] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const token = safeGetItem('accessToken');
    const guestPhone = safeGetItem('customer_guest_phone');
    const guestName = safeGetItem('customer_guest_name');

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    if (token) {
      fetchProfile(token, ctrl);
    } else if (guestPhone) {
      setProfile({ id: 'guest', name: guestName || 'Guest', email: '', createdAt: '' });
      setName(guestName || 'Guest');
      setIsGuest(true);
      setLoading(false);
    } else {
      router.replace('/portal/login');
    }

    return () => ctrl.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async (token: string, ctrl: AbortController) => {
    try {
      const res = await axios.get(`${API_URL}/portal/me`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      setProfile(res.data);
      setName(res.data.name ?? '');
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'CanceledError') return;
      const e = err as { response?: { data?: { message?: string } } };
      addToast('error', e.response?.data?.message || 'Failed to load profile.');
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuest) {
      if (typeof window !== 'undefined') localStorage.setItem('customer_guest_name', name);
      setProfile(prev => prev ? { ...prev, name } : prev);
      addToast('success', 'Display name updated.');
      return;
    }

    const token = safeGetItem('accessToken');
    if (!token) { router.replace('/portal/login'); return; }
    setSaving(true);
    try {
      await axios.patch(`${API_URL}/portal/me`, { name }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(prev => prev ? { ...prev, name } : prev);
      addToast('success', 'Profile updated successfully!');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      addToast('error', e.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Skeleton ── */
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="skeleton h-20 w-2/3 rounded-3xl mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="skeleton h-80 rounded-3xl" />
          <div className="md:col-span-2 space-y-5">
            <div className="skeleton h-48 rounded-3xl" />
            <div className="skeleton h-24 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  const initials = (profile?.name ?? 'C').split(' ').filter(Boolean).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();
  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-luxury-in">

      {/* ── Header ── */}
      <div
        className="relative overflow-hidden rounded-3xl px-7 py-6"
        style={{ background: 'linear-gradient(135deg, #07041a 0%, #110828 60%, #080510 100%)' }}
      >
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, #7c3aed, transparent 65%)', transform: 'translate(30%, -30%)' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-3.5 w-3.5" style={{ color: '#db2777' }} />
            <span className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: 'rgba(255,255,255,0.3)' }}>My Profile</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">Account Settings</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Manage your universal customer identity and preferences.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* ── Left: avatar + identity card ── */}
        <div className="space-y-4">
          {/* Profile card */}
          <div
            className="relative overflow-hidden rounded-3xl"
            style={{ background: 'var(--surface-0)', border: '1px solid var(--border)', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}
          >
            {/* Gradient banner */}
            <div
              className="h-32 relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)' }}
            >
              {/* Dot pattern */}
              <div
                className="absolute inset-0 opacity-[0.15]"
                style={{
                  backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.8) 1px, transparent 0)',
                  backgroundSize: '28px 28px',
                }}
              />
              {/* Orb overlay */}
              <div className="absolute top-0 right-0 w-40 h-40 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.4), transparent 70%)', transform: 'translate(20%, -30%)' }} />
            </div>

            <div className="px-6 pb-6 -mt-12 flex flex-col items-center text-center">
              {/* Avatar */}
              <div
                className="h-24 w-24 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-2xl"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #db2777 100%)',
                  border: '4px solid var(--background)',
                  boxShadow: '0 12px 32px rgba(124,58,237,0.4)',
                }}
              >
                {initials}
              </div>

              <h3 className="mt-4 font-black text-lg text-[var(--foreground)]">{profile?.name}</h3>
              <Badge
                variant={isGuest ? 'default' : 'success'}
                className="mt-2 font-bold text-xs"
              >
                {isGuest ? 'Guest Access' : 'Verified Customer'}
              </Badge>

              {/* Stats row */}
              <div
                className="w-full mt-5 grid grid-cols-2 gap-px rounded-2xl overflow-hidden"
                style={{ background: 'var(--border)' }}
              >
                {[
                  { label: 'Member since', value: memberSince ?? 'Guest' },
                  { label: 'Access type', value: isGuest ? 'Guest' : 'Google' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col items-center py-3 px-2" style={{ background: 'var(--surface-0)' }}>
                    <p className="text-xs font-black text-[var(--foreground)]">{value}</p>
                    <p className="text-[10px] text-[var(--foreground-tertiary)] mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Info rows */}
              <div className="w-full mt-5 space-y-3 pt-4" style={{ borderTop: '1px solid var(--border-light)' }}>
                {profile?.email && (
                  <div className="flex items-center gap-3 text-sm text-[var(--foreground-tertiary)]">
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}
                    >
                      <Mail className="h-3.5 w-3.5 text-[var(--primary)]" />
                    </div>
                    <span className="truncate text-xs">{profile.email}</span>
                  </div>
                )}
                {memberSince && (
                  <div className="flex items-center gap-3 text-sm text-[var(--foreground-tertiary)]">
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}
                    >
                      <Calendar className="h-3.5 w-3.5 text-[var(--primary)]" />
                    </div>
                    <span className="text-xs">Joined {memberSince}</span>
                  </div>
                )}
                {isGuest && (
                  <div className="flex items-center gap-3">
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'color-mix(in srgb, var(--warning) 10%, transparent)' }}
                    >
                      <Camera className="h-3.5 w-3.5 text-[var(--warning)]" />
                    </div>
                    <span className="text-xs text-[var(--foreground-tertiary)]">Guest session active</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Auth status card */}
          <div
            className="relative overflow-hidden rounded-3xl p-5"
            style={isGuest ? {
              background: 'var(--surface-0)',
              border: '1px solid var(--border)',
            } : {
              background: 'linear-gradient(135deg, rgba(5,150,105,0.06), rgba(5,150,105,0.02))',
              border: '1px solid rgba(5,150,105,0.18)',
            }}
          >
            {!isGuest && (
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none opacity-15" style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)', transform: 'translate(30%, -30%)' }} />
            )}
            <div className="flex items-start gap-3">
              <div
                className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: isGuest ? 'var(--surface-2)' : 'rgba(5,150,105,0.12)' }}
              >
                <ShieldCheck className={`h-5 w-5 ${isGuest ? 'text-[var(--foreground-tertiary)]' : 'text-[var(--success)]'}`} />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--foreground)]">
                  {isGuest ? 'Guest Access' : 'Google Verified'}
                </p>
                <p className="text-xs text-[var(--foreground-tertiary)] mt-0.5 leading-relaxed">
                  {isGuest
                    ? 'Sign in with Google for a permanent account.'
                    : 'Your identity is secured via Google OAuth.'}
                </p>
              </div>
            </div>
            {isGuest && (
              <Button
                size="sm"
                className="w-full mt-4 rounded-2xl"
                onClick={() => { window.location.href = `${API_URL}/auth/google`; }}
              >
                Upgrade to Google Sign-In
              </Button>
            )}
          </div>
        </div>

        {/* ── Right: forms ── */}
        <div className="md:col-span-2 space-y-5">
          {/* Public profile form */}
          <div
            className="rounded-3xl overflow-hidden"
            style={{ background: 'var(--surface-0)', border: '1px solid var(--border)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
          >
            <div className="px-6 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid var(--border-light)' }}>
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center"
                style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}
              >
                <Pencil className="h-4 w-4 text-[var(--primary)]" />
              </div>
              <div>
                <p className="font-bold text-[var(--foreground)] text-sm">Public Profile</p>
                <p className="text-xs text-[var(--foreground-tertiary)]">Shared with studios when you book.</p>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={handleUpdate} className="space-y-5">
                <Input
                  label="Display Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                {!isGuest && (
                  <Input
                    label="Email Address"
                    value={profile?.email ?? ''}
                    disabled
                    helperText="Your login email cannot be changed for security."
                  />
                )}
                <div className="pt-2">
                  <Button
                    type="submit"
                    isLoading={saving}
                    leftIcon={<Save className="h-4 w-4" />}
                    className="h-11 px-8 rounded-2xl shadow-lg shadow-[var(--primary)]/20 min-w-[140px]"
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* Danger zone */}
          <div
            className="rounded-3xl overflow-hidden"
            style={{
              background: 'color-mix(in srgb, var(--danger) 3%, var(--surface-0))',
              border: '1px solid color-mix(in srgb, var(--danger) 15%, transparent)',
            }}
          >
            <div className="px-6 py-5 flex items-center gap-3" style={{ borderBottom: '1px solid color-mix(in srgb, var(--danger) 12%, transparent)' }}>
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center"
                style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)' }}
              >
                <AlertTriangle className="h-4 w-4 text-[var(--danger)]" />
              </div>
              <div>
                <p className="font-bold text-[var(--danger)] text-sm">Danger Zone</p>
                <p className="text-xs text-[var(--foreground-tertiary)]">Irreversible and destructive actions.</p>
              </div>
            </div>
            <div className="p-6">
              <p className="text-sm text-[var(--foreground-secondary)] leading-relaxed">
                Account deletion requests are processed manually to verify ownership. Please email{' '}
                <span className="font-semibold text-[var(--foreground)]">support@yourstudio.com</span>{' '}
                from your registered address.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
