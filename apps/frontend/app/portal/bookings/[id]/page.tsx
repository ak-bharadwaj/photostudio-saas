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
  History
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const safeGetItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(key); } catch { return null; }
};

interface Booking {
  id: string;
  status: string;
  scheduledAt: string;
  customerNotes?: string;
  vision?: string;
  moodboardUrl?: string;
  quoteAmount?: number;
  quoteNotes?: string;
  service: { name: string; price: number; durationMinutes: number; description?: string };
  studio: { 
    name: string; 
    email: string; 
    phone: string; 
    slug: string; 
    logoUrl?: string;
    address?: string;
    city?: string;
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
  INQUIRY: { variant: 'default', icon: MessageSquare, label: 'Inquiry', color: '#9ca3af', bg: 'rgba(156,163,175,0.08)', border: 'rgba(156,163,175,0.2)', description: 'Your request has been sent to the partner.' },
  QUOTED: { variant: 'info', icon: MessageSquare, label: 'Quoted', color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)', description: 'Partner has provided a quote for your appointment.' },
  CONFIRMED: { variant: 'success', icon: CheckCircle, label: 'Confirmed', color: '#34d399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.2)', description: 'Your appointment is confirmed and scheduled.' },
  IN_PROGRESS: { variant: 'warning', icon: Loader, label: 'In Progress', color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)', description: 'Your engagement is currently ongoing or in review.' },
  COMPLETED: { variant: 'secondary', icon: CheckCircle, label: 'Completed', color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)', description: 'Booking completed! Your results are available.' },
  CANCELLED: { variant: 'danger', icon: Ban, label: 'Cancelled', color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)', description: 'This booking has been cancelled.' },
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

  const fetchBooking = useCallback(async () => {
    const token = safeGetItem('accessToken');
    if (!token) {
      router.replace('/portal/login');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_URL}/portal/bookings/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBooking(res.data);
    } catch (err) {
      console.error('Failed to load booking', err);
      setError('Could not find this booking. It may have been deleted or moved.');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

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
        <p className="text-[10px] font-black tracking-widest uppercase text-foreground-tertiary mt-4">SYNCING BOOKING DATA</p>
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
      <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[.3em] text-foreground-tertiary">
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
                className="py-1 px-4 rounded-full font-black tracking-widest uppercase text-[10px]"
                style={{ backgroundColor: currentStatus.bg, color: currentStatus.color, borderColor: currentStatus.border }}
              >
                {currentStatus.label}
              </Badge>
              <div className="h-px w-8 bg-border" />
              <span className="text-[10px] font-black tracking-widest text-foreground-tertiary flex items-center gap-2">
                <Calendar className="h-3 w-3" /> {formatDate(booking.scheduledAt)}
              </span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight">
              {booking.service.name}
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
                  <p className="text-[10px] font-black text-foreground-tertiary uppercase tracking-widest">BUSINESS PARTNER</p>
                  <Link href={`/studio/${booking.studio.slug}`} className="text-xl font-black hover:text-primary transition-colors flex items-center gap-2">
                    {booking.studio.name} <ExternalLink className="h-3.5 w-3.5 opacity-50" />
                  </Link>
               </div>
            </div>
          </div>

          <div className="glass-ultra p-8 rounded-3xl min-w-[280px] space-y-4 border border-white/10 shadow-xl">
             <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-foreground-tertiary">
               <span>INVESTMENT</span>
               <Info className="h-3 w-3" />
             </div>
             <div className="text-4xl font-black tracking-tighter">
               {formatCurrency(booking.quoteAmount || booking.service.price)}
             </div>
             <div className="h-px w-full bg-border/30" />
             <div className="flex items-center gap-3 text-xs font-bold text-foreground-secondary">
               <Clock className="h-4 w-4 text-primary" />
               {booking.service.durationMinutes} Minute Appointment
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
                <label className="text-[10px] font-black uppercase tracking-widest text-primary">Service Description</label>
                <p className="text-foreground-secondary leading-relaxed text-sm">
                  {booking.service.description || 'Professional service tailored to your requirements.'}
                </p>
              </div>

              {booking.vision && (
                <div className="space-y-4 p-8 bg-surface-2/50 rounded-3xl border border-border/50">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary">Creative Vision</label>
                  <p className="text-foreground font-medium text-base italic leading-relaxed">
                    &quot;{booking.vision}&quot;
                  </p>
                </div>
              )}

              {booking.moodboardUrl && (
                <div className="space-y-4">
                   <label className="text-[10px] font-black uppercase tracking-widest text-primary">Reference Material</label>
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
                         <p className="text-[10px] font-bold text-foreground-tertiary uppercase tracking-widest">OPEN MOODBOARD</p>
                       </div>
                     </div>
                     <ChevronRight className="h-5 w-5 text-foreground-tertiary group-hover:translate-x-1 transition-transform" />
                   </a>
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
                                star <= reviewRating ? "text-yellow-400 fill-current drop-shadow-glow" : "text-border hover:text-yellow-400/40"
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
                   <div className="p-8 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-8 opacity-10">
                       <Star className="h-20 w-20 text-emerald-500 fill-current" />
                     </div>
                     <span className="text-[10px] font-black tracking-widest uppercase text-emerald-500 mb-4 block">YOUR FEEDBACK</span>
                     <div className="flex items-center gap-1 mb-4">
                       {[1, 2, 3, 4, 5].map(s => (
                         <Star key={s} className={cn("h-4 w-4", s <= booking.review!.rating ? "text-emerald-500 fill-current" : "text-emerald-500/20")} />
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
    </div>
  );
}
