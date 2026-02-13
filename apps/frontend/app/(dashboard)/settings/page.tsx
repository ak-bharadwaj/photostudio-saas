'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingPage } from '@/components/ui/loading';
import { useToast } from '@/components/ui/toast';
import { studiosApi, authApi } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { Settings, Save, Building2, User } from 'lucide-react';

interface Studio {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  website?: string;
  description?: string;
  logo?: string;
  status: string;
  subscriptionTier: string;
  subscriptionExpiresAt?: string;
}

export default function SettingsPage() {
  const [studio, setStudio] = useState<Studio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToast();
  const { user } = useAuthStore();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    website: '',
    description: '',
  });

  useEffect(() => {
    loadStudio();
  }, []);

  const loadStudio = async () => {
    try {
      setIsLoading(true);
      const response = await authApi.me();
      const userData = response.data.user;
      
      if (userData.studioId) {
        const studioResponse = await studiosApi.getOne(userData.studioId);
        const studioData = studioResponse.data;
        setStudio(studioData);
        
        // Populate form
        setFormData({
          name: studioData.name || '',
          email: studioData.email || '',
          phone: studioData.phone || '',
          address: studioData.address || '',
          city: studioData.city || '',
          state: studioData.state || '',
          zipCode: studioData.zipCode || '',
          website: studioData.website || '',
          description: studioData.description || '',
        });
      }
    } catch (error) {
      console.error('Failed to load studio:', error);
      addToast('error', 'Failed to load studio settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!studio) {
      addToast('error', 'Studio not found');
      return;
    }

    // Basic validation
    if (!formData.name.trim()) {
      addToast('error', 'Studio name is required');
      return;
    }

    if (!formData.email.trim()) {
      addToast('error', 'Email is required');
      return;
    }

    try {
      setIsSaving(true);
      await studiosApi.update(studio.id, formData);
      addToast('success', 'Settings saved successfully');
      loadStudio(); // Reload to get updated data
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      addToast('error', error.response?.data?.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  if (!studio) {
    return (
      <div className="text-center py-12">
        <Building2 className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">Studio not found</h3>
        <p className="mt-1 text-sm text-gray-500">Unable to load studio settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">Manage your studio profile and preferences</p>
        </div>
      </div>

      {/* Subscription Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="mr-2 h-5 w-5" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Current Plan</label>
              <p className="mt-1 text-lg font-semibold capitalize">
                {studio.subscriptionTier.toLowerCase().replace('_', ' ')}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600">Status</label>
              <p className="mt-1 text-lg font-semibold capitalize text-green-600">
                {studio.status.toLowerCase()}
              </p>
            </div>
            {studio.subscriptionExpiresAt && (
              <div>
                <label className="text-sm font-medium text-gray-600">Expires</label>
                <p className="mt-1 text-lg">
                  {new Date(studio.subscriptionExpiresAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Studio Profile Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Studio Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Studio Name <span className="text-red-500">*</span>
                </label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
                  Studio Slug (URL)
                </label>
                <Input
                  id="slug"
                  name="slug"
                  type="text"
                  value={studio.slug}
                  disabled
                  className="bg-gray-100"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Your booking page: /studio/{studio.slug}
                </p>
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Address Information */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Street Address
              </label>
              <Input
                id="address"
                name="address"
                type="text"
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <Input
                  id="city"
                  name="city"
                  type="text"
                  value={formData.city}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <Input
                  id="state"
                  name="state"
                  type="text"
                  value={formData.state}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP Code
                </label>
                <Input
                  id="zipCode"
                  name="zipCode"
                  type="text"
                  value={formData.zipCode}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Website */}
            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
                Website
              </label>
              <Input
                id="website"
                name="website"
                type="url"
                placeholder="https://example.com"
                value={formData.website}
                onChange={handleChange}
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="Tell customers about your studio..."
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button type="submit" disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* User Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="mr-2 h-5 w-5" />
            Your Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Name</label>
                <p className="mt-1 text-lg">{user?.name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <p className="mt-1 text-lg">{user?.email || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Role</label>
                <p className="mt-1 text-lg capitalize">{user?.role?.toLowerCase() || 'N/A'}</p>
              </div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-500">
                To change your personal information or password, please contact your studio owner.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
