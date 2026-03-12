'use client';

import React from 'react';
import { AlertTriangle, Lock, CreditCard, ChevronRight, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/lib/auth-store';
import Link from 'next/link';

export function SubscriptionWarning() {
  const { user } = useAuthStore();
  
  if (!user?.studio?.subscriptionExpiresAt || user.isAdmin) return null;

  const expiryDate = new Date(user.studio.subscriptionExpiresAt);
  const now = new Date();
  const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Show warning if it's within 7 days
  if (diffDays > 0 && diffDays <= 7) {
    return (
      <div className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-500">Subscription Nearing Expiry</p>
            <p className="text-xs text-amber-500/80">Your Pro Plan expires in {diffDays} {diffDays === 1 ? 'day' : 'days'}. Renew now to maintain uninterrupted access.</p>
          </div>
        </div>
        <Link href="mailto:support@reviewsfeedback.com?subject=Business Subscription Renewal">
          <Button size="sm" variant="outline" className="border-amber-500/50 text-amber-500 hover:bg-amber-500 hover:text-white shrink-0">
            Contact Support to Renew
          </Button>
        </Link>
      </div>
    );
  }

  return null;
}

export function SubscriptionExpiredBlock() {
  const { user, logout } = useAuthStore();
  
  if (!user?.studio?.subscriptionExpiresAt || user.isAdmin) return null;

  const expiryDate = new Date(user.studio.subscriptionExpiresAt);
  const now = new Date();
  const isExpired = expiryDate < now || user.studio.status === 'EXPIRED';
  const isSuspended = user.studio.status === 'SUSPENDED';

  if (!isExpired && !isSuspended) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--background)] flex items-center justify-center p-6 lg:p-12 overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--primary)]/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[var(--accent)]/10 blur-[120px] rounded-full" />
      
      <div className="max-w-xl w-full text-center relative z-10 space-y-8">
        <div className="flex justify-center">
          <div className="h-24 w-24 rounded-[32px] bg-red-500/10 flex items-center justify-center border border-red-500/20 animate-bounce-subtle">
            <Lock className="h-10 w-10 text-red-500" />
          </div>
        </div>
        
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-[var(--foreground)] sm:text-5xl">
            {isSuspended ? 'Account Suspended' : 'Account Expired'}
          </h1>
          <p className="text-lg text-[var(--foreground-secondary)] max-w-md mx-auto">
            {isSuspended 
              ? 'Your business access has been suspended by the platform administrator. Please contact support for more details.'
              : 'Your Pro Plan subscription has ended. Access to your business settings and data is currently restricted.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href={`mailto:support@reviewsfeedback.com?subject=Business Account ${isSuspended ? 'Appeal' : 'Reactivation'}`} className="w-full sm:w-auto">
            <Button 
              size="lg" 
              className="w-full px-8 bg-red-600 hover:bg-red-700 text-white border-none"
              leftIcon={<Mail className="h-5 w-5" />}
            >
              Contact {isSuspended ? 'Support' : 'Elite Support'}
            </Button>
          </a>
          <Button 
            variant="ghost" 
            size="lg" 
            className="w-full sm:w-auto px-8"
            onClick={() => logout()}
          >
            Sign Out
          </Button>
        </div>

        {!isSuspended && (
          <div className="pt-8 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--foreground-tertiary)] uppercase tracking-widest font-semibold mb-4">
              Why was my access restricted?
            </p>
            <div className="grid grid-cols-1 gap-3 text-left">
              {[
                "Your 14-day trial period has concluded",
                "Your annual/monthly payment was not processed",
                "An admin has manually marked your business as expired"
              ].map((reason, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--foreground)]/[0.03] border border-[var(--border)]">
                  <ChevronRight className="h-4 w-4 text-[var(--primary)]" />
                  <span className="text-sm text-[var(--foreground-secondary)]">{reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
