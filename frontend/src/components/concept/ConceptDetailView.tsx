'use client';

import { useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useConceptDetails, useConceptFlashcards, useConceptQuestions } from '@/lib/api/concept-hooks';
import type { RelationshipType } from '@/types';

interface ConceptDetailViewProps {
  conceptId: number;
  onBack?: () => void;
  onRelatedConceptClick?: (conceptId: number) => void;
  onStartStudy?: (conceptId: number) => void;
}

const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  'prerequisite': 'Prerequisite for',
  'related': 'Related to',
  'part_of': 'Part of',
  'enables': 'Enables',
  'contradicts': 'Contradicts',
};

const RELATIONSHIP_COLORS: Record<RelationshipType, string> = {
  'prerequisite': 'text-red-600 bg-red-50',
  'related': 'text-gray-600 bg-gray-50',
  'part_of': 'text-purple-600 bg-purple-50',
  'enables': 'text-teal-600 bg-teal-50',
  'contradicts': 'text-orange-600 bg-orange-50',
};

export function ConceptDetailView({
  conceptId,
  onBack,
  onRelatedConceptClick,
  onStartStudy,
}: ConceptDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'flashcards' | 'questions'>('overview');

  const { data: concept, error, isLoading } = useConceptDetails(conceptId);
  const { data: flashcardsData } = useConceptFlashcards(conceptId, { limit: 10 });
  const { data: questionsData } = useConceptQuestions(conceptId, { limit: 10 });

  if (isLoading) {
    return (
      <Card>
        <CardBody>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          </div>
        </CardBody>
      </Card>
    );
  }

  if (error || !concept) {
    return (
      <Card>
        <CardBody>
          <div className="text-red-600">Error loading concept details</div>
          {onBack && (
            <Button onClick={onBack} className="mt-4">
              Go Back
            </Button>
          )}
        </CardBody>
      </Card>
    );
  }

  const masteryPercent = concept.mastery?.level ? Math.round(concept.mastery.level * 100) : 0;
  const masteryColor = masteryPercent >= 80 ? 'text-green-600' : masteryPercent >= 50 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardBody>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {onBack && (
                <button
                  onClick={onBack}
                  className="text-sm text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-1"
                >
                  ← Back to Graph
                </button>
              )}
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{concept.name}</h1>
              <div className="flex flex-wrap gap-2 mt-3">
                {concept.category && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                    {concept.category}
                  </span>
                )}
                {concept.domain_focus && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    {concept.domain_focus}
                  </span>
                )}
              </div>
            </div>
            {onStartStudy && (
              <Button
                onClick={() => onStartStudy(conceptId)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Study This Concept
              </Button>
            )}
          </div>

          {concept.description && (
            <p className="mt-4 text-gray-700 dark:text-gray-300">{concept.description}</p>
          )}

          {/* Mastery Progress */}
          {concept.mastery && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Your Mastery</span>
                <span className={`text-lg font-bold ${masteryColor}`}>{masteryPercent}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${masteryPercent}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-600 dark:text-gray-400">
                <span>{concept.mastery.flashcards_reviewed}/{concept.mastery.flashcard_count} flashcards</span>
                <span>{concept.mastery.questions_attempted}/{concept.mastery.question_count} questions</span>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Content Tabs */}
      <Card>
        <CardHeader title="" subtitle="">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('flashcards')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors relative ${
                activeTab === 'flashcards'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Flashcards
              {concept.flashcard_count > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                  {concept.flashcard_count}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors relative ${
                activeTab === 'questions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Questions
              {concept.question_count > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                  {concept.question_count}
                </span>
              )}
            </button>
          </div>
        </CardHeader>

        <CardBody>
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Related Concepts - Outgoing */}
              {concept.outgoing_relationships.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Related Concepts
                  </h3>
                  <div className="space-y-2">
                    {concept.outgoing_relationships.map((rel) => (
                      <div
                        key={rel.target_id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors cursor-pointer"
                        onClick={() => onRelatedConceptClick?.(rel.target_id)}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {rel.target_name || `Concept ${rel.target_id}`}
                          </div>
                          {rel.description && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {rel.description}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${RELATIONSHIP_COLORS[rel.type]}`}
                          >
                            {RELATIONSHIP_LABELS[rel.type]}
                          </span>
                          <span className="text-xs text-gray-500">
                            {Math.round(rel.strength * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Concepts - Incoming */}
              {concept.incoming_relationships.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Concepts That Relate To This
                  </h3>
                  <div className="space-y-2">
                    {concept.incoming_relationships.map((rel) => (
                      <div
                        key={rel.source_id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors cursor-pointer"
                        onClick={() => onRelatedConceptClick?.(rel.source_id)}
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {rel.source_name || `Concept ${rel.source_id}`}
                          </div>
                          {rel.description && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {rel.description}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${RELATIONSHIP_COLORS[rel.type]}`}
                          >
                            {RELATIONSHIP_LABELS[rel.type]}
                          </span>
                          <span className="text-xs text-gray-500">
                            {Math.round(rel.strength * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No relationships */}
              {concept.outgoing_relationships.length === 0 && concept.incoming_relationships.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No related concepts found</p>
                </div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {concept.flashcard_count}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Flashcards</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {concept.question_count}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Questions</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'flashcards' && (
            <div className="space-y-4">
              {flashcardsData?.flashcards && flashcardsData.flashcards.length > 0 ? (
                <>
                  {flashcardsData.flashcards.map((card) => (
                    <div
                      key={card.id}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 transition-colors"
                    >
                      <div className="font-medium text-gray-900 dark:text-white mb-2">
                        Q: {card.front}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        A: {card.back}
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Task ID: {card.task_id}
                      </div>
                    </div>
                  ))}
                  {flashcardsData.total_count > 10 && (
                    <div className="text-center text-sm text-gray-500">
                      Showing 10 of {flashcardsData.total_count} flashcards
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No flashcards available for this concept</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="space-y-4">
              {questionsData?.questions && questionsData.questions.length > 0 ? (
                <>
                  {questionsData.questions.map((question) => (
                    <div
                      key={question.id}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 transition-colors"
                    >
                      <div className="font-medium text-gray-900 dark:text-white mb-3">
                        {question.question_text}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <div>A) {question.option_a}</div>
                    <div>B) {question.option_b}</div>
                    <div>C) {question.option_c}</div>
                    <div>D) {question.option_d}</div>
                  </div>
                      <div className="mt-2 text-xs text-gray-500">
                    Task ID: {question.task_id}
                  </div>
                </div>
              ))}
                  {questionsData.total_count > 10 && (
                    <div className="text-center text-sm text-gray-500">
                      Showing 10 of {questionsData.total_count} questions
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No questions available for this concept</p>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
