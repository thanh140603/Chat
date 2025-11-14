// Stores - AuthStore
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  email?: string;
  bio?: string;
  phone?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (user: User) => void;
  logout: () => void;
  updateUser: (partial: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      
      login: (user) => set({ user, isAuthenticated: true, error: null }),
      logout: () => set({ user: null, isAuthenticated: false, error: null }),
      updateUser: (partial) => set((state) => ({
        user: state.user ? { ...state.user, ...partial } : state.user
      })),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
