import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data;
          localStorage.setItem('accessToken', accessToken);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  adminLogin: (email: string, password: string) =>
    api.post('/auth/admin/login', { email, password }),
  
  register: (data: any) =>
    api.post('/auth/register', data),
  
  logout: () =>
    api.post('/auth/logout'),
  
  me: () =>
    api.get('/auth/me'),
};

// Studios API
export const studiosApi = {
  getAll: (params?: any) =>
    api.get('/studios', { params }),
  
  getOne: (id: string) =>
    api.get(`/studios/${id}`),
  
  getBySlug: (slug: string) =>
    api.get(`/studios/slug/${slug}`),
  
  getStats: (id: string) =>
    api.get(`/studios/${id}/stats`),
  
  create: (data: any) =>
    api.post('/studios', data),
  
  update: (id: string, data: any) =>
    api.patch(`/studios/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/studios/${id}`),
};

// Bookings API
export const bookingsApi = {
  getAll: (params?: any) =>
    api.get('/bookings', { params }),
  
  getUpcoming: (params?: any) =>
    api.get('/bookings/upcoming', { params }),
  
  getOne: (id: string) =>
    api.get(`/bookings/${id}`),
  
  create: (data: any) =>
    api.post('/bookings', data),
  
  update: (id: string, data: any) =>
    api.patch(`/bookings/${id}`, data),
  
  updateStatus: (id: string, data: any) =>
    api.patch(`/bookings/${id}/status`, data),
  
  cancel: (id: string, notes?: string) =>
    api.patch(`/bookings/${id}/cancel`, { notes }),
};

// Customers API
export const customersApi = {
  getAll: (params?: any) =>
    api.get('/customers', { params }),
  
  getOne: (id: string) =>
    api.get(`/customers/${id}`),
  
  getStats: (id: string) =>
    api.get(`/customers/${id}/stats`),
  
  create: (data: any) =>
    api.post('/customers', data),
  
  update: (id: string, data: any) =>
    api.patch(`/customers/${id}`, data),
  
  delete: (id: string) =>
    api.delete(`/customers/${id}`),
};

// Services API
export const servicesApi = {
  getAll: (params?: any) =>
    api.get('/services', { params }),
  
  getOne: (id: string) =>
    api.get(`/services/${id}`),
  
  getStats: (id: string) =>
    api.get(`/services/${id}/stats`),
  
  create: (data: any) =>
    api.post('/services', data),
  
  update: (id: string, data: any) =>
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
  getAll: (params?: any) =>
    api.get('/invoices', { params }),
  
  getStats: () =>
    api.get('/invoices/stats'),
  
  getOne: (id: string) =>
    api.get(`/invoices/${id}`),
  
  downloadPdf: (id: string) =>
    api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
  
  create: (data: any) =>
    api.post('/invoices', data),
  
  update: (id: string, data: any) =>
    api.patch(`/invoices/${id}`, data),
  
  send: (id: string) =>
    api.post(`/invoices/${id}/send`),
  
  delete: (id: string) =>
    api.delete(`/invoices/${id}`),
};

// Payments API
export const paymentsApi = {
  getAll: (params?: any) =>
    api.get('/payments', { params }),
  
  getStats: () =>
    api.get('/payments/stats'),
  
  getByInvoice: (invoiceId: string) =>
    api.get(`/payments/invoice/${invoiceId}`),
  
  getOne: (id: string) =>
    api.get(`/payments/${id}`),
  
  create: (data: any) =>
    api.post('/payments', data),
  
  delete: (id: string) =>
    api.delete(`/payments/${id}`),
};

// Portfolio API
export const portfolioApi = {
  getAll: (params?: any) =>
    api.get('/portfolio', { params }),
  
  getPublic: (studioId: string) =>
    api.get(`/portfolio/studio/${studioId}`),
  
  getCategories: () =>
    api.get('/portfolio/categories'),
  
  getOne: (id: string) =>
    api.get(`/portfolio/${id}`),
  
  create: (data: any) =>
    api.post('/portfolio', data),
  
  update: (id: string, data: any) =>
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
};

