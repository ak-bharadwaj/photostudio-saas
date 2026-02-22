'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingPage } from '@/components/ui/loading';
import { useToast } from '@/components/ui/toast';
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
} from 'lucide-react';

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
  currentStep,
  primaryColor,
}: {
  currentStep: number;
  primaryColor: string;
}) {
  const steps = [
    { num: 1, label: 'Choose Occasion' },
    { num: 2, label: 'Date & Time' },
    { num: 3, label: 'Your Details' },
    { num: 4, label: 'Confirmation' },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-center gap-2">
        {steps.map((s, idx) => (
          <div key={s.num} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all',
                  currentStep >= s.num ? 'text-white' : 'bg-[var(--surface-3)] text-[var(--foreground-tertiary)]',
                )}
                style={
                  currentStep >= s.num
                    ? { backgroundColor: primaryColor }
                    : undefined
                }
              >
                {currentStep > s.num ? (
                  <Check className="h-4 w-4" />
                ) : (
                  s.num
                )}
              </div>
              <span
                className={cn(
                  'hidden sm:inline text-sm font-bold tracking-tight',
                  currentStep >= s.num ? 'text-[var(--foreground)]' : 'text-[var(--foreground-tertiary)]',
                )}
              >
                {s.label}
              </span>
            </div>
            {idx < 3 && (
              <div
                className={cn('w-10 h-0.5 mx-2 rounded-full transition-colors')}
                style={{
                  backgroundColor: currentStep > s.num ? primaryColor : 'var(--border)',
                }}
              />
            )}
          </div>
        ))}
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
}: {
  service: Service;
  primaryColor: string;
  accentColor: string;
  onClick: () => void;
}) {
  const Icon = getOccasionIcon(service.occasion);

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-[var(--border)]',
        'bg-[var(--background)] text-left transition-all duration-300',
        'hover:shadow-xl hover:-translate-y-1 hover:border-[var(--primary)]',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
      )}
      style={{
        '--focus-ring': primaryColor,
      } as React.CSSProperties}
    >
      {/* Cover image or gradient */}
      <div className="relative h-40 overflow-hidden">
        {service.coverImage ? (
          <img
            src={service.coverImage}
            alt={service.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
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
            className="text-sm font-medium flex items-center gap-1 transition-colors"
            style={{ color: primaryColor }}
          >
            Book Now
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
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
    loadStudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug]);

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
      addToast('error', error.response?.data?.message || 'Studio not found');
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
            The studio you&apos;re looking for doesn&apos;t exist or is not accepting bookings.
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
        className="relative overflow-hidden"
        style={{ backgroundColor: brand.primaryColor }}
      >
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
        <div className="relative max-w-6xl mx-auto px-4 py-8 sm:py-12">
          <div className="flex items-center gap-4">
            {studio?.logoUrl ? (
              <img
                src={studio.logoUrl}
                alt={studio.name || 'Studio'}
                className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl object-contain bg-white/20 p-1.5 backdrop-blur-sm"
              />
            ) : (
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Camera className="h-7 w-7 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {brand.headerText}
              </h1>
              {brand.tagline && (
                <p className="text-white/80 text-sm sm:text-base mt-1">
                  {brand.tagline}
                </p>
              )}
              <div className="flex flex-wrap gap-4 mt-2 text-sm text-white/70">
                <a
                  href={`mailto:${studio.email}`}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {studio.email}
                </a>
                <a
                  href={`tel:${studio.phone}`}
                  className="flex items-center gap-1 hover:text-white transition-colors"
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
      {/*  Body                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <StepIndicator currentStep={step} primaryColor={brand.primaryColor} />

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
                  className="w-full mt-6 py-3 rounded-xl text-white font-medium transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
                  style={{ backgroundColor: brand.primaryColor }}
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
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
              Almost There!
            </h2>

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
            <Card className="p-5">
              <form onSubmit={handleSubmitBooking} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    Full Name <span className="text-[var(--danger)]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerData.name}
                    onChange={(e) =>
                      setCustomerData({ ...customerData, name: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-[var(--surface-0)] text-[var(--foreground)] border border-[var(--border-strong)] rounded-xl focus:ring-2 focus:border-transparent"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={customerData.email}
                    onChange={(e) =>
                      setCustomerData({ ...customerData, email: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-[var(--surface-0)] text-[var(--foreground)] border border-[var(--border-strong)] rounded-xl focus:ring-2 focus:border-transparent"
                    placeholder="john@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    Phone Number <span className="text-[var(--danger)]">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerData.phone}
                    onChange={(e) =>
                      setCustomerData({ ...customerData, phone: e.target.value })
                    }
                    className="w-full px-4 py-2.5 bg-[var(--surface-0)] text-[var(--foreground)] border border-[var(--border-strong)] rounded-xl focus:ring-2 focus:border-transparent"
                    placeholder="+1 234 567 8900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={customerData.notes}
                    onChange={(e) =>
                      setCustomerData({ ...customerData, notes: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-2.5 bg-[var(--surface-0)] text-[var(--foreground)] border border-[var(--border-strong)] rounded-xl focus:ring-2 focus:border-transparent resize-y"
                    placeholder="Any special requests or requirements..."
                  />
                </div>

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
                    'w-full py-3 rounded-xl text-white font-medium transition-all flex items-center justify-center gap-2',
                    (submitting || (!!studio.defaultTerms && !acceptedTerms)) && 'opacity-50 cursor-not-allowed',
                  )}
                  style={{ backgroundColor: brand.primaryColor }}
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
              className="mt-6 px-6 py-2.5 rounded-xl border border-[var(--border)] text-[var(--foreground-secondary)] font-medium hover:bg-[var(--surface-1)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              Book Another Session
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/*  Portfolio Section (Step 1 only)                                */}
        {/* ============================================================== */}
        {step === 1 && studio.portfolioItems.length > 0 && (
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
    </div>
  );
}
