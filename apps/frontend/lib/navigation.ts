/**
 * Shared navigation configuration for sidebar and mobile header.
 * Single source of truth — import from both components.
 */
import {
  LayoutDashboard,
  Calendar,
  Users,
  Wrench,
  FileText,
  CreditCard,
  Image,
  Settings,
  BarChart3,
  Palette,
  Share2,
  Globe,
} from 'lucide-react';
import type { ComponentType } from 'react';

export interface NavItem {
  name: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  /** If set, only show for these roles */
  roles?: string[];
  /**
   * CSS gradient string for active icon bg.
   * Uses only semantic colors — no raw hex.
   */
  gradient: string;
}

export const NAVIGATION: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    gradient: 'linear-gradient(135deg,var(--primary),var(--accent))',
  },
  {
    name: 'Bookings',
    href: '/bookings',
    icon: Calendar,
    gradient: 'linear-gradient(135deg,var(--info),var(--primary))',
  },
  {
    name: 'Customers',
    href: '/customers',
    icon: Users,
    gradient: 'linear-gradient(135deg,var(--info),var(--primary))',
  },
  {
    name: 'Services',
    href: '/services',
    icon: Wrench,
    gradient: 'linear-gradient(135deg,var(--warning),var(--accent))',
  },
  {
    name: 'Invoices',
    href: '/invoices',
    icon: FileText,
    gradient: 'linear-gradient(135deg,var(--success),var(--info))',
  },
  {
    name: 'Payments',
    href: '/payments',
    icon: CreditCard,
    gradient: 'linear-gradient(135deg,var(--success),var(--success-hover))',
  },
  {
    name: 'Portfolio',
    href: '/portfolio',
    icon: Image,
    gradient: 'linear-gradient(135deg,var(--danger),var(--accent))',
  },
  {
    name: 'Branding',
    href: '/branding',
    icon: Palette,
    gradient: 'linear-gradient(135deg,var(--accent),var(--primary))',
    roles: ['STUDIO_OWNER'],
  },
  {
    name: 'My Studio Page',
    href: '/my-studio',
    icon: Globe,
    gradient: 'linear-gradient(135deg,var(--primary),var(--accent))',
    roles: ['STUDIO_OWNER'],
  },
  {
    name: 'Share Links',
    href: '/share-links',
    icon: Share2,
    gradient: 'linear-gradient(135deg,var(--info),var(--primary))',
    roles: ['STUDIO_OWNER'],
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    gradient: 'linear-gradient(135deg,var(--accent),var(--primary))',
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    gradient: 'linear-gradient(135deg,var(--foreground-tertiary),var(--foreground-secondary))',
  },
];
