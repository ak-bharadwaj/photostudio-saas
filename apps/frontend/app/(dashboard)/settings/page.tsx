'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { studiosApi, authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Save, Building2, User, Sparkles, Lock, Wand2, Copy, ExternalLink, CheckCircle2, AlertCircle, Globe } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';

interface Studio {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  website?: string;
  description?: string;
  logoUrl?: string;
  status: string;
  subscriptionTier: string;
  subscriptionExpiresAt?: string;
}

// ─── Profile form state ───────────────────────────────────────────────────────
interface ProfileForm {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  website: string;
  description: string;
  slug: string;
}

// ─── Branding form state ──────────────────────────────────────────────────────
interface BrandingForm {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  heroStyle: string;
  cardTheme: string;
  buttonShape: string;
  headerText: string;
  tagline: string;
}

export default function SettingsPage() {
  const [studio, setStudio] = useState<Studio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [slugCopied, setSlugCopied] = useState(false);
  const [slugChanged, setSlugChanged] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const { addToast } = useToast();
  const { user } = useAuthStore();
  const abortRef = useRef<AbortController | null>(null);

  const [profileForm, setProfileForm] = useState<ProfileForm>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    website: '',
    description: '',
    slug: '',
  });

  const [brandingForm, setBrandingForm] = useState<BrandingForm>({
    primaryColor: '#1a73e8',
    secondaryColor: '#5f6368',
    accentColor: '#7c3aed',
    fontFamily: 'Inter',
    heroStyle: 'solid',
    cardTheme: 'modern',
    buttonShape: 'rounded',
    headerText: '',
    tagline: '',
  });

  // ─── 10 Preset Themes ──────────────────────────────────────────────────────
  const PRESET_THEMES = [
    { name: 'Royal Violet',   primaryColor: '#7c3aed', accentColor: '#db2777', heroStyle: 'mesh',  cardTheme: 'elevated', buttonShape: 'pill',          fontFamily: 'Plus Jakarta Sans' },
    { name: 'Midnight Ink',   primaryColor: '#1e1b4b', accentColor: '#6366f1', heroStyle: 'solid', cardTheme: 'modern',   buttonShape: 'rounded',       fontFamily: 'Outfit' },
    { name: 'Rose Gold',      primaryColor: '#be185d', accentColor: '#f59e0b', heroStyle: 'mesh',  cardTheme: 'classic',  buttonShape: 'pill',          fontFamily: 'Playfair Display' },
    { name: 'Forest Luxury',  primaryColor: '#065f46', accentColor: '#10b981', heroStyle: 'solid', cardTheme: 'elevated', buttonShape: 'rounded',       fontFamily: 'Raleway' },
    { name: 'Ocean Deep',     primaryColor: '#0c4a6e', accentColor: '#0ea5e9', heroStyle: 'glass', cardTheme: 'modern',   buttonShape: 'pill',          fontFamily: 'Montserrat' },
    { name: 'Burnt Ember',    primaryColor: '#92400e', accentColor: '#f97316', heroStyle: 'mesh',  cardTheme: 'classic',  buttonShape: 'luxury-sharp',  fontFamily: 'Lora' },
    { name: 'Blush Studio',   primaryColor: '#9d174d', accentColor: '#f9a8d4', heroStyle: 'glass', cardTheme: 'elevated', buttonShape: 'pill',          fontFamily: 'Poppins' },
    { name: 'Slate & Lime',   primaryColor: '#1e293b', accentColor: '#84cc16', heroStyle: 'solid', cardTheme: 'modern',   buttonShape: 'luxury-sharp',  fontFamily: 'Inter' },
    { name: 'Cobalt & Gold',  primaryColor: '#1d4ed8', accentColor: '#eab308', heroStyle: 'mesh',  cardTheme: 'elevated', buttonShape: 'rounded',       fontFamily: 'Outfit' },
    { name: 'Noir Minimal',   primaryColor: '#18181b', accentColor: '#e4e4e7', heroStyle: 'solid', cardTheme: 'classic',  buttonShape: 'luxury-sharp',  fontFamily: 'Plus Jakarta Sans' },
  ] as const;

  const applyPreset = (theme: typeof PRESET_THEMES[number]) => {
    setBrandingForm(prev => ({
      ...prev,
      primaryColor: theme.primaryColor,
      accentColor:  theme.accentColor,
      heroStyle:    theme.heroStyle,
      cardTheme:    theme.cardTheme,
      buttonShape:  theme.buttonShape,
      fontFamily:   theme.fontFamily,
    }));
  };

  const loadStudio = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      setIsLoading(true);
      const response = await authApi.me();
      if (ctrl.signal.aborted) return;
      const userData = response.data.user;

      if (userData.studioId) {
        const studioResponse = await studiosApi.getOne(userData.studioId);
        const studioData = studioResponse.data;
        setStudio(studioData);

        setProfileForm({
          name: studioData.name || '',
          email: studioData.email || '',
          phone: studioData.phone || '',
          address: studioData.address || '',
          city: studioData.city || '',
          state: studioData.state || '',
          zipCode: studioData.zipCode || '',
          website: studioData.website || '',
          description: studioData.description || '',
          slug: studioData.slug || '',
        });
        setSlugChanged(false);

        setBrandingForm({
          primaryColor: studioData.brandingConfig?.primaryColor || '#1a73e8',
          secondaryColor: studioData.brandingConfig?.secondaryColor || '#5f6368',
          accentColor: studioData.brandingConfig?.accentColor || '#7c3aed',
          fontFamily: studioData.brandingConfig?.fontFamily || 'Inter',
          heroStyle: studioData.brandingConfig?.heroStyle || 'solid',
          cardTheme: studioData.brandingConfig?.cardTheme || 'modern',
          buttonShape: studioData.brandingConfig?.buttonShape || 'rounded',
          headerText: studioData.brandingConfig?.headerText || '',
          tagline: studioData.brandingConfig?.tagline || '',
        });
      }
    } catch (error) {
      if ((error as { name?: string }).name === 'CanceledError') return;
      addToast('error', 'Failed to load studio settings');
    } finally {
      if (!abortRef.current?.signal.aborted) setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadStudio();
    return () => abortRef.current?.abort();
  }, [loadStudio]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileForm((prev) => ({ ...prev, [name]: value }));
  };

  // ─── Save studio identity only ──────────────────────────────────────────────
  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studio) {
      addToast('error', 'Studio not found');
      return;
    }

    if (!profileForm.name.trim()) {
      addToast('error', 'Studio name is required');
      return;
    }

    if (!profileForm.email.trim()) {
      addToast('error', 'Email is required');
      return;
    }

    if (profileForm.slug.length < 3) {
      addToast('error', 'Studio slug must be at least 3 characters');
      return;
    }

    if (profileForm.slug.length > 50) {
      addToast('error', 'Studio slug must be 50 characters or fewer');
      return;
    }

    try {
      setIsSavingProfile(true);

      const slugDidChange = profileForm.slug !== studio.slug;

      await studiosApi.update(studio.id, {
        name: profileForm.name,
        email: profileForm.email,
        phone: profileForm.phone,
        address: profileForm.address,
        city: profileForm.city,
        state: profileForm.state,
        zipCode: profileForm.zipCode,
        website: profileForm.website,
        description: profileForm.description,
        slug: profileForm.slug,
      });

      await loadStudio();
      addToast('success', 'Studio profile saved successfully');
      if (slugDidChange) {
        addToast('warning', 'Booking URL changed — old links and QR codes are now invalid.');
      }
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      addToast('error', error.response?.data?.message || 'Failed to save studio profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // ─── Save branding config only ──────────────────────────────────────────────
  const handleBrandingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studio) {
      addToast('error', 'Studio not found');
      return;
    }

    try {
      setIsSavingBranding(true);

      await studiosApi.update(studio.id, {
        brandingConfig: {
          primaryColor: brandingForm.primaryColor,
          secondaryColor: brandingForm.secondaryColor,
          accentColor: brandingForm.accentColor,
          fontFamily: brandingForm.fontFamily,
          heroStyle: brandingForm.heroStyle,
          cardTheme: brandingForm.cardTheme,
          buttonShape: brandingForm.buttonShape,
          headerText: brandingForm.headerText,
          tagline: brandingForm.tagline,
        },
      });

      addToast('success', 'Branding configuration saved successfully');
      await loadStudio();
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      addToast('error', error.response?.data?.message || 'Failed to save branding configuration');
    } finally {
      setIsSavingBranding(false);
    }
  };

  // ─── Change Password ────────────────────────────────────────────────────────
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      addToast('error', 'Please fill in all password fields');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      addToast('error', 'New password must be at least 8 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      addToast('error', 'New passwords do not match');
      return;
    }
    try {
      setIsSavingPassword(true);
      await authApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      addToast('success', 'Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const error = err as { response?: { data?: { message?: string } } };
      addToast('error', error.response?.data?.message || 'Failed to change password');
    } finally {
      setIsSavingPassword(false);
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

  if (!studio) {
    return (
      <div className="text-center py-12">
        <Building2 className="mx-auto h-12 w-12 text-[var(--foreground-tertiary)]" />
        <h3 className="mt-2 text-sm font-semibold text-[var(--foreground)]">Studio not found</h3>
        <p className="mt-1 text-sm text-[var(--foreground-secondary)]">Unable to load studio settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl page-enter pb-12">
      <PageHeader
        eyebrow="Configuration"
        title="Studio Settings"
        subtitle="Manage your studio profile and premium preferences."
        accentColor="violet"
      />

      {/* Subscription Info */}
      <Card className="overflow-hidden border-l-4 border-l-[var(--primary)]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center text-lg">
            <Building2 className="mr-2 h-5 w-5 text-[var(--primary)]" />
            Active Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
              <p className="text-xs font-black text-[var(--foreground-tertiary)] uppercase tracking-widest">Current Plan</p>
              <p className="mt-1 text-xl font-bold text-[var(--foreground)] capitalize">
                {studio.subscriptionTier.toLowerCase().replace('_', ' ')}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
              <p className="text-xs font-black text-[var(--foreground-tertiary)] uppercase tracking-widest">Status</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-2.5 w-2.5 rounded-full bg-[var(--success)] animate-pulse" />
                <p className="text-xl font-bold text-[var(--success)] capitalize">
                  {studio.status.toLowerCase()}
                </p>
              </div>
            </div>
            {studio.subscriptionExpiresAt && (
              <div className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
                <p className="text-xs font-black text-[var(--foreground-tertiary)] uppercase tracking-widest">Next Renewal</p>
                <p className="mt-1 text-xl font-bold text-[var(--foreground)]">
                  {new Date(studio.subscriptionExpiresAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Studio Profile Form — saves identity fields only */}
      <form onSubmit={handleProfileSubmit}>
        <Card className="shadow-[var(--shadow-xl)]">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5 text-[var(--primary)]" />
              Studio Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Studio Name"
                id="name"
                name="name"
                type="text"
                value={profileForm.name}
                onChange={handleProfileChange}
                required
                placeholder="The Lens & Light Studio"
              />

              <div className="space-y-2">
                <label htmlFor="slug" className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                  <Globe className="h-4 w-4 text-[var(--primary)]" />
                  Public Booking URL
                </label>

                {/* URL builder row */}
                <div className="flex items-stretch rounded-2xl overflow-hidden border border-[var(--border)] focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[var(--primary)]/20 transition-all bg-[var(--surface-0)]">
                  <span className="flex items-center px-4 bg-[var(--surface-1)] border-r border-[var(--border)] text-[var(--foreground-tertiary)] text-sm font-mono whitespace-nowrap select-none">
                    /studio/
                  </span>
                  <input
                    id="slug"
                    type="text"
                    value={profileForm.slug}
                    onChange={(e) => {
                      const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 50);
                      setProfileForm(prev => ({ ...prev, slug: value }));
                      setSlugChanged(value !== (studio?.slug || ''));
                    }}
                    className="flex-1 bg-transparent px-4 py-3 text-sm font-mono text-[var(--foreground)] outline-none placeholder:text-[var(--foreground-tertiary)]"
                    placeholder="my-awesome-studio"
                    spellCheck={false}
                    autoComplete="off"
                  />
                  {/* Character counter */}
                  <span className={`flex items-center pr-3 text-xs font-mono tabular-nums shrink-0 ${profileForm.slug.length > 45 ? 'text-amber-500' : 'text-[var(--foreground-tertiary)]'}`}>
                    {profileForm.slug.length}/50
                  </span>
                </div>

                {/* Live URL preview card */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-0)] p-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                    <Globe className="h-4 w-4 text-[var(--primary)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--foreground-tertiary)] mb-0.5">Your public booking link</p>
                    <p className="text-xs font-mono text-[var(--foreground)] truncate">
                      <span className="text-[var(--foreground-tertiary)]">{typeof window !== 'undefined' ? window.location.origin : ''}</span>
                      <span className="text-[var(--primary)] font-bold">/studio/{profileForm.slug || '…'}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      title="Copy link"
                      disabled={!profileForm.slug}
                      onClick={() => {
                        const url = `${window.location.origin}/studio/${profileForm.slug}`;
                        navigator.clipboard.writeText(url);
                        setSlugCopied(true);
                        setTimeout(() => setSlugCopied(false), 2000);
                      }}
                      className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-[var(--surface-1)] transition-colors text-[var(--foreground-tertiary)] hover:text-[var(--foreground)] disabled:opacity-40"
                    >
                      {slugCopied ? <CheckCircle2 className="h-4 w-4 text-[var(--success)]" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <a
                      href={profileForm.slug ? `/studio/${profileForm.slug}` : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open public page"
                      onClick={(e) => { if (!profileForm.slug) e.preventDefault(); }}
                      className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-[var(--surface-1)] transition-colors text-[var(--foreground-tertiary)] hover:text-[var(--primary)]"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>

                {/* Validation hint */}
                {profileForm.slug.length > 0 && profileForm.slug.length < 3 && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                    <p className="text-xs text-red-500 font-medium">Minimum 3 characters required</p>
                  </div>
                )}

                {/* Status strip */}
                {slugChanged ? (
                  <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2.5">
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-500">URL will change on save</p>
                      <p className="text-[10px] text-amber-500/80 mt-0.5">All existing shared links, QR codes, and bookmarks will stop working.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-[var(--success)]/10 border border-[var(--success)]/20 px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-[var(--success)] shrink-0" />
                    <p className="text-xs text-[var(--success)] font-medium">Active — this URL is live</p>
                  </div>
                )}
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-[var(--border)]/50">
              <Input
                label="Public Business Email"
                id="email"
                name="email"
                type="email"
                value={profileForm.email}
                onChange={handleProfileChange}
                required
                placeholder="contact@studio.com"
              />

              <Input
                label="Business Phone"
                id="phone"
                name="phone"
                type="tel"
                value={profileForm.phone}
                onChange={handleProfileChange}
                placeholder="+91 98765 43210"
              />
            </div>

            {/* Address Information */}
            <div className="pt-6 border-t border-[var(--border)]/50 space-y-6">
              <Input
                label="Physical Address / Studio Location"
                id="address"
                name="address"
                type="text"
                value={profileForm.address}
                onChange={handleProfileChange}
                placeholder="123 Creative Way, Art District"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input
                  label="City"
                  id="city"
                  name="city"
                  type="text"
                  value={profileForm.city}
                  onChange={handleProfileChange}
                  placeholder="Mumbai"
                />

                <Input
                  label="State / Province"
                  id="state"
                  name="state"
                  type="text"
                  value={profileForm.state}
                  onChange={handleProfileChange}
                  placeholder="Maharashtra"
                />

                <Input
                  label="ZIP / Postal Code"
                  id="zipCode"
                  name="zipCode"
                  type="text"
                  value={profileForm.zipCode}
                  onChange={handleProfileChange}
                  placeholder="400001"
                />
              </div>
            </div>

            {/* Website & Description */}
            <div className="pt-6 border-t border-[var(--border)]/50 space-y-6">
              <Input
                label="Portfolio Website"
                id="website"
                name="website"
                type="url"
                placeholder="https://yourportfolio.com"
                value={profileForm.website}
                onChange={handleProfileChange}
              />

              <Textarea
                id="description"
                name="description"
                label="Studio Story / About"
                rows={4}
                placeholder="Tell customers about your unique photography style, experience, and what makes your studio special..."
                value={profileForm.description}
                onChange={handleProfileChange}
              />
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-6 border-t border-[var(--border)]">
              <Button type="submit" disabled={isSavingProfile} className="h-11 px-8 shadow-lg shadow-[var(--primary)]/20">
                <Save className="mr-2 h-4 w-4" />
                {isSavingProfile ? 'Synchronizing...' : 'Save Identity Updates'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Luxury Branding Suite — saves branding config only */}
      <form onSubmit={handleBrandingSubmit}>
        <Card className="border-2 border-[var(--primary)]/10 shadow-[var(--shadow-xl)] overflow-hidden">
          <div className="h-2 bg-[var(--primary)] w-full" />
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-[var(--primary)]" />
              </div>
              <CardTitle className="text-xl">Luxury Experience Branding</CardTitle>
            </div>
            <p className="text-sm text-[var(--foreground-secondary)] font-medium mt-1">Configure your public-facing booking portal to match your elite brand.</p>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* ── Preset Theme Picker ────────────────────────────────────── */}
            <div className="p-5 rounded-2xl bg-[var(--surface-0)] border border-[var(--border)]">
              <div className="flex items-center gap-2 mb-4">
                <Wand2 className="h-4 w-4 text-[var(--primary)]" />
                <h4 className="text-xs font-black text-[var(--foreground-tertiary)] uppercase tracking-widest">Instant Theme Presets</h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {PRESET_THEMES.map((theme) => (
                  <button
                    key={theme.name}
                    type="button"
                    onClick={() => applyPreset(theme)}
                    className="group relative flex flex-col items-center gap-2 p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all duration-150 cursor-pointer"
                  >
                    {/* Color swatch */}
                    <div className="flex gap-1">
                      <span className="h-5 w-5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: theme.primaryColor }} />
                      <span className="h-5 w-5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: theme.accentColor }} />
                    </div>
                    <span className="text-[10px] font-bold text-[var(--foreground-secondary)] group-hover:text-[var(--primary)] text-center leading-tight">{theme.name}</span>
                    {/* Active indicator */}
                    {brandingForm.primaryColor === theme.primaryColor && brandingForm.accentColor === theme.accentColor && (
                      <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[var(--primary)]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Styles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4 p-5 rounded-2xl bg-[var(--surface-0)] border border-[var(--border)] shadow-sm">
                <h4 className="text-xs font-black text-[var(--foreground-tertiary)] uppercase tracking-widest">Atmosphere</h4>
                <div className="space-y-4">
                  <Select
                    label="Hero Visuals"
                    name="heroStyle"
                    value={brandingForm.heroStyle}
                    onChange={(e) => setBrandingForm(prev => ({ ...prev, heroStyle: e.target.value }))}
                    options={[
                      { value: 'solid', label: 'Solid Color (Classic)' },
                      { value: 'mesh', label: 'Mesh Gradient (Modern)' },
                      { value: 'glass', label: 'Glossy Glass (Premium)' },
                    ]}
                  />
                  <Select
                    label="UI Theme"
                    name="cardTheme"
                    value={brandingForm.cardTheme}
                    onChange={(e) => setBrandingForm(prev => ({ ...prev, cardTheme: e.target.value }))}
                    options={[
                      { value: 'modern', label: 'Modern Minimal' },
                      { value: 'classic', label: 'Timeless Border' },
                      { value: 'elevated', label: 'High-Shadow Glass' },
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-4 p-5 rounded-2xl bg-[var(--surface-0)] border border-[var(--border)] shadow-sm">
                <h4 className="text-xs font-black text-[var(--foreground-tertiary)] uppercase tracking-widest">Geometry</h4>
                <Select
                  label="Interactive Elements"
                  name="buttonShape"
                  value={brandingForm.buttonShape}
                  onChange={(e) => setBrandingForm(prev => ({ ...prev, buttonShape: e.target.value }))}
                  options={[
                    { value: 'rounded', label: 'Standard Rounded' },
                    { value: 'pill', label: 'Luxury Pill' },
                    { value: 'luxury-sharp', label: 'Artistic Sharp' },
                  ]}
                />
                <Select
                  label="Typography / Font"
                  name="fontFamily"
                  value={brandingForm.fontFamily}
                  onChange={(e) => setBrandingForm(prev => ({ ...prev, fontFamily: e.target.value }))}
                 options={[
                    { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans' },
                    { value: 'Outfit', label: 'Outfit' },
                    { value: 'Inter', label: 'Inter' },
                    { value: 'DM Sans', label: 'DM Sans' },
                    { value: 'Playfair Display', label: 'Playfair Display' },
                    { value: 'Cormorant Garamond', label: 'Cormorant Garamond' },
                    { value: 'Poppins', label: 'Poppins' },
                    { value: 'Montserrat', label: 'Montserrat' },
                    { value: 'Lora', label: 'Lora' },
                    { value: 'Raleway', label: 'Raleway' },
                    { value: 'Nunito', label: 'Nunito' },
                    { value: 'Josefin Sans', label: 'Josefin Sans' },
                    { value: 'Roboto', label: 'Roboto' },
                    { value: 'Open Sans', label: 'Open Sans' },
                  ]}
                />
              </div>

              <div className="space-y-4 p-5 rounded-2xl bg-[var(--surface-0)] border border-[var(--border)] shadow-sm">
                <h4 className="text-xs font-black text-[var(--foreground-tertiary)] uppercase tracking-widest">Color Palette</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground-secondary)] mb-2 uppercase">Primary Signature</label>
                    <div className="flex gap-3">
                      <input
                        type="color"
                        value={brandingForm.primaryColor}
                        onChange={(e) => setBrandingForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="h-10 w-12 p-0 border-0 rounded-lg cursor-pointer overflow-hidden shadow-sm"
                      />
                      <input
                        type="text"
                        value={brandingForm.primaryColor}
                        onChange={(e) => setBrandingForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="flex-1 text-xs font-mono border border-[var(--border)] bg-[var(--surface-1)] rounded-lg px-3 text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground-secondary)] mb-2 uppercase">Accent Glow</label>
                    <div className="flex gap-3">
                      <input
                        type="color"
                        value={brandingForm.accentColor}
                        onChange={(e) => setBrandingForm(prev => ({ ...prev, accentColor: e.target.value }))}
                        className="h-10 w-12 p-0 border-0 rounded-lg cursor-pointer overflow-hidden shadow-sm"
                      />
                      <input
                        type="text"
                        value={brandingForm.accentColor}
                        onChange={(e) => setBrandingForm(prev => ({ ...prev, accentColor: e.target.value }))}
                        className="flex-1 text-xs font-mono border border-[var(--border)] bg-[var(--surface-1)] rounded-lg px-3 text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Messaging */}
            <div className="pt-8 border-t border-[var(--border)]">
              <h4 className="text-xs font-black text-[var(--foreground-tertiary)] uppercase tracking-widest mb-6 px-1">Content Strategy</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Input
                  label="Portal Hero Headline"
                  placeholder="e.g. Capture Your Eternal Story"
                  value={brandingForm.headerText}
                  onChange={(e) => setBrandingForm(prev => ({ ...prev, headerText: e.target.value }))}
                  helperText="Defaults to your Studio Name if empty."
                />
                <Input
                  label="Emotional Tagline"
                  placeholder="e.g. Fine-art photography for significant moments"
                  value={brandingForm.tagline}
                  onChange={(e) => setBrandingForm(prev => ({ ...prev, tagline: e.target.value }))}
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-6 border-t border-[var(--border)]">
              <Button type="submit" disabled={isSavingBranding} className="h-11 px-8 shadow-lg shadow-[var(--primary)]/20 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]">
                <Sparkles className="mr-2 h-4 w-4" />
                {isSavingBranding ? 'Polishing Design...' : 'Apply Premium Branding'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* User Profile Section */}
      <Card className="bg-[var(--surface-1)] border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center text-[var(--foreground-secondary)]">
            <User className="mr-2 h-5 w-5" />
            Security & Ownership
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-0)]">
                <label className="text-xs font-black text-[var(--foreground-tertiary)] uppercase tracking-widest">Account Owner</label>
                <p className="mt-1 text-lg font-bold text-[var(--foreground)]">{user?.name || 'Authorized Lead'}</p>
              </div>
              <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-0)]">
                <label className="text-xs font-black text-[var(--foreground-tertiary)] uppercase tracking-widest">Verified Email</label>
                <p className="mt-1 text-lg font-bold text-[var(--foreground)]">{user?.email || 'N/A'}</p>
              </div>
              <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-0)]">
                <label className="text-xs font-black text-[var(--foreground-tertiary)] uppercase tracking-widest">Access Level</label>
                <div className="mt-1 flex items-center gap-2">
                  <div className="px-2 py-0.5 rounded bg-[var(--primary)] text-white text-[10px] font-bold uppercase tracking-tighter"> {user?.role || 'STUDIO_OWNER'} </div>
                  <p className="text-lg font-bold text-[var(--foreground)] capitalize">Administrator</p>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-[var(--border)] flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-[var(--info-light)] flex items-center justify-center">
                <Building2 className="h-4 w-4 text-[var(--info)]" />
              </div>
              <p className="text-xs text-[var(--foreground-secondary)] font-medium max-w-2xl">
                Identity protection enabled. To modify ownership email or transfer your premium studio, please open a support ticket with our elite concierge team.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <form onSubmit={handlePasswordSubmit}>
        <Card className="shadow-[var(--shadow-xl)]">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="mr-2 h-5 w-5 text-[var(--primary)]" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input
                label="Current Password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                placeholder="Enter current password"
                autoComplete="current-password"
              />
              <Input
                label="New Password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Min 8 characters"
                autoComplete="new-password"
              />
              <Input
                label="Confirm New Password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Repeat new password"
                autoComplete="new-password"
              />
            </div>
            <div className="flex justify-end pt-2 border-t border-[var(--border)]">
              <Button type="submit" disabled={isSavingPassword} className="h-11 px-8">
                <Lock className="mr-2 h-4 w-4" />
                {isSavingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
