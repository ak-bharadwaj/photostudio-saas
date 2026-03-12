'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { SidebarProvider } from '@/components/layout/sidebar-context';
import { MobileHeader } from '@/components/layout/mobile-header';
import { BgMeshEngine } from '@/components/ui/bg-mesh-engine';
import { useAuthStore } from '@/lib/auth-store';
import { LoadingPage } from '@/components/ui/loading';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { SubscriptionWarning, SubscriptionExpiredBlock } from '@/components/dashboard/subscription-status';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = React.useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, loadUser } = useAuthStore();

  useEffect(() => {
    setMounted(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    if (!token) {
      router.push('/login');
      return;
    }

    if (!user && !isLoading) {
      loadUser();
    }
  }, [user, isLoading, loadUser, router]);

  if (!mounted || isLoading) {
    return <LoadingPage message="Preparing your workspace..." />;
  }

  if (!user) {
    return null;
  }

  const isSimplified = pathname === '/onboarding';

  return (
    <SidebarProvider>
      <div className="relative flex h-screen overflow-hidden">
        {/* Subscription Lock Screen */}
        {!isSimplified && <SubscriptionExpiredBlock />}

        {/* Dynamic Background */}
        <BgMeshEngine />

        {/* Sidebar */}
        {!isSimplified && <Sidebar />}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative z-[1]">
          {/* Mobile Header */}
          <MobileHeader />

          {/* Scrollable Content */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
            {/* animate-luxury-in is keyed by pathname so it re-runs on route changes,
                but NOT on the outer shell which would flicker the sidebar */}
            <div key={pathname} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8 animate-luxury-in">
              {/* Expiry Warning Banner */}
              {!isSimplified && <SubscriptionWarning />}
              
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
