'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Bell, Shield, Eye } from 'lucide-react';

export default function SettingsPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">Settings</h1>
                <p className="text-[var(--foreground-tertiary)] mt-2">Personalize your portal experience.</p>
            </div>

            <div className="space-y-6">
                <Card className="border-[var(--border)] shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Bell className="h-5 w-5 text-[var(--primary)]" />
                            <CardTitle>Notifications</CardTitle>
                        </div>
                        <CardDescription>Configure how you receive updates about your bookings.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-[var(--foreground)]">Email Notifications</p>
                                <p className="text-sm text-[var(--foreground-tertiary)]">Receive booking confirmations and invoices via email.</p>
                            </div>
                            <Switch checked />
                        </div>
                        <div className="flex items-center justify-between border-t border-[var(--border-light)] pt-6">
                            <div>
                                <p className="font-bold text-[var(--foreground)]">Marketing Updates</p>
                                <p className="text-sm text-[var(--foreground-tertiary)]">Receive news and offers from studios you've visited.</p>
                            </div>
                            <Switch />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-[var(--border)] shadow-sm">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Shield className="h-5 w-5 text-[var(--primary)]" />
                            <CardTitle>Security & Privacy</CardTitle>
                        </div>
                        <CardDescription>Manage your data and account access.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-bold text-[var(--foreground)]">Two-Factor Authentication</p>
                                <p className="text-sm text-[var(--foreground-tertiary)]">Add an extra layer of security to your universal ID.</p>
                            </div>
                            <Button variant="outline" size="sm">Enable</Button>
                        </div>
                        <div className="flex items-center justify-between border-t border-[var(--border-light)] pt-6">
                            <div>
                                <p className="font-bold text-[var(--foreground)]">Public Identity</p>
                                <p className="text-sm text-[var(--foreground-tertiary)]">Allow studios to find your profile by email for auto-fill.</p>
                            </div>
                            <Switch checked />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
