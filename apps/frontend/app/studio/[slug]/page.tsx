'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingPage } from '@/components/ui/loading';
import { useToast } from '@/components/ui/toast';
import { Input, Textarea } from '@/components/ui/input';
import { cn } from '@/lib/utils';
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
  ChevronLeft,
  Chrome,
  History,
  User,
  LogOut,
  Receipt,
  Settings,
  BookOpen,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { portalApi } from '@/lib/api';

const STEPS = [
  { id: 1, title: 'Service', icon: Camera },
  { id: 2, title: 'Schedule', icon: Calendar },
  { id: 3, title: 'Details', icon: FileText },
  { id: 4, title: 'Review', icon: Check },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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
/*  Step indicator                                                            */
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
    <div className="sticky top-0 z-40 w-full px-4 -mt-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/80 backdrop-blur-2xl px-6 py-4 rounded-3xl shadow-2xl border border-white/40 flex items-center justify-between">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isActive = step === s.id;
            const isCompleted = step > s.id;

            return (
              <div key={s.id} className="flex flex-col items-center gap-1.5 flex-1 relative group">
                <div
                  className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                    isActive
                      ? "bg-indigo-600 text-white shadow-xl scale-110 -translate-y-1"
                      : isCompleted
                        ? "bg-green-500 text-white"
                        : "bg-gray-100/50 text-gray-400 group-hover:bg-gray-200/50"
                  )}
                  style={{
                    backgroundColor: isActive ? brand.primaryColor : undefined,
                    borderRadius: brand.buttonShape === 'pill' ? '9999px' : brand.buttonShape === 'luxury-sharp' ? '4px' : '1rem'
                  }}
                >
                  {isCompleted ? (
                    <Check className="h-6 w-6 animate-in zoom-in duration-300" />
                  ) : (
                    <Icon className={cn("h-6 w-6", isActive && "animate-pulse")} />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] sm:text-xs font-bold uppercase tracking-widest hidden sm:block",
                    isActive ? "text-indigo-900" : "text-gray-400"
                  )}
                >
                  {s.title}
                </span>
                {/* Connector Line */}
                {s.id < 4 && (
                  <div className="absolute top-6 -right-1/2 w-full h-[2px] bg-gray-100 -z-10 hidden sm:block">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-1000"
                      style={{
                        width: isCompleted ? '100%' : '0%',
                        backgroundColor: brand.primaryColor
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
/*  Occasion Card                                                             */
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
        'group relative overflow-hidden text-left transition-all duration-300',
        // Card Theme Logic
        cardTheme === 'modern' && 'rounded-2xl border border-[var(--border)] bg-[var(--background)] hover:shadow-xl hover:-translate-y-1 hover:border-[var(--primary)]',
        cardTheme === 'classic' && 'rounded-xl border-2 border-[var(--border)] bg-[var(--background)] hover:shadow-lg hover:-translate-y-0.5 hover:border-[var(--primary)]',
        cardTheme === 'elevated' && 'rounded-[1.5rem] p-2 shadow-lg hover:shadow-xl translate-y-0 hover:-translate-y-1 bg-[var(--background)] border border-transparent',
        isSelected && 'ring-2 ring-offset-4',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
      )}
      style={{
        '--focus-ring': primaryColor,
        borderColor: isSelected ? primaryColor : undefined,
        boxShadow: isSelected ? `0 0 0 4px ${primaryColor}40` : undefined,
      } as React.CSSProperties}
    >
      {/* Cover image or gradient */}
      <div className={cn("relative overflow-hidden", cardTheme === 'elevated' ? 'rounded-[1.25rem]' : 'rounded-t-2xl')}>
        {service.coverImage ? (
          <img
            src={service.coverImage}
            alt={service.name}
            className="w-full h-40 object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div
            className="w-full h-40 flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}20, ${accentColor}30)`,
            }}
          >
            <Icon
              className="h-16 w-16 transition-transform group-hover:scale-110 duration-300"
              style={{ color: primaryColor }}
            />
          </div>
        )}
        {/* Price badge */}
        <div
          className="absolute top-3 right-3 px-3 py-1 rounded-full text-white text-sm font-bold shadow-lg"
          style={{ backgroundColor: primaryColor }}
        >
          ${Number(service.price).toFixed(0)}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-[var(--foreground)] text-lg mb-1 tracking-tight">
          {service.name}
        </h3>
        {service.description && (
          <p className="text-[var(--foreground-tertiary)] text-sm line-clamp-2 mb-3">
            {service.description}
          </p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-[var(--foreground-tertiary)] text-sm font-medium">
            <Clock className="h-4 w-4" />
            {service.durationMinutes} min
          </div>
          <span
            className="text-sm font-bold flex items-center gap-1 transition-all duration-300 group-hover:gap-2"
            style={{ color: primaryColor }}
          >
            Select Service
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Page                                                                 */
/* -------------------------------------------------------------------------- */

export default function PublicBookingPage() {
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

  // Derived branding
  const brand = useMemo(() => {
    const bc = studio?.brandingConfig || {};
    return {
      primaryColor: bc.primaryColor || '#1a73e8',
      secondaryColor: bc.secondaryColor || '#5f6368',
      accentColor: bc.accentColor || '#7c3aed',
      fontFamily: bc.fontFamily || 'Inter',
      headerText: bc.headerText || studio?.name || '',
      tagline: bc.tagline || '',
      heroStyle: bc.heroStyle || 'solid',
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

  useEffect(() => {
    // Handle tokens from Google Redirect
    const token = searchParams.get('token');
    if (token) {
      localStorage.setItem('customer_token', token);
      const refreshToken = searchParams.get('refreshToken');
      if (refreshToken) localStorage.setItem('customer_refresh_token', refreshToken);

      // Clean URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);

      fetchMe(token);
    } else {
      const storedToken = localStorage.getItem('customer_token');
      if (storedToken) {
        fetchMe(storedToken);
      }
    }
    loadStudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug, searchParams]);

  // Fetch studio-specific history when switching to history tab
  useEffect(() => {
    if (activeTab === 'history' && authUser) {
      fetchStudioHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, authUser]);

  const fetchMe = async (token: string) => {
    try {
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { user } = response.data;
      if (user && user.role === 'CUSTOMER') {
        setAuthUser({ id: user.id, name: user.name, email: user.email });
        setProfileEdits({ name: user.name, email: user.email });
        setCustomerData(prev => ({
          ...prev,
          name: user.name,
          email: user.email,
        }));
        // ← Signed-in customers land on their profile/history page
        setActiveTab('history');
      }
    } catch (err) {
      console.error('Failed to fetch user', err);
      localStorage.removeItem('customer_token');
    }
  };

  const fetchStudioHistory = async () => {
    const token = localStorage.getItem('customer_token');
    if (!token) return;
    setLoadingHistory(true);
    try {
      const slug = params.slug as string;
      const [bRes, iRes] = await Promise.all([
        axios.get(`${API_URL}/portal/bookings`, {
          params: { studioSlug: slug },
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/portal/invoices`, {
          params: { studioSlug: slug },
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      setBookings(bRes.data);
      setInvoices(iRes.data);
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveProfile = async () => {
    const token = localStorage.getItem('customer_token');
    if (!token) return;
    setSavingProfile(true);
    try {
      const res = await axios.patch(`${API_URL}/portal/me`, profileEdits, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAuthUser(prev => prev ? { ...prev, ...res.data } : null);
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

  const handleAcceptQuote = async (bookingId: string) => {
    try {
      await portalApi.acceptQuote(bookingId);
      addToast('success', 'Quote accepted! We will finalize your booking.');
      fetchStudioHistory();
    } catch {
      addToast('error', 'Failed to accept quote.');
    }
  };

  const handleRejectQuote = async (bookingId: string) => {
    if (!confirm('Are you sure you want to reject this quote?')) return;
    try {
      await portalApi.rejectQuote(bookingId);
      addToast('success', 'Quote rejected.');
      fetchStudioHistory();
    } catch {
      addToast('error', 'Failed to reject quote.');
    }
  };


  const loadStudio = async () => {
    try {
      const response = await axios.get(`${API_URL}/public/studios/${params.slug}`);
      const studioData = response.data;
      setStudio(studioData);

      // Handle deep links
      const serviceId = searchParams.get('service');
      const occasion = searchParams.get('occasion');

      if (serviceId && studioData.services) {
        const service = studioData.services.find((s: any) => s.id === serviceId);
        if (service) {
          setSelectedService(service);
          setStep(2);
        }
      }

      // Delay scroll to allow render
      if (occasion) {
        setTimeout(() => {
          const element = document.getElementById(`occasion-${occasion.toLowerCase()}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            element.classList.add('ring-2', 'ring-[var(--primary)]', 'ring-offset-8', 'rounded-2xl');
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-[var(--primary)]', 'ring-offset-8');
            }, 3000);
          }
        }, 500);
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Studio not found';
      addToast('error', msg);
      setErrorStatus(msg);
    } finally {
      setLoading(false);
    }
  };

  const loadTimeSlots = async (serviceId: string, date: string) => {
    setLoadingSlots(true);
    try {
      const response = await axios.get(
        `${API_URL}/public/studios/${params.slug}/services/${serviceId}/available-slots`,
        { params: { date } },
      );
      setTimeSlots(response.data.slots || []);
    } catch {
      addToast('error', 'Failed to load available time slots');
      setTimeSlots([]);
    } finally {
      setLoadingSlots(false);
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

      setBookingId(response.data.id);
      setStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      addToast('success', 'Booking request submitted successfully!');
    } catch (error: any) {
      addToast('error', error.response?.data?.message || 'Failed to submit booking');
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

  if (loading) return <LoadingPage message="Loading studio..." />;
  if (!studio)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background-secondary)]">
        <div className="text-center p-8">
          <Camera className="h-16 w-16 text-[var(--foreground-tertiary)] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">Studio Not Found</h1>
          <p className="text-[var(--foreground-secondary)] max-w-sm">
            {errorStatus || "The studio you're looking for doesn't exist or is not accepting bookings."}
          </p>
        </div>
      </div>
    );

  const minDate = new Date().toISOString().split('T')[0];
  const maxDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  return (
    <div
      className="min-h-screen bg-[var(--background-secondary)]"
      style={{
        fontFamily: brand.fontFamily + ', sans-serif',
        '--primary': brand.primaryColor,
        '--primary-hover': brand.primaryColor + 'ee',
        '--accent': brand.accentColor,
      } as React.CSSProperties}
    >
      {/* ------------------------------------------------------------------ */}
      {/*  Header                                                            */}
      {/* ------------------------------------------------------------------ */}
      <header
        className={cn(
          "relative overflow-hidden transition-all duration-700",
          brand.heroStyle === 'mesh' ? "min-h-[300px] flex items-center" : "py-8 sm:py-12"
        )}
        style={{
          backgroundColor: brand.heroStyle === 'solid' ? brand.primaryColor : undefined,
          background: brand.heroStyle === 'mesh'
            ? `radial-gradient(at 0% 0%, ${brand.primaryColor} 0px, transparent 50%),
               radial-gradient(at 50% 0%, ${brand.accentColor} 0px, transparent 50%),
               radial-gradient(at 100% 0%, ${brand.primaryColor} 0px, transparent 50%),
               radial-gradient(at 0% 100%, ${brand.accentColor} 0px, transparent 50%),
               radial-gradient(at 50% 100%, ${brand.primaryColor} 0px, transparent 50%),
               radial-gradient(at 100% 100%, ${brand.accentColor} 0px, transparent 50%)`
            : brand.heroStyle === 'glass'
              ? `linear-gradient(135deg, ${brand.primaryColor}, ${brand.accentColor})`
              : undefined
        }}
      >
        {/* Animated Mesh Overlay */}
        {brand.heroStyle === 'mesh' && (
          <div className="absolute inset-0 opacity-40 mix-blend-overlay animate-pulse bg-white/10" />
        )}

        {/* Pattern Overlay */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 w-full">
          <div className={cn(
            "flex items-center gap-6",
            brand.heroStyle === 'glass' && "bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl"
          )}>
            {studio?.logoUrl ? (
              <img
                src={studio.logoUrl.startsWith('http') ? studio.logoUrl : `${API_URL}${studio.logoUrl.startsWith('/') ? '' : '/'}${studio.logoUrl}`}
                alt={studio.name || 'Studio'}
                className={cn(
                  "h-16 w-16 sm:h-20 sm:w-20 object-contain shadow-lg transition-transform hover:scale-105 duration-300",
                  brand.heroStyle === 'glass' ? "rounded-2xl bg-white/20 p-2" : "rounded-xl bg-white/20 p-1.5 backdrop-blur-sm"
                )}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80?text=Logo';
                }}
              />
            ) : (
              <div className={cn(
                "h-16 w-16 sm:h-20 sm:w-20 flex items-center justify-center shadow-lg",
                brand.heroStyle === 'glass' ? "rounded-2xl bg-white/20" : "rounded-xl bg-white/20 backdrop-blur-sm"
              )}>
                <Camera className="h-8 w-8 text-white" />
              </div>
            )}
            <div className="drop-shadow-sm">
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tighter italic">
                {brand.headerText}
              </h1>
              {brand.tagline && (
                <p className="text-white/90 text-sm sm:text-xl mt-2 font-medium tracking-tight">
                  {brand.tagline}
                </p>
              )}
              <div className="flex flex-wrap gap-4 mt-4 text-sm font-semibold text-white/80">
                <a
                  href={`mailto:${studio.email}`}
                  className="flex items-center gap-2 hover:text-white transition-all bg-white/10 px-3 py-1 rounded-full backdrop-blur-md border border-white/10"
                >
                  <Mail className="h-4 w-4" />
                  {studio.email}
                </a>
                <a
                  href={`tel:${studio.phone}`}
                  className="flex items-center gap-2 hover:text-white transition-all bg-white/10 px-3 py-1 rounded-full backdrop-blur-md border border-white/10"
                >
                  <Phone className="h-4 w-4" />
                  {studio.phone}
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/*  Customer Navigation Tabs                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[var(--border)] shadow-sm">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <div className="flex">
            {[
              { id: 'book' as const, label: 'Book', icon: BookOpen },
              { id: 'history' as const, label: 'My History', icon: History },
              { id: 'account' as const, label: 'Account', icon: User },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'flex items-center gap-2 px-5 py-4 text-sm font-semibold border-b-2 transition-all duration-200',
                  activeTab === id
                    ? 'border-[var(--primary)] text-[var(--foreground)]'
                    : 'border-transparent text-[var(--foreground-tertiary)] hover:text-[var(--foreground-secondary)] hover:border-[var(--border-strong)]'
                )}
                style={activeTab === id ? { borderColor: brand.primaryColor, color: brand.primaryColor } : {}}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
          {authUser ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-[var(--foreground-secondary)] hidden sm:block">
                {authUser.name}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm text-[var(--foreground-tertiary)] hover:text-[var(--danger)] transition-colors px-3 py-1.5 rounded-lg hover:bg-[var(--danger)]/5"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:block">Sign out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                const returnUrl = encodeURIComponent(window.location.pathname);
                window.location.href = `${API_URL}/auth/google?state=${returnUrl}`;
              }}
              className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full transition-all hover:shadow-md"
              style={{ backgroundColor: brand.primaryColor, color: '#fff' }}
            >
              <Chrome className="h-4 w-4" />
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/*  Body                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === 'book' && (
          <>
            <StepIndicator step={step} brand={brand} />

            {/* ============================================================== */}
            {/*  Step 1: Choose Occasion / Service                              */}
            {/* ============================================================== */}
            {step === 1 && (
              <div className="animate-fade-in">
                <div className="text-center mb-12">
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--foreground)] tracking-tight">
                    What&apos;s the Occasion?
                  </h2>
                  <p className="text-[var(--foreground-tertiary)] mt-3 text-lg">
                    Choose from our photography services to get started.
                  </p>
                </div>

                {/* If services have occasions, group them */}
                {hasOccasions ? (
                  <div className="space-y-10">
                    {Object.entries(occasionGroups).map(([occasion, services]) => (
                      <div
                        key={occasion}
                        id={`occasion-${occasion.toLowerCase()}`}
                        className="space-y-6 pt-8 first:pt-0 transition-all duration-1000"
                      >
                        <h3
                          className="text-lg font-semibold mb-4 flex items-center gap-2"
                          style={{ color: brand.primaryColor }}
                        >
                          {(() => {
                            const Icon = getOccasionIcon(occasion);
                            return <Icon className="h-5 w-5" />;
                          })()}
                          {occasion.charAt(0).toUpperCase() + occasion.slice(1)}
                        </h3>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    ))}
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
              </div>
            )}

            {/* ============================================================== */}
            {/*  Step 2: Date & Time                                            */}
            {/* ============================================================== */}
            {step === 2 && selectedService && (
              <div className="animate-fade-in max-w-2xl mx-auto">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 text-sm font-medium mb-6 transition-colors"
                  style={{ color: brand.primaryColor }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Change Service
                </button>

                <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6">
                  Pick a Date & Time
                </h2>

                {/* Selected service summary */}
                <Card className="p-5 mb-6 border-[var(--border)] shadow-sm">
                  <div
                    className="flex items-center gap-4 p-4 rounded-xl"
                    style={{ backgroundColor: brand.primaryColor + '10' }}
                  >
                    {(() => {
                      const Icon = getOccasionIcon(selectedService.occasion);
                      return (
                        <div
                          className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: brand.primaryColor + '25' }}
                        >
                          <Icon className="h-5 w-5" style={{ color: brand.primaryColor }} />
                        </div>
                      );
                    })()}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[var(--foreground)]">
                        {selectedService.name}
                      </div>
                      <div className="text-sm text-[var(--foreground-secondary)]">
                        {selectedService.durationMinutes} min
                      </div>
                    </div>
                    <div
                      className="text-xl font-bold"
                      style={{ color: brand.primaryColor }}
                    >
                      ${Number(selectedService.price).toFixed(0)}
                    </div>
                  </div>
                </Card>

                <Card className="p-5 border-[var(--border)] bg-[var(--surface-0)] shadow-sm">
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Select Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      min={minDate}
                      max={maxDate}
                      className="w-full px-4 py-3 border border-[var(--border)] rounded-xl focus:ring-2 focus:border-transparent text-[var(--foreground)] bg-[var(--background)] font-medium"
                      style={{
                        '--tw-ring-color': brand.primaryColor,
                      } as React.CSSProperties}
                    />
                  </div>

                  {selectedDate && (
                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                        Available Times
                      </label>
                      {loadingSlots ? (
                        <div className="text-center py-8 text-[var(--foreground-tertiary)]">
                          <div
                            className="h-8 w-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-2"
                            style={{ borderColor: brand.primaryColor, borderTopColor: 'transparent' }}
                          />
                          Loading available times...
                        </div>
                      ) : timeSlots.length === 0 ? (
                        <div className="text-center py-8 text-[var(--foreground-tertiary)]">
                          No available slots for this date. Try another day.
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
                                  'px-3 py-2 rounded-xl border font-medium text-sm transition-all',
                                  !slot.available && 'bg-[var(--surface-1)] text-[var(--foreground-tertiary)] border-[var(--border)] cursor-not-allowed',
                                  slot.available && !isSelected && 'bg-[var(--surface-0)] text-[var(--foreground-secondary)] border-[var(--border)] hover:border-[var(--border-strong)]',
                                  isSelected && 'text-white border-transparent shadow-md',
                                )}
                                style={
                                  isSelected
                                    ? { backgroundColor: brand.primaryColor }
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
                      className="w-full mt-6 py-4 rounded-xl text-white font-bold transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                      style={{
                        backgroundColor: brand.primaryColor,
                        borderRadius: brand.buttonShape === 'pill' ? '9999px' : brand.buttonShape === 'luxury-sharp' ? '4px' : '0.875rem'
                      }}
                    >
                      Continue to Details
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  )}
                </Card>
              </div>
            )}

            {/* ============================================================== */}
            {/*  Step 3: Customer Information + Terms                           */}
            {/* ============================================================== */}
            {step === 3 && (
              <div className="animate-fade-in max-w-2xl mx-auto">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1 text-sm font-medium mb-6 transition-colors"
                  style={{ color: brand.primaryColor }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Change Date & Time
                </button>

                <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6">
                  Details
                </h2>

                {!customerData.email && (
                  <Card className="p-6 mb-8 border-2 border-dashed border-[var(--primary)]/30 bg-[var(--primary)]/5 rounded-3xl animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="h-16 w-16 rounded-2xl bg-white shadow-xl flex items-center justify-center shrink-0">
                        <Chrome className="h-8 w-8 text-[#4285F4]" />
                      </div>
                      <div className="flex-1 text-center sm:text-left">
                        <h3 className="text-xl font-bold text-[var(--foreground)] tracking-tight">Save to your Universal Account?</h3>
                        <p className="text-sm text-[var(--foreground-tertiary)] mt-1">
                          Sign in to auto-fill your details and track all your bookings across any studio.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto font-bold bg-white border-white shadow-lg shadow-[var(--primary)]/10"
                        onClick={() => {
                          // Use current relative path as state for returnUrl
                          const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
                          window.location.href = `${API_URL}/auth/google?state=${returnUrl}`;
                        }}
                      >
                        Sign in with Google
                      </Button>
                    </div>
                  </Card>
                )}

                {/* Summary */}
                <Card className="p-5 mb-6 border-[var(--border)] bg-[var(--surface-0)] shadow-sm">
                  <h3 className="font-semibold text-[var(--foreground)] mb-3">
                    Booking Summary
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[var(--foreground-tertiary)]">Service</span>
                      <span className="font-medium text-[var(--foreground)]">{selectedService?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--foreground-tertiary)]">Date</span>
                      <span className="font-medium text-[var(--foreground)]">
                        {new Date(selectedDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--foreground-tertiary)]">Time</span>
                      <span className="font-medium text-[var(--foreground)]">
                        {new Date(selectedTime).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--foreground-tertiary)]">Duration</span>
                      <span className="font-medium text-[var(--foreground)]">
                        {selectedService?.durationMinutes} minutes
                      </span>
                    </div>
                    <div
                      className="flex justify-between text-lg font-bold pt-2 border-t border-[var(--border)]"
                    >
                      <span className="text-[var(--foreground)]">Total</span>
                      <span style={{ color: brand.primaryColor }}>
                        ${Number(selectedService?.price).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Customer form */}
                <Card className="p-6 shadow-xl border-[var(--border)] bg-white/50 backdrop-blur-sm">
                  <form onSubmit={handleSubmitBooking} className="space-y-6">
                    <Input
                      label="Full Name"
                      required
                      value={customerData.name}
                      onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                      placeholder="e.g. John Doe"
                    />

                    <Input
                      label="Email Address (Optional)"
                      type="email"
                      value={customerData.email}
                      onChange={(e) => setCustomerData({ ...customerData, email: e.target.value })}
                      placeholder="e.g. john@example.com"
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
                      placeholder="Any special requests or details about your session..."
                    />

                    {/* Terms & Conditions */}
                    {studio.defaultTerms && (
                      <div className="border border-[var(--border)] rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                          <FileText className="h-4 w-4" />
                          Terms & Conditions
                        </div>
                        <div className="max-h-40 overflow-y-auto text-xs text-[var(--foreground-tertiary)] bg-[var(--surface-1)] rounded-lg p-3 whitespace-pre-wrap">
                          {studio.defaultTerms}
                        </div>
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={acceptedTerms}
                            onChange={(e) => setAcceptedTerms(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-[var(--border-strong)]"
                            style={{ accentColor: brand.primaryColor }}
                          />
                          <span className="text-sm text-[var(--foreground-secondary)]">
                            I have read and agree to the terms and conditions.
                          </span>
                        </label>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting || (!!studio.defaultTerms && !acceptedTerms)}
                      className={cn(
                        'w-full py-4 rounded-xl text-white font-bold transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-[0.99]',
                        (submitting || (!!studio.defaultTerms && !acceptedTerms)) && 'opacity-50 cursor-not-allowed',
                      )}
                      style={{
                        backgroundColor: brand.primaryColor,
                        borderRadius: brand.buttonShape === 'pill' ? '9999px' : brand.buttonShape === 'luxury-sharp' ? '4px' : '0.875rem'
                      }}
                    >
                      {submitting ? (
                        <>
                          <div
                            className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"
                          />
                          Submitting...
                        </>
                      ) : (
                        'Submit Booking Request'
                      )}
                    </button>
                  </form>
                </Card>
              </div>
            )}

            {/* ============================================================== */}
            {/*  Step 4: Confirmation                                           */}
            {/* ============================================================== */}
            {step === 4 && (
              <div className="animate-fade-in max-w-2xl mx-auto text-center">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                  style={{ backgroundColor: 'var(--success-light)' }}
                >
                  <Check className="h-10 w-10 text-[var(--success)]" />
                </div>
                <h2 className="text-3xl font-bold text-[var(--foreground)] mb-3">
                  Booking Submitted!
                </h2>
                <p className="text-[var(--foreground-secondary)] mb-2">
                  Thank you for choosing {studio.name}. We&apos;ll contact you shortly
                  to confirm your appointment.
                </p>
                <p className="text-sm text-[var(--foreground-tertiary)] mb-8">
                  Booking ID:{' '}
                  <span className="font-mono font-semibold text-[var(--foreground-secondary)]">
                    {bookingId}
                  </span>
                </p>

                <Card className="p-5 text-left mb-6">
                  <h3 className="font-semibold text-[var(--foreground)] mb-4">
                    Booking Details
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 mt-0.5" style={{ color: brand.primaryColor }} />
                      <div>
                        <div className="text-xs text-[var(--foreground-tertiary)]">Date & Time</div>
                        <div className="font-medium text-[var(--foreground)]">
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
                      <Camera className="h-5 w-5 mt-0.5" style={{ color: brand.primaryColor }} />
                      <div>
                        <div className="text-xs text-[var(--foreground-tertiary)]">Service</div>
                        <div className="font-medium text-[var(--foreground)]">
                          {selectedService?.name}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 mt-0.5" style={{ color: brand.primaryColor }} />
                      <div>
                        <div className="text-xs text-[var(--foreground-tertiary)]">Contact</div>
                        <div className="font-medium text-[var(--foreground)]">
                          {customerData.phone}
                        </div>
                        {customerData.email && (
                          <div className="text-sm text-[var(--foreground-secondary)]">
                            {customerData.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>

                <div
                  className="rounded-xl p-4 text-sm text-left"
                  style={{
                    backgroundColor: brand.primaryColor + '10',
                    color: brand.primaryColor,
                  }}
                >
                  <strong>What happens next?</strong>
                  <p className="mt-1 opacity-80">
                    The studio will review your booking and contact you at{' '}
                    {customerData.phone} to confirm availability and provide details.
                  </p>
                </div>

                <button
                  onClick={resetBooking}
                  className="mt-8 px-8 py-3 rounded-xl border border-[var(--border)] text-[var(--foreground-secondary)] font-bold hover:bg-[var(--surface-1)] transition-all hover:border-[var(--primary)] hover:text-[var(--primary)] hover:scale-105"
                  style={{
                    borderRadius: brand.buttonShape === 'pill' ? '9999px' : brand.buttonShape === 'luxury-sharp' ? '2px' : '0.75rem'
                  }}
                >
                  Book Another Session
                </button>
              </div>
            )}

            {/* ============================================================== */}
            {/*  Portfolio Section (Step 1 only)                                */}
            {/* ============================================================== */}
            {step === 1 && activeTab === 'book' && studio.portfolioItems.length > 0 && (
              <div className="mt-16">
                <h2 className="text-2xl font-bold text-[var(--foreground)] mb-6">Our Work</h2>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {studio.portfolioItems.map((item) => (
                    <div
                      key={item.id}
                      className="relative group overflow-hidden rounded-xl aspect-square"
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                          <div className="font-semibold">{item.title}</div>
                          {item.category && (
                            <div className="text-xs text-white/80 mt-0.5">
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
          </>
        )}

        {/* ============================================================== */}
        {/*  History Tab                                                    */}
        {/* ============================================================== */}
        {activeTab === 'history' && (
          <div className="animate-fade-in max-w-3xl mx-auto">
            {!authUser ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 rounded-full bg-[var(--surface-1)] flex items-center justify-center mx-auto mb-6">
                  <History className="h-10 w-10 text-[var(--foreground-tertiary)]" />
                </div>
                <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">Sign in to see your history</h2>
                <p className="text-[var(--foreground-tertiary)] mb-8">Track all your bookings with {studio.name} in one place.</p>
                <button
                  onClick={() => {
                    const returnUrl = encodeURIComponent(window.location.pathname);
                    window.location.href = `${API_URL}/auth/google?state=${returnUrl}`;
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-white shadow-lg hover:shadow-xl transition-all hover:scale-105"
                  style={{ backgroundColor: brand.primaryColor }}
                >
                  <Chrome className="h-5 w-5" />
                  Sign in with Google
                </button>
              </div>
            ) : loadingHistory ? (
              <div className="text-center py-20">
                <div className="h-10 w-10 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: brand.primaryColor, borderTopColor: 'transparent' }} />
                <p className="text-[var(--foreground-tertiary)]">Loading your history...</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Bookings */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-[var(--foreground)] flex items-center gap-2">
                      <BookOpen className="h-5 w-5" style={{ color: brand.primaryColor }} />
                      My Bookings at {studio.name}
                    </h2>
                    <button
                      onClick={() => setActiveTab('book')}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-white shadow-md hover:shadow-lg transition-all hover:scale-105"
                      style={{ backgroundColor: brand.primaryColor }}
                    >
                      <Camera className="h-4 w-4" />
                      Book New Session
                    </button>
                  </div>
                  {bookings.length === 0 ? (
                    <Card className="p-8 text-center border-dashed">
                      <BookOpen className="h-10 w-10 text-[var(--foreground-tertiary)] mx-auto mb-3" />
                      <p className="text-[var(--foreground-tertiary)]">No bookings with this studio yet.</p>
                      <button
                        onClick={() => setActiveTab('book')}
                        className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition-all hover:scale-105"
                        style={{ backgroundColor: brand.primaryColor }}
                      >
                        <Camera className="h-4 w-4" />
                        Book a Session
                      </button>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {bookings.map(b => (
                        <Card key={b.id} className={cn(
                          "p-5 border-[var(--border)] hover:shadow-md transition-all duration-300",
                          b.status === 'QUOTED' && "ring-2 ring-indigo-500 ring-offset-2 scale-[1.02] shadow-lg bg-indigo-50/10"
                        )}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: brand.primaryColor + '15' }}>
                                <Camera className="h-5 w-5" style={{ color: brand.primaryColor }} />
                              </div>
                              <div>
                                <div className="font-semibold text-[var(--foreground)]">{b.service.name}</div>
                                <div className="text-sm text-[var(--foreground-tertiary)] mt-0.5">
                                  {new Date(b.scheduledAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={cn(
                                'px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide',
                                b.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                                  b.status === 'QUOTED' ? 'bg-indigo-100 text-indigo-700' :
                                    b.status === 'INQUIRY' || b.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                      b.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                        'bg-gray-100 text-gray-600'
                              )}>
                                {b.status}
                              </span>
                              <div className="text-sm font-bold mt-1" style={{ color: b.status === 'QUOTED' ? '#4f46e5' : brand.primaryColor }}>
                                ${Number(b.quoteAmount || b.service.price).toFixed(0)}
                              </div>
                            </div>
                          </div>

                          {/* Quote Details & Actions */}
                          {b.status === 'QUOTED' && (
                            <div className="mt-4 pt-4 border-t border-indigo-100 animate-fade-in">
                              <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm mb-4">
                                <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm mb-2">
                                  <Sparkles className="h-4 w-4" />
                                  Studio sent a quote
                                </div>
                                {b.quoteNotes && (
                                  <p className="text-sm text-gray-600 italic border-l-2 border-indigo-200 pl-3 mb-3">
                                    &quot;{b.quoteNotes}&quot;
                                  </p>
                                )}
                                <div className="flex items-center justify-between">
                                  <div className="text-xs text-gray-400">Total Quoted Amount</div>
                                  <div className="text-lg font-black text-indigo-900">${Number(b.quoteAmount).toFixed(2)}</div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAcceptQuote(b.id)}
                                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all hover:scale-[1.02]"
                                >
                                  <ThumbsUp className="h-4 w-4" />
                                  Accept Quote
                                </button>
                                <button
                                  onClick={() => handleRejectQuote(b.id)}
                                  className="px-4 flex items-center justify-center gap-2 border border-red-200 text-red-600 py-2.5 rounded-xl font-bold hover:bg-red-50 transition-all"
                                >
                                  <ThumbsDown className="h-4 w-4" />
                                  Reject
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
                  <h2 className="text-xl font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
                    <Receipt className="h-5 w-5" style={{ color: brand.primaryColor }} />
                    Invoices
                  </h2>
                  {invoices.length === 0 ? (
                    <Card className="p-8 text-center border-dashed">
                      <Receipt className="h-10 w-10 text-[var(--foreground-tertiary)] mx-auto mb-3" />
                      <p className="text-[var(--foreground-tertiary)]">No invoices yet.</p>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {invoices.map(inv => (
                        <Card key={inv.id} className="p-5 border-[var(--border)] hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: brand.primaryColor + '15' }}>
                                <Receipt className="h-5 w-5" style={{ color: brand.primaryColor }} />
                              </div>
                              <div>
                                <div className="font-semibold text-[var(--foreground)] font-mono text-sm">#{inv.id.slice(-8).toUpperCase()}</div>
                                <div className="text-sm text-[var(--foreground-tertiary)] mt-0.5">{new Date(inv.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={cn('px-2.5 py-1 rounded-full text-xs font-bold uppercase', inv.status === 'PAID' ? 'bg-green-100 text-green-700' : inv.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600')}>{inv.status}</span>
                              <div className="text-sm font-bold mt-1" style={{ color: brand.primaryColor }}>${Number(inv.totalAmount).toFixed(2)}</div>
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
        {/*  Account Tab                                                    */}
        {/* ============================================================== */}
        {activeTab === 'account' && (
          <div className="animate-fade-in max-w-lg mx-auto">
            {!authUser ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 rounded-full bg-[var(--surface-1)] flex items-center justify-center mx-auto mb-6">
                  <User className="h-10 w-10 text-[var(--foreground-tertiary)]" />
                </div>
                <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">Sign in to manage your account</h2>
                <p className="text-[var(--foreground-tertiary)] mb-8">Update your name, email and preferences.</p>
                <button
                  onClick={() => {
                    const returnUrl = encodeURIComponent(window.location.pathname);
                    window.location.href = `${API_URL}/auth/google?state=${returnUrl}`;
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-white shadow-lg hover:shadow-xl transition-all hover:scale-105"
                  style={{ backgroundColor: brand.primaryColor }}
                >
                  <Chrome className="h-5 w-5" />
                  Sign in with Google
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <Card className="p-6 border-[var(--border)]">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-white text-xl font-black" style={{ backgroundColor: brand.primaryColor }}>
                      {authUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-[var(--foreground)] text-lg">{authUser.name}</div>
                      <div className="text-sm text-[var(--foreground-tertiary)]">{authUser.email}</div>
                    </div>
                  </div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Edit Profile
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-6">
                      <Input
                        label="Full Name"
                        value={profileEdits.name}
                        onChange={(e) => setProfileEdits(p => ({ ...p, name: e.target.value }))}
                      />
                      <Input
                        label="Email Address"
                        value={profileEdits.email}
                        disabled
                        helperText="Login identity cannot be changed for security."
                      />
                      <Button
                        onClick={handleSaveProfile}
                        isLoading={savingProfile}
                        disabled={savingProfile}
                        className="w-full h-12 shadow-lg"
                        style={{ backgroundColor: brand.primaryColor }}
                      >
                        Save Changes
                      </Button>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border border-red-200 bg-red-50/30">
                  <h3 className="font-semibold text-red-700 mb-1">Sign Out</h3>
                  <p className="text-sm text-red-500/80 mb-4">You will be signed out from your account on this device.</p>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-5 py-2.5 border border-red-300 text-red-600 font-semibold rounded-xl hover:bg-red-50 transition-all"
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
      {/*  Footer                                                            */}
      {/* ------------------------------------------------------------------ */}
      <footer className="bg-[var(--surface-0)] border-t border-[var(--border)] mt-16 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-[var(--foreground-tertiary)] text-sm">
          <p>
            &copy; {new Date().getFullYear()} {studio.name}. All rights
            reserved.
          </p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <a
              href={`mailto:${studio.email}`}
              className="transition-colors"
              style={{ color: brand.primaryColor }}
            >
              {studio.email}
            </a>
            <span className="text-[var(--border-strong)]">&bull;</span>
            <a
              href={`tel:${studio.phone}`}
              className="transition-colors"
              style={{ color: brand.primaryColor }}
            >
              {studio.phone}
            </a>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); filter: blur(10px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: ${brand.primaryColor}20;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${brand.primaryColor}40;
        }
      `}</style>
    </div>
  );
}
