'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import NextImage from 'next/image';
import axios from 'axios';import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { Input, Textarea } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn, formatCurrency } from '@/lib/utils';
import {
  Calendar,
  Clock,
  Mail,
  Phone,
  Check,
  Camera,
  ArrowLeft,
  ArrowRight,
  Heart,
  Star,
  Users,
  PartyPopper,
  Baby,
  GraduationCap,
  Briefcase,
  Sparkles,
  Gift,
  ImageIcon,
  FileText,
  ChevronRight,
  Chrome,
  History,
  User,
  LogOut,
  Receipt,
  Settings,
  BookOpen,
  ThumbsUp,
  ThumbsDown,
  MapPin,
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

/**
 * Appends a 2-digit hex alpha suffix ONLY when the color is a 3- or 6-digit
 * hex string (#rgb or #rrggbb).  For any other format (rgb(), hsl(), etc.)
 * the alpha is silently dropped so CSS never gets an invalid value.
 */
function hexAlpha(color: string, alpha: string): string {
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) {
    return color + alpha;
  }
  return color;
}

/** Google Fonts families available in the branding picker.
 *  Must match FONT_OPTIONS in branding/page.tsx and settings/page.tsx exactly. */
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
  heroStyle?: 'solid' | 'mesh' | 'glass';
  cardTheme?: 'modern' | 'classic' | 'elevated';
  buttonShape?: 'rounded' | 'pill' | 'luxury-sharp';
}

interface Studio {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  logoUrl?: string;
  brandingConfig?: BrandingConfig;
  defaultTerms?: string;
  services: Service[];
  portfolioItems: PortfolioItem[];
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
  service: { name: string; price: number; durationMinutes: number };
  studio: { name: string; slug: string; logoUrl?: string };
  quoteAmount?: number;
  quoteNotes?: string;
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

/* -------------------------------------------------------------------------- */
/*  Step Indicator                                                             */
/* -------------------------------------------------------------------------- */

function StepIndicator({
  step,
  brand,
}: {
  step: number;
  brand: {
    primaryColor: string;
    buttonShape: 'rounded' | 'pill' | 'luxury-sharp';
  };
}) {
  return (
    <div className="sticky top-0 z-40 w-full px-4 -mt-6 mb-10">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[var(--background)]/85 backdrop-blur-2xl px-6 py-4 rounded-3xl shadow-2xl border border-[var(--border-light)] flex items-center justify-between">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isCompleted = step > s.id;

            return (
              <div key={s.id} className="flex flex-col items-center gap-1.5 flex-1 relative group">
                <div
                  className={cn(
                    'h-11 w-11 rounded-2xl flex items-center justify-center transition-all duration-500',
                    isActive
                      ? 'text-white shadow-xl scale-110 -translate-y-1'
                      : isCompleted
                        ? 'text-white'
                        : 'bg-[var(--surface-2)] text-[var(--foreground-tertiary)] group-hover:bg-[var(--surface-3)]',
                  )}
                  style={{
                    backgroundColor: isActive
                      ? brand.primaryColor
                      : isCompleted
                        ? 'var(--success)'
                        : undefined,
                    boxShadow: isActive ? `0 8px 20px ${hexAlpha(brand.primaryColor,'55')}` : undefined,
                    borderRadius:
                      brand.buttonShape === 'pill'
                        ? '9999px'
                        : brand.buttonShape === 'luxury-sharp'
                          ? '6px'
                          : '0.875rem',
                  }}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className={cn('h-5 w-5', isActive && 'animate-pulse')} />
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-bold uppercase tracking-widest hidden sm:block transition-colors',
                    isActive
                      ? 'text-[var(--foreground)]'
                      : 'text-[var(--foreground-tertiary)]',
                  )}
                >
                  {s.title}
                </span>
                {/* Connector */}
                {s.id < 4 && (
                  <div className="absolute top-[22px] left-[calc(50%+22px)] right-0 w-[calc(100%-44px)] h-[2px] bg-[var(--surface-2)] -z-10 hidden sm:block">
                    <div
                      className="h-full transition-all duration-700"
                      style={{
                        width: isCompleted ? '100%' : '0%',
                        backgroundColor: 'var(--success)',
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Occasion Card                                                              */
/* -------------------------------------------------------------------------- */

function OccasionCard({
  service,
  primaryColor,
  accentColor,
  onClick,
  cardTheme,
  buttonShape,
  isSelected,
}: {
  service: Service;
  primaryColor: string;
  accentColor: string;
  onClick: () => void;
  cardTheme: 'modern' | 'classic' | 'elevated';
  buttonShape: 'rounded' | 'pill' | 'luxury-sharp';
  isSelected: boolean;
}) {
  const Icon = getOccasionIcon(service.occasion);

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden text-left transition-all duration-300 focus:outline-none',
        cardTheme === 'modern' &&
          'rounded-2xl border border-[var(--border)] bg-[var(--surface-0)] hover:shadow-xl hover:-translate-y-1.5',
        cardTheme === 'classic' &&
          'rounded-xl border-2 border-[var(--border)] bg-[var(--surface-0)] hover:shadow-lg hover:-translate-y-1',
        cardTheme === 'elevated' &&
          'rounded-[1.5rem] p-1.5 shadow-md hover:shadow-2xl hover:-translate-y-1.5 bg-[var(--surface-0)]',
        isSelected && 'scale-[1.02]',
      )}
      style={{
        borderColor: isSelected ? primaryColor : undefined,
        boxShadow: isSelected ? `0 0 0 2px ${primaryColor}, 0 8px 32px ${hexAlpha(primaryColor,'30')}` : undefined,
      }}
    >
      {/* Cover / Gradient */}
      <div
        className={cn(
          'relative overflow-hidden',
          cardTheme === 'elevated' ? 'rounded-[1.2rem]' : 'rounded-t-2xl',
        )}
      >
        {service.coverImage ? (
          <div className="relative w-full h-44">
            <NextImage
              src={service.coverImage}
              alt={service.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-700"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              unoptimized
            />
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        ) : (
          <div
            className="w-full h-44 flex items-center justify-center relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${hexAlpha(primaryColor,'18')}, ${hexAlpha(accentColor,'25')})`,
            }}
          >
            {/* Decorative blobs */}
            <div
              className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20 blur-2xl"
              style={{ backgroundColor: primaryColor }}
            />
            <div
              className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full opacity-20 blur-2xl"
              style={{ backgroundColor: accentColor }}
            />
            <Icon
              className="h-16 w-16 transition-transform group-hover:scale-110 duration-500 relative z-10"
              style={{ color: primaryColor }}
            />
          </div>
        )}
        {/* Price badge */}
        <div
          className="absolute top-3 right-3 px-3 py-1 rounded-full text-white text-sm font-black shadow-lg backdrop-blur-md"
          style={{ backgroundColor: hexAlpha(primaryColor, 'e8') }}
        >
          {formatCurrency(service.price)}
        </div>
        {/* Duration badge */}
        <div className="absolute bottom-3 left-3 px-2.5 py-0.5 rounded-full text-white text-xs font-semibold bg-black/40 backdrop-blur-sm flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {service.durationMinutes} min
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-[var(--foreground)] text-base mb-1 tracking-tight">
          {service.name}
        </h3>
        {service.description && (
          <p className="text-[var(--foreground-tertiary)] text-sm line-clamp-2 mb-3 leading-relaxed">
            {service.description}
          </p>
        )}
        <div
          className="flex items-center gap-1 text-sm font-bold transition-all duration-300"
          style={{ color: primaryColor }}
        >
          Select Service
          <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </div>
      </div>

      {/* Selected check overlay */}
      {isSelected && (
        <div
          className="absolute top-3 left-3 h-7 w-7 rounded-full flex items-center justify-center shadow-lg"
          style={{ backgroundColor: primaryColor }}
        >
          <Check className="h-4 w-4 text-white" />
        </div>
      )}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Status Badge Helper                                                        */
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
/*  Main Page                                                                 */
/* -------------------------------------------------------------------------- */

export default function PublicBookingPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--background-secondary)]">
        <div className="skeleton h-[280px] w-full" />
        <div className="skeleton h-14 w-full" />
        <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
          <div className="skeleton h-10 w-64 rounded-full mx-auto" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-64 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    }>
      <PublicBookingPage />
    </Suspense>
  );
}

function PublicBookingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const [studio, setStudio] = useState<Studio | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState('');
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

  // Abort controllers to cancel in-flight requests on unmount / re-fetch
  const studioAbortRef = useRef<AbortController | null>(null);
  const historyAbortRef = useRef<AbortController | null>(null);
  const slotsAbortRef = useRef<AbortController | null>(null);

  // Derived branding
  const brand = useMemo(() => {
    const bc = studio?.brandingConfig || {};
    return {
      primaryColor: bc.primaryColor || '#7c3aed',
      secondaryColor: bc.secondaryColor || '#5f6368',
      accentColor: bc.accentColor || '#db2777',
      fontFamily: bc.fontFamily || 'Inter',
      headerText: bc.headerText || studio?.name || '',
      tagline: bc.tagline || '',
      heroStyle: bc.heroStyle || 'mesh',
      cardTheme: bc.cardTheme || 'modern',
      buttonShape: bc.buttonShape || 'rounded',
    };
  }, [studio]);

  // All Google Fonts are pre-loaded in globals.css — no dynamic injection needed.

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
          setActiveTab('history');
        }
      } catch {
        localStorage.removeItem('customer_token');
      }
    },
    [], // intentionally empty — only uses stable setters and API_URL constant
  );

  const fetchStudioHistory = useCallback(async () => {
    const token = localStorage.getItem('customer_token');
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
          setSelectedService(service);
          setStep(2);
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
      localStorage.setItem('customer_token', token);
      const refreshToken = searchParams.get('refreshToken');
      if (refreshToken) localStorage.setItem('customer_refresh_token', refreshToken);
      window.history.replaceState({}, '', window.location.pathname);
      fetchMe(token);
    } else {
      const storedToken = localStorage.getItem('customer_token');
      if (storedToken) fetchMe(storedToken);
    }
    loadStudio();
    // Cleanup: abort all in-flight requests on unmount
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

  const handleSaveProfile = async () => {
    const token = localStorage.getItem('customer_token');
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
    localStorage.removeItem('customer_token');
    localStorage.removeItem('customer_refresh_token');
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
      // Reject the current quote with a counter-offer note
      await portalApi.rejectQuote(counterOfferId, `Counter-offer: ${formatCurrency(amount)}${counterOfferNote ? ' — ' + counterOfferNote : ''}`);
      addToast('success', `Counter-offer of ${formatCurrency(amount)} sent! The studio will review and respond.`);
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

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedTime('');
    if (selectedService && date) {
      loadTimeSlots(selectedService.id, date);
    }
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedTime || !customerData.name || !customerData.phone) {
      addToast('error', 'Please fill all required fields');
      return;
    }
    if (studio?.defaultTerms && !acceptedTerms) {
      addToast('error', 'Please accept the terms and conditions');
      return;
    }
    setSubmitting(true);
    try {
      const response = await axios.post(
        `${API_URL}/public/studios/${params.slug}/bookings`,
        {
          customerName: customerData.name,
          customerEmail: customerData.email || undefined,
          customerPhone: customerData.phone,
          serviceId: selectedService.id,
          scheduledAt: selectedTime,
          customerNotes: customerData.notes || undefined,
          acceptedTerms: acceptedTerms,
        },
      );
      setBookingId(response.data?.id ?? '');
      setStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      addToast('success', 'Booking request submitted successfully!');
    } catch (error) {
      const e = error as { response?: { data?: { message?: string } } };
      addToast('error', e.response?.data?.message || 'Failed to submit booking');
    } finally {
      setSubmitting(false);
    }
  };

  const resetBooking = () => {
    setStep(1);
    setSelectedService(null);
    setSelectedDate('');
    setSelectedTime('');
    setBookingId('');
    setAcceptedTerms(false);
    setCustomerData({ name: '', email: '', phone: '', notes: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return (
    <div className="min-h-screen bg-[var(--background-secondary)]">
      {/* Hero skeleton */}
      <div className="skeleton h-[280px] w-full" />
      {/* Tab bar skeleton */}
      <div className="skeleton h-14 w-full" />
      {/* Content skeleton */}
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <div className="skeleton h-10 w-64 rounded-full mx-auto" />
        <div className="skeleton h-6 w-48 rounded-lg mx-auto" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
  if (!studio)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background-secondary)]">
        <div className="text-center p-8 max-w-sm">
          <div className="w-20 h-20 rounded-3xl bg-[var(--surface-2)] flex items-center justify-center mx-auto mb-6">
            <Camera className="h-10 w-10 text-[var(--foreground-tertiary)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">Studio Not Found</h1>
          <p className="text-[var(--foreground-secondary)]">
            {errorStatus || "The studio you're looking for doesn't exist or is not accepting bookings."}
          </p>
        </div>
      </div>
    );

  const minDate = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  /* ------------------------------------------------------------------ */
  /*  Button radius helper                                               */
  /* ------------------------------------------------------------------ */
  const btnRadius =
    brand.buttonShape === 'pill' ? '9999px' : brand.buttonShape === 'luxury-sharp' ? '6px' : '0.875rem';

  return (
    <div
      className="studio-portal min-h-screen bg-[var(--background-secondary)]"
      style={{
        fontFamily: `"${brand.fontFamily}", DM Sans, sans-serif`,
        '--studio-primary': brand.primaryColor,
        '--studio-accent': brand.accentColor,
        '--studio-font': `"${brand.fontFamily}", DM Sans, sans-serif`,
      } as React.CSSProperties}
    >
      {/* Force font on all children — overrides Tailwind/body CSS resets */}
      <style dangerouslySetInnerHTML={{ __html: `.studio-portal,.studio-portal *{font-family:"${brand.fontFamily}",DM Sans,sans-serif!important}` }} />
      {/* ------------------------------------------------------------------ */}
      {/*  Hero Header                                                        */}
{/*  */}
      <header
        className={cn(
          'relative overflow-hidden',
          brand.heroStyle === 'mesh' ? 'min-h-[280px] flex items-center py-10' : 'py-10 sm:py-14',
        )}
        style={{
          backgroundColor: brand.heroStyle === 'solid' ? brand.primaryColor : undefined,
          background:
            brand.heroStyle === 'mesh'
              ? `radial-gradient(ellipse at 0% 0%, ${hexAlpha(brand.primaryColor,'cc')} 0%, transparent 55%),
                 radial-gradient(ellipse at 100% 0%, ${hexAlpha(brand.accentColor,'99')} 0%, transparent 55%),
                 radial-gradient(ellipse at 50% 100%, ${hexAlpha(brand.primaryColor,'66')} 0%, transparent 60%),
                 linear-gradient(160deg, #0c0c1a 0%, #1a0a2e 50%, #0c0c1a 100%)`
              : brand.heroStyle === 'glass'
                ? `linear-gradient(135deg, ${brand.primaryColor}, ${brand.accentColor})`
                : undefined,
        }}
      >
        {/* Animated noise/grain overlay */}
        {(brand.heroStyle === 'mesh' || brand.heroStyle === 'solid') && (
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
            }}
          />
        )}

        {/* Floating ambient orbs for mesh style */}
        {brand.heroStyle === 'mesh' && (
          <>
            <div
              className="absolute top-0 left-1/4 w-72 h-72 rounded-full opacity-30 blur-3xl pointer-events-none"
              style={{ backgroundColor: brand.primaryColor }}
            />
            <div
              className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none"
              style={{ backgroundColor: brand.accentColor }}
            />
          </>
        )}

        {/* Pattern dots */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 w-full">
          <div
            className={cn(
              'flex items-center gap-5 sm:gap-8',
              brand.heroStyle === 'glass' &&
                'bg-white/10 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl border border-white/20 shadow-2xl',
            )}
          >
            {/* Logo */}
            {studio?.logoUrl ? (
              <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-2xl bg-white/15 backdrop-blur-sm shadow-xl border border-white/20">
                <NextImage
                  src={
                    studio.logoUrl.startsWith('http')
                      ? studio.logoUrl
                      : `${API_URL}${studio.logoUrl.startsWith('/') ? '' : '/'}${studio.logoUrl}`
                  }
                  alt={studio.name || 'Studio'}
                  fill
                  className="object-contain p-1"
                  sizes="80px"
                  unoptimized
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="h-16 w-16 sm:h-20 sm:w-20 shrink-0 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-xl border border-white/20">
                <Camera className="h-8 w-8 text-white" />
              </div>
            )}

            {/* Text */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                {brand.headerText}
              </h1>
              {brand.tagline && (
                <p className="text-white/75 text-sm sm:text-lg mt-1.5 font-medium">
                  {brand.tagline}
                </p>
              )}
              <div className="flex flex-wrap gap-3 mt-4">
                <a
                  href={`mailto:${studio.email}`}
                  className="flex items-center gap-1.5 text-white/80 hover:text-white text-xs sm:text-sm font-medium bg-white/10 hover:bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 transition-all duration-200"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate max-w-[160px]">{studio.email}</span>
                </a>
                <a
                  href={`tel:${studio.phone}`}
                  className="flex items-center gap-1.5 text-white/80 hover:text-white text-xs sm:text-sm font-medium bg-white/10 hover:bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 transition-all duration-200"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {studio.phone}
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/*  Tab Navigation                                                     */}
{/*  */}
      <div className="sticky top-0 z-50 bg-[var(--background)]/85 backdrop-blur-xl border-b border-[var(--border)] shadow-sm">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex h-full">
            {(
              [
                { id: 'book' as const, label: 'Book', icon: BookOpen },
                { id: 'history' as const, label: 'My History', icon: History },
                { id: 'account' as const, label: 'Account', icon: User },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'flex items-center gap-2 px-4 sm:px-5 h-full text-sm font-semibold border-b-2 transition-all duration-200',
                  activeTab === id
                    ? 'border-current'
                    : 'border-transparent text-[var(--foreground-tertiary)] hover:text-[var(--foreground-secondary)] hover:border-[var(--border-strong)]',
                )}
                style={activeTab === id ? { borderColor: brand.primaryColor, color: brand.primaryColor } : {}}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:block">{label}</span>
                <span className="sm:hidden">{label.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {authUser ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--surface-2)]">
                <div
                  className="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-black"
                  style={{ backgroundColor: brand.primaryColor }}
                >
                  {(authUser.name || '?').charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-[var(--foreground-secondary)] hidden sm:block max-w-[120px] truncate">
                  {authUser.name}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm text-[var(--foreground-tertiary)] hover:text-[var(--danger)] transition-colors px-2.5 py-1.5 rounded-lg hover:bg-[var(--danger)]/5"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                const returnUrl = encodeURIComponent(window.location.pathname);
                window.location.href = `${API_URL}/auth/google?state=${returnUrl}`;
              }}
              className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full text-white transition-all hover:opacity-90 hover:shadow-md"
              style={{ backgroundColor: brand.primaryColor }}
            >
              <Chrome className="h-4 w-4" />
              <span className="hidden sm:block">Sign In</span>
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/*  Main Content                                                       */}
{/*  */}
      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* ============================================================== */}
        {/*  BOOK TAB                                                       */}
        {/* /* ============================================================== */}
        {activeTab === 'book' && (
          <>
            <StepIndicator step={step} brand={brand} />

            {/* ---------------------------------------------------------- */}
            {/*  Step 1: Choose Service                                     */}
{/*  */}
            {step === 1 && (
              <div className="animate-fade-in">
                <div className="text-center mb-12">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-sm font-semibold mb-4">
                    <Sparkles className="h-4 w-4" />
                    {studio.services?.length || 0} services available
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--foreground)] tracking-tight mb-3">
                    What&apos;s the Occasion?
                  </h2>
                  <p className="text-[var(--foreground-tertiary)] text-lg max-w-xl mx-auto">
                    Browse our photography packages and select the one that fits your vision.
                  </p>
                </div>

                {hasOccasions ? (
                  <div className="space-y-12">
                    {Object.entries(occasionGroups).map(([occasion, services]) => {
                      const OccIcon = getOccasionIcon(occasion);
                      return (
                        <div
                          key={occasion}
                          id={`occasion-${occasion.toLowerCase()}`}
                          className={cn(
                            'transition-all duration-700 rounded-3xl',
                            highlightedOccasion === occasion.toLowerCase() &&
                              'ring-2 ring-offset-4 p-4',
                          )}
                          style={{}}
                        >
                          <div className="flex items-center gap-2 mb-6">
                            <div
                              className="h-8 w-8 rounded-xl flex items-center justify-center"
                              style={{ backgroundColor: hexAlpha(brand.primaryColor, '18') }}
                            >
                              <OccIcon className="h-4 w-4" style={{ color: brand.primaryColor }} />
                            </div>
                            <h3 className="text-base font-bold uppercase tracking-widest" style={{ color: brand.primaryColor }}>
                              {occasion.charAt(0).toUpperCase() + occasion.slice(1)}
                            </h3>
                            <div className="h-px flex-1 bg-[var(--border)]" />
                          </div>
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {services.map((service) => (
                              <OccasionCard
                                key={service.id}
                                service={service}
                                primaryColor={brand.primaryColor}
                                accentColor={brand.accentColor}
                                onClick={() => handleServiceSelect(service)}
                                cardTheme={brand.cardTheme}
                                buttonShape={brand.buttonShape}
                                isSelected={selectedService?.id === service.id}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {(studio.services || []).map((service) => (
                      <OccasionCard
                        key={service.id}
                        service={service}
                        primaryColor={brand.primaryColor}
                        accentColor={brand.accentColor}
                        onClick={() => handleServiceSelect(service)}
                        cardTheme={brand.cardTheme}
                        buttonShape={brand.buttonShape}
                        isSelected={selectedService?.id === service.id}
                      />
                    ))}
                  </div>
                )}

                {/* Portfolio */}
                {(studio.portfolioItems?.length ?? 0) > 0 && (
                  <div className="mt-20">
                    <div className="flex items-center gap-4 mb-8">
                      <div>
                        <h2 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">
                          Our Work
                        </h2>
                        <p className="text-[var(--foreground-tertiary)] text-sm mt-1">
                          A glimpse into what we create together
                        </p>
                      </div>
                      <div className="h-px flex-1 bg-[var(--border)]" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                      {studio.portfolioItems.map((item, i) => (
                        <div
                          key={item.id}
                          className={cn(
                            'group relative overflow-hidden rounded-2xl bg-[var(--surface-2)]',
                            // Make every 5th item double wide on larger grids for masonry feel
                            i % 5 === 0 ? 'sm:col-span-2 aspect-video' : 'aspect-square',
                          )}
                        >
                          <NextImage
                            src={item.imageUrl}
                            alt={item.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-700"
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            unoptimized
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400">
                            <div className="absolute bottom-0 left-0 right-0 p-4">
                              <div className="text-white font-semibold text-sm leading-tight">
                                {item.title}
                              </div>
                              {item.category && (
                                <div className="text-white/65 text-xs mt-0.5 font-medium uppercase tracking-wide">
                                  {item.category}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/*  Step 2: Date & Time                                        */}
{/*  */}
            {step === 2 && selectedService && (
              <div className="animate-fade-in max-w-2xl mx-auto">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 text-sm font-semibold mb-8 transition-all hover:gap-2.5"
                  style={{ color: brand.primaryColor }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Change Service
                </button>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] tracking-tight mb-2">
                  Pick a Date &amp; Time
                </h2>
                <p className="text-[var(--foreground-tertiary)] mb-8">
                  Select your preferred session date and time slot.
                </p>

                {/* Selected service summary */}
                <div
                  className="flex items-center gap-4 p-4 rounded-2xl mb-6 border"
                  style={{
                    backgroundColor: hexAlpha(brand.primaryColor, '0c'),
                    borderColor: hexAlpha(brand.primaryColor, '25'),
                  }}
                >
                  {(() => {
                    const SvcIcon = getOccasionIcon(selectedService.occasion);
                    return (
                      <div
                        className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: hexAlpha(brand.primaryColor, '20') }}
                      >
                        <SvcIcon className="h-5 w-5" style={{ color: brand.primaryColor }} />
                      </div>
                    );
                  })()}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[var(--foreground)]">{selectedService.name}</div>
                    <div className="text-sm text-[var(--foreground-tertiary)] flex items-center gap-2 mt-0.5">
                      <Clock className="h-3.5 w-3.5" />
                      {selectedService.durationMinutes} min session
                    </div>
                  </div>
                  <div className="text-lg font-black shrink-0" style={{ color: brand.primaryColor }}>
                    {formatCurrency(selectedService.price)}
                  </div>
                </div>

                <Card className="p-6 border-[var(--border)] shadow-sm bg-[var(--surface-0)]">
                  <div className="mb-6">
                    <Input
                      label="Select Date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      min={minDate}
                      max={maxDate}
                    />
                  </div>

                  {selectedDate && (
                    <div>
                      <label className="block text-sm font-semibold text-[var(--foreground)] mb-3 flex items-center gap-2">
                        <Clock className="h-4 w-4" style={{ color: brand.primaryColor }} />
                        Available Times
                      </label>
                      {loadingSlots ? (
                        <div className="text-center py-10">
                          <div
                            className="h-9 w-9 border-[3px] border-t-transparent rounded-full animate-spin mx-auto mb-3"
                            style={{ borderColor: brand.primaryColor, borderTopColor: 'transparent' }}
                          />
                          <p className="text-sm text-[var(--foreground-tertiary)]">
                            Finding available slots...
                          </p>
                        </div>
                      ) : timeSlots.length === 0 ? (
                        <div className="text-center py-10 bg-[var(--surface-1)] rounded-2xl border border-dashed border-[var(--border-strong)]">
                          <Calendar className="h-8 w-8 text-[var(--foreground-tertiary)] mx-auto mb-2" />
                          <p className="text-sm text-[var(--foreground-tertiary)] font-medium">
                            No slots available for this date
                          </p>
                          <p className="text-xs text-[var(--foreground-tertiary)] mt-1">
                            Try selecting a different day
                          </p>
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
                                  'px-2 py-2.5 rounded-xl border font-semibold text-sm transition-all duration-200',
                                  !slot.available &&
                                    'bg-[var(--surface-1)] text-[var(--foreground-tertiary)] border-[var(--border)] cursor-not-allowed opacity-50',
                                  slot.available &&
                                    !isSelected &&
                                    'bg-[var(--surface-0)] text-[var(--foreground-secondary)] border-[var(--border)] hover:border-current hover:text-current hover:bg-[var(--surface-1)] hover:-translate-y-0.5',
                                  isSelected && 'text-white border-transparent shadow-lg scale-105',
                                )}
                                style={
                                  isSelected
                                    ? {
                                        backgroundColor: brand.primaryColor,
                                        boxShadow: `0 4px 14px ${hexAlpha(brand.primaryColor,'50')}`,
                                      }
                                    : slot.available
                                      ? ({ '--hover-color': brand.primaryColor } as React.CSSProperties)
                                      : undefined
                                }
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
                      onClick={() => {
                        setStep(3);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="w-full mt-6 py-4 text-white font-bold transition-all hover:opacity-90 hover:shadow-xl flex items-center justify-center gap-2 shadow-lg"
                      style={{ backgroundColor: brand.primaryColor, borderRadius: btnRadius }}
                    >
                      Continue to Details
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  )}
                </Card>
              </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/*  Step 3: Customer Details + Terms                           */}
{/*  */}
            {step === 3 && (
              <div className="animate-fade-in max-w-2xl mx-auto">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1.5 text-sm font-semibold mb-8 transition-all hover:gap-2.5"
                  style={{ color: brand.primaryColor }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Change Date &amp; Time
                </button>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] tracking-tight mb-2">
                  Your Details
                </h2>
                <p className="text-[var(--foreground-tertiary)] mb-8">
                  Just a few more details to complete your booking request.
                </p>

                {/* Google sign-in CTA */}
                {!customerData.email && (
                  <div
                    className="p-5 mb-6 rounded-3xl border-2 border-dashed flex flex-col sm:flex-row items-center gap-5"
                    style={{
                      borderColor: hexAlpha(brand.primaryColor, '35'),
                      backgroundColor: hexAlpha(brand.primaryColor, '06'),
                    }}
                  >
                    <div className="h-14 w-14 rounded-2xl bg-white shadow-lg flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 24 24" className="h-7 w-7">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="font-bold text-[var(--foreground)]">
                        Save this booking to your account?
                      </h3>
                      <p className="text-sm text-[var(--foreground-tertiary)] mt-0.5">
                        Sign in to auto-fill your details and track bookings across studios.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto font-bold shrink-0"
                      onClick={() => {
                        const returnUrl = encodeURIComponent(
                          window.location.pathname + window.location.search,
                        );
                        window.location.href = `${API_URL}/auth/google?state=${returnUrl}`;
                      }}
                    >
                      Sign in with Google
                    </Button>
                  </div>
                )}

                {/* Summary card */}
                <Card className="p-5 mb-6 border-[var(--border)] bg-[var(--surface-0)]">
                  <h3 className="font-semibold text-[var(--foreground)] mb-4 text-sm uppercase tracking-widest">
                    Booking Summary
                  </h3>
                  <div className="space-y-2.5 text-sm">
                    {[
                      { label: 'Service', value: selectedService?.name },
                       {
                        label: 'Date',
                        value: selectedDate
                          ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : '',
                      },
                      {
                        label: 'Time',
                        value: selectedTime
                          ? new Date(selectedTime).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '',
                      },
                      { label: 'Duration', value: `${selectedService?.durationMinutes} minutes` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center">
                        <span className="text-[var(--foreground-tertiary)]">{label}</span>
                        <span className="font-semibold text-[var(--foreground)]">{value}</span>
                      </div>
                    ))}
                    <div
                      className="flex justify-between items-center text-base font-black pt-3 border-t border-[var(--border)]"
                    >
                      <span className="text-[var(--foreground)]">Total</span>
                      <span style={{ color: brand.primaryColor }}>
                        {formatCurrency(selectedService?.price)}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Customer form */}
                <Card className="p-6 border-[var(--border)] shadow-md bg-[var(--surface-0)]">
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
                      placeholder="e.g. +1 234 567 8900"
                    />
                    <Textarea
                      label="Additional Notes (Optional)"
                      value={customerData.notes}
                      onChange={(e) => setCustomerData({ ...customerData, notes: e.target.value })}
                      rows={3}
                      placeholder="Any special requests, vision, or details about your session..."
                    />

                    {/* Terms */}
                    {studio.defaultTerms && (
                      <div className="border border-[var(--border)] rounded-2xl p-4 space-y-3 bg-[var(--surface-1)]">
                        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                          <FileText className="h-4 w-4" style={{ color: brand.primaryColor }} />
                          Terms &amp; Conditions
                        </div>
                        <div className="max-h-36 overflow-y-auto text-xs text-[var(--foreground-tertiary)] bg-[var(--surface-2)] rounded-xl p-3 whitespace-pre-wrap leading-relaxed">
                          {studio.defaultTerms}
                        </div>
                        <label className="flex items-start gap-2.5 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={acceptedTerms}
                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-[var(--border-strong)] cursor-pointer"
                            style={{ accentColor: brand.primaryColor }}
                          />
                          <span className="text-sm text-[var(--foreground-secondary)] group-hover:text-[var(--foreground)] transition-colors">
                            I have read and agree to the terms and conditions.
                          </span>
                        </label>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting || (!!studio.defaultTerms && !acceptedTerms)}
                      className={cn(
                        'w-full py-4 text-white font-bold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl',
                        submitting || (!!studio.defaultTerms && !acceptedTerms)
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:opacity-90',
                      )}
                      style={{ backgroundColor: brand.primaryColor, borderRadius: btnRadius }}
                    >
                      {submitting ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
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
                </Card>
              </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/*  Step 4: Confirmation                                       */}
{/*  */}
            {step === 4 && (
              <div className="animate-fade-in max-w-2xl mx-auto">
                {/* Celebration header */}
                <div className="text-center mb-10">
                  <div className="relative inline-flex">
                    <div
                      className="w-24 h-24 rounded-full flex items-center justify-center shadow-2xl"
                      style={{
                        background: `linear-gradient(135deg, var(--success), ${brand.primaryColor})`,
                      }}
                    >
                      <Check className="h-12 w-12 text-white" strokeWidth={3} />
                    </div>
                    {/* Confetti dots */}
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-3 h-3 rounded-full opacity-80"
                        style={{
                          backgroundColor: i % 2 === 0 ? brand.primaryColor : brand.accentColor,
                          top: `${Math.sin((i * Math.PI) / 3) * 44 + 50}%`,
                          left: `${Math.cos((i * Math.PI) / 3) * 44 + 50}%`,
                          transform: 'translate(-50%, -50%)',
                          width: i % 3 === 0 ? '10px' : '6px',
                          height: i % 3 === 0 ? '10px' : '6px',
                        }}
                      />
                    ))}
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--foreground)] tracking-tight mt-6 mb-2">
                    You&apos;re All Set!
                  </h2>
                  <p className="text-[var(--foreground-secondary)] text-lg">
                    Your booking request has been submitted to{' '}
                    <span className="font-semibold text-[var(--foreground)]">{studio.name}</span>.
                  </p>
                  <div className="inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full bg-[var(--surface-2)] text-[var(--foreground-tertiary)] text-sm font-mono">
                    Booking ID: <span className="font-bold text-[var(--foreground-secondary)]">{bookingId.slice(-8).toUpperCase()}</span>
                  </div>
                </div>

                {/* Details card */}
                <Card className="p-6 mb-6 border-[var(--border)] shadow-md">
                  <h3 className="font-bold text-[var(--foreground)] mb-5 text-sm uppercase tracking-widest">
                    Booking Details
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: hexAlpha(brand.primaryColor, '15') }}
                      >
                        <Camera className="h-[18px] w-[18px]" style={{ color: brand.primaryColor }} />
                      </div>
                      <div>
                        <div className="text-xs text-[var(--foreground-tertiary)] font-medium uppercase tracking-wider mb-0.5">
                          Service
                        </div>
                        <div className="font-semibold text-[var(--foreground)]">
                          {selectedService?.name}
                        </div>
                        <div className="text-sm text-[var(--foreground-tertiary)]">
                          {selectedService?.durationMinutes} minutes · {formatCurrency(selectedService?.price)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div
                        className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: hexAlpha(brand.primaryColor, '15') }}
                      >
                        <Calendar className="h-[18px] w-[18px]" style={{ color: brand.primaryColor }} />
                      </div>
                      <div>
                        <div className="text-xs text-[var(--foreground-tertiary)] font-medium uppercase tracking-wider mb-0.5">
                          Date &amp; Time
                        </div>
                        <div className="font-semibold text-[var(--foreground)]">
                          {new Date(selectedTime).toLocaleString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div
                        className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: hexAlpha(brand.primaryColor, '15') }}
                      >
                        <Phone className="h-[18px] w-[18px]" style={{ color: brand.primaryColor }} />
                      </div>
                      <div>
                        <div className="text-xs text-[var(--foreground-tertiary)] font-medium uppercase tracking-wider mb-0.5">
                          Contact
                        </div>
                        <div className="font-semibold text-[var(--foreground)]">
                          {customerData.name}
                        </div>
                        <div className="text-sm text-[var(--foreground-tertiary)]">
                          {customerData.phone}
                          {customerData.email && ` · ${customerData.email}`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div
                        className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: hexAlpha(brand.primaryColor, '15') }}
                      >
                        <MapPin className="h-[18px] w-[18px]" style={{ color: brand.primaryColor }} />
                      </div>
                      <div>
                        <div className="text-xs text-[var(--foreground-tertiary)] font-medium uppercase tracking-wider mb-0.5">
                          Studio
                        </div>
                        <div className="font-semibold text-[var(--foreground)]">{studio.name}</div>
                        <div className="text-sm text-[var(--foreground-tertiary)]">{studio.email}</div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* What's next */}
                <div
                  className="rounded-2xl p-5 mb-8 flex items-start gap-4"
                  style={{
                    backgroundColor: hexAlpha(brand.primaryColor, '0d'),
                    border: `1px solid ${hexAlpha(brand.primaryColor,'25')}`,
                  }}
                >
                  <PartyPopper
                    className="h-5 w-5 shrink-0 mt-0.5"
                    style={{ color: brand.primaryColor }}
                  />
                  <div>
                    <div className="font-bold text-[var(--foreground)] mb-1">What happens next?</div>
                    <p className="text-sm text-[var(--foreground-secondary)] leading-relaxed">
                      The studio will review your booking and reach out to{' '}
                      <strong>{customerData.phone}</strong> to confirm availability, share details, and
                      prepare for your session.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={resetBooking}
                    className="flex-1 py-3.5 rounded-xl border border-[var(--border)] text-[var(--foreground-secondary)] font-bold hover:bg-[var(--surface-1)] hover:border-[var(--border-strong)] transition-all"
                    style={{ borderRadius: btnRadius }}
                  >
                    Book Another Session
                  </button>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="flex-1 py-3.5 text-white font-bold transition-all hover:opacity-90 shadow-lg flex items-center justify-center gap-2"
                    style={{ backgroundColor: brand.primaryColor, borderRadius: btnRadius }}
                  >
                    <History className="h-4 w-4" />
                    View My Bookings
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ============================================================== */}
        {/*  HISTORY TAB                                                    */}
        {/* /* ============================================================== */}
        {activeTab === 'history' && (
          <div className="animate-fade-in max-w-3xl mx-auto">
            {!authUser ? (
              <div className="text-center py-24">
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${hexAlpha(brand.primaryColor,'20')}, ${hexAlpha(brand.accentColor,'20')})` }}
                >
                  <History className="h-10 w-10" style={{ color: brand.primaryColor }} />
                </div>
                <h2 className="text-2xl font-extrabold text-[var(--foreground)] mb-2">
                  Sign in to view your history
                </h2>
                <p className="text-[var(--foreground-tertiary)] mb-8 max-w-sm mx-auto">
                  Track all your bookings with {studio.name} in one place.
                </p>
                <button
                  onClick={() => {
                    const returnUrl = encodeURIComponent(window.location.pathname);
                    window.location.href = `${API_URL}/auth/google?state=${returnUrl}`;
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-white shadow-lg hover:shadow-xl transition-all hover:opacity-90"
                  style={{ backgroundColor: brand.primaryColor }}
                >
                  <Chrome className="h-5 w-5" />
                  Sign in with Google
                </button>
              </div>
            ) : loadingHistory ? (
              <div className="space-y-10">
                <div className="space-y-3">
                  <div className="skeleton h-8 w-40 rounded-xl" />
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="skeleton h-24 w-full rounded-2xl" />
                  ))}
                </div>
                <div className="space-y-3">
                  <div className="skeleton h-8 w-32 rounded-xl" />
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="skeleton h-16 w-full rounded-2xl" />
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-10">
                {/* Bookings */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-9 w-9 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: hexAlpha(brand.primaryColor, '18') }}
                      >
                        <BookOpen className="h-[18px] w-[18px]" style={{ color: brand.primaryColor }} />
                      </div>
                      <div>
                        <h2 className="text-lg font-extrabold text-[var(--foreground)]">
                          My Bookings
                        </h2>
                        <p className="text-xs text-[var(--foreground-tertiary)]">
                          at {studio.name}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('book')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white shadow-md hover:shadow-lg transition-all hover:opacity-90"
                      style={{ backgroundColor: brand.primaryColor }}
                    >
                      <Camera className="h-3.5 w-3.5" />
                      New Session
                    </button>
                  </div>

                  {bookings.length === 0 ? (
                    <div className="py-12 text-center rounded-2xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--surface-0)]">
                      <BookOpen className="h-10 w-10 text-[var(--foreground-tertiary)] mx-auto mb-3" />
                      <p className="font-medium text-[var(--foreground-secondary)] mb-1">
                        No bookings yet
                      </p>
                      <p className="text-sm text-[var(--foreground-tertiary)]">
                        Your sessions with {studio.name} will appear here.
                      </p>
                      <button
                        onClick={() => setActiveTab('book')}
                        className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition-all hover:opacity-90"
                        style={{ backgroundColor: brand.primaryColor }}
                      >
                        <Camera className="h-4 w-4" />
                        Book a Session
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bookings.map((b) => (
                        <Card
                          key={b.id}
                          className={cn(
                            'p-5 border-[var(--border)] transition-all duration-300 hover:shadow-md',
                            b.status === 'QUOTED' &&
                              'shadow-lg border-transparent ring-1 ring-offset-2',
                          )}
                          style={
                            b.status === 'QUOTED'
                              ? {
                                  backgroundColor: hexAlpha(brand.primaryColor, '05'),
                                  boxShadow: `0 0 0 1px ${hexAlpha(brand.primaryColor,'60')}`,
                                }
                              : {}
                          }
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 min-w-0">
                              <div
                                className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                                style={{ backgroundColor: hexAlpha(brand.primaryColor, '15') }}
                              >
                                <Camera className="h-5 w-5" style={{ color: brand.primaryColor }} />
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-[var(--foreground)] truncate">
                                  {b.service.name}
                                </div>
                                <div className="text-sm text-[var(--foreground-tertiary)] mt-0.5 flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 shrink-0" />
                                  {new Date(b.scheduledAt).toLocaleString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </div>
                                <div className="text-sm text-[var(--foreground-tertiary)] flex items-center gap-1.5 mt-0.5">
                                  <Clock className="h-3.5 w-3.5 shrink-0" />
                                  {b.service.durationMinutes} min
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0 space-y-1.5">
                              <StatusBadge status={b.status} />
                              <div
                                className="text-sm font-black block"
                                style={{ color: brand.primaryColor }}
                              >
                                {formatCurrency(b.quoteAmount || b.service.price)}
                              </div>
                            </div>
                          </div>

                          {/* Quote actions */}
                          {b.status === 'QUOTED' && (
                            <div className="mt-4 pt-4 border-t border-[var(--border)]">
                              <div
                                className="p-4 rounded-2xl border mb-4"
                                style={{
                                  backgroundColor: hexAlpha(brand.primaryColor, '08'),
                                  borderColor: hexAlpha(brand.primaryColor, '20'),
                                }}
                              >
                                <div
                                  className="flex items-center gap-2 font-bold text-sm mb-2"
                                  style={{ color: brand.primaryColor }}
                                >
                                  <Sparkles className="h-4 w-4" />
                                  Studio has sent you a quote
                                </div>
                                {b.quoteNotes && (
                                  <p className="text-sm text-[var(--foreground-secondary)] italic border-l-2 pl-3 mb-3" style={{ borderColor: hexAlpha(brand.primaryColor, '50') }}>
                                    &quot;{b.quoteNotes}&quot;
                                  </p>
                                )}
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-[var(--foreground-tertiary)] font-medium">
                                    Quoted Amount
                                  </span>
                                  <span className="text-xl font-black text-[var(--foreground)]">
                                    {formatCurrency(b.quoteAmount)}
                                  </span>
                                </div>
                              </div>

                              {/* Counter-offer form (inline toggle) */}
                              {counterOfferId === b.id ? (
                                <div className="space-y-3 mb-3 p-3 rounded-2xl bg-[var(--surface-1)] border border-[var(--border-light)]">
                                  <p className="text-xs font-bold text-[var(--foreground-secondary)] uppercase tracking-wide">Your Counter-Offer</p>
                                  <div className="flex items-center gap-2 bg-[var(--surface-0)] border border-[var(--border-light)] rounded-xl px-3 py-2.5">
                                    <span className="text-sm font-semibold text-[var(--foreground-tertiary)]">$</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      className="flex-1 bg-transparent text-sm font-semibold text-[var(--foreground)] outline-none tabular-nums"
                                      placeholder="Your proposed amount"
                                      value={counterOfferAmount}
                                      onChange={(e) => setCounterOfferAmount(e.target.value)}
                                    />
                                  </div>
                                  <textarea
                                    rows={2}
                                    className="w-full bg-[var(--surface-0)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--foreground)] placeholder-[var(--foreground-tertiary)] outline-none resize-none"
                                    placeholder="Optional note (e.g. &quot;Can we do a shorter session?&quot;)"
                                    value={counterOfferNote}
                                    onChange={(e) => setCounterOfferNote(e.target.value)}
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={handleSendCounterOffer}
                                      disabled={sendingCounter || !counterOfferAmount || parseFloat(counterOfferAmount) <= 0}
                                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                                      style={{ backgroundColor: brand.primaryColor }}
                                    >
                                      {sendingCounter ? (
                                        <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                      ) : (
                                        <ThumbsUp className="h-4 w-4" />
                                      )}
                                      Send Counter-Offer
                                    </button>
                                    <button
                                      onClick={() => { setCounterOfferId(null); setCounterOfferAmount(''); setCounterOfferNote(''); }}
                                      className="px-4 rounded-xl border border-[var(--border)] text-[var(--foreground-secondary)] font-semibold text-sm hover:bg-[var(--overlay-light)] transition-all"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : null}

                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAcceptQuote(b.id)}
                                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-white transition-all hover:opacity-90 hover:shadow-lg"
                                  style={{ backgroundColor: 'var(--success)' }}
                                >
                                  <ThumbsUp className="h-4 w-4" />
                                  Accept
                                </button>
                                <button
                                  onClick={() => {
                                    setCounterOfferId(counterOfferId === b.id ? null : b.id);
                                    setCounterOfferAmount(b.quoteAmount && !isNaN(Number(b.quoteAmount)) ? (Number(b.quoteAmount) * 0.9).toFixed(0) : '');
                                    setCounterOfferNote('');
                                  }}
                                  className="px-4 flex items-center justify-center gap-1.5 border border-[var(--border)] text-[var(--foreground-secondary)] py-2.5 rounded-xl font-bold hover:bg-[var(--overlay-light)] transition-all text-sm"
                                >
                                  Counter
                                </button>
                                <button
                                  onClick={() => handleRejectQuote(b.id)}
                                  className="px-4 flex items-center justify-center gap-1.5 border border-[var(--danger)]/30 text-[var(--danger)] py-2.5 rounded-xl font-bold hover:bg-[var(--danger)]/8 transition-all"
                                >
                                  <ThumbsDown className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Invoices */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div
                      className="h-9 w-9 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: hexAlpha(brand.primaryColor, '18') }}
                    >
                      <Receipt className="h-4.5 w-4.5" style={{ color: brand.primaryColor }} />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold text-[var(--foreground)]">Invoices</h2>
                      <p className="text-xs text-[var(--foreground-tertiary)]">
                        Your billing history
                      </p>
                    </div>
                  </div>

                  {invoices.length === 0 ? (
                    <div className="py-10 text-center rounded-2xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--surface-0)]">
                      <Receipt className="h-8 w-8 text-[var(--foreground-tertiary)] mx-auto mb-2" />
                      <p className="text-sm font-medium text-[var(--foreground-secondary)]">
                        No invoices yet
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {invoices.map((inv) => (
                        <Card
                          key={inv.id}
                          className="p-4 border-[var(--border)] hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                                style={{ backgroundColor: hexAlpha(brand.primaryColor, '15') }}
                              >
                                <Receipt
                                  className="h-[18px] w-[18px]"
                                  style={{ color: brand.primaryColor }}
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-[var(--foreground)] font-mono text-sm">
                                  #{inv.id.slice(-8).toUpperCase()}
                                </div>
                                <div className="text-xs text-[var(--foreground-tertiary)] mt-0.5">
                                  {new Date(inv.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0 space-y-1">
                              <StatusBadge status={inv.status} />
                              <div
                                className="text-sm font-black block"
                                style={{ color: brand.primaryColor }}
                              >
                                {formatCurrency(inv.totalAmount)}
                              </div>
                            </div>
                          </div>
                        </Card>
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
        {/* /* ============================================================== */}
        {activeTab === 'account' && (
          <div className="animate-fade-in max-w-lg mx-auto">
            {!authUser ? (
              <div className="text-center py-24">
                <div
                  className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, ${hexAlpha(brand.primaryColor,'20')}, ${hexAlpha(brand.accentColor,'20')})`,
                  }}
                >
                  <User className="h-10 w-10" style={{ color: brand.primaryColor }} />
                </div>
                <h2 className="text-2xl font-extrabold text-[var(--foreground)] mb-2">
                  Sign in to manage your account
                </h2>
                <p className="text-[var(--foreground-tertiary)] mb-8 max-w-xs mx-auto">
                  Update your profile, name, and preferences.
                </p>
                <button
                  onClick={() => {
                    const returnUrl = encodeURIComponent(window.location.pathname);
                    window.location.href = `${API_URL}/auth/google?state=${returnUrl}`;
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-white shadow-lg hover:shadow-xl transition-all hover:opacity-90"
                  style={{ backgroundColor: brand.primaryColor }}
                >
                  <Chrome className="h-5 w-5" />
                  Sign in with Google
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Profile card */}
                <Card className="overflow-hidden border-[var(--border)] shadow-md">
                  {/* Banner */}
                  <div
                    className="h-20 w-full relative"
                    style={{
                      background: `linear-gradient(135deg, ${brand.primaryColor}, ${brand.accentColor})`,
                    }}
                  >
                    <div className="absolute inset-0 opacity-10"
                      style={{
                        backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                        backgroundSize: '20px 20px',
                      }}
                    />
                  </div>
                  <div className="px-6 pb-6 -mt-8">
                    <div
                      className="h-16 w-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-xl border-4 border-[var(--surface-0)] mb-4"
                      style={{ backgroundColor: brand.primaryColor }}
                    >
                      {(authUser.name || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="font-extrabold text-[var(--foreground)] text-xl">
                      {authUser.name}
                    </div>
                    <div className="text-sm text-[var(--foreground-tertiary)] mt-0.5">
                      {authUser.email}
                    </div>

                    <div className="mt-6 space-y-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--foreground-tertiary)] flex items-center gap-2">
                        <Settings className="h-3.5 w-3.5" />
                        Edit Profile
                      </h3>
                      <Input
                        label="Full Name"
                        value={profileEdits.name}
                        onChange={(e) =>
                          setProfileEdits((p) => ({ ...p, name: e.target.value }))
                        }
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
                        className="w-full h-11 shadow-lg font-bold"
                        style={{ backgroundColor: brand.primaryColor }}
                      >
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Sign out */}
                <Card className="p-5 border border-[var(--danger)]/20 bg-[var(--danger)]/3">
                  <h3 className="font-bold text-[var(--danger)] mb-1">Sign Out</h3>
                  <p className="text-sm text-[var(--foreground-secondary)] mb-4">
                    You will be signed out from your account on this device.
                  </p>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-5 py-2.5 border border-[var(--danger)]/30 text-[var(--danger)] font-semibold rounded-xl hover:bg-[var(--danger)]/8 transition-all"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </Card>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/*  Footer                                                             */}
{/*  */}
      <footer className="bg-[var(--surface-0)] border-t border-[var(--border)] mt-16 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="text-[var(--foreground-tertiary)] text-sm">
            &copy; {new Date().getFullYear()}{' '}
            <span className="font-semibold text-[var(--foreground-secondary)]">{studio.name}</span>
            . All rights reserved.
          </div>
          <div className="flex items-center justify-center gap-4 mt-2 text-sm">
            <a
              href={`mailto:${studio.email}`}
              className="flex items-center gap-1.5 transition-all hover:opacity-80 font-medium"
              style={{ color: brand.primaryColor }}
            >
              <Mail className="h-3.5 w-3.5" />
              {studio.email}
            </a>
            <span className="text-[var(--border-strong)]">·</span>
            <a
              href={`tel:${studio.phone}`}
              className="flex items-center gap-1.5 transition-all hover:opacity-80 font-medium"
              style={{ color: brand.primaryColor }}
            >
              <Phone className="h-3.5 w-3.5" />
              {studio.phone}
            </a>
          </div>
        </div>
      </footer>

      <ConfirmDialog
        isOpen={!!rejectConfirmId}
        onClose={() => setRejectConfirmId(null)}
        onConfirm={confirmRejectQuote}
        title="Reject Quote"
        description="Are you sure you want to reject this quote? This action cannot be undone."
        confirmLabel="Reject Quote"
        variant="danger"
      />
    </div>
  );
}
