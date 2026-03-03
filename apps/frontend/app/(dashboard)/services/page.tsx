'use client';

import React, { useEffect, useState, useRef } from 'react';
import NextImage from 'next/image';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { servicesApi, uploadApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Plus, Edit2, Trash2, GripVertical, ToggleLeft, ToggleRight, Upload, X, Image as ImageIcon } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useForm, UseFormHandleSubmit, UseFormRegister, FieldErrors } from 'react-hook-form';
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

/* -------------------------------------------------------------------------- */
/*  Sub-components (defined outside ServicesPage to avoid re-creation)        */
/* -------------------------------------------------------------------------- */

interface CoverImageFieldProps {
  coverImagePreview: string;
  coverImageUrl: string;
  isUploadingCover: boolean;
  coverFileInputRef: React.RefObject<HTMLInputElement | null>;
  onRemove: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function CoverImageField({
  coverImagePreview,
  coverImageUrl,
  isUploadingCover,
  coverFileInputRef,
  onRemove,
  onUpload,
}: CoverImageFieldProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[var(--foreground)]">Cover Image</label>

      {coverImagePreview ? (
        <div className="relative">
          {/* native <img> needed for blob/data URLs — Next.js Image can't handle them */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImagePreview}
            alt="Cover preview"
            className="w-full h-40 object-cover rounded-lg border border-[var(--border)]"
          />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 p-1 bg-[var(--surface-0)] rounded-full border border-[var(--border)] hover:bg-[var(--surface-1)] transition-colors"
            aria-label="Remove cover image"
          >
            <X className="h-4 w-4 text-[var(--foreground-secondary)]" />
          </button>
          {isUploadingCover && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
              <LoadingSpinner size="md" />
            </div>
          )}
        </div>
      ) : coverImageUrl ? (
        <div className="relative h-40 rounded-lg overflow-hidden border border-[var(--border)]">
          <NextImage
            src={coverImageUrl}
            alt="Cover image"
            fill
            className="object-cover"
            unoptimized
          />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 p-1 bg-[var(--surface-0)] rounded-full border border-[var(--border)] hover:bg-[var(--surface-1)] transition-colors"
            aria-label="Remove cover image"
          >
            <X className="h-4 w-4 text-[var(--foreground-secondary)]" />
          </button>
        </div>
      ) : (
        <div
          className="border-2 border-dashed border-[var(--border)] rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[var(--primary)] transition-colors"
          onClick={() => coverFileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') coverFileInputRef.current?.click(); }}
          aria-label="Upload cover image"
        >
          {isUploadingCover ? (
            <LoadingSpinner size="md" />
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-[var(--foreground-tertiary)]" />
              <p className="text-sm text-[var(--foreground-tertiary)]">Click to upload cover image</p>
              <p className="text-xs text-[var(--foreground-tertiary)]">PNG, JPG up to 5MB</p>
            </>
          )}
        </div>
      )}

      <input
        ref={coverFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onUpload}
        aria-hidden="true"
      />

      {(coverImagePreview || coverImageUrl) && !isUploadingCover && (
        <button
          type="button"
          onClick={() => coverFileInputRef.current?.click()}
          className="flex items-center gap-2 text-sm text-[var(--primary)] hover:underline"
        >
          <Upload className="h-4 w-4" />
          Change image
        </button>
      )}
    </div>
  );
}

