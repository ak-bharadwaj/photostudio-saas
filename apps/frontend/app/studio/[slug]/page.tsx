'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import NextImage from 'next/image';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/cart-context';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { Input, Textarea } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import {
  Camera,
  Clock,
  MapPin,
  Calendar,
  Check,
  ChevronRight,
  ArrowLeft,
  Star,
  Sparkles,
  Info,
  CreditCard,
  Mail,
  Phone,
  Globe,
  Instagram,
  GraduationCap,
  Briefcase,
  Gift,
  ImageIcon,
  LogOut,
  User,
  Settings,
  History,
  FileText,
  AlertCircle,
  MessageSquare,
  ArrowRight,
  Heart,
  Users,
  PartyPopper,
  Baby,
  Chrome,
  Receipt,
  X,
  Plus,
  Trash2,
  Edit2,
  BookOpen,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { portalApi } from '@/lib/api';

const STEPS = [
  { id: 1, title: 'Service', icon: Camera },
  { id: 2, title: 'Schedule', icon: Calendar },
  { id: 3, title: 'Details', icon: FileText },
  { id: 4, title: 'Confirm', icon: Check },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function hexAlpha(color: string, alpha: string): string {
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) {
    return color + alpha;
  }
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

const GOOGLE_FONT_FAMILIES = [
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
  'DM Sans',
  'Cormorant Garamond',
  'Nunito',
  'Josefin Sans',
  'Space Grotesk',
] as const;

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  occasion?: string;
  coverImage?: string;
}

interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  category?: string;
}

interface BrandingConfig {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  headerText?: string;
  tagline?: string;
  heroStyle?: 'solid' | 'mesh' | 'glass' | 'cinematic';
  cardTheme?: 'modern' | 'classic' | 'elevated' | 'editorial' | 'minimal';
  buttonShape?: 'rounded' | 'pill' | 'luxury-sharp' | 'geometric';
  themePreset?: string;
  bgType?: 'solid' | 'gradient' | 'grain' | 'dark-studio';
  layoutMode?: 'standard' | 'split' | 'centered' | 'full-editorial';
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  reply?: string;
  createdAt: string;
  customer: { name: string };
}

interface Studio {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  logoUrl?: string;
  heroImageUrl?: string;
  address?: string;
  city?: string;
  state?: string;
  brandingConfig?: BrandingConfig;
  defaultTerms?: string;
  hotDeal?: string;
  services: Service[];
  portfolioItems: PortfolioItem[];
  reviews?: Review[];
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface Booking {
  id: string;
  scheduledAt: string;
  status: string;
  service: { name: string; price: number; durationMinutes: number; coverImage?: string };
  studio: { name: string; slug: string; logoUrl?: string };
  quoteAmount?: number;
  quoteNotes?: string;
  review?: { id: string; rating: number; comment?: string };
}

interface Invoice {
  id: string;
  createdAt: string;
  totalAmount: number;
  status: string;
  studio: { name: string; slug: string };
  payments: { id: string; amount: number }[];
}

/* -------------------------------------------------------------------------- */
/*  Occasion Icon Map                                                          */
/* -------------------------------------------------------------------------- */

const OCCASION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  wedding: Heart,
  portrait: Star,
  family: Users,
  event: PartyPopper,
  baby: Baby,
  maternity: Baby,
  graduation: GraduationCap,
  corporate: Briefcase,
  fashion: Sparkles,
  birthday: Gift,
  product: ImageIcon,
};

function getOccasionIcon(occasion?: string) {
  if (!occasion) return Camera;
  return OCCASION_ICONS[occasion.toLowerCase()] || Camera;
}

function safeFormatDate(dateStr: string | undefined | null, options?: Intl.DateTimeFormatOptions) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-US', options || {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  } catch {
    return '—';
  }
}

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-8 text-center">
      <div className="max-w-md">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-black text-white mb-2">Something went wrong</h2>
        <p className="text-white/40 text-sm mb-6">{error instanceof Error ? error.message : 'An unexpected error occurred'}</p>
        <Button onClick={resetErrorBoundary} variant="outline" className="border-white/10 text-white hover:bg-white/5">
          Try Again
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Step Indicator — minimal typographic style                                */
/* -------------------------------------------------------------------------- */

