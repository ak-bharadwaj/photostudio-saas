'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LogOut, ChevronLeft, Camera } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { useRouter } from 'next/navigation';
import { useSidebar } from './sidebar-context';
import { NAVIGATION } from '@/lib/navigation';

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

  const initials = user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?';

  const logoUrl = user?.studio?.logoUrl
    ? user.studio.logoUrl.startsWith('http')
      ? user.studio.logoUrl
      : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${user.studio.logoUrl.startsWith('/') ? '' : '/'}${user.studio.logoUrl}`
    : null;

  const sidebarContent = (
    <div
      className={cn(
        'flex flex-col h-full',
        'bg-[var(--sidebar-bg)] text-[var(--sidebar-text)]',
        'transition-[width] duration-300 ease-out',
        isMobile
          ? 'w-[var(--sidebar-width)]'
          : isCollapsed
          ? 'w-[var(--sidebar-collapsed-width)]'
          : 'w-[var(--sidebar-width)]',
      )}
    >
      {/* ---- Logo / Studio Name ---- */}
      <div
        className={cn(
          'flex items-center h-16 px-4 border-b border-[var(--sidebar-border)] shrink-0',
          isCollapsed && !isMobile ? 'justify-center' : 'justify-between',
        )}
      >
        <Link
          href="/"
          className="flex items-center gap-2.5 min-w-0 group"
          onClick={handleNavClick}
        >
          {/* Logo mark — uses CSS vars, no raw hex */}
          <div
            className={cn(
              'flex items-center justify-center h-9 w-9 rounded-[var(--radius-lg)] shrink-0',
              'shadow-[var(--shadow-glow-primary)]',
              'overflow-hidden transition-transform duration-200 group-hover:scale-105',
              'bg-gradient-to-br from-[var(--primary)] to-[var(--accent)]',
            )}
          >
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={user?.studio?.name || 'Studio logo'}
                width={36}
                height={36}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <Camera className="h-5 w-5 text-white" />
            )}
          </div>

          {/* Studio name */}
          {(!isCollapsed || isMobile) && (
            <span
              className="text-[15px] font-bold tracking-tight truncate font-heading"
              style={{ color: 'rgba(255,255,255,0.92)' }}
            >
              {user?.studio?.name || 'PhotoStudio'}
            </span>
          )}
        </Link>

        {/* Collapse toggle — desktop only */}
        {!isMobile && (
          <button
            onClick={toggleCollapse}
            className={cn(
              'flex items-center justify-center h-7 w-7 rounded-[var(--radius-md)]',
              'text-[var(--sidebar-text)] hover:bg-white/10 hover:text-white',
              'transition-all duration-200',
              isCollapsed &&
                'absolute -right-3 top-4 bg-[var(--sidebar-bg)] border border-[var(--sidebar-border)] shadow-[var(--shadow-md)] z-10',
            )}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft
              className={cn(
                'h-4 w-4 transition-transform duration-300',
                isCollapsed && 'rotate-180',
              )}
            />
          </button>
        )}
      </div>

      {/* ---- Navigation ---- */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto no-scrollbar">
        {NAVIGATION
          .filter((item) => !item.roles || (user?.role && item.roles.includes(user.role)))
          .map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={handleNavClick}
                title={isCollapsed && !isMobile ? item.name : undefined}
                className={cn(
                  'group relative flex items-center gap-3 rounded-[var(--radius-md)]',
                  'text-sm font-medium',
                  'transition-all duration-200',
                  isCollapsed && !isMobile
                    ? 'justify-center px-0 py-2.5 mx-1'
                    : 'px-3 py-2.5',
                  active
                    ? [
                        'bg-gradient-to-r from-white/10 to-white/5',
                        'text-white',
                        'before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2',
                        'before:w-0.5 before:h-5 before:rounded-full',
                        'before:bg-gradient-to-b before:from-[var(--primary)] before:to-[var(--accent)]',
                      ].join(' ')
                    : [
                        'text-[var(--sidebar-text)]',
                        'hover:bg-white/5 hover:text-white',
                      ].join(' '),
                )}
              >
                {/* Icon with gradient bg when active */}
                <div
                  className={cn(
                    'flex items-center justify-center h-7 w-7 rounded-[var(--radius-sm)] shrink-0',
                    'transition-all duration-200',
                  )}
                  style={active ? {
                    background: item.gradient,
                    boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
                  } : { background: 'transparent' }}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors duration-200',
                      active ? 'text-white' : 'text-[var(--sidebar-text)] group-hover:text-white',
                    )}
                  />
                </div>

                {/* Label */}
                {(!isCollapsed || isMobile) && (
                  <span className="truncate flex-1">{item.name}</span>
                )}

                {/* Active indicator dot */}
                {active && (!isCollapsed || isMobile) && (
                  <span
                    className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--primary)] shadow-[0_0_6px_var(--primary)]"
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          })}
      </nav>

      {/* ---- User section ---- */}
      <div className="p-3 border-t border-[var(--sidebar-border)] shrink-0">
        <div
          className={cn(
            'flex items-center gap-3 p-2 rounded-[var(--radius-md)]',
            'hover:bg-white/5 transition-colors duration-200',
            isCollapsed && !isMobile && 'justify-center',
          )}
        >
          {/* Avatar — uses CSS vars gradient */}
          <div
            className={cn(
              'flex items-center justify-center h-8 w-8 rounded-full shrink-0',
              'shadow-[var(--shadow-glow-primary)]',
              'text-sm font-bold text-white',
              'bg-gradient-to-br from-[var(--primary)] to-[var(--accent)]',
            )}
          >
            {initials}
          </div>

          {(!isCollapsed || isMobile) && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-white truncate">
                  {user?.email || 'User'}
                </p>
                <p className="text-[11px] text-[var(--sidebar-text)] truncate capitalize">
                  {(user?.role || 'Admin').toLowerCase()}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className={cn(
                  'flex items-center justify-center h-7 w-7 rounded-[var(--radius-md)]',
                  'text-[var(--sidebar-text)] hover:text-white',
                  'hover:bg-white/10',
                  'transition-all duration-200',
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
        {/* Backdrop overlay */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-[var(--overlay)] backdrop-blur-sm animate-overlay-in lg:hidden"
            style={{ zIndex: 'var(--z-overlay)' } as React.CSSProperties}
            onClick={close}
            aria-hidden="true"
          />
        )}

        {/* Drawer */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 lg:hidden',
            'transform transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
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
