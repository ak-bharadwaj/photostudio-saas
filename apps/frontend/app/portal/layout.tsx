'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/loading';
import {
  Calendar,
  FileText,
  User,
  Settings,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  Aperture,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/* ── SSR-safe helpers ── */
const safeGetItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(key); } catch { return null; }
};

const safeSetItem = (key: string, value: string) => {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, value); } catch { /* noop */ }
};

const safeRemoveItem = (key: string) => {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(key); } catch { /* noop */ }
};

const navItems = [
  { name: 'Overview',    href: '/portal',           icon: LayoutDashboard, description: 'Dashboard' },
  { name: 'My Bookings', href: '/portal/bookings',  icon: Calendar,        description: 'Sessions' },
  { name: 'Invoices',    href: '/portal/invoices',  icon: FileText,        description: 'Billing' },
  { name: 'Account',     href: '/portal/account',   icon: User,            description: 'Profile' },
  { name: 'Settings',    href: '/portal/settings',  icon: Settings,        description: 'Preferences' },
];

/* Public routes that don't need auth guard */
const PUBLIC_PORTAL_PATHS = ['/portal/login'];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg animate-pulse"
            style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)' }}
          >
            <Aperture className="h-6 w-6 text-white" strokeWidth={1.5} />
          </div>
          <LoadingSpinner size="lg" />
        </div>
      </div>
    }>
      <PortalLayoutInner>{children}</PortalLayoutInner>
    </Suspense>
  );
}

function PortalLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated' | 'error'>('loading');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [layoutError, setLayoutError] = useState<string | null>(null);

  /* ── Fetch display name from API for JWT users ── */
  const fetchDisplayName = useCallback(async (token: string) => {
    try {
      const res = await axios.get(`${API_URL}/portal/me`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000,
      });
      const name = res.data?.name || res.data?.customer?.name;
      if (name) {
        setDisplayName(name);
        safeSetItem('customer_display_name', name);
      }
    } catch {
      const cached = safeGetItem('customer_display_name') || safeGetItem('customer_guest_name');
      if (cached) setDisplayName(cached);
    }
  }, []);

  /* ── Auth check on mount / token-in-URL ── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setLayoutError(null);

    try {
      const urlToken = searchParams.get('token');
      if (urlToken) {
        localStorage.setItem('customer_token', urlToken);
        const refreshToken = searchParams.get('refreshToken');
        if (refreshToken) localStorage.setItem('customer_refresh_token', refreshToken);
        window.history.replaceState({}, '', pathname);
        setAuthState('authenticated');
        fetchDisplayName(urlToken);
        return;
      }

      const token = safeGetItem('customer_token');
      const guestPhone = safeGetItem('customer_guest_phone');
      const guestName = safeGetItem('customer_guest_name');
      const cachedName = safeGetItem('customer_display_name');

      if (token) {
        setDisplayName(cachedName || 'Customer');
        setAuthState('authenticated');
        fetchDisplayName(token);
      } else if (guestPhone) {
        setDisplayName(guestName || 'Guest');
        setAuthState('authenticated');
      } else {
        setAuthState('unauthenticated');
        if (!PUBLIC_PORTAL_PATHS.includes(pathname)) {
          router.replace('/portal/login');
        }
      }
    } catch (err) {
      console.error('[PortalLayout] auth check failed:', err);
      setLayoutError('Something went wrong loading your session. Please try again.');
      setAuthState('error');
    }
  }, [searchParams, pathname, router, fetchDisplayName]);

  const handleLogout = () => {
    [
      'customer_token', 'customer_refresh_token', 'customer_guest_phone',
      'customer_guest_name', 'customer_display_name',
      'pref_email_notifications', 'pref_marketing_updates', 'pref_public_identity',
    ].forEach(safeRemoveItem);
    setAuthState('unauthenticated');
    router.push('/portal/login');
  };

  const handleRetry = () => {
    setAuthState('loading');
    setLayoutError(null);
    router.refresh();
  };

  /* ── Loading ── */
  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)' }}
          >
            <Aperture className="h-6 w-6 text-white" strokeWidth={1.5} />
          </div>
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (authState === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-4" style={{ background: 'var(--background)' }}>
        <div
          className="h-16 w-16 rounded-3xl flex items-center justify-center"
          style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 20%, transparent)' }}
        >
          <AlertTriangle className="h-8 w-8 text-[var(--danger)]" />
        </div>
        <div className="text-center">
          <p className="font-bold text-[var(--foreground)] mb-1">Session error</p>
          <p className="text-[var(--foreground-secondary)] text-sm max-w-xs">
            {layoutError || 'Something went wrong. Please try again.'}
          </p>
        </div>
        <button
          onClick={handleRetry}
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    );
  }

  /* ── Public routes (login page): render without sidebar ── */
  if (PUBLIC_PORTAL_PATHS.includes(pathname)) {
    return <>{children}</>;
  }

  /* ── Unauthenticated on a protected route: null while redirecting ── */
  if (authState === 'unauthenticated') return null;

  /* ══════════════════════════════════════════════════════════════
     Authenticated shell
  ══════════════════════════════════════════════════════════════ */
  const initial = displayName ? displayName.charAt(0).toUpperCase() : '?';
  const firstName = displayName.split(' ')[0] || displayName;
  const currentNav = navItems.find(n => n.href === pathname);

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--background-secondary)' }}>
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ════════════ SIDEBAR ════════════ */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-[260px] flex flex-col transition-transform duration-300 ease-in-out lg:static lg:translate-x-0',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Portal navigation"
        style={{
          background: 'linear-gradient(180deg, #0a0514 0%, #0e0820 50%, #080510 100%)',
          borderRight: '1px solid rgba(124,58,237,0.15)',
        }}
      >
        {/* Ambient orbs */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)', transform: 'translate(30%, -20%)' }} />
        <div className="absolute bottom-1/3 left-0 w-32 h-32 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(219,39,119,0.08) 0%, transparent 70%)', transform: 'translate(-30%, 0)' }} />

        {/* Logo / Brand */}
        <div
          className="relative h-[72px] flex items-center justify-between px-5 shrink-0"
          style={{ borderBottom: '1px solid rgba(124,58,237,0.12)' }}
        >
          <Link
            href="/portal"
            className="flex items-center gap-3 group"
            aria-label="Portal home"
            onClick={() => setIsSidebarOpen(false)}
          >
            <div
              className="h-10 w-10 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl"
              style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
              }}
            >
              <Aperture className="h-5 w-5 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-none" style={{ color: 'rgba(255,255,255,0.25)' }}>Studio</p>
              <p className="text-sm font-black leading-tight mt-0.5" style={{ color: 'rgba(255,255,255,0.9)' }}>Customer Portal</p>
            </div>
          </Link>
          <button
            className="lg:hidden h-8 w-8 flex items-center justify-center rounded-xl transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            aria-label="Close sidebar"
            onClick={() => setIsSidebarOpen(false)}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* User mini-profile */}
        <div className="px-4 pt-5 pb-3">
          <div
            className="flex items-center gap-3 p-3 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center text-white text-sm font-black shrink-0 shadow-lg"
              style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)' }}
            >
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate leading-tight" style={{ color: 'rgba(255,255,255,0.9)' }}>
                {firstName}
              </p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>Active session</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pb-2 overflow-y-auto no-scrollbar" aria-label="Main">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] px-3 pt-2 pb-3" style={{ color: 'rgba(255,255,255,0.18)' }}>
            Navigation
          </p>
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  aria-label={item.name}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    'group relative flex items-center gap-3 px-3 py-3 rounded-2xl text-sm font-semibold transition-all duration-200',
                    isActive ? '' : 'hover:bg-white/[0.04]',
                  )}
                  style={isActive ? {
                    background: 'linear-gradient(135deg, rgba(124,58,237,0.25) 0%, rgba(219,39,119,0.15) 100%)',
                    border: '1px solid rgba(124,58,237,0.3)',
                    color: 'rgba(255,255,255,0.95)',
                  } : {
                    color: 'rgba(255,255,255,0.38)',
                  }}
                >
                  {/* Active left accent bar */}
                  {isActive && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-full"
                      style={{ background: 'linear-gradient(180deg, var(--primary), var(--accent))' }}
                    />
                  )}

                  <div
                    className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200"
                    style={isActive ? {
                      background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                      boxShadow: '0 4px 12px rgba(124,58,237,0.4)',
                    } : {
                      background: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <item.icon
                      className="h-4 w-4"
                      style={{ color: isActive ? 'white' : 'rgba(255,255,255,0.4)' }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm leading-none', isActive ? 'font-bold' : 'font-semibold')} style={{ color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.45)' }}>
                      {item.name}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: isActive ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.2)' }}>
                      {item.description}
                    </p>
                  </div>

                  {isActive ? (
                    <Sparkles className="h-3 w-3 shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
                  ) : (
                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-40 transition-opacity shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }} />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Bottom: logout */}
        <div
          className="shrink-0 p-4"
          style={{ borderTop: '1px solid rgba(124,58,237,0.1)' }}
        >
          <button
            onClick={handleLogout}
            aria-label="Sign out"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200"
            style={{ color: 'rgba(239,68,68,0.5)' }}
            onMouseEnter={e => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.background = 'rgba(239,68,68,0.08)';
              btn.style.color = 'rgba(239,68,68,0.85)';
            }}
            onMouseLeave={e => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.background = 'transparent';
              btn.style.color = 'rgba(239,68,68,0.5)';
            }}
          >
            <div className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.08)' }}>
              <LogOut className="h-4 w-4" />
            </div>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ════════════ MAIN AREA ════════════ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header
          className="h-[72px] flex items-center justify-between px-5 lg:px-8 shrink-0 sticky top-0 z-30"
          style={{
            background: 'rgba(var(--surface-0-rgb, 255,255,255), 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {/* Mobile: hamburger */}
          <button
            className="lg:hidden h-9 w-9 flex items-center justify-center rounded-xl transition-colors"
            style={{ color: 'var(--foreground-secondary)', background: 'var(--surface-1)' }}
            aria-label="Open sidebar"
            aria-expanded={isSidebarOpen}
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb (desktop) */}
          <div className="hidden lg:flex items-center gap-2 text-sm">
            <span className="text-[var(--foreground-tertiary)] font-medium">Portal</span>
            {currentNav && currentNav.href !== '/portal' && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-[var(--foreground-tertiary)]" />
                <span className="font-bold text-[var(--foreground)]">{currentNav.name}</span>
              </>
            )}
            {(!currentNav || currentNav.href === '/portal') && (
              <>
                <ChevronRight className="h-3.5 w-3.5 text-[var(--foreground-tertiary)]" />
                <span className="font-bold text-[var(--foreground)]">Overview</span>
              </>
            )}
          </div>

          {/* Mobile: page title */}
          <div className="lg:hidden font-bold text-[var(--foreground)] text-sm">
            {currentNav?.name ?? 'Portal'}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: 'color-mix(in srgb, var(--success) 8%, transparent)', color: 'var(--success)', border: '1px solid color-mix(in srgb, var(--success) 15%, transparent)' }}>
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse" />
              Connected
            </div>
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center text-white text-sm font-black shadow-lg cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                boxShadow: '0 2px 12px rgba(124,58,237,0.35)',
              }}
              aria-label={`Signed in as ${displayName}`}
              title={displayName}
            >
              {initial}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-5 lg:p-8" id="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
