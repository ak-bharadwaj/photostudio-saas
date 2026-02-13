'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Wrench,
  FileText,
  CreditCard,
  Image,
  Settings,
  LogOut,
  BarChart3,
  ChevronLeft,
  Camera,
} from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';
import { useSidebar } from './sidebar-context';

/* -------------------------------------------------------------------------- */
/*  Navigation config                                                         */
/* -------------------------------------------------------------------------- */

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Bookings', href: '/bookings', icon: Calendar },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Services', href: '/services', icon: Wrench },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Payments', href: '/payments', icon: CreditCard },
  { name: 'Portfolio', href: '/portfolio', icon: Image },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

/* -------------------------------------------------------------------------- */
/*  Sidebar                                                                   */
/* -------------------------------------------------------------------------- */

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { isOpen, isCollapsed, isMobile, close, toggleCollapse } = useSidebar();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const handleNavClick = () => {
    if (isMobile) close();
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname?.startsWith(href + '/');
  };

  const sidebarContent = (
    <div
      className={cn(
        'flex flex-col h-full',
        'bg-[var(--sidebar-bg)] text-[var(--sidebar-text)]',
        'transition-all duration-[var(--transition-slow)]',
        isMobile ? 'w-[var(--sidebar-width)]' : isCollapsed ? 'w-[var(--sidebar-collapsed-width)]' : 'w-[var(--sidebar-width)]',
      )}
    >
      {/* ---- Logo ---- */}
      <div
        className={cn(
          'flex items-center h-16 px-4 border-b border-[var(--sidebar-border)]',
          isCollapsed && !isMobile ? 'justify-center' : 'justify-between',
        )}
      >
        <Link
          href="/"
          className="flex items-center gap-2.5 min-w-0"
          onClick={handleNavClick}
        >
          <div className="flex items-center justify-center h-9 w-9 rounded-[var(--radius-lg)] bg-[var(--primary)] shrink-0">
            <Camera className="h-5 w-5 text-white" />
          </div>
          {(!isCollapsed || isMobile) && (
            <span className="text-lg font-bold text-white truncate">
              PhotoStudio
            </span>
          )}
        </Link>

        {/* Collapse toggle — desktop only */}
        {!isMobile && (
          <button
            onClick={toggleCollapse}
            className={cn(
              'flex items-center justify-center h-7 w-7 rounded-[var(--radius-md)]',
              'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-bg-hover)]',
              'transition-all duration-[var(--transition-fast)]',
              isCollapsed && 'absolute -right-3 top-5 bg-[var(--sidebar-bg)] border border-[var(--sidebar-border)] shadow-[var(--shadow-md)] z-10',
            )}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft
              className={cn(
                'h-4 w-4 transition-transform duration-[var(--transition-base)]',
                isCollapsed && 'rotate-180',
              )}
            />
          </button>
        )}
      </div>

      {/* ---- Navigation ---- */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar">
        {navigation.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleNavClick}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)]',
                'text-sm font-medium',
                'transition-all duration-[var(--transition-fast)]',
                active
                  ? 'bg-[var(--sidebar-bg-active)] text-[var(--sidebar-text-active)]'
                  : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-bg-hover)] hover:text-[var(--sidebar-text-active)]',
                isCollapsed && !isMobile && 'justify-center px-0',
              )}
              title={isCollapsed && !isMobile ? item.name : undefined}
            >
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0',
                  'transition-colors duration-[var(--transition-fast)]',
                  active ? 'text-[var(--primary)]' : 'text-[var(--sidebar-text)] group-hover:text-[var(--sidebar-text-active)]',
                )}
              />
              {(!isCollapsed || isMobile) && (
                <span className="truncate">{item.name}</span>
              )}
              {active && (!isCollapsed || isMobile) && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ---- User section ---- */}
      <div className="p-3 border-t border-[var(--sidebar-border)]">
        <div
          className={cn(
            'flex items-center gap-3 p-2 rounded-[var(--radius-md)]',
            isCollapsed && !isMobile && 'justify-center',
          )}
        >
          <div className="flex items-center justify-center h-9 w-9 rounded-full bg-[var(--primary)] shrink-0">
            <span className="text-sm font-semibold text-white">
              {user?.email?.charAt(0).toUpperCase() || '?'}
            </span>
          </div>

          {(!isCollapsed || isMobile) && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.email || 'User'}
                </p>
                <p className="text-xs text-[var(--sidebar-text)] truncate">
                  {user?.role || 'Admin'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className={cn(
                  'flex items-center justify-center h-8 w-8 rounded-[var(--radius-md)]',
                  'text-[var(--sidebar-text)] hover:text-white',
                  'hover:bg-[var(--sidebar-bg-hover)]',
                  'transition-colors duration-[var(--transition-fast)]',
                )}
                title="Log out"
                aria-label="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  /* --- Mobile: overlay drawer --- */
  if (isMobile) {
    return (
      <>
        {/* Overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-[var(--overlay)] animate-overlay-in lg:hidden"
            style={{ zIndex: 'var(--z-overlay)' } as React.CSSProperties}
            onClick={close}
            aria-hidden="true"
          />
        )}

        {/* Drawer */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 lg:hidden',
            'transform transition-transform duration-[var(--transition-slow)] ease-out',
            isOpen ? 'translate-x-0' : '-translate-x-full',
          )}
          style={{ zIndex: 'var(--z-overlay)' } as React.CSSProperties}
        >
          {sidebarContent}
        </aside>
      </>
    );
  }

  /* --- Desktop: static sidebar --- */
  return (
    <aside className="relative hidden lg:flex shrink-0">
      {sidebarContent}
    </aside>
  );
};
