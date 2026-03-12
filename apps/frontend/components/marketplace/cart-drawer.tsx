'use client';

import React from 'react';
import { useCart } from '@/context/cart-context';
import { Button } from '@/components/ui/button';
import { X, ShoppingBag, Trash2, ArrowRight, Camera } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import Link from 'next/link';

import { useRouter } from 'next/navigation';

export function CartDrawer() {
    const { items, removeFromCart, isOpen, setIsOpen, total, clearCart } = useCart();
    const router = useRouter();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={() => setIsOpen(false)}
            />

            {/* Drawer */}
            <div className="relative w-full max-w-md bg-background h-screen shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-6 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-glow-primary">
                            <ShoppingBag className="text-white h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight">Your Cart</h2>
                            <p className="text-[10px] font-bold text-foreground-tertiary uppercase tracking-widest">
                                {items.length} {items.length === 1 ? 'Session' : 'Sessions'} Selected
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 hover:bg-surface-2 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Items List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {items.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                            <div className="h-20 w-20 rounded-full bg-surface-2 flex items-center justify-center">
                                <ShoppingBag className="h-10 w-10 text-foreground-tertiary" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Your cart is empty</h3>
                                <p className="text-sm text-foreground-tertiary">Explore the mall and find your perfect session.</p>
                            </div>
                            <Button variant="outline" onClick={() => setIsOpen(false)}>Continue Browsing</Button>
                        </div>
                    ) : (
                        items.map((item) => (
                            <div key={item.id} className="group flex gap-4 p-4 rounded-2xl glass-luxury border-white/20 hover:border-primary/30 transition-all shadow-shadow-sm">
                                <div className="h-24 w-20 rounded-xl overflow-hidden shrink-0 border border-border bg-surface-2 flex items-center justify-center relative">
                                    {item.coverImage ? (
                                        <img
                                            src={item.coverImage}
                                            className="absolute inset-0 h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            alt={item.name}
                                        />
                                    ) : (
                                        <Camera className="h-6 w-6 text-foreground-tertiary opacity-50" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between mb-1">
                                        <div>
                                            <h4 className="font-black text-sm truncate">{item.name}</h4>
                                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{item.studio.name}</p>
                                        </div>
                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="text-foreground-tertiary hover:text-danger transition-colors p-1"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between mt-4">
                                        <span className="font-black text-primary">{formatCurrency(item.price)}</span>
                                        <Link
                                            href={`/studio/${item.studio.slug}?service=${item.id}`}
                                            className="text-[10px] font-bold text-foreground-tertiary hover:text-primary flex items-center gap-1 transition-all"
                                            onClick={() => setIsOpen(false)}
                                        >
                                            SCHEDULE <ArrowRight className="h-3 w-3" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                    <div className="p-6 border-t border-border bg-surface-1 space-y-4">
                        <div className="flex items-center justify-between font-black text-xl">
                            <span>Total Investment</span>
                            <span className="text-primary">{formatCurrency(total)}</span>
                        </div>
                        <p className="text-[10px] font-bold text-foreground-tertiary uppercase tracking-widest text-center">
                            Note: Each studio handles their own scheduling and payments.
                        </p>
                        <div className="grid grid-cols-1 gap-3">
                            {/* In a real marketplace, we might have a unified checkout, 
                                but here we route to each studio's storefront to handle booking slots. */}
                            <Button
                                variant="primary"
                                size="lg"
                                className="w-full rounded-2xl shadow-glow-primary font-black"
                                onClick={() => {
                                    const firstItem = items[0];
                                    if (firstItem) {
                                        setIsOpen(false);
                                        router.push(`/studio/${firstItem.studio.slug}?service=${firstItem.id}`);
                                    }
                                }}
                            >
                                PROCEED TO BOOKING
                            </Button>
                            <button
                                onClick={clearCart}
                                className="text-[10px] font-bold text-foreground-tertiary hover:text-danger uppercase tracking-[.2em] transition-colors"
                            >
                                Clear All Sessions
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export function CartTrigger() {
    const [mounted, setMounted] = React.useState(false);
    const { items, toggleCart } = useCart();

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || items.length === 0) return null;

    return (
        <button
            onClick={toggleCart}
            className="fixed bottom-8 right-8 z-[90] h-16 w-16 rounded-2xl bg-primary shadow-expensive flex items-center justify-center animate-bounce-slow group hover:scale-110 active:scale-95 transition-all grain-overlay"
        >
            <div className="relative">
                <ShoppingBag className="text-white h-7 w-7" />
                <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white text-primary text-[10px] font-black flex items-center justify-center shadow-lg border-2 border-primary">
                    {items.length}
                </span>
            </div>
        </button>
    );
}
