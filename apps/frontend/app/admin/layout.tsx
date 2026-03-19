'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/auth-store';
import { LoadingPage } from '@/components/ui/loading';
import { BgMeshEngine } from '@/components/ui/bg-mesh-engine';
import {
  LayoutDashboard,
  Building2,
  LogOut,
  Shield,
  ClipboardList,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/studios', label: 'Studios', icon: Building2 },
  { href: '/admin/requests', label: 'Requests', icon: ClipboardList },
  { href: '/admin/users', label: 'Users', icon: Users },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, loadUser, logout } = useAuthStore();

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      router.push('/login');
      return;
    }

    if (!user && !isLoading) {
      loadUser();
    }
  }, [user, isLoading, loadUser, router]);

  useEffect(() => {
    if (!isLoading && user && !user.isAdmin) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <LoadingPage message="Loading admin panel..." />;
  }

  if (!user || !user.isAdmin) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="relative flex h-screen overflow-hidden">
      {/* Dynamic Background */}
      <BgMeshEngine />

      {/* Admin Sidebar */}
      <aside className="relative z-[2] w-64 glass-luxury border-r border-[var(--border-light)] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-[var(--border-light)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] text-[var(--primary-foreground)] shadow-lg">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[var(--foreground)]">Admin Panel</h1>
              <p className="text-xs text-[var(--foreground-tertiary)]">ReviewsFeedback SaaS</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium',
                  'transition-all duration-[var(--transition-fast)]',
                  isActive
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)] shadow-md'
                    : 'text-[var(--foreground-secondary)] hover:bg-[var(--overlay-light)] hover:text-[var(--foreground)]',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border-light)]">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-xs font-bold text-[var(--primary-foreground)] shadow-md">
              {user.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--foreground)] truncate">{user.name || user.email}</p>
              <p className="text-xs text-[var(--foreground-tertiary)] truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-3 w-full px-3 py-2 rounded-[var(--radius-md)] text-sm font-medium',
              'text-[var(--foreground-secondary)] hover:bg-[var(--danger-light)] hover:text-[var(--danger)]',
              'transition-colors duration-[var(--transition-fast)]',
            )}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="relative z-[1] flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto no-scrollbar">
          <div className="mx-auto max-w-7xl px-6 lg:px-8 py-6 lg:py-8 animate-luxury-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
