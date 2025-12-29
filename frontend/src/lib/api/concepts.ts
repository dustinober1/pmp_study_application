/**
 * Concept Graph API endpoints
 *
 * Provides access to the PMP knowledge graph for exploring concept relationships
 */

import { fetcher } from './client';
import type {
  ConceptDetails,
  ConceptDomainInfo,
  ConceptGraphResponse,
  ConceptListResponse,
  ConceptCategoryInfo,
  LearningPath,
} from '@/types';

/**
 * Get the full concept knowledge graph
 */
export async function getConceptGraph(params?: {
  domain?: string;
  min_strength?: number;
}): Promise<ConceptGraphResponse> {
  const searchParams = new URLSearchParams();
  if (params?.domain) searchParams.set('domain', params.domain);
  if (params?.min_strength !== undefined) searchParams.set('min_strength', params.min_strength.toString());

  const query = searchParams.toString();
  return fetcher<ConceptGraphResponse>(`/api/concepts/graph${query ? `?${query}` : ''}`);
}

/**
 * Get a list of all concepts with optional filtering
 */
export async function getConcepts(params?: {
  domain?: string;
  category?: string;
  search?: string;
}): Promise<ConceptListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.domain) searchParams.set('domain', params.domain);
  if (params?.category) searchParams.set('category', params.category);
  if (params?.search) searchParams.set('search', params.search);

  const query = searchParams.toString();
  return fetcher<ConceptListResponse>(`/api/concepts${query ? `?${query}` : ''}`);
}

/**
 * Get detailed information about a specific concept
 */
export async function getConceptDetails(conceptId: number): Promise<ConceptDetails> {
  return fetcher<ConceptDetails>(`/api/concepts/${conceptId}`);
}

/**
 * Get a subgraph centered on a specific concept
 */
export async function getConceptSubgraph(
  conceptId: number,
  params?: { max_depth?: number }
): Promise<ConceptGraphResponse> {
  const searchParams = new URLSearchParams();
  if (params?.max_depth !== undefined) searchParams.set('max_depth', params.max_depth.toString());

  const query = searchParams.toString();
  return fetcher<ConceptGraphResponse>(
    `/api/concepts/${conceptId}/subgraph${query ? `?${query}` : ''}`
  );
}

/**
 * Find a learning path between two concepts
 */
export async function getLearningPath(
  conceptId: number,
  targetConceptId: number
): Promise<LearningPath> {
  return fetcher<LearningPath>(
    `/api/concepts/${conceptId}/path?target_concept_id=${targetConceptId}`
  );
}

/**
 * Get flashcards for a specific concept
 */
export async function getConceptFlashcards(
  conceptId: number,
  params?: { limit?: number; offset?: number }
) {
  const searchParams = new URLSearchParams();
  if (params?.limit !== undefined) searchParams.set('limit', params.limit.toString());
  if (params?.offset !== undefined) searchParams.set('offset', params.offset.toString());

  const query = searchParams.toString();
  return fetcher(
    `/api/concepts/${conceptId}/flashcards${query ? `?${query}` : ''}`
  );
}

/**
 * Get questions for a specific concept
 */
export async function getConceptQuestions(
  conceptId: number,
  params?: { limit?: number; offset?: number }
) {
  const searchParams = new URLSearchParams();
  if (params?.limit !== undefined) searchParams.set('limit', params.limit.toString());
  if (params?.offset !== undefined) searchParams.set('offset', params.offset.toString());

  const query = searchParams.toString();
  return fetcher(
    `/api/concepts/${conceptId}/questions${query ? `?${query}` : ''}`
  );
}

/**
 * Get all concept categories
 */
export async function getConceptCategories(): Promise<{ categories: ConceptCategoryInfo[] }> {
  return fetcher('/api/concepts/categories');
}

/**
 * Get all domains that have concepts
 */
export async function getConceptDomains(): Promise<{ domains: ConceptDomainInfo[] }> {
  return fetcher('/api/concepts/domains');
}

/**
 * Search for concepts
 */
export async function searchConcepts(query: string, limit = 10): Promise<ConceptListResponse> {
  return fetcher<ConceptListResponse>(`/api/concepts/search/${query}?limit=${limit}`);
}
