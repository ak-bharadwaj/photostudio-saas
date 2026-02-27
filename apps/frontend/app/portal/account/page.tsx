'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import axios from 'axios';
import { User, Mail, Calendar, Save } from 'lucide-react';
import { useToast } from '@/components/ui/toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface UserProfile {
    id: string;
    name: string;
    email: string;
    createdAt: string;
}

export default function AccountPage() {
    const { addToast } = useToast();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '' });

    useEffect(() => {
        const token = localStorage.getItem('customer_token');
        if (token) {
            fetchProfile(token);
        } else {
            setLoading(false);
        }
    }, []);

    const fetchProfile = async (token: string) => {
        try {
            const response = await axios.get(`${API_URL}/portal/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProfile(response.data);
            setFormData({ name: response.data.name, email: response.data.email });
        } catch (err) {
            addToast('error', 'Failed to load profile.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const token = localStorage.getItem('customer_token');
            await axios.patch(`${API_URL}/portal/me`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            addToast('success', 'Profile updated successfully!');
        } catch (err) {
            addToast('error', 'Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center py-12"><LoadingSpinner /></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">Account Settings</h1>
                <p className="text-[var(--foreground-tertiary)] mt-2">Manage your universal customer identity.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 space-y-6">
                    <Card className="border-[var(--border)] overflow-hidden">
                        <div className="h-32 bg-gradient-to-br from-[var(--primary)] to-[var(--accent)]" />
                        <CardContent className="pt-0 -mt-12 flex flex-col items-center">
                            <div className="h-24 w-24 rounded-3xl bg-white shadow-xl flex items-center justify-center border-4 border-[var(--background)]">
                                <User className="h-12 w-12 text-[var(--primary)]" />
                            </div>
                            <h3 className="mt-4 font-bold text-lg text-[var(--foreground)]">{profile?.name}</h3>
                            <Badge variant="secondary" className="mt-1 font-bold">Verified Customer</Badge>
                            <div className="mt-6 w-full space-y-3 pt-6 border-t border-[var(--border)]">
                                <div className="flex items-center gap-3 text-sm text-[var(--foreground-tertiary)]">
                                    <Mail className="h-4 w-4" />
                                    {profile?.email}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-[var(--foreground-tertiary)]">
                                    <Calendar className="h-4 w-4" />
                                    Joined {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'recently'}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="md:col-span-2 space-y-6">
                    <Card className="border-[var(--border)] shadow-sm">
                        <CardHeader>
                            <CardTitle>Public Profile</CardTitle>
                            <CardDescription>This information is shared with studios when you book.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleUpdate} className="space-y-6 pt-2">
                                <Input
                                    label="Full Name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                                <Input
                                    label="Email Address"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    disabled
                                    helperText="Universal login identity cannot be changed for security."
                                />
                                <div className="pt-4 border-t border-[var(--border)]">
                                    <Button type="submit" disabled={saving} className="h-11 px-8 shadow-lg shadow-[var(--primary)]/20 min-w-[140px]">
                                        {saving ? <LoadingSpinner className="mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                                        Update Profile
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="border-[var(--border)] shadow-sm bg-red-50/30 border-dashed border-red-200">
                        <CardHeader>
                            <CardTitle className="text-red-900">Danger Zone</CardTitle>
                            <CardDescription>Permanent actions for your account.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button variant="danger" size="sm">Deactivate Account</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
