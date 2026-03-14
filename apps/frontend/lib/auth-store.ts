import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { authApi } from './api';

interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  studioId?: string;
  isAdmin?: boolean;
  studio?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    status: string;
    subscriptionExpiresAt?: string | null;
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (credentials: { email?: string; phone?: string; password: string }) => Promise<void>;
  customerRegister: (credentials: { name: string; email?: string; phone?: string; password: string }) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

// Safe localStorage helpers — no-ops during SSR
function storageGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(key); } catch { return null; }
}

function storageSet(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, value); } catch { /* quota/private mode */ }
}

function storageRemove(key: string): void {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (credentials: { email?: string; phone?: string; password: string }) => {
    try {
      set({ isLoading: true, error: null });

      const response = await authApi.login(credentials);
      const { accessToken, refreshToken, user, userType } = response.data;

      storageSet('accessToken', accessToken);
      storageSet('refreshToken', refreshToken);

      const userData: User =
        userType === 'admin' ? { ...user, isAdmin: true } : user;

      set({
        user: userData,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: unknown) {
      const e = error as { response?: { data?: { message?: string } } };
      set({
        error: e.response?.data?.message || 'Login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  customerRegister: async (credentials: { name: string; email?: string; phone?: string; password: string }) => {
    try {
      set({ isLoading: true, error: null });

      const response = await authApi.customerRegister(credentials);
      const { accessToken, refreshToken, user, userType } = response.data;

      storageSet('accessToken', accessToken);
      storageSet('refreshToken', refreshToken);

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: unknown) {
      const e = error as { response?: { data?: { message?: string } } };
      set({
        error: e.response?.data?.message || 'Registration failed',
        isLoading: false,
      });
      throw error;
    }
  },

  adminLogin: async (email: string, password: string) => {
    return get().login({ email, password });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore logout errors — clean up locally regardless */
    } finally {
      storageRemove('accessToken');
      storageRemove('refreshToken');
      storageRemove('csrfToken');
      set({ user: null, isAuthenticated: false });
    }
  },

  loadUser: async () => {
    const token = storageGet('accessToken');
    if (!token) {
      set({ isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      set({ isLoading: true });
      const response = await authApi.me();
      const userData: User = response.data.user || response.data;
      set({ user: userData, isAuthenticated: true, isLoading: false });
    } catch {
      storageRemove('accessToken');
      storageRemove('refreshToken');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
