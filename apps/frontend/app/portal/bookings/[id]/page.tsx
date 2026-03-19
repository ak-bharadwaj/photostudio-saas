'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading';
import { portalApi } from '@/lib/api';
import axios from 'axios';
import { formatDate, formatDateTime, formatCurrency, cn } from '@/lib/utils';
import {
  Calendar,
  Clock,
  MapPin,
  ArrowLeft,
  Camera,
  CheckCircle,
  Loader,
  Ban,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  Star,
  Building2,
  ChevronRight,
  Info,
  ExternalLink,
  History,
  X,
  FolderDown
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const safeGetItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(key); } catch { return null; }
};

interface BookingItem {
  id: string;
  serviceId: string;
  originalPrice: number;
  quotedAmount: number | null;
  service: {
    id: string;
    name: string;
    description?: string;
    durationMinutes: number;
  };
}

interface ServiceQuote {
  serviceId: string;
  serviceName: string;
  originalPrice: number;
  quotedAmount: number | null;
}

interface Booking {
  id: string;
  status: string;
  scheduledAt: string;
  customerNotes?: string;
  vision?: string;
  moodboardUrl?: string;
  quoteAmount?: number;
  quoteNotes?: string;
  quoteRejectionNotes?: string;
  deliveryUrl?: string;
  service: { name: string; price: number; durationMinutes: number; description?: string };

  bookingItems?: BookingItem[];
  serviceQuotes?: ServiceQuote[];
  studio: { 
    name: string; 
    email: string; 
    phone: string; 
    slug: string; 
    logoUrl?: string;
    address?: string;
    city?: string;
    currency?: string;
  };
  statusLogs: Array<{
    id: string;
    status: string;
    notes?: string;
    createdAt: string;
  }>;
  review?: {
    id: string;
    rating: number;
    comment?: string;
  };
}

const STATUS_CONFIG: Record<string, {
  variant: 'default' | 'info' | 'success' | 'warning' | 'secondary' | 'danger';
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  bg: string;
  border: string;
  description: string;
}> = {
  INQUIRY: { variant: 'default', icon: MessageSquare, label: 'Inquiry', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.3)', description: 'Your request has been sent to the partner.' },
  QUOTED: { variant: 'info', icon: MessageSquare, label: 'Quoted', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)', description: 'Partner has provided a quote for your appointment.' },
  CONFIRMED: { variant: 'success', icon: CheckCircle, label: 'Confirmed', color: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)', description: 'Your appointment is confirmed and scheduled.' },
  IN_PROGRESS: { variant: 'warning', icon: Loader, label: 'In Progress', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)', description: 'Your engagement is currently ongoing or in review.' },
  COMPLETED: { variant: 'secondary', icon: CheckCircle, label: 'Completed', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.3)', description: 'Booking completed! Your results are available.' },
  CANCELLED: { variant: 'danger', icon: Ban, label: 'Cancelled', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)', description: 'This booking has been cancelled.' },
};

