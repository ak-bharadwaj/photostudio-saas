'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import axios from 'axios';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import {
  Calendar,
  FileText,
  Wallet,
  ArrowRight,
  Sparkles,
  Activity,
  ChevronRight,
  Camera,
  Star,
  Zap,
  Layout,
  ExternalLink,
  LogOut,
  Building2
} from 'lucide-react';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const safeGetItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(key); } catch { return null; }
};

interface Booking {
  id: string;
  status: string;
  scheduledAt: string;
  service: { name: string; price: number };
  studio: { name: string; slug: string; logoUrl?: string };
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  total: number;
  status: string;
  studio: { name: string };
}

interface StudioRegistry {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
}

export default function CustomerPortalPage() {
  const { addToast } = useToast();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [studios, setStudios] = useState<StudioRegistry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const token = safeGetItem('accessToken');
    const guestPhone = safeGetItem('customer_guest_phone');

    try {
      let bookings, invoices, myStudios;

      if (token) {
        const headers = { Authorization: `Bearer ${token}` };
        [bookings, invoices, myStudios] = await Promise.all([
          axios.get(`${API_URL}/portal/bookings`, { headers }),
          axios.get(`${API_URL}/portal/invoices`, { headers }),
          axios.get(`${API_URL}/portal/studios`, { headers })
        ]);
        setData({
          customer: bookings.data?.customer || { name: 'Customer' },
          bookings: bookings.data?.data || [],
          invoices: invoices.data?.data || []
        });
        setStudios(myStudios.data || []);
      } else if (guestPhone) {
        // Guest mode fallback
        [bookings, invoices] = await Promise.all([
          axios.get(`${API_URL}/customer-portal/bookings`, { params: { phone: guestPhone } }),
          axios.get(`${API_URL}/customer-portal/invoices`, { params: { phone: guestPhone } })
        ]);
        setData({
          customer: bookings.data?.customer || { name: 'Guest' },
          bookings: bookings.data?.data || [],
          invoices: invoices.data?.data || []
        });
      } else {
        router.replace('/portal/login');
      }
    } catch (err) {
      console.error('Portal load failed', err);
      addToast('error', 'Failed to load portal data');
    } finally {
      setLoading(false);
    }
  }, [router, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <div className="liquid-shape h-20 w-20 flex items-center justify-center mb-8 shadow-glow-primary">
          <Building2 className="text-background h-8 w-8 animate-pulse" />
        </div>
        <p className="text-xs font-black tracking-[.3em] uppercase text-foreground-tertiary animate-pulse">OPTIMIZING YOUR FEEDBACK</p>
      </div>
    );
  }

  if (!data) return null;

  const firstName = data.customer.name.split(' ')[0].toUpperCase();

  return (
    <div className="min-h-screen pb-20 overflow-hidden">
      {/* ── CINEMATIC HEADER ── */}
      <section className="relative pt-20 pb-28 px-4 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[1000px] h-[1000px] bg-primary/5 blur-[120px] rounded-full -z-10 animate-pulse-soft" />
        <div className="absolute bottom-0 right-0 text-[25vw] font-black text-outline-luxury opacity-[0.05] select-none leading-none -z-10 tracking-tighter">
          {firstName}
        </div>

        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-16">
          <div className="space-y-8 animate-cinematic">
            <div className="flex items-center gap-4">
              <Badge className="bg-primary/10 text-primary border-primary/20 py-1 px-4 rounded-full font-black tracking-widest uppercase text-[10px]">
                COLLECTIVE MEMBER
              </Badge>
              <div className="h-px w-12 bg-border-strong" />
              <span className="text-[10px] font-black tracking-[.4em] uppercase text-foreground-secondary/70">DASHBOARD</span>
            </div>
            <h1 className="text-5xl md:text-8xl font-black leading-[0.9] tracking-tighter" style={{ fontFamily: 'var(--font-heading)' }}>
              {firstName && firstName !== 'CUSTOMER' ? (
                <>Welcome back,<br /><span className="text-primary italic">{firstName}.</span></>
              ) : (
                <>Welcome back.</>
              )}
            </h1>
            <div className="reveal-up" style={{ animationDelay: '0.1s' }}>
            <p className="text-foreground-secondary text-sm sm:text-lg mb-8 max-w-xl font-medium leading-relaxed">
            Your bookings, messages, and invoices all in one place. <br />
            Manage your business experience with ease.
            </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:mb-4 animate-cinematic" style={{ animationDelay: '200ms' }}>
            <div className="glass-ultra p-10 flex flex-col justify-between h-48 group hover:border-primary/50 transition-all duration-700 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-4 -right-4 h-24 w-24 bg-primary/10 blur-2xl rounded-full" />
              <span className="text-[10px] font-black tracking-[.3em] uppercase text-foreground-tertiary">ACTIVE BOOKINGS</span>
              <div className="flex items-end gap-3">
                <span className="text-6xl font-black tracking-tighter">{data.bookings.length}</span>
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Activity className="h-4 w-4 text-primary animate-pulse" />
                </div>
              </div>
            </div>
            <div className="glass-ultra p-10 flex flex-col justify-between h-48 group hover:border-accent/50 transition-all duration-700 shadow-2xl relative overflow-hidden">
              <div className="absolute -top-4 -right-4 h-24 w-24 bg-accent/10 blur-2xl rounded-full" />
              <span className="text-[10px] font-black tracking-[.3em] uppercase text-foreground-tertiary">STATEMENTS</span>
              <div className="flex items-end gap-3">
                <span className="text-6xl font-black tracking-tighter">{data.invoices.length}</span>
                <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center mb-2">
                  <FileText className="h-4 w-4 text-accent" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ASYMMETRIC GRID CONTENT ── */}
      <section className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-12 mt-12">

        {/* LEFT COLUMN: THE PARTNER REGISTRY */}
        <div className="lg:col-span-4 space-y-12">
          <div className="space-y-6">
            <h2 className="text-[11px] font-black tracking-[.4em] uppercase text-foreground-tertiary flex items-center gap-3">
              <Building2 className="h-4 w-4 text-primary" /> BUSINESS REGISTRY
            </h2>
            <div className="flex flex-col gap-4 stagger-children">
              {studios.length > 0 ? (
                studios.map((studio) => (
                  <Link
                    key={studio.id}
                    href={`/studio/${studio.slug}`}
                    className="group flex items-center justify-between p-6 rounded-[2rem] bg-surface-1 border border-border hover:border-primary/50 hover:bg-surface-2 transition-all duration-500 shadow-sm hover:shadow-xl"
                  >
                    <div className="flex items-center gap-5">
                      <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden border border-primary/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                        {studio.logoUrl ? (
                          <img src={studio.logoUrl} className="w-full h-full object-cover" alt={studio.name} />
                        ) : (
                          <Building2 className="h-6 w-6 text-foreground-tertiary opacity-40" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-black text-foreground-tertiary tracking-widest uppercase mb-0.5">PARTNER</p>
                        <span className="text-lg font-black tracking-tight group-hover:text-primary transition-colors">{studio.name}</span>
                      </div>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1">
                      <ExternalLink className="h-4 w-4 text-primary" />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="p-12 rounded-[2.5rem] border-2 border-dashed border-border/50 text-center glass-ultra">
                  <p className="text-[10px] font-black text-foreground-tertiary uppercase tracking-widest">NO COLLABORATIONS YET</p>
                  <Link href="/explore" className="mt-4 block text-[10px] font-black text-primary uppercase underline underline-offset-4">START YOUR JOURNEY</Link>
                </div>
              )}
            </div>
          </div>

          <div className="card-luxury p-0 rounded-3xl overflow-hidden bg-black text-white relative h-64 shadow-glow-primary group">
            {/* Ambient Background Gradient instead of Unsplash */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/10 group-hover:scale-110 transition-transform duration-1000" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.1),transparent_70%)]" />
            <div className="relative z-10 p-8 flex flex-col justify-between h-full bg-gradient-to-t from-black via-black/20 to-transparent">
              <div className="flex justify-between items-start">
                <Zap className="text-primary fill-primary h-6 w-6" />
                <Badge variant="secondary" className="bg-white/10 text-white border-white/20 px-4 py-1">PREMIUM</Badge>
              </div>
              <div>
                <h3 className="text-2xl font-black leading-tight mb-2">Unlock Growth Perks.</h3>
                <p className="text-xs text-white/60 mb-6">Gain access to limited-edition consulting slots and VIP business coverage.</p>
                <Button variant="primary" size="sm" className="rounded-full w-full bg-primary hover:bg-primary/90 text-[10px] font-black tracking-[.2em] uppercase">UPGRADE PLAN</Button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: RECENT ACTIVITY */}
        <div className="lg:col-span-8 space-y-12">

          {/* SESSIONS SECTION */}
          <div className="space-y-10 animate-cinematic" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-black tracking-[.4em] uppercase text-foreground-tertiary flex items-center gap-3">
                <Star className="h-4 w-4 text-gold" /> RECENT BOOKINGS
              </h2>
              <Link href="/portal/bookings" className="group flex items-center gap-2 text-[10px] font-black text-primary hover:text-primary-dark transition-colors tracking-widest uppercase">
                All Bookings <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 stagger-children">
              {data.bookings.slice(0, 4).map((booking: any) => (
                <div key={booking.id} className="group relative">
                  <div className="avant-garde-card p-0 overflow-hidden bg-surface-1 border-border shadow-lg hover:shadow-2xl transition-all duration-700">
                    <div className="p-8">
                      <div className="flex justify-between items-start mb-8">
                        <div className="flex flex-col">
                          <Badge className="bg-primary/10 text-primary border-transparent py-0.5 px-3 rounded-lg font-black tracking-widest uppercase text-[8px] mb-3 w-fit">
                            {booking.status}
                          </Badge>
                          <div className="flex items-center gap-3">
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center shrink-0">
                            <Building2 className="text-primary h-5 w-5" />
                          </div>
                          <div>
                          <p className="text-xs font-black text-foreground-tertiary tracking-widest uppercase mb-0.5">PARTNER</p>
                          <p className="text-sm sm:text-base font-bold text-foreground leading-none">{booking.studio.name}</p>
                          </div>
                        </div>
                          <span className="text-2xl font-black tracking-tighter group-hover:text-primary transition-colors leading-tight">{booking.service.name}</span>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-surface-2 flex items-center justify-center border border-border group-hover:bg-primary/5 transition-all">
                          <Building2 className="h-5 w-5 text-foreground-tertiary opacity-40 group-hover:text-primary transition-colors" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-10 mb-8 p-6 bg-surface-2/50 rounded-2xl border border-border/30">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-foreground-tertiary uppercase tracking-widest mb-2">SCHEDULED</span>
                          <span className="text-xs font-black tracking-tight">{formatDate(booking.scheduledAt)}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-foreground-tertiary uppercase tracking-widest mb-2">INVESTMENT</span>
                          <span className="text-lg font-black tracking-tighter">{formatCurrency(booking.service.price)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full animate-pulse bg-primary shadow-glow-primary`} />
                          <span className="text-[9px] font-black text-foreground-tertiary tracking-widest uppercase">Active Protocol</span>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="rounded-xl h-12 px-6 text-[10px] font-black tracking-widest border border-border group/btn hover:bg-primary hover:text-white hover:border-primary transition-all shadow-md"
                          onClick={() => router.push(`/portal/bookings/${booking.id}`)}
                        >
                          OPEN SUITE <ArrowRight className="ml-2 h-3.5 w-3.5 transform group-hover/btn:translate-x-1 transition-transform" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {data.bookings.length === 0 && (
                <div className="col-span-full py-24 text-center glass-ultra rounded-[2.5rem]">
                <div className="text-center py-20 reveal-up">
                <div className="h-24 w-24 bg-surface-1 rounded-full flex items-center justify-center mx-auto mb-8 border border-border">
                  <Calendar className="text-foreground-tertiary h-10 w-10" />
                </div>
                <h3 className="text-3xl font-black tracking-tight mb-4 modern-title">No bookings right now.</h3>
                  <p className="text-sm font-medium text-foreground-tertiary max-w-xs mx-auto mb-8">No active bookings found. Explore our partners and book your next consultation.</p>
                <Button onClick={() => router.push('/explore')} className="btn-luxury h-12 px-8">
                  Browse Partners
                </Button>
              </div>
              </div>
              )}
            </div>
          </div>

          {/* INVOICES SECTION */}
          <div className="space-y-10 animate-cinematic" style={{ animationDelay: '600ms' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-black tracking-[.4em] uppercase text-foreground-tertiary flex items-center gap-3">
                <Wallet className="h-4 w-4" /> BILLING HISTORY
              </h2>
              <Link href="/portal/invoices" className="group flex items-center gap-2 text-[10px] font-black text-primary hover:text-primary-dark transition-colors tracking-widest uppercase">
                All Statements <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="space-y-4 stagger-children">
              {data.invoices.slice(0, 3).map((invoice: any) => (
                <div key={invoice.id} className="glass-ultra p-8 flex flex-col md:flex-row md:items-center justify-between hover:border-primary/30 transition-all duration-500 group">
                  <div className="flex items-center gap-10 flex-1">
                    <div className="h-14 w-14 rounded-2xl bg-surface-2 flex items-center justify-center border border-border group-hover:bg-primary/5 transition-all">
                      <FileText className="h-6 w-6 text-foreground-tertiary opacity-40 group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-foreground-tertiary tracking-widest uppercase mb-1">REFERENCE</p>
                      <p className="text-sm font-black tracking-tight">#{invoice.invoiceNumber}</p>
                    </div>
                    <div className="hidden lg:block">
                      <p className="text-[10px] font-black text-foreground-tertiary tracking-widest uppercase mb-1">PARTNER</p>
                      <p className="text-sm font-black tracking-tight">{invoice.studio.name}</p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-[10px] font-black text-foreground-tertiary tracking-widest uppercase mb-1">ISSUED</p>
                      <p className="text-xs font-black tracking-tight">{formatDate(invoice.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-10 mt-6 md:mt-0 border-t md:border-t-0 pt-6 md:pt-0 border-border/30">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-primary tracking-widest uppercase mb-1">{invoice.status}</p>
                      <p className="text-2xl font-black tracking-tighter tabular-nums">{formatCurrency(invoice.total)}</p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      className="rounded-xl h-12 px-8 text-[10px] font-black tracking-widest uppercase"
                      onClick={() => router.push(`/portal/invoices/${invoice.id}`)}
                    >
                      VIEW
                    </Button>
                  </div>
                </div>
              ))}
              {data.invoices.length === 0 && (
                <div className="py-20 text-center glass-ultra rounded-[2rem] border-2 border-dashed border-border/50">
                  <p className="text-xs font-black text-foreground-tertiary uppercase tracking-widest">NO FINANCIAL HISTORY</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </section>
    </div>
  );
}
