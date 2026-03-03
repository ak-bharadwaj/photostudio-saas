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
import { Camera, Eye, EyeOff, Lock, Mail, Aperture, Zap, Shield, Star, ArrowRight, CheckCircle2 } from 'lucide-react';

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

/* ---- Demo accounts ------------------------------------------------------ */
const DEMO_ACCOUNTS = [
  { role: 'Studio Owner', email: 'owner@lensandlight.com', pwd: 'Demo@123', color: '#7c3aed' },
  { role: 'Admin', email: 'admin@photostudio.com', pwd: 'Admin@123', color: '#db2777' },
  { role: 'Photographer', email: 'photographer@lensandlight.com', pwd: 'Demo@123', color: '#0891b2' },
];

const FEATURES = [
  { icon: Zap, label: 'Smart Booking Engine', desc: 'Automate scheduling & confirmations instantly' },
  { icon: Shield, label: 'Studio-Grade Security', desc: 'Enterprise tenant isolation built-in' },
  { icon: Star, label: 'Revenue Analytics', desc: 'Real-time insights & forecasts' },
];

/* ========================================================================= */
export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [filledRole, setFilledRole] = useState<string | null>(null);
  const particles = useParticles(28);
  const emailPlaceholder = useTypingPlaceholder();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const watchedEmail = watch('email');

  const fillDemo = (email: string, pwd: string, role: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', pwd, { shouldValidate: true });
    setFilledRole(role);
  };

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      await login(data.email, data.password);
      const user = useAuthStore.getState().user;
      addToast('success', `Welcome back${user?.name ? ', ' + user.name.split(' ')[0] : ''}!`);
      if (user?.isAdmin || user?.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch (error) {
      const apiError = error as ApiError;
      addToast('error', apiError.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ================================================================== */}
      {/* LEFT PANEL                                                          */}
      {/* ================================================================== */}
      <div
        className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative flex-col justify-between overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a0538 0%, #3b1278 30%, #7c3aed 65%, #be185d 100%)' }}
      >
        {/* Animated floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute rounded-full bg-white"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: p.size,
                height: p.size,
                opacity: p.opacity,
                animation: `floatParticle ${p.speed}s ${p.drift > 0 ? 'linear' : 'ease-in-out'} infinite`,
                animationDelay: `${-Math.random() * p.speed}s`,
              }}
            />
          ))}
        </div>

        {/* Noise texture */}
        <div
          className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '256px',
          }}
          aria-hidden="true"
        />

        {/* Orbs */}
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)' }} aria-hidden="true" />
        <div className="absolute -bottom-20 -right-20 w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(190,24,93,0.25) 0%, transparent 70%)' }} aria-hidden="true" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)' }} aria-hidden="true" />

        {/* Grid lines */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
          aria-hidden="true"
        />

        {/* Top: wordmark */}
        <div className="relative z-10 p-10 xl:p-14">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-11 w-11 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center shadow-lg">
                <Aperture className="h-6 w-6 text-white" />
              </div>
              <div className="absolute inset-0 rounded-2xl bg-white/10 blur-md -z-10 scale-125" aria-hidden="true" />
            </div>
            <div>
              <p className="text-white font-bold text-lg tracking-tight leading-none" style={{ fontFamily: 'var(--font-heading)' }}>
                PhotoStudio
              </p>
              <p className="text-white/45 text-[10px] tracking-[0.18em] uppercase font-semibold">
                Professional Platform
              </p>
            </div>
          </div>
        </div>

        {/* Middle: hero copy */}
        <div className="relative z-10 px-10 xl:px-14 flex-1 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 mb-6 w-fit">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            <span className="text-white/80 text-xs font-semibold tracking-wide">Trusted by 1,200+ studios worldwide</span>
          </div>

          <h1
            className="text-4xl xl:text-[52px] font-extrabold text-white leading-[1.08] tracking-tight mb-5"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Your studio.<br />
            <span
              className="text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(90deg, #f9a8d4 0%, #e879f9 50%, #fbbf24 100%)' }}
            >
              Fully automated.
            </span>
          </h1>
          <p className="text-white/50 text-base leading-relaxed max-w-[340px]">
            From booking to delivery — one platform that handles everything so you can focus on what you love.
          </p>

          {/* Feature list */}
          <div className="mt-8 space-y-3">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3.5 group">
                <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 transition-all duration-200 group-hover:bg-white/15 group-hover:border-white/25">
                  <Icon className="h-4 w-4 text-white/80" />
                </div>
                <div>
                  <p className="text-white/90 text-sm font-semibold">{label}</p>
                  <p className="text-white/40 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Social proof avatars */}
          <div className="mt-8 flex items-center gap-3">
            <div className="flex -space-x-2">
              {['#7c3aed', '#db2777', '#0891b2', '#059669'].map((c, i) => (
                <div
                  key={i}
                  className="h-8 w-8 rounded-full border-2 border-white/20 flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: c }}
                >
                  {['S', 'A', 'M', 'J'][i]}
                </div>
              ))}
            </div>
            <p className="text-white/50 text-xs">
              <span className="text-white/80 font-semibold">4.9★</span> from 380+ reviews
            </p>
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 px-10 xl:px-14 pb-10 xl:pb-14">
          <div className="pt-6 border-t border-white/10 flex items-center justify-between">
            <p className="text-white/25 text-xs">© 2026 PhotoStudio SaaS</p>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              <p className="text-white/30 text-xs">All systems operational</p>
            </div>
          </div>
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
          <div className="flex lg:hidden items-center gap-2.5 mb-8">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))', boxShadow: 'var(--shadow-glow-primary)' }}>
              <Camera className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-[var(--foreground)] text-lg" style={{ fontFamily: 'var(--font-heading)' }}>PhotoStudio</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-[28px] font-extrabold text-[var(--foreground)] tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
              Welcome back
            </h2>
            <p className="mt-1.5 text-[var(--foreground-tertiary)] text-sm">
              Sign in to access your studio dashboard
            </p>
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
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              className="h-11"
            />

            {/* Submit button with shimmer */}
            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold mt-2 btn-shimmer group relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                boxShadow: isLoading ? 'none' : 'var(--shadow-glow-primary)',
              }}
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

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-[var(--foreground-tertiary)] text-xs font-medium px-1">Quick access</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          {/* Demo accounts — click to fill */}
          <div className="space-y-2">
            {DEMO_ACCOUNTS.map(({ role, email, pwd, color }) => {
              const isFilled = filledRole === role && watchedEmail === email;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => fillDemo(email, pwd, role)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-[var(--radius-md)] text-left transition-all duration-150 group"
                  style={{
                    background: isFilled ? `${color}12` : 'var(--surface-1)',
                    border: `1px solid ${isFilled ? color + '40' : 'var(--border-light)'}`,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="h-6 w-6 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ background: color }}
                    >
                      {role.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[var(--foreground-secondary)]">{role}</p>
                      <p className="text-[10px] text-[var(--foreground-tertiary)] font-mono truncate max-w-[180px]">{email}</p>
                    </div>
                  </div>
                  {isFilled ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color }} />
                  ) : (
                    <span className="text-[10px] text-[var(--foreground-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity">Click to fill</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-[var(--foreground-tertiary)]">
            PhotoStudio · Secure SaaS Platform · All rights reserved
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
  );
}
