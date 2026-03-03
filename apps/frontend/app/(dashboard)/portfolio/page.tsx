'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { LoadingSpinner } from '@/components/ui/loading';
import { useToast } from '@/components/ui/toast';
import { portfolioApi, uploadApi } from '@/lib/api';
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Upload,
  Grid3X3,
  LayoutGrid,
  Filter,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';

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

/* ── Inline SVG fallback for broken images ──────────────────────────────── */
const PLACEHOLDER_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23f1f5f9' width='400' height='300'/%3E%3Cg fill='%23cbd5e1'%3E%3Crect x='160' y='110' width='80' height='60' rx='6'/%3E%3Ccircle cx='175' cy='125' r='8'/%3E%3Cpolygon points='155,170 195,130 225,160 245,140 265,170'/%3E%3C/g%3E%3C/svg%3E`;

export default function PortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirm-delete modal
  const [confirmDelete, setConfirmDelete] = useState<PortfolioItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { addToast } = useToast();
  const abortRef = useRef<AbortController | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    category: '',
  });

  const resetForm = () => {
    setFormData({ title: '', description: '', imageUrl: '', category: '' });
  };

  useEffect(() => {
    loadPortfolio();
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter]);

  const loadPortfolio = async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      setIsLoading(true);
      const params: Record<string, string> = {};
      if (categoryFilter) params.category = categoryFilter;

      const response = await portfolioApi.getAll(params);
      if (ctrl.signal.aborted) return;
      setItems(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      if (ctrl.signal.aborted) return;
      addToast('error', 'Failed to load portfolio items');
    } finally {
      if (!ctrl.signal.aborted) setIsLoading(false);
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
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    resetForm();
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

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await portfolioApi.update(editingItem.id, formData);
        addToast('success', 'Portfolio item updated');
      } else {
        await portfolioApi.create(formData);
        addToast('success', 'Portfolio item created');
      }
      handleCloseModal();
      loadPortfolio();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      addToast('error', err.response?.data?.message || 'Failed to save portfolio item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleVisibility = async (item: PortfolioItem) => {
    try {
      await portfolioApi.toggleVisibility(item.id);
      addToast('success', item.isVisible ? 'Item hidden from portfolio' : 'Item shown in portfolio');
      loadPortfolio();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      addToast('error', err.response?.data?.message || 'Failed to toggle visibility');
    }
  };

  const handleDeleteRequest = (item: PortfolioItem) => {
    setConfirmDelete(item);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    try {
      await portfolioApi.delete(confirmDelete.id);
      addToast('success', `"${confirmDelete.title}" deleted`);
      setConfirmDelete(null);
      loadPortfolio();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      addToast('error', err.response?.data?.message || 'Failed to delete portfolio item');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('error', 'Please upload an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      addToast('error', 'File size must be less than 10MB');
      return;
    }

    try {
      setIsUploading(true);
      const response = await uploadApi.uploadPortfolioImage(file);
      setFormData((prev) => ({ ...prev, imageUrl: response.data.url }));
      addToast('success', 'Image uploaded');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      addToast('error', err.response?.data?.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const categories = Array.from(new Set(items.map((item) => item.category).filter(Boolean))) as string[];
  const visibleCount = items.filter((i) => i.isVisible).length;

  return (
    <div className="space-y-6 animate-luxury-in">
      <PageHeader
        eyebrow="Showcase"
        title="Portfolio"
        subtitle="Showcase your best work to attract new clients."
        accentColor="violet"
        actions={
          <Button onClick={() => handleOpenModal()} leftIcon={<Plus className="h-4 w-4" />} size="lg">
            Add Item
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="card-luxury p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
              <LayoutGrid className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--foreground-tertiary)]">Total Items</p>
              <p className="text-2xl font-black text-[var(--foreground)] font-heading">{items.length}</p>
            </div>
          </div>
        </Card>

        <Card className="card-luxury p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[var(--success)]/10 flex items-center justify-center">
              <Eye className="h-5 w-5 text-[var(--success)]" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--foreground-tertiary)]">Visible</p>
              <p className="text-2xl font-black text-[var(--foreground)] font-heading">{visibleCount}</p>
            </div>
          </div>
        </Card>

        <Card className="card-luxury p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[var(--warning)]/10 flex items-center justify-center">
              <Grid3X3 className="h-5 w-5 text-[var(--warning)]" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--foreground-tertiary)]">Categories</p>
              <p className="text-2xl font-black text-[var(--foreground)] font-heading">{categories.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--foreground-secondary)]">
            <Filter className="h-4 w-4" /> Filter:
          </div>
          <button
            onClick={() => setCategoryFilter('')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
              categoryFilter === ''
                ? 'bg-[var(--primary)] text-white border-transparent shadow-sm'
                : 'border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                categoryFilter === cat
                  ? 'bg-[var(--primary)] text-white border-transparent shadow-sm'
                  : 'border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Portfolio Grid */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Portfolio Items ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-48 w-full rounded-2xl" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 animate-luxury-in">
              <div className="h-20 w-20 rounded-full bg-[var(--surface-2)] flex items-center justify-center mx-auto mb-5">
                <ImageIcon className="h-10 w-10 text-[var(--foreground-tertiary)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">No portfolio items yet</h3>
              <p className="text-sm text-[var(--foreground-secondary)] mb-6 max-w-sm mx-auto">
                {categoryFilter
                  ? `No items in the "${categoryFilter}" category.`
                  : 'Start building your portfolio by adding your first photo.'}
              </p>
              {!categoryFilter && (
                <Button onClick={() => handleOpenModal()} leftIcon={<Plus className="h-4 w-4" />}>
                  Add Your First Item
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group relative rounded-2xl border border-[var(--border)] overflow-hidden bg-[var(--surface-0)] hover:shadow-[var(--shadow-lg)] hover:-translate-y-0.5 transition-all duration-300"
                >
                  {/* Image */}
                  <div className="aspect-video relative bg-[var(--surface-1)]">
                    <Image
                      src={item.imageUrl || PLACEHOLDER_SVG}
                      alt={item.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = PLACEHOLDER_SVG;
                      }}
                    />

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/55 transition-all duration-300 flex items-center justify-center gap-2">
                      <button
                        aria-label={`Edit ${item.title}`}
                        onClick={() => handleOpenModal(item)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--surface-0)] text-[var(--foreground)] hover:bg-[var(--surface-2)] p-2 rounded-lg shadow-lg"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        aria-label={item.isVisible ? `Hide ${item.title}` : `Show ${item.title}`}
                        onClick={() => handleToggleVisibility(item)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--surface-0)] text-[var(--foreground)] hover:bg-[var(--surface-2)] p-2 rounded-lg shadow-lg"
                      >
                        {item.isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <button
                        aria-label={`Delete ${item.title}`}
                        onClick={() => handleDeleteRequest(item)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--surface-0)] text-[var(--danger)] hover:bg-[var(--danger)]/10 p-2 rounded-lg shadow-lg"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Hidden badge */}
                    {!item.isVisible && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="secondary" className="text-xs gap-1">
                          <EyeOff className="h-3 w-3" /> Hidden
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="font-semibold text-[var(--foreground)] truncate">{item.title}</h3>
                    {item.description && (
                      <p className="mt-1 text-sm text-[var(--foreground-secondary)] line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    {item.category && (
                      <div className="mt-2">
                        <Badge variant="secondary" className="text-xs">{item.category}</Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Add/Edit Modal ──────────────────────────────────────────────────── */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingItem ? 'Edit Portfolio Item' : 'Add Portfolio Item'}
        size="md"
      >
        <form id="portfolio-form" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="pf-title" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Title <span className="text-[var(--danger)]" aria-hidden="true">*</span>
            </label>
            <Input
              id="pf-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Wedding at Sunset"
              required
            />
          </div>

          <div>
            <label htmlFor="pf-image" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Image <span className="text-[var(--danger)]" aria-hidden="true">*</span>
            </label>

            {/* File upload */}
            <div className="mb-2 flex items-center gap-3">
              <label
                htmlFor="pf-file-upload"
                className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] border border-[var(--border)] text-sm font-medium text-[var(--foreground)] bg-[var(--surface-0)] hover:bg-[var(--surface-1)] transition-colors focus-within:ring-2 focus-within:ring-[var(--primary)]"
              >
                <Upload className="h-4 w-4" />
                {isUploading ? 'Uploading…' : 'Upload Image'}
                <input
                  id="pf-file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="sr-only"
                />
              </label>
              <span className="text-xs text-[var(--foreground-tertiary)]">or paste URL below (max 10MB)</span>
            </div>

            <Input
              id="pf-image"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://res.cloudinary.com/…"
              required
              disabled={isUploading}
            />
          </div>

          <div>
            <label htmlFor="pf-category" className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Category
            </label>
            <Input
              id="pf-category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="Wedding, Portrait, Event…"
            />
          </div>

          <div>
            <Textarea
              id="pf-desc"
              label="Description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="A brief description of this photo…"
            />
          </div>

          {/* Preview */}
          {formData.imageUrl && (
            <div>
              <p className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Preview</p>
              <div className="aspect-video relative rounded-xl overflow-hidden bg-[var(--surface-1)]">
                <Image
                  src={formData.imageUrl}
                  alt="Preview"
                  fill
                  className="object-cover"
                  sizes="480px"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = PLACEHOLDER_SVG;
                  }}
                />
              </div>
            </div>
          )}
        </form>

        <ModalFooter>
          <Button type="button" variant="outline" onClick={handleCloseModal} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="portfolio-form"
            isLoading={isSubmitting || isUploading}
            disabled={isSubmitting || isUploading}
          >
            {editingItem ? 'Update' : 'Create'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── Delete Confirmation Modal ────────────────────────────────────────── */}
      <Modal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete Portfolio Item"
        description={`Are you sure you want to delete "${confirmDelete?.title}"? This action cannot be undone.`}
        size="sm"
      >
        <ModalFooter>
          <Button variant="outline" onClick={() => setConfirmDelete(null)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteConfirm}
            isLoading={isDeleting}
            disabled={isDeleting}
            leftIcon={<Trash2 className="h-4 w-4" />}
          >
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
