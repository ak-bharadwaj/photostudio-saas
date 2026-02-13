'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/components/ui/toast';
import { portfolioApi, uploadApi } from '@/lib/api';
import { Plus, Edit2, Trash2, Eye, EyeOff, Image as ImageIcon, Upload } from 'lucide-react';

interface PortfolioItem {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  category?: string;
  sortOrder: number;
  isVisible: boolean;
  createdAt: string;
}

export default function PortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const { addToast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    category: '',
  });

  useEffect(() => {
    loadPortfolio();
  }, [categoryFilter]);

  const loadPortfolio = async () => {
    try {
      setIsLoading(true);
      const params: any = {};
      if (categoryFilter) params.category = categoryFilter;
      
      const response = await portfolioApi.getAll(params);
      setItems(response.data);
    } catch (error) {
      console.error('Failed to load portfolio:', error);
      addToast('error', 'Failed to load portfolio items');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (item?: PortfolioItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title,
        description: item.description || '',
        imageUrl: item.imageUrl,
        category: item.category || '',
      });
    } else {
      setEditingItem(null);
      setFormData({
        title: '',
        description: '',
        imageUrl: '',
        category: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData({
      title: '',
      description: '',
      imageUrl: '',
      category: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      addToast('error', 'Title is required');
      return;
    }

    if (!formData.imageUrl.trim()) {
      addToast('error', 'Image URL is required');
      return;
    }

    try {
      if (editingItem) {
        await portfolioApi.update(editingItem.id, formData);
        addToast('success', 'Portfolio item updated successfully');
      } else {
        await portfolioApi.create(formData);
        addToast('success', 'Portfolio item created successfully');
      }
      
      handleCloseModal();
      loadPortfolio();
    } catch (error: any) {
      console.error('Failed to save portfolio item:', error);
      addToast('error', error.response?.data?.message || 'Failed to save portfolio item');
    }
  };

  const handleToggleVisibility = async (item: PortfolioItem) => {
    try {
      await portfolioApi.toggleVisibility(item.id);
      addToast('success', `Portfolio item ${item.isVisible ? 'hidden' : 'shown'}`);
      loadPortfolio();
    } catch (error: any) {
      console.error('Failed to toggle visibility:', error);
      addToast('error', error.response?.data?.message || 'Failed to toggle visibility');
    }
  };

  const handleDelete = async (item: PortfolioItem) => {
    if (!confirm(`Are you sure you want to delete "${item.title}"?`)) {
      return;
    }

    try {
      await portfolioApi.delete(item.id);
      addToast('success', 'Portfolio item deleted successfully');
      loadPortfolio();
    } catch (error: any) {
      console.error('Failed to delete portfolio item:', error);
      addToast('error', error.response?.data?.message || 'Failed to delete portfolio item');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      addToast('error', 'Please upload an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      addToast('error', 'File size must be less than 10MB');
      return;
    }

    try {
      setIsUploading(true);
      const response = await uploadApi.uploadPortfolioImage(file);
      setFormData({ ...formData, imageUrl: response.data.url });
      addToast('success', 'Image uploaded successfully');
    } catch (error: any) {
      console.error('Failed to upload image:', error);
      addToast('error', error.response?.data?.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const categories = Array.from(new Set(items.map(item => item.category).filter(Boolean)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Portfolio</h1>
          <p className="mt-2 text-gray-600">Showcase your best work to potential clients</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Visible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {items.filter(item => item.isVisible).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      {categories.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Filter by Category:</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="flex h-10 w-full max-w-xs rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Portfolio Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Items ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No portfolio items</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first portfolio item.
              </p>
              <Button className="mt-4" onClick={() => handleOpenModal()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="relative group rounded-lg border border-gray-200 overflow-hidden bg-white hover:shadow-lg transition-shadow"
                >
                  {/* Image */}
                  <div className="aspect-video relative bg-gray-100">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Image+Not+Found';
                      }}
                    />
                    
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-900 hover:bg-gray-100"
                        onClick={() => handleOpenModal(item)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-gray-900 hover:bg-gray-100"
                        onClick={() => handleToggleVisibility(item)}
                      >
                        {item.isVisible ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-red-600 hover:bg-red-50"
                        onClick={() => handleDelete(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Visibility Badge */}
                    {!item.isVisible && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary">Hidden</Badge>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>
                    {item.description && (
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    {item.category && (
                      <div className="mt-2">
                        <Badge variant="secondary">{item.category}</Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingItem ? 'Edit Portfolio Item' : 'Add Portfolio Item'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Wedding at Sunset"
              required
            />
          </div>

          <div>
            <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Image <span className="text-red-500">*</span>
            </label>
            
            {/* File Upload Button */}
            <div className="mb-2">
              <label htmlFor="file-upload" className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Uploading...' : 'Upload Image'}
              </label>
              <input
                id="file-upload"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
              <span className="ml-2 text-xs text-gray-500">
                or enter URL below
              </span>
            </div>

            {/* URL Input */}
            <Input
              id="imageUrl"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://example.com/image.jpg"
              required
              disabled={isUploading}
            />
            <p className="mt-1 text-xs text-gray-500">
              Upload from your computer or paste an existing URL (max 10MB)
            </p>
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Wedding, Portrait, Event, etc."
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              className="flex w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief description of this photo..."
            />
          </div>

          {/* Preview */}
          {formData.imageUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preview
              </label>
              <div className="aspect-video relative bg-gray-100 rounded-md overflow-hidden">
                <img
                  src={formData.imageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Invalid+URL';
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button type="submit">
              {editingItem ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
