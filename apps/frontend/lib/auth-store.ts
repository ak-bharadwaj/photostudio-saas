import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { authApi } from './api';

interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
  studioId?: string;
  isAdmin?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore: UseBoundStore<StoreApi<AuthState>> = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const response = await authApi.login(email, password);
      const { accessToken, refreshToken, user, userType } = response.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      // Handle the unified user object from the backend
      const userData = userType === 'admin' ? { ...user, isAdmin: true } : user;

      set({
        user: userData,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  adminLogin: async (email: string, password: string) => {
    // Redirect to the unified login
    const store = useAuthStore.getState();
    return store.login(email, password);
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({
        user: null,
        isAuthenticated: false,
      });
    }
  },

  loadUser: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      set({ isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      set({ isLoading: true });
      const response = await authApi.me();
      const userData = response.data.user || response.data;
      set({
        user: userData,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
