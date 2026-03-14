'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ChevronLeft,
    Star,
    Clock,
    ShieldCheck,
    ArrowRight,
    Camera,
    Info,
    Calendar,
    Sparkles,
    CheckCircle2,
    Heart,
    MapPin
} from 'lucide-react';
import { marketplaceApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BgMeshEngine } from '@/components/ui/bg-mesh-engine';
import { useCart } from '@/context/cart-context';
import { useWishlist } from '@/context/wishlist-context';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function ServiceDetailsPage() {
    const { id } = useParams();
    const router = useRouter();
    const [service, setService] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [relatedServices, setRelatedServices] = useState<any[]>([]);
    const { addToCart, items } = useCart();
    const { toggleWishlist, isInWishlist } = useWishlist();

    const isInCart = items.some((item) => item.id === id);

    useEffect(() => {
        let isCancelled = false;

        const fetchServiceData = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const response = await marketplaceApi.getService(id as string);
                if (isCancelled) return;

                if (response?.data) {
                    setService(response.data);

                    // Fetch related services safely
                    try {
                        const relatedResponse = await marketplaceApi.search({
                            categoryId: response.data.categoryId || undefined,
                            limit: 4
                        });
                        if (!isCancelled) {
                            setRelatedServices(relatedResponse?.data?.items?.filter((s: any) => s.id !== id) || []);
                        }
                    } catch (relErr) {
                        console.error('Failed to load related services', relErr);
                    }
                }
            } catch (err) {
                console.error('Failed to load service details', err);
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        fetchServiceData();
        return () => { isCancelled = true; };
    }, [id]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!service) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
                <h1 className="text-4xl font-black mb-4">Service Not Found</h1>
                <p className="text-foreground-tertiary mb-8">The service you're looking for doesn't exist or is no longer available.</p>
                <Button onClick={() => router.push('/')}>Back to Marketplace</Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-white">
            <BgMeshEngine />

            {/* Navigation */}
            <nav className="fixed top-0 inset-x-0 z-50 py-6 px-8 flex items-center justify-between pointer-events-none">
                <Button
                    variant="outline"
                    size="sm"
                    className="pointer-events-auto rounded-full group bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20"
                    onClick={() => router.back()}
                >
                    <ChevronLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back
                </Button>

                <Link href="/" className="pointer-events-auto flex items-center gap-2 group">
                    <div className="h-10 w-10 flex items-center justify-center p-0 group-hover:scale-105 transition-transform">
                        <Image src="/logo.png" alt="ReviewsFeedback Logo" width={40} height={40} className="object-contain" unoptimized />
                    </div>
                    <span className="text-xl font-black tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
                        REVIEWS<span className="text-primary drop-shadow-md">FEEDBACK</span>
                    </span>
                </Link>

                <div className="w-20" /> {/* Spacer */}
            </nav>

            <main className="max-w-7xl mx-auto px-6 pt-32 pb-24 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">

                    {/* Left Column: Media & Branding */}
                    <div className="lg:col-span-7 space-y-12 animate-cinematic">
                        <section className="relative aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 group bg-surface-2">
                            {service.coverImage ? (
                                <Image
                                    src={service.coverImage}
                                    alt={service.name}
                                    fill
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110"
                                    unoptimized
                                    onError={(e: any) => { e.currentTarget.src = "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=1200" }}
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                                    <Camera className="h-24 w-24 text-foreground-tertiary/20" />
                                    <p className="text-foreground-tertiary/40 text-sm font-bold uppercase tracking-widest">No cover photo</p>
                                </div>
                            )}
                            <div className="absolute inset-x-0 bottom-0 p-16 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                                <div className="flex items-center gap-4 mb-6">
                                    <Badge className="bg-primary/20 text-primary-light border-primary/30 backdrop-blur-xl py-1 px-4 rounded-full font-black tracking-widest text-[10px]">
                                        <Sparkles className="h-3 w-3 mr-2 inline" /> {service.category?.name || service.occasion || 'ELITE PROTOCOL'}
                                    </Badge>
                                    <div className="h-px w-12 bg-white/20" />
                                </div>
                                <h1 className="text-6xl lg:text-8xl font-black text-white tracking-tighter leading-[0.85] mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
                                    {service.name.toUpperCase()}
                                </h1>
                                <div className="flex items-center gap-6 text-white/60">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-primary" />
                                        <span className="text-xs font-black tracking-[0.2em] uppercase">{service.durationMinutes} MINUTES APPOINTMENT</span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Gallery: show studio portfolio thumbnails if available */}
                        {service.studio?.portfolioItems?.length > 0 && (
                            <div className="grid grid-cols-3 gap-6 stagger-children">
                                {service.studio.portfolioItems.slice(0, 3).map((item: any, i: number) => (
                                    <div key={item.id || i} className="aspect-square rounded-[1.5rem] overflow-hidden glass-ultra p-1 group cursor-pointer">
                                        {item.imageUrl ? (
                                            <div className="relative w-full h-full">
                                                <Image
                                                    src={item.imageUrl}
                                                    alt={item.title || 'Portfolio'}
                                                    fill
                                                    className="object-cover rounded-[1rem] group-hover:scale-110 transition-transform duration-1000"
                                                    unoptimized
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center rounded-[1rem] bg-surface-2">
                                                <Camera className="h-10 w-10 text-foreground-tertiary/30" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Pricing & Content */}
                    <div className="lg:col-span-5 space-y-8">
                        {/* Studio Card */}
                        <Link href={`/studio/${service.studio.slug}`} className="block group animate-cinematic" style={{ animationDelay: '200ms' }}>
                            <div className="glass-ultra p-8 rounded-[2rem] flex items-center gap-6 border-white/5 shadow-2xl group-hover:border-primary/50 transition-all duration-700">
                                <div className="h-20 w-20 relative rounded-2xl overflow-hidden bg-white border border-border group-hover:scale-110 transition-transform duration-700">
                                    {service.studio.logoUrl ? (
                                        <Image
                                            src={service.studio.logoUrl}
                                            className="w-full h-full object-cover"
                                            alt={service.studio.name}
                                            fill
                                            unoptimized
                                            onError={(e: any) => { e.currentTarget.src = "https://images.unsplash.com/photo-1554046920-90dcac824bd6?auto=format&fit=crop&w=100&q=80" }}
                                        />
                                    ) : (
                                        <div
                                            className="w-full h-full flex items-center justify-center text-white text-2xl font-black"
                                            style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
                                        >
                                            {service.studio.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2">PARTNER</p>
                                    <h3 className="text-2xl font-black tracking-tight leading-none mb-1 text-foreground">{service.studio.name}</h3>
                                    <div className="flex items-center gap-1.5 text-gold mt-2">
                                        <Star className="fill-current h-3.5 w-3.5" />
                                        <span className="text-[11px] font-black tracking-widest uppercase opacity-60">
                                            {service.studio.avgRating || '5.0'} PREMIUM SCORE ({service.studio.reviewCount || 0} REVIEWS)
                                        </span>
                                    </div>
                                    {(service.studio.address || service.studio.city) && (
                                        <p className="flex items-center gap-1.5 text-[10px] text-foreground/40 mt-3 font-bold uppercase tracking-widest">
                                            <MapPin size={12} className="text-primary" />
                                            {[service.studio.address, service.studio.city, service.studio.state].filter(Boolean).join(', ')}
                                        </p>
                                    )}
                                </div>
                                <div className="h-10 w-10 rounded-full bg-primary/5 flex items-center justify-center transform group-hover:translate-x-1 transition-all">
                                    <ArrowRight className="h-4 w-4 text-primary" />
                                </div>
                            </div>
                        </Link>

                        <div className="space-y-8 animate-cinematic" style={{ animationDelay: '400ms' }}>
                            <div className="flex items-center justify-between border-b border-border/10 pb-6">
                                <div>
                                    <p className="text-[10px] font-black text-foreground-tertiary tracking-[0.3em] uppercase mb-2">PRICE</p>
                                    <h2 className="text-6xl font-black tracking-tighter tabular-nums">{formatCurrency(service.price)}</h2>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-foreground-tertiary tracking-[0.3em] uppercase mb-2">DELIVERY</p>
                                    <p className="text-xl font-black tracking-tighter">Within 48 hours</p>
                                </div>
                            </div>

                            <div className="p-10 rounded-[2.5rem] bg-foreground text-background relative overflow-hidden group shadow-2xl">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-primary/20 blur-[60px] rounded-full group-hover:bg-primary/30 transition-colors" />
                                <h4 className="text-[10px] font-black uppercase tracking-[.4em] text-white/40 mb-8 flex items-center gap-3">
                                    <ShieldCheck className="h-4 w-4" /> WHAT'S INCLUDED
                                </h4>
                                <ul className="space-y-6">
                                    {[
                                        'Professional photo editing',
                                        'High-resolution digital files delivered',
                                        'Commercial usage rights',
                                        'Priority delivery'
                                    ].map((feature, i) => (
                                        <li key={i} className="flex items-center gap-4 text-xs font-black tracking-wide uppercase">
                                            <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                                                <CheckCircle2 className="text-primary h-3.5 w-3.5" />
                                            </div>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <p className="text-lg text-foreground-tertiary leading-relaxed font-medium">
                                {service.description || "Experience a world-class professional engagement tailored to your unique vision. Our partners identify state-of-the-art solutions and masterful strategies to deliver results that matter."}
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                <Button
                                    size="lg"
                                    variant={isInCart ? "outline" : "primary"}
                                    className="rounded-2xl shadow-glow-primary font-black tracking-tight"
                                    onClick={() => {
                                        if (isInCart) {
                                            router.push(`/studio/${service.studio.slug}?service=${service.id}`);
                                        } else {
                                            addToCart(service);
                                        }
                                    }}
                                >
                                    {isInCart ? "GO TO CHECKOUT" : "ADD TO CART"}
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className={`rounded-2xl font-bold border-2 ${isInWishlist(service.id) ? 'bg-primary/5 border-primary text-primary' : ''}`}
                                    onClick={() => toggleWishlist(service)}
                                >
                                    {isInWishlist(service.id) ? 'SAVED' : 'SAVE TO WISHLIST'}
                                    <Heart className={`ml-2 h-4 w-4 ${isInWishlist(service.id) ? 'fill-current' : ''}`} />
                                </Button>
                            </div>

                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-surface-1 border border-border">
                                <Info className="text-primary h-5 w-5" />
                                <p className="text-xs font-semibold text-foreground-tertiary">
                                    This booking requires a 50% deposit to secure your date.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Testimonials Section */}
                {service.studio?.reviews && service.studio.reviews.length > 0 && (
                    <section className="mt-32">
                        <div className="mb-12 text-center lg:text-left">
                            <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2">CLIENT EXPERIENCES</p>
                            <h2 className="text-4xl font-black tracking-tight">PARTNER TESTIMONIALS</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {service.studio.reviews.map((review: any) => (
                                <div
                                    key={review.id}
                                    className="glass-ultra p-8 rounded-[1.5rem] border-white/5 shadow-xl flex flex-col"
                                >
                                    <div className="flex items-center gap-1 mb-6">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Star
                                                key={i}
                                                className={cn(
                                                    "h-3.5 w-3.5",
                                                    i < review.rating ? "fill-current text-gold" : "text-white/10"
                                                )}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-sm font-medium italic text-foreground-secondary leading-relaxed mb-8 flex-1">
                                        &quot;{review.comment}&quot;
                                    </p>
                                    <div className="flex items-center gap-4 pt-6 border-t border-white/5">
                                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-xs font-black text-primary">
                                            {(review.customer?.name || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black tracking-tight">{review.customer?.name}</p>
                                            <p className="text-[10px] font-bold text-foreground-tertiary uppercase tracking-widest mt-0.5">
                                                {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Related Section */}
                {relatedServices.length > 0 && (
                    <section className="mt-32 border-t border-border pt-24">
                        <div className="flex items-end justify-between mb-12">
                            <div>
                                <h2 className="text-4xl font-black tracking-tight mb-2">SIMILAR SERVICES</h2>
                                <p className="text-foreground-tertiary">Discover more artistic experiences that match your taste.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 stagger-children">
                            {relatedServices.map((item) => (
                                <Link
                                    key={item.id}
                                    href={`/service/${item.id}`}
                                    className="group block"
                                >
                                    <div className="avant-garde-card p-0 overflow-hidden mb-8 aspect-[4/5] bg-surface-2 border-border shadow-lg group-hover:shadow-2xl transition-all duration-700 relative">
                                        {item.coverImage ? (
                                            <img
                                                src={item.coverImage}
                                                alt={item.name}
                                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-110"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Camera className="h-16 w-16 text-foreground-tertiary/20" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />

                                        <div className="absolute bottom-8 left-8 right-8 space-y-4">
                                            <Badge className="bg-primary/20 text-white border-white/20 backdrop-blur-md py-1 px-4 rounded-full font-black tracking-widest text-[9px] uppercase">
                                                {item.studio.name}
                                            </Badge>
                                            <h4 className="text-2xl font-black text-white tracking-tighter leading-tight group-hover:text-primary transition-colors">{item.name}</h4>
                                            <div className="flex items-baseline justify-between pt-4 border-t border-white/20">
                                                <p className="text-xl font-black text-white tabular-nums">{formatCurrency(item.price)}</p>
                                                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md group-hover:bg-primary transition-colors">
                                                    <ArrowRight className="h-4 w-4 text-white" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}
            </main>

            <footer className="mt-24 py-12 border-t border-border text-center">
                <p className="text-xs font-bold text-foreground-tertiary uppercase tracking-[.3em]">ReviewsFeedback Marketplace · Editorial Standard</p>
            </footer>
        </div>
    );
}
