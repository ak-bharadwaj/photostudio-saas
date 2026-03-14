'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import NextImage from 'next/image';
import { useAuthStore } from '@/lib/auth-store';
import { partnersApi, uploadApi } from '@/lib/api';
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
  Plus,
  Trash2,
  Sparkles,
  Check,
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
  heroStyle?: 'solid' | 'mesh' | 'glass' | 'cinematic';
  cardTheme?: 'modern' | 'classic' | 'elevated' | 'editorial' | 'minimal';
  buttonShape?: 'rounded' | 'pill' | 'luxury-sharp' | 'geometric';
  logoPosition?: string;
  themePreset?: string;
  bgType?: 'solid' | 'gradient' | 'grain' | 'dark-studio';
  layoutMode?: 'standard' | 'split' | 'centered' | 'full-editorial';
  [key: string]: unknown;
}

const THEME_PRESETS = [
  {
    id: 'noir-luxury',
    name: 'Noir Luxury',
    primaryColor: '#0A0A0B',
    secondaryColor: '#1A1A1D',
    accentColor: '#D4AF37',
    fontFamily: 'Playfair Display',
    heroStyle: 'cinematic',
    cardTheme: 'editorial',
    buttonShape: 'luxury-sharp',
    bgType: 'dark-studio',
    layoutMode: 'full-editorial',
    description: 'High-contrast, timeless elegance with gold accents and serif typography.'
  },
  {
    id: 'alabaster-minimal',
    name: 'Alabaster Minimal',
    primaryColor: '#FDFCF0',
    secondaryColor: '#E5E7EB',
    accentColor: '#111827',
    fontFamily: 'Outfit',
    heroStyle: 'solid',
    cardTheme: 'minimal',
    buttonShape: 'pill',
    bgType: 'solid',
    layoutMode: 'centered',
    description: 'Breatheable, airy design for clean and modern aesthetic.'
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    primaryColor: '#3D2B1F',
    secondaryColor: '#5C4033',
    accentColor: '#FFA500',
    fontFamily: 'Cormorant Garamond',
    heroStyle: 'mesh',
    cardTheme: 'elevated',
    buttonShape: 'rounded',
    bgType: 'grain',
    layoutMode: 'split',
    description: 'Warm, earthy tones capturing the magic of natural light.'
  },
  {
    id: 'midnight-vibrant',
    name: 'Midnight Radiant',
    primaryColor: '#020617',
    secondaryColor: '#1E1B4B',
    accentColor: '#818CF8',
    fontFamily: 'Plus Jakarta Sans',
    heroStyle: 'mesh',
    cardTheme: 'modern',
    buttonShape: 'rounded',
    bgType: 'grain',
    layoutMode: 'standard',
    description: 'Professional dark mode with energetic indigo highlights.'
  },
  {
    id: 'royal-velvet',
    name: 'Royal Velvet',
    primaryColor: '#2D0A0A',
    secondaryColor: '#451212',
    accentColor: '#E11D48',
    fontFamily: 'Playfair Display',
    heroStyle: 'glass',
    cardTheme: 'elevated',
    buttonShape: 'luxury-sharp',
    bgType: 'dark-studio',
    layoutMode: 'full-editorial',
    description: 'Deep crimson tones for high-end boutique experiences.'
  },
  {
    id: 'sage-artisan',
    name: 'Sage Artisan',
    primaryColor: '#164E63',
    secondaryColor: '#0E7490',
    accentColor: '#2DD4BF',
    fontFamily: 'DM Sans',
    heroStyle: 'mesh',
    cardTheme: 'modern',
    buttonShape: 'rounded',
    bgType: 'grain',
    layoutMode: 'standard',
    description: 'Balanced, refreshing tones for lifestyle and professional services.'
  },
  {
    id: 'monochrome-pro',
    name: 'Monochrome Pro',
    primaryColor: '#050505',
    secondaryColor: '#0A0A0B',
    accentColor: '#FFFFFF',
    fontFamily: 'Inter',
    heroStyle: 'solid',
    cardTheme: 'minimal',
    buttonShape: 'geometric',
    bgType: 'solid',
    layoutMode: 'full-editorial',
    description: 'The ultimate professional look. Deep obsidian black, pure white, pure focus.'
  },
  {
    id: 'desert-stone',
    name: 'Desert Stone',
    primaryColor: '#8B4513',
    secondaryColor: '#A0522D',
    accentColor: '#F4A460',
    fontFamily: 'Lora',
    heroStyle: 'mesh',
    cardTheme: 'modern',
    buttonShape: 'rounded',
    bgType: 'grain',
    layoutMode: 'split',
    description: 'Earthy, warm, and grounded. Perfect for outdoor and travel services.'
  },
  {
    id: 'arctic-dawn',
    name: 'Arctic Dawn',
    primaryColor: '#0F172A',
    secondaryColor: '#1E293B',
    accentColor: '#38BDF8',
    fontFamily: 'Montserrat',
    heroStyle: 'glass',
    cardTheme: 'elevated',
    buttonShape: 'pill',
    bgType: 'gradient',
    layoutMode: 'centered',
    description: 'Cool, crisp, and futuristic. Ideal for tech and commercial work.'
  },
  {
    id: 'cyber-studio',
    name: 'Cyber Studio',
    primaryColor: '#2E1065',
    secondaryColor: '#4C1D95',
    accentColor: '#F0ABFC',
    fontFamily: 'Space Grotesk',
    heroStyle: 'mesh',
    cardTheme: 'modern',
    buttonShape: 'geometric',
    bgType: 'dark-studio',
    layoutMode: 'standard',
    description: 'Vibrant neon aesthetics for creative and avant-garde partners.'
  },
  {
    id: 'champagne-glow',
    name: 'Champagne Glow',
    primaryColor: '#FAF9F6',
    secondaryColor: '#F5F5F5',
    accentColor: '#C5A059',
    fontFamily: 'Josefin Sans',
    heroStyle: 'glass',
    cardTheme: 'modern',
    buttonShape: 'pill',
    bgType: 'grain',
    layoutMode: 'standard',
    description: 'Soft, sophisticated palette for maternity and bridal partners.'
  },
  {
    id: 'industrial-loft',
    name: 'Industrial Loft',
    primaryColor: '#1C1C1C',
    secondaryColor: '#333333',
    accentColor: '#EA580C',
    fontFamily: 'Roboto',
    heroStyle: 'solid',
    cardTheme: 'classic',
    buttonShape: 'geometric',
    bgType: 'grain',
    layoutMode: 'split',
    description: 'Raw, powerful aesthetic with bold orange highlights.'
  },
  {
    id: 'ethereal-dream',
    name: 'Ethereal Dream',
    primaryColor: '#0F172A',
    secondaryColor: '#1E293B',
    accentColor: '#C084FC',
    fontFamily: 'Outfit',
    heroStyle: 'cinematic',
    cardTheme: 'elevated',
    buttonShape: 'pill',
    bgType: 'dark-studio',
    layoutMode: 'full-editorial',
    description: 'Whimsical, purple-toned gradients for creative and fantasy shoots.'
  },
  {
    id: 'vintage-film',
    name: 'Vintage Film',
    primaryColor: '#5C4033',
    secondaryColor: '#D2B48C',
    accentColor: '#8B0000',
    fontFamily: 'Playfair Display',
    heroStyle: 'solid',
    cardTheme: 'classic',
    buttonShape: 'rounded',
    bgType: 'grain',
    layoutMode: 'centered',
    description: 'Nostalgic, warm, and cinematic. Excellent for creators and vintage aesthetics.'
  },
  {
    id: 'nordic-sage',
    name: 'Nordic Sage',
    primaryColor: '#78866B',
    secondaryColor: '#E9EAD9',
    accentColor: '#4A5D23',
    fontFamily: 'Inter',
    heroStyle: 'mesh',
    cardTheme: 'modern',
    buttonShape: 'pill',
    bgType: 'gradient',
    layoutMode: 'standard',
    description: 'Clean, organic, and peaceful. Brings a calming, breath-of-fresh-air feeling to your booking.'
  },
  {
    id: 'onyx-prestige',
    name: 'Onyx Prestige',
    primaryColor: '#000000',
    secondaryColor: '#1A1A1A',
    accentColor: '#D4AF37', // Gold
    fontFamily: 'Cormorant Garamond',
    heroStyle: 'cinematic',
    cardTheme: 'elevated',
    buttonShape: 'luxury-sharp',
    bgType: 'dark-studio',
    layoutMode: 'full-editorial',
    description: 'The epitome of high-end luxury. Midnight black with pure gold accents and editorial typography.'
  }
];

