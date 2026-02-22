'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Select } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { adminApi } from '@/lib/api';
import { ArrowLeft, Building2, User, Palette } from 'lucide-react';
import Link from 'next/link';

export default function CreateStudioPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    studioName: '',
    slug: '',
    studioEmail: '',
    studioPhone: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    subscriptionTier: 'STARTER',
    defaultTerms: '',
    // Branding
    primaryColor: '#6366f1',
    accentColor: '#8b5cf6',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'studioName' && !prev.slug) {
        next.slug = generateSlug(value);
      }
      return next;
    });
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.studioName.trim()) newErrors.studioName = 'Studio name is required';
    if (!formData.slug.trim()) newErrors.slug = 'Slug is required';
    else if (!/^[a-z0-9-]+$/.test(formData.slug)) newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
    if (!formData.studioEmail.trim()) newErrors.studioEmail = 'Studio email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.studioEmail)) newErrors.studioEmail = 'Invalid email format';
    if (!formData.studioPhone.trim()) newErrors.studioPhone = 'Studio phone is required';
    if (!formData.ownerName.trim()) newErrors.ownerName = 'Owner name is required';
    if (!formData.ownerEmail.trim()) newErrors.ownerEmail = 'Owner email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ownerEmail)) newErrors.ownerEmail = 'Invalid email format';
    if (!formData.ownerPassword.trim()) newErrors.ownerPassword = 'Password is required';
    else if (formData.ownerPassword.length < 8) newErrors.ownerPassword = 'Password must be at least 8 characters';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);
    try {
      await adminApi.createStudio({
        studioName: formData.studioName,
        slug: formData.slug,
        studioEmail: formData.studioEmail,
        studioPhone: formData.studioPhone,
        ownerName: formData.ownerName,
        ownerEmail: formData.ownerEmail,
        ownerPassword: formData.ownerPassword,
        subscriptionTier: formData.subscriptionTier,
        defaultTerms: formData.defaultTerms || undefined,
        brandingConfig: {
          primaryColor: formData.primaryColor,
          accentColor: formData.accentColor,
        },
      });

      addToast('success', `Studio "${formData.studioName}" created successfully!`);

      router.push('/admin/studios');
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to create studio';
      addToast('error', message);

      if (message.includes('slug')) {
        setErrors((prev) => ({ ...prev, slug: message }));
      }
      if (message.includes('email')) {
        setErrors((prev) => ({ ...prev, ownerEmail: message }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back link */}
      <Link
        href="/admin/studios"
        className="inline-flex items-center gap-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Studios
      </Link>

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Create New Studio</h1>
        <p className="mt-1 text-sm text-[var(--foreground-secondary)]">
          Set up a new photography studio with an owner account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Studio Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-[var(--foreground-secondary)]" />
              Studio Details
            </CardTitle>
            <CardDescription>Basic information about the studio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Studio Name"
                value={formData.studioName}
                onChange={(e) => handleChange('studioName', e.target.value)}
                error={errors.studioName}
                placeholder="e.g. Lens & Light Photography"
                required
              />
              <Input
                label="URL Slug"
                value={formData.slug}
                onChange={(e) => handleChange('slug', e.target.value)}
                error={errors.slug}
                placeholder="e.g. lens-and-light"
                helperText={formData.slug ? `Public URL: /studio/${formData.slug}` : undefined}
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Studio Email"
                type="email"
                value={formData.studioEmail}
                onChange={(e) => handleChange('studioEmail', e.target.value)}
                error={errors.studioEmail}
                placeholder="contact@studio.com"
                required
              />
              <Input
                label="Studio Phone"
                value={formData.studioPhone}
                onChange={(e) => handleChange('studioPhone', e.target.value)}
                error={errors.studioPhone}
                placeholder="+1 (555) 123-4567"
                required
              />
            </div>
            <Select
              label="Subscription Tier"
              value={formData.subscriptionTier}
              onChange={(e) => handleChange('subscriptionTier', e.target.value)}
              options={[
                { value: 'STARTER', label: 'Starter (Free trial)' },
                { value: 'PROFESSIONAL', label: 'Professional' },
                { value: 'STUDIO', label: 'Studio' },
                { value: 'ENTERPRISE', label: 'Enterprise' },
              ]}
            />
          </CardContent>
        </Card>

        {/* Owner Account */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-5 w-5 text-[var(--foreground-secondary)]" />
              Owner Account
            </CardTitle>
            <CardDescription>The studio owner will use these credentials to log in</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Owner Name"
              value={formData.ownerName}
              onChange={(e) => handleChange('ownerName', e.target.value)}
              error={errors.ownerName}
              placeholder="John Smith"
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Owner Email"
                type="email"
                value={formData.ownerEmail}
                onChange={(e) => handleChange('ownerEmail', e.target.value)}
                error={errors.ownerEmail}
                placeholder="owner@studio.com"
                required
              />
              <Input
                label="Password"
                type="password"
                value={formData.ownerPassword}
                onChange={(e) => handleChange('ownerPassword', e.target.value)}
                error={errors.ownerPassword}
                placeholder="Min 8 characters"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-5 w-5 text-[var(--foreground-secondary)]" />
              Branding (Optional)
            </CardTitle>
            <CardDescription>Initial branding settings - the owner can customize later</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[var(--foreground)]">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                    className="h-10 w-16 rounded-[var(--radius-md)] border border-[var(--border)] cursor-pointer"
                  />
                  <Input
                    value={formData.primaryColor}
                    onChange={(e) => handleChange('primaryColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[var(--foreground)]">Accent Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.accentColor}
                    onChange={(e) => handleChange('accentColor', e.target.value)}
                    className="h-10 w-16 rounded-[var(--radius-md)] border border-[var(--border)] cursor-pointer"
                  />
                  <Input
                    value={formData.accentColor}
                    onChange={(e) => handleChange('accentColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <Textarea
              label="Default Terms & Conditions"
              value={formData.defaultTerms}
              onChange={(e) => handleChange('defaultTerms', e.target.value)}
              placeholder="Enter the default terms and conditions for booking contracts..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => router.push('/admin/studios')}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            Create Studio
          </Button>
        </div>
      </form>
    </div>
  );
}
