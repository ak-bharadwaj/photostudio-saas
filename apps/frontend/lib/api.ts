import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Use a shorter timeout during build phase if the API is likely unreachable (localhost)
// to prevent long build delays on Vercel.
const isBuildPhase = typeof window === 'undefined' && process.env.NODE_ENV === 'production';
const apiTimeout = isBuildPhase ? 1000 : 15000;

export const api = axios.create({
  baseURL: API_URL,
  timeout: apiTimeout,
  withCredentials: true,
});

// Safe localStorage accessor — returns null during SSR / server components
function getItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = localStorage.getItem(key);
    // Handle edge cases where storage might have string literals like "null" or "undefined"
    if (value === null || value === 'null' || value === 'undefined') return null;
    return value;
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

// Request interceptor to add auth token and CSRF token
api.interceptors.request.use(
  (config) => {
    // 1. Auth Token
    const token = getItem('accessToken');
    if (token && token.length > 10) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 2. CSRF Token (read from cache or cookie for non-safe methods)
    if (typeof window !== 'undefined' && config.method && !['get', 'head', 'options'].includes(config.method.toLowerCase())) {
      // Prioritize header-based token (works cross-domain) over cookie (same-domain only)
      const cachedCsrf = getItem('csrfToken');
      const cookieCsrf = document.cookie
        .split('; ')
        .find((row) => row.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];

      const xsrfToken = cachedCsrf || cookieCsrf;

      if (xsrfToken) {
        config.headers['x-xsrf-token'] = xsrfToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor to handle token refresh and CSRF caching
api.interceptors.response.use(
  (response) => {
    // Catch CSRF from header (reliable cross-domain)
    const csrfFromHeader = response.headers['x-csrf-token'];
    if (csrfFromHeader) {
      setItem('csrfToken', csrfFromHeader);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle session expired / invalid token
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

    // If 403 and not already retried — may be caused by an expired access token hitting a
    // RolesGuard before the JWT strategy throws (backend returns 403 instead of 401).
    // Attempt a silent token refresh and retry once. Do NOT redirect on failure — a real
    // permission denial (e.g. non-owner hitting an owner route) should propagate as-is.
    if (error.response?.status === 403 && !originalRequest._retry) {
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
      } catch {
        // Refresh failed — let the original 403 propagate
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
  login: (data: { email?: string; phone?: string; password: string }) =>
    api.post('/auth/login', data),

  adminLogin: (email: string, password: string) =>
    api.post('/auth/admin/login', { email, password }),

  register: (data: RequestBody) =>
    api.post('/auth/register', data),

  customerRegister: (data: { name: string; email?: string; phone?: string; password: string }) =>
    api.post('/auth/register/customer', data),

  logout: () =>
    api.post('/auth/logout'),

  me: () =>
    api.get('/auth/me'),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.patch('/auth/change-password', data),
};

// Partners API
export const partnersApi = {
  getAll: (params?: QueryParams) =>
    api.get('/studios', { params }), // Keeping the endpoint string for now unless I'm sure backend is updated

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
  negotiateQuote: (bookingId: string, notes: string) =>
    api.post(`/portal/bookings/${bookingId}/negotiate`, { notes }),
  createReview: (bookingId: string, data: { rating: number; comment?: string }) =>
    api.post(`/portal/bookings/${bookingId}/review`, data),
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
    return api.post('/upload/logo', formData);
  },

  uploadPortfolioImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/portfolio', formData);
  },

  uploadServiceCover: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/service-cover', formData);
  },
};

// Admin API (Super Admin panel)
export const adminApi = {
  // Partners
  getPartners: (params?: { page?: number; limit?: number; status?: string; tier?: string; search?: string }) =>
    api.get('/admin/studios', { params }),

  getPartner: (id: string) =>
    api.get(`/admin/studios/${id}`),

  createPartner: (data: {
    studioName: string;
    slug: string;
    studioEmail: string;
    studioPhone: string;
    ownerName: string;
    ownerEmail: string;
    ownerPassword: string;
    subscriptionTier?: string;
    subscriptionDurationDays?: number;
    brandingConfig?: Record<string, unknown>;
    defaultTerms?: string;
  }) => api.post('/admin/studios', data),

  updatePartner: (id: string, data: {
    name?: string;
    slug?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    website?: string;
    description?: string;
    status?: string;
    subscriptionTier?: string;
    defaultTerms?: string;
    brandingConfig?: Record<string, unknown>;
    isRecommended?: boolean;
    subscriptionExpiresAt?: string;
  }) => api.patch(`/admin/studios/${id}`, data),

  suspendPartner: (id: string, reason?: string) =>
    api.post(`/admin/studios/${id}/suspend`, { reason }),

  activatePartner: (id: string) =>
    api.post(`/admin/studios/${id}/activate`),

  deletePartner: (id: string) =>
    api.delete(`/admin/studios/${id}`),

  // Analytics
  getAnalytics: () =>
    api.get('/admin/analytics'),

  getActivities: (limit?: number) =>
    api.get('/admin/activities', { params: { limit } }),
};

// Marketplace API
export const marketplaceApi = {
  search: (params?: { q?: string; categoryId?: string; location?: string; isRecommended?: boolean; uniquePerStudio?: boolean; limit?: number; offset?: number }) =>
    api.get('/public/marketplace/search', { params }),

  getStudios: (params?: { location?: string; isRecommended?: boolean; limit?: number; offset?: number }) =>
    api.get('/public/marketplace/studios', { params }),

  getCategories: () =>
    api.get('/public/marketplace/categories'),

  getLocations: () =>
    api.get('/public/marketplace/locations'),

  getReviews: (limit?: number) =>
    api.get('/public/marketplace/reviews', { params: { limit } }),

  getService: (id: string) =>
    api.get(`/public/services/${id}`),

  submitStudioRequest: (data: {
    studioName: string;
    ownerName: string;
    email: string;
    phone?: string;
    city?: string;
    notes?: string;
  }) => api.post('/studio-requests', data),
};

// Public (Guest) API for single studio pages
export const publicApi = {
  getStudio: (slug: string) =>
    api.get(`/public/studios/${slug}`),

  getAvailableSlots: (slug: string, serviceId: string, date: string) =>
    api.get(`/public/studios/${slug}/services/${serviceId}/available-slots`, { params: { date } }),

  createBooking: (slug: string, data: RequestBody) =>
    api.post(`/public/studios/${slug}/bookings`, data),
};

// Reviews API (studio-side management)
export const reviewsApi = {
  // Get all reviews for the authenticated studio
  getAll: (params?: QueryParams) =>
    api.get('/reviews', { params }),

  // Get single review
  getOne: (id: string) =>
    api.get(`/reviews/${id}`),

  // Reply to a review
  reply: (id: string, reply: string) =>
    api.patch(`/reviews/${id}/reply`, { reply }),

  // Toggle visibility of a review
  toggleVisibility: (id: string) =>
    api.patch(`/reviews/${id}/toggle-visibility`),

  // Delete a review
  delete: (id: string) =>
    api.delete(`/reviews/${id}`),
};