interface StudioData {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  logoUrl: string | null;
  brandingConfig: BrandingConfig | null;
  defaultTerms: string | null;
  hotDeal: string | null;
}

const DEFAULT_BRANDING: BrandingConfig = {
  primaryColor: '#0A0A0B',
  secondaryColor: '#1A1A1D',
  accentColor: '#D4AF37',
  fontFamily: 'Plus Jakarta Sans',
  headerText: '',
  tagline: '',
  heroStyle: 'mesh',
  cardTheme: 'modern',
  buttonShape: 'rounded',
  themePreset: 'midnight-vibrant',
  bgType: 'grain',
  layoutMode: 'standard',
};

const FONT_OPTIONS = [
  'Plus Jakarta Sans',
  'Outfit',
  'Inter',
  'DM Sans',
  'Playfair Display',
  'Cormorant Garamond',
  'Poppins',
  'Montserrat',
  'Lora',
  'Raleway',
  'Nunito',
  'Josefin Sans',
  'Roboto',
  'Open Sans',
  'Space Grotesk',
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
          <p className="text-[11px] text-[var(--foreground-tertiary)] font-medium leading-none mt-0.5">{description}</p>
        )}
      </div>
      <div className="relative w-32">
        <Input
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            // Allow '#' or valid hex characters up to 7 (e.g., #FFFFFF)
            if (/^#?[0-9a-fA-F]{0,6}$/.test(v)) {
              // Automatically add '#' if missing and it looks like a hex color
              const sanitized = v.startsWith('#') || v === '' ? v : '#' + v;
              onChange(sanitized);
            }
          }}
          className="font-mono text-xs h-9 uppercase pl-2 pr-8"
          placeholder="#000000"
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
                alt="Partner logo"
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
/*  hexAlpha helper — mirrors the one in studio/[slug]/page.tsx              */
/* -------------------------------------------------------------------------- */

