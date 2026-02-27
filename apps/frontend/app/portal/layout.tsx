'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    Calendar,
    FileText,
    User,
    Settings,
    LogOut,
    ChevronLeft,
    LayoutDashboard,
    Menu,
    X
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            localStorage.setItem('customer_token', token);
            const refreshToken = searchParams.get('refreshToken');
            if (refreshToken) localStorage.setItem('customer_refresh_token', refreshToken);

            const newUrl = pathname;
            window.history.replaceState({}, '', newUrl);
            setIsAuthenticated(true);
        } else {
            const storedToken = localStorage.getItem('customer_token');
            if (storedToken) {
                setIsAuthenticated(true);
            } else if (pathname !== '/portal' && !pathname.startsWith('/portal/')) {
                // Not in portal, let it be
            } else if (pathname === '/portal' && !searchParams.has('phone')) {
                // Allow /portal root for login
            }
        }
    }, [searchParams, pathname]);

    const handleLogout = () => {
        localStorage.removeItem('customer_token');
        localStorage.removeItem('customer_refresh_token');
        setIsAuthenticated(false);
        router.push('/portal');
    };

    const navItems = [
        { name: 'Overview', href: '/portal', icon: LayoutDashboard },
        { name: 'My Bookings', href: '/portal/bookings', icon: Calendar },
        { name: 'Invoices', href: '/portal/invoices', icon: FileText },
        { name: 'Account', href: '/portal/account', icon: User },
        { name: 'Settings', href: '/portal/settings', icon: Settings },
    ];

    if (!isAuthenticated && pathname !== '/portal') {
        // If not authenticated and trying to access a sub-page, we might want to redirect
        // But let the individual pages handle their auth check or show login card
    }

    return (
        <div className="min-h-screen bg-[var(--background-secondary)] flex">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 bg-[var(--background)] border-r border-[var(--border)] transition-transform duration-300 lg:static lg:translate-x-0",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="h-full flex flex-col">
                    <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
                        <span className="text-xl font-bold text-[var(--foreground)] tracking-tighter">STUDIO PORTAL</span>
                        <Button variant="ghost" size="sm" className="lg:hidden h-8 w-8 p-0" onClick={() => setIsSidebarOpen(false)}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    <nav className="flex-1 p-4 space-y-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                                        isActive
                                            ? "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20"
                                            : "text-[var(--foreground-secondary)] hover:bg-[var(--surface-0)] hover:text-[var(--foreground)]"
                                    )}
                                    onClick={() => setIsSidebarOpen(false)}
                                >
                                    <item.icon className="h-5 w-5" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="p-4 border-t border-[var(--border)]">
                        <Button
                            variant="ghost"
                            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={handleLogout}
                        >
                            <LogOut className="mr-3 h-5 w-5" />
                            Logout
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-16 bg-[var(--background)] border-b border-[var(--border)] flex items-center justify-between px-4 lg:px-8">
                    <Button variant="ghost" size="sm" className="lg:hidden h-8 w-8 p-0" onClick={() => setIsSidebarOpen(true)}>
                        <Menu className="h-5 w-5" />
                    </Button>
                    <div className="flex-1 lg:hidden text-center font-bold text-[var(--foreground)]">STUDIO PORTAL</div>
                    <div className="hidden lg:block text-sm text-[var(--foreground-tertiary)] italic">Universal Access</div>
                    <div className="flex items-center gap-4">
                        <div className="h-8 w-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-[var(--primary)]" />
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-4 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
