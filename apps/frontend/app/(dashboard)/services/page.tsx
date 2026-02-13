'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { servicesApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Plus, Edit2, Trash2, GripVertical, ToggleLeft, ToggleRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface Service {
  id: number;
  name: string;
  description?: string;
  price: number;
  duration?: number;
  isActive: boolean;
  displayOrder: number;
}

const serviceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  price: z.string().min(1, 'Price is required'),
  duration: z.string().optional(),
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
      const response = await servicesApi.getAll({ limit: 1000 });
      setServices(response.data.data.sort((a: Service, b: Service) => a.displayOrder - b.displayOrder));
    } catch (error) {
      console.error('Failed to load services:', error);
      addToast('error', 'Failed to load services');
    } finally {
      setIsLoading(false);
    }
  };

  const onCreateService = async (data: ServiceFormData) => {
    try {
      setIsSubmitting(true);
      await servicesApi.create({
        name: data.name,
        description: data.description,
        price: parseFloat(data.price),
        duration: data.duration ? parseInt(data.duration) : undefined,
      });
      
      addToast('success', 'Service created successfully');
      setIsCreateModalOpen(false);
      reset();
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
      await servicesApi.update(selectedService.id.toString(), {
        name: data.name,
        description: data.description,
        price: parseFloat(data.price),
        duration: data.duration ? parseInt(data.duration) : undefined,
      });
      
      addToast('success', 'Service updated successfully');
      setIsEditModalOpen(false);
      setSelectedService(null);
      reset();
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
      await servicesApi.delete(selectedService.id.toString());
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
      await servicesApi.toggleActive(service.id.toString());
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
      duration: service.duration?.toString() || '',
    });
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (service: Service) => {
    setSelectedService(service);
    setIsDeleteModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Services</h1>
          <p className="mt-2 text-gray-600">Manage your photography services and packages</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Service
        </Button>
      </div>

      {/* Services Grid */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      ) : services.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No services</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first service.</p>
              <Button className="mt-4" onClick={() => setIsCreateModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Service
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <Card key={service.id} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={service.isActive ? 'success' : 'default'}>
                        {service.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600 cursor-move">
                    <GripVertical className="h-5 w-5" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {service.description && (
                  <p className="text-sm text-gray-600">{service.description}</p>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Price</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(service.price)}
                    </span>
                  </div>
                  
                  {service.duration && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Duration</span>
                      <span className="text-sm text-gray-900">{service.duration} minutes</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
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
                      <ToggleLeft className="h-5 w-5 text-gray-400" />
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
          reset();
        }}
        title="Create New Service"
        description="Add a new photography service or package"
        size="lg"
      >
        <form onSubmit={handleSubmit(onCreateService)} className="space-y-4">
          <Input
            label="Service Name"
            placeholder="Wedding Photography"
            error={errors.name?.message}
            {...register('name')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Describe your service..."
            />
          </div>

          <Input
            label="Price"
            type="number"
            step="0.01"
            placeholder="999.99"
            error={errors.price?.message}
            {...register('price')}
          />

          <Input
            label="Duration (Optional, in minutes)"
            type="number"
            placeholder="120"
            error={errors.duration?.message}
            {...register('duration')}
          />

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
              Create Service
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Service Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedService(null);
          reset();
        }}
        title="Edit Service"
        description="Update service information"
        size="lg"
      >
        <form onSubmit={handleSubmit(onUpdateService)} className="space-y-4">
          <Input
            label="Service Name"
            placeholder="Wedding Photography"
            error={errors.name?.message}
            {...register('name')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Describe your service..."
            />
          </div>

          <Input
            label="Price"
            type="number"
            step="0.01"
            placeholder="999.99"
            error={errors.price?.message}
            {...register('price')}
          />

          <Input
            label="Duration (Optional, in minutes)"
            type="number"
            placeholder="120"
            error={errors.duration?.message}
            {...register('duration')}
          />

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false);
                setSelectedService(null);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
              Update Service
            </Button>
          </div>
        </form>
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
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-medium text-gray-900">{selectedService.name}</p>
              <p className="text-sm text-gray-600 mt-1">{formatCurrency(selectedService.price)}</p>
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
