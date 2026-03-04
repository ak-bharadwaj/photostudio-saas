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

function hexAlpha(color: string, alpha: string): string {
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) {
    return color + alpha;
  }
  return color;
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
/*  Step Indicator — minimal typographic style                                */
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
    <div className="flex items-center justify-center gap-0 mb-12">
      {STEPS.map((s, idx) => {
        const isActive = step === s.id;
        const isCompleted = step > s.id;
        return (
          <React.Fragment key={s.id}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300"
                style={{
                  backgroundColor: isActive
                    ? brand.primaryColor
                    : isCompleted
                    ? '#22c55e'
                    : 'transparent',
                  border: `2px solid ${isActive ? brand.primaryColor : isCompleted ? '#22c55e' : '#d1d5db'}`,
                  color: isActive || isCompleted ? '#fff' : '#9ca3af',
                }}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : s.id}
              </div>
              <span
                className="text-[10px] font-bold uppercase tracking-widest hidden sm:block"
                style={{ color: isActive ? brand.primaryColor : '#9ca3af' }}
              >
                {s.title}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className="h-[2px] w-10 sm:w-16 mx-1 mb-4 transition-all duration-500"
                style={{ backgroundColor: step > s.id ? '#22c55e' : '#e5e7eb' }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
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
}: {
  service: Service;
  primaryColor: string;
  accentColor: string;
  onClick: () => void;
  isSelected: boolean;
}) {
  const Icon = getOccasionIcon(service.occasion);

  return (
    <button
      onClick={onClick}
      className="group relative w-full text-left overflow-hidden transition-all duration-300 focus:outline-none"
      style={{
        borderRadius: '0px',
        outline: isSelected ? `3px solid ${primaryColor}` : '3px solid transparent',
        outlineOffset: '0px',
      }}
    >
      {/* Image / gradient area — tall aspect ratio for editorial feel */}
      <div className="relative overflow-hidden" style={{ aspectRatio: '3/4' }}>
        {service.coverImage ? (
          <>
            <NextImage
              src={service.coverImage}
              alt={service.name}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
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
                className="h-20 w-20 opacity-20"
                style={{ color: '#fff' }}
              />
            </div>
          </>
        )}

        {/* Selected indicator */}
        {isSelected && (
          <div
            className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: primaryColor }}
          >
            <Check className="h-4 w-4 text-white" />
          </div>
        )}

        {/* Duration chip */}
        <div className="absolute top-4 left-4 px-2.5 py-1 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold rounded-full flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {service.durationMinutes}m
        </div>

        {/* Bottom text overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="text-white/60 text-xs font-bold uppercase tracking-[0.2em] mb-1">
            {service.occasion || 'Photography'}
          </div>
          <h3 className="text-white text-xl font-black leading-tight tracking-tight mb-3">
            {service.name}
          </h3>
          {service.description && (
            <p className="text-white/70 text-sm leading-relaxed line-clamp-2 mb-4">
              {service.description}
            </p>
          )}
          <div className="flex items-center justify-between">
            <div className="text-white text-2xl font-black">
              {formatCurrency(service.price)}
            </div>
            <div
              className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-3 py-1.5 transition-all duration-200 group-hover:gap-2"
              style={{ color: isSelected ? primaryColor : 'rgba(255,255,255,0.8)' }}
            >
              Book Now
              <ChevronRight className="h-3.5 w-3.5" />
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
/*  Main Page Wrapper                                                          */
/* -------------------------------------------------------------------------- */

export default function PublicBookingPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black">
        <div className="skeleton h-screen w-full opacity-20" />
      </div>
    }>
      <PublicBookingPage />
    </Suspense>
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

  const studioAbortRef = useRef<AbortController | null>(null);
  const historyAbortRef = useRef<AbortController | null>(null);
  const slotsAbortRef = useRef<AbortController | null>(null);

  // Derived branding
  const brand = useMemo(() => {
    const bc = studio?.brandingConfig || {};
    return {
      primaryColor: bc.primaryColor || '#7c3aed',
      secondaryColor: bc.secondaryColor || '#0d2644',
      accentColor: bc.accentColor || '#db2777',
      fontFamily: bc.fontFamily || 'Inter',
      headerText: bc.headerText || studio?.name || '',
      tagline: bc.tagline || '',
      heroStyle: bc.heroStyle || 'mesh',
      cardTheme: bc.cardTheme || 'modern',
      buttonShape: bc.buttonShape || 'rounded',
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
          setActiveTab('history');
        }
      } catch {
        localStorage.removeItem('customer_token');
      }
    },
    [],
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
          <h1 className="text-2xl font-black text-white mb-2">Studio Not Found</h1>
          <p className="text-white/40">
            {errorStatus || "The studio you're looking for doesn't exist or is not accepting bookings."}
          </p>
        </div>
      </div>
    );

  const minDate = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const btnRadius =
    brand.buttonShape === 'pill' ? '9999px' : brand.buttonShape === 'luxury-sharp' ? '4px' : '12px';

  /* ------------------------------------------------------------------ */
  /*  Root wrapper — font override via CSS variable + direct font-family */
  /* ------------------------------------------------------------------ */

  return (
    <div
      className="studio-portal min-h-screen"
      style={{
        '--font-sans': `"${brand.fontFamily}", DM Sans, sans-serif`,
        '--studio-primary': brand.primaryColor,
        '--studio-accent': brand.accentColor,
        fontFamily: `"${brand.fontFamily}", DM Sans, sans-serif`,
        backgroundColor: '#f5f5f0',
      } as React.CSSProperties}
    >

      {/* ================================================================ */}
      {/*  HERO — full-bleed, dramatic, editorial                          */}
      {/* ================================================================ */}
      <header
        className="relative overflow-hidden"
        style={{ minHeight: '92vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
      >
        {/* Background */}
        <div
          className="absolute inset-0"
          style={{
            background:
              brand.heroStyle === 'mesh'
                ? `radial-gradient(ellipse at 20% 80%, ${hexAlpha(brand.primaryColor, 'cc')} 0%, transparent 50%),
                   radial-gradient(ellipse at 80% 20%, ${hexAlpha(brand.accentColor, '99')} 0%, transparent 45%),
                   linear-gradient(175deg, #080810 0%, #12101e 100%)`
                : brand.heroStyle === 'solid'
                ? brand.primaryColor
                : `linear-gradient(145deg, ${brand.primaryColor} 0%, ${brand.accentColor} 100%)`,
          }}
        />

        {/* Grain texture */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Large ambient orbs */}
        {brand.heroStyle === 'mesh' && (
          <>
            <div
              className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-20 pointer-events-none"
              style={{ backgroundColor: brand.primaryColor, top: '-100px', left: '-150px' }}
            />
            <div
              className="absolute w-[500px] h-[500px] rounded-full blur-[100px] opacity-15 pointer-events-none"
              style={{ backgroundColor: brand.accentColor, bottom: '0px', right: '-100px' }}
            />
          </>
        )}

        {/* Top bar: logo + nav */}
        <div className="absolute top-0 left-0 right-0 z-20 px-6 sm:px-12 pt-8 flex items-center justify-between">
          {/* Logo / Studio mark */}
          <div className="flex items-center gap-3">
            {studio.logoUrl ? (
              <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-white/10 border border-white/20">
                <NextImage
                  src={
                    studio.logoUrl.startsWith('http')
                      ? studio.logoUrl
                      : `${API_URL}${studio.logoUrl.startsWith('/') ? '' : '/'}${studio.logoUrl}`
                  }
                  alt={studio.name}
                  fill
                  className="object-contain p-1"
                  sizes="40px"
                  unoptimized
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                <Camera className="h-5 w-5 text-white" />
              </div>
            )}
            <span className="text-white/80 text-sm font-semibold tracking-wide hidden sm:block">
              {studio.name}
            </span>
          </div>

          {/* Auth / Sign in */}
          {authUser ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15">
                <div
                  className="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-black"
                  style={{ backgroundColor: brand.primaryColor }}
                >
                  {(authUser.name || '?').charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-white/80 hidden sm:block max-w-[100px] truncate">
                  {authUser.name}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-full bg-white/10 border border-white/15 text-white/60 hover:text-white/90 transition-colors"
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
              className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-full text-white/90 bg-white/10 hover:bg-white/20 border border-white/20 transition-all"
            >
              <Chrome className="h-4 w-4" />
              <span className="hidden sm:block">Sign In</span>
            </button>
          )}
        </div>

        {/* Hero content — bottom aligned, magazine style */}
        <div className="relative z-10 px-6 sm:px-12 lg:px-16 pb-14 sm:pb-20">
          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-5">
            <div className="h-[1px] w-10" style={{ backgroundColor: hexAlpha(brand.accentColor, 'cc') }} />
            <span
              className="text-xs font-bold uppercase tracking-[0.25em]"
              style={{ color: hexAlpha(brand.accentColor, 'ee') }}
            >
              Photography Studio
            </span>
          </div>

          {/* Studio name — oversized editorial */}
          <h1
            className="text-white leading-[0.9] tracking-[-0.03em] mb-6"
            style={{
              fontSize: 'clamp(3.5rem, 10vw, 9rem)',
              fontWeight: 900,
              fontFamily: `"${brand.fontFamily}", DM Sans, sans-serif`,
            }}
          >
            {brand.headerText}
          </h1>

          {/* Tagline */}
          {brand.tagline && (
            <p
              className="text-white/60 mb-8 max-w-xl"
              style={{ fontSize: 'clamp(1rem, 2vw, 1.35rem)', lineHeight: 1.5, fontWeight: 400 }}
            >
              {brand.tagline}
            </p>
          )}

          {/* CTA row */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => {
                const el = document.getElementById('portal-content');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex items-center gap-2 px-7 py-3.5 text-white font-bold text-sm tracking-wide transition-all hover:opacity-90 hover:-translate-y-0.5"
              style={{ backgroundColor: brand.primaryColor, borderRadius: btnRadius }}
            >
              Book a Session
              <ArrowRight className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-4 text-sm">
              <a
                href={`mailto:${studio.email}`}
                className="flex items-center gap-1.5 text-white/55 hover:text-white/90 transition-colors font-medium"
              >
                <Mail className="h-3.5 w-3.5" />
                <span className="hidden sm:block">{studio.email}</span>
                <span className="sm:hidden">Email</span>
              </a>
              <span className="text-white/20">·</span>
              <a
                href={`tel:${studio.phone}`}
                className="flex items-center gap-1.5 text-white/55 hover:text-white/90 transition-colors font-medium"
              >
                <Phone className="h-3.5 w-3.5" />
                {studio.phone}
              </a>
            </div>
          </div>
        </div>

        {/* Bottom edge — fade to content bg */}
        <div
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, #f5f5f0)' }}
        />
      </header>

      {/* ================================================================ */}
      {/*  TAB NAV                                                          */}
      {/* ================================================================ */}
      <div
        className="sticky top-0 z-50 border-b"
        style={{ backgroundColor: '#f5f5f0', borderColor: '#e0e0d8' }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-12 flex items-center justify-between h-14">
          <div className="flex h-full gap-0">
            {(
              [
                { id: 'book' as const, label: 'Book', icon: BookOpen },
                { id: 'history' as const, label: 'My Bookings', icon: History },
                { id: 'account' as const, label: 'Account', icon: User },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'flex items-center gap-2 px-4 sm:px-6 h-full text-xs font-bold uppercase tracking-[0.15em] border-b-2 transition-all duration-200',
                  activeTab === id
                    ? 'border-current'
                    : 'border-transparent text-black/30 hover:text-black/60',
                )}
                style={activeTab === id ? { borderColor: brand.primaryColor, color: brand.primaryColor } : {}}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:block">{label}</span>
                <span className="sm:hidden">{label.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* Service count badge */}
          <div className="text-[11px] font-bold uppercase tracking-widest text-black/30">
            {studio.services?.length || 0} Services
          </div>
        </div>
      </div>

      {/* ================================================================ */}
      {/*  MAIN CONTENT                                                     */}
      {/* ================================================================ */}
      <main id="portal-content" className="max-w-7xl mx-auto px-6 sm:px-12 py-14">

        {/* ============================================================== */}
        {/*  BOOK TAB                                                       */}
        {/* ============================================================== */}
        {activeTab === 'book' && (
          <>
            {/* Step 1: Services */}
            {step === 1 && (
              <div className="animate-fade-in">
                {/* Section header */}
                <div className="mb-12">
                  <div
                    className="text-xs font-bold uppercase tracking-[0.25em] mb-3"
                    style={{ color: brand.primaryColor }}
                  >
                    Choose Your Session
                  </div>
                  <h2
                    className="text-black leading-tight tracking-tight"
                    style={{
                      fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                      fontWeight: 900,
                      fontFamily: `"${brand.fontFamily}", DM Sans, sans-serif`,
                    }}
                  >
                    What&apos;s the{' '}
                    <span style={{ color: brand.primaryColor }}>Occasion?</span>
                  </h2>
                </div>

                {hasOccasions ? (
                  <div className="space-y-16">
                    {Object.entries(occasionGroups).map(([occasion, services]) => {
                      const OccIcon = getOccasionIcon(occasion);
                      return (
                        <div
                          key={occasion}
                          id={`occasion-${occasion.toLowerCase()}`}
                          className={cn(
                            'transition-all duration-700',
                            highlightedOccasion === occasion.toLowerCase() && 'ring-2 ring-offset-8 rounded-sm',
                          )}
                          style={{}}
                        >
                          {/* Occasion label */}
                          <div className="flex items-center gap-4 mb-6">
                            <OccIcon className="h-5 w-5" style={{ color: brand.primaryColor }} />
                            <span
                              className="text-xs font-black uppercase tracking-[0.25em]"
                              style={{ color: brand.primaryColor }}
                            >
                              {occasion.charAt(0).toUpperCase() + occasion.slice(1)}
                            </span>
                            <div className="h-px flex-1" style={{ backgroundColor: '#e0e0d8' }} />
                            <span className="text-xs font-semibold text-black/30">
                              {services.length} package{services.length !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {/* Cards — 3-col on lg, 2-col on md, 1 on sm */}
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1">
                            {services.map((service) => (
                              <ServiceCard
                                key={service.id}
                                service={service}
                                primaryColor={brand.primaryColor}
                                accentColor={brand.accentColor}
                                onClick={() => handleServiceSelect(service)}
                                isSelected={selectedService?.id === service.id}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-1">
                    {(studio.services || []).map((service) => (
                      <ServiceCard
                        key={service.id}
                        service={service}
                        primaryColor={brand.primaryColor}
                        accentColor={brand.accentColor}
                        onClick={() => handleServiceSelect(service)}
                        isSelected={selectedService?.id === service.id}
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
                        className="text-black leading-tight tracking-tight"
                        style={{
                          fontSize: 'clamp(2rem, 3.5vw, 3rem)',
                          fontWeight: 900,
                          fontFamily: `"${brand.fontFamily}", DM Sans, sans-serif`,
                        }}
                      >
                        Our Work
                      </h2>
                    </div>

                    {/* Masonry-feel grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
                      {studio.portfolioItems.map((item, i) => (
                        <div
                          key={item.id}
                          className={cn(
                            'group relative overflow-hidden bg-black/5',
                            i % 7 === 0 ? 'sm:col-span-2 sm:row-span-2' : '',
                          )}
                          style={{ aspectRatio: i % 7 === 0 ? 'auto' : '1/1' }}
                        >
                          <NextImage
                            src={item.imageUrl}
                            alt={item.title}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            unoptimized
                          />
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
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/*  Step 2: Date & Time                                        */}
            {/* ---------------------------------------------------------- */}
            {step === 2 && selectedService && (
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
                  className="text-black leading-tight tracking-tight mb-1"
                  style={{
                    fontSize: 'clamp(1.8rem, 3vw, 2.8rem)',
                    fontWeight: 900,
                    fontFamily: `"${brand.fontFamily}", DM Sans, sans-serif`,
                  }}
                >
                  Pick a Date & Time
                </h2>
                <p className="text-black/40 mb-8 text-sm">
                  Select your preferred session date and available time slot.
                </p>

                {/* Service summary bar */}
                <div
                  className="flex items-center gap-4 p-4 mb-8 border"
                  style={{ borderColor: hexAlpha(brand.primaryColor, '30'), borderRadius: '4px', backgroundColor: hexAlpha(brand.primaryColor, '06') }}
                >
                  {(() => {
                    const SvcIcon = getOccasionIcon(selectedService.occasion);
                    return <SvcIcon className="h-5 w-5 shrink-0" style={{ color: brand.primaryColor }} />;
                  })()}
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-black text-sm">{selectedService.name}</div>
                    <div className="text-xs text-black/40 mt-0.5 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {selectedService.durationMinutes} min session
                    </div>
                  </div>
                  <div className="text-lg font-black shrink-0" style={{ color: brand.primaryColor }}>
                    {formatCurrency(selectedService.price)}
                  </div>
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
                      <label className="block text-xs font-bold uppercase tracking-[0.15em] text-black/50 mb-4 flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" style={{ color: brand.primaryColor }} />
                        Available Times
                      </label>
                      {loadingSlots ? (
                        <div className="text-center py-12">
                          <div
                            className="h-8 w-8 border-[2px] border-t-transparent rounded-full animate-spin mx-auto mb-3"
                            style={{ borderColor: brand.primaryColor, borderTopColor: 'transparent' }}
                          />
                          <p className="text-xs text-black/40 font-medium">Finding available slots...</p>
                        </div>
                      ) : timeSlots.length === 0 ? (
                        <div className="text-center py-10 border border-dashed border-black/15 rounded">
                          <Calendar className="h-7 w-7 text-black/20 mx-auto mb-2" />
                          <p className="text-sm text-black/40 font-medium">No slots available</p>
                          <p className="text-xs text-black/30 mt-1">Try selecting a different day</p>
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
                                  slot.available && !isSelected && 'border-black/15 text-black/50 hover:border-current hover:-translate-y-0.5',
                                  isSelected && 'text-white border-transparent',
                                )}
                                style={{
                                  borderRadius: btnRadius,
                                  ...(isSelected
                                    ? { backgroundColor: brand.primaryColor }
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
                  className="text-black leading-tight tracking-tight mb-1"
                  style={{
                    fontSize: 'clamp(1.8rem, 3vw, 2.8rem)',
                    fontWeight: 900,
                    fontFamily: `"${brand.fontFamily}", DM Sans, sans-serif`,
                  }}
                >
                  Your Details
                </h2>
                <p className="text-black/40 mb-8 text-sm">
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
                  className="p-5 mb-6 border"
                  style={{ borderColor: '#e0e0d8', borderRadius: '4px', backgroundColor: '#fff' }}
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30 mb-4">
                    Booking Summary
                  </div>
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
                          ? new Date(selectedTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                          : '',
                      },
                      { label: 'Duration', value: `${selectedService?.durationMinutes} minutes` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center">
                        <span className="text-black/40 text-xs">{label}</span>
                        <span className="font-semibold text-black text-xs">{value}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-3 border-t border-black/8">
                      <span className="text-black font-black text-sm">Total</span>
                      <span className="text-lg font-black" style={{ color: brand.primaryColor }}>
                        {formatCurrency(selectedService?.price)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Form */}
                <div
                  className="p-6 border"
                  style={{ borderColor: '#e0e0d8', borderRadius: '4px', backgroundColor: '#fff' }}
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
                      placeholder="Special requests, vision, or details about your session..."
                    />

                    {/* Terms */}
                    {studio.defaultTerms && (
                      <div className="border border-black/10 rounded p-4 space-y-3 bg-black/[0.02]">
                        <div className="flex items-center gap-2 text-xs font-bold text-black/60 uppercase tracking-wider">
                          <FileText className="h-3.5 w-3.5" style={{ color: brand.primaryColor }} />
                          Terms & Conditions
                        </div>
                        <div className="max-h-32 overflow-y-auto text-xs text-black/40 bg-white rounded p-3 whitespace-pre-wrap leading-relaxed border border-black/8">
                          {studio.defaultTerms}
                        </div>
                        <label className="flex items-start gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={acceptedTerms}
                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                            className="mt-0.5 h-4 w-4 cursor-pointer"
                            style={{ accentColor: brand.primaryColor }}
                          />
                          <span className="text-xs text-black/50">
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
                    className="text-black leading-tight tracking-tight mb-2"
                    style={{
                      fontSize: 'clamp(2rem, 4vw, 3.5rem)',
                      fontWeight: 900,
                      fontFamily: `"${brand.fontFamily}", DM Sans, sans-serif`,
                    }}
                  >
                    You&apos;re All Set.
                  </h2>
                  <p className="text-black/40 text-sm">
                    Booking submitted to <strong className="text-black">{studio.name}</strong> — they&apos;ll be in touch shortly.
                  </p>
                  <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-black/5 text-xs font-mono text-black/40 rounded">
                    Ref: <span className="font-bold text-black/60">{bookingId.slice(-8).toUpperCase()}</span>
                  </div>
                </div>

                {/* Details */}
                <div
                  className="p-6 border mb-6"
                  style={{ borderColor: '#e0e0d8', borderRadius: '4px', backgroundColor: '#fff' }}
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30 mb-5">Booking Details</div>
                  <div className="space-y-4">
                    {[
                      { Icon: Camera, label: 'Service', value: `${selectedService?.name} · ${selectedService?.durationMinutes}min · ${formatCurrency(selectedService?.price)}` },
                      {
                        Icon: Calendar,
                        label: 'Date & Time',
                        value: new Date(selectedTime).toLocaleString('en-US', {
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        }),
                      },
                      { Icon: Phone, label: 'Contact', value: `${customerData.name} · ${customerData.phone}${customerData.email ? ' · ' + customerData.email : ''}` },
                      { Icon: MapPin, label: 'Studio', value: `${studio.name} · ${studio.email}` },
                    ].map(({ Icon, label, value }) => (
                      <div key={label} className="flex items-start gap-3">
                        <div
                          className="h-8 w-8 rounded flex items-center justify-center shrink-0 mt-0.5"
                          style={{ backgroundColor: hexAlpha(brand.primaryColor, '12') }}
                        >
                          <Icon className="h-4 w-4" style={{ color: brand.primaryColor }} />
                        </div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-black/30 mb-0.5">{label}</div>
                          <div className="text-sm font-semibold text-black">{value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* What's next */}
                <div
                  className="p-4 border mb-8 flex items-start gap-3"
                  style={{ borderColor: hexAlpha(brand.primaryColor, '25'), borderRadius: '4px', backgroundColor: hexAlpha(brand.primaryColor, '06') }}
                >
                  <PartyPopper className="h-4 w-4 shrink-0 mt-0.5" style={{ color: brand.primaryColor }} />
                  <p className="text-sm text-black/60 leading-relaxed">
                    The studio will reach out to <strong className="text-black">{customerData.phone}</strong> to confirm your session, finalize details, and prepare.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={resetBooking}
                    className="flex-1 py-3.5 border border-black/15 text-black/50 font-bold text-sm hover:border-black/30 transition-all"
                    style={{ borderRadius: btnRadius }}
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
                <History className="h-12 w-12 text-black/10 mx-auto mb-6" />
                <h2
                  className="text-black leading-tight tracking-tight mb-2"
                  style={{
                    fontSize: '2rem',
                    fontWeight: 900,
                    fontFamily: `"${brand.fontFamily}", DM Sans, sans-serif`,
                  }}
                >
                  Sign in to view history
                </h2>
                <p className="text-black/40 mb-8 text-sm max-w-sm mx-auto">
                  Track all your bookings with {studio.name} in one place.
                </p>
                <button
                  onClick={() => {
                    const returnUrl = encodeURIComponent(window.location.pathname);
                    window.location.href = `${API_URL}/auth/google?state=${returnUrl}`;
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 font-black text-sm uppercase tracking-wider text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: brand.primaryColor, borderRadius: btnRadius }}
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
                        Sessions
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
                      className="flex items-center gap-2 px-5 py-2.5 font-black text-xs uppercase tracking-wider text-white transition-all hover:opacity-90"
                      style={{ backgroundColor: brand.primaryColor, borderRadius: btnRadius }}
                    >
                      <Camera className="h-3.5 w-3.5" />
                      New Session
                    </button>
                  </div>

                  {bookings.length === 0 ? (
                    <div className="py-12 text-center border border-dashed border-black/10">
                      <BookOpen className="h-8 w-8 text-black/15 mx-auto mb-3" />
                      <p className="font-bold text-black/30 text-sm mb-1">No bookings yet</p>
                      <p className="text-xs text-black/20">Your sessions with {studio.name} will appear here.</p>
                      <button
                        onClick={() => setActiveTab('book')}
                        className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 font-black text-xs uppercase tracking-wider text-white transition-all hover:opacity-90"
                        style={{ backgroundColor: brand.primaryColor, borderRadius: btnRadius }}
                      >
                        Book a Session
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
                                  {new Date(b.scheduledAt).toLocaleString('en-US', {
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
                                {formatCurrency(b.quoteAmount || b.service.price)}
                              </div>
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
                                  Studio Quote
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
                                      className="flex-1 flex items-center justify-center gap-2 py-2.5 font-black text-xs uppercase tracking-wider text-white transition-all hover:opacity-90 disabled:opacity-40"
                                      style={{ backgroundColor: brand.primaryColor, borderRadius: btnRadius }}
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
                      className="text-black leading-tight tracking-tight"
                      style={{
                        fontSize: '1.8rem',
                        fontWeight: 900,
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
                                  {new Date(inv.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
                  className="inline-flex items-center gap-2 px-6 py-3 font-black text-sm uppercase tracking-wider text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: brand.primaryColor, borderRadius: btnRadius }}
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
                      className="h-16 w-16 flex items-center justify-center text-white text-2xl font-black border-4 border-white mb-4"
                      style={{ backgroundColor: brand.primaryColor, borderRadius: '4px' }}
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
                        style={{ backgroundColor: brand.primaryColor }}
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
      </main>

      {/* ================================================================ */}
      {/*  FOOTER                                                           */}
      {/* ================================================================ */}
      <footer
        className="border-t mt-20 py-10"
        style={{ borderColor: '#e0e0d8', backgroundColor: '#f0f0eb' }}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div
              className="font-black text-black text-sm tracking-tight"
              style={{ fontFamily: `"${brand.fontFamily}", DM Sans, sans-serif` }}
            >
              {studio.name}
            </div>
            <div className="text-xs text-black/30 mt-0.5">
              &copy; {new Date().getFullYear()} · All rights reserved.
            </div>
          </div>
          <div className="flex items-center gap-5 text-xs">
            <a
              href={`mailto:${studio.email}`}
              className="flex items-center gap-1.5 text-black/40 hover:text-black/70 transition-colors font-medium"
            >
              <Mail className="h-3.5 w-3.5" />
              {studio.email}
            </a>
            <a
              href={`tel:${studio.phone}`}
              className="flex items-center gap-1.5 text-black/40 hover:text-black/70 transition-colors font-medium"
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