export default function BookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { addToast } = useToast();
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Quote actions
  const [quoteAction, setQuoteAction] = useState<'accept' | 'negotiate' | 'reject' | null>(null);
  const [quoteNotes, setNegotiationNotes] = useState('');
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

  const fetchBooking = useCallback(async (silent = false) => {
    const token = safeGetItem('accessToken');
    const guestPhone = safeGetItem('customer_guest_phone');
    if (!token && !guestPhone) {
      router.replace('/portal/login');
      return;
    }

    if (!silent) setLoading(true);
    setError(null);
    try {
      if (token) {
        const res = await axios.get(`${API_URL}/portal/bookings/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBooking(res.data);
      } else {
        const email = safeGetItem('customer_guest_email') || '';
        const res = await axios.get(`${API_URL}/customer-portal/bookings/${id}/timeline`, {
          params: { phone: guestPhone, email }
        });
        const data = res.data;
        // Transform the customer-portal response to match the expected format roughly
        setBooking({
          ...data.booking,
          statusLogs: data.timeline,
        });
      }
    } catch (err) {
      console.error('Failed to load booking', err);
      if (!silent) setError('Could not find this booking. It may have been deleted or moved.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchBooking();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchBooking(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchBooking]);

  const handleQuoteAction = async () => {
    if (!booking || !quoteAction) return;

    setIsSubmittingQuote(true);
    try {
      if (quoteAction === 'accept') {
        await portalApi.acceptQuote(booking.id);
        addToast('success', 'Booking confirmed! We have notified the partner.');
      } else if (quoteAction === 'negotiate') {
        if (!quoteNotes) {
          addToast('error', 'Please enter a message for the partner');
          setIsSubmittingQuote(false);
          return;
        }
        await portalApi.negotiateQuote(booking.id, quoteNotes);
        addToast('success', 'Negotiation request sent to the partner.');
      } else if (quoteAction === 'reject') {
        await portalApi.rejectQuote(booking.id, quoteNotes);
        addToast('success', 'Quote rejected.');
      }

      setQuoteAction(null);
      setNegotiationNotes('');
      fetchBooking();
    } catch (err) {
      console.error('Quote action failed', err);
      addToast('error', 'Action failed. Please try again.');
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  const handleReviewSubmit = async () => {
    if (reviewRating === 0) {
      addToast('error', 'Please select a rating');
      return;
    }

    setSubmittingReview(true);
    try {
      const token = safeGetItem('accessToken');
      await axios.post(`${API_URL}/portal/bookings/${id}/review`, 
        { rating: reviewRating, comment: reviewComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      addToast('success', 'Thank you for your review!');
      fetchBooking(); // Refresh to show the submitted review
    } catch (err) {
      addToast('error', 'Failed to submit review. You may have already reviewed this booking.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" />
        <p className="text-[11px] font-black tracking-widest uppercase text-foreground-tertiary mt-4">SYNCING BOOKING DATA</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="h-20 w-20 rounded-3xl bg-danger/10 flex items-center justify-center mb-6">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-2xl font-black mb-2">Access Protocol Failed</h2>
        <p className="text-foreground-tertiary max-w-xs mb-8">{error || 'Booking data is unavailable.'}</p>
        <Button onClick={() => router.push('/portal/bookings')} variant="outline" className="rounded-xl px-8">
          <ArrowLeft className="mr-2 h-4 w-4" /> BACK TO BOOKINGS
        </Button>
      </div>
    );
  }

  const currentStatus = STATUS_CONFIG[booking.status] || STATUS_CONFIG.INQUIRY;
  const StatusIcon = currentStatus.icon;

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-fade-in pb-20">
      {/* ── BREADCRUMB ── */}
      <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[.3em] text-foreground-tertiary">
        <Link href="/portal" className="hover:text-primary transition-colors">DASHBOARD</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/portal/bookings" className="hover:text-primary transition-colors">BOOKINGS</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">BOOKING #{booking.id.slice(-6).toUpperCase()}</span>
      </div>

      {/* ── HERO HEADER ── */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-surface-1 border border-border shadow-2xl p-8 md:p-12">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-12">
          <div className="space-y-6 flex-1">
            <div className="flex flex-wrap items-center gap-4">
              <Badge 
                className="py-1 px-4 rounded-full font-black tracking-widest uppercase text-[11px]"
                style={{ backgroundColor: currentStatus.bg, color: currentStatus.color, borderColor: currentStatus.border }}
              >
                {currentStatus.label}
              </Badge>
              <div className="h-px w-8 bg-border" />
              <span className="text-[11px] font-black tracking-widest text-foreground-tertiary flex items-center gap-2">
                <Calendar className="h-3 w-3" /> {formatDate(booking.scheduledAt)}
              </span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight">
              {booking.bookingItems && booking.bookingItems.length > 0 
                ? booking.bookingItems.map(item => item.service.name).join(' + ')
                : booking.service.name}
            </h1>
            
            <div className="flex items-center gap-4">
               <div className="h-12 w-12 rounded-2xl bg-surface-2 border border-border flex items-center justify-center overflow-hidden">
                {booking.studio.logoUrl ? (
                  <img src={booking.studio.logoUrl} className="w-full h-full object-cover" alt={booking.studio.name} />
                ) : (
                  <Building2 className="text-primary h-6 w-6" />
                )}
               </div>
               <div>
                  <p className="text-[11px] font-black text-foreground-tertiary uppercase tracking-widest">BUSINESS PARTNER</p>
                  <Link href={`/studio/${booking.studio.slug}`} className="text-xl font-black hover:text-primary transition-colors flex items-center gap-2">
                    {booking.studio.name} <ExternalLink className="h-3.5 w-3.5 opacity-50" />
                  </Link>
               </div>
            </div>
          </div>

          <div className="glass-ultra p-8 rounded-3xl min-w-[280px] space-y-4 border border-white/10 shadow-xl">
             <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-foreground-tertiary">
               <span>INVESTMENT</span>
               <Info className="h-3 w-3" />
             </div>
              <div className="text-4xl font-black tracking-tighter">
                {formatCurrency(
                  booking.quoteAmount || 
                  (booking.bookingItems && booking.bookingItems.length > 0 
                    ? booking.bookingItems.reduce((acc, item) => acc + (Number(item.originalPrice) || 0), 0)
                    : Number(booking.service.price || 0)),
                  booking.studio.currency
                )}
              </div>
              
              {/* Service Breakdown for multi-service */}
              {booking.bookingItems && booking.bookingItems.length > 1 && (
                <div className="space-y-1.5 pt-2">
                  {booking.bookingItems.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-[10px] font-bold text-foreground-tertiary">
                      <span className="truncate max-w-[140px]">{item.service.name}</span>
                      <span>{formatCurrency(
                        item.quotedAmount ?? item.originalPrice,
                        booking.studio.currency
                      )}</span>
                    </div>
                  ))}
                </div>
              )}

              {booking.status === 'QUOTED' && !booking.quoteRejectionNotes && (
                <div className="flex gap-2 pt-2">
                  <Button 
                    className="flex-1 h-10 rounded-xl text-[11px] font-black tracking-widest bg-emerald-500 hover:bg-emerald-600 text-white"
                    onClick={() => setQuoteAction('accept')}
                  >
                    ACCEPT
                  </Button>
                  <Button 
                    variant="secondary"
                    className="flex-1 h-10 rounded-xl text-[11px] font-black tracking-widest"
                    onClick={() => setQuoteAction('negotiate')}
                  >
                    NEGOTIATE
                  </Button>
                </div>
              )}
              {booking.status === 'QUOTED' && booking.quoteRejectionNotes && (
                <div className="text-center pt-2 text-[10px] font-black uppercase tracking-widest text-amber-500 animate-pulse">
                  Negotiation Pending
                </div>
              )}
              <div className="h-px w-full bg-border/30" />
             <div className="flex items-center gap-3 text-xs font-bold text-foreground-secondary">
               <Clock className="h-4 w-4 text-primary" />
               {booking.bookingItems && booking.bookingItems.length > 0 
                ? booking.bookingItems.reduce((acc, item) => acc + (Number(item.service.durationMinutes) || 0), 0)
                : Number(booking.service.durationMinutes || 0)} Minute Appointment
             </div>
          </div>
        </div>
      </section>

      {/* ── CONTENT GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* LEFT: DETAILS & VISION */}
        <div className="lg:col-span-8 space-y-10">
          
          <div className="glass-ultra p-8 sm:p-10 rounded-[2rem] border border-border">
            <h2 className="text-xs font-black tracking-[0.3em] uppercase text-foreground-tertiary mb-8 flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-primary" /> BOOKING BRIEFING
            </h2>
            
            <div className="space-y-10">
              <div className="space-y-4">
                <label className="text-[11px] font-black uppercase tracking-widest text-primary">Service Description</label>
                <p className="text-foreground-secondary leading-relaxed text-sm">
                  {booking.service.description || 'Professional service tailored to your requirements.'}
                </p>
              </div>

              {booking.vision && (
                <div className="space-y-4 p-8 bg-surface-2/50 rounded-3xl border border-border/50">
                  <label className="text-[11px] font-black uppercase tracking-widest text-primary">Creative Vision</label>
                  <p className="text-foreground font-medium text-base italic leading-relaxed">
                    &quot;{booking.vision}&quot;
                  </p>
                </div>
              )}

               {booking.moodboardUrl && (
                <div className="space-y-4">
                   <label className="text-[11px] font-black uppercase tracking-widest text-primary">Reference Material</label>
                   <a 
                    href={booking.moodboardUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-6 bg-surface-2 hover:bg-surface-3 border border-border rounded-2xl group transition-all"
                   >
                     <div className="flex items-center gap-4">
                       <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                         <Camera className="h-5 w-5 text-primary" />
                       </div>
                       <div className="min-w-0">
                         <p className="text-sm font-black truncate max-w-[200px] sm:max-w-md">{booking.moodboardUrl}</p>
                         <p className="text-[11px] font-bold text-foreground-tertiary uppercase tracking-widest">OPEN MOODBOARD</p>
                       </div>
                     </div>
                     <ChevronRight className="h-5 w-5 text-foreground-tertiary group-hover:translate-x-1 transition-transform" />
                   </a>
                </div>
              )}

              {booking.deliveryUrl && (
                <div className="space-y-4 pt-10 border-t border-border mt-10">
                   <div className="p-8 rounded-[2rem] bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 dark:border-indigo-500/20">
                     <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                       <div className="max-w-md">
                         <h3 className="text-xl font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-2 mb-2">
                           <FolderDown className="h-5 w-5" /> Your Final Deliverables
                         </h3>
                         <p className="text-sm text-foreground-secondary">
                           Your partner has securely shared your finished files (Google Drive/Pixieset). Click the link to view or download them.
                         </p>
                       </div>
                       <a
                         href={booking.deliveryUrl}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="h-12 px-8 rounded-full font-black tracking-widest bg-indigo-500 hover:bg-indigo-600 text-white flex items-center justify-center shrink-0 transition-all shadow-glow hover:-translate-y-1"
                         style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}
                       >
                         OPEN DRIVE
                       </a>
                     </div>
                   </div>
                </div>
              )}

              {booking.status === 'COMPLETED' && !booking.review && (

                <div className="pt-10 border-t border-border">
                   <h3 className="text-xl font-black mb-6">Leave Your Feedback</h3>
                   <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button 
                            key={star} 
                            onClick={() => setReviewRating(star)}
                            className="group transition-transform active:scale-95"
                          >
                            <Star 
                              className={cn(
                                "h-10 w-10 transition-all",
                                star <= reviewRating ? "text-amber-500 fill-current drop-shadow-glow" : "text-border hover:text-amber-500/40"
                              )} 
                            />
                          </button>
                        ))}
                      </div>
                      <textarea 
                        className="w-full h-32 bg-surface-2 border border-border rounded-2xl p-6 text-sm focus:border-primary transition-all outline-none"
                        placeholder="Share your experience with the partner and help others choose..."
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                      />
                      <Button 
                        onClick={handleReviewSubmit}
                        disabled={submittingReview}
                        className="h-14 px-10 rounded-full font-black tracking-widest"
                        variant="primary"
                      >
                        {submittingReview ? 'SUBMITTING...' : 'SUMBIT REVIEW'}
                      </Button>
                   </div>
                </div>
              )}

              {booking.review && (
                <div className="pt-10 border-t border-border">
                   <div className="p-8 rounded-[2rem] bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 dark:border-emerald-500/20 relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-8 opacity-10">
                       <Star className="h-20 w-20 text-emerald-600 dark:text-emerald-400 fill-current" />
                     </div>
                     <span className="text-[11px] font-black tracking-widest uppercase text-emerald-600 dark:text-emerald-400 mb-4 block">YOUR FEEDBACK</span>
                     <div className="flex items-center gap-1 mb-4">
                       {[1, 2, 3, 4, 5].map(s => (
                         <Star key={s} className={cn("h-4 w-4", s <= booking.review!.rating ? "text-emerald-600 dark:text-emerald-400 fill-current" : "text-emerald-500/20")} />
                       ))}
                     </div>
                     <p className="text-foreground font-medium italic">
                       &quot;{booking.review.comment || 'No comment provided.'}&quot;
                     </p>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: TIMELINE & STUDIO */}
        <div className="lg:col-span-4 space-y-10">
          
          <div className="glass-ultra p-8 rounded-[2rem] border border-border">
            <h2 className="text-xs font-black tracking-[0.3em] uppercase text-foreground-tertiary mb-8 flex items-center gap-3">
              <History className="h-4 w-4 text-primary" /> BOOKING TELEMETRY
            </h2>
            
            <div className="relative space-y-8 pl-6">
              {/* Vertical line mapping */}
              <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-border/50" />
              
              {booking.statusLogs.map((log, i) => (
                <div key={log.id} className="relative">
                  <div className={cn(
                    "absolute -left-[23px] top-1.5 h-3 w-3 rounded-full border-2 border-background z-10",
                    i === 0 ? "bg-primary shadow-glow-primary" : "bg-border-strong"
                  )} />
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn("text-xs font-black tracking-widest uppercase", i === 0 ? "text-foreground" : "text-foreground-tertiary")}>
                        {log.status}
                      </span>
                      <span className="text-[9px] font-bold text-foreground-tertiary">
                        {formatDateTime(log.createdAt)}
                      </span>
                    </div>
                    {log.notes && (
                      <p className="text-[11px] text-foreground-secondary leading-relaxed bg-surface-2 p-3 rounded-xl border border-border/50 mt-2">
                        {log.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-ultra p-8 rounded-[2rem] border border-border bg-foreground text-background">
             <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-background/40 mb-6">PARTNER CONTACTS</h3>
             <div className="space-y-6">
               <div className="space-y-1">
                 <p className="text-[9px] font-black uppercase tracking-widest text-background/30">Official Email</p>
                 <p className="font-bold text-sm truncate">{booking.studio.email}</p>
               </div>
               <div className="space-y-1">
                 <p className="text-[9px] font-black uppercase tracking-widest text-background/30">Support Line</p>
                 <p className="font-bold text-sm">{booking.studio.phone}</p>
               </div>
               <div className="space-y-1">
                 <p className="text-[9px] font-black uppercase tracking-widest text-background/30">Meeting Location</p>
                 <p className="font-bold text-sm leading-snug">
                   {booking.studio.address},<br />
                   {booking.studio.city}
                 </p>
               </div>
               <Button 
                variant="outline" 
                className="w-full rounded-2xl h-12 border-background/20 text-background hover:bg-background hover:text-foreground text-[10px] font-black tracking-widest uppercase"
                onClick={() => router.push(`/studio/${booking.studio.slug}`)}
               >
                 VISIT PARTNER PAGE
               </Button>
             </div>
          </div>
        </div>
      </div>


      {/* ── QUOTE ACTION MODAL ── */}
      {quoteAction && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in text-white">
          <div className="card-luxury w-full sm:max-w-md p-6 sm:p-8 bg-surface-1 border-t sm:border border-border-strong rounded-t-3xl sm:rounded-[2.5rem] animate-slide-up sm:animate-cinematic relative overflow-hidden shadow-[0_-10px_40px_rgba(0,0,0,0.5)] text-left">
            <div className="mx-auto w-12 h-1.5 bg-white/20 rounded-full mb-6 sm:hidden" />
            <div className="absolute top-4 sm:top-0 right-4 sm:right-0 sm:p-4">
              <button 
                onClick={() => { setQuoteAction(null); setNegotiationNotes(''); }} 
                className="h-10 w-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-black tracking-[.3em] uppercase text-primary mb-2 block">
                  {quoteAction === 'accept' ? 'CONFIRM YOUR BOOKING' : quoteAction === 'negotiate' ? 'DISCUSS QUOTE' : 'REJECT QUOTE'}
                </span>
                <h3 className="text-2xl font-black text-white">
                  {booking.bookingItems && booking.bookingItems.length > 0 
                    ? booking.bookingItems.map(item => item.service.name).join(' + ')
                    : booking.service.name}
                </h3>
                <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                  <p className="text-[9px] font-black text-white/40 tracking-widest uppercase mb-2">QUOTATION BREAKDOWN</p>
                  
                  {booking.serviceQuotes && booking.serviceQuotes.length > 0 ? (
                    <div className="space-y-2 mb-4">
                      {booking.serviceQuotes.map((q, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <span className="text-white/60">{q.serviceName}</span>
                          <span className="font-bold text-white">{formatCurrency(q.quotedAmount ?? q.originalPrice, booking.studio.currency)}</span>
                        </div>
                      ))}
                      <div className="h-px bg-white/10 my-2" />
                    </div>
                  ) : booking.bookingItems && booking.bookingItems.length > 1 && (
                    <div className="space-y-2 mb-4">
                       {booking.bookingItems.map(item => (
                        <div key={item.id} className="flex justify-between items-center text-xs">
                          <span className="text-white/60">{item.service.name}</span>
                          <span className="font-bold text-white">{formatCurrency(item.quotedAmount ?? item.originalPrice, booking.studio.currency)}</span>
                        </div>
                      ))}
                      <div className="h-px bg-white/10 my-2" />
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <p className="text-[9px] font-black text-white/40 tracking-widest uppercase">TOTAL AMOUNT</p>
                    <p className="text-2xl font-black tracking-tighter text-white">
                      {formatCurrency(
                        booking.quoteAmount || 
                        (booking.bookingItems && booking.bookingItems.length > 0 
                          ? booking.bookingItems.reduce((acc, item) => acc + (Number(item.originalPrice) || 0), 0)
                          : Number(booking.service.price || 0)),
                        booking.studio.currency
                      )}
                    </p>
                  </div>
                  {booking.quoteNotes && (
                    <p className="mt-2 text-sm text-white/60 border-t border-white/5 pt-2 italic">
                      &quot;{booking.quoteNotes}&quot;
                    </p>
                  )}
                </div>
              </div>

              {(quoteAction === 'negotiate' || quoteAction === 'reject') && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-foreground-tertiary">
                    {quoteAction === 'negotiate' ? 'YOUR MESSAGE TO PARTNER' : 'REASON FOR REJECTION'}
                  </label>
                  <textarea
                    id="negotiation-notes"
                    placeholder={quoteAction === 'negotiate' ? "Discuss pricing, dates, or specific requirements..." : "Please let us know why you're rejecting this quote..."}
                    className="w-full h-32 bg-surface-2 border border-border rounded-xl p-4 text-sm focus:border-primary transition-all outline-none text-foreground"
                    value={quoteNotes}
                    onChange={(e) => setNegotiationNotes(e.target.value)}
                  />
                </div>
              )}

              <div className="flex gap-4">
                <Button
                  className="flex-1 h-14 rounded-full text-xs font-black tracking-[.15em] border-white/10"
                  variant="outline"
                  onClick={() => { setQuoteAction(null); setNegotiationNotes(''); }}
                >
                  CANCEL
                </Button>
                <Button
                  className={cn(
                    "flex-1 h-14 rounded-full text-xs font-black tracking-[.15em]",
                    quoteAction === 'accept' ? "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent" :
                    quoteAction === 'reject' ? "bg-red-500 hover:bg-red-600 text-white border-transparent" : ""
                  )}
                  variant="primary"
                  disabled={isSubmittingQuote || (quoteAction === 'reject' && !quoteNotes)}
                  onClick={handleQuoteAction}
                >
                  {isSubmittingQuote ? 'PROCESSING...' : quoteAction === 'accept' ? 'CONFIRM & BOOK' : quoteAction === 'negotiate' ? 'SEND REQUEST' : 'CONFIRM REJECTION'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
