'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import axios from 'axios';
import { formatDate } from '@/lib/utils';
import { Calendar, Clock, Search } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Booking {
    id: string;
    status: string;
    scheduledAt: string;
    customerNotes?: string;
    service: {
        name: string;
        price: number;
        durationMinutes: number;
    };
    studio: {
        name: string;
        email: string;
        phone: string;
        slug: string;
        logoUrl?: string;
    };
}

export default function BookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('customer_token');
        if (token) {
            fetchBookings(token);
        } else {
            setLoading(false);
            setError('Please sign in to view your bookings.');
        }
    }, []);

    const fetchBookings = async (token: string) => {
        try {
            const response = await axios.get(`${API_URL}/portal/bookings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBookings(response.data);
        } catch (err) {
            setError('Failed to load bookings.');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' }> = {
            INQUIRY: { variant: 'default' },
            QUOTED: { variant: 'info' },
            CONFIRMED: { variant: 'success' },
            IN_PROGRESS: { variant: 'warning' },
            COMPLETED: { variant: 'secondary' },
            CANCELLED: { variant: 'danger' },
        };
        return variants[status] || variants.INQUIRY;
    };

    if (loading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>;

    if (error) {
        return (
            <Card className="border-dashed border-[var(--border)]">
                <CardContent className="text-center py-12">
                    <p className="text-[var(--foreground-tertiary)]">{error}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">My Bookings</h1>
                <Badge variant="outline" className="px-3 py-1 font-bold">
                    {bookings.length} Total
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {bookings.length === 0 ? (
                    <Card className="col-span-2 border-[var(--border)]">
                        <CardContent className="text-center py-12">
                            <Calendar className="mx-auto h-12 w-12 text-[var(--foreground-tertiary)]" />
                            <h3 className="mt-2 text-sm font-semibold text-[var(--foreground)]">No bookings</h3>
                            <p className="mt-1 text-sm text-[var(--foreground-tertiary)]">You don't have any bookings yet.</p>
                        </CardContent>
                    </Card>
                ) : (
                    bookings.map((booking) => (
                        <Card key={booking.id} className="border-[var(--border)] hover:border-[var(--primary)] transition-all shadow-sm hover:shadow-md">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-lg text-[var(--foreground)] font-bold">{booking.service.name}</CardTitle>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm text-[var(--foreground-tertiary)]">{booking.studio.name}</p>
                                            <a
                                                href={`/studio/${booking.studio.slug}`}
                                                className="text-xs text-[var(--primary)] hover:underline flex items-center"
                                            >
                                                Book Again
                                            </a>
                                        </div>
                                    </div>
                                    <Badge {...getStatusBadge(booking.status)}>{booking.status}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center text-sm text-[var(--foreground-secondary)]">
                                    <Calendar className="mr-2 h-4 w-4 text-[var(--foreground-tertiary)]" />
                                    <span>{formatDate(booking.scheduledAt)}</span>
                                </div>

                                <div className="flex items-center text-sm text-[var(--foreground-secondary)]">
                                    <Clock className="mr-2 h-4 w-4 text-[var(--foreground-tertiary)]" />
                                    <span>{booking.service.durationMinutes} minutes</span>
                                </div>

                                <div className="pt-3 border-t border-[var(--border-light)]">
                                    <p className="text-lg font-bold text-[var(--foreground)] tabular-nums">${Number(booking.service.price).toFixed(2)}</p>
                                </div>

                                {booking.customerNotes && (
                                    <div className="pt-2">
                                        <p className="text-xs text-[var(--foreground-tertiary)] uppercase tracking-wider font-semibold">Notes:</p>
                                        <p className="text-sm text-[var(--foreground-secondary)] mt-1">{booking.customerNotes}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
