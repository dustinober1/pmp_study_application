/**
 * Zustand store for user state management
 * Handles anonymous user sessions, optional registration, and tier management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types';

export type Tier = 'public' | 'free' | 'premium';

interface UserState {
  // User data
  user: User | null;
  anonymousId: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Tier state
  tier: Tier;
  premiumExpiresAt: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setAnonymousId: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setTier: (tier: Tier, expiresAt?: string | null) => void;
  initializeAnonymousUser: () => string;
  logout: () => void;
  reset: () => void;

  // Tier access helpers
  canAccessFullExam: () => boolean;
  canAccessExamCoach: () => boolean;
  canAccessAdaptiveExplanations: () => boolean;
  canAccessStudyRoadmap: () => boolean;
  canAccessConceptGraph: () => boolean;
  canAccessMicroLearning: () => boolean;
  isPremiumActive: () => boolean;
  getTierDisplay: () => { name: string; color: string; bgColor: string };
}

const ANONYMOUS_ID_KEY = 'pmp_anonymous_id';

const initialState = {
  user: null,
  anonymousId: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  tier: 'public' as Tier,
  premiumExpiresAt: null as string | null,
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (user) => {
        set({
          user,
          isAuthenticated: user !== null && user.email !== null,
          // Determine tier based on user state
          tier: user?.email ? 'free' : 'public',
        });
      },

      setToken: (token) => {
        if (typeof window !== 'undefined') {
          if (token) {
            localStorage.setItem('pmp_auth_token', token);
          } else {
            localStorage.removeItem('pmp_auth_token');
          }
        }
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

      setTier: (tier, expiresAt = null) => {
        set({ tier, premiumExpiresAt: expiresAt });
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
          tier: 'public',
          premiumExpiresAt: null,
        });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('pmp_auth_token');
        }
      },

      reset: () => {
        // Full reset - clears everything including anonymous ID
        set(initialState);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(ANONYMOUS_ID_KEY);
        }
      },

      // Tier access helpers
      canAccessFullExam: () => true,
      canAccessExamCoach: () => true,
      canAccessAdaptiveExplanations: () => true,
      canAccessStudyRoadmap: () => true,
      canAccessConceptGraph: () => true,
      canAccessMicroLearning: () => true,
      isPremiumActive: () => true,
      getTierDisplay: () => ({ name: 'Open', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30' }),
    }),
    {
      name: 'pmp-user-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        anonymousId: state.anonymousId,
        user: state.user,
        tier: state.tier,
        premiumExpiresAt: state.premiumExpiresAt,
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
export const useUserTier = () => useUserStore((state) => state.tier);
export const useIsPremium = () => useUserStore((state) => state.isPremiumActive());
export const useTierDisplay = () => useUserStore((state) => state.getTierDisplay());
