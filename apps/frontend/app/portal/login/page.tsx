'use client';

import React, { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/components/ui/toast';
import { useAuthStore } from '@/lib/auth-store';
import {
  AlertCircle,
  Aperture,
  Zap,
  ArrowRight,
  User,
  AtSign,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const PortalLogo = ({ mode }: { mode?: string }) => (
    <div className="flex items-center gap-3 animate-luxury-in">
        <div className="h-10 w-10 flex items-center justify-center bg-primary shadow-lg transform rotate-3">
            <Aperture className="h-5 w-5 text-background" />
        </div>
        <div>
            <p className="text-foreground font-black text-xl tracking-tighter leading-none modern-title">ReviewsFeedback</p>
            <p className="text-foreground/40 text-[8px] tracking-[0.3em] uppercase font-bold mt-1">
                {mode || 'Portal Access'}
            </p>
        </div>
    </div>
);

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/';
  const { addToast } = useToast();
  const { login, customerRegister } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Form State
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = () => {
    // Priority: use explicit returnTo if present, otherwise default to home page
    window.location.href = `${API_URL}/auth/google?returnTo=${encodeURIComponent(returnTo)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your email or phone number');
      return;
    }
    if (!password) {
      setError('Password is required');
      return;
    }
    if (activeTab === 'register' && !name.trim()) {
      setError('Name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Determine if identifier is an email (basic check)
      const isEmail = identifier.includes('@');
      const credentials = {
        email: isEmail ? identifier.trim() : undefined,
        phone: !isEmail ? identifier.trim() : undefined,
        password,
      };

      if (activeTab === 'login') {
        await login(credentials);
        addToast('success', `Welcome back!`);
      } else {
        await customerRegister({
          name: name.trim(),
          ...credentials,
        });
        addToast('success', `Account created successfully!`);
      }
      
      router.push(returnTo);
    } catch (err: unknown) {
      const authErr = err as { response?: { data?: { message?: string } } };
      setError(
          authErr.response?.data?.message || 
          (activeTab === 'login' ? 'Login failed. Please check your credentials.' : 'Registration failed.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 bg-background selection:bg-amber-500/20 selection:text-amber-900 transition-colors duration-1000">
        {/* Cinematic Background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
            <Image
                src="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&q=75&w=1280"
                alt="Elegant Business"
                fill
                className="object-cover opacity-20 dark:opacity-10 dark:grayscale"
                priority
            />
            <div className="absolute inset-0 bg-gradient-to-br from-background via-background/80 to-background/50" />
        </div>

        <div className="relative z-10 w-full max-w-[440px] animate-luxury-in">
            <div className="text-center mb-10">
                <div className="inline-flex items-center justify-center mb-6">
                    <PortalLogo />
                </div>
            </div>

            <div className="bg-surface-1/80 backdrop-blur-3xl border border-border p-8 sm:p-12 shadow-expensive rounded-[40px] relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 opacity-20" />
                
                <div className="mb-8 text-center">
                    <h2 className="text-4xl font-light tracking-tight text-foreground leading-tight mb-3" style={{ fontFamily: 'var(--font-serif)' }}>
                        Client <span className="italic opacity-40">Portal.</span>
                    </h2>
                    <p className="text-[13px] text-foreground/50 font-medium">Access your feedback, bookings, and invoices.</p>
                </div>

                <div className="flex bg-surface-2 p-1 rounded-xl mb-8 relative">
                    <button
                        type="button"
                        onClick={() => { setActiveTab('login'); setError(null); }}
                        className={`flex-1 py-3 text-xs font-bold tracking-wider uppercase rounded-lg transition-all z-10 ${
                        activeTab === 'login' ? 'text-foreground' : 'text-foreground/40 hover:text-foreground/70'
                        }`}
                    >
                        Sign In
                    </button>
                    <button
                        type="button"
                        onClick={() => { setActiveTab('register'); setError(null); }}
                        className={`flex-1 py-3 text-xs font-bold tracking-wider uppercase rounded-lg transition-all z-10 ${
                        activeTab === 'register' ? 'text-foreground' : 'text-foreground/40 hover:text-foreground/70'
                        }`}
                    >
                        Create Account
                    </button>
                    <div 
                        className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-surface-0 rounded-lg shadow-sm transition-transform duration-300 ease-in-out border border-border" 
                        style={{ transform: activeTab === 'login' ? 'translateX(0)' : 'translateX(100%)' }}
                    />
                </div>

                <div className="space-y-6">
                    <button
                        onClick={handleGoogleLogin}
                        className="w-full h-14 flex items-center justify-center gap-3 bg-white border border-border text-[11px] font-black uppercase tracking-widest transition-all hover:bg-slate-50 !text-black rounded-2xl group shadow-sm hover:shadow-xl"
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
                        <span className="!text-black font-bold">Continue with Google</span>
                    </button>

                    <div className="relative flex items-center justify-center py-2">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
                        <span className="relative px-4 bg-surface-1 text-[9px] uppercase font-black tracking-[0.3em] text-foreground/30">or email/phone</span>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {activeTab === 'register' && (
                           <div className="relative">
                               <User className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
                               <input
                                   type="text"
                                   placeholder="Full Name"
                                   value={name}
                                   onChange={(e) => setName(e.target.value)}
                                   className="w-full h-14 pl-14 pr-6 bg-surface-2/50 border border-border rounded-2xl text-sm focus:bg-surface-0 focus:border-amber-400/50 transition-all outline-none text-foreground font-medium"
                                   required={activeTab === 'register'}
                               />
                           </div>
                        )}
                        <div className="relative">
                            <AtSign className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
                            <input
                                type="text"
                                placeholder="Email address or Phone number"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                className="w-full h-14 pl-14 pr-6 bg-surface-2/50 border border-border rounded-2xl text-sm focus:bg-surface-0 focus:border-amber-400/50 transition-all outline-none text-foreground font-medium"
                                required
                            />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full h-14 pl-14 pr-12 bg-surface-2/50 border border-border rounded-2xl text-sm focus:bg-surface-0 focus:border-amber-400/50 transition-all outline-none text-foreground font-medium"
                                required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-5 top-1/2 -translate-y-1/2 text-foreground/30 hover:text-foreground transition-colors"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-14 bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-amber-400/20 mt-2"
                            isLoading={loading}
                        >
                            <Zap className="h-4 w-4 mr-2" /> {activeTab === 'login' ? 'Sign In' : 'Create Account'}
                        </Button>
                    </form>

                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-black uppercase tracking-widest text-center rounded-xl animate-shake">
                            <AlertCircle className="h-4 w-4 inline mr-2" /> {error}
                        </div>
                    )}
                </div>

                <div className="mt-10 pt-8 border-t border-border/50 text-center">
                    <p className="text-[11px] font-black tracking-[0.2em] text-foreground/20 uppercase mb-4">
                        Are you a Partner?
                    </p>
                    <Link 
                        href="/login" 
                        className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-amber-600/70 hover:text-amber-600 transition-colors"
                    >
                        Sign in to Console <ArrowRight size={12} />
                    </Link>
                </div>
            </div>

            <div className="mt-12 text-center opacity-30 select-none">
                 <p className="text-[11px] font-black tracking-[.4em] uppercase text-foreground italic">
                    ReviewsFeedback · The Enterprise Feedback OS
                </p>
                <div className="flex items-center justify-center gap-6 mt-4 text-[9px] font-bold tracking-widest uppercase">
                    <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
                    <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
                </div>
            </div>
        </div>
    </div>
  );
}

export default function PortalLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background"><LoadingSpinner size="lg" /></div>}>
      <div className="relative">
        <div className="fixed top-6 right-6 z-[100]">
          <ThemeToggle />
        </div>
        <LoginContent />
      </div>
    </Suspense>
  );
}
