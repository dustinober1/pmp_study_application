/**
 * SWR hooks for Concept Graph API
 */

import useSWR from 'swr';
import { fetcher } from './client';
import type {
  ConceptDetails,
  ConceptDomainInfo,
  ConceptGraphResponse,
  ConceptListResponse,
  ConceptCategoryInfo,
  LearningPath,
  ConceptDomain,
  ConceptCategory,
} from '@/types';

// ============ Concept Graph Hooks ============

interface ConceptGraphParams {
  domain?: ConceptDomain;
  min_strength?: number;
}

export function useConceptGraph(params?: ConceptGraphParams) {
  const queryParams = new URLSearchParams();
  if (params?.domain) queryParams.set('domain', params.domain);
  if (params?.min_strength !== undefined) {
    queryParams.set('min_strength', params.min_strength.toString());
  }

  const queryString = queryParams.toString();
  const url = `/api/concepts/graph${queryString ? `?${queryString}` : ''}`;

  return useSWR<ConceptGraphResponse>(url, fetcher);
}

interface ConceptListParams {
  domain?: ConceptDomain;
  category?: ConceptCategory;
  search?: string;
}

export function useConcepts(params?: ConceptListParams) {
  const queryParams = new URLSearchParams();
  if (params?.domain) queryParams.set('domain', params.domain);
  if (params?.category) queryParams.set('category', params.category);
  if (params?.search) queryParams.set('search', params.search);

  const queryString = queryParams.toString();
  const url = `/api/concepts${queryString ? `?${queryString}` : ''}`;

  return useSWR<ConceptListResponse>(url, fetcher);
}

export function useConceptDetails(conceptId: number | undefined) {
  return useSWR<ConceptDetails>(
    conceptId ? `/api/concepts/${conceptId}` : null,
    fetcher
  );
}

interface ConceptSubgraphParams {
  max_depth?: number;
}

export function useConceptSubgraph(
  conceptId: number | undefined,
  params?: ConceptSubgraphParams
) {
  const queryParams = new URLSearchParams();
  if (params?.max_depth !== undefined) {
    queryParams.set('max_depth', params.max_depth.toString());
  }

  const queryString = queryParams.toString();
  const url = conceptId
    ? `/api/concepts/${conceptId}/subgraph${queryString ? `?${queryString}` : ''}`
    : null;

  return useSWR<ConceptGraphResponse>(url, fetcher);
}

export function useLearningPath(
  fromConceptId: number | undefined,
  toConceptId: number | undefined
) {
  const url = fromConceptId && toConceptId
    ? `/api/concepts/${fromConceptId}/path?target_concept_id=${toConceptId}`
    : null;

  return useSWR<LearningPath>(url, fetcher);
}

export function useConceptFlashcards(
  conceptId: number | undefined,
  params?: { limit?: number; offset?: number }
) {
  const queryParams = new URLSearchParams();
  if (params?.limit !== undefined) queryParams.set('limit', params.limit.toString());
  if (params?.offset !== undefined) queryParams.set('offset', params.offset.toString());

  const queryString = queryParams.toString();
  const url = conceptId
    ? `/api/concepts/${conceptId}/flashcards${queryString ? `?${queryString}` : ''}`
    : null;

  return useSWR(url, fetcher);
}

export function useConceptQuestions(
  conceptId: number | undefined,
  params?: { limit?: number; offset?: number }
) {
  const queryParams = new URLSearchParams();
  if (params?.limit !== undefined) queryParams.set('limit', params.limit.toString());
  if (params?.offset !== undefined) queryParams.set('offset', params.offset.toString());

  const queryString = queryParams.toString();
  const url = conceptId
    ? `/api/concepts/${conceptId}/questions${queryString ? `?${queryString}` : ''}`
    : null;

  return useSWR(url, fetcher);
}

export function useConceptCategories() {
  return useSWR<{ categories: ConceptCategoryInfo[] }>('/api/concepts/categories', fetcher);
}

export function useConceptDomains() {
  return useSWR<{ domains: ConceptDomainInfo[] }>('/api/concepts/domains', fetcher);
}

export function useConceptSearch(query: string, limit = 10) {
  return useSWR<ConceptListResponse>(
    query ? `/api/concepts/search/${query}?limit=${limit}` : null,
    fetcher
  );
}
