'use client';

import React from 'react';
import { Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useSidebar } from './sidebar-context';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';
import { NAVIGATION } from '@/lib/navigation';

export const MobileHeader: React.FC = () => {
  const { isMobile, open } = useSidebar();
  const pathname = usePathname();
  const { user } = useAuthStore();

  if (!isMobile) return null;

  // Determine current page name for breadcrumb
  const currentItem = NAVIGATION.find(item => {
    if (item.href === '/') return pathname === '/';
    return pathname === item.href || pathname?.startsWith(item.href + '/');
  });
  const CurrentIcon = currentItem?.icon;
  const studioName = user?.studio?.name ?? 'Studio';

  return (
    <header
      className={cn(
        'sticky top-0 flex items-center gap-3 h-14 px-4',
        'border-b border-[var(--border-light)]',
        'lg:hidden',
        // Frosted glass
        'bg-[var(--surface-0)]/80 backdrop-blur-md',
      )}
      style={{ zIndex: 'var(--z-sticky)' } as React.CSSProperties}
    >
      {/* Menu trigger */}
      <button
        onClick={open}
        className={cn(
          'flex items-center justify-center h-9 w-9 rounded-[var(--radius-md)]',
          'text-[var(--foreground-secondary)] hover:text-[var(--foreground)]',
          'hover:bg-[var(--overlay-light)]',
          'transition-colors duration-[var(--transition-fast)]',
          'shrink-0',
        )}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Gradient logo mark — uses CSS vars */}
      <div
        className="h-7 w-7 rounded-[var(--radius-md)] shrink-0 flex items-center justify-center shadow-[var(--shadow-glow-primary)] bg-gradient-to-br from-[var(--primary)] to-[var(--accent)]"
        aria-hidden="true"
      >
        <span className="text-white text-[11px] font-black leading-none">
          {studioName.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Breadcrumb: Studio › Page */}
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-sm font-semibold text-[var(--foreground-secondary)] truncate max-w-[80px]">
          {studioName}
        </span>
        {currentItem && (
          <>
            <span className="text-[var(--foreground-tertiary)] text-sm">/</span>
            <div className="flex items-center gap-1.5">
              {CurrentIcon && (
                <CurrentIcon className="h-3.5 w-3.5 text-[var(--primary)] shrink-0" />
              )}
              <span className="text-sm font-bold text-[var(--foreground)] truncate">
                {currentItem.name}
              </span>
            </div>
          </>
        )}
      </div>
    </header>
  );
};