function hexAlpha(color: string, alpha: string): string {
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) return color + alpha;
  return color;
}

function getContrastColor(hexColor: string): string {
  const hex = (hexColor || '').replace('#', '');
  if (hex.length === 3 || hex.length === 6) {
    const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.substring(0, 2), 16);
    const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.substring(2, 4), 16);
    const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.substring(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#000000' : '#ffffff';
  }
  return '#ffffff';
}

/* -------------------------------------------------------------------------- */
/*  Live Preview Component — pixel-accurate replica of the real portal        */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*  Live Preview Component — pixel-accurate replica of the real portal        */
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
  const primaryColor = branding.primaryColor || '#7c3aed';
  const accentColor = branding.accentColor || '#db2777';
  const preset = branding.themePreset || '';
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const btnRadius = buttonShape === 'pill' ? '9999px' : buttonShape === 'luxury-sharp' ? '4px' : buttonShape === 'geometric' ? '0px' : '0.875rem';

  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  // Preset-aware background logic for preview
  let heroBg = '';
  let containerBg = 'var(--background-secondary)';
  
  if (preset === 'noir-luxury') {
    heroBg = 'linear-gradient(160deg, #0a0a0b 0%, #1a1a1d 100%)';
    containerBg = '#0a0a0b';
  } else if (preset === 'midnight-vibrant' || preset === 'midnight-radiant') {
    heroBg = 'linear-gradient(145deg, #020617 0%, #1e1b4b 100%)';
    containerBg = '#020617';
  } else if (preset === 'monochrome-pro') {
    heroBg = '#000000';
    containerBg = '#050505';
  } else if (heroStyle === 'solid') {
    heroBg = primaryColor;
  } else if (heroStyle === 'mesh') {
    heroBg = `radial-gradient(ellipse at 0% 0%, ${hexAlpha(primaryColor, 'cc')} 0%, transparent 55%),
             radial-gradient(ellipse at 100% 0%, ${hexAlpha(accentColor, '99')} 0%, transparent 55%),
             radial-gradient(ellipse at 50% 100%, ${hexAlpha(primaryColor, '66')} 0%, transparent 60%),
             linear-gradient(160deg, #0c0c1a 0%, #1a0a2e 50%, #0c0c1a 100%)`;
  } else if (heroStyle === 'cinematic') {
    heroBg = `linear-gradient(to bottom, transparent, rgba(0,0,0,0.8)), url('https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&q=80&w=800') center/cover`;
  } else {
    heroBg = `linear-gradient(135deg, ${primaryColor}, ${accentColor})`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-[var(--foreground-tertiary)] bg-[var(--surface-0)] p-3 rounded-xl border border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Eye className="h-3 w-3 text-[var(--primary)]" />
          Live Preview
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-[var(--success)] animate-pulse" />
          Active
        </div>
      </div>

      <div
        className="rounded-3xl border border-[var(--border)] overflow-hidden shadow-2xl relative min-h-[400px]"
        style={{
          fontFamily: (branding.fontFamily || 'Inter') + ', sans-serif',
          background: containerBg,
        }}
      >
        {/* Global Noise Overlay for premium look */}
        <div 
          className="absolute inset-0 z-10 pointer-events-none opacity-[0.05] mix-blend-overlay"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} 
        />

        {/* ── Hero Header ── */}
        <div
          className={cn(
            'relative overflow-hidden',
            heroStyle === 'cinematic' ? 'h-48' : 'py-8',
          )}
          style={{ background: heroBg }}
        >
          {heroStyle === 'mesh' && !preset && (
            <>
              <div className="absolute top-0 left-1/4 w-32 h-32 rounded-full opacity-30 blur-2xl pointer-events-none" style={{ backgroundColor: primaryColor }} />
              <div className="absolute bottom-0 right-1/4 w-28 h-28 rounded-full opacity-20 blur-2xl pointer-events-none" style={{ backgroundColor: accentColor }} />
            </>
          )}
          
          {/* Preset specific glow */}
          {(preset === 'midnight-vibrant' || preset === 'midnight-radiant') && (
            <div className="absolute top-0 left-0 w-32 h-32 rounded-full opacity-40 blur-3xl pointer-events-none" style={{ backgroundColor: '#818CF8' }} />
          )}

          <div className="relative px-6 h-full flex items-center">
            <div className={cn(
              'flex items-center gap-4 w-full',
              heroStyle === 'glass' && 'bg-white/10 backdrop-blur-2xl p-4 rounded-2xl border border-white/20 shadow-xl',
              heroStyle === 'cinematic' && 'mt-auto pb-6'
            )}>
              {logoUrl ? (
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white/15 backdrop-blur-sm shadow-lg border border-white/20">
                  <NextImage src={getFullUrl(logoUrl)} alt="Logo" fill className="object-contain p-1" sizes="48px" unoptimized />
                </div>
              ) : (
                <div className="h-12 w-12 shrink-0 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg border border-white/20">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-black tracking-tight leading-tight text-white">
                  {branding.headerText || studioName}
                </h3>
                {branding.tagline && (
                  <p className="text-[11px] mt-0.5 font-medium text-white/70">{branding.tagline}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Services section ── */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {['Wedding', 'Portrait'].map((name) => (
              <div
                key={name}
                className={cn(
                  'relative overflow-hidden transition-all duration-500',
                  cardTheme === 'modern' && 'rounded-xl border border-[var(--border)] bg-[var(--surface-0)]',
                  cardTheme === 'minimal' && 'border-b-2 border-[var(--border)] bg-transparent',
                  cardTheme === 'editorial' && 'rounded-none border border-[var(--border)] bg-white/5',
                  cardTheme === 'elevated' && 'rounded-3xl shadow-lg bg-[var(--surface-0)]',
                )}
              >
                <div className="h-20 bg-black/5 flex items-center justify-center" style={{ background: `linear-gradient(45deg, ${hexAlpha(primaryColor, '10')}, transparent)` }}>
                   <Camera size={20} className="opacity-20" />
                </div>
                <div className="p-3">
                  <p className="text-[8px] font-black uppercase tracking-widest text-foreground/40">{name}</p>
                  <p className="text-xs font-bold mt-1" style={{ color: primaryColor }}>₹4,999</p>
                </div>
              </div>
            ))}
          </div>

          <button
            className="w-full py-3 text-[11px] font-black uppercase tracking-[0.2em]"
            style={{
              backgroundColor: primaryColor,
              color: getContrastColor(primaryColor),
              borderRadius: btnRadius,
            }}
          >
            Confirm Booking
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
  const [hotDeal, setHotDeal] = useState('');
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
        const res = await partnersApi.getOne(studioId);
        if (ctrl.signal.aborted) return;
        const s = res.data as StudioData;
        setStudio(s);
        setLogoUrl(s?.logoUrl || null);
        setDefaultTerms(s?.defaultTerms || '');
        setHotDeal(s?.hotDeal || '');
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

  const applyThemePreset = (presetId: string) => {
    const preset = THEME_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    
    updateBranding({
      themePreset: preset.id,
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      accentColor: preset.accentColor,
      fontFamily: preset.fontFamily,
      heroStyle: preset.heroStyle as any,
      cardTheme: preset.cardTheme as any,
      buttonShape: preset.buttonShape as any,
      bgType: preset.bgType as any,
      layoutMode: preset.layoutMode as any,
    });
    addToast('success', `Applied ${preset.name} theme`);
  };

  function ThemeGallery() {
    return (
      <Card className="border-2 border-[var(--primary)]/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[var(--primary)]" />
              <CardTitle>Premium Theme Gallery</CardTitle>
            </div>
            <div className="px-3 py-1 bg-[var(--primary)]/10 text-[var(--primary)] text-[11px] font-black uppercase tracking-[0.2em] rounded-full">
              10 Curated Styles
            </div>
          </div>
          <CardDescription>
            Choose a professionally designed theme to instantly transform your partner's public identity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {THEME_PRESETS.map((theme) => (
              <button
                key={theme.id}
                onClick={() => applyThemePreset(theme.id)}
                className={cn(
                  "group relative flex flex-col items-center gap-3 p-4 rounded-3xl border-2 transition-all duration-500",
                  branding.themePreset === theme.id 
                    ? "border-[var(--primary)] bg-[var(--primary)]/5 shadow-xl scale-105" 
                    : "border-transparent bg-[var(--surface-0)] hover:border-[var(--primary)]/30 hover:bg-[var(--surface-1)]"
                )}
              >
                <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-inner flex flex-col">
                   <div 
                    className="flex-1 w-full" 
                    style={{ background: `linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.secondaryColor} 100%)` }}
                   />
                   <div 
                    className="h-1/3 w-full" 
                    style={{ backgroundColor: theme.accentColor }}
                   />
                   {branding.themePreset === theme.id && (
                     <div className="absolute inset-0 bg-[var(--primary)]/20 backdrop-blur-[2px] flex items-center justify-center">
                        <Check className="h-8 w-8 text-white drop-shadow-lg" />
                     </div>
                   )}
                </div>
                <div className="text-center">
                  <p className="text-[11px] font-black tracking-tight text-[var(--foreground)] uppercase truncate w-full">
                    {theme.name}
                  </p>
                  <p className="text-[9px] font-medium text-[var(--foreground-tertiary)] mt-0.5 line-clamp-1">
                    {theme.fontFamily}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Logo upload — direct to Cloudinary unsigned (no backend required)
  const handleLogoUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      addToast('error', 'Logo must be under 5MB');
      return;
    }
    try {
      setUploading(true);
      const res = await uploadApi.uploadLogo(file);
      setLogoUrl(res.data.url);
      setHasChanges(true);
      addToast('success', 'Logo uploaded successfully');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const msg = axiosErr?.response?.data?.message || (err instanceof Error ? err.message : 'Failed to upload logo');
      addToast('error', msg);
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
      // Explicitly whitelist branding fields so unknown DB fields never cause a 400
      const brandingPayload = {
        primaryColor: branding.primaryColor,
        secondaryColor: branding.secondaryColor,
        accentColor: branding.accentColor,
        fontFamily: branding.fontFamily,
        headerText: branding.headerText,
        tagline: branding.tagline,
        heroStyle: branding.heroStyle,
        cardTheme: branding.cardTheme,
        buttonShape: branding.buttonShape,
        logoPosition: branding.logoPosition,
        themePreset: branding.themePreset,
        bgType: branding.bgType,
        layoutMode: branding.layoutMode,
      };
      await partnersApi.update(studio.id, {
        brandingConfig: brandingPayload,
        logoUrl: logoUrl, // Explicitly send logoUrl even if it is null
        defaultTerms: defaultTerms || '',
        hotDeal: hotDeal || '',
      });
      setHasChanges(false);
      addToast('success', 'Branding saved successfully');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
      const msg = axiosErr?.response?.data?.message;
      const detail = Array.isArray(msg) ? msg.join(', ') : msg;
      console.error('Branding save failed:', err);
      addToast('error', detail || 'Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  // Reset to saved state
  const handleReset = () => {
    if (!studio) return;
    setLogoUrl(studio.logoUrl);
    setDefaultTerms(studio.defaultTerms || '');
    setHotDeal(studio.hotDeal || '');
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
          <ThemeGallery />
          
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

          {/* Hot Deal / Offer */}
          <Card className="border-2 border-[var(--primary)]/20 shadow-lg shadow-[var(--primary)]/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[var(--primary)]" />
                <CardTitle>Hot Deal / Offer</CardTitle>
              </div>
              <CardDescription>
                Create a special offer or "Hot Deal" to attract more customers. This will be prominently displayed on your booking page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Input
                  label="Deal Headline"
                  placeholder="e.g. 20% OFF on Wedding Shoots this month!"
                  value={hotDeal}
                  onChange={(e) => {
                    setHotDeal(e.target.value);
                    setHasChanges(true);
                  }}
                  helperText="This headline will be shown as a promotional banner or highlight."
                />
                
                <div className="pt-4 border-t border-[var(--border)]/50">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-[var(--foreground-tertiary)]" />
                    <span className="text-xs font-bold uppercase tracking-widest text-[var(--foreground-tertiary)]">Booking Terms (Optional)</span>
                  </div>
                  <Textarea
                    value={defaultTerms}
                    onChange={(e) => {
                      setDefaultTerms(e.target.value);
                      setHasChanges(true);
                    }}
                    rows={4}
                    placeholder="Enter any specific terms, cancellation policy, etc."
                    className="text-sm"
                  />
                </div>
              </div>
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
