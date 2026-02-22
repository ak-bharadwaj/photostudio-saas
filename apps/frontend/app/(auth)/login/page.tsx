'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/lib/auth-store';
import { useToast } from '@/components/ui/toast';
import { BgMeshEngine } from '@/components/ui/bg-mesh-engine';
import { Camera, Lock, Mail } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setIsLoading(true);
      await login(data.email, data.password);

      const user = useAuthStore.getState().user;
      addToast('success', 'Successfully logged in!');

      if (user?.isAdmin || user?.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch (error: any) {
      addToast('error', error.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      {/* Luxury Background */}
      <BgMeshEngine />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md animate-luxury-in">
        <div className="glass-luxury rounded-[var(--radius-xl)] p-8 sm:p-10 shadow-[var(--shadow-2xl)]">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center shadow-lg transform rotate-3 transition-transform hover:rotate-6 hover:scale-105">
                <Camera className="h-8 w-8 text-white -rotate-3" />
              </div>
              {/* Glow effect behind logo */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] blur-xl opacity-30 -z-10 scale-150" />
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">
              Welcome Back
            </h1>
            <p className="mt-2 text-[var(--foreground-secondary)]">
              Sign in to your professional studio dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="name@studio.com"
                error={errors.email?.message}
                {...register('email')}
                className="h-12 bg-[var(--surface-0)] border-[var(--border-light)] focus:border-[var(--primary)] transition-colors"
              />

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                error={errors.password?.message}
                {...register('password')}
                className="h-12 bg-[var(--surface-0)] border-[var(--border-light)] focus:border-[var(--primary)] transition-colors"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] hover:shadow-lg hover:scale-[1.02] transition-all duration-300"
              isLoading={isLoading}
              disabled={isLoading}
            >
              Sign In
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-[var(--border-light)] text-center">
            <p className="text-xs text-[var(--foreground-tertiary)] uppercase tracking-[0.2em] font-semibold">
              PhotoStudio · SaaS Platform
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
