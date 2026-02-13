'use client';

import React from 'react';
import { Menu } from 'lucide-react';
import { useSidebar } from './sidebar-context';
import { cn } from '@/lib/utils';

export const MobileHeader: React.FC = () => {
  const { isMobile, open } = useSidebar();

  if (!isMobile) return null;

  return (
    <header
      className={cn(
        'sticky top-0 flex items-center gap-3 h-14 px-4',
        'bg-[var(--surface-0)] border-b border-[var(--border-light)]',
        'lg:hidden',
      )}
      style={{ zIndex: 'var(--z-sticky)' } as React.CSSProperties}
    >
      <button
        onClick={open}
        className={cn(
          'flex items-center justify-center h-9 w-9 rounded-[var(--radius-md)]',
          'text-[var(--foreground-secondary)] hover:text-[var(--foreground)]',
          'hover:bg-[var(--overlay-light)]',
          'transition-colors duration-[var(--transition-fast)]',
        )}
        aria-label="Open navigation menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <span className="text-base font-semibold text-[var(--foreground)]">
        PhotoStudio
      </span>
    </header>
  );
};
