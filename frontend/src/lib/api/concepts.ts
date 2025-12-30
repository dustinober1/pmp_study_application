import type {
  ConceptDetails,
  ConceptDomainInfo,
  ConceptGraphResponse,
  ConceptListResponse,
  ConceptCategoryInfo,
  LearningPath,
} from '@/types';

/**
 * Load concepts from static JSON file
 */
async function loadConceptData() {
  const res = await fetch('/data/concepts.json');
  if (!res.ok) {
    throw new Error('Failed to load concepts data');
  }
  return await res.json();
}

/**
 * Get the full concept knowledge graph
 */
export async function getConceptGraph(): Promise<ConceptGraphResponse> {
  const data = await loadConceptData();

  // Extract unique categories from nodes
  const categories = Array.from(
    new Set(data.nodes.map((n: { category: string }) => n.category))
  ).filter(Boolean);

  return {
    nodes: data.nodes,
    links: data.links,
    relationship_types: data.relationship_types || {},
    categories,
  };
}

/**
 * Get a list of all concepts
 */
export async function getConcepts(): Promise<ConceptListResponse> {
  const data = await loadConceptData();

  return {
    concepts: data.nodes,
    count: data.nodes.length,
  };
}

/**
 * Get detailed information about a specific concept
 */
export async function getConceptDetails(conceptId: number): Promise<ConceptDetails> {
  const data = await loadConceptData();
  const concept = data.nodes.find((n: { id: number }) => n.id === conceptId);

  if (!concept) {
    throw new Error(`Concept ${conceptId} not found`);
  }

  // Find related concepts
  const outgoingRelationships = data.links
    .filter((l: { source: number }) => l.source === conceptId)
    .map((l: { target: number; type: string; strength: number }) => ({
      target_id: l.target,
      relationship_type: l.type,
      strength: l.strength,
    }));

  const incomingRelationships = data.links
    .filter((l: { target: number }) => l.target === conceptId)
    .map((l: { source: number; type: string; strength: number }) => ({
      source_id: l.source,
      relationship_type: l.type,
      strength: l.strength,
    }));

  return {
    id: concept.id,
    name: concept.name,
    description: concept.description,
    category: concept.category,
    domain_focus: concept.domain_focus,
    created_at: new Date().toISOString(),
    flashcard_count: concept.flashcard_count,
    question_count: concept.question_count,
    mastery: concept.mastery_level,
    outgoing_relationships: outgoingRelationships,
    incoming_relationships: incomingRelationships,
    related_flashcards: [],
    related_questions: [],
  };
}

/**
 * Get a subgraph centered on a specific concept (Mocked)
 */
export async function getConceptSubgraph(
  _conceptId: number
): Promise<ConceptGraphResponse> {
  if (_conceptId) { /* ignore */ }
  return {
    nodes: [],
    links: [],
    relationship_types: {},
    categories: [],
  };
}

/**
 * Find a learning path between two concepts (Mocked)
 */
export async function getLearningPath(
  _conceptId: number,
  _targetConceptId: number
): Promise<LearningPath> {
  if (_conceptId || _targetConceptId) { /* ignore */ }
  return {
    path: [],
    length: 0,
  };
}

/**
 * Get flashcards for a specific concept (Mocked)
 */
export async function getConceptFlashcards(
  _conceptId: number
) {
  if (_conceptId) { /* ignore */ }
  return { items: [], total: 0 };
}

/**
 * Get questions for a specific concept (Mocked)
 */
export async function getConceptQuestions(
  _conceptId: number
) {
  if (_conceptId) { /* ignore */ }
  return { items: [], total: 0 };
}

/**
 * Get all concept categories (Mocked)
 */
export async function getConceptCategories(): Promise<{ categories: ConceptCategoryInfo[] }> {
  return { categories: [] };
}

/**
 * Get all domains that have concepts (Mocked)
 */
export async function getConceptDomains(): Promise<{ domains: ConceptDomainInfo[] }> {
  return { domains: [] };
}

/**
 * Search for concepts (Mocked)
 */
export async function searchConcepts(_query: string): Promise<ConceptListResponse> {
  if (_query) { /* ignore */ }
  return { concepts: [], count: 0 };
}
