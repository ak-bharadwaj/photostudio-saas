import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Safe localStorage accessor — returns null during SSR / server components
function getItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Silently ignore (e.g. private browsing storage quota)
  }
}

function removeItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Silently ignore
  }
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data;
          setItem('accessToken', accessToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed — clear tokens and redirect to login
        removeItem('accessToken');
        removeItem('refreshToken');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

// ── Shared param/data types ──────────────────────────────────────────────────

type QueryParams = Record<string, string | number | boolean | undefined>;
type RequestBody = Record<string, unknown>;

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  adminLogin: (email: string, password: string) =>
    api.post('/auth/admin/login', { email, password }),

  register: (data: RequestBody) =>
    api.post('/auth/register', data),

  logout: () =>
    api.post('/auth/logout'),

  me: () =>
    api.get('/auth/me'),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.patch('/auth/change-password', data),
};

// Studios API
export const studiosApi = {
  getAll: (params?: QueryParams) =>
    api.get('/studios', { params }),

  getOne: (id: string) =>
    api.get(`/studios/${id}`),

  getBySlug: (slug: string) =>
    api.get(`/studios/slug/${slug}`),

  getStats: (id: string) =>
    api.get(`/studios/${id}/stats`),

  create: (data: RequestBody) =>
    api.post('/studios', data),

  update: (id: string, data: RequestBody) =>
    api.patch(`/studios/${id}`, data),

  delete: (id: string) =>
    api.delete(`/studios/${id}`),
};

// Bookings API
export const bookingsApi = {
  getAll: (params?: QueryParams) =>
    api.get('/bookings', { params }),

  getUpcoming: (params?: QueryParams) =>
    api.get('/bookings/upcoming', { params }),

  getOne: (id: string) =>
    api.get(`/bookings/${id}`),

  create: (data: RequestBody) =>
    api.post('/bookings', data),

  createInternal: (data: RequestBody) =>
    api.post('/bookings/internal', data),

  update: (id: string, data: RequestBody) =>
    api.patch(`/bookings/${id}`, data),

  updateStatus: (id: string, data: RequestBody) =>
    api.patch(`/bookings/${id}/status`, data),

  cancel: (id: string, notes?: string) =>
    api.patch(`/bookings/${id}/cancel`, { notes }),

  sendQuote: (id: string, data: { amount: number; notes?: string }) =>
    api.post(`/bookings/${id}/quote`, data),
};

// Portal API
export const portalApi = {
  getMe: () => api.get('/portal/me'),
  updateMe: (data: RequestBody) => api.patch('/portal/me', data),
  getBookings: (params?: QueryParams) => api.get('/portal/bookings', { params }),
  getInvoices: (params?: QueryParams) => api.get('/portal/invoices', { params }),
  acceptQuote: (bookingId: string) => api.post(`/portal/bookings/${bookingId}/accept-quote`),
  rejectQuote: (bookingId: string, notes?: string) =>
    api.post(`/portal/bookings/${bookingId}/reject-quote`, { notes }),
};

// Customers API
export const customersApi = {
  getAll: (params?: QueryParams) =>
    api.get('/customers', { params }),

  getOne: (id: string) =>
    api.get(`/customers/${id}`),

  getStats: (id: string) =>
    api.get(`/customers/${id}/stats`),

  create: (data: RequestBody) =>
    api.post('/customers', data),

  update: (id: string, data: RequestBody) =>
    api.patch(`/customers/${id}`, data),

  delete: (id: string) =>
    api.delete(`/customers/${id}`),
};

// Services API
export const servicesApi = {
  getAll: (params?: QueryParams) =>
    api.get('/services', { params }),

  getOne: (id: string) =>
    api.get(`/services/${id}`),

  getStats: (id: string) =>
    api.get(`/services/${id}/stats`),

  create: (data: RequestBody) =>
    api.post('/services', data),

  update: (id: string, data: RequestBody) =>
    api.patch(`/services/${id}`, data),

  toggleActive: (id: string) =>
    api.patch(`/services/${id}/toggle-active`),

  reorder: (serviceIds: string[]) =>
    api.post('/services/reorder', { serviceIds }),

  delete: (id: string) =>
    api.delete(`/services/${id}`),
};

