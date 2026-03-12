'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
    id: string;
    name: string;
    price: number;
    coverImage?: string;
    durationMinutes: number;
    occasion?: string;
    studio: {
        id: string;
        name: string;
        slug: string;
        logoUrl?: string;
    };
    category?: {
        id: string;
        name: string;
    };
}

interface CartContextType {
    items: CartItem[];
    addToCart: (item: CartItem) => void;
    removeFromCart: (itemId: string) => void;
    clearCart: () => void;
    total: number;
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    toggleCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    // Persist to session storage (guest cart clears on tab close)
    useEffect(() => {
        const savedCart = sessionStorage.getItem('reviewsfeedback_cart');
        if (savedCart) {
            try {
                const { items: savedItems } = JSON.parse(savedCart);
                setItems(savedItems || []);
            } catch (e) {
                console.error('Failed to parse cart', e);
            }
        }
    }, []);

    useEffect(() => {
        if (items.length > 0) {
            sessionStorage.setItem('reviewsfeedback_cart', JSON.stringify({ items }));
        } else {
            sessionStorage.removeItem('reviewsfeedback_cart');
        }
    }, [items]);

    const addToCart = (newItem: CartItem) => {
        setItems((prev) => {
            const exists = prev.find((item) => item.id === newItem.id);
            if (exists) return prev;
            return [...prev, newItem];
        });
        setIsOpen(true);
    };

    const removeFromCart = (itemId: string) => {
        setItems((prev) => prev.filter((item) => item.id !== itemId));
    };

    const clearCart = () => {
        setItems([]);
    };

    const total = items.reduce((acc, item) => acc + item.price, 0);

    const toggleCart = () => setIsOpen(!isOpen);

    return (
        <CartContext.Provider
            value={{
                items,
                addToCart,
                removeFromCart,
                clearCart,
                total,
                isOpen,
                setIsOpen,
                toggleCart,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}
