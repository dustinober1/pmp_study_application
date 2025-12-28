/**
 * API Client configuration and base fetcher for SWR
 */

import type { ApiError } from '@/types';

// API base URL - defaults to localhost in development
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Storage key for anonymous user ID
export const ANONYMOUS_ID_KEY = 'pmp_anonymous_id';

/**
 * Get or create anonymous user ID from localStorage
 */
export function getAnonymousId(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  let anonymousId = localStorage.getItem(ANONYMOUS_ID_KEY);

  if (!anonymousId) {
    anonymousId = crypto.randomUUID();
    localStorage.setItem(ANONYMOUS_ID_KEY, anonymousId);
  }

  return anonymousId;
}

/**
 * Build headers for API requests
 */
export function buildHeaders(additionalHeaders?: Record<string, string>): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...additionalHeaders,
  };

  const anonymousId = getAnonymousId();
  if (anonymousId) {
    headers['X-Anonymous-ID'] = anonymousId;
  }

  // Add Bearer token if it exists
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('pmp_auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  return headers;
}

/**
 * Custom error class for API errors
 */
export class ApiClientError extends Error {
  status: number;
  data: ApiError;

  constructor(message: string, status: number, data: ApiError) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Base fetcher function for SWR
 * Handles JSON parsing and error responses
 */
export async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers: buildHeaders(),
  });

  if (!response.ok) {
    let errorData: ApiError;
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: response.statusText };
    }
    throw new ApiClientError(
      errorData.detail || 'An error occurred',
      response.status,
      errorData
    );
  }

  return response.json();
}

/**
 * POST request helper
 */
export async function post<T, R>(url: string, data: T): Promise<R> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorData: ApiError;
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: response.statusText };
    }
    throw new ApiClientError(
      errorData.detail || 'An error occurred',
      response.status,
      errorData
    );
  }

  return response.json();
}

/**
 * PUT request helper
 */
export async function put<T, R>(url: string, data: T): Promise<R> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: 'PUT',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorData: ApiError;
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: response.statusText };
    }
    throw new ApiClientError(
      errorData.detail || 'An error occurred',
      response.status,
      errorData
    );
  }

  return response.json();
}

/**
 * PATCH request helper
 */
export async function patch<T, R>(url: string, data: T): Promise<R> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: 'PATCH',
    headers: buildHeaders(),
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    let errorData: ApiError;
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: response.statusText };
    }
    throw new ApiClientError(
      errorData.detail || 'An error occurred',
      response.status,
      errorData
    );
  }

  return response.json();
}

/**
 * DELETE request helper
 */
export async function del<R>(url: string): Promise<R> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    method: 'DELETE',
    headers: buildHeaders(),
  });

  if (!response.ok) {
    let errorData: ApiError;
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: response.statusText };
    }
    throw new ApiClientError(
      errorData.detail || 'An error occurred',
      response.status,
      errorData
    );
  }

  return response.json();
}