// Invoices API
export const invoicesApi = {
  getAll: (params?: QueryParams) =>
    api.get('/invoices', { params }),

  getStats: () =>
    api.get('/invoices/stats'),

  getOne: (id: string) =>
    api.get(`/invoices/${id}`),

  downloadPdf: (id: string) =>
    api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),

  create: (data: RequestBody) =>
    api.post('/invoices', data),

  update: (id: string, data: RequestBody) =>
    api.patch(`/invoices/${id}`, data),

  send: (id: string) =>
    api.post(`/invoices/${id}/send`),

  delete: (id: string) =>
    api.delete(`/invoices/${id}`),
};

// Payments API
export const paymentsApi = {
  getAll: (params?: QueryParams) =>
    api.get('/payments', { params }),

  getStats: () =>
    api.get('/payments/stats'),

  getByInvoice: (invoiceId: string) =>
    api.get(`/payments/invoice/${invoiceId}`),

  getOne: (id: string) =>
    api.get(`/payments/${id}`),

  create: (data: RequestBody) =>
    api.post('/payments', data),

  delete: (id: string) =>
    api.delete(`/payments/${id}`),
};

// Portfolio API
export const portfolioApi = {
  getAll: (params?: QueryParams) =>
    api.get('/portfolio', { params }),

  getPublic: (studioId: string) =>
    api.get(`/portfolio/studio/${studioId}`),

  getCategories: () =>
    api.get('/portfolio/categories'),

  getOne: (id: string) =>
    api.get(`/portfolio/${id}`),

  create: (data: RequestBody) =>
    api.post('/portfolio', data),

  update: (id: string, data: RequestBody) =>
    api.patch(`/portfolio/${id}`, data),

  toggleVisibility: (id: string) =>
    api.patch(`/portfolio/${id}/toggle-visibility`),

  reorder: (itemIds: string[]) =>
    api.post('/portfolio/reorder', { itemIds }),

  delete: (id: string) =>
    api.delete(`/portfolio/${id}`),
};

export const analyticsApi = {
  getOverview: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/analytics/overview', { params }),

  getRevenue: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/analytics/revenue', { params }),

  getBookingsByStatus: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/analytics/bookings-by-status', { params }),

  getServicePerformance: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/analytics/service-performance', { params }),

  getCustomerInsights: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/analytics/customer-insights', { params }),
};

export const uploadApi = {
  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadPortfolioImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/portfolio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadServiceCover: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/service-cover', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Admin API (Super Admin panel)
export const adminApi = {
  // Studios
  getStudios: (params?: { page?: number; limit?: number; status?: string; tier?: string }) =>
    api.get('/admin/studios', { params }),

  getStudio: (id: string) =>
    api.get(`/admin/studios/${id}`),

  createStudio: (data: {
    studioName: string;
    slug: string;
    studioEmail: string;
    studioPhone: string;
    ownerName: string;
    ownerEmail: string;
    ownerPassword: string;
    subscriptionTier?: string;
    brandingConfig?: Record<string, unknown>;
    defaultTerms?: string;
  }) => api.post('/admin/studios', data),

  updateStudio: (id: string, data: {
    name?: string;
    email?: string;
    phone?: string;
    status?: string;
    subscriptionTier?: string;
    defaultTerms?: string;
    brandingConfig?: Record<string, unknown>;
  }) => api.patch(`/admin/studios/${id}`, data),

  suspendStudio: (id: string, reason?: string) =>
    api.post(`/admin/studios/${id}/suspend`, { reason }),

  activateStudio: (id: string) =>
    api.post(`/admin/studios/${id}/activate`),

  deleteStudio: (id: string) =>
    api.delete(`/admin/studios/${id}`),

  // Analytics
  getAnalytics: () =>
    api.get('/admin/analytics'),

  getActivities: (limit?: number) =>
    api.get('/admin/activities', { params: { limit } }),
};
