'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/lib/auth-store';
import { useToast } from '@/components/ui/toast';
import { Camera, Eye, EyeOff, Lock, Mail, Aperture, Zap, Shield, Star, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

type ApiError = { response?: { data?: { message?: string } } };

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type LoginFormData = z.infer<typeof loginSchema>;

/* ---- Floating particle -------------------------------------------------- */
interface Particle { id: number; x: number; y: number; size: number; opacity: number; speed: number; drift: number; }

function useParticles(count = 28) {
  const [particles, setParticles] = useState<Particle[]>([]);
  useEffect(() => {
    setParticles(
      Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.5 + 0.1,
        speed: Math.random() * 40 + 20,
        drift: (Math.random() - 0.5) * 30,
      })),
    );
  }, [count]);
  return particles;
}

/* ---- Typing placeholder ------------------------------------------------- */
const PLACEHOLDERS = ['name@studio.com', 'sarah@lensandlight.com', 'john@forevermoments.com'];
function useTypingPlaceholder() {
  const [text, setText] = useState('');
  const [phIdx, setPhIdx] = useState(0);
  const [typing, setTyping] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const target = PLACEHOLDERS[phIdx];
    if (typing) {
      if (text.length < target.length) {
        timerRef.current = setTimeout(() => setText(target.slice(0, text.length + 1)), 60);
      } else {
        timerRef.current = setTimeout(() => setTyping(false), 1800);
      }
    } else {
      if (text.length > 0) {
        timerRef.current = setTimeout(() => setText(text.slice(0, -1)), 35);
      } else {
        setPhIdx((i) => (i + 1) % PLACEHOLDERS.length);
        setTyping(true);
      }
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [text, typing, phIdx]);

  return text || 'your@studio.com';
}


