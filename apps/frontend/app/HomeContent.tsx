'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    Menu,
    X,
    Heart,
    Star,
    MapPin,
    ArrowUpRight,
    Instagram,
    Twitter,
    Globe,
    MessageSquare,
    CheckCircle
} from 'lucide-react';
import { marketplaceApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/context/cart-context';
import { useWishlist } from '@/context/wishlist-context';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';

/* ─── Navbar ─────────────────────────────────────────────────────────────── */
const Navbar = () => {
    const router = useRouter();
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);

    const [authUser, setAuthUser] = useState<any>(null);

    useEffect(() => {
        setHasMounted(true);
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);

        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        if (token) {
            import('@/lib/api').then(({ authApi }) => {
                authApi.me().then((res: any) => {
                    setAuthUser(res.data.user || res.data);
                }).catch(() => {
                    localStorage.removeItem('accessToken');
                });
            });
        }

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    if (!hasMounted) return (
        <nav className="fixed top-0 inset-x-0 z-50 py-5 bg-transparent">
            <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 bg-foreground flex items-center justify-center flex-shrink-0">
                        <MessageSquare size={14} className="text-background" />
                    </div>
                    <span className="text-sm font-black tracking-[0.15em] text-foreground" style={{ fontFamily: 'var(--font-serif)' }}>ReviewsFeedback</span>
                </div>
            </div>
        </nav>
    );

    return (
        <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? 'bg-background/80 backdrop-blur-2xl py-4 border-b border-border/50 shadow-2xl' : 'bg-transparent py-6'}`}>
            <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2.5 group">
                    <div className="h-10 w-10 flex items-center justify-center flex-shrink-0">
                        <Image src="/logo.png" alt="Logo" width={40} height={40} className="object-contain" unoptimized />
                    </div>
                    <span className="text-sm font-black tracking-[0.15em] text-foreground group-hover:text-amber-400 transition-colors duration-300" style={{ fontFamily: 'var(--font-serif)' }}>ReviewsFeedback</span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-8">
                    {[
                        { name: 'Partners', id: 'studios' },
                        { name: 'Explore', id: 'discover' },
                        { name: 'How it works', id: 'how-it-works' },
                    ].map((item) => (
                        <Link
                            key={item.name}
                            href={`/#${item.id}`}
                            className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/50 hover:text-foreground transition-colors"
                        >
                            {item.name}
                        </Link>
                    ))}
                    <div className="h-4 w-px bg-foreground/10 mx-1" />
                    <ThemeToggle />
                    <div className="flex items-center gap-3">
                        {authUser ? (
                            <div className="flex items-center gap-6">
                                <div className="hidden lg:flex items-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40">
                                    <Link href="/portal/bookings" className="hover:text-foreground transition-colors">My Bookings</Link>
                                    <Link href="/portal/invoices" className="hover:text-foreground transition-colors">Statements</Link>
                                </div>
                                <div className="h-4 w-px bg-foreground/10 hidden lg:block" />
                                <div className="flex items-center gap-3">
                                    <div 
                                        onClick={() => router.push('/portal')}
                                        className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center text-[11px] font-black cursor-pointer hover:bg-amber-400 transition-all shadow-lg"
                                        title={`Account: ${authUser.name}`}
                                    >
                                        {authUser.name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <button 
                                        onClick={() => {
                                            localStorage.removeItem('accessToken');
                                            localStorage.removeItem('refreshToken');
                                            window.location.reload();
                                        }}
                                        className="text-[9px] font-black uppercase tracking-widest text-foreground/30 hover:text-red-500 transition-colors"
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <Button
                                    onClick={() => router.push(`/portal/login?mode=customer&returnTo=${encodeURIComponent(window.location.pathname)}`)}
                                    variant="ghost"
                                    className="text-[10px] font-bold uppercase tracking-widest px-4 h-10 border border-foreground/10 text-foreground/70 hover:bg-foreground/5 hover:text-foreground rounded-none"
                                >
                                    Login
                                </Button>
                                <Button
                                    onClick={() => router.push('/login')}
                                    className="text-[10px] font-bold uppercase tracking-widest rounded-none bg-foreground text-background hover:bg-amber-50 px-5 h-10 transition-all"
                                >
                                    Partner Access
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                {/* Mobile */}
                <div className="md:hidden flex items-center gap-4">
                    <ThemeToggle />
                    <button
                        className="text-foreground p-1 hover:text-amber-400 transition-colors"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Overlay Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-40 bg-background/95 backdrop-blur-xl flex flex-col px-8 pt-28 pb-12">
                    <button
                        className="absolute top-6 right-6 p-2 text-foreground/50 hover:text-foreground"
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        <X size={28} />
                    </button>
                    <nav className="flex flex-col gap-6">
                        {[
                            { name: 'Partners', id: 'studios' },
                            { name: 'Explore', id: 'discover' },
                            { name: 'How it works', id: 'how-it-works' },
                        ].map((item) => (
                            <Link
                                key={item.name}
                                href={`/#${item.id}`}
                                className="text-3xl font-light tracking-tight text-foreground border-b border-foreground/5 pb-4 hover:text-amber-500 transition-colors"
                                style={{ fontFamily: 'var(--font-serif)' }}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </nav>
                    <div className="mt-auto flex flex-col gap-4">
                        {authUser ? (
                            <div className="flex flex-col gap-4 border-t border-foreground/10 pt-8">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="h-14 w-14 rounded-full bg-foreground text-background flex items-center justify-center text-xl font-black shadow-xl">
                                        {authUser.name?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-black uppercase tracking-widest text-foreground">{authUser.name}</p>
                                        <p className="text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Logged In Account</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <Link 
                                        href="/portal/bookings" 
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center justify-center h-12 bg-foreground/5 text-[10px] font-black uppercase tracking-widest text-foreground rounded-xl"
                                    >
                                        My Bookings
                                    </Link>
                                    <Link 
                                        href="/portal/invoices" 
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="flex items-center justify-center h-12 bg-foreground/5 text-[10px] font-black uppercase tracking-widest text-foreground rounded-xl"
                                    >
                                        Statements
                                    </Link>
                                </div>
                                <Button
                                    onClick={() => { router.push('/portal'); setMobileMenuOpen(false); }}
                                    className="w-full h-14 text-xs font-bold uppercase tracking-widest rounded-xl bg-foreground text-background"
                                >
                                    Dashboard
                                </Button>
                                <button 
                                    onClick={() => {
                                        localStorage.removeItem('accessToken');
                                        localStorage.removeItem('refreshToken');
                                        window.location.reload();
                                    }}
                                    className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500/60 mt-2"
                                >
                                    Sign Out of Account
                                </button>
                            </div>
                        ) : (
                            <>
                                <Button
                                    onClick={() => { router.push('/portal/login'); setMobileMenuOpen(false); }}
                                    className="w-full h-14 text-xs font-bold uppercase tracking-widest rounded-xl bg-foreground text-background"
                                >
                                    Sign In
                                </Button>
                                <Button
                                    onClick={() => { router.push('/portal/register'); setMobileMenuOpen(false); }}
                                    variant="outline"
                                    className="w-full h-14 text-xs font-bold uppercase tracking-widest rounded-xl border-foreground/20 text-foreground hover:bg-foreground/5"
                                >
                                    Create Membership
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

/* ─── Hero ────────────────────────────────────────────────────────────────── */
const Hero = () => {
    const router = useRouter();
    const [location, setLocation] = useState('');
    const [category, setCategory] = useState('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (location) params.append('location', location);
        if (category) params.append('q', category);
        router.push(`/explore?${params.toString()}`);
    };

    return (
        <section className="relative min-h-[90vh] flex flex-col items-center justify-center pt-28 pb-12 sm:pt-36 sm:pb-24 overflow-hidden bg-background text-foreground">
            {/* Cinematic Edge-to-Edge Background */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=85&w=2000"
                    alt="High-end business cinematic background"
                    fill
                    className="object-cover opacity-60"
                    priority
                    unoptimized
                    onError={(e: any) => {
                        e.target.src = "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&q=80&w=2000";
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/40 to-background/90" />
                {/* Purple/Gold Accents */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />
            </div>

            <div className="relative z-20 max-w-5xl mx-auto px-5 w-full text-center flex flex-col items-center">
                <p className="text-[10px] sm:text-[12px] font-bold uppercase tracking-[0.4em] text-foreground/60 mb-6 animate-luxury-in">
                    The Modern Enterprise Feedback Platform
                </p>

                <h1 className="text-[clamp(2.5rem,6vw,5.5rem)] font-light leading-[1.05] tracking-tight mb-8 animate-luxury-in max-w-4xl" style={{ fontFamily: 'var(--font-serif)' }}>
                    Collect and manage <br className="hidden sm:block" />
                    the world&apos;s <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500">elite</span> feedback.
                </h1>

                {/* Glassmorphism Search Bar */}
                <form onSubmit={handleSearch} className="w-full max-w-3xl mt-8 p-2 sm:p-3 bg-foreground/10 backdrop-blur-xl border border-foreground/20 rounded-2xl flex flex-col sm:flex-row gap-3 shadow-2xl animate-luxury-in delay-200">
                    <div className="flex-1 flex items-center bg-background/20 rounded-xl px-4 py-3 border border-foreground/5">
                        <MapPin size={18} className="text-foreground/50 mr-3" />
                        <input 
                            type="text" 
                            placeholder="Location (e.g., Kurnool)" 
                            className="bg-transparent border-none outline-none text-foreground placeholder:text-foreground/50 w-full text-sm font-medium"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            suppressHydrationWarning
                        />
                    </div>
                    <div className="flex-1 flex items-center bg-background/20 rounded-xl px-4 py-3 border border-foreground/5">
                        <MessageSquare size={18} className="text-foreground/50 mr-3" />
                        <input 
                            type="text" 
                            placeholder="Service (e.g., Wedding, Professional)" 
                            className="bg-transparent border-none outline-none text-foreground placeholder:text-foreground/50 w-full text-sm font-medium"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            suppressHydrationWarning
                        />
                    </div>
                    <Button type="submit" className="h-[52px] px-8 bg-foreground text-background hover:bg-amber-50 transition-all text-xs font-bold uppercase tracking-widest rounded-xl whitespace-nowrap">
                        Search
                    </Button>
                </form>

                <div className="flex flex-wrap items-center justify-center gap-6 mt-12 animate-luxury-in delay-300">
                    {[
                      { icon: CheckCircle, text: 'Vetted Businesses' },
                      { icon: CheckCircle, text: 'Instant Insight Delivery' },
                      { icon: CheckCircle, text: 'Transparent Outcomes' }
                    ].map(({ icon: Icon, text }) => (
                      <span key={text} className="flex items-center gap-2 text-[10px] sm:text-xs text-foreground/70 font-bold uppercase tracking-widest">
                        <Icon size={14} className="text-amber-400/80" />
                        {text}
                      </span>
                    ))}
                </div>
            </div>

            {/* Scroll Indicator Removed for cleaner UI */}
        </section>
    );
};

/* ─── How It Works ────────────────────────────────────────────────────────── */
const HowItWorks = () => {
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) entry.target.classList.add('active');
            });
        }, { threshold: 0.1 });
        document.querySelectorAll('.reveal, .reveal-up').forEach(el => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    return (
        <section id="how-it-works" className="py-20 sm:py-32 bg-background-alt text-foreground reveal border-y border-foreground/5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-foreground/20 mb-4">Simple Process</p>
            <h2 className="text-3xl sm:text-5xl font-light tracking-tight mb-12 sm:mb-16" style={{ fontFamily: 'var(--font-serif)' }}>
                How it works
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-16">
                {[
                    { num: '01', title: 'Find Partners', desc: 'Identify businesses and services that align with your growth objectives.' },
                    { num: '02', title: 'Engage Today', desc: 'Book consultations or services, and initiate the feedback protocol instantly.' },
                    { num: '03', title: 'Collect & Thrive', desc: 'Execute the project and receive detailed feedback and review analytics.' },
                ].map(step => (
                    <div key={step.num} className="flex flex-col gap-4 border-t border-foreground/10 pt-8">
                        <span className="text-xs font-bold tracking-[0.3em] text-foreground/30">{step.num}</span>
                        <h3 className="text-xl font-medium tracking-tight">{step.title}</h3>
                        <p className="text-sm text-foreground/40 leading-relaxed">{step.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    </section>
);
};

/* ─── Landing Page ─────────────────────────────────────────────────────────── */
export default function HomeContent({ initialData }: { initialData?: any }) {
    const [categories, setCategories] = useState<any[]>(initialData?.categories || []);
    const [trendingServices, setTrendingServices] = useState<any[]>(initialData?.trendingServices || []);
    const [featuredPartners, setFeaturedPartners] = useState<any[]>(initialData?.featuredPartners || []);
    const [reviews, setReviews] = useState<any[]>(initialData?.reviews || []);
    const [isLoading, setIsLoading] = useState(!initialData);
    const { addToCart, items } = useCart();
    const { toggleWishlist, isInWishlist } = useWishlist();
    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            if (initialData) {
                setIsLoading(false);
                return;
            }
            try {
                const [cats, trending, studios, revs] = await Promise.all([
                    marketplaceApi.getCategories(),
                    marketplaceApi.search({ uniquePerStudio: true, limit: 6 }),
                    marketplaceApi.getStudios({ isRecommended: true, limit: 4 }),
                    marketplaceApi.getReviews(3)
                ]);
                setCategories(cats.data);
                setTrendingServices(trending.data.items || []);
                setFeaturedPartners(Array.isArray(studios.data) ? studios.data : (studios.data.items || []));
                setReviews(revs.data || []);
            } catch (err) {
                console.error('Failed to load marketplace data', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [initialData]);

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-amber-500/30 selection:text-foreground">
            <Navbar />
            <main>
                <Hero />
                <HowItWorks />

                {/* ── Categories ─────────────────────────────────────────── */}
                <section id="categories" className="py-20 sm:py-32 bg-background border-t border-foreground/5 relative overflow-hidden reveal-up">
                    {/* Abstract Accents */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />
                    
                    <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12 sm:mb-16">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-foreground/40 mb-3 flex items-center gap-3">
                                    <span className="w-8 h-[1px] bg-amber-500/50"></span>
                                    Find Your Style
                                </p>
                                <h2 className="text-4xl sm:text-6xl font-light tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
                                    Search <span className="italic">Categories</span>
                                </h2>
                            </div>
                            <Button onClick={() => router.push('/explore')} variant="outline" className="self-start sm:self-auto text-xs font-bold uppercase tracking-widest rounded-full border-foreground/20 text-foreground hover:border-foreground hover:bg-foreground/5 h-12 px-8 transition-all">
                                View All Categories
                            </Button>
                        </div>

                        {categories.length > 0 ? (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                                {categories.slice(0, 4).map((cat) => (
                                    <Link
                                        key={cat.id}
                                        href={`/explore?category=${cat.id}`}
                                        className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-white/5"
                                    >
                                        <Image
                                            src={cat.imageUrl || "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&q=80&w=600"}
                                            fill
                                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                                            className="object-cover group-hover:scale-110 transition-all duration-1000 ease-out opacity-80 group-hover:opacity-100"
                                            alt={cat.name}
                                            unoptimized={!!(!cat.imageUrl || (cat.imageUrl && (cat.imageUrl.includes('unsplash.com') || cat.imageUrl.includes('cloudinary.com'))))}
                                            onError={(e: any) => {
                                                e.target.src = "https://images.unsplash.com/photo-1533158326339-7f3cf2404354?auto=format&fit=crop&q=80&w=600";
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />
                                        <div className="absolute bottom-0 left-0 right-0 p-6 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                                            <h3 className="text-white text-xl sm:text-2xl font-light tracking-tight mb-2" style={{ fontFamily: 'var(--font-serif)' }}>{cat.name}</h3>
                                            <p className="text-white/60 text-[10px] font-semibold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                                                <span className="flex items-center gap-2 whitespace-nowrap">
                                                    Explore <ArrowUpRight size={14} className="text-amber-400" />
                                                </span>
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse" />
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* ── Popular Services ───────────────────────────────────── */}
                <section id="discover" className="py-20 sm:py-32 bg-background-alt border-t border-foreground/5 relative overflow-hidden reveal-up">
                    <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-600/5 blur-[150px] rounded-full pointer-events-none" />
                    
                    <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10">
                        <div className="mb-12 sm:mb-16">
                            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-foreground/40 mb-3 flex items-center gap-3">
                                <span className="w-8 h-[1px] bg-amber-500/50"></span>
                                Premium Packages
                            </p>
                            <h2 className="text-4xl sm:text-6xl font-light tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
                                Popular <span className="italic">Services</span>
                            </h2>
                        </div>

                        {trendingServices.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                                {trendingServices.slice(0, 6).map((service) => (
                                    <Link
                                        key={service.id}
                                        href={`/service/${service.id}`}
                                        className="group flex flex-col bg-white/[0.02] backdrop-blur-xl border border-white/5 hover:border-white/20 rounded-2xl overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-1"
                                    >
                                        <div className="aspect-[4/3] relative overflow-hidden bg-white/5">
                                            <Image
                                                src={service.coverImage || "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=800"}
                                                fill
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                className="object-cover group-hover:scale-110 transition-transform duration-1000 ease-out"
                                                alt={service.name}
                                                unoptimized={!!(!service.coverImage || (service.coverImage && (service.coverImage.includes('unsplash.com') || service.coverImage.includes('cloudinary.com'))))}
                                                onError={(e: any) => {
                                                    e.target.src = "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=800";
                                                }}
                                            />
                                            <button
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(service); }}
                                                className="absolute top-4 right-4 h-10 w-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center border border-white/20 hover:bg-white hover:text-black transition-all text-white"
                                            >
                                                <Heart className={`h-4 w-4 ${isInWishlist(service.id) ? 'fill-current text-amber-400' : ''}`} />
                                            </button>
                                            <div className="absolute bottom-4 left-4">
                                                <span className="text-[10px] font-bold uppercase tracking-widest bg-black/40 backdrop-blur-md border border-white/10 text-white px-3 py-1.5 rounded-full">
                                                    {service.category?.name || 'Service'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-6 flex flex-col flex-1">
                                            <div className="flex justify-between items-start gap-4 mb-4">
                                                <div className="min-w-0">
                                                    <h3 className="font-medium text-lg tracking-tight truncate">{service.name}</h3>
                                                    <div className="flex items-center gap-2 text-xs text-white/50 mt-1 truncate">
                                                        <span>by <span className="text-white/80">{service.studio?.name}</span></span>
                                                        {(service.studio?.address || service.studio?.city) && (
                                                            <>
                                                                <span className="opacity-30">•</span>
                                                                <span className="flex items-center gap-1">
                                                                    <MapPin size={12} />
                                                                    {[service.studio.address, service.studio.city, service.studio.state].filter(Boolean).join(', ')}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-light text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-white/50">{formatCurrency(service.price)}</p>
                                                </div>
                                            </div>
                                            <div className="mt-auto pt-4 border-t border-white/5">
                                                <Button
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); addToCart(service); }}
                                                    variant="ghost"
                                                    className="w-full justify-between px-0 text-white hover:bg-transparent hover:text-amber-400 transition-colors text-xs font-bold uppercase tracking-widest"
                                                >
                                                    {items.some(it => it.id === service.id) ? '✓ Added to Cart' : 'Engage Partner'}
                                                    <ArrowUpRight size={16} />
                                                </Button>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="flex flex-col bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden h-[400px]">
                                        <div className="aspect-[4/3] bg-white/5 animate-pulse" />
                                        <div className="p-6 flex flex-col gap-4">
                                            <div className="h-5 w-3/4 bg-white/5 animate-pulse rounded" />
                                            <div className="h-4 w-1/2 bg-white/5 animate-pulse rounded" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* ── Top Studios ────────────────────────────────────── */}
                <section id="studios" className="py-20 sm:py-32 bg-background border-t border-foreground/5 relative overflow-hidden reveal-up">
                    <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10">
                        <div className="mb-12 sm:mb-16">
                            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-foreground/40 mb-3 flex items-center gap-3">
                                <span className="w-8 h-[1px] bg-amber-500/50"></span>
                                Elite Professionals
                            </p>
                            <h2 className="text-4xl sm:text-6xl font-light tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
                                Top <span className="italic">Partners</span>
                            </h2>
                        </div>

                        {featuredPartners.length > 0 ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                                {featuredPartners.map((studio) => (
                                    <Link
                                        key={studio.id}
                                        href={`/studio/${studio.slug}`}
                                        className="group relative flex flex-col sm:flex-row gap-6 p-6 rounded-3xl bg-white/[0.02] backdrop-blur-xl border border-white/5 hover:border-white/20 hover:bg-white/[0.04] transition-all duration-500 overflow-hidden"
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                        
                                        <div className="w-full sm:w-40 sm:h-40 aspect-square sm:aspect-auto flex-shrink-0 overflow-hidden rounded-2xl bg-white/5 relative shadow-inner">
                                            <Image
                                                src={studio.logoUrl || "https://images.unsplash.com/photo-1493863641943-9b68992a8d07?auto=format&fit=crop&q=80&w=300"}
                                                fill
                                                sizes="(max-width: 640px) 100vw, 160px"
                                                className="object-cover group-hover:scale-110 transition-all duration-700"
                                                alt={studio.name}
                                                onError={(e: any) => {
                                                    e.target.src = "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=300";
                                                }}
                                            />
                                        </div>
                                        <div className="flex flex-col justify-center min-w-0 pr-4 z-10">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-[9px] uppercase tracking-widest border-none px-2 rounded-sm font-bold">
                                                    Featured
                                                </Badge>
                                                <span className="flex items-center gap-1 text-[11px] text-white/60 font-semibold">
                                                    <Star size={11} className="fill-amber-400 text-amber-400" />
                                                    {studio.avgRating?.toFixed(1) || '5.0'}
                                                </span>
                                            </div>
                                            <h3 className="text-2xl sm:text-3xl font-light tracking-tight mb-2 group-hover:text-amber-400 transition-colors" style={{ fontFamily: 'var(--font-serif)' }}>
                                                {studio.name}
                                            </h3>
                                            <p className="flex items-center gap-1.5 text-[11px] text-white/50 uppercase tracking-widest mb-4">
                                                <MapPin size={12} /> {[studio.address, studio.city, studio.state].filter(Boolean).join(', ') || 'Global Location'}
                                            </p>
                                            <p className="text-sm text-white/60 leading-relaxed line-clamp-2 font-light">
                                                {studio.description || "Professional business partner with top-tier expertise and experienced staff. Managing your reputation perfectly."}
                                            </p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-48 rounded-3xl bg-white/[0.02] border border-white/5 animate-pulse" />
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* ── Reviews ─────────────────────────────────────────────── */}
                {reviews.length > 0 && (
                    <section className="py-20 sm:py-32 bg-background-alt border-t border-foreground/5">
                        <div className="max-w-7xl mx-auto px-5 sm:px-8">
                            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-foreground/40 mb-8">Customer Reviews</p>
                            <div className="max-w-3xl">
                                <p className="text-xl sm:text-3xl font-light leading-relaxed italic mb-8" style={{ fontFamily: 'var(--font-serif)' }}>
                                    &ldquo;{reviews[0].comment}&rdquo;
                                </p>
                                <span className="text-xs font-bold uppercase tracking-widest text-foreground/50">
                                    — {reviews[0].customer?.name || 'Verified Customer'}
                                </span>
                            </div>
                        </div>
                    </section>
                )}

                {/* ── CTA Banner ──────────────────────────────────────────── */}
                <section className="py-20 sm:py-32 bg-white text-black">
                    <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-8">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-black/40 mb-4">Own a Business?</p>
                            <h2 className="text-3xl sm:text-5xl font-light tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
                                List your business and<br />
                                <span className="italic text-black/60">maximize your reputation.</span>
                            </h2>
                        </div>
                        <Button
                            onClick={() => router.push('/portal/register')}
                            className="h-12 sm:h-14 px-8 bg-black text-white hover:opacity-80 transition-all text-xs font-bold uppercase tracking-widest rounded-none whitespace-nowrap"
                        >
                            List for Free →
                        </Button>
                    </div>
                </section>
            </main>

            {/* ── Footer ──────────────────────────────────────────────────── */}
            <footer className="py-14 sm:py-20 bg-background border-t border-foreground/8">
                <div className="max-w-7xl mx-auto px-5 sm:px-8">
                    <div className="flex flex-col sm:flex-row justify-between gap-10 sm:gap-16 mb-12">
                        <div className="max-w-xs">
                            <div className="flex items-center gap-2.5 mb-3">
                                <div className="h-10 w-10 flex items-center justify-center flex-shrink-0">
                                    <Image src="/logo.png" alt="Logo" width={40} height={40} className="object-contain" unoptimized />
                                </div>
                                <h2 className="text-sm font-black tracking-[0.15em] text-foreground" style={{ fontFamily: 'var(--font-serif)' }}>ReviewsFeedback</h2>
                            </div>
                            <p className="text-xs text-foreground/40 leading-relaxed mb-5">
                                The ultimate operating system for modern business feedback and customer reviews.
                            </p>
                            <div className="flex gap-5">
                                <a href="https://www.instagram.com/reviewsfeedback?igsh=MWFkYXU3eXB6Y3Fs" target="_blank" rel="noopener noreferrer">
                                    <Instagram size={16} className="text-foreground/30 hover:text-foreground transition-colors cursor-pointer" />
                                </a>
                                <Twitter size={16} className="text-foreground/30 hover:text-foreground transition-colors cursor-pointer" />
                                <Globe size={16} className="text-foreground/30 hover:text-foreground transition-colors cursor-pointer" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-10">
                            <div className="flex flex-col gap-3">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-foreground/30 mb-1">Partner</span>
                                <Link href="/explore" className="text-xs text-foreground/60 hover:text-foreground transition-colors">Browse</Link>
                                <Link href="/portal/login" className="text-xs text-foreground/60 hover:text-foreground transition-colors">Sign In</Link>
                                <Link href="/portal/register" className="text-xs text-foreground/60 hover:text-foreground transition-colors">Register Business</Link>
                            </div>
                            <div className="flex flex-col gap-3">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-foreground/30 mb-1">Legal</span>
                                <Link href="/privacy" className="text-xs text-foreground/60 hover:text-foreground transition-colors">Privacy</Link>
                                <Link href="/terms" className="text-xs text-foreground/60 hover:text-foreground transition-colors">Terms</Link>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-8 border-t border-foreground/5 text-[10px] text-foreground/30 uppercase tracking-widest">
                        <p>© 2026 ReviewsFeedback. All rights reserved.</p>
                        <p>Empowering modern businesses.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
