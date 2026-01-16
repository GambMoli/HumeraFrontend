import { create } from 'zustand';
import { User } from '../types/auth.types';
import { authApi } from '../api/auth';

interface AuthState {
  username: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  initializeAuth: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  username: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login({ email, password });
      localStorage.setItem('token', response.token);
      set({
        username: response.user,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Error al iniciar sesión',
        isLoading: false,
      });
      throw error;
    }
  },

  register: async (email: string, password: string, username?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.register({ email, password, username });
      localStorage.setItem('token', response.token);
      set({
        username: response.username,
        token: response.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Error al registrarse',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({
      username: null,
      token: null,
      isAuthenticated: false,
    });
  },

  initializeAuth: () => {
    const token = localStorage.getItem('token');
    if (token) {
      set({ token, isAuthenticated: true });
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));