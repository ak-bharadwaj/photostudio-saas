'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    Search,
    Building2,
    MapPin,
    Plus,
    Heart,
    ChevronDown,
    Star,
    ArrowRight,
    X,
} from 'lucide-react';
import { marketplaceApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useCart } from '@/context/cart-context';
import { useWishlist } from '@/context/wishlist-context';
import Image from 'next/image';

function ExploreContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialQuery = searchParams.get('q') || '';
    const initialCategory = searchParams.get('category') || '';

    const [query, setQuery] = useState(initialQuery);
    const [selectedCategory, setSelectedCategory] = useState(initialCategory);
    const [selectedLocation, setSelectedLocation] = useState(searchParams.get('location') || '');
    const { addToCart } = useCart();
    const { toggleWishlist, isInWishlist } = useWishlist();
    const [categories, setCategories] = useState<any[]>([]);
    const [locations, setLocations] = useState<string[]>([]);
    const [results, setResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCatMenu, setShowCatMenu] = useState(false);
    const [showLocMenu, setShowLocMenu] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const [catsRes, locsRes] = await Promise.all([
                    marketplaceApi.getCategories(),
                    marketplaceApi.getLocations(),
                ]);
                setCategories(catsRes.data);
                setLocations(locsRes.data || []);
            } catch (err) {
                console.error('Failed to load filters', err);
            }
        };
        load();
    }, []);

    useEffect(() => {
        const fetchResults = async () => {
            setIsLoading(true);
            try {
                const res = await marketplaceApi.search({
                    q: query || undefined,
                    categoryId: selectedCategory || undefined,
                    location: selectedLocation || undefined,
                    limit: 24,
                });
                setResults(res.data.items);
            } catch (err) {
                console.error('Search failed', err);
            } finally {
                setIsLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchResults, 300);
        return () => clearTimeout(timeoutId);
    }, [query, selectedCategory, selectedLocation]);

    const activeFiltersCount = [selectedCategory, selectedLocation].filter(Boolean).length;

    const clearFilters = () => {
        setSelectedCategory('');
        setSelectedLocation('');
        setQuery('');
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* Header */}
            <header className="glass-ultra sticky top-0 z-50 py-5 px-6 sm:px-10 border-b border-white/10 backdrop-blur-xl">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-6">
                    <Link href="/" className="flex items-center gap-3 group shrink-0">
                        <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center shadow-glow-primary group-hover:scale-110 transition-transform">
                            <Building2 className="text-white h-4 w-4" />
                        </div>
                        <span className="text-lg font-black tracking-tighter hidden sm:inline" style={{ fontFamily: 'var(--font-serif)' }}>
                            ReviewsFeedback
                        </span>
                    </Link>

                    {/* Search bar */}
                    <div className="flex-1 max-w-2xl relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40 h-4 w-4" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search partners, services, or outcomes..."
                            className="w-full bg-foreground/10 border border-foreground/20 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-foreground/50 text-foreground font-medium"
                        />
                    </div>

                    <div className="hidden lg:flex items-center gap-4 shrink-0">
                        <Link href="/login" className="text-xs font-bold text-foreground/40 uppercase tracking-widest hover:text-foreground transition-colors">Login</Link>
                        <Button onClick={() => router.push('/portal/register')} className="h-10 px-6 rounded-xl text-[10px] font-black tracking-widest uppercase bg-foreground text-background hover:opacity-80">
                            List Your Business
                        </Button>
                    </div>
                </div>

                {/* Filter Row */}
                <div className="max-w-[1400px] mx-auto mt-4 flex items-center gap-3 flex-wrap">
                    {/* Category filter */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowCatMenu(!showCatMenu); setShowLocMenu(false); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${selectedCategory ? 'bg-primary text-background border-primary shadow-glow-primary' : 'bg-foreground/5 border-foreground/15 text-foreground/70 hover:border-foreground/40 hover:text-foreground'}`}
                        >
                            <span>{selectedCategory ? (categories.find(c => c.id === selectedCategory)?.name || 'Category') : 'All Services'}</span>
                            <ChevronDown className="h-3 w-3" />
                        </button>
                        {showCatMenu && (
                            <div className="absolute top-full left-0 mt-2 min-w-[180px] bg-background border border-foreground/10 rounded-xl shadow-xl z-50 py-2 max-h-60 overflow-auto">
                                <button
                                    onClick={() => { setSelectedCategory(''); setShowCatMenu(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-foreground/5 transition-colors ${!selectedCategory ? 'text-primary' : 'text-foreground/60'}`}
                                >
                                    All Services
                                </button>
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => { setSelectedCategory(cat.id); setShowCatMenu(false); }}
                                        className={`w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-foreground/5 transition-colors ${selectedCategory === cat.id ? 'text-primary' : 'text-foreground/60'}`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Location filter */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowLocMenu(!showLocMenu); setShowCatMenu(false); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${selectedLocation ? 'bg-primary text-background border-primary shadow-glow-primary' : 'bg-foreground/5 border-foreground/15 text-foreground/70 hover:border-foreground/40 hover:text-foreground'}`}
                        >
                            <MapPin className="h-3 w-3" />
                            <span>{selectedLocation || 'All Locations'}</span>
                            <ChevronDown className="h-3 w-3" />
                        </button>
                        {showLocMenu && (
                            <div className="absolute top-full left-0 mt-2 min-w-[180px] bg-background border border-foreground/10 rounded-xl shadow-xl z-50 py-2 max-h-60 overflow-auto">
                                <button
                                    onClick={() => { setSelectedLocation(''); setShowLocMenu(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-foreground/5 transition-colors ${!selectedLocation ? 'text-primary' : 'text-foreground/60'}`}
                                >
                                    All Locations
                                </button>
                                {locations.map(loc => (
                                    <button
                                        key={loc}
                                        onClick={() => { setSelectedLocation(loc); setShowLocMenu(false); }}
                                        className={`w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-foreground/5 transition-colors ${selectedLocation === loc ? 'text-primary' : 'text-foreground/60'}`}
                                    >
                                        {loc}
                                    </button>
                                ))}
                                {locations.length === 0 && (
                                    <p className="px-4 py-2.5 text-xs text-foreground/30">No locations available</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Active filters clear */}
                    {activeFiltersCount > 0 && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-foreground/60 hover:text-foreground transition-colors bg-foreground/5 hover:bg-foreground/10"
                        >
                            <X className="h-3 w-3" /> Clear filters
                        </button>
                    )}
                </div>
            </header>

            {/* Click outside to close dropdowns */}
            {(showCatMenu || showLocMenu) && (
                <div className="fixed inset-0 z-40" onClick={() => { setShowCatMenu(false); setShowLocMenu(false); }} />
            )}

            <div className="max-w-[1400px] mx-auto px-6 sm:px-10 pt-10">
                {/* Results header */}
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/60 mb-2">
                            {isLoading ? 'Searching...' : `${results.length} results`}
                            {selectedLocation && ` in ${selectedLocation}`}
                        </p>
                        <h2 className="text-2xl sm:text-3xl font-light tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>
                            {query ? `Results for "${query}"` : selectedCategory ? (categories.find(c => c.id === selectedCategory)?.name || 'Services') : 'Available Services'}
                        </h2>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {isLoading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-[420px] rounded-2xl bg-foreground/5 animate-pulse" />
                        ))
                    ) : results.length > 0 ? (
                        results.map((service) => (
                            <Link
                                key={service.id}
                                href={`/service/${service.id}`}
                                className="group flex flex-col border border-foreground/8 hover:border-foreground/20 transition-all duration-300 rounded-xl overflow-hidden"
                            >
                                <div className="relative h-64 overflow-hidden bg-foreground/5">
                                    {service.coverImage ? (
                                        <Image
                                            src={service.coverImage}
                                            fill
                                            className="object-cover transform transition-transform duration-700 group-hover:scale-105"
                                            alt={service.name}
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center bg-foreground/5">
                                            <Building2 className="h-16 w-16 text-foreground/10" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                                    <div className="absolute top-4 left-4">
                                        <Badge className="bg-black/40 backdrop-blur-sm text-white border-white/10 text-[9px] font-bold tracking-widest uppercase">
                                            {service.category?.name || 'Enterprise'}
                                        </Badge>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            toggleWishlist(service);
                                        }}
                                        className={`absolute top-4 right-4 h-9 w-9 rounded-lg flex items-center justify-center backdrop-blur-sm transition-all ${isInWishlist(service.id)
                                            ? 'bg-primary text-white'
                                            : 'bg-black/30 text-white hover:bg-black/50'}`}
                                    >
                                        <Heart className={`h-4 w-4 ${isInWishlist(service.id) ? 'fill-current' : ''}`} />
                                    </button>

                                    {/* Studio info overlay */}
                                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full border border-white/20 overflow-hidden shrink-0 relative">
                                                {service.studio.logoUrl ? (
                                                    <Image src={service.studio.logoUrl} fill className="object-cover" alt={service.studio.name} />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-primary text-white text-xs font-black">
                                                        {service.studio.name.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-white leading-none">{service.studio.name}</p>
                                                {(service.studio.address || service.studio.city) && (
                                                    <p className="flex items-center gap-0.5 text-[9px] text-white/60 mt-0.5">
                                                        <MapPin size={8} /> 
                                                        {[service.studio.address, service.studio.city, service.studio.state].filter(Boolean).join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {service.studio.avgRating > 0 && (
                                            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm text-yellow-400 px-2 py-1 rounded-lg text-[10px] font-bold">
                                                <Star className="h-3 w-3 fill-current" />
                                                {service.studio.avgRating.toFixed(1)}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-5 flex flex-col flex-1">
                                    <h3 className="font-semibold tracking-tight mb-1.5 group-hover:text-primary transition-colors leading-tight">
                                        {service.name}
                                    </h3>
                                    <p className="text-xs text-foreground/40 line-clamp-2 leading-relaxed flex-1 mb-4">
                                        {service.description}
                                    </p>

                                    <div className="flex items-center justify-between pt-4 border-t border-foreground/8">
                                        <span className="text-lg font-bold tracking-tight">{formatCurrency(service.price)}</span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    addToCart(service);
                                                }}
                                                className="h-9 w-9 rounded-lg bg-foreground/5 text-foreground flex items-center justify-center hover:bg-foreground hover:text-background transition-all"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </button>
                                            <div className="h-9 px-4 rounded-lg bg-foreground text-background flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
                                                <span>View</span>
                                                <ArrowRight className="h-3 w-3" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="col-span-full py-24 text-center">
                            <div className="h-20 w-20 bg-foreground/5 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Search className="text-foreground/20 h-9 w-9" />
                            </div>
                            <h3 className="text-2xl font-light tracking-tight mb-3">No results found</h3>
                            <p className="text-sm text-foreground/40 max-w-sm mx-auto mb-8">
                                Try adjusting your filters or search term to find available services.
                            </p>
                            <Button variant="outline" className="rounded-none border-foreground/20 text-xs font-bold uppercase tracking-widest" onClick={clearFilters}>
                                Clear all filters
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ExplorePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">
            <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>}>
            <ExploreContent />
        </Suspense>
    );
}