interface ServiceFormProps {
  onSubmit: (data: ServiceFormData) => void;
  handleSubmit: UseFormHandleSubmit<ServiceFormData>;
  register: UseFormRegister<ServiceFormData>;
  errors: FieldErrors<ServiceFormData>;
  isSubmitting: boolean;
  isUploadingCover: boolean;
  submitLabel: string;
  onCancel: () => void;
  coverImagePreview: string;
  coverImageUrl: string;
  coverFileInputRef: React.RefObject<HTMLInputElement | null>;
  onRemoveCover: () => void;
  onUploadCover: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function ServiceForm({
  onSubmit,
  handleSubmit,
  register,
  errors,
  isSubmitting,
  isUploadingCover,
  submitLabel,
  onCancel,
  coverImagePreview,
  coverImageUrl,
  coverFileInputRef,
  onRemoveCover,
  onUploadCover,
}: ServiceFormProps) {
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <CoverImageField
        coverImagePreview={coverImagePreview}
        coverImageUrl={coverImageUrl}
        isUploadingCover={isUploadingCover}
        coverFileInputRef={coverFileInputRef}
        onRemove={onRemoveCover}
        onUpload={onUploadCover}
      />

      <Input
        label="Service Name"
        {...register('name')}
        error={errors.name?.message}
        placeholder="e.g. Wedding Photography"
        required
      />

      <Textarea
        label="Description"
        {...register('description')}
        placeholder="Describe what's included in this service..."
        rows={3}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Price (₹)"
          type="number"
          step="0.01"
          min="0"
          {...register('price')}
          error={errors.price?.message}
          placeholder="e.g. 25000"
          required
        />
        <Input
          label="Duration (minutes)"
          type="number"
          min="0"
          {...register('duration')}
          placeholder="e.g. 120"
        />
      </div>

      <Select
        label="Occasion"
        options={OCCASION_OPTIONS}
        {...register('occasion')}
      />

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isSubmitting || isUploadingCover}
          disabled={isSubmitting || isUploadingCover}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

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
    const ctrl = new AbortController();
    loadServices(ctrl);
    return () => ctrl.abort();
  }, []);

  const loadServices = async (ctrl?: AbortController) => {
    try {
      setIsLoading(true);
      const response = await servicesApi.getAll({ includeInactive: true });
      if (ctrl?.signal.aborted) return;
      const data = Array.isArray(response.data) ? response.data : [];
      setServices([...data].sort((a: Service, b: Service) => (a.sortOrder || 0) - (b.sortOrder || 0)));
    } catch (error) {
      if ((error as { name?: string }).name === 'CanceledError') return;
      addToast('error', 'Failed to load services');
    } finally {
      if (!ctrl?.signal.aborted) setIsLoading(false);
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
      if (typeof ev.target?.result === 'string') {
        setCoverImagePreview(ev.target.result);
      }
    };
    reader.readAsDataURL(file);

    // Upload to server
    try {
      setIsUploadingCover(true);
      const response = await uploadApi.uploadServiceCover(file);
      setCoverImageUrl(response.data.url);
      addToast('success', 'Cover image uploaded');
    } catch (error) {
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
    } catch (e) {
      const error = e as { response?: { data?: { message?: string } } };
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
    } catch (e) {
      const error = e as { response?: { data?: { message?: string } } };
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
    } catch (e) {
      const error = e as { response?: { data?: { message?: string } } };
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
    } catch (e) {
      const error = e as { response?: { data?: { message?: string } } };
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Studio"
        title="Services"
        subtitle="Manage your photography services and packages"
        accentColor="violet"
        actions={
          <Button onClick={() => { resetFormState(); setIsCreateModalOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            New Service
          </Button>
        }
      />

      {/* Services Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-48 w-full rounded-2xl" />
          ))}
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
                <div className="relative h-36 overflow-hidden">
                  <NextImage
                    src={service.coverImage}
                    alt={service.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    unoptimized
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
                  <button aria-label="Drag to reorder" className="text-[var(--foreground-tertiary)] hover:text-[var(--foreground-secondary)] cursor-move">
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
                    aria-label={service.isActive ? 'Deactivate service' : 'Activate service'}
                    onClick={() => handleToggleActive(service)}
                  >
                    {service.isActive ? (
                      <ToggleRight className="h-5 w-5 text-[var(--success)]" />
                    ) : (
                      <ToggleLeft className="h-5 w-5 text-[var(--foreground-tertiary)]" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Delete service"
                    onClick={() => openDeleteModal(service)}
                  >
                    <Trash2 className="h-4 w-4 text-[var(--danger)]" />
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
        <ServiceForm
          onSubmit={onCreateService}
          submitLabel="Create Service"
          onCancel={() => { setIsCreateModalOpen(false); resetFormState(); }}
          handleSubmit={handleSubmit}
          register={register}
          errors={errors}
          isSubmitting={isSubmitting}
          isUploadingCover={isUploadingCover}
          coverImagePreview={coverImagePreview}
          coverImageUrl={coverImageUrl}
          coverFileInputRef={coverFileInputRef}
          onRemoveCover={removeCoverImage}
          onUploadCover={handleCoverImageUpload}
        />
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
        <ServiceForm
          onSubmit={onUpdateService}
          submitLabel="Update Service"
          onCancel={() => { setIsEditModalOpen(false); setSelectedService(null); resetFormState(); }}
          handleSubmit={handleSubmit}
          register={register}
          errors={errors}
          isSubmitting={isSubmitting}
          isUploadingCover={isUploadingCover}
          coverImagePreview={coverImagePreview}
          coverImageUrl={coverImageUrl}
          coverFileInputRef={coverFileInputRef}
          onRemoveCover={removeCoverImage}
          onUploadCover={handleCoverImageUpload}
        />
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
