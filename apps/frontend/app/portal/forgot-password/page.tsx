'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Mail, ArrowLeft, Zap, AlertCircle, CheckCircle2, Aperture } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to request password reset');
            }

            setSuccess(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute inset-0 z-0">
                <Image 
                    src="https://images.unsplash.com/photo-1492691523567-61707d2e5ef4?q=80&w=2070"
                    alt="Background"
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

                <div className="bg-surface-1/80 backdrop-blur-3xl border border-border p-8 sm:p-12 shadow-expensive rounded-[40px] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 opacity-20" />
                    
                    <div className="mb-8 text-center">
                        <h2 className="text-4xl font-light tracking-tight text-foreground leading-tight mb-3" style={{ fontFamily: 'var(--font-serif)' }}>
                            Reset <span className="italic opacity-40">Password.</span>
                        </h2>
                        <p className="text-xs font-bold tracking-[0.2em] text-foreground/40 uppercase">
                            Enter your email to receive a reset link
                        </p>
                    </div>

                    {!success ? (
                        <div className="space-y-6">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="relative">
                                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground/30" />
                                    <input
                                        type="email"
                                        placeholder="Email address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full h-14 pl-14 pr-6 bg-surface-2/50 border border-border rounded-2xl text-sm focus:bg-surface-0 focus:border-amber-400/50 transition-all outline-none text-foreground font-medium"
                                        required
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-14 bg-amber-400 hover:bg-amber-500 text-amber-950 font-bold rounded-2xl text-xs uppercase tracking-widest shadow-lg shadow-amber-400/20 mt-2"
                                    isLoading={loading}
                                >
                                    <Zap className="h-4 w-4 mr-2" /> Send Reset Link
                                </Button>
                            </form>

                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-black uppercase tracking-widest text-center rounded-xl animate-shake">
                                    <AlertCircle className="h-4 w-4 inline mr-2" /> {error}
                                </div>
                            )}

                            <div className="text-center">
                                <Link 
                                    href="/portal/login" 
                                    className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-foreground/40 hover:text-foreground transition-colors"
                                >
                                    <ArrowLeft size={12} /> Back to Sign In
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center space-y-6 py-4">
                            <div className="flex justify-center">
                                <div className="h-16 w-16 bg-green-500/10 rounded-full flex items-center justify-center">
                                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-foreground">Check your inbox</h3>
                                <p className="text-sm text-foreground/60 leading-relaxed">
                                    If an account exists for <span className="font-bold text-foreground">{email}</span>, you will receive a password reset link shortly.
                                </p>
                            </div>
                            <Link 
                                href="/portal/login" 
                                className="inline-block w-full h-14 bg-surface-2 border border-border flex items-center justify-center text-xs font-bold uppercase tracking-widest rounded-2xl hover:bg-surface-3 transition-colors"
                            >
                                Return to Login
                            </Link>
                        </div>
                    )}
                </div>

                <div className="mt-12 text-center opacity-30 select-none">
                     <p className="text-[11px] font-black tracking-[.4em] uppercase text-foreground italic">
                        ReviewsFeedback · The Enterprise Feedback OS
                    </p>
                </div>
            </div>
        </div>
    );
}
