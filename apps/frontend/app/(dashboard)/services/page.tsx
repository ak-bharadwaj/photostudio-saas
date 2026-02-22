'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { servicesApi, uploadApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Plus, Edit2, Trash2, GripVertical, ToggleLeft, ToggleRight, Upload, X, Image as ImageIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const OCCASION_OPTIONS = [
  { value: '', label: 'None (General)' },
  { value: 'wedding', label: 'Wedding' },
  { value: 'portrait', label: 'Portrait' },
  { value: 'family', label: 'Family' },
  { value: 'event', label: 'Event' },
  { value: 'baby', label: 'Baby / Newborn' },
  { value: 'graduation', label: 'Graduation' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'birthday', label: 'Birthday / Party' },
  { value: 'product', label: 'Product' },
];

interface Service {
  id: string;
  name: string;
  description?: string;
  price: number;
  durationMinutes: number;
  isActive: boolean;
  sortOrder: number;
  occasion?: string;
  coverImage?: string;
}

const serviceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  price: z.string().min(1, 'Price is required'),
  duration: z.string().optional(),
  occasion: z.string().optional(),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string>('');
  const [coverImagePreview, setCoverImagePreview] = useState<string>('');
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setIsLoading(true);
      const response = await servicesApi.getAll({ includeInactive: true });
      const data = response.data || [];
      setServices([...data].sort((a: Service, b: Service) => (a.sortOrder || 0) - (b.sortOrder || 0)));
    } catch (error) {
      console.error('Failed to load services:', error);
      addToast('error', 'Failed to load services');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      addToast('error', 'Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      addToast('error', 'Image must be less than 5MB');
      return;
    }

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCoverImagePreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server
    try {
      setIsUploadingCover(true);
      const response = await uploadApi.uploadServiceCover(file);
      setCoverImageUrl(response.data.url);
      addToast('success', 'Cover image uploaded');
    } catch (error) {
      console.error('Failed to upload cover image:', error);
      addToast('error', 'Failed to upload cover image');
      setCoverImagePreview('');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const removeCoverImage = () => {
    setCoverImageUrl('');
    setCoverImagePreview('');
    if (coverFileInputRef.current) {
      coverFileInputRef.current.value = '';
    }
  };

  const resetFormState = () => {
    reset();
    setCoverImageUrl('');
    setCoverImagePreview('');
  };

  const onCreateService = async (data: ServiceFormData) => {
    try {
      setIsSubmitting(true);
      await servicesApi.create({
        name: data.name,
        description: data.description,
        price: parseFloat(data.price),
        durationMinutes: data.duration ? parseInt(data.duration) : undefined,
        occasion: data.occasion || undefined,
        coverImage: coverImageUrl || undefined,
      });

      addToast('success', 'Service created successfully');
      setIsCreateModalOpen(false);
      resetFormState();
      loadServices();
    } catch (error: any) {
      addToast('error', error.response?.data?.message || 'Failed to create service');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onUpdateService = async (data: ServiceFormData) => {
    if (!selectedService) return;

    try {
      setIsSubmitting(true);
      await servicesApi.update(selectedService.id, {
        name: data.name,
        description: data.description,
        price: parseFloat(data.price),
        durationMinutes: data.duration ? parseInt(data.duration) : 0,
        occasion: data.occasion || undefined,
        coverImage: coverImageUrl || undefined,
      });

      addToast('success', 'Service updated successfully');
      setIsEditModalOpen(false);
      setSelectedService(null);
      resetFormState();
      loadServices();
    } catch (error: any) {
      addToast('error', error.response?.data?.message || 'Failed to update service');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedService) return;

    try {
      setIsSubmitting(true);
      await servicesApi.delete(selectedService.id);
      addToast('success', 'Service deleted successfully');
      setIsDeleteModalOpen(false);
      setSelectedService(null);
      loadServices();
    } catch (error: any) {
      addToast('error', error.response?.data?.message || 'Failed to delete service');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (service: Service) => {
    try {
      await servicesApi.toggleActive(service.id);
      addToast('success', `Service ${service.isActive ? 'deactivated' : 'activated'} successfully`);
      loadServices();
    } catch (error: any) {
      addToast('error', error.response?.data?.message || 'Failed to toggle service status');
    }
  };

  const openEditModal = (service: Service) => {
    setSelectedService(service);
    reset({
      name: service.name,
      description: service.description || '',
      price: service.price.toString(),
      duration: service.durationMinutes?.toString() || '',
      occasion: service.occasion || '',
    });
    setCoverImageUrl(service.coverImage || '');
    setCoverImagePreview(service.coverImage || '');
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (service: Service) => {
    setSelectedService(service);
    setIsDeleteModalOpen(true);
  };

  const getOccasionLabel = (occasion?: string) => {
    if (!occasion) return null;
    const option = OCCASION_OPTIONS.find(o => o.value === occasion);
    return option?.label || occasion;
  };

  const renderCoverImageField = () => (
    <div>
      <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
        Cover Image (Optional)
      </label>
      {(coverImagePreview || coverImageUrl) ? (
        <div className="relative rounded-lg overflow-hidden border border-[var(--border)]">
          <img
            src={coverImagePreview || coverImageUrl}
            alt="Cover preview"
            className="w-full h-40 object-cover"
          />
          <button
            type="button"
            onClick={removeCoverImage}
            className="absolute top-2 right-2 bg-[var(--surface-0)]/90 hover:bg-[var(--surface-0)] rounded-full p-1 shadow-sm"
          >
            <X className="h-4 w-4 text-[var(--foreground-secondary)]" />
          </button>
          {isUploadingCover && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <LoadingSpinner size="sm" />
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => coverFileInputRef.current?.click()}
          className="border-2 border-dashed border-[var(--border-strong)] rounded-lg p-6 text-center cursor-pointer hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors"
        >
          {isUploadingCover ? (
            <div className="flex flex-col items-center">
              <LoadingSpinner size="sm" />
              <span className="mt-2 text-sm text-[var(--foreground-tertiary)]">Uploading...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <ImageIcon className="h-8 w-8 text-[var(--foreground-tertiary)] mb-2" />
              <span className="text-sm text-[var(--foreground-secondary)]">Click to upload cover image</span>
              <span className="text-xs text-[var(--foreground-tertiary)] mt-1">JPG, PNG, WebP up to 5MB</span>
            </div>
          )}
        </div>
      )}
      <input
        ref={coverFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleCoverImageUpload}
        className="hidden"
      />
    </div>
  );

  const renderServiceForm = (onSubmit: (data: ServiceFormData) => void, submitLabel: string) => (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Service Name"
        placeholder="Wedding Photography"
        error={errors.name?.message}
        {...register('name')}
      />

      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
          Description (Optional)
        </label>
        <textarea
          {...register('description')}
          rows={3}
          className="flex w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          placeholder="Describe your service..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Price"
          type="number"
          step="0.01"
          placeholder="999.99"
          error={errors.price?.message}
          {...register('price')}
        />

        <Input
          label="Duration (minutes)"
          type="number"
          placeholder="120"
          error={errors.duration?.message}
          {...register('duration')}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
          Occasion Category
        </label>
        <select
          {...register('occasion')}
          className="flex w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          {OCCASION_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-[var(--foreground-tertiary)]">
          Services with the same occasion are grouped together on your public booking page.
        </p>
      </div>

      {renderCoverImageField()}

      <div className="flex items-center justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (submitLabel === 'Create Service') {
              setIsCreateModalOpen(false);
            } else {
              setIsEditModalOpen(false);
              setSelectedService(null);
            }
            resetFormState();
          }}
        >
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting || isUploadingCover}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)] tracking-tight">Services</h1>
          <p className="mt-2 text-[var(--foreground-secondary)]">Manage your photography services and packages</p>
        </div>
        <Button onClick={() => { resetFormState(); setIsCreateModalOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          New Service
        </Button>
      </div>

      {/* Services Grid */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      ) : (services || []).length === 0 ? (
        <Card className="border-[var(--border)] bg-[var(--surface-0)]">
          <CardContent className="py-12">
            <div className="text-center">
              <h3 className="mt-2 text-sm font-semibold text-[var(--foreground)]">No services</h3>
              <p className="mt-1 text-sm text-[var(--foreground-tertiary)]">Get started by creating your first service.</p>
              <Button className="mt-4" onClick={() => { resetFormState(); setIsCreateModalOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                New Service
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(services || []).map((service) => (
            <Card key={service.id} className="relative overflow-hidden">
              {service.coverImage && (
                <div className="h-36 overflow-hidden">
                  <img
                    src={service.coverImage}
                    alt={service.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={service.isActive ? 'success' : 'default'}>
                        {service.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {service.occasion && (
                        <Badge variant="info">
                          {getOccasionLabel(service.occasion)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <button className="text-[var(--foreground-tertiary)] hover:text-[var(--foreground-secondary)] cursor-move">
                    <GripVertical className="h-5 w-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {service.description && (
                  <p className="text-sm text-[var(--foreground-secondary)]">{service.description}</p>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--foreground-tertiary)]">Price</span>
                    <span className="text-lg font-bold text-[var(--foreground)]">
                      {formatCurrency(service.price)}
                    </span>
                  </div>

                  {service.durationMinutes && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--foreground-tertiary)]">Duration</span>
                      <span className="text-sm text-[var(--foreground)]">{service.durationMinutes} minutes</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-[var(--border)]">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEditModal(service)}
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(service)}
                  >
                    {service.isActive ? (
                      <ToggleRight className="h-5 w-5 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-[var(--foreground-tertiary)]" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDeleteModal(service)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Service Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetFormState();
        }}
        title="Create New Service"
        description="Add a new photography service or package"
        size="lg"
      >
        {renderServiceForm(onCreateService, 'Create Service')}
      </Modal>

      {/* Edit Service Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedService(null);
          resetFormState();
        }}
        title="Edit Service"
        description="Update service information"
        size="lg"
      >
        {renderServiceForm(onUpdateService, 'Update Service')}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedService(null);
        }}
        title="Delete Service"
        description="Are you sure you want to delete this service? This action cannot be undone."
      >
        <div className="space-y-4">
          {selectedService && (
            <div className="bg-[var(--surface-1)] p-4 rounded-lg">
              <p className="font-medium text-[var(--foreground)]">{selectedService.name}</p>
              <p className="text-sm text-[var(--foreground-secondary)] mt-1">{formatCurrency(selectedService.price)}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedService(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              Delete Service
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
