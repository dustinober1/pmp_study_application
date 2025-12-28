/**
 * Zustand store for user state management
 * Handles anonymous user sessions and optional registration
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types';

interface UserState {
  // User data
  user: User | null;
  anonymousId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setAnonymousId: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  initializeAnonymousUser: () => string;
  logout: () => void;
  reset: () => void;
}

const ANONYMOUS_ID_KEY = 'pmp_anonymous_id';

const initialState = {
  user: null,
  anonymousId: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (user) => {
        set({
          user,
          isAuthenticated: user !== null && user.email !== null,
        });
      },

      setAnonymousId: (id) => {
        set({ anonymousId: id });
        // Also store in localStorage for API client access
        if (typeof window !== 'undefined') {
          localStorage.setItem(ANONYMOUS_ID_KEY, id);
        }
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      setError: (error) => {
        set({ error });
      },

      initializeAnonymousUser: () => {
        const { anonymousId } = get();

        if (anonymousId) {
          return anonymousId;
        }

        // Check localStorage first
        if (typeof window !== 'undefined') {
          const storedId = localStorage.getItem(ANONYMOUS_ID_KEY);
          if (storedId) {
            set({ anonymousId: storedId });
            return storedId;
          }
        }

        // Generate new anonymous ID
        const newId = crypto.randomUUID();
        set({ anonymousId: newId });

        if (typeof window !== 'undefined') {
          localStorage.setItem(ANONYMOUS_ID_KEY, newId);
        }

        return newId;
      },

      logout: () => {
        // Clear user but keep anonymous ID for data continuity
        set({
          user: null,
          isAuthenticated: false,
          error: null,
        });
      },

      reset: () => {
        // Full reset - clears everything including anonymous ID
        set(initialState);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(ANONYMOUS_ID_KEY);
        }
      },
    }),
    {
      name: 'pmp-user-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        anonymousId: state.anonymousId,
        user: state.user,
      }),
    }
  )
);

// Selector hooks for common use cases
export const useUser = () => useUserStore((state) => state.user);
export const useAnonymousId = () => useUserStore((state) => state.anonymousId);
export const useIsAuthenticated = () => useUserStore((state) => state.isAuthenticated);
export const useUserLoading = () => useUserStore((state) => state.isLoading);
export const useUserError = () => useUserStore((state) => state.error);
