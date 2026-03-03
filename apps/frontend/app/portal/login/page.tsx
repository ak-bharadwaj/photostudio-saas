'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/components/ui/toast';
import axios from 'axios';
import {
  Phone,
  Search,
  AlertCircle,
  Aperture,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Star,
  Zap,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const safeGetItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(key); } catch { return null; }
};

/* ── Floating orb ── */
function Orb({ style }: { style: React.CSSProperties }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none animate-[blob-float_8s_ease-in-out_infinite]"
      style={style}
    />
  );
}

/* ── Animated mesh grid line ── */
function GridLines() {
  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-[0.03]"
      style={{
        backgroundImage: `
          linear-gradient(rgba(167,139,250,1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(167,139,250,1) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }}
    />
  );
}

export default function PortalLoginPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const token = safeGetItem('customer_token');
    if (token) {
      router.replace('/portal');
    } else {
      setCheckingToken(false);
    }
  }, [router]);

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/auth/google`;
  };

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError('Please enter your phone number');
      return;
    }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);

    try {
      const [bookingsRes, invoicesRes] = await Promise.all([
        axios.get(`${API_URL}/customer-portal/bookings`, {
          params: { phone: phone.trim() },
          signal: ctrl.signal,
        }),
        axios.get(`${API_URL}/customer-portal/invoices`, {
          params: { phone: phone.trim() },
          signal: ctrl.signal,
        }),
      ]);

      const customer =
        bookingsRes.data?.customer ||
        invoicesRes.data?.customer;

      if (!customer) {
        setError('No account found for that phone number. Please check and try again.');
        return;
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('customer_guest_phone', phone.trim());
        localStorage.setItem('customer_guest_name', customer.name ?? '');
      }

      addToast('success', `Welcome back, ${customer.name ?? 'there'}!`);
      router.push('/portal');
    } catch (err: unknown) {
      if (axios.isCancel(err)) return;
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'No records found for that phone number.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex">
      {/* ══════════ LEFT PANEL — Immersive brand side ══════════ */}
      <div
        className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative flex-col justify-between p-12 xl:p-16"
        style={{ background: 'linear-gradient(135deg, #050210 0%, #0e0620 40%, #130820 70%, #060210 100%)' }}
      >
        {/* Grid overlay */}
        <GridLines />

        {/* Ambient orbs */}
        <Orb style={{ width: 600, height: 600, top: '-15%', left: '-10%', background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 65%)', animationDelay: '0s' }} />
        <Orb style={{ width: 400, height: 400, bottom: '-5%', right: '-5%', background: 'radial-gradient(circle, rgba(219,39,119,0.14) 0%, transparent 65%)', animationDelay: '4s' }} />
        <Orb style={{ width: 280, height: 280, top: '55%', left: '60%', background: 'radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 65%)', animationDelay: '7s' }} />

        {/* Top: logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div
            className="h-11 w-11 rounded-2xl flex items-center justify-center shadow-xl"
            style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', boxShadow: '0 8px 32px rgba(124,58,237,0.45)' }}
          >
            <Aperture className="h-6 w-6 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: 'rgba(255,255,255,0.3)' }}>Studio</p>
            <p className="text-base font-black leading-none" style={{ color: 'rgba(255,255,255,0.9)' }}>Customer Portal</p>
          </div>
        </div>

        {/* Center: hero text */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold"
              style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)', color: 'rgba(167,139,250,0.9)' }}
            >
              <Sparkles className="h-3 w-3" />
              Your creative journey, unified
            </div>
            <h1 className="text-5xl xl:text-6xl font-black leading-[1.05] tracking-tight" style={{ color: 'rgba(255,255,255,0.95)' }}>
              All your studio
              <br />
              moments in{' '}
              <span style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #f472b6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                one place
              </span>
            </h1>
            <p className="text-base xl:text-lg leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
              Track your sessions, manage invoices, and access your complete history across every studio — all from one beautiful portal.
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-3">
            {[
              { icon: ShieldCheck, text: 'Bank-grade security', color: 'rgba(52,211,153,0.6)' },
              { icon: Zap,         text: 'Instant access',      color: 'rgba(251,191,36,0.6)' },
              { icon: Star,        text: 'All studios',         color: 'rgba(167,139,250,0.6)' },
            ].map(({ icon: Icon, text, color }) => (
              <div
                key={text}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}
              >
                <Icon className="h-3.5 w-3.5" style={{ color }} />
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: testimonial */}
        <div
          className="relative z-10 p-5 rounded-3xl"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-1 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-3.5 w-3.5 fill-current" style={{ color: '#fbbf24' }} />
            ))}
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
            &ldquo;Having all my studio bookings in one place has transformed how I manage my creative work. The portal is gorgeous and so easy to use.&rdquo;
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
            >
              AR
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.7)' }}>Arjun R.</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>Music Producer, Mumbai</p>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ RIGHT PANEL — Form ══════════ */}
      <div
        className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative"
        style={{ background: 'var(--background)' }}
      >
        {/* Mobile ambient blobs */}
        <div className="lg:hidden absolute top-0 left-0 w-80 h-80 rounded-full pointer-events-none opacity-60" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)', transform: 'translate(-40%, -40%)' }} />
        <div className="lg:hidden absolute bottom-0 right-0 w-60 h-60 rounded-full pointer-events-none opacity-60" style={{ background: 'radial-gradient(circle, rgba(219,39,119,0.06) 0%, transparent 70%)', transform: 'translate(30%, 30%)' }} />

        <div className="w-full max-w-md relative z-10 animate-luxury-in">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div
              className="inline-flex h-16 w-16 rounded-3xl items-center justify-center mb-4 shadow-2xl"
              style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)', boxShadow: '0 8px 32px rgba(124,58,237,0.35)' }}
            >
              <Aperture className="h-8 w-8 text-white" strokeWidth={1.5} />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--foreground)]">
              Studio <span className="gradient-text">Portal</span>
            </h1>
            <p className="text-[var(--foreground-tertiary)] mt-2 text-sm max-w-xs mx-auto">
              Access your bookings, invoices and session history.
            </p>
          </div>

          {/* Desktop heading */}
          <div className="hidden lg:block mb-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--foreground-tertiary)] mb-2">Welcome back</p>
            <h2 className="text-3xl font-black text-[var(--foreground)] tracking-tight">Sign in to your portal</h2>
            <p className="text-[var(--foreground-tertiary)] mt-2 text-sm">Use Google for full access, or look up your records by phone.</p>
          </div>

          {/* Card */}
          <div
            className="rounded-3xl p-8 space-y-6 shadow-2xl"
            style={{
              background: 'var(--surface-0)',
              border: '1px solid var(--border)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.12), 0 4px 24px rgba(0,0,0,0.06)',
            }}
          >
            {/* Google Sign In */}
            <button
              onClick={handleGoogleLogin}
              className="w-full h-[52px] flex items-center justify-center gap-3 rounded-2xl text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
              style={{
                background: 'var(--surface-1)',
                border: '1.5px solid var(--border-strong)',
                color: 'var(--foreground)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--primary)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(124,58,237,0.15)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-strong)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
              }}
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
              <ArrowRight className="h-4 w-4 ml-auto opacity-30" />
            </button>

            {/* Divider */}
            <div className="relative flex items-center gap-4">
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
              <span className="text-[10px] uppercase font-black tracking-[0.2em] text-[var(--foreground-tertiary)] shrink-0">
                or guest access
              </span>
              <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
            </div>

            {/* Phone form */}
            <form onSubmit={handleGuestLogin} className="space-y-4" noValidate>
              <div className="space-y-2">
                <label
                  htmlFor="portal-phone"
                  className="block text-xs font-black uppercase tracking-[0.15em] text-[var(--foreground-secondary)]"
                >
                  Phone Number
                </label>
                <div className="relative">
                  <Phone
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
                    style={{ color: 'var(--foreground-tertiary)' }}
                  />
                  <Input
                    id="portal-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setError(null); }}
                    className="h-[52px] rounded-2xl pl-11"
                    aria-invalid={!!error}
                    aria-describedby={error ? 'phone-error' : undefined}
                  />
                </div>
                {error && (
                  <div
                    id="phone-error"
                    role="alert"
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold"
                    style={{ background: 'color-mix(in srgb, var(--danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 15%, transparent)', color: 'var(--danger)' }}
                  >
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {error}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-[52px] font-bold rounded-2xl btn-shimmer"
                disabled={loading}
                isLoading={loading}
              >
                {!loading && <Search className="mr-2 h-4 w-4" />}
                Find My Records
                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>
          </div>

          {/* Trust indicators */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { icon: ShieldCheck, label: 'Private & Secure', color: 'var(--success)' },
              { icon: Sparkles,    label: 'All Studios',       color: 'var(--primary)' },
              { icon: Zap,        label: 'Instant Access',    color: 'var(--warning)' },
            ].map(({ icon: Icon, label, color }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl text-center"
                style={{ background: 'var(--surface-0)', border: '1px solid var(--border-light)' }}
              >
                <Icon className="h-4 w-4" style={{ color }} />
                <span className="text-[10px] font-bold leading-tight text-[var(--foreground-tertiary)]">{label}</span>
              </div>
            ))}
          </div>

          <p className="text-center text-[10px] text-[var(--foreground-tertiary)] mt-5">
            Your data is private and only visible to you.
          </p>
        </div>
      </div>
    </div>
  );
}
