'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingPage } from '@/components/ui/loading';
import { useToast } from '@/components/ui/toast';
import { studiosApi, authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Save, Building2, User, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  logo?: string;
  status: string;
  subscriptionTier: string;
  subscriptionExpiresAt?: string;
}

export default function SettingsPage() {
  const [studio, setStudio] = useState<Studio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToast();
  const { user } = useAuthStore();

  // Form state
  const [formData, setFormData] = useState({
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
    // Branding
    primaryColor: '#1a73e8',
    secondaryColor: '#5f6368',
    accentColor: '#7c3aed',
    heroStyle: 'solid',
    cardTheme: 'modern',
    buttonShape: 'rounded',
    headerText: '',
    tagline: '',
  });

  const loadStudio = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await authApi.me();
      const userData = response.data.user;

      if (userData.studioId) {
        const studioResponse = await studiosApi.getOne(userData.studioId);
        const studioData = studioResponse.data;
        setStudio(studioData);

        // Populate form
        setFormData({
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
          // Branding
          primaryColor: studioData.brandingConfig?.primaryColor || '#1a73e8',
          secondaryColor: studioData.brandingConfig?.secondaryColor || '#5f6368',
          accentColor: studioData.brandingConfig?.accentColor || '#7c3aed',
          heroStyle: studioData.brandingConfig?.heroStyle || 'solid',
          cardTheme: studioData.brandingConfig?.cardTheme || 'modern',
          buttonShape: studioData.brandingConfig?.buttonShape || 'rounded',
          headerText: studioData.brandingConfig?.headerText || '',
          tagline: studioData.brandingConfig?.tagline || '',
        });
      }
    } catch (error) {
      console.error('Failed to load studio:', error);
      addToast('error', 'Failed to load studio settings');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadStudio();
  }, [loadStudio]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!studio) {
      addToast('error', 'Studio not found');
      return;
    }

    // Basic validation
    if (!formData.name.trim()) {
      addToast('error', 'Studio name is required');
      return;
    }

    if (!formData.email.trim()) {
      addToast('error', 'Email is required');
      return;
    }

    try {
      setIsSaving(true);

      const updateData = {
        ...formData,
        brandingConfig: {
          primaryColor: formData.primaryColor,
          secondaryColor: formData.secondaryColor,
          accentColor: formData.accentColor,
          heroStyle: formData.heroStyle,
          cardTheme: formData.cardTheme,
          buttonShape: formData.buttonShape,
          headerText: formData.headerText,
          tagline: formData.tagline,
        }
      };

      await studiosApi.update(studio.id, updateData);
      addToast('success', 'Settings saved successfully');
      if (formData.slug !== studio.slug) {
        addToast('warning', 'Studio URL has changed. Old links are now invalid.');
      }
      loadStudio(); // Reload to get updated data
    } catch (e) {
      const error = e as { response?: { data?: { message?: string } } };
      console.error('Failed to save settings:', error);
      addToast('error', error.response?.data?.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingPage />;
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[var(--foreground)] tracking-tight italic uppercase">
            STUDIO SETTINGS
          </h1>
          <p className="mt-1 text-[var(--foreground-secondary)] font-medium">Manage your studio profile and premium preferences</p>
        </div>
      </div>

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
              <label className="text-xs font-black text-[var(--foreground-tertiary)] uppercase tracking-widest">Current Plan</label>
              <p className="mt-1 text-xl font-bold text-[var(--foreground)] capitalize">
                {studio.subscriptionTier.toLowerCase().replace('_', ' ')}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
              <label className="text-xs font-black text-[var(--foreground-tertiary)] uppercase tracking-widest">Status</label>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-2.5 w-2.5 rounded-full bg-[var(--success)] animate-pulse" />
                <p className="text-xl font-bold text-[var(--success)] capitalize">
                  {studio.status.toLowerCase()}
                </p>
              </div>
            </div>
            {studio.subscriptionExpiresAt && (
              <div className="p-4 rounded-xl bg-[var(--surface-1)] border border-[var(--border)]">
                <label className="text-xs font-black text-[var(--foreground-tertiary)] uppercase tracking-widest">Next Renewal</label>
                <p className="mt-1 text-xl font-bold text-[var(--foreground)]">
                  {new Date(studio.subscriptionExpiresAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Studio Profile Form */}
      <form onSubmit={handleSubmit}>
        <Card className="shadow-premium">
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
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="The Lens & Light Studio"
              />

              <div className="space-y-1.5">
                <label htmlFor="slug" className="block text-sm font-medium text-[var(--foreground)]">
                  Studio Slug (URL Identity)
                </label>
                <div className="flex items-center">
                  <span className="inline-flex items-center px-4 py-2 rounded-l-xl border border-r-0 border-[var(--border)] bg-[var(--surface-1)] text-[var(--foreground-tertiary)] text-sm font-medium">
                    /studio/
                  </span>
                  <Input
                    id="slug"
                    name="slug"
                    type="text"
                    value={formData.slug}
                    onChange={(e) => {
                      const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                      setFormData(prev => ({ ...prev, slug: value }));
                    }}
                    className="rounded-l-none"
                    placeholder="my-awesome-studio"
                  />
                </div>
                <div className="bg-[var(--warning-light)]/30 border border-[var(--warning)]/20 p-3 rounded-lg mt-2">
                  <p className="text-xs text-[var(--warning)] font-bold flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    RELIABILITY WARNING
                  </p>
                  <p className="text-[10px] text-[var(--warning)] opacity-80 mt-0.5">
                    Changing this slug will invalidate all existing shared links and QR codes instantly.
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-[var(--border)]/50">
              <Input
                label="Public Business Email"
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="contact@studio.com"
              />

              <Input
                label="Business Phone"
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1 (555) 000-0000"
              />
            </div>

            {/* Address Information */}
            <div className="pt-6 border-t border-[var(--border)]/50 space-y-6">
              <Input
                label="Physical Address / Studio Location"
                id="address"
                name="address"
                type="text"
                value={formData.address}
                onChange={handleChange}
                placeholder="123 Creative Way, Art District"
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input
                  label="City"
                  id="city"
                  name="city"
                  type="text"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="New York"
                />

                <Input
                  label="State / Province"
                  id="state"
                  name="state"
                  type="text"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="NY"
                />

                <Input
                  label="ZIP / Postal Code"
                  id="zipCode"
                  name="zipCode"
                  type="text"
                  value={formData.zipCode}
                  onChange={handleChange}
                  placeholder="10001"
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
                value={formData.website}
                onChange={handleChange}
              />

              <div className="space-y-1.5">
                <label htmlFor="description" className="block text-sm font-medium text-[var(--foreground)]">
                  Studio Story / About
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={4}
                  className={cn(
                    "flex w-full rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-3 text-sm text-[var(--foreground)]",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all",
                    "placeholder:text-[var(--foreground-tertiary)]"
                  )}
                  placeholder="Tell customers about your unique photography style, experience, and what makes your studio special..."
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-6 border-t border-[var(--border)]">
              <Button type="submit" disabled={isSaving} className="h-11 px-8 shadow-lg shadow-[var(--primary)]/20">
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Synchronizing...' : 'Save Identity Updates'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Luxury Branding Suite */}
      <form onSubmit={handleSubmit}>
        <Card className="border-2 border-[var(--primary)]/10 shadow-premium overflow-hidden bg-gradient-to-br from-[var(--surface-0)] to-[var(--surface-1)]">
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
            {/* Visual Styles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4 p-5 rounded-2xl bg-[var(--surface-0)] border border-[var(--border)] shadow-sm">
                <h4 className="text-xs font-black text-[var(--foreground-tertiary)] uppercase tracking-widest">Atmosphere</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground-secondary)] mb-2 uppercase">Hero Visuals</label>
                    <select
                      name="heroStyle"
                      value={formData.heroStyle}
                      onChange={(e) => setFormData(prev => ({ ...prev, heroStyle: e.target.value }))}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                    >
                      <option value="solid">Solid Color (Classic)</option>
                      <option value="mesh">Mesh Gradient (Modern)</option>
                      <option value="glass">Glossy Glass (Premium)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground-secondary)] mb-2 uppercase">UI Theme</label>
                    <select
                      name="cardTheme"
                      value={formData.cardTheme}
                      onChange={(e) => setFormData(prev => ({ ...prev, cardTheme: e.target.value }))}
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                    >
                      <option value="modern">Modern Minimal</option>
                      <option value="classic">Timeless Border</option>
                      <option value="elevated">High-Shadow Glass</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-5 rounded-2xl bg-[var(--surface-0)] border border-[var(--border)] shadow-sm">
                <h4 className="text-xs font-black text-[var(--foreground-tertiary)] uppercase tracking-widest">Geometry</h4>
                <div>
                  <label className="block text-xs font-bold text-[var(--foreground-secondary)] mb-2 uppercase">Interactive Elements</label>
                  <select
                    name="buttonShape"
                    value={formData.buttonShape}
                    onChange={(e) => setFormData(prev => ({ ...prev, buttonShape: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--foreground)] focus:ring-2 focus:ring-[var(--primary)] outline-none"
                  >
                    <option value="rounded">Standard Rounded</option>
                    <option value="pill">Luxury Pill</option>
                    <option value="luxury-sharp">Artistic Sharp</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4 p-5 rounded-2xl bg-[var(--surface-0)] border border-[var(--border)] shadow-sm">
                <h4 className="text-xs font-black text-[var(--foreground-tertiary)] uppercase tracking-widest">Color Palette</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground-secondary)] mb-2 uppercase">Primary Signature</label>
                    <div className="flex gap-3">
                      <input
                        type="color"
                        value={formData.primaryColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="h-10 w-12 p-0 border-0 rounded-lg cursor-pointer overflow-hidden shadow-sm"
                      />
                      <input
                        type="text"
                        value={formData.primaryColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="flex-1 text-xs font-mono border border-[var(--border)] bg-[var(--surface-1)] rounded-lg px-3 text-[var(--foreground)] outline-none focus:ring-1 focus:ring-[var(--primary)]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground-secondary)] mb-2 uppercase">Accent Glow</label>
                    <div className="flex gap-3">
                      <input
                        type="color"
                        value={formData.accentColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, accentColor: e.target.value }))}
                        className="h-10 w-12 p-0 border-0 rounded-lg cursor-pointer overflow-hidden shadow-sm"
                      />
                      <input
                        type="text"
                        value={formData.accentColor}
                        onChange={(e) => setFormData(prev => ({ ...prev, accentColor: e.target.value }))}
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
                  value={formData.headerText}
                  onChange={(e) => setFormData(prev => ({ ...prev, headerText: e.target.value }))}
                  helperText="Defaults to your Studio Name if empty."
                />
                <Input
                  label="Emotional Tagline"
                  placeholder="e.g. Fine-art photography for significant moments"
                  value={formData.tagline}
                  onChange={(e) => setFormData(prev => ({ ...prev, tagline: e.target.value }))}
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-6 border-t border-[var(--border)]">
              <Button type="submit" disabled={isSaving} className="h-11 px-8 shadow-lg shadow-[var(--primary)]/20 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]">
                <Sparkles className="mr-2 h-4 w-4" />
                {isSaving ? 'Polishing Design...' : 'Apply Premium Branding'}
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
    </div>
  );
}