const FEATURES = [
  { icon: Zap, label: 'Smart Booking Engine', desc: 'Automate scheduling & confirmations instantly' },
  { icon: Shield, label: 'Studio-Grade Security', desc: 'Enterprise tenant isolation built-in' },
  { icon: Star, label: 'Revenue Analytics', desc: 'Real-time insights & forecasts' },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/* ========================================================================= */
export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const particles = useParticles(28);
  const emailPlaceholder = useTypingPlaceholder();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const handleGoogleLogin = () => {
    // returnTo=/dashboard ensures studio owners land on the dashboard after OAuth
    window.location.href = `${API_URL}/auth/google?returnTo=/dashboard`;
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      await login({ email: data.email, password: data.password });
      const user = useAuthStore.getState().user;
      addToast('success', `Welcome back${user?.name ? ', ' + user.name.split(' ')[0] : ''}!`);
      if (user?.isAdmin || user?.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (error) {
      const apiError = error as ApiError;
      addToast('error', apiError.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background selection:bg-foreground selection:text-background font-ui">

      {/* Back to website icon */}
      <Link
        href="/"
        className="absolute top-6 left-6 z-50 h-10 w-10 flex items-center justify-center rounded-full bg-background/80 backdrop-blur-md border border-foreground/5 text-foreground/40 hover:text-foreground hover:border-foreground/20 transition-all shadow-sm group"
      >
        <ArrowRight className="h-4 w-4 rotate-180 transition-transform group-hover:-translate-x-0.5" />
      </Link>

      <div className="min-h-screen flex w-full">

      {/* ================================================================== */}
      {/* LEFT PANEL — Professional Brand Side                               */}
      {/* ================================================================== */}
      <div
        className="hidden lg:flex lg:w-[48%] xl:w-[50%] relative flex-col justify-between overflow-hidden border-r border-foreground/5"
        style={{ background: 'var(--background-alt)' }}
      >
        {/* Ambient Glows */}
        {/* Ambient Glows */}
        <div className="absolute -top-24 -left-20 w-[400px] h-[400px] rounded-full blur-[100px] opacity-[0.05]" style={{ background: 'var(--foreground)' }} />
        <div className="absolute bottom-[10%] right-[-5%] w-[350px] h-[350px] rounded-full blur-[80px] opacity-[0.03]" style={{ background: 'var(--accent)' }} />

        {/* Texture */}
        <div className="absolute inset-0 opacity-[0.4] mix-blend-overlay pointer-events-none grain-overlay" />

        {/* Grid lines */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
          aria-hidden="true"
        />

        {/* Top: Wordmark */}
        <div className="relative z-10 p-12">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-none bg-foreground flex items-center justify-center">
              <Camera className="text-background h-5 w-5" />
            </div>
            <div>
              <p className="text-foreground font-black text-xl tracking-tighter leading-none" style={{ fontFamily: 'var(--font-serif)' }}>
                ReviewsFeedback
              </p>
              <p className="text-foreground/40 text-[9px] tracking-[0.25em] uppercase font-bold mt-1">
                Studio Console
              </p>
            </div>
          </div>
        </div>

        {/* Middle: Content */}
        <div className="relative z-10 px-12 flex-1 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-foreground/5 border border-foreground/5 mb-8 w-fit animate-luxury-in">
            <Shield className="h-3 w-3 text-foreground/40" />
            <span className="text-foreground/60 text-[11px] font-bold tracking-widest uppercase">Trusted Professional Grade</span>
          </div>

          <h1 className="text-5xl xl:text-7xl font-light text-foreground leading-[0.95] tracking-tighter mb-8 animate-luxury-in delay-100" style={{ fontFamily: 'var(--font-serif)' }}>
            Your next<br />
            <span className="italic text-foreground/50">masterpiece</span> <br />
            starts here.
          </h1>

          <p className="text-foreground/40 text-lg leading-relaxed max-w-sm font-light mb-12 animate-luxury-in delay-200">
            Manage your photography business with a suite of professional tools designed for artisans.
          </p>

          <div className="grid grid-cols-2 gap-6 max-w-lg mt-auto pb-12 animate-luxury-in delay-300">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 p-4 bg-foreground/5 border border-foreground/5 group hover:bg-foreground/10 hover:border-foreground/10 transition-all duration-300">
                <Icon className="h-5 w-5 text-foreground/40 group-hover:text-foreground transition-colors" />
                <span className="text-foreground/60 text-[11px] font-bold tracking-widest uppercase leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 p-12">
          <p className="text-foreground/20 text-[11px] font-bold tracking-[0.25em] uppercase">
            Photography Management Platform
          </p>
        </div>
      </div>

      {/* ================================================================== */}
      {/* RIGHT PANEL                                                         */}
      {/* ================================================================== */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-[var(--background)] relative overflow-hidden">
        {/* Subtle bg glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.07] pointer-events-none" style={{ background: 'var(--primary)' }} aria-hidden="true" />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-[100px] opacity-[0.05] pointer-events-none" style={{ background: 'var(--accent)' }} aria-hidden="true" />

        <div className="relative w-full max-w-[400px] animate-luxury-in">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2.5 mb-10 justify-center">
            <div className="h-9 w-9 bg-foreground flex items-center justify-center">
              <Camera className="h-5 w-5 text-background" />
            </div>
            <span className="font-bold text-foreground text-lg tracking-tighter" style={{ fontFamily: 'var(--font-serif)' }}>ReviewsFeedback</span>
          </div>

          {/* Header */}
          <div className="mb-10 text-center lg:text-left">
            <Badge className="mb-4 bg-foreground/5 text-foreground/60 border-none py-1 px-4 text-[11px] font-bold tracking-widest uppercase rounded-none">Studio Sign In</Badge>
            <h2 className="text-4xl font-light text-foreground tracking-tighter leading-tight" style={{ fontFamily: 'var(--font-serif)' }}>
              Welcome back<br />
              <span className="text-foreground/40 italic">to your studio.</span>
            </h2>
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full h-12 flex items-center justify-center gap-3 bg-foreground/5 border border-foreground/10 text-[11px] font-bold uppercase tracking-widest transition-all hover:bg-foreground hover:text-background hover:border-foreground rounded-none group mb-6"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="relative flex items-center justify-center py-2 mb-4">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-foreground/8" /></div>
            <span className="relative px-4 text-[9px] uppercase font-black tracking-[0.3em] text-foreground/30" style={{ background: 'var(--background)' }}>or email</span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              placeholder={emailPlaceholder}
              error={errors.email?.message}
              {...register('email')}
              leftIcon={<Mail className="h-4 w-4" />}
              className="h-11"
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
              leftIcon={<Lock className="h-4 w-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-[var(--foreground-tertiary)] hover:text-[var(--foreground-secondary)] transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  suppressHydrationWarning
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              className="h-11"
            />

            {/* Submit button with shimmer */}
            <Button
              type="submit"
              className="w-full h-12 text-xs font-bold uppercase tracking-widest mt-2 rounded-none bg-foreground text-background hover:opacity-90 transition-all transition-all duration-300"
              isLoading={isLoading}
              disabled={isLoading}
            >
              {!isLoading && (
                <>
                  <span>Continue</span>
                  <ArrowRight className="h-4 w-4 ml-1.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                </>
              )}
            </Button>
          </form>



          {/* Customer Portal Link - Separation of concerns */}
          <div className="mt-10 pt-8 border-t border-foreground/5 text-center">
            <p className="text-[11px] font-bold text-foreground/30 mb-4 uppercase tracking-[0.2em]">Are you a client?</p>
            <Link href="/portal/login" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-foreground hover:opacity-60 transition-all group">
              Customer Portal <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <p className="mt-8 text-center text-[11px] font-black uppercase tracking-[0.3em] text-[var(--foreground-tertiary)] opacity-30">
            Secure Enterprise Gateway
          </p>
        </div>
      </div>

      {/* Particle keyframe */}
      <style>{`
        @keyframes floatParticle {
          0%   { transform: translateY(0px) translateX(0px); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 0.6; }
          100% { transform: translateY(-120vh) translateX(var(--drift, 20px)); opacity: 0; }
        }
      `}</style>
      </div>
    </div>
  );
}
