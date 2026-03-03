'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import NextImage from 'next/image';
import { useAuthStore } from '@/lib/auth-store';
import { studiosApi, uploadApi, api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Select } from '@/components/ui/input';
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
import { PageHeader } from '@/components/ui/page-header';

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
  heroStyle?: 'solid' | 'mesh' | 'glass';
  cardTheme?: 'modern' | 'classic' | 'elevated';
  buttonShape?: 'rounded' | 'pill' | 'luxury-sharp';
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
  heroStyle: 'solid',
  cardTheme: 'modern',
  buttonShape: 'rounded',
};

const FONT_OPTIONS = [
  'Plus Jakarta Sans',
  'Outfit',
  'Inter',
  'Playfair Display',
  'Poppins',
  'Montserrat',
  'Lora',
  'Raleway',
  'Roboto',
  'Open Sans',
];

/* -------------------------------------------------------------------------- */
/*  Color Picker Component                                                    */
/* -------------------------------------------------------------------------- */

function ColorPicker({
  label,
  value,
  onChange,
  description,
  id,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
  description?: string;
  id?: string;
}) {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-') + '-color';
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl bg-[var(--surface-0)] border border-[var(--border)] group hover:border-[var(--primary-light)] transition-all">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[var(--border)] shadow-sm">
        <input
          id={inputId}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 w-[150%] h-[150%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: value }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <label htmlFor={inputId} className="block text-sm font-bold text-[var(--foreground)] tracking-tight">
          {label}
        </label>
        {description && (
          <p className="text-[10px] text-[var(--foreground-tertiary)] font-medium leading-none mt-0.5">{description}</p>
        )}
      </div>
      <div className="relative w-32">
        <Input
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{0,6}$/.test(v) || v === '') onChange(v);
          }}
          className="font-mono text-xs h-9 uppercase pl-2 pr-8"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border border-[var(--border)] shadow-inner" style={{ backgroundColor: value }} />
      </div>
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
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wider italic">
          Upload Content
        </label>
      </div>

      {logoUrl ? (
        <div className="relative group">
          <div className="h-48 w-full rounded-2xl border-2 border-[var(--border)] overflow-hidden bg-[var(--surface-1)] flex items-center justify-center p-8 transition-all group-hover:border-[var(--primary)] group-hover:bg-[var(--surface-0)]">
            <div className="relative h-full w-full">
              <NextImage
                src={getFullUrl(logoUrl)}
                alt="Studio logo"
                fill
                className="object-contain animate-in zoom-in duration-500"
                sizes="(max-width: 1024px) 100vw, 33vw"
                unoptimized
              />
            </div>
          </div>
          <button
            onClick={onRemove}
            className="absolute top-4 right-4 h-10 w-10 rounded-xl bg-[var(--danger)] text-white flex items-center justify-center shadow-xl hover:opacity-80 transition-all hover:scale-110 active:scale-90"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={cn(
            'flex flex-col items-center justify-center gap-4 py-12 px-6',
            'border-2 border-dashed border-[var(--border)] rounded-2xl',
            'bg-[var(--surface-0)] cursor-pointer group',
            'hover:border-[var(--primary)] hover:bg-[var(--primary)]/5',
            'transition-all duration-500',
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-4 animate-pulse">
              <LoadingSpinner className="h-10 w-10 text-[var(--primary)]" />
              <p className="text-sm font-bold text-[var(--primary)]">Uploading high-quality assets...</p>
            </div>
          ) : (
            <>
              <div className="h-16 w-16 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="h-8 w-8 text-[var(--primary)]" />
              </div>
              <div className="text-center">
                <p className="text-base font-black text-[var(--foreground)] tracking-tight italic">
                  Drop your masterpiece here
                </p>
                <p className="text-xs text-[var(--foreground-tertiary)] font-medium mt-1">
                  SVG, PNG or JPG (Recommended: Transparent PNG)
                </p>
              </div>
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
  const heroStyle = branding.heroStyle || 'solid';
  const cardTheme = branding.cardTheme || 'modern';
  const buttonShape = branding.buttonShape || 'rounded';
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-[var(--foreground-tertiary)] bg-[var(--surface-0)] p-3 rounded-xl border border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Eye className="h-3 w-3 text-[var(--primary)]" />
          Visual Blueprint
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-[var(--success)] animate-pulse" />
          Live
        </div>
      </div>

      <div
        className="rounded-3xl border border-[var(--border)] overflow-hidden shadow-2xl bg-white"
        style={{ fontFamily: branding.fontFamily + ', sans-serif' }}
      >
        {/* Header Preview */}
        <div
          className={cn(
            "px-8 py-10 relative overflow-hidden flex items-center gap-6 transition-all duration-700",
            heroStyle === 'mesh' ? "min-h-[160px]" : "py-10"
          )}
          style={{
            background: heroStyle === 'solid'
              ? branding.primaryColor
              : heroStyle === 'mesh'
                ? `radial-gradient(at 0% 0%, ${branding.primaryColor} 0px, transparent 50%),
                   radial-gradient(at 100% 0%, ${branding.accentColor} 0px, transparent 50%),
                   radial-gradient(at 0% 100%, ${branding.accentColor} 0px, transparent 50%),
                   radial-gradient(at 100% 100%, ${branding.primaryColor} 0px, transparent 50%)`
                : heroStyle === 'glass'
                  ? `linear-gradient(135deg, ${branding.primaryColor}, ${branding.accentColor})`
                  : undefined
          }}
        >
          {heroStyle === 'mesh' && (
            <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-white/10" />
          )}

          <div className={cn(
            "relative flex items-center gap-5 w-full",
            heroStyle === 'glass' && "bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-2xl"
          )}>
            {logoUrl ? (
              <div className={cn(
                "relative h-16 w-16 shadow-2xl overflow-hidden",
                heroStyle === 'glass' ? "rounded-2xl bg-white/20 p-2" : "rounded-xl bg-white/20 p-1.5"
              )}>
                <NextImage
                  src={getFullUrl(logoUrl)}
                  alt="Logo"
                  fill
                  className="object-contain"
                  sizes="64px"
                  unoptimized
                />
              </div>
            ) : (
              <div className={cn(
                "h-16 w-16 flex items-center justify-center shadow-xl",
                heroStyle === 'glass' ? "rounded-2xl bg-white/20" : "rounded-xl bg-white/20"
              )}>
                <Camera className="h-8 w-8 text-white" />
              </div>
            )}
            <div>
              <h3 className="text-white font-black text-2xl tracking-tighter italic leading-none">
                {(branding.headerText || studioName).toUpperCase()}
              </h3>
              {branding.tagline && (
                <p className="text-white/90 text-[10px] sm:text-xs mt-2 font-bold uppercase tracking-widest bg-black/10 inline-block px-2 py-0.5 rounded-full backdrop-blur-sm">
                  {branding.tagline}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Body Preview */}
        <div className="bg-[var(--surface-0)] p-6 space-y-4">
          <div className="space-y-1">
            <h4
              className="text-base font-bold"
              style={{ color: branding.primaryColor }}
            >
              Services
            </h4>
            <div className="h-1 w-8 rounded-full" style={{ backgroundColor: branding.primaryColor }} />
          </div>

          {/* Mock cards */}
          <div className="grid grid-cols-3 gap-4">
            {['Wedding', 'Portrait', 'Event'].map((name) => (
              <div
                key={name}
                className={cn(
                  "transition-all duration-300 p-4 text-center group/card",
                  cardTheme === 'modern' && "rounded-2xl border border-[var(--border)] bg-white shadow-sm hover:border-[var(--primary-light)] hover:shadow-md",
                  cardTheme === 'classic' && "rounded-xl border-2 border-[var(--border)] bg-white hover:-translate-y-1",
                  cardTheme === 'elevated' && "rounded-[1.5rem] shadow-xl bg-white border-transparent hover:shadow-2xl"
                )}
              >
                <div
                  className="h-10 w-10 rounded-xl mx-auto mb-3 flex items-center justify-center transition-transform group-hover/card:scale-110"
                  style={{ backgroundColor: branding.primaryColor + '15' }}
                >
                  <Camera
                    className="h-5 w-5"
                    style={{ color: branding.primaryColor }}
                  />
                </div>
                <p
                  className="text-[9px] font-black text-[var(--foreground)] uppercase tracking-widest"
                  style={{ color: branding.primaryColor }}
                >
                  {name}
                </p>
              </div>
            ))}
          </div>

          {/* Mock button */}
          <button
            className="w-full py-3 text-white text-sm font-bold transition-all shadow-lg active:scale-95"
            style={{
              backgroundColor: branding.primaryColor,
              borderRadius: buttonShape === 'pill' ? '9999px' : buttonShape === 'luxury-sharp' ? '4px' : 'var(--radius-md)',
              boxShadow: `0 4px 14px 0 ${branding.primaryColor}40`
            }}
          >
            Book Session
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
  const abortRef = useRef<AbortController | null>(null);

  // Load studio data
  useEffect(() => {
    if (!user?.studioId) return;
    const studioId = user.studioId;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    async function load() {
      try {
        setLoading(true);
        const res = await studiosApi.getOne(studioId);
        if (ctrl.signal.aborted) return;
        const s = res.data as StudioData;
        setStudio(s);
        setLogoUrl(s?.logoUrl || null);
        setDefaultTerms(s?.defaultTerms || '');
        setBranding({
          ...DEFAULT_BRANDING,
          ...(s?.brandingConfig || {}),
          headerText: s?.brandingConfig?.headerText || s?.name || '',
        });
      } catch (error: unknown) {
        if ((error as { name?: string }).name === 'CanceledError') return;
        addToast('error', 'Failed to load studio data');
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => ctrl.abort();
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
      <div className="space-y-6">
        <div className="skeleton h-40 w-full rounded-2xl" />
        <div className="skeleton h-64 w-full rounded-2xl" />
        <div className="skeleton h-64 w-full rounded-2xl" />
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
      <PageHeader
        eyebrow="Brand Identity"
        title="Studio Branding"
        subtitle="Customize how your studio appears to customers on your public booking page."
        accentColor="rose"
        actions={
          <>
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
          </>
        }
      />

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
                <Select
                    label="Font Family"
                    value={branding.fontFamily}
                    onChange={(e) =>
                      updateBranding({ fontFamily: e.target.value })
                    }
                    options={FONT_OPTIONS.map((font) => ({ value: font, label: font }))}
                  />

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
