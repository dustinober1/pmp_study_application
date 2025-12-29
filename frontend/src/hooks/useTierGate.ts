'use client';

import { useState, useCallback } from 'react';
import TierGate, { isTierLimitError, type LimitErrorDetail, type ApiError } from '@/components/TierGate';

/**
 * Hook to handle tier limit errors and show the TierGate modal
 *
 * Usage:
 * ```tsx
 * const { showTierGate, TierGateModal, handleTierError } = useTierGate();
 *
 * // In your try/catch
 * try {
 *   await apiCall();
 * } catch (error) {
 *   handleTierError(error);
 * }
 *
 * // Render the modal
 * {TierGateModal}
 * ```
 */
export function useTierGate() {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<(ApiError & { detail?: LimitErrorDetail | string }) | undefined>(undefined);

  const showTierGate = useCallback((err?: (ApiError & { detail?: LimitErrorDetail | string })) => {
    setError(err);
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    // Don't clear error immediately to prevent flicker if reopened quickly
    setTimeout(() => setError(undefined), 300);
  }, []);

  const handleUpgrade = useCallback(() => {
    // Navigate to pricing/upgrade page
    // This can be customized based on routing setup
    window.location.href = '/pricing?from=tier_gate';
  }, []);

  /**
   * Check if an error is a tier limit error and show the gate if so
   * Returns true if the error was handled (was a tier error), false otherwise
   */
  const handleTierError = useCallback((error: unknown): boolean => {
    if (isTierLimitError(error)) {
      showTierGate(error);
      return true;
    }
    return false;
  }, [showTierGate]);

  const TierGateModal = (
    <TierGate
      isOpen={isOpen}
      onClose={handleClose}
      error={error}
      onUpgrade={handleUpgrade}
    />
  );

  return {
    showTierGate,
    closeTierGate: handleClose,
    handleTierError,
    TierGateModal,
  };
}

/**
 * Hook to wrap async API calls with tier limit error handling
 *
 * Usage:
 * ```tsx
 * const { withTierCheck } = useTierGuard();
 *
 * const result = await withTierCheck(() => someApiCall());
 * // If the API call fails with a tier limit error, the gate will show automatically
 * ```
 */
export function useTierGuard() {
  const { handleTierError, closeTierGate } = useTierGate();

  /**
   * Wrap an async function with tier limit error handling
   */
  const withTierCheck = useCallback(async <T,>(
    fn: () => Promise<T>,
    onNonTierError?: (error: unknown) => void
  ): Promise<T | null> => {
    try {
      return await fn();
    } catch (error) {
      if (handleTierError(error)) {
        // Error was handled by tier gate
        return null;
      }
      // Re-throw or handle other errors
      if (onNonTierError) {
        onNonTierError(error);
        return null;
      }
      throw error;
    }
  }, [handleTierError]);

  return {
    withTierCheck,
    closeTierGate,
  };
}

/**
 * Higher-order function to wrap SWR fetcher with tier gate handling
 *
 * Usage:
 * ```tsx
 * import useSWR from 'swr';
 * import { createTierAwareFetcher } from '@/hooks/useTierGate';
 * import { fetcher } from '@/lib/api';
 *
 * const tierAwareFetcher = createTierAwareFetcher();
 * const { data, error } = useSWR('/api/flashcards', tierAwareFetcher);
 * ```
 */
export function createTierAwareFetcher<T>() {
  const { handleTierError } = useTierGate();

  return async (url: string): Promise<T> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${url}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Anonymous-ID': localStorage.getItem('pmp_anonymous_id') || '',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        const error = new Error(errorData.detail || 'An error occurred') as Error & { data?: typeof errorData };
        error.data = errorData;

        // Check if this is a tier limit error
        if (handleTierError(error)) {
          // Return a promise that never resolves to prevent SWR from retrying
          return new Promise(() => {}) as T;
        }

        throw error;
      }

      return response.json();
    } catch (error) {
      if (handleTierError(error)) {
        return new Promise(() => {}) as T;
      }
      throw error;
    }
  };
}
