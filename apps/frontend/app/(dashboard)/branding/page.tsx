'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { studiosApi, uploadApi } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { LoadingSpinner } from '@/components/ui/loading';
import { cn } from '@/lib/utils';
import {
  Palette,
  Upload,
  Eye,
  Save,
  RefreshCw,
  Camera,
  ExternalLink,
  Type,
  FileText,
  Image as ImageIcon,
  X,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface BrandingConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  headerText: string;
  tagline: string;
}

interface StudioData {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  logoUrl: string | null;
  brandingConfig: BrandingConfig | null;
  defaultTerms: string | null;
}

const DEFAULT_BRANDING: BrandingConfig = {
  primaryColor: '#1a73e8',
  secondaryColor: '#5f6368',
  accentColor: '#7c3aed',
  fontFamily: 'Inter',
  headerText: '',
  tagline: '',
};

const FONT_OPTIONS = [
  'Inter',
  'Playfair Display',
  'Roboto',
  'Open Sans',
  'Montserrat',
  'Lora',
  'Poppins',
  'Raleway',
];

/* -------------------------------------------------------------------------- */
/*  Color Picker Component                                                    */
/* -------------------------------------------------------------------------- */

function ColorPicker({
  label,
  value,
  onChange,
  description,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
  description?: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div
          className="h-10 w-10 rounded-[var(--radius-md)] border-2 border-[var(--border)] shadow-[var(--shadow-sm)] cursor-pointer transition-transform hover:scale-105"
          style={{ backgroundColor: value }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <label className="block text-sm font-medium text-[var(--foreground)]">
          {label}
        </label>
        {description && (
          <p className="text-xs text-[var(--foreground-tertiary)]">{description}</p>
        )}
      </div>
      <Input
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          if (/^#[0-9a-fA-F]{0,6}$/.test(v) || v === '') onChange(v);
        }}
        className="w-28 font-mono text-xs"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Logo Uploader Component                                                   */
/* -------------------------------------------------------------------------- */

function LogoUploader({
  logoUrl,
  onUpload,
  onRemove,
  isUploading,
}: {
  logoUrl: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  isUploading: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        onUpload(file);
      }
    },
    [onUpload],
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-[var(--foreground)]">
        Studio Logo
      </label>

      {logoUrl ? (
        <div className="relative inline-block">
          <div className="h-24 w-24 rounded-[var(--radius-lg)] border-2 border-[var(--border)] overflow-hidden bg-[var(--surface-1)] flex items-center justify-center">
            <img
              src={logoUrl}
              alt="Studio logo"
              className="h-full w-full object-contain"
            />
          </div>
          <button
            onClick={onRemove}
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[var(--danger)] text-white flex items-center justify-center shadow-[var(--shadow-md)] hover:bg-[var(--danger-hover)] transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center gap-2 p-6',
            'border-2 border-dashed border-[var(--border)] rounded-[var(--radius-lg)]',
            'bg-[var(--surface-1)] cursor-pointer',
            'hover:border-[var(--primary)] hover:bg-[var(--primary-light)]',
            'transition-all duration-[var(--transition-fast)]',
          )}
        >
          {isUploading ? (
            <LoadingSpinner />
          ) : (
            <>
              <Upload className="h-8 w-8 text-[var(--foreground-tertiary)]" />
              <p className="text-sm text-[var(--foreground-secondary)]">
                Click or drag to upload logo
              </p>
              <p className="text-xs text-[var(--foreground-tertiary)]">
                PNG, JPG, SVG. Max 2MB.
              </p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Live Preview Component                                                    */
/* -------------------------------------------------------------------------- */

function BrandPreview({
  branding,
  studioName,
  logoUrl,
}: {
  branding: BrandingConfig;
  studioName: string;
  logoUrl: string | null;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
        <Eye className="h-4 w-4" />
        Live Preview
      </div>

      <div
        className="rounded-[var(--radius-lg)] border border-[var(--border)] overflow-hidden shadow-[var(--shadow-md)]"
        style={{ fontFamily: branding.fontFamily + ', sans-serif' }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center gap-3"
          style={{ backgroundColor: branding.primaryColor }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Logo"
              className="h-10 w-10 rounded-[var(--radius-md)] object-contain bg-white/20 p-1"
            />
          ) : (
            <div className="h-10 w-10 rounded-[var(--radius-md)] bg-white/20 flex items-center justify-center">
              <Camera className="h-5 w-5 text-white" />
            </div>
          )}
          <div>
            <h3 className="text-white font-bold text-lg">
              {branding.headerText || studioName}
            </h3>
            {branding.tagline && (
              <p className="text-white/80 text-xs">{branding.tagline}</p>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="bg-white p-6 space-y-4">
          <div className="space-y-2">
            <h4
              className="text-base font-semibold"
              style={{ color: branding.primaryColor }}
            >
              Our Photography Services
            </h4>
            <p className="text-sm text-gray-500">
              Browse our occasions and book your session today.
            </p>
          </div>

          {/* Mock cards */}
          <div className="grid grid-cols-3 gap-2">
            {['Wedding', 'Portrait', 'Event'].map((name) => (
              <div
                key={name}
                className="rounded-[var(--radius-md)] border border-gray-200 p-3 text-center"
              >
                <div
                  className="h-8 w-8 rounded-full mx-auto mb-2 flex items-center justify-center"
                  style={{ backgroundColor: branding.accentColor + '20' }}
                >
                  <Camera
                    className="h-4 w-4"
                    style={{ color: branding.accentColor }}
                  />
                </div>
                <p className="text-xs font-medium text-gray-700">{name}</p>
              </div>
            ))}
          </div>

          {/* Mock button */}
          <button
            className="w-full py-2.5 rounded-[var(--radius-md)] text-white text-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: branding.primaryColor }}
          >
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Branding Page                                                        */
/* -------------------------------------------------------------------------- */

export default function BrandingPage() {
  const { user } = useAuthStore();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [studio, setStudio] = useState<StudioData | null>(null);
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [defaultTerms, setDefaultTerms] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Load studio data
  useEffect(() => {
    async function load() {
      if (!user?.studioId) return;
      try {
        setLoading(true);
        const res = await studiosApi.getOne(user.studioId);
        const s = res.data as StudioData;
        setStudio(s);
        setLogoUrl(s?.logoUrl || null);
        setDefaultTerms(s?.defaultTerms || '');
        setBranding({
          ...DEFAULT_BRANDING,
          ...(s?.brandingConfig || {}),
          headerText: s?.brandingConfig?.headerText || s?.name || '',
        });
      } catch {
        addToast('error', 'Failed to load studio data');
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.studioId]);

  // Track changes
  const updateBranding = (partial: Partial<BrandingConfig>) => {
    setBranding((prev) => ({ ...prev, ...partial }));
    setHasChanges(true);
  };

  // Logo upload
  const handleLogoUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      addToast('error', 'Logo must be under 2MB');
      return;
    }
    try {
      setUploading(true);
      const res = await uploadApi.uploadLogo(file);
      setLogoUrl(res.data.url);
      setHasChanges(true);
      addToast('success', 'Logo uploaded');
    } catch {
      addToast('error', 'Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleLogoRemove = () => {
    setLogoUrl(null);
    setHasChanges(true);
  };

  // Save all changes
  const handleSave = async () => {
    if (!studio) return;
    try {
      setSaving(true);
      await studiosApi.update(studio.id, {
        brandingConfig: branding,
        logoUrl: logoUrl || undefined,
        defaultTerms: defaultTerms || undefined,
      });
      setHasChanges(false);
      addToast('success', 'Branding saved successfully');
    } catch {
      addToast('error', 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  // Reset to saved state
  const handleReset = () => {
    if (!studio) return;
    setLogoUrl(studio.logoUrl);
    setDefaultTerms(studio.defaultTerms || '');
    setBranding({
      ...DEFAULT_BRANDING,
      ...(studio.brandingConfig || {}),
      headerText: studio.brandingConfig?.headerText || studio.name,
    });
    setHasChanges(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!studio) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-[var(--foreground-secondary)]">
          No studio found. Please contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            Studio Branding
          </h1>
          <p className="text-sm text-[var(--foreground-secondary)] mt-1">
            Customize how your studio appears to customers on your public booking page.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {studio.slug && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/studio/${studio.slug}`, '_blank')}
              rightIcon={<ExternalLink className="h-4 w-4" />}
            >
              View Public Page
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReset}
            disabled={!hasChanges}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Reset
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges}
            isLoading={saving}
            leftIcon={<Save className="h-4 w-4" />}
          >
            Save Changes
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Logo */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-[var(--primary)]" />
                <CardTitle>Logo</CardTitle>
              </div>
              <CardDescription>
                Upload your studio logo. It will appear on your public booking
                page and invoices.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LogoUploader
                logoUrl={logoUrl}
                onUpload={handleLogoUpload}
                onRemove={handleLogoRemove}
                isUploading={uploading}
              />
            </CardContent>
          </Card>

          {/* Colors */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-[var(--primary)]" />
                <CardTitle>Brand Colors</CardTitle>
              </div>
              <CardDescription>
                Set the colors for your public booking page. These colors affect
                headers, buttons, and accent elements.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <ColorPicker
                  label="Primary Color"
                  value={branding.primaryColor}
                  onChange={(c) => updateBranding({ primaryColor: c })}
                  description="Headers, buttons, and main accents"
                />
                <ColorPicker
                  label="Secondary Color"
                  value={branding.secondaryColor}
                  onChange={(c) => updateBranding({ secondaryColor: c })}
                  description="Secondary text and subtle elements"
                />
                <ColorPicker
                  label="Accent Color"
                  value={branding.accentColor}
                  onChange={(c) => updateBranding({ accentColor: c })}
                  description="Highlights and decorative elements"
                />
              </div>
            </CardContent>
          </Card>

          {/* Typography & Text */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Type className="h-5 w-5 text-[var(--primary)]" />
                <CardTitle>Typography & Text</CardTitle>
              </div>
              <CardDescription>
                Customize fonts and display text for your public page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
                    Font Family
                  </label>
                  <select
                    value={branding.fontFamily}
                    onChange={(e) =>
                      updateBranding({ fontFamily: e.target.value })
                    }
                    className={cn(
                      'flex h-10 w-full rounded-[var(--radius-md)]',
                      'border border-[var(--border)] bg-[var(--surface-0)]',
                      'px-3 py-2 text-sm text-[var(--foreground)]',
                      'focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent',
                    )}
                  >
                    {FONT_OPTIONS.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="Header Text"
                  value={branding.headerText}
                  onChange={(e) =>
                    updateBranding({ headerText: e.target.value })
                  }
                  placeholder={studio.name}
                  helperText="Displayed as the main title on your booking page. Defaults to studio name."
                />

                <Input
                  label="Tagline"
                  value={branding.tagline}
                  onChange={(e) => updateBranding({ tagline: e.target.value })}
                  placeholder="e.g. Capturing moments that last forever"
                  helperText="A short tagline shown below your studio name."
                />
              </div>
            </CardContent>
          </Card>

          {/* Terms & Conditions */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[var(--primary)]" />
                <CardTitle>Terms & Conditions</CardTitle>
              </div>
              <CardDescription>
                Set default terms and conditions that customers must agree to
                when booking. These appear on the booking confirmation step.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={defaultTerms}
                onChange={(e) => {
                  setDefaultTerms(e.target.value);
                  setHasChanges(true);
                }}
                rows={8}
                placeholder="Enter your studio's terms and conditions, cancellation policy, etc."
                helperText="Supports plain text. Customers will see a checkbox to accept these terms before confirming their booking."
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column — Preview */}
        <div className="space-y-6">
          <div className="lg:sticky lg:top-6">
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>
                  See how your public booking page will look with your branding
                  settings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BrandPreview
                  branding={branding}
                  studioName={studio.name}
                  logoUrl={logoUrl}
                />
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card className="mt-4">
              <CardContent className="pt-6">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--foreground-secondary)]">
                      Public URL
                    </span>
                    <a
                      href={`/studio/${studio.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--primary)] hover:underline font-mono text-xs"
                    >
                      /studio/{studio.slug}
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--foreground-secondary)]">
                      Studio ID
                    </span>
                    <span className="font-mono text-xs text-[var(--foreground-tertiary)]">
                      {studio.id.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