function StepIndicator({
  step,
  brand,
}: {
  step: number;
  brand: {
    primaryColor: string;
    buttonShape: 'rounded' | 'pill' | 'luxury-sharp' | 'geometric';
  };
}) {
  return (
    <div className="flex items-center justify-center gap-0 mb-16 animate-cinematic">
      {STEPS.map((s, idx) => {
        const isActive = step === s.id;
        const isCompleted = step > s.id;
        return (
          <React.Fragment key={s.id}>
            <div className="flex flex-col items-center gap-3 relative" key={s.id}>
              <div
                className={cn(
                  "h-10 w-10 rounded-2xl flex items-center justify-center text-xs font-black transition-all duration-700 shadow-2xl backdrop-blur-xl",
                  isActive ? "scale-125 border-primary/40" : "scale-100 border-white/5"
                )}
                style={{
                  backgroundColor: isActive
                    ? brand.primaryColor
                    : isCompleted
                      ? '#22c55e'
                      : 'rgba(255,255,255,0.03)',
                  borderWidth: '1px',
                  color: isActive ? getContrastColor(brand.primaryColor) : isCompleted ? '#fff' : 'rgba(255,255,255,0.2)',
                }}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              </div>
              <span
                className="text-[9px] font-black uppercase tracking-[0.3em] hidden sm:block absolute -bottom-8 whitespace-nowrap"
                style={{ color: isActive ? brand.primaryColor : 'rgba(255,255,255,0.2)' }}
              >
                {s.title}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                key={`line-${s.id}`}
                className="h-[1px] w-12 sm:w-24 mx-4 transition-all duration-1000"
                style={{ backgroundColor: step > s.id ? '#22c55e' : 'rgba(255,255,255,0.05)' }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Cinematic Background Elements                                              */
/* -------------------------------------------------------------------------- */

function NoiseOverlay() {
  return (
    <div 
      className="fixed inset-0 z-[100] pointer-events-none opacity-[0.035] mix-blend-overlay"
      style={{ 
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` 
      }} 
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Theme-specific background layer                                            */
/* -------------------------------------------------------------------------- */

function ThemeBackground({ brand }: { brand: { primaryColor: string; accentColor: string; bgType?: string; themePreset?: string } }) {
  const preset = brand.themePreset || '';

  if (preset === 'noir-luxury') {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#0a0a0b]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/20 to-transparent" />
        <div className="absolute top-1/4 right-[10%] w-[800px] h-[800px] opacity-[0.07]" style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }} />
        <div className="absolute bottom-1/4 left-[-5%] w-[600px] h-[600px] opacity-[0.05]" style={{ background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)' }} />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4AF37' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
      </div>
    );
  }

  if (preset === 'alabaster-minimal') {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#FDFCF0]" />
        <div className="absolute inset-0 opacity-40" style={{ background: 'radial-gradient(ellipse at 80% 20%, #e5e1d8 0%, transparent 60%)' }} />
        <div className="absolute top-0 left-0 right-0 h-1 bg-black/5" />
      </div>
    );
  }

  if (preset === 'golden-hour') {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #1a1009 0%, #2d1f12 40%, #1a1009 100%)' }} />
        <div className="absolute inset-0 opacity-[0.08] mix-blend-soft-light" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
        <div className="absolute top-1/4 right-[5%] w-[600px] h-[600px] opacity-[0.12]" style={{ background: 'radial-gradient(circle, #FFA500 0%, transparent 70%)' }} />
      </div>
    );
  }

  if (preset === 'midnight-vibrant' || preset === 'midnight-radiant') {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(145deg, #020617 0%, #111827 50%, #020617 100%)' }} />
        <div className="absolute top-[-200px] left-[-100px] w-[800px] h-[800px] rounded-full blur-[140px] opacity-25" style={{ backgroundColor: '#2e1065' }} />
        <div className="absolute bottom-[-100px] right-[-100px] w-[600px] h-[600px] rounded-full blur-[120px] opacity-20" style={{ backgroundColor: '#1e1b4b' }} />
        <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, rgba(129,140,248,0.03) 1px, transparent 0)`, backgroundSize: '60px 60px' }} />
      </div>
    );
  }

  if (preset === 'royal-velvet') {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(145deg, #0a0000 0%, #1a0505 50%, #0a0000 100%)' }} />
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
        <div className="absolute top-[10%] right-[10%] w-[500px] h-[500px] opacity-15" style={{ background: 'radial-gradient(circle, #E11D48 0%, transparent 70%)' }} />
      </div>
    );
  }

  if (preset === 'sage-artisan') {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #08171a 0%, #0c252b 50%, #08171a 100%)' }} />
        <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 10% 10%, #2DD4BF 0%, transparent 40%)', opacity: 0.05 }} />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full blur-[120px] opacity-10" style={{ backgroundColor: '#134e4a' }} />
      </div>
    );
  }

  if (preset === 'monochrome-pro') {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#050505]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-white/10" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.99' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
      </div>
    );
  }

  if (preset === 'onyx-prestige') {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#020202]" />
        <div className="absolute inset-0 opacity-15" style={{ background: 'radial-gradient(circle at 70% 30%, #D4AF37 0%, transparent 60%)' }} />
        <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, rgba(212,175,55,0.08) 1.5px, transparent 0)`, backgroundSize: '50px 50px' }} />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
      </div>
    );
  }

  if (preset === 'vintage-film') {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#0c0c0c]" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 15% 15%, #5C4033 0%, transparent 85%)', opacity: 0.4 }} />
        <div className="absolute inset-0 opacity-[0.12] sepia-[.6] mix-blend-screen" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
      </div>
    );
  }

  if (preset === 'nordic-sage') {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#F2F3EB]" />
        <div className="absolute inset-0 opacity-40" style={{ background: 'radial-gradient(circle at 90% 10%, #CCD3C2 0%, transparent 60%)' }} />
        <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 10% 90%, #A3AD98 0%, transparent 50%)' }} />
      </div>
    );
  }

  if (preset === 'ethereal-dream') {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#010204]" />
        <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 50% 50%, #7C3AED 0%, transparent 80%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent, #010204)' }} />
        <div className="absolute inset-0 opacity-[0.05] animate-pulse" style={{ background: 'radial-gradient(circle at 20% 20%, #C084FC 0%, transparent 50%)' }} />
      </div>
    );
  }

  if (preset === 'industrial-loft') {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#080808]" />
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#EA580C] to-transparent opacity-40" />
      </div>
    );
  }

  if (preset === 'champagne-glow') {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#FAF9F6]" />
        <div className="absolute inset-0 opacity-50" style={{ background: 'radial-gradient(circle at 10% 90%, #F5E6CC 0%, transparent 40%)' }} />
        <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 80% 20%, #C5A059 0%, transparent 40%)' }} />
      </div>
    );
  }

  if (preset === 'desert-stone') {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #1c0e06 0%, #2a1509 50%, #1c0e06 100%)' }} />
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.55' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] opacity-10" style={{ background: 'radial-gradient(circle, #F4A460 0%, transparent 70%)' }} />
      </div>
    );
  }

  if (preset === 'arctic-dawn') {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }} />
        <div className="absolute top-[-100px] right-[-100px] w-[600px] h-[600px] rounded-full blur-[120px] opacity-15" style={{ backgroundColor: '#38BDF8' }} />
        <div className="absolute bottom-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full blur-[100px] opacity-10" style={{ backgroundColor: '#0EA5E9' }} />
      </div>
    );
  }

  if (preset === 'cyber-studio') {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(145deg, #0d0015 0%, #1a0030 50%, #0d0015 100%)' }} />
        <div className="absolute top-[-150px] left-[-150px] w-[700px] h-[700px] rounded-full blur-[120px] opacity-20" style={{ backgroundColor: '#C084FC' }} />
        <div className="absolute bottom-[-150px] right-[-150px] w-[600px] h-[600px] rounded-full blur-[100px] opacity-15" style={{ backgroundColor: '#A855F7' }} />
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(192,132,252,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(192,132,252,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>
    );
  }

  // Default fallback
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <div className="absolute inset-0" style={{ background: brand.bgType === 'dark-studio' ? '#080808' : '#f5f5f0' }} />
      {brand.bgType !== 'solid' && (
        <div className="absolute top-[-200px] left-[-200px] w-[700px] h-[700px] rounded-full blur-[140px] opacity-10" style={{ backgroundColor: brand.primaryColor }} />
      )}
    </div>
  );
}


function formatDuration(minutes: number) {
  if (!minutes) return "0 MINS";
  if (minutes >= 1440) {
    const days = Math.floor(minutes / 1440);
    return `${days} DAY${days > 1 ? 'S' : ''}`;
  }
  if (minutes >= 60) {
    const hours = minutes / 60;
    return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} HOUR${hours > 1 ? 'S' : ''}`;
  }
  return `${minutes} MINS`;
}

/* -------------------------------------------------------------------------- */
/*  Service Card — editorial large format                                      */
/* -------------------------------------------------------------------------- */

function ServiceCard({
  service,
  primaryColor,
  accentColor,
  onClick,
  isSelected,
  cardTheme = 'modern',
  buttonShape = 'rounded',
  dark = false,
  themePreset = '',
}: {
  service: Service;
  primaryColor: string;
  accentColor: string;
  onClick: () => void;
  isSelected: boolean;
  cardTheme?: string;
  buttonShape?: string;
  dark?: boolean;
  themePreset?: string;
}) {
  const Icon = getOccasionIcon(service.occasion);
  const [imgError, setImgError] = useState(false);
  const radius = buttonShape === 'pill' ? '999px' : buttonShape === 'luxury-sharp' ? '4px' : buttonShape === 'geometric' ? '0px' : '1.5rem';

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative w-full text-left overflow-hidden transition-all duration-700 focus:outline-none p-0",
        // Base themes
        cardTheme === 'modern' && (dark ? "rounded-3xl border border-white/5 bg-white/5 hover:bg-white/10" : "rounded-3xl border border-black/5 bg-black/5 hover:bg-black/10"),
        cardTheme === 'minimal' && (dark ? "rounded-none border-b border-white/10 bg-transparent hover:bg-white/[0.02]" : "rounded-none border-b border-black/10 bg-transparent hover:bg-black/[0.02]"),
        cardTheme === 'editorial' && (dark ? "rounded-none border-2 border-white/5 bg-black hover:border-white/20" : "rounded-none border-2 border-black/5 bg-white hover:border-black/20"),
        cardTheme === 'elevated' && (dark ? "rounded-[2rem] shadow-2xl bg-[#111111] hover:-translate-y-2" : "rounded-[2rem] shadow-xl bg-white hover:-translate-y-2"),

        // Premium Theme Specifics
        themePreset === 'onyx-prestige' && "rounded-2xl border-[0.5px] border-[#D4AF37]/20 bg-black/40 hover:border-[#D4AF37]/50 hover:shadow-[0_0_40px_-10px_rgba(212,175,55,0.3)]",
        themePreset === 'ethereal-dream' && "rounded-full border border-purple-500/10 bg-purple-500/5 hover:bg-purple-500/10 hover:border-purple-500/30",
        themePreset === 'nordic-sage' && "rounded-[3rem] border-none bg-white/40 backdrop-blur-md hover:bg-white/60",
        themePreset === 'cyber-studio' && "rounded-none border-l-4 border-l-purple-500 bg-black/60 hover:shadow-[0_0_30px_rgba(240,171,252,0.3)] hover:border-l-accent",

        isSelected && (dark ? "ring-2 ring-primary ring-offset-4 ring-offset-black" : "ring-2 ring-primary ring-offset-4 ring-offset-white")
      )}
      style={{
        borderColor: isSelected ? primaryColor : undefined,
      }}
    >
      <div className="relative overflow-hidden" style={{ aspectRatio: cardTheme === 'editorial' ? '3/4' : '4/5', borderRadius: themePreset === 'nordic-sage' ? '3rem' : themePreset === 'ethereal-dream' ? '999px' : 'inherit' }}>
        {service.coverImage && !imgError ? (
          <>
            <NextImage
              src={service.coverImage}
              alt={service.name}
              fill
              className="object-cover transition-transform duration-1000 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, 33vw"
              unoptimized={!!(service.coverImage && (service.coverImage.includes('unsplash.com') || service.coverImage.includes('cloudinary.com')))}
              onError={() => setImgError(true)}
            />
            <div className={cn(
               "absolute inset-0 transition-opacity duration-700",
               cardTheme === 'editorial' ? "bg-black/40 group-hover:bg-black/20" : "bg-gradient-to-t from-black/100 via-black/40 to-transparent opacity-80 group-hover:opacity-100"
            )} />
          </>
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(160deg, ${hexAlpha(primaryColor, 'dd')} 0%, #0a0a0a 100%)`,
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon
                className="h-24 w-24 opacity-10 animate-pulse-soft"
                style={{ color: '#fff' }}
              />
            </div>
          </>
        )}

        {/* Status Indicators */}
        <div className="absolute top-6 left-6 flex flex-col gap-2">
            <div className="px-4 py-1.5 bg-black/60 backdrop-blur-xl text-white text-[9px] font-black uppercase tracking-widest rounded-full border border-white/10 shadow-2xl flex items-center">
              <Clock className="h-3 w-3 mr-2" />
              {formatDuration(service.durationMinutes)}
            </div>
            {service.occasion && (
               <div className="px-3 py-1 bg-white/10 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-md border border-white/5">
                 {service.occasion}
               </div>
            )}
        </div>

        {/* Selected indicator */}
        <div
          className={cn(
            "absolute top-6 right-6 h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-700 backdrop-blur-2xl border border-white/20 shadow-2xl z-20",
            isSelected ? "scale-100 opacity-100 rotate-0" : "scale-50 opacity-0 rotate-12"
          )}
          style={{ backgroundColor: primaryColor }}
        >
          <Check className="h-6 w-6" style={{ color: getContrastColor(primaryColor) }} />
        </div>

        {/* Text Details */}
        <div className={cn(
            "absolute bottom-0 left-0 right-0 p-8 space-y-4 transition-transform duration-700",
            cardTheme === 'editorial' ? "translate-y-0" : "group-hover:-translate-y-2"
        )}>
          <h3 className={cn(
              "leading-[0.9] tracking-tighter group-hover:text-primary transition-colors duration-500 line-clamp-2",
              dark ? "text-white" : "text-black",
              cardTheme === 'editorial' ? "text-5xl font-light italic" : "text-3xl font-black"
          )} style={{ fontFamily: cardTheme === 'editorial' ? '"Playfair Display", serif' : 'inherit' }}>
            {service.name.toUpperCase()}
          </h3>

          {service.description && (
            <p className="text-white/60 text-xs font-medium leading-relaxed line-clamp-2 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
              {service.description}
            </p>
          )}

          <div className="flex items-end justify-between pt-4 border-t border-white/10">
            <div className="text-white text-3xl font-black tabular-nums tracking-tighter">
              {formatCurrency(service.price)}
            </div>
            <div 
                className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all shadow-2xl"
                style={{ 
                    backgroundColor: isSelected ? primaryColor : 'rgba(255,255,255,0.1)', 
                    color: isSelected ? getContrastColor(primaryColor) : '#fff',
                    borderRadius: radius,
                    border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.1)'
                }}
            >
              {isSelected ? 'Confirmed' : 'Select'}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Status Badge                                                               */
/* -------------------------------------------------------------------------- */

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; text: string; label: string }> = {
    CONFIRMED: { bg: 'var(--success-light)', text: 'var(--success)', label: 'Confirmed' },
    QUOTED: { bg: 'rgba(124,58,237,0.1)', text: 'var(--primary)', label: 'Quote Ready' },
    INQUIRY: { bg: 'var(--warning-light)', text: 'var(--warning)', label: 'Inquiry' },
    PENDING: { bg: 'var(--warning-light)', text: 'var(--warning)', label: 'Pending' },
    CANCELLED: { bg: 'var(--danger-light)', text: 'var(--danger)', label: 'Cancelled' },
    COMPLETED: { bg: 'var(--success-light)', text: 'var(--success)', label: 'Completed' },
    IN_PROGRESS: { bg: 'var(--info-light)', text: 'var(--info-foreground)', label: 'In Progress' },
  };
  const c = cfg[status] || { bg: 'var(--surface-2)', text: 'var(--foreground-secondary)', label: status };
  return (
    <span
      className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {c.label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Portfolio Item Card                                                        */
/* -------------------------------------------------------------------------- */

function PortfolioItemCard({ item, index, primaryColor }: { item: PortfolioItem, index: number, primaryColor: string }) {
  const [imgError, setImgError] = useState(false);
  const isLarge = index % 7 === 0;

  return (
    <div
      className={cn(
        'group relative overflow-hidden bg-black/5',
        isLarge ? 'sm:col-span-2 sm:row-span-2' : '',
      )}
      style={{ aspectRatio: isLarge ? 'auto' : '1/1' }}
    >
      {!imgError ? (
        <NextImage
          src={item.imageUrl}
          alt={item.title}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          unoptimized={!!(item.imageUrl && (item.imageUrl.includes('unsplash.com') || item.imageUrl.includes('cloudinary.com')))}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: hexAlpha(primaryColor, '10') }}>
          <ImageIcon className="h-10 w-10 opacity-20" style={{ color: primaryColor }} />
        </div>
      )}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300 flex items-end p-4 opacity-0 group-hover:opacity-100">
        <div>
          <div className="text-white font-bold text-sm">{item.title}</div>
          {item.category && (
            <div className="text-white/60 text-xs mt-0.5 uppercase tracking-wider">
              {item.category}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Page Wrapper                                                          */
/* -------------------------------------------------------------------------- */



export default function PublicBookingPageWrapper() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={
        <div className="min-h-screen bg-black">
          <div className="skeleton h-screen w-full opacity-20" />
        </div>
      }>
        <PublicBookingPage />
      </Suspense>
    </ErrorBoundary>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Page                                                                  */
/* -------------------------------------------------------------------------- */

function PublicBookingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const [studio, setStudio] = useState<Studio | null>(null);
  const [loading, setLoading] = useState(true);
  const { items: cartItems } = useCart();
  const [step, setStep] = useState(1);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingIds, setBookingIds] = useState<string[]>([]);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
  });
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [activeTab, setActiveTab] = useState<'book' | 'history' | 'account'>('book');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [profileEdits, setProfileEdits] = useState({ name: '', email: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [rejectConfirmId, setRejectConfirmId] = useState<string | null>(null);
  const [counterOfferId, setCounterOfferId] = useState<string | null>(null);
  const [counterOfferAmount, setCounterOfferAmount] = useState('');
  const [counterOfferNote, setCounterOfferNote] = useState('');
  const [sendingCounter, setSendingCounter] = useState(false);
  const [highlightedOccasion, setHighlightedOccasion] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Review state
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const studioAbortRef = useRef<AbortController | null>(null);
  const historyAbortRef = useRef<AbortController | null>(null);
  const slotsAbortRef = useRef<AbortController | null>(null);

  // Derived branding
  const brand = useMemo(() => {
    const bc = studio?.brandingConfig || {};
    return {
      primaryColor: bc?.primaryColor || '#7c3aed',
      secondaryColor: bc?.secondaryColor || '#0d2644',
      accentColor: bc?.accentColor || '#db2777',
      fontFamily: bc?.fontFamily || 'Inter',
      headerText: bc?.headerText || studio?.name || '',
      tagline: bc?.tagline || '',
      heroStyle: bc?.heroStyle || 'mesh',
      cardTheme: bc?.cardTheme || 'modern',
      buttonShape: bc?.buttonShape || 'rounded',
      bgType: bc?.bgType || 'solid',
      layoutMode: bc?.layoutMode || 'standard',
      themePreset: bc?.themePreset || '',
    };
  }, [studio]);

  // Group services by occasion
  const occasionGroups = useMemo(() => {
    if (!studio) return {};
    const groups: Record<string, Service[]> = {};
    (studio.services || []).forEach((s) => {
      const key = s?.occasion || 'Other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return groups;
  }, [studio]);

  const hasOccasions = useMemo(
    () => Object.keys(occasionGroups).some((k) => k !== 'Other'),
    [occasionGroups],
  );

  const fetchMe = useCallback(
    async (token: string) => {
      try {
        const response = await axios.get(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { user } = response.data;
        if (user && user.role === 'CUSTOMER') {
          setAuthUser({ id: user.id, name: user.name, email: user.email });
          setProfileEdits({ name: user.name, email: user.email });
          setCustomerData((prev) => ({
            ...prev,
            name: user.name,
            email: user.email,
          }));
          // Removed auto-switch to 'history' tab to keep user in the 'ecommerce' flow
        }
      } catch {
        localStorage.removeItem('accessToken');
      }
    },
    [],
  );

  const fetchStudioHistory = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    historyAbortRef.current?.abort();
    const ctrl = new AbortController();
    historyAbortRef.current = ctrl;
    setLoadingHistory(true);
    try {
      const slug = params.slug as string;
      const [bRes, iRes] = await Promise.all([
        axios.get(`${API_URL}/portal/bookings`, {
          params: { studioSlug: slug },
          headers: { Authorization: `Bearer ${token}` },
          signal: ctrl.signal,
        }),
        axios.get(`${API_URL}/portal/invoices`, {
          params: { studioSlug: slug },
          headers: { Authorization: `Bearer ${token}` },
          signal: ctrl.signal,
        }),
      ]);
      if (ctrl.signal.aborted) return;
      const bList = bRes.data?.data ?? bRes.data;
      const iList = iRes.data?.data ?? iRes.data;
      setBookings(Array.isArray(bList) ? bList : []);
      setInvoices(Array.isArray(iList) ? iList : []);
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'CanceledError') return;
      const e = err as { response?: { data?: { message?: string } } };
      addToast('error', e.response?.data?.message || 'Failed to load your history');
    } finally {
      if (!ctrl.signal.aborted) setLoadingHistory(false);
    }
  }, [params.slug, addToast]);

  const loadStudio = useCallback(async () => {
    studioAbortRef.current?.abort();
    const ctrl = new AbortController();
    studioAbortRef.current = ctrl;
    try {
      const response = await axios.get(`${API_URL}/public/studios/${params.slug}`, {
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      const studioData = response.data;
      setStudio(studioData);

      const serviceId = searchParams.get('service');
      const occasion = searchParams.get('occasion');

      if (serviceId && studioData.services) {
        const service = studioData.services.find((s: Service) => s.id === serviceId);
        if (service) {
          setSelectedServices([service]);
          setStep(2);
        }
      } else {
        // Fallback: check global cart for this studio's items
        const studioCartItems = cartItems.filter(item => item.studio.slug === params.slug);
        if (studioCartItems.length > 0 && studioData.services) {
          const servicesToSelect = studioData.services.filter((s: Service) =>
            studioCartItems.some((item: any) => item.id === s.id)
          );
          if (servicesToSelect.length > 0) {
            setSelectedServices(servicesToSelect);
          }
        }
      }

      if (occasion) {
        setTimeout(() => {
          const element = document.getElementById(`occasion-${occasion.toLowerCase()}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setHighlightedOccasion(occasion.toLowerCase());
            setTimeout(() => setHighlightedOccasion(null), 3000);
          }
        }, 500);
      }
    } catch (error) {
      if ((error as { name?: string }).name === 'CanceledError') return;
      const e = error as { response?: { data?: { message?: string } } };
      const msg = e.response?.data?.message || 'Studio not found';
      addToast('error', msg);
      setErrorStatus(msg);
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [params.slug, searchParams, addToast]);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('accessToken', token);
      const refreshToken = searchParams.get('refreshToken');
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      window.history.replaceState({}, '', window.location.pathname);
      fetchMe(token);
    } else {
      const storedToken = localStorage.getItem('accessToken');
      if (storedToken) fetchMe(storedToken);
    }
    loadStudio();
    return () => {
      studioAbortRef.current?.abort();
      historyAbortRef.current?.abort();
      slotsAbortRef.current?.abort();
    };
  }, [params.slug, searchParams, fetchMe, loadStudio]);

  useEffect(() => {
    if (activeTab === 'history' && authUser) {
      fetchStudioHistory();
    }
  }, [activeTab, authUser, fetchStudioHistory]);

  // Inject studio font into <head> — beats any CSS specificity including Tailwind base styles.
  // Using a uniquely-id'd <style> tag in document.head is the only reliable way in Next.js
  // App Router because React may de-duplicate/hoist inline <style> tags placed in the body.
  useEffect(() => {
    const font = brand.fontFamily || 'DM Sans';
    const styleId = 'studio-portal-font-override';
    let el = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = styleId;
      document.head.appendChild(el);
    }
    el.textContent = `#studio-portal-root,#studio-portal-root *{font-family:"${font}","DM Sans",sans-serif!important;}`;
    return () => {
      // Clean up on unmount so font doesn't bleed into other routes
      const s = document.getElementById(styleId);
      if (s) s.remove();
    };
  }, [brand.fontFamily]);

  const handleSaveProfile = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    setSavingProfile(true);
    try {
      const res = await axios.patch(`${API_URL}/portal/me`, profileEdits, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAuthUser((prev) => (prev ? { ...prev, ...res.data } : null));
      addToast('success', 'Profile updated successfully!');
    } catch {
      addToast('error', 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setAuthUser(null);
    setBookings([]);
    setInvoices([]);
    setActiveTab('book');
    addToast('success', 'Signed out successfully.');
  };

  const handleAcceptQuote = async (bId: string) => {
    try {
      await portalApi.acceptQuote(bId);
      addToast('success', 'Quote accepted! We will finalize your booking.');
      fetchStudioHistory();
    } catch {
      addToast('error', 'Failed to accept quote.');
    }
  };

  const handleRejectQuote = (bId: string) => {
    setRejectConfirmId(bId);
  };

  const confirmRejectQuote = async () => {
    if (!rejectConfirmId) return;
    const id = rejectConfirmId;
    setRejectConfirmId(null);
    try {
      await portalApi.rejectQuote(id);
      addToast('success', 'Quote rejected.');
      fetchStudioHistory();
    } catch {
      addToast('error', 'Failed to reject quote.');
    }
  };

  const handleSendCounterOffer = async () => {
    if (!counterOfferId || !counterOfferAmount) return;
    const amount = parseFloat(counterOfferAmount);
    if (isNaN(amount) || amount <= 0) {
      addToast('error', 'Please enter a valid amount.');
      return;
    }
    setSendingCounter(true);
    try {
      await portalApi.rejectQuote(counterOfferId, `Counter-offer: ${formatCurrency(amount)}${counterOfferNote ? ' — ' + counterOfferNote : ''}`);
      addToast('success', `Counter-offer of ${formatCurrency(amount)} sent! The partner will review and respond.`);
      setCounterOfferId(null);
      setCounterOfferAmount('');
      setCounterOfferNote('');
      fetchStudioHistory();
    } catch {
      addToast('error', 'Failed to send counter-offer.');
    } finally {
      setSendingCounter(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewBookingId) return;
    setSubmittingReview(true);
    try {
      await portalApi.createReview(reviewBookingId, {
        rating: reviewRating,
        comment: reviewComment,
      });
      addToast('success', 'Thanks for your feedback!');
      setReviewBookingId(null);
      setReviewComment('');
      setReviewRating(5);
      fetchStudioHistory();
    } catch {
      addToast('error', 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const loadTimeSlots = async (serviceId: string, date: string) => {
    slotsAbortRef.current?.abort();
    const ctrl = new AbortController();
    slotsAbortRef.current = ctrl;
    setLoadingSlots(true);
    try {
      const response = await axios.get(
        `${API_URL}/public/studios/${params.slug}/services/${serviceId}/available-slots`,
        { params: { date }, signal: ctrl.signal },
      );
      if (ctrl.signal.aborted) return;
      setTimeSlots(response.data?.slots || []);
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'CanceledError') return;
      addToast('error', 'Failed to load available time slots');
      setTimeSlots([]);
    } finally {
      if (!ctrl.signal.aborted) setLoadingSlots(false);
    }
  };

  const handleServiceToggle = (service: Service) => {
    setSelectedServices((prev) => {
      const exists = prev.some((s) => s.id === service.id);
      if (exists) return prev.filter((s) => s.id !== service.id);
      return [...prev, service];
    });
  };

  const handleProceedToSchedule = () => {
    if (selectedServices.length === 0) return;
    // Use the first selected service for slot availability (shortest duration = most slots)
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedTime('');
    // Use the first selected service to fetch available slots
    const firstService = selectedServices[0];
    if (firstService && date) {
      loadTimeSlots(firstService.id, date);
    }
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedServices.length === 0 || !selectedTime || !customerData.name || !customerData.phone) {
      addToast('error', 'Please fill all required fields');
      return;
    }
    if (studio?.defaultTerms && !acceptedTerms) {
      addToast('error', 'Please accept the terms and conditions');
      return;
    }
    setSubmitting(true);
    try {
      // Fire one booking POST per selected service, all at the same scheduled time
      const results = await Promise.all(
        selectedServices.map((service) =>
          axios.post(`${API_URL}/public/studios/${params.slug}/bookings`, {
            customerName: customerData.name,
            customerEmail: customerData.email || undefined,
            customerPhone: customerData.phone,
            serviceId: service.id,
            scheduledAt: selectedTime,
            customerNotes: customerData.notes || undefined,
            acceptedTerms: acceptedTerms,
          }),
        ),
      );
      setBookingIds(results.map((r) => r.data?.id ?? ''));
      setStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const count = selectedServices.length;
      addToast('success', count > 1 ? `${count} booking requests submitted!` : 'Booking request submitted successfully!');
    } catch (error) {
      const e = error as { response?: { data?: { message?: string } } };
      addToast('error', e.response?.data?.message || 'Failed to submit booking');
    } finally {
      setSubmitting(false);
    }
  };

  const resetBooking = () => {
    setStep(1);
    setSelectedServices([]);
    setSelectedDate('');
    setSelectedTime('');
    setBookingIds([]);
    setAcceptedTerms(false);
    setCustomerData({ name: '', email: '', phone: '', notes: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ------------------------------------------------------------------ */
  /*  Loading / Error states                                             */
  /* ------------------------------------------------------------------ */

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col">
      <div className="h-screen skeleton opacity-10" />
    </div>
  );

  if (!studio)
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center p-8 max-w-sm">
          <Camera className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white mb-2">Partner Not Found</h1>
          <p className="text-white/40">
            {errorStatus || "The partner you're looking for doesn't exist or is not accepting bookings."}
          </p>
        </div>
      </div>
    );

  const minDate = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const btnRadius =
    brand.buttonShape === 'pill' ? '9999px' : brand.buttonShape === 'luxury-sharp' ? '4px' : '12px';

  // Theme-derived colors for text
  const LIGHT_THEMES = ['alabaster-minimal', 'champagne-glow', 'nordic-sage'];
  const isDark = !LIGHT_THEMES.includes(brand.themePreset || '');
  const textPrimary = isDark ? '#ffffff' : '#000000';
  const textSecondary = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)';
  const borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';



  return (
    <div
      id="studio-portal-root"
      className="studio-portal min-h-screen transition-colors duration-1000"
      style={{
        '--studio-primary': brand.primaryColor,
        '--studio-accent': brand.accentColor,
        '--theme-text': textPrimary,
        '--theme-text-sec': textSecondary,
        '--theme-border': borderColor,
        '--theme-card-bg': isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
        '--theme-card-bg-solid': isDark ? '#111111' : '#ffffff',
        color: textPrimary,
        fontFamily: `"${brand.fontFamily}", DM Sans, sans-serif`,
      } as React.CSSProperties}
    >
      {/* ── Theme CSS overrides: make hardcoded Tailwind classes theme-aware ── */}
      <style>{`
        #studio-portal-root .theme-card {
          background: var(--theme-card-bg-solid);
          border-color: var(--theme-border);
          color: var(--theme-text);
        }
        #studio-portal-root .theme-text { color: var(--theme-text) !important; }
        #studio-portal-root .theme-text-sec { color: var(--theme-text-sec) !important; }
        #studio-portal-root .theme-border { border-color: var(--theme-border) !important; }
        #studio-portal-root .theme-bg { background: var(--theme-card-bg) !important; }
      `}</style>

      {/* Theme Background */}
      <ThemeBackground brand={brand} />
      
      {/* Cinematic Grain Overlay */}
      <NoiseOverlay />

      {/* ================================================================ */}
      {/*  HERO HEADER                                                       */}
      {/* ================================================================ */}
      <header className="relative z-10 overflow-hidden" style={{ minHeight: brand.themePreset === 'alabaster-minimal' || brand.themePreset === 'monochrome-pro' ? '70vh' : '95vh', display: 'flex', flexDirection: 'column' }}>

        {/* Noir Luxury: Gold horizontal rule hero */}
        {brand.themePreset === 'noir-luxury' && (
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }} />
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03]">
              <span className="text-[40vw] font-black text-white leading-none select-none" style={{ fontFamily: '"Playfair Display", serif' }}>L</span>
            </div>
          </div>
        )}

        {/* Alabaster: Clean top stripe */}
        {brand.themePreset === 'alabaster-minimal' && (
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: brand.primaryColor }} />
          </div>
        )}

        {/* Cyber Studio: Neon grid overlay */}
        {brand.themePreset === 'cyber-studio' && (
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 -right-20 w-[40vw] h-[40vw] rounded-full opacity-20 blur-[80px]" style={{ backgroundColor: brand.accentColor }} />
          </div>
        )}

        {/* Monochrome Pro: Bold black rule at top */}
        {brand.themePreset === 'monochrome-pro' && (
          <div className="absolute top-0 left-0 right-0 h-4 bg-black" />
        )}

        {/* TOP NAV BAR */}
        <div className="relative z-20 flex items-center justify-between px-6 sm:px-12 lg:px-16 pt-8 sm:pt-10">
          {/* Logo + Brand */}
          <div className="flex items-center gap-3">
            {studio.logoUrl && (
              <div className={cn(
                "relative h-10 w-10 overflow-hidden flex-shrink-0",
                brand.themePreset === 'monochrome-pro' ? "border-2 border-black rounded-none" : "rounded-lg border",
              )} style={{ borderColor }}
              >
                <NextImage
                  src={studio.logoUrl.startsWith('http') ? studio.logoUrl : `${API_URL}${studio.logoUrl.startsWith('/') ? '' : '/'}${studio.logoUrl}`}
                  alt={studio.name} fill className="object-contain p-1" sizes="40px"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            )}
            <div>
              <div className={cn(
                "text-[10px] font-black uppercase tracking-[0.3em]",
                brand.themePreset === 'monochrome-pro' ? "text-black" : "opacity-40"
              )} style={{ color: brand.themePreset === 'monochrome-pro' ? '#000' : textPrimary }}>
                ReviewsFeedback
              </div>
              <div className="text-xs font-bold" style={{ color: textSecondary }}>{studio.name}</div>
            </div>
          </div>

          {/* Navigation items */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-[10px] font-bold tracking-[0.2em] uppercase transition-all hover:opacity-70" style={{ color: textSecondary }}>Marketplace</Link>
            <button
              onClick={() => { navigator.clipboard?.writeText(window.location.href); addToast('success', 'Link copied!'); }}
              className="text-[10px] font-bold tracking-[0.2em] uppercase transition-all hover:opacity-70 flex items-center gap-1"
              style={{ color: textSecondary }}
            >
              Share <Plus className="h-3 w-3" />
            </button>
          </div>

          {/* Auth */}
          {authUser ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (activeTab === 'book') setActiveTab('history');
                  else setActiveTab('book');
                }}
                className={cn(
                  "hidden sm:flex items-center gap-2 px-4 py-2 border transition-all text-[10px] font-black uppercase tracking-widest",
                  brand.themePreset === 'monochrome-pro' ? "rounded-none border-black" : "rounded-full"
                )}
                style={{ borderColor, color: textPrimary }}
              >
                {activeTab === 'book' ? 'My History' : 'Back to Shop'}
              </button>
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 border",
                brand.themePreset === 'monochrome-pro' ? "rounded-none border-black" : "rounded-full"
              )} style={{ borderColor }}>
                <div className="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-black" style={{ backgroundColor: brand.primaryColor }}>
                  {(authUser.name || '?').charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-medium hidden sm:block max-w-[80px] truncate" style={{ color: textPrimary }}>{authUser.name}</span>
              </div>
              <button onClick={handleLogout} className="p-2 border rounded-full" style={{ borderColor, color: textSecondary }}>
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => { const returnUrl = encodeURIComponent(window.location.pathname); window.location.href = `${API_URL}/auth/google?returnTo=${returnUrl}`; }}
              className={cn(
                "flex items-center gap-2 text-xs font-bold px-4 py-2 border transition-all hover:opacity-80 shadow-sm",
                brand.themePreset === 'monochrome-pro' ? "rounded-none bg-black text-white border-black" :
                brand.themePreset === 'alabaster-minimal' ? "rounded-full bg-black text-white border-transparent" :
                "rounded-full border"
              )}
              style={brand.themePreset !== 'monochrome-pro' && brand.themePreset !== 'alabaster-minimal' ? { borderColor, color: textPrimary, backgroundColor: 'rgba(255,255,255,0.08)' } : {}}
            >
              <Chrome className="h-4 w-4" />
              <span className="hidden sm:block">Sign in</span>
            </button>
          )}
        </div>

        {/* HERO CONTENT */}
        <div className="flex-1 flex flex-col justify-end px-6 sm:px-12 lg:px-16 pb-16 sm:pb-24 relative z-10 mt-auto">

          {/* Noir Luxury: Gold eyebrow + massive serif title */}
          {brand.themePreset === 'noir-luxury' && (
            <>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-[1px] w-16" style={{ backgroundColor: '#D4AF37' }} />
                <span className="text-[10px] font-bold uppercase tracking-[0.4em]" style={{ color: '#D4AF37' }}>Partner Experience · Est. Kurnool</span>
              </div>
              <h1 className="mb-6" style={{ fontSize: 'clamp(3.5rem, 8vw, 9rem)', fontWeight: 700, lineHeight: 0.85, fontFamily: '"Playfair Display", serif', color: '#ffffff', letterSpacing: '-0.03em' }}>
                {brand.headerText}
              </h1>
              {brand.tagline && <p className="mb-10 max-w-lg" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1.1rem', fontStyle: 'italic', fontFamily: '"Playfair Display", serif' }}>{brand.tagline}</p>}
              <div className="flex flex-wrap gap-4 items-center">
                <button onClick={() => { const el = document.getElementById('portal-content'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
                  className="flex items-center gap-3 px-8 py-4 text-xs font-black uppercase tracking-[0.3em] transition-all hover:scale-105"
                  style={{ backgroundColor: '#D4AF37', color: '#0a0a0b', borderRadius: btnRadius }}>
                  Book an Appointment <ArrowRight className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-4 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  <a href={`tel:${studio.phone}`} className="flex items-center gap-2 hover:text-[#D4AF37] transition-colors">
                    <Phone className="h-3.5 w-3.5" />{studio.phone}
                  </a>
                  {(studio.address || studio.city) && <><span>·</span><span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{[studio.city, studio.state].filter(Boolean).join(', ')}</span></>}
                </div>
              </div>
            </>
          )}

          {/* Alabaster Minimal: Clean, left-aligned black text */}
          {brand.themePreset === 'alabaster-minimal' && (
            <>
              <div className="mb-4" style={{ color: 'rgba(0,0,0,0.35)', fontSize: '0.7rem', letterSpacing: '0.35em', textTransform: 'uppercase', fontWeight: 700 }}>Professional Partner</div>
              <h1 className="mb-6" style={{ fontSize: 'clamp(3rem, 7vw, 7.5rem)', fontWeight: 800, lineHeight: 0.88, color: '#111827', letterSpacing: '-0.04em', fontFamily: '"Outfit", sans-serif' }}>
                {brand.headerText}
              </h1>
              {brand.tagline && <p className="mb-10 max-w-md" style={{ color: 'rgba(0,0,0,0.45)', fontSize: '1.05rem', lineHeight: 1.6 }}>{brand.tagline}</p>}
              <div className="flex gap-4 items-center">
                <button onClick={() => { const el = document.getElementById('portal-content'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
                  className="flex items-center gap-2 px-6 py-3.5 text-xs font-bold uppercase tracking-[0.2em] hover:opacity-80 transition-all"
                  style={{ backgroundColor: '#111827', color: '#fff', borderRadius: '9999px' }}>
                  Book Now <ArrowRight className="h-4 w-4" />
                </button>
                <a href={`tel:${studio.phone}`} className="text-xs font-medium" style={{ color: 'rgba(0,0,0,0.4)' }}>{studio.phone}</a>
              </div>
              {[studio.city, studio.state].filter(Boolean).length > 0 && (
                <p className="mt-6 text-xs flex items-center gap-2" style={{ color: 'rgba(0,0,0,0.3)' }}>
                  <MapPin className="h-3 w-3" />{[studio.address, studio.city, studio.state].filter(Boolean).join(', ')}
                </p>
              )}
            </>
          )}

          {/* Monochrome Pro: Bold brutalist B&W */}
          {brand.themePreset === 'monochrome-pro' && (
            <>
              <div className="border-l-4 border-black pl-6 mb-8">
                <div className="text-xs font-black uppercase tracking-[0.4em] mb-2" style={{ color: 'rgba(0,0,0,0.4)' }}>Photography · Fine Art · Commercial</div>
                <h1 className="" style={{ fontSize: 'clamp(3.5rem, 9vw, 10rem)', fontWeight: 900, lineHeight: 0.82, color: '#000', letterSpacing: '-0.05em', fontFamily: '"Inter", sans-serif' }}>
                  {brand.headerText}
                </h1>
              </div>
              {brand.tagline && <p className="mb-8 max-w-md" style={{ color: 'rgba(0,0,0,0.5)', fontSize: '1rem' }}>{brand.tagline}</p>}
              <div className="flex gap-0">
                <button onClick={() => { const el = document.getElementById('portal-content'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
                  className="flex items-center gap-3 px-8 py-4 text-xs font-black uppercase tracking-[0.3em] bg-black text-white hover:bg-gray-900 transition-all"
                  style={{ borderRadius: '0' }}>
                  Book <ArrowRight className="h-4 w-4" />
                </button>
                <div className="flex items-center px-6 border border-black text-xs font-bold" style={{ color: 'rgba(0,0,0,0.6)' }}>
                  {studio.phone}
                </div>
              </div>
            </>
          )}

          {/* Cyber Studio: Neon violet glow */}
          {brand.themePreset === 'cyber-studio' && (
            <>
              <div className="mb-6 flex items-center gap-3">
                <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: brand.accentColor }} />
                <span className="text-[10px] font-bold uppercase tracking-[0.4em]" style={{ color: brand.accentColor }}>Partner Presence · Active</span>
              </div>
              <h1 className="mb-6" style={{ fontSize: 'clamp(3rem, 7vw, 8rem)', fontWeight: 900, lineHeight: 0.85, fontFamily: '"Space Grotesk", sans-serif', letterSpacing: '-0.04em', color: '#fff' }}>
                {brand.headerText}
              </h1>
              {brand.tagline && <p className="mb-10 max-w-lg" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.05rem' }}>{brand.tagline}</p>}
              <div className="flex gap-4 flex-wrap items-center">
                <button onClick={() => { const el = document.getElementById('portal-content'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
                  className="flex items-center gap-2 px-8 py-4 text-xs font-black uppercase tracking-[0.25em] transition-all hover:scale-105"
                  style={{ backgroundColor: brand.accentColor, color: '#0d0015', borderRadius: brand.themePreset === 'cyber-studio' ? '4px' : btnRadius, boxShadow: `0 0 40px ${brand.accentColor}50` }}>
                  Book Appointment <ArrowRight className="h-4 w-4" />
                </button>
                <a href={`tel:${studio.phone}`} className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>{studio.phone}</a>
              </div>
            </>
          )}

          {/* Arctic Dawn: Cool frosted */}
          {brand.themePreset === 'arctic-dawn' && (
            <>
              <div className="mb-6">
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] px-4 py-2 border" style={{ color: brand.accentColor, borderColor: `${brand.accentColor}40`, borderRadius: '9999px' }}>Premium Partner Services</span>
              </div>
              <h1 className="mb-6" style={{ fontSize: 'clamp(3rem, 7vw, 8rem)', fontWeight: 800, lineHeight: 0.85, fontFamily: '"Montserrat", sans-serif', letterSpacing: '-0.04em', color: '#fff' }}>
                {brand.headerText}
              </h1>
              {brand.tagline && <p className="mb-10 max-w-lg" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1.05rem' }}>{brand.tagline}</p>}
              <div className="flex gap-4 flex-wrap items-center">
                <button onClick={() => { const el = document.getElementById('portal-content'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
                  className="flex items-center gap-2 px-8 py-4 text-xs font-black uppercase tracking-[0.25em] transition-all hover:scale-105"
                  style={{ backgroundColor: brand.accentColor, color: '#0f172a', borderRadius: '9999px', boxShadow: `0 0 40px ${brand.accentColor}40` }}>
                  Book Now <ArrowRight className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-4 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  <a href={`tel:${studio.phone}`} className="hover:text-white transition-colors flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{studio.phone}</a>
                  {[studio.city, studio.state].filter(Boolean).length > 0 && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{[studio.city, studio.state].filter(Boolean).join(', ')}</span>}
                </div>
              </div>
            </>
          )}

          {/* Royal Velvet: Crimson luxury */}
          {brand.themePreset === 'royal-velvet' && (
            <>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-[1px] w-12" style={{ backgroundColor: '#E11D48' }} />
                <span className="text-[10px] uppercase tracking-[0.4em] font-bold" style={{ color: '#E11D48' }}>Exclusive Partner · Kurnool</span>
              </div>
              <h1 className="mb-6" style={{ fontSize: 'clamp(3rem, 7vw, 8rem)', fontWeight: 700, lineHeight: 0.85, fontFamily: '"Playfair Display", serif', letterSpacing: '-0.03em', color: '#fff' }}>
                {brand.headerText}
              </h1>
              {brand.tagline && <p className="mb-10 max-w-lg" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1.05rem', fontStyle: 'italic', fontFamily: '"Playfair Display", serif' }}>{brand.tagline}</p>}
              <div className="flex gap-4 flex-wrap items-center">
                <button onClick={() => { const el = document.getElementById('portal-content'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
                  className="flex items-center gap-2 px-8 py-4 text-xs font-bold uppercase tracking-[0.25em] transition-all hover:opacity-90"
                  style={{ backgroundColor: '#E11D48', color: '#fff', borderRadius: '4px', boxShadow: '0 0 30px rgba(225,29,72,0.3)' }}>
                  Reserve Booking <ArrowRight className="h-4 w-4" />
                </button>
                <a href={`tel:${studio.phone}`} className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{studio.phone}</a>
              </div>
            </>
          )}

          {/* Sage Artisan: Organic, teal */}
          {brand.themePreset === 'sage-artisan' && (
            <>
              <div className="mb-5 inline-block px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.3em]" style={{ color: brand.accentColor, backgroundColor: `${brand.accentColor}15`, borderRadius: '8px' }}>Partner Services</div>
              <h1 className="mb-6" style={{ fontSize: 'clamp(3rem, 7vw, 8rem)', fontWeight: 800, lineHeight: 0.85, letterSpacing: '-0.04em', color: '#fff' }}>
                {brand.headerText}
              </h1>
              {brand.tagline && <p className="mb-10 max-w-lg" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1.05rem', lineHeight: 1.6 }}>{brand.tagline}</p>}
              <div className="flex gap-4 items-center flex-wrap">
                <button onClick={() => { const el = document.getElementById('portal-content'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
                  className="flex items-center gap-2 px-8 py-4 text-xs font-bold uppercase tracking-[0.25em]"
                  style={{ backgroundColor: brand.accentColor, color: '#0e2a30', borderRadius: '9999px' }}>
                  Book Now <ArrowRight className="h-4 w-4" />
                </button>
                {[studio.city, studio.state].filter(Boolean).length > 0 && (
                  <p className="text-xs flex items-center gap-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    <MapPin className="h-3.5 w-3.5" />{[studio.city, studio.state].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Golden Hour: Warm, earthy */}
          {brand.themePreset === 'golden-hour' && (
            <>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-[1px] w-10" style={{ backgroundColor: '#FFA500' }} />
                <span className="text-[10px] uppercase tracking-[0.4em] font-bold" style={{ color: '#FFA500' }}>Photography · Kurnool</span>
              </div>
              <h1 className="mb-6" style={{ fontSize: 'clamp(3rem, 7vw, 8rem)', fontWeight: 700, lineHeight: 0.85, fontFamily: '"Cormorant Garamond", serif', letterSpacing: '-0.03em', color: '#f0e0c0' }}>
                {brand.headerText}
              </h1>
              {brand.tagline && <p className="mb-10 max-w-lg" style={{ color: 'rgba(240,224,192,0.6)', fontSize: '1.05rem', fontStyle: 'italic', fontFamily: '"Cormorant Garamond", serif', lineHeight: 1.6 }}>{brand.tagline}</p>}
              <div className="flex gap-4 items-center flex-wrap">
                <button onClick={() => { const el = document.getElementById('portal-content'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
                  className="flex items-center gap-2 px-8 py-4 text-xs font-bold uppercase tracking-[0.3em] hover:opacity-90 transition-all"
                  style={{ backgroundColor: '#FFA500', color: '#1a0e00', borderRadius: '8px' }}>
                  Book Appointment <ArrowRight className="h-4 w-4" />
                </button>
                <a href={`tel:${studio.phone}`} className="text-xs" style={{ color: 'rgba(240,224,192,0.4)' }}>{studio.phone}</a>
              </div>
            </>
          )}

          {/* Midnight Radiant: Deep blue neon */}
          {brand.themePreset === 'midnight-vibrant' && (
            <>
              <div className="mb-5 flex items-center gap-3">
                <div className="h-2 w-16 rounded-full" style={{ background: `linear-gradient(90deg, ${brand.accentColor}, transparent)` }} />
                <span className="text-[10px] font-bold uppercase tracking-[0.35em]" style={{ color: brand.accentColor }}>Partner Services</span>
              </div>
              <h1 className="mb-6" style={{ fontSize: 'clamp(3rem, 7vw, 8rem)', fontWeight: 800, lineHeight: 0.85, fontFamily: '"Plus Jakarta Sans", sans-serif', letterSpacing: '-0.04em', color: '#fff' }}>
                {brand.headerText}
              </h1>
              {brand.tagline && <p className="mb-10 max-w-lg" style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1.05rem' }}>{brand.tagline}</p>}
              <div className="flex gap-4 items-center flex-wrap">
                <button onClick={() => { const el = document.getElementById('portal-content'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
                  className="flex items-center gap-2 px-8 py-4 text-xs font-black uppercase tracking-[0.25em] transition-all hover:scale-105"
                  style={{ backgroundColor: brand.accentColor, color: '#fff', borderRadius: '0.75rem', boxShadow: `0 0 40px ${brand.accentColor}40` }}>
                  Book Appointment <ArrowRight className="h-4 w-4" />
                </button>
                {[studio.city, studio.state].filter(Boolean).length > 0 && (
                  <span className="text-xs flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}><MapPin className="h-3.5 w-3.5" />{[studio.city, studio.state].filter(Boolean).join(', ')}</span>
                )}
              </div>
            </>
          )}

          {/* Desert Stone: Warm earthy */}
          {brand.themePreset === 'desert-stone' && (
            <>
              <div className="flex items-center gap-4 mb-6">
                <div className="h-[1px] w-10" style={{ backgroundColor: '#F4A460' }} />
                <span className="text-[10px] uppercase tracking-[0.4em] font-bold" style={{ color: '#F4A460' }}>Photography · Kurnool</span>
              </div>
              <h1 className="mb-6" style={{ fontSize: 'clamp(3rem, 7vw, 8rem)', fontWeight: 700, lineHeight: 0.85, fontFamily: '"Lora", serif', letterSpacing: '-0.03em', color: '#f0e0c0' }}>
                {brand.headerText}
              </h1>
              {brand.tagline && <p className="mb-10 max-w-lg" style={{ color: 'rgba(240,224,192,0.55)', fontSize: '1.05rem', fontFamily: '"Lora", serif', lineHeight: 1.6, fontStyle: 'italic' }}>{brand.tagline}</p>}
              <div className="flex gap-4 items-center flex-wrap">
                <button onClick={() => { const el = document.getElementById('portal-content'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
                  className="flex items-center gap-2 px-8 py-4 text-xs font-bold uppercase tracking-[0.3em] hover:opacity-90 transition-all"
                  style={{ backgroundColor: '#F4A460', color: '#1c0e06', borderRadius: '8px' }}>
                  Book Appointment <ArrowRight className="h-4 w-4" />
                </button>
                <a href={`tel:${studio.phone}`} className="text-xs" style={{ color: 'rgba(240,224,192,0.4)' }}>{studio.phone}</a>
              </div>
            </>
          )}

          {/* Onyx Prestige: High-end luxury gold/black */}
          {brand.themePreset === 'onyx-prestige' && (
            <>
              <div className="mb-6 flex items-center gap-4">
                <span className="text-[10px] font-black uppercase tracking-[0.5em]" style={{ color: '#D4AF37' }}>High-End Photography</span>
                <div className="flex-1 h-[1px]" style={{ background: 'linear-gradient(90deg, #D4AF37 0%, transparent 100%)' }} />
              </div>
              <h1 className="mb-8" style={{ fontSize: 'clamp(3.5rem, 8.5vw, 9.5rem)', fontWeight: 300, lineHeight: 0.8, fontFamily: '"Cormorant Garamond", serif', color: '#fff', letterSpacing: '-0.02em' }}>
                {brand.headerText || 'Prestige Partner'}
              </h1>
              {brand.tagline && <p className="mb-12 max-w-xl text-lg italic opacity-60" style={{ fontFamily: '"Cormorant Garamond", serif' }}>{brand.tagline}</p>}
              <div className="flex flex-wrap gap-6 items-center">
                <button onClick={() => { const el = document.getElementById('portal-content'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
                  className="group relative px-10 py-5 text-[11px] font-black uppercase tracking-[0.4em] transition-all overflow-hidden"
                  style={{ backgroundColor: '#D4AF37', color: '#000', borderRadius: '2px' }}>
                  <span className="relative z-10">Schedule Appointment</span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </button>
                <div className="h-[1px] w-12 bg-white/20" />
                <a href={`tel:${studio.phone}`} className="text-[10px] font-bold tracking-widest opacity-40 hover:opacity-100 transition-opacity" style={{ color: '#fff' }}>{studio.phone}</a>
              </div>
            </>
          )}

          {/* Vintage Film: Nostalgic & warm */}
          {brand.themePreset === 'vintage-film' && (
            <div className="max-w-3xl">
              <div className="inline-block px-3 py-1 mb-6 border border-white/20 text-[9px] font-bold uppercase tracking-[0.3em] opacity-60">
                Premium Film Aesthetic
              </div>
              <h1 className="mb-6" style={{ fontSize: 'clamp(3rem, 7.5vw, 8rem)', fontWeight: 700, lineHeight: 0.9, fontFamily: '"Playfair Display", serif', color: '#F5F5DC' }}>
                {brand.headerText}
              </h1>
              {brand.tagline && <p className="mb-10 text-xl opacity-70 italic leading-relaxed" style={{ fontFamily: '"Playfair Display", serif', color: '#D2B48C' }}>{brand.tagline}</p>}
              <div className="flex items-center gap-6">
                <button onClick={() => { const el = document.getElementById('portal-content'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
                  className="px-8 py-4 text-xs font-bold uppercase tracking-[0.2em] transition-all hover:bg-white hover:text-black"
                  style={{ border: '1px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: btnRadius }}>
                  Book Now
                </button>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest opacity-40">Contact Partner</span>
                  <span className="text-sm font-medium" style={{ color: '#D2B48C' }}>{studio.phone}</span>
                </div>
              </div>
            </div>
          )}

          {/* Nordic Sage: Light, organic, minimal */}
          {brand.themePreset === 'nordic-sage' && (
            <>
              <div className="mb-6 h-[2px] w-12" style={{ backgroundColor: brand.primaryColor }} />
              <h1 className="mb-8" style={{ fontSize: 'clamp(3rem, 7vw, 7.5rem)', fontWeight: 800, lineHeight: 0.9, color: '#1A1C16', letterSpacing: '-0.04em', fontFamily: '"Inter", sans-serif' }}>
                 {brand.headerText}
              </h1>
              {brand.tagline && <p className="mb-12 max-w-md text-lg leading-relaxed text-[#4A4D42]">{brand.tagline}</p>}
              <div className="flex gap-4 items-center">
                <button onClick={() => { const el = document.getElementById('portal-content'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
                  className="px-8 py-4 text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-[#78866B20] transition-all hover:translate-y-[-2px]"
                  style={{ backgroundColor: '#1A1C16', color: '#fff', borderRadius: '4px' }}>
                  Explore Services
                </button>
                <div className="w-10 h-[1px] bg-black/10" />
                <span className="text-xs font-bold opacity-40">{studio.city}</span>
              </div>
            </>
          )}

          {/* Ethereal Dream: Purple magical vibe */}
          {brand.themePreset === 'ethereal-dream' && (
            <div className="text-center mx-auto max-w-4xl">
              <Sparkles className="h-6 w-6 mx-auto mb-6 opacity-50" style={{ color: brand.accentColor }} />
              <h1 className="mb-8" style={{ fontSize: 'clamp(3.5rem, 8vw, 9.5rem)', fontWeight: 900, lineHeight: 0.8, color: '#fff', letterSpacing: '-0.05em', filter: 'drop-shadow(0 0 30px rgba(192,132,252,0.3))' }}>
                {brand.headerText}
              </h1>
              {brand.tagline && <p className="mb-10 text-xl opacity-60 max-w-xl mx-auto">{brand.tagline}</p>}
              <div className="flex justify-center gap-6">
                <button onClick={() => { const el = document.getElementById('portal-content'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
                  className="px-10 py-5 text-xs font-black uppercase tracking-[0.3em] transition-all hover:scale-105 active:scale-95"
                  style={{ backgroundColor: brand.accentColor, color: '#fff', borderRadius: '9999px', boxShadow: `0 20px 40px ${brand.accentColor}30` }}>
                  Get Started
                </button>
              </div>
            </div>
          )}

          {/* Industrial Loft: Bold brutalist */}
          {brand.themePreset === 'industrial-loft' && (
            <>
               <div className="text-[8vw] font-black uppercase leading-[0.75] mb-8" style={{ color: '#fff', letterSpacing: '-0.06em' }}>
                 {brand.headerText}
               </div>
               <div className="flex gap-8 items-start">
                  <div className="w-1 bg-[#EA580C] self-stretch" />
                  <div className="max-w-md">
                    {brand.tagline && <p className="text-lg font-bold mb-8 leading-tight opacity-70 uppercase tracking-tighter" style={{ color: '#fff' }}>{brand.tagline}</p>}
                    <button onClick={() => { const el = document.getElementById('portal-content'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
                      className="inline-flex items-center gap-4 bg-[#EA580C] text-black px-8 py-5 text-sm font-black uppercase tracking-tighter hover:bg-white transition-colors">
                      Book Now <ArrowRight className="h-5 w-5" />
                    </button>
                  </div>
               </div>
            </>
          )}

          {/* Champagne Glow: Soft bridal luxury */}
          {brand.themePreset === 'champagne-glow' && (
            <div className="text-center mx-auto max-w-3xl">
              <div className="text-[10px] font-bold uppercase tracking-[0.4em] mb-6" style={{ color: '#C5A059' }}>Professional Partner Experience</div>
              <h1 className="mb-8" style={{ fontSize: 'clamp(3rem, 6vw, 6.5rem)', fontWeight: 200, lineHeight: 1, fontFamily: '"Josefin Sans", sans-serif', color: '#1a1a1a' }}>
                {brand.headerText}
              </h1>
              {brand.tagline && <p className="mb-12 text-lg opacity-50 italic" style={{ fontFamily: '"Josefin Sans", sans-serif' }}>{brand.tagline}</p>}
              <button onClick={() => { const el = document.getElementById('portal-content'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
                className="px-12 py-4 border border-[#C5A059] text-[10px] font-bold uppercase tracking-[0.3em] text-[#C5A059] hover:bg-[#C5A059] hover:text-white transition-all duration-500"
                style={{ borderRadius: '9999px' }}>
                Contact & Booking
              </button>
            </div>
          )}

          {/* Default / Generic fallback */}
          {!['noir-luxury','alabaster-minimal','monochrome-pro','cyber-studio','arctic-dawn','royal-velvet','sage-artisan','golden-hour','midnight-vibrant','desert-stone', 'onyx-prestige', 'vintage-film', 'nordic-sage', 'ethereal-dream', 'industrial-loft', 'champagne-glow'].includes(brand.themePreset || '') && (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="h-[1px] w-10" style={{ backgroundColor: brand.accentColor }} />
                <span className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: brand.accentColor }}>Professional Partner</span>
              </div>
              <h1 className="mb-6" style={{ fontSize: 'clamp(3rem, 7vw, 8rem)', fontWeight: 900, lineHeight: 0.85, color: textPrimary, letterSpacing: '-0.04em' }}>
                {brand.headerText}
              </h1>
              {brand.tagline && <p className="mb-10 max-w-lg" style={{ color: textSecondary, fontSize: '1.05rem' }}>{brand.tagline}</p>}
              <div className="flex gap-4 items-center flex-wrap">
                <button onClick={() => { const el = document.getElementById('portal-content'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }}
                  className="flex items-center gap-2 px-8 py-4 text-xs font-bold uppercase tracking-[0.25em] hover:opacity-90 transition-all"
                  style={{ backgroundColor: brand.primaryColor, color: getContrastColor(brand.primaryColor), borderRadius: btnRadius }}>
                  Book Appointment <ArrowRight className="h-4 w-4" />
                </button>
                <a href={`tel:${studio.phone}`} className="text-xs" style={{ color: textSecondary }}>{studio.phone}</a>
              </div>
            </>
          )}

          {/* Hot deal badge */}
          {studio.hotDeal && (
            <div className="mt-8 inline-flex items-center gap-3 px-4 py-2 border" style={{ borderColor: `${brand.accentColor}40`, backgroundColor: `${brand.accentColor}15`, borderRadius: btnRadius }}>
              <Sparkles className="h-4 w-4 animate-pulse" style={{ color: brand.accentColor }} />
              <span className="text-xs font-bold" style={{ color: brand.accentColor }}>{studio.hotDeal}</span>
            </div>
          )}
        </div>

        {/* bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none" style={{ background: `linear-gradient(to bottom, transparent, ${isDark ? '#050508' : brand.themePreset === 'alabaster-minimal' ? '#FDFCF0' : '#ffffff'})` }} />
      </header>

      {/* ================================================================ */}
      {/*  TAB NAV — theme-aware                                            */}
      {/* ================================================================ */}
      <div
        className="sticky top-0 z-50 backdrop-blur-xl border-b"
        style={{
          backgroundColor: isDark ? 'rgba(5,5,8,0.88)' : 'rgba(255,255,255,0.9)',
          borderColor,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-12 flex items-center justify-between h-14">
          <div className="flex h-full gap-0">
            {([
              { id: 'book' as const, label: 'Book', icon: BookOpen },
              { id: 'history' as const, label: 'My Bookings', icon: History },
              { id: 'account' as const, label: 'Account', icon: User },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'flex items-center gap-2 px-4 sm:px-6 h-full text-xs font-bold uppercase tracking-[0.15em] border-b-2 transition-all duration-200',
                  activeTab === id ? 'border-current' : 'border-transparent opacity-30 hover:opacity-60',
                )}
                style={{
                  color: activeTab === id ? brand.primaryColor : textPrimary,
                  borderColor: activeTab === id ? brand.primaryColor : 'transparent',
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:block">{label}</span>
                <span className="sm:hidden">{label.split(' ')[0]}</span>
              </button>
            ))}
          </div>
          <span className="text-[11px] font-bold uppercase tracking-widest opacity-30" style={{ color: textPrimary }}>
            {studio.services?.length || 0} Services
          </span>
        </div>
      </div>

      {/* ================================================================ */}
      {/*  MAIN CONTENT                                                      */}
      {/* ================================================================ */}
      <main
        id="portal-content"
        className={cn(
          "max-w-7xl mx-auto px-6 sm:px-12 py-14 relative z-10",
          brand.layoutMode === 'split' && "grid lg:grid-cols-12 gap-12"
        )}
      >
        {/* Split sidebar */}
        {brand.layoutMode === 'split' && activeTab === 'book' && (
          <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 h-fit">
            <div className="p-7 border" style={{ borderColor, borderRadius: brand.themePreset === 'monochrome-pro' ? '0' : '1.5rem', backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
              <div className="text-[9px] font-black uppercase tracking-[0.35em] mb-5" style={{ color: brand.primaryColor }}>Partner Info</div>
              <div className="flex items-center gap-3 mb-6">
                <div className="h-12 w-12 flex items-center justify-center" style={{ backgroundColor: `${brand.primaryColor}18`, borderRadius: brand.themePreset === 'monochrome-pro' ? '0' : '1rem' }}>
                  <Camera className="h-5 w-5" style={{ color: brand.primaryColor }} />
                </div>
                <div>
                  <div className="font-black text-base" style={{ color: textPrimary }}>{studio.name}</div>
                  <div className="text-xs" style={{ color: textSecondary }}>{[studio.city, studio.state].filter(Boolean).join(', ')}</div>
                </div>
              </div>
              {brand.tagline && <p className="text-sm mb-5 leading-relaxed" style={{ color: textSecondary }}>{brand.tagline}</p>}
              <div className="space-y-3 pt-5 border-t" style={{ borderColor }}>
                <a href={`mailto:${studio.email}`} className="flex items-center gap-3 text-xs hover:opacity-80 transition-opacity" style={{ color: textSecondary }}><Mail className="h-4 w-4" />{studio.email}</a>
                <a href={`tel:${studio.phone}`} className="flex items-center gap-3 text-xs hover:opacity-80 transition-opacity" style={{ color: textSecondary }}><Phone className="h-4 w-4" />{studio.phone}</a>
                {[studio.address, studio.city, studio.state].filter(Boolean).length > 0 && (
                  <div className="flex items-center gap-3 text-xs" style={{ color: textSecondary }}><MapPin className="h-4 w-4" />{[studio.address, studio.city, studio.state].filter(Boolean).join(', ')}</div>
                )}
              </div>
            </div>
          </aside>
        )}

        <div className={brand.layoutMode === 'split' ? "lg:col-span-8" : "w-full"}>
           {/* ============================================================== */}
           {/*  BOOK TAB                                                       */}
           {/* ============================================================== */}
           {activeTab === 'book' && (
          <>
            {/* Step 1: Services */}
            {step === 1 && (

              <div className={cn('animate-fade-in', selectedServices.length > 0 && 'pb-28')}>
                {/* Section header */}
                <div className={cn(
                    "mb-12",
                    brand.layoutMode === 'centered' && "text-center mx-auto"
                )}>
                  <div
                    className="text-xs font-bold uppercase tracking-[0.25em] mb-3"
                    style={{ color: brand.primaryColor }}
                  >
                    Choose Your Booking
                  </div>
                  <h2
                    className="leading-tight tracking-tight relative z-20"
                    style={{
                      fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
                      fontWeight: 900,
                      color: textPrimary,
                      fontFamily: `"${brand.fontFamily}", DM Sans, sans-serif`,
                    }}
                  >
                    What&apos;s the{' '}
                    <span style={{ color: brand.primaryColor }}>Occasion?</span>
                  </h2>

                  <div className={cn(
                      "mt-8 max-w-md relative group",
                      brand.layoutMode === 'centered' && "mx-auto"
                  )}>
                    <Input
                      placeholder="Search services..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={cn(
                          "backdrop-blur-sm focus:ring-1 transition-all pl-10",
                          isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/20" : "bg-black/5 border-black/8 text-black placeholder:text-black/20"
                      )}
                      style={{ borderRadius: btnRadius }}
                    />
                    <Sparkles className={cn(
                        "absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 group-focus-within:text-primary transition-colors"
                    )} style={{ color: textSecondary }} />
                  </div>
                </div>

                {hasOccasions ? (
                  <div className="space-y-16">
                    {Object.entries(occasionGroups).map(([occasion, services]) => {
                      const filteredServices = services.filter(s =>
                        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (s.description || '').toLowerCase().includes(searchTerm.toLowerCase())
                      );
                      if (filteredServices.length === 0) return null;

                      const OccIcon = getOccasionIcon(occasion);
                      return (
                        <div
                          key={occasion}
                          id={`occasion-${occasion.toLowerCase()}`}
                          className={cn(
                            'transition-all duration-700',
                            highlightedOccasion === occasion.toLowerCase() && 'ring-2 ring-primary ring-offset-8 rounded-sm',
                          )}
                        >
                          <div className="flex items-center gap-6 mb-10">
                            <div
                              className="h-16 w-16 rounded-3xl flex items-center justify-center shadow-2xl backdrop-blur-xl border-white/5"
                              style={{
                                backgroundColor: hexAlpha(brand.primaryColor, '15'),
                                color: brand.primaryColor,
                                borderWidth: '1px',
                              }}
                            >
                              <OccIcon className="h-8 w-8" />
                            </div>
                            <div>
                              <h3 style={{ color: textPrimary }} className="text-3xl font-black uppercase tracking-tight">
                                {occasion}
                              </h3>
                              <p style={{ color: textSecondary }} className="text-sm mt-1">
                                {filteredServices.length} ENGAGEMENTS AVAILABLE
                              </p>
                            </div>
                          </div>

                          <div className={cn(
                            "grid gap-8",
                            brand.layoutMode === 'centered' ? "grid-cols-1 max-w-2xl mx-auto" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                          )}>
                            {filteredServices.map((service) => (
                              <ServiceCard
                                key={service.id}
                                service={service}
                                primaryColor={brand.primaryColor}
                                accentColor={brand.accentColor}
                                onClick={() => handleServiceToggle(service)}
                                isSelected={selectedServices.some((s) => s.id === service.id)}
                                cardTheme={brand.cardTheme}
                                buttonShape={brand.buttonShape}
                                dark={isDark}
                                themePreset={brand.themePreset}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={cn(
                     "grid gap-8",
                     brand.layoutMode === 'centered' ? "grid-cols-1 max-w-2xl mx-auto" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                  )}>
                    {(studio.services || [])
                      .filter(s =>
                        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (s.description || '').toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((service) => (
                        <ServiceCard
                          key={service.id}
                          service={service}
                          primaryColor={brand.primaryColor}
                          accentColor={brand.accentColor}
                          onClick={() => handleServiceToggle(service)}
                          isSelected={selectedServices.some((s) => s.id === service.id)}
                          cardTheme={brand.cardTheme}
                          buttonShape={brand.buttonShape}
                          dark={isDark}
                          themePreset={brand.themePreset}
                        />
                      ))}
                  </div>
                )}

                {/* Portfolio section */}
                {(studio.portfolioItems?.length ?? 0) > 0 && (
                  <div className="mt-24">
                    <div className="mb-10">
                      <div
                        className="text-xs font-bold uppercase tracking-[0.25em] mb-3"
                        style={{ color: brand.primaryColor }}
                      >
                        Portfolio
                      </div>
                      <h2
                        className="leading-tight tracking-tight"
                        style={{
                          fontSize: 'clamp(2rem, 3.5vw, 3rem)',
                          fontWeight: 900,
                          color: textPrimary,
                          fontFamily: `"${brand.fontFamily}", DM Sans, sans-serif`,
                        }}
                      >
                        Our Work
                      </h2>
                    </div>

                    {/* Masonry-feel grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
                      {studio.portfolioItems.map((item, i) => (
                        <PortfolioItemCard key={item.id} item={item} index={i} primaryColor={brand.primaryColor} />
                      ))}
                    </div>
                  </div>
                )}

                {/* ─── Testimonials / Reviews ─────────────────────────────── */}
                {studio.reviews && studio.reviews.length > 0 && (() => {
                  const reviews = [...studio.reviews].sort(
                    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                  );
                  const avg = reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
                  const dist = [5, 4, 3, 2, 1].map((s) => ({
                    star: s,
                    count: reviews.filter((r) => r.rating === s).length,
                    pct: Math.round((reviews.filter((r) => r.rating === s).length / reviews.length) * 100),
                  }));
                  const now = Date.now();
                  const isRecent = (dateStr: string) => now - new Date(dateStr).getTime() < 7 * 24 * 60 * 60 * 1000;

                  return (
                    <div className="mt-28">
                      {/* ── Header ── */}
                      <div className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                        <div>
                          <div
                            className="text-xs font-bold uppercase tracking-[0.25em] mb-3"
                            style={{ color: brand.primaryColor }}
                          >
                            Client Stories
                          </div>
                          <h2
                            className="leading-tight tracking-tight"
                            style={{
                              fontSize: 'clamp(2rem, 3.5vw, 3rem)',
                              fontWeight: 900,
                              color: textPrimary,
                              fontFamily: `"${brand.fontFamily}", DM Sans, sans-serif`,
                            }}
                          >
                            What Our Clients{' '}
                            <span style={{ color: brand.primaryColor }}>Say</span>
                          </h2>
                          <p className="mt-3 text-sm max-w-md" style={{ color: textSecondary }}>
                            Real stories from people who've experienced our work. Sorted newest first.
                          </p>
                        </div>

                        {/* ── Rating Summary ── */}
                        <div
                          className="shrink-0 p-5 border min-w-[220px]"
                          style={{ borderColor, borderRadius: btnRadius, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                        >
                          <div className="flex items-end gap-3 mb-4">
                            <span className="text-5xl font-black tabular-nums" style={{ color: textPrimary, lineHeight: 1 }}>
                              {avg.toFixed(1)}
                            </span>
                            <div className="pb-1">
                              <div className="flex gap-0.5 mb-1">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star
                                    key={s}
                                    className="h-4 w-4"
                                    style={{
                                      color: brand.primaryColor,
                                      fill: s <= Math.round(avg) ? brand.primaryColor : 'none',
                                    }}
                                  />
                                ))}
                              </div>
                              <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: textSecondary }}>
                                {reviews.length} review{reviews.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          {/* Bar chart */}
                          <div className="space-y-1.5">
                            {dist.map(({ star, count, pct }) => (
                              <div key={star} className="flex items-center gap-2">
                                <span className="text-[10px] w-3 font-black tabular-nums" style={{ color: textSecondary }}>{star}</span>
                                <Star className="h-2.5 w-2.5 shrink-0" style={{ color: brand.primaryColor, fill: brand.primaryColor }} />
                                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                                  <div
                                    className="h-full rounded-full transition-all duration-1000"
                                    style={{ width: `${pct}%`, backgroundColor: brand.primaryColor, opacity: pct === 0 ? 0.15 : 1 }}
                                  />
                                </div>
                                <span className="text-[10px] w-4 text-right font-bold tabular-nums" style={{ color: textSecondary }}>{count}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* ── Review Cards ── newest first, masonry-style 3-col */}
                      <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
                        {reviews.map((review) => {
                          const initial = (review.customer?.name || '?').charAt(0).toUpperCase();
                          const reviewIsNew = isRecent(review.createdAt);
                          return (
                            <div
                              key={review.id}
                              className="break-inside-avoid p-6 border theme-card transition-all duration-300 hover:-translate-y-1"
                              style={{
                                borderColor,
                                borderRadius: btnRadius,
                                display: 'inline-block',
                                width: '100%',
                              }}
                            >
                              {/* Top row: stars + NEW badge */}
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className="h-4 w-4"
                                      style={{
                                        color: i < review.rating ? brand.primaryColor : textSecondary,
                                        fill: i < review.rating ? brand.primaryColor : 'none',
                                        opacity: i < review.rating ? 1 : 0.2,
                                      }}
                                    />
                                  ))}
                                  <span className="text-xs font-black ml-1 tabular-nums" style={{ color: brand.primaryColor }}>
                                    {review.rating}.0
                                  </span>
                                </div>
                                {reviewIsNew && (
                                  <span
                                    className="px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.15em] rounded-full animate-pulse"
                                    style={{
                                      backgroundColor: `${brand.primaryColor}20`,
                                      color: brand.primaryColor,
                                      border: `1px solid ${brand.primaryColor}40`,
                                    }}
                                  >
                                    New
                                  </span>
                                )}
                              </div>

                              {/* Quote mark */}
                              <div
                                className="text-4xl font-black leading-none mb-2 opacity-20 select-none"
                                style={{ color: brand.primaryColor, fontFamily: 'serif' }}
                              >
                                &ldquo;
                              </div>

                              {/* Comment */}
                              <p
                                className="text-sm leading-relaxed mb-5"
                                style={{ color: textSecondary }}
                              >
                                {review.comment || 'Great experience!'}
                              </p>

                              {/* Studio reply thread */}
                              {review.reply && (
                                <div
                                  className="p-3 mb-5 text-xs leading-relaxed rounded border-l-2"
                                  style={{
                                    borderLeftColor: brand.primaryColor,
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                    color: textSecondary,
                                  }}
                                >
                                  <span
                                    className="block text-[9px] font-black uppercase tracking-widest mb-1"
                                    style={{ color: brand.primaryColor }}
                                  >
                                    Partner Reply
                                  </span>
                                  {review.reply}
                                </div>
                              )}

                              {/* Author */}
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div
                                    className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                                    style={{ backgroundColor: brand.primaryColor }}
                                  >
                                    {initial}
                                  </div>
                                  <div>
                                    <div className="text-xs font-black flex items-center gap-1.5" style={{ color: textPrimary }}>
                                      {review.customer?.name}
                                      {/* Verified badge */}
                                      <span
                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-full"
                                        style={{
                                          backgroundColor: isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)',
                                          color: '#22c55e',
                                        }}
                                      >
                                        <Check className="h-2 w-2" strokeWidth={3} />
                                        Verified
                                      </span>
                                    </div>
                                    <div
                                      className="text-[10px] font-medium mt-0.5"
                                      style={{ color: textSecondary, opacity: 0.6 }}
                                    >
                                      {safeFormatDate(review.createdAt, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* ── CTA to leave a review ── */}
                      {authUser && (
                        <div
                          className="mt-10 p-5 border flex items-center justify-between gap-4 flex-wrap"
                          style={{ borderColor, borderRadius: btnRadius, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
                        >
                          <div>
                            <div className="text-sm font-black" style={{ color: textPrimary }}>Worked with us?</div>
                            <div className="text-xs mt-0.5" style={{ color: textSecondary }}>Share your experience — go to Bookings tab to leave a review.</div>
                          </div>
                          <button
                            onClick={() => setActiveTab('history')}
                            className="shrink-0 px-5 py-2.5 text-xs font-black uppercase tracking-wider transition-all hover:opacity-90"
                            style={{ backgroundColor: brand.primaryColor, color: getContrastColor(brand.primaryColor), borderRadius: btnRadius }}
                          >
                            Leave a Review
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/*  Step 2: Date & Time                                        */}
            {/* ---------------------------------------------------------- */}
            {step === 2 && selectedServices.length > 0 && (
              <div className="animate-fade-in max-w-2xl">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 text-sm font-bold mb-10 transition-colors"
                  style={{ color: brand.primaryColor }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  All Services
                </button>

                <StepIndicator step={step} brand={brand} />

                <h2
                  className="leading-tight tracking-tight mb-1"
                  style={{
                    fontSize: 'clamp(1.8rem, 3vw, 2.8rem)',
                    fontWeight: 900,
                    color: textPrimary,
                    fontFamily: `"${brand.fontFamily}", DM Sans, sans-serif`,
                  }}
                >
                  Pick a Date & Time
                </h2>
                <p className="mb-8 text-sm" style={{ color: textSecondary }}>
                  Select your preferred appointment date and available time slot.
                </p>

                {/* Services summary */}
                <div
                  className="p-4 mb-8 border space-y-2"
                  style={{ borderColor: hexAlpha(brand.primaryColor, '30'), borderRadius: '4px', backgroundColor: hexAlpha(brand.primaryColor, '06') }}
                >
                  {selectedServices.map((svc) => {
                    const SvcIcon = getOccasionIcon(svc.occasion);
                    return (
                      <div key={svc.id} className="flex items-center gap-3">
                        <SvcIcon className="h-4 w-4 shrink-0" style={{ color: brand.primaryColor }} />
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-sm" style={{ color: textPrimary }}>{svc.name}</span>
                          <span className="text-xs ml-2" style={{ color: textSecondary }}>
                            <Clock className="h-3 w-3 inline mr-0.5" />{svc.durationMinutes} min
                          </span>
                        </div>
                        <span className="font-black text-sm shrink-0" style={{ color: brand.primaryColor }}>
                          {formatCurrency(svc.price)}
                        </span>
                      </div>
                    );
                  })}
                  {selectedServices.length > 1 && (
                    <div className="flex justify-between items-center pt-2 border-t mt-2" style={{ borderColor }}>
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: textSecondary }}>Total</span>
                      <span className="font-black text-base" style={{ color: brand.primaryColor }}>
                        {formatCurrency(selectedServices.reduce((sum, s) => sum + Number(s.price), 0))}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <Input
                    label="Select Date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    min={minDate}
                    max={maxDate}
                  />

                  {selectedDate && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-[0.15em] mb-4 flex items-center gap-2" style={{ color: textSecondary }}>
                        <Clock className="h-3.5 w-3.5" style={{ color: brand.primaryColor }} />
                        Available Times
                      </label>
                      {loadingSlots ? (
                        <div className="text-center py-12">
                          <div
                            className="h-8 w-8 border-[2px] border-t-transparent rounded-full animate-spin mx-auto mb-3"
                            style={{ borderColor: brand.primaryColor, borderTopColor: 'transparent' }}
                          />
                          <p className="text-xs font-medium" style={{ color: textSecondary }}>Finding available slots...</p>
                        </div>
                      ) : timeSlots.length === 0 ? (
                        <div className="text-center py-10 border border-dashed rounded" style={{ borderColor }}>
                          <Calendar className="h-7 w-7 mx-auto mb-2" style={{ color: textSecondary, opacity: 0.4 }} />
                          <p className="text-sm font-medium" style={{ color: textSecondary }}>No slots available</p>
                          <p className="text-xs mt-1" style={{ color: textSecondary, opacity: 0.6 }}>Try selecting a different day</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {timeSlots.map((slot) => {
                            const isSelected = selectedTime === slot.time;
                            return (
                              <button
                                key={slot.time}
                                onClick={() => setSelectedTime(slot.time)}
                                disabled={!slot.available}
                                className={cn(
                                  'px-2 py-3 border font-bold text-xs tracking-wider uppercase transition-all duration-200',
                                  !slot.available && 'opacity-30 cursor-not-allowed',
                                  isSelected && 'border-transparent',
                                )}
                                style={{
                                  borderColor: isSelected ? 'transparent' : borderColor,
                                  color: isSelected ? getContrastColor(brand.primaryColor) : textSecondary,
                                  ...(slot.available && !isSelected ? { borderColor } : {}),
                                  borderRadius: btnRadius,
                                  ...(isSelected
                                    ? { backgroundColor: brand.primaryColor, color: getContrastColor(brand.primaryColor) }
                                    : {}),
                                  ...(slot.available && !isSelected
                                    ? { '--hover-color': brand.primaryColor } as React.CSSProperties
                                    : {}),
                                }}
                              >
                                {new Date(slot.time).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedTime && (
                    <button
                      onClick={() => { setStep(3); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="w-full py-4 text-white font-black text-sm tracking-wider uppercase transition-all hover:opacity-90 flex items-center justify-center gap-2"
                      style={{ backgroundColor: brand.primaryColor, borderRadius: btnRadius }}
                    >
                      Continue
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/*  Step 3: Details form                                       */}
            {/* ---------------------------------------------------------- */}
            {step === 3 && (
              <div className="animate-fade-in max-w-2xl">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 text-sm font-bold mb-10 transition-colors"
                  style={{ color: brand.primaryColor }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Schedule
                </button>

                <StepIndicator step={step} brand={brand} />

                <h2
                  className="leading-tight tracking-tight mb-1"
                  style={{
                    fontSize: 'clamp(1.8rem, 3vw, 2.8rem)',
                    fontWeight: 900,
                    color: textPrimary,
                    fontFamily: `"${brand.fontFamily}", DM Sans, sans-serif`,
                  }}
                >
                  Your Details
                </h2>
                <p className="mb-8 text-sm" style={{ color: textSecondary }}>
                  A few more details to complete your booking request.
                </p>

                {/* Google sign-in CTA */}
                {!customerData.email && (
                  <div
                    className="p-5 mb-6 border flex flex-col sm:flex-row items-center gap-4"
                    style={{ borderColor: hexAlpha(brand.primaryColor, '30'), borderRadius: '4px', backgroundColor: hexAlpha(brand.primaryColor, '05') }}
                  >
                    <div className="h-12 w-12 rounded bg-white shadow flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" className="h-6 w-6">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="font-black text-black text-sm">Save to your account?</h3>
                      <p className="text-xs text-black/40 mt-0.5">
                        Sign in to auto-fill your details and track all bookings.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto font-bold text-sm shrink-0"
                      onClick={() => {
                        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
                        window.location.href = `${API_URL}/auth/google?state=${returnUrl}`;
                      }}
                    >
                      Sign in with Google
                    </Button>
                  </div>
                )}

                {/* Booking summary */}
                <div
                  className="p-5 mb-6 border theme-card"
                  style={{ borderColor, borderRadius: btnRadius }}
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-4" style={{ color: textSecondary }}>
                    Booking Summary
                  </div>
                  <div className="space-y-2.5 text-sm">
                    {/* Services list */}
                    {selectedServices.map((svc) => (
                      <div key={svc.id} className="flex justify-between items-center">
                        <span className="text-foreground-tertiary text-xs">{svc.name}</span>
                        <span className="font-semibold text-foreground text-xs">{formatCurrency(svc.price)}</span>
                      </div>
                    ))}
                    {/* Date */}
                    <div className="flex justify-between items-center">
                      <span className="text-foreground-tertiary text-xs">Date</span>
                      <span className="font-semibold text-foreground text-xs">
                        {selectedDate
                          ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                          : ''}
                      </span>
                    </div>
                    {/* Time */}
                    <div className="flex justify-between items-center">
                      <span className="text-foreground-tertiary text-xs">Time</span>
                      <span className="font-semibold text-foreground text-xs">
                        {selectedTime
                          ? new Date(selectedTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                          : ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-border">
                      <span className="text-foreground font-black text-sm">Total</span>
                      <span className="text-lg font-black" style={{ color: brand.primaryColor }}>
                        {formatCurrency(selectedServices.reduce((sum, s) => sum + Number(s.price), 0))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Form */}
                <div
                  className="p-6 border theme-card"
                  style={{ borderColor, borderRadius: btnRadius }}
                >
                  <form onSubmit={handleSubmitBooking} className="space-y-5">
                    <Input
                      label="Full Name"
                      required
                      value={customerData.name}
                      onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                      placeholder="e.g. Jane Smith"
                    />
                    <Input
                      label="Email Address (Optional)"
                      type="email"
                      value={customerData.email}
                      onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                      placeholder="e.g. jane@example.com"
                      helperText="Booking confirmation will be sent here."
                    />
                    <Input
                      label="Phone Number"
                      type="tel"
                      required
                      value={customerData.phone}
                      onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                      placeholder="e.g. +91 98765 43210"
                    />
                    <Textarea
                      label="Additional Notes (Optional)"
                      value={customerData.notes}
                      onChange={(e) => setCustomerData({ ...customerData, notes: e.target.value })}
                      rows={3}
                      placeholder="Special requests, requirements, or details about your engagement..."
                    />

                    {/* Terms */}
                    {studio.defaultTerms && (
                      <div className="border rounded p-4 space-y-3 theme-bg" style={{ borderColor, borderRadius: btnRadius }}>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: textSecondary }}>
                          <FileText className="h-3.5 w-3.5" style={{ color: brand.primaryColor }} />
                          Terms & Conditions
                        </div>
                        <div className="max-h-32 overflow-y-auto text-xs rounded p-3 whitespace-pre-wrap leading-relaxed border theme-card" style={{ borderColor, color: textSecondary }}>
                          {studio.defaultTerms}
                        </div>
                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={acceptedTerms}
                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                            className="mt-0.5 h-4 w-4 cursor-pointer"
                            style={{ accentColor: brand.primaryColor }}
                            suppressHydrationWarning
                          />
                          <span className="text-xs" style={{ color: textSecondary }}>
                            I have read and agree to the terms and conditions.
                          </span>
                        </label>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting || (!!studio.defaultTerms && !acceptedTerms)}
                      className={cn(
                        'w-full py-4 text-white font-black text-sm tracking-wider uppercase transition-all flex items-center justify-center gap-2',
                        submitting || (!!studio.defaultTerms && !acceptedTerms)
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:opacity-90',
                      )}
                      style={{ backgroundColor: brand.primaryColor, borderRadius: btnRadius }}
                    >
                      {submitting ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Submit Booking Request
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/*  Step 4: Confirmation                                       */}
            {/* ---------------------------------------------------------- */}
            {step === 4 && (
              <div className="animate-fade-in max-w-2xl">
                {/* Big confirmation mark */}
                <div className="mb-12">
                  <div
                    className="inline-flex h-20 w-20 items-center justify-center rounded-full mb-6"
                    style={{ backgroundColor: brand.primaryColor }}
                  >
                    <Check className="h-10 w-10 text-white" strokeWidth={3} />
                  </div>
                  <h2
                    className="leading-tight tracking-tight mb-2"
                    style={{
                      fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                      fontWeight: 900,
                      color: textPrimary,
                      fontFamily: `"${brand.fontFamily}", DM Sans, sans-serif`,
                    }}
                  >
                    You&apos;re All Set.
                  </h2>
                  <p className="text-sm" style={{ color: textSecondary }}>
                    {bookingIds.length > 1 ? `${bookingIds.length} bookings submitted` : 'Booking submitted'} to <strong style={{ color: textPrimary }}>{studio.name}</strong> — they&apos;ll be in touch shortly.
                  </p>
                  <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 text-xs font-mono rounded theme-bg" style={{ color: textSecondary }}>
                    Ref: <span className="font-bold" style={{ color: textPrimary }}>{bookingIds[0]?.slice(-8).toUpperCase() ?? ''}</span>
                  </div>
                </div>

                {/* Details */}
                <div
                  className="p-6 border mb-6 theme-card"
                  style={{ borderColor, borderRadius: btnRadius }}
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-5" style={{ color: textSecondary }}>Booking Details</div>
                  <div className="space-y-4">
                    {/* Services booked */}
                    <div className="flex items-start gap-3">
                      <div
                        className="h-8 w-8 rounded flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: hexAlpha(brand.primaryColor, '12') }}
                      >
                        <Camera className="h-4 w-4" style={{ color: brand.primaryColor }} />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: textSecondary }}>
                          {selectedServices.length > 1 ? 'Services' : 'Service'}
                        </div>
                        {selectedServices.map((svc) => (
                          <div key={svc.id} className="text-sm font-semibold" style={{ color: textPrimary }}>
                            {svc.name} · {svc.durationMinutes}min · {formatCurrency(svc.price)}
                          </div>
                        ))}
                        {selectedServices.length > 1 && (
                          <div className="text-sm font-black mt-1" style={{ color: brand.primaryColor }}>
                            Total: {formatCurrency(selectedServices.reduce((sum, s) => sum + Number(s.price), 0))}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Date & Time */}
                    <div className="flex items-start gap-3">
                      <div
                        className="h-8 w-8 rounded flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: hexAlpha(brand.primaryColor, '12') }}
                      >
                        <Calendar className="h-4 w-4" style={{ color: brand.primaryColor }} />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider mb-0.5" style={{ color: textSecondary }}>Date &amp; Time</div>
                        <div className="text-sm font-semibold" style={{ color: textPrimary }}>
                          {safeFormatDate(selectedTime, {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                    {/* Contact */}
                    <div className="flex items-start gap-3">
                      <div
                        className="h-8 w-8 rounded flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: hexAlpha(brand.primaryColor, '12') }}
                      >
                        <Phone className="h-4 w-4" style={{ color: brand.primaryColor }} />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider mb-0.5" style={{ color: textSecondary }}>Contact</div>
                        <div className="text-sm font-semibold" style={{ color: textPrimary }}>
                          {customerData.name} · {customerData.phone}{customerData.email ? ' · ' + customerData.email : ''}
                        </div>
                      </div>
                    </div>
                    {/* Partner */}
                    <div className="flex items-start gap-3">
                      <div
                        className="h-8 w-8 rounded flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: hexAlpha(brand.primaryColor, '12') }}
                      >
                        <MapPin className="h-4 w-4" style={{ color: brand.primaryColor }} />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider mb-0.5" style={{ color: textSecondary }}>Partner</div>
                        <div className="text-sm font-semibold" style={{ color: textPrimary }}>{studio.name} · {studio.email}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* What's next */}
                <div
                  className="p-4 border mb-8 flex items-start gap-3"
                  style={{ borderColor: hexAlpha(brand.primaryColor, '25'), borderRadius: '4px', backgroundColor: hexAlpha(brand.primaryColor, '06') }}
                >
                  <PartyPopper className="h-4 w-4 shrink-0 mt-0.5" style={{ color: brand.primaryColor }} />
                  <p className="text-sm leading-relaxed" style={{ color: textSecondary }}>
                    The partner will reach out to <strong style={{ color: textPrimary }}>{customerData.phone}</strong> to confirm your booking, finalize details, and prepare.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={resetBooking}
                    className="flex-1 py-3.5 border font-bold text-sm transition-all hover:opacity-80"
                    style={{ borderRadius: btnRadius, borderColor, color: textSecondary }}
                  >
                    Book Another
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="flex-1 py-3.5 text-white font-black text-sm tracking-wider uppercase transition-all hover:opacity-90 flex items-center justify-center gap-2"
                    style={{ backgroundColor: brand.primaryColor, borderRadius: btnRadius }}
                  >
                    <History className="h-4 w-4" />
                    My Bookings
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ============================================================== */}
        {/*  HISTORY TAB                                                    */}
        {/* ============================================================== */}
        {activeTab === 'history' && (
          <div className="animate-fade-in max-w-3xl">
            {!authUser ? (
              <div className="py-24 text-center">
                <History className="h-12 w-12 mx-auto mb-6" style={{ color: textSecondary, opacity: 0.3 }} />
                <h2
                  className="leading-tight tracking-tight mb-2"
                  style={{
                    fontSize: '2rem',
                    fontWeight: 900,
                    color: textPrimary,
                    fontFamily: `"${brand.fontFamily}", DM Sans, sans-serif`,
                  }}
                >
                  Sign in to view history
                </h2>
                <p className="mb-8 text-sm max-w-sm mx-auto" style={{ color: textSecondary }}>
                  Track all your bookings with {studio.name} in one place.
                </p>
                <button
                  onClick={() => {
                    const returnUrl = encodeURIComponent(window.location.pathname);
                    window.location.href = `${API_URL}/auth/google?state=${returnUrl}`;
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 font-black text-sm uppercase tracking-wider transition-all hover:opacity-90"
                  style={{ backgroundColor: brand.primaryColor, color: getContrastColor(brand.primaryColor), borderRadius: btnRadius }}
                >
                  <Chrome className="h-4 w-4" />
                  Sign in with Google
                </button>
              </div>
            ) : loadingHistory ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton h-20 w-full rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-12">
                {/* Bookings */}
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.2em] mb-1" style={{ color: brand.primaryColor }}>
                        Bookings
                      </div>
                      <h2
                        className="text-black leading-tight tracking-tight"
                        style={{
                          fontSize: '1.8rem',
                          fontWeight: 900,
                          fontFamily: `"${brand.fontFamily}", DM Sans, sans-serif`,
                        }}
                      >
                        My Bookings
                      </h2>
                    </div>
                    <button
                      onClick={() => setActiveTab('book')}
                      className="flex items-center gap-2 px-5 py-2.5 font-black text-xs uppercase tracking-wider transition-all hover:opacity-90"
                      style={{ backgroundColor: brand.primaryColor, color: getContrastColor(brand.primaryColor), borderRadius: btnRadius }}
                    >
                      <Camera className="h-3.5 w-3.5" />
                      New Booking
                    </button>
                  </div>

                  {bookings.length === 0 ? (
                    <div className="py-12 text-center border border-dashed border-black/10">
                      <BookOpen className="h-8 w-8 text-black/15 mx-auto mb-3" />
                      <p className="font-bold text-black/30 text-sm mb-1">No bookings yet</p>
                      <p className="text-xs text-black/20">Your bookings with {studio.name} will appear here.</p>
                      <button
                        onClick={() => setActiveTab('book')}
                        className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 font-black text-xs uppercase tracking-wider transition-all hover:opacity-90"
                        style={{ backgroundColor: brand.primaryColor, color: getContrastColor(brand.primaryColor), borderRadius: btnRadius }}
                      >
                        Book an Appointment
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {bookings.map((b) => (
                        <div
                          key={b.id}
                          className="p-5 border transition-all duration-200 hover:border-black/20"
                          style={{
                            borderColor: b.status === 'QUOTED' ? hexAlpha(brand.primaryColor, '40') : '#e0e0d8',
                            borderRadius: '4px',
                            backgroundColor: b.status === 'QUOTED' ? hexAlpha(brand.primaryColor, '04') : '#fff',
                          }}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 min-w-0">
                              <div
                                className="h-10 w-10 flex items-center justify-center shrink-0 rounded"
                                style={{ backgroundColor: hexAlpha(brand.primaryColor, '12') }}
                              >
                                <Camera className="h-5 w-5" style={{ color: brand.primaryColor }} />
                              </div>
                              <div className="min-w-0">
                                <div className="font-black text-black text-sm truncate">{b.service.name}</div>
                                <div className="text-xs text-black/40 mt-0.5 flex items-center gap-1.5">
                                  <Calendar className="h-3 w-3 shrink-0" />
                                  {safeFormatDate(b.scheduledAt, {
                                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit',
                                  })}
                                </div>
                                <div className="text-xs text-black/30 flex items-center gap-1 mt-0.5">
                                  <Clock className="h-3 w-3" />
                                  {b.service.durationMinutes} min
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0 space-y-1.5">
                              <StatusBadge status={b.status} />
                              <div className="text-sm font-black block" style={{ color: brand.primaryColor }}>
                                {formatCurrency(b.quoteAmount || b.service?.price || 0)}
                              </div>
                              {b.status === 'COMPLETED' && (
                                b.review ? (
                                  <div className="flex items-center justify-end gap-1 mt-1">
                                    <Star className="h-3 w-3 fill-current mt-[1px]" style={{ color: brand.primaryColor }} />
                                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: brand.primaryColor }}>
                                      {b.review.rating}/5
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-end gap-1 mt-2">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-black/30">Rate experience</div>
                                    <div className="flex items-center gap-0.5">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                          key={star}
                                          onClick={() => { setReviewRating(star); setReviewBookingId(b.id); }}
                                          className="hover:scale-125 transition-transform"
                                        >
                                          <Star
                                            className="h-3.5 w-3.5 text-black/15 transition-colors"
                                            style={{ '--hover-color': brand.primaryColor } as React.CSSProperties}
                                            onMouseEnter={(e) => (e.currentTarget.style.color = brand.primaryColor, e.currentTarget.style.fill = brand.primaryColor)}
                                            onMouseLeave={(e) => (e.currentTarget.style.color = '', e.currentTarget.style.fill = 'none')}
                                          />
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </div>

                          {/* Quote actions */}
                          {b.status === 'QUOTED' && (
                            <div className="mt-4 pt-4 border-t border-black/8">
                              <div
                                className="p-4 border mb-4"
                                style={{
                                  borderColor: hexAlpha(brand.primaryColor, '25'),
                                  borderRadius: '4px',
                                  backgroundColor: hexAlpha(brand.primaryColor, '05'),
                                }}
                              >
                                <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider mb-2" style={{ color: brand.primaryColor }}>
                                  <Sparkles className="h-3.5 w-3.5" />
                                  Partner Quote
                                </div>
                                {b.quoteNotes && (
                                  <p className="text-sm text-black/50 italic border-l-2 pl-3 mb-3" style={{ borderColor: hexAlpha(brand.primaryColor, '40') }}>
                                    &quot;{b.quoteNotes}&quot;
                                  </p>
                                )}
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-black/30 font-semibold">Quoted Amount</span>
                                  <span className="text-2xl font-black text-black">{formatCurrency(b.quoteAmount)}</span>
                                </div>
                              </div>

                              {counterOfferId === b.id && (
                                <div className="space-y-3 mb-3 p-4 border border-black/10 rounded bg-black/[0.02]">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-black/40">Your Counter-Offer</p>
                                  <div className="flex items-center gap-2 border border-black/15 rounded px-3 py-2.5 bg-white">
                                    <span className="text-sm font-semibold text-black/30">₹</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      className="flex-1 bg-transparent text-sm font-black text-black outline-none"
                                      placeholder="Your proposed amount"
                                      value={counterOfferAmount}
                                      onChange={(e) => setCounterOfferAmount(e.target.value)}
                                    />
                                  </div>
                                  <textarea
                                    rows={2}
                                    className="w-full border border-black/15 rounded px-3 py-2.5 text-sm text-black placeholder-black/30 outline-none resize-none bg-white"
                                    placeholder="Optional note..."
                                    value={counterOfferNote}
                                    onChange={(e) => setCounterOfferNote(e.target.value)}
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={handleSendCounterOffer}
                                      disabled={sendingCounter || !counterOfferAmount || parseFloat(counterOfferAmount) <= 0}
                                      className="flex-1 flex items-center justify-center gap-2 py-2.5 font-black text-xs uppercase tracking-wider transition-all hover:opacity-90 disabled:opacity-40"
                                      style={{ backgroundColor: brand.primaryColor, color: getContrastColor(brand.primaryColor), borderRadius: btnRadius }}
                                    >
                                      {sendingCounter ? (
                                        <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                      ) : (
                                        <ThumbsUp className="h-3.5 w-3.5" />
                                      )}
                                      Send Counter
                                    </button>
                                    <button
                                      onClick={() => { setCounterOfferId(null); setCounterOfferAmount(''); setCounterOfferNote(''); }}
                                      className="px-4 border border-black/15 text-black/40 font-semibold text-sm hover:bg-black/5 transition-all"
                                      style={{ borderRadius: btnRadius }}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}

                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAcceptQuote(b.id)}
                                  className="flex-1 flex items-center justify-center gap-2 py-2.5 font-black text-xs uppercase tracking-wider text-white transition-all hover:opacity-90"
                                  style={{ backgroundColor: '#16a34a', borderRadius: btnRadius }}
                                >
                                  <ThumbsUp className="h-3.5 w-3.5" />
                                  Accept
                                </button>
                                <button
                                  onClick={() => {
                                    setCounterOfferId(counterOfferId === b.id ? null : b.id);
                                    setCounterOfferAmount(b.quoteAmount && !isNaN(Number(b.quoteAmount)) ? (Number(b.quoteAmount) * 0.9).toFixed(0) : '');
                                    setCounterOfferNote('');
                                  }}
                                  className="px-4 border border-black/15 text-black/50 py-2.5 font-bold text-xs hover:bg-black/5 transition-all"
                                  style={{ borderRadius: btnRadius }}
                                >
                                  Counter
                                </button>
                                <button
                                  onClick={() => handleRejectQuote(b.id)}
                                  className="px-4 border border-red-200 text-red-500 py-2.5 font-bold hover:bg-red-50 transition-all"
                                  style={{ borderRadius: btnRadius }}
                                >
                                  <ThumbsDown className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Invoices */}
                <div>
                  <div className="mb-8">
                    <div className="text-xs font-black uppercase tracking-[0.2em] mb-1" style={{ color: brand.primaryColor }}>
                      Billing
                    </div>
                    <h2
                      className="leading-tight tracking-tight"
                      style={{
                        fontSize: '1.8rem',
                        fontWeight: 900,
                        color: textPrimary,
                        fontFamily: `"${brand.fontFamily}", DM Sans, sans-serif`,
                      }}
                    >
                      Invoices
                    </h2>
                  </div>

                  {invoices.length === 0 ? (
                    <div className="py-10 text-center border border-dashed border-black/10">
                      <Receipt className="h-7 w-7 text-black/15 mx-auto mb-2" />
                      <p className="text-sm font-bold text-black/25">No invoices yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {invoices.map((inv) => (
                        <div
                          key={inv.id}
                          className="p-4 border border-[#e0e0d8] bg-white hover:border-black/20 transition-all"
                          style={{ borderRadius: '4px' }}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="h-9 w-9 rounded flex items-center justify-center shrink-0"
                                style={{ backgroundColor: hexAlpha(brand.primaryColor, '12') }}
                              >
                                <Receipt className="h-4 w-4" style={{ color: brand.primaryColor }} />
                              </div>
                              <div className="min-w-0">
                                <div className="font-black text-black text-xs font-mono">
                                  #{inv.id.slice(-8).toUpperCase()}
                                </div>
                                <div className="text-xs text-black/35 mt-0.5">
                                  {safeFormatDate(inv.createdAt)}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0 space-y-1">
                              <StatusBadge status={inv.status} />
                              <div className="text-sm font-black block" style={{ color: brand.primaryColor }}>
                                {formatCurrency(inv.totalAmount)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/*  ACCOUNT TAB                                                    */}
        {/* ============================================================== */}
        {activeTab === 'account' && (
          <div className="animate-fade-in max-w-lg">
            {!authUser ? (
              <div className="py-24 text-center">
                <User className="h-12 w-12 text-black/10 mx-auto mb-6" />
                <h2
                  className="text-black leading-tight tracking-tight mb-2"
                  style={{
                    fontSize: '2rem',
                    fontWeight: 900,
                    fontFamily: `"${brand.fontFamily}", DM Sans, sans-serif`,
                  }}
                >
                  Sign in to manage account
                </h2>
                <p className="text-black/40 mb-8 text-sm max-w-xs mx-auto">
                  Update your profile, name, and preferences.
                </p>
                <button
                  onClick={() => {
                    const returnUrl = encodeURIComponent(window.location.pathname);
                    window.location.href = `${API_URL}/auth/google?state=${returnUrl}`;
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 font-black text-sm uppercase tracking-wider transition-all hover:opacity-90"
                  style={{ backgroundColor: brand.primaryColor, color: getContrastColor(brand.primaryColor), borderRadius: btnRadius }}
                >
                  <Chrome className="h-4 w-4" />
                  Sign in with Google
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Profile card */}
                <div
                  className="overflow-hidden border border-[#e0e0d8] bg-white"
                  style={{ borderRadius: '4px' }}
                >
                  {/* Header band */}
                  <div
                    className="h-16 w-full"
                    style={{ background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.accentColor})` }}
                  />
                  <div className="px-6 pb-6 -mt-8">
                    <div
                      className="h-16 w-16 flex items-center justify-center text-2xl font-black border-4 border-white mb-4"
                      style={{ backgroundColor: brand.primaryColor, color: getContrastColor(brand.primaryColor), borderRadius: '4px' }}
                    >
                      {(authUser.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="font-black text-black text-xl">{authUser.name}</div>
                    <div className="text-sm text-black/40 mt-0.5">{authUser.email}</div>

                    <div className="mt-6 space-y-4">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30 flex items-center gap-2">
                        <Settings className="h-3 w-3" />
                        Edit Profile
                      </div>
                      <Input
                        label="Full Name"
                        value={profileEdits.name}
                        onChange={(e) => setProfileEdits((p) => ({ ...p, name: e.target.value }))}
                      />
                      <Input
                        label="Email Address"
                        value={profileEdits.email}
                        disabled
                        helperText="Login identity cannot be changed."
                      />
                      <Button
                        onClick={handleSaveProfile}
                        isLoading={savingProfile}
                        disabled={savingProfile}
                        className="w-full h-11 font-black text-xs uppercase tracking-wider"
                        style={{ backgroundColor: brand.primaryColor, color: getContrastColor(brand.primaryColor) }}
                      >
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Sign out */}
                <div
                  className="p-5 border border-red-100 bg-red-50/50"
                  style={{ borderRadius: '4px' }}
                >
                  <h3 className="font-black text-red-600 text-sm mb-1">Sign Out</h3>
                  <p className="text-xs text-black/40 mb-4">
                    You will be signed out from this device.
                  </p>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-500 font-bold text-sm hover:bg-red-50 transition-all"
                    style={{ borderRadius: btnRadius }}
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reject Quote Dialogue */}
        <ConfirmDialog
          isOpen={!!rejectConfirmId}
          onClose={() => setRejectConfirmId(null)}
          onConfirm={confirmRejectQuote}
          title="Reject this Quote?"
          description="This booking will be cancelled. You can always book a new engagement later."
          confirmLabel="Reject Quote"
          variant="danger"
        />

        {/* Review Modal */}
        {reviewBookingId && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-lg bg-white overflow-hidden shadow-2xl animate-slide-up" style={{ borderRadius: '8px' }}>
              <div className="p-6 sm:p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: brand.primaryColor }}>Review Booking</div>
                    <h2 className="text-2xl font-black text-black leading-tight">Your Feedback</h2>
                  </div>
                  <button onClick={() => setReviewBookingId(null)} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                    <X className="h-5 w-5 text-black/20" />
                  </button>
                </div>

                <div className="space-y-8">
                  {/* Stars */}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/30 mb-4 text-center">How was your experience?</p>
                    <div className="flex items-center justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setReviewRating(star)}
                          className="p-1 transition-transform hover:scale-125 focus:outline-none"
                        >
                          <Star
                            className={cn(
                              "h-10 w-10 transition-all duration-300",
                              star <= reviewRating ? "fill-current" : "text-black/5"
                            )}
                            style={{ color: star <= reviewRating ? brand.primaryColor : undefined }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Comment */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-black/30">Share more details</p>
                    <textarea
                      rows={4}
                      className="w-full border border-[#e0e0d8] rounded p-4 text-sm text-black placeholder-black/20 outline-none resize-none focus:border-black/20 transition-all"
                      placeholder="What did you love? Any special shots or moments?"
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setReviewBookingId(null)}
                      className="flex-1 py-4 border border-[#e0e0d8] text-black/40 font-bold text-sm tracking-wider uppercase hover:bg-black/[0.02] transition-all"
                      style={{ borderRadius: btnRadius }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitReview}
                      disabled={submittingReview}
                      className="flex-1 py-4 text-white font-black text-sm tracking-wider uppercase transition-all shadow-xl flex items-center justify-center gap-2 hover:opacity-90"
                      style={{ backgroundColor: brand.primaryColor, borderRadius: btnRadius }}
                    >
                      {submittingReview ? (
                        <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      ) : (
                        <>Submit Review <ArrowRight className="h-4 w-4" /></>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>

      {/* ================================================================ */}
      {/*  FOOTER                                                           */}
      {/* ================================================================ */}
      <footer
        className="border-t mt-20 py-10 relative z-10"
        style={{ borderColor, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div
              className="font-black text-sm tracking-tight"
              style={{ color: textPrimary, fontFamily: `"${brand.fontFamily}", DM Sans, sans-serif` }}
            >
              {studio?.name}
            </div>
            <div className="text-xs mt-0.5" style={{ color: textSecondary }}>
              &copy; {new Date().getFullYear()} · All rights reserved.
            </div>
          </div>
          <div className="flex items-center gap-5 text-xs">
            <a
              href={`mailto:${studio?.email}`}
              className="flex items-center gap-1.5 transition-colors font-medium hover:opacity-80"
              style={{ color: textSecondary }}
            >
              <Mail className="h-3.5 w-3.5" />
              {studio?.email}
            </a>
            <a
              href={`tel:${studio?.phone}`}
              className="flex items-center gap-1.5 transition-colors font-medium hover:opacity-80"
              style={{ color: textSecondary }}
            >
              <Phone className="h-3.5 w-3.5" />
              {studio?.phone}
            </a>
          </div>
        </div>
      </footer>


      {/* ---------------------------------------------------------- */}
      {/*  Floating cart bar — visible on Step 1 when services chosen */}
      {/* ---------------------------------------------------------- */}
      {
        (step as number) === 1 && selectedServices.length > 0 && (
          <div
            className="fixed bottom-0 left-0 right-0 z-50 p-6 border-t animate-cinematic"
            style={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              borderColor: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(30px)',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div className="max-w-5xl mx-auto flex items-center gap-8">
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-2">
                  {selectedServices.length} STUDIO SELECTIONS
                </div>
                <div className="text-xl font-black text-white truncate tracking-tighter">
                  {selectedServices.map((s) => s.name.toUpperCase()).join(' + ')}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[10px] font-black tracking-widest text-white/30 mb-1">TOTAL INVESTMENT</div>
                <div className="text-2xl font-black text-white tabular-nums">
                  {formatCurrency(selectedServices.reduce((sum, s) => sum + Number(s.price), 0))}
                </div>
              </div>
              <button
                onClick={handleProceedToSchedule}
                className="shrink-0 px-6 sm:px-10 py-4 font-black text-xs tracking-[0.2em] uppercase transition-all duration-500 hover:scale-105 active:scale-95 shadow-glow-primary flex items-center gap-3 whitespace-nowrap"
                style={{ backgroundColor: brand.primaryColor, color: getContrastColor(brand.primaryColor), borderRadius: '1rem' }}
              >
                <span className="hidden sm:inline">CONTINUE TO SCHEDULE</span>
                <span className="sm:hidden">SCHEDULE</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      }

      <ConfirmDialog
        isOpen={!!rejectConfirmId}
        onClose={() => setRejectConfirmId(null)}
        onConfirm={confirmRejectQuote}
        title="Reject Quote"
        description="Are you sure you want to reject this quote? This action cannot be undone."
        confirmLabel="Reject Quote"
        variant="danger"
      />
    </div >
  );
}
