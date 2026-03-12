'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface WishlistItem {
    id: string;
    name: string;
    price: number;
    coverImage?: string;
    studio: {
        name: string;
        slug: string;
    };
}

interface WishlistContextType {
    items: WishlistItem[];
    addToWishlist: (item: WishlistItem) => void;
    removeFromWishlist: (id: string) => void;
    toggleWishlist: (item: WishlistItem) => void;
    isInWishlist: (id: string) => boolean;
    clearWishlist: () => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<WishlistItem[]>([]);

    useEffect(() => {
        const saved = localStorage.getItem('marketplace_wishlist');
        if (saved) {
            try {
                setItems(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to load wishlist', e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('marketplace_wishlist', JSON.stringify(items));
    }, [items]);

    const addToWishlist = (item: WishlistItem) => {
        setItems((prev) => {
            if (prev.some((i) => i.id === item.id)) return prev;
            return [...prev, item];
        });
    };

    const removeFromWishlist = (id: string) => {
        setItems((prev) => prev.filter((i) => i.id !== id));
    };

    const toggleWishlist = (item: WishlistItem) => {
        setItems((prev) => {
            const exists = prev.some((i) => i.id === item.id);
            if (exists) return prev.filter((i) => i.id !== item.id);
            return [...prev, item];
        });
    };

    const isInWishlist = (id: string) => items.some((item) => item.id === id);

    const clearWishlist = () => setItems([]);

    return (
        <WishlistContext.Provider
            value={{
                items,
                addToWishlist,
                removeFromWishlist,
                toggleWishlist,
                isInWishlist,
                clearWishlist,
            }}
        >
            {children}
        </WishlistContext.Provider>
    );
}

export function useWishlist() {
    const context = useContext(WishlistContext);
    if (context === undefined) {
        throw new Error('useWishlist must be used within a WishlistProvider');
    }
    return context;
}
