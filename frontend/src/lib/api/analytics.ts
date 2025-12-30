// ============ Imports ============

import { storage } from './client';

// ============ Types ============

/** Domain performance classification */
export type DomainClassification = 'strong' | 'weak' | 'neutral';

/** Performance metrics for a single domain */
export interface DomainPerformanceMetric {
  domain_id: number;
  accuracy: number;
  count: number;
  avg_response_time: number | null;
}

/** Performance metrics for a single task */
export interface TaskPerformanceMetric {
  task_id: number;
  task_name: string;
  domain_id: number;
  accuracy: number;
  question_count: number;
  avg_response_time: number | null;
}

/** Domain performance summary with classification */
export interface DomainPerformanceSummary {
  domain_id: number;
  domain_name: string;
  weight: number;
  accuracy: number | null;
  question_count: number;
  avg_response_time: number | null;
  classification: DomainClassification;
}

/** User's overall learning analytics summary */
export interface UserAnalyticsSummary {
  user_id: string;
  total_questions_answered: number;
  overall_accuracy: number;
  avg_response_time: number | null;
  strong_domains: DomainPerformanceMetric[] | null;
  weak_domains: DomainPerformanceMetric[] | null;
  last_updated: string;
}

/** Complete analytics summary response */
export interface AnalyticsSummaryResponse {
  analytics: UserAnalyticsSummary;
  domain_performance: DomainPerformanceSummary[];
  task_performance: TaskPerformanceMetric[];
}

/** A single learning recommendation */
export interface LearningRecommendationItem {
  id: string;
  type: string;
  priority: number;
  reason: string;
  domain_id: number | null;
  task_id: number | null;
  created_at: string;
}

/** Response for recommendations endpoint */
export interface RecommendationsResponse {
  recommendations: LearningRecommendationItem[];
}

/** Response for recalculate endpoint */
export interface RecalculateResponse {
  message: string;
  analytics_updated: boolean;
  recommendations_generated: number;
}

// ============ API Functions ============

// Storage keys
const SM2_PROGRESS_KEY = 'pmp_flashcard_sm2_progress';
const QUESTION_PROGRESS_KEY = 'pmp_question_progress';

/**
 * Get user's learning analytics summary.
 * Calculates metrics from localStorage progress data.
 */
export async function getAnalyticsSummary(): Promise<AnalyticsSummaryResponse> {
  const now = new Date().toISOString();

  // Load progress from localStorage
  const flashcardProgress = storage.get<Record<number, { ease_factor: number; repetitions: number; last_quality?: number }>>(SM2_PROGRESS_KEY) || {};
  const questionProgress = storage.get<Record<number, { is_correct: boolean; attempt_count?: number }>>(QUESTION_PROGRESS_KEY) || {};

  // Load static data for domain mapping
  const flashcardsRes = await fetch('/data/flashcards.json');
  const flashcards: { id: number; domain_id: number }[] = await flashcardsRes.json();

  const questionsRes = await fetch('/data/questions.json');
  const questions: { id: number; domain_id: number; task_id: number }[] = await questionsRes.json();

  const domainsRes = await fetch('/data/domains.json');
  const domains: { id: number; name: string; weight: number }[] = await domainsRes.json();

  // Calculate domain performance
  const domainStats: Record<number, { correct: number; total: number; flashcardCount: number }> = {};

  // Initialize stats
  domains.forEach(d => {
    domainStats[d.id] = { correct: 0, total: 0, flashcardCount: 0 };
  });

  // Calculate question accuracy by domain
  Object.entries(questionProgress).forEach(([qIdStr, progress]) => {
    const qId = parseInt(qIdStr);
    const question = questions.find(q => q.id === qId);
    if (question) {
      domainStats[question.domain_id].total += 1;
      if (progress.is_correct) {
        domainStats[question.domain_id].correct += 1;
      }
    }
  });

  // Count flashcards with good progress (ease_factor >= 2.5, repetitions >= 2)
  Object.values(flashcardProgress).forEach((fp) => {
    if (fp.ease_factor >= 2.5 && fp.repetitions >= 2) {
      // Find which domain this flashcard belongs to
      const cardId = Object.keys(flashcardProgress).find(
        key => flashcardProgress[parseInt(key)] === fp
      );
      if (cardId) {
        const card = flashcards.find(c => c.id === parseInt(cardId));
        if (card) {
          domainStats[card.domain_id].flashcardCount += 1;
        }
      }
    }
  });

  // Build domain performance array
  const domainPerformance: DomainPerformanceSummary[] = domains.map(domain => {
    const stats = domainStats[domain.id];
    const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : null;

    // Classify domain strength
    let classification: DomainClassification = 'neutral';
    if (accuracy !== null) {
      if (accuracy >= 75) classification = 'strong';
      else if (accuracy < 50) classification = 'weak';
    }

    return {
      domain_id: domain.id,
      domain_name: domain.name,
      weight: domain.weight,
      accuracy,
      question_count: stats.total,
      avg_response_time: null,
      classification,
    };
  });

  // Calculate overall stats
  const totalQuestions = Object.keys(questionProgress).length;
  const correctAnswers = Object.values(questionProgress).filter(p => p.is_correct).length;
  const overallAccuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

  // Determine strong/weak domains
  const strongDomains = domainPerformance
    .filter(d => d.classification === 'strong')
    .map(d => ({
      domain_id: d.domain_id,
      accuracy: d.accuracy || 0,
      count: d.question_count,
      avg_response_time: d.avg_response_time,
    }));

  const weakDomains = domainPerformance
    .filter(d => d.classification === 'weak')
    .map(d => ({
      domain_id: d.domain_id,
      accuracy: d.accuracy || 0,
      count: d.question_count,
      avg_response_time: d.avg_response_time,
    }));

  return {
    analytics: {
      user_id: 'guest',
      total_questions_answered: totalQuestions,
      overall_accuracy: overallAccuracy,
      avg_response_time: null,
      strong_domains: strongDomains.length > 0 ? strongDomains : null,
      weak_domains: weakDomains.length > 0 ? weakDomains : null,
      last_updated: now,
    },
    domain_performance: domainPerformance,
    task_performance: [],
  };
}

/**
 * Get personalized study recommendations. (Mocked)
 */
export async function getRecommendations(): Promise<RecommendationsResponse> {
  return {
    recommendations: [
      {
        id: '1',
        type: 'domain_focus',
        priority: 1,
        reason: 'Getting started with your study plan.',
        domain_id: 1,
        task_id: null,
        created_at: new Date().toISOString(),
      }
    ],
  };
}

/**
 * Force recalculation of user analytics. (Mocked)
 */
export async function recalculateAnalytics(): Promise<RecalculateResponse> {
  return {
    message: 'Analytics recalculated locally',
    analytics_updated: true,
    recommendations_generated: 1,
  };
}
