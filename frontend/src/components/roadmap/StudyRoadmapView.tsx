'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { getActiveRoadmap, adaptRoadmap, archiveRoadmap } from '@/lib/api/roadmap';
import type { StudyRoadmap, RoadmapMilestone } from '@/lib/api/roadmap';
import RoadmapSetupWizard from './RoadmapSetupWizard';
import DailyStudyPlan from './DailyStudyPlan';

/**
 * StudyRoadmapView - Main component for displaying the user's study roadmap
 *
 * Shows:
 * - Overall roadmap progress
 * - Weekly milestones with status
 * - AI recommendations
 * - Quick actions (adapt, archive)
 */
export default function StudyRoadmapView() {
  const [showWizard, setShowWizard] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<RoadmapMilestone | null>(null);

  const {
    data: roadmap,
    error,
    isLoading,
    mutate,
  } = useSWR<StudyRoadmap>('/api/roadmap/active', getActiveRoadmap, {
    revalidateOnFocus: false,
  });

  const [adapting, setAdapting] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const handleAdapt = async () => {
    if (!roadmap) return;
    setAdapting(true);
    try {
      await adaptRoadmap(roadmap.id);
      mutate();
    } catch (err) {
      console.error('Failed to adapt roadmap:', err);
    } finally {
      setAdapting(false);
    }
  };

  const handleArchive = async () => {
    if (!roadmap || !confirm('Are you sure you want to archive this roadmap?')) return;
    setArchiving(true);
    try {
      await archiveRoadmap(roadmap.id);
      mutate();
    } catch (err) {
      console.error('Failed to archive roadmap:', err);
    } finally {
      setArchiving(false);
    }
  };

  const handleWizardSuccess = () => {
    setShowWizard(false);
    mutate();
  };

  if (showWizard) {
    return (
      <div className="p-6">
        <RoadmapSetupWizard onSuccess={handleWizardSuccess} onCancel={() => setShowWizard(false)} />
      </div>
    );
  }

  if (selectedMilestone) {
    return (
      <DailyStudyPlan
        milestone={selectedMilestone}
        roadmapId={roadmap?.id || 0}
        onBack={() => setSelectedMilestone(null)}
        onUpdate={() => mutate()}
      />
    );
  }

  if (isLoading) {
    return <RoadmapLoadingState />;
  }

  if (error || !roadmap) {
    return <EmptyRoadmapState onCreateRoadmap={() => setShowWizard(true)} />;
  }

  const progressPercentage =
    roadmap.total_milestones > 0
      ? Math.round((roadmap.completed_milestones / roadmap.total_milestones) * 100)
      : 0;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Study Roadmap</h1>
          <p className="text-gray-600 mt-1">
            AI-personalized curriculum adapted to your progress
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleAdapt}
            disabled={adapting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition flex items-center gap-2"
          >
            {adapting ? (
              'Adapting...'
            ) : (
              <>
                <span>🔄</span>
                Adapt Roadmap
              </>
            )}
          </button>
          <button
            onClick={handleArchive}
            disabled={archiving}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 transition"
          >
            Archive
          </button>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Exam Readiness</h2>
            <p className="text-blue-100 mt-1">
              {roadmap.completed_milestones} of {roadmap.total_milestones} milestones completed
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-3xl font-bold">{progressPercentage}%</div>
              <div className="text-blue-100 text-sm">Complete</div>
            </div>
            <div className="w-16 h-16 relative">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="32" cy="32" r="28" stroke="rgba(255,255,255,0.3)" strokeWidth="6" fill="none" />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="white"
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - progressPercentage / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-3 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        {/* Exam countdown */}
        <div className="mt-4 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span>📅</span>
            <span>Exam: {new Date(roadmap.exam_date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>⏱️</span>
            <span>
              {roadmap.weekly_study_hours} hrs/week × {roadmap.study_days_per_week} days
            </span>
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      {roadmap.recommendations && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🤖</span>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900">AI Recommendations</h3>
              <ul className="mt-2 space-y-1 text-sm text-amber-800">
                {Object.entries(roadmap.recommendations).map(([key, value]) => (
                  <li key={key} className="capitalize">
                    {key.replace(/_/g, ' ')}: {String(value)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Focus Areas */}
      {roadmap.focus_areas && roadmap.focus_areas.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Focus Areas</h3>
          <p className="text-sm text-blue-700">
            Extra attention recommended for these domains based on your performance
          </p>
        </div>
      )}

      {/* Milestones Timeline */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Weekly Milestones</h2>
          <p className="text-sm text-gray-500 mt-1">
            Click on any milestone to see daily study plans
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {roadmap.milestones.map((milestone) => (
            <MilestoneItem
              key={milestone.id}
              milestone={milestone}
              onClick={() => setSelectedMilestone(milestone)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============ Sub-components ============

function MilestoneItem({
  milestone,
  onClick,
}: {
  milestone: RoadmapMilestone;
  onClick: () => void;
}) {
  const statusConfig = {
    pending: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-600',
      icon: '⏳',
      label: 'Pending',
    },
    in_progress: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-600',
      icon: '📚',
      label: 'In Progress',
    },
    completed: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-600',
      icon: '✅',
      label: 'Completed',
    },
    skipped: {
      bg: 'bg-gray-100',
      border: 'border-gray-300',
      text: 'text-gray-500',
      icon: '⏭️',
      label: 'Skipped',
    },
  };

  const config = statusConfig[milestone.status] || statusConfig.pending;
  const criteria = milestone.completion_criteria as { flashcards?: number; questions?: number } || {};
  const progress =
    milestone.completion_criteria && typeof milestone.completion_criteria === 'object'
      ? {
          flashcards: criteria.flashcards || 0,
          questions: criteria.questions || 0,
        }
      : { flashcards: 0, questions: 0 };

  return (
    <button
      onClick={onClick}
      className={`w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition ${config.bg} ${config.border} border-l-4`}
    >
      {/* Week number circle */}
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${config.bg} ${config.text} border-2 ${config.border}`}
      >
        {milestone.week_number}
      </div>

      {/* Content */}
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <span className="text-xl">{config.icon}</span>
          <h3 className="font-semibold text-gray-900">{milestone.title}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.text} ${config.border} border`}>
            {config.label}
          </span>
        </div>
        {milestone.description && (
          <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
        )}
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <span>📅 {new Date(milestone.scheduled_date).toLocaleDateString()}</span>
          <span>🎯 {progress.flashcards} flashcards, {progress.questions} questions</span>
        </div>
      </div>

      {/* Progress indicators */}
      {milestone.status !== 'completed' && (
        <div className="text-right">
          <div className="text-sm text-gray-600">
            {milestone.flashcards_completed}/{progress.flashcards} cards
          </div>
          <div className="text-sm text-gray-600">
            {milestone.questions_completed}/{progress.questions} questions
          </div>
        </div>
      )}

      <span className="text-gray-400">→</span>
    </button>
  );
}

function RoadmapLoadingState() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse" />
      <div className="h-48 bg-gray-200 rounded animate-pulse" />
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function EmptyRoadmapState({ onCreateRoadmap }: { onCreateRoadmap: () => void }) {
  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto text-center bg-white rounded-lg shadow-lg p-12">
        <div className="text-6xl mb-4">🗺️</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Study Roadmap</h2>
        <p className="text-gray-600 mb-8">
          Let AI build a personalized study plan based on your exam date and availability.
          Get weekly milestones with daily study plans that adapt to your progress.
        </p>
        <button
          onClick={onCreateRoadmap}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          Create Study Roadmap
        </button>

        <div className="mt-8 grid grid-cols-3 gap-4 text-left">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl mb-2">🎯</div>
            <h3 className="font-semibold text-blue-900">Personalized</h3>
            <p className="text-sm text-blue-700 mt-1">
              AI adapts to your weak areas and learning pace
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-2xl mb-2">📅</div>
            <h3 className="font-semibold text-green-900">Structured</h3>
            <p className="text-sm text-green-700 mt-1">
              Weekly milestones keep you on track for exam day
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl mb-2">🔄</div>
            <h3 className="font-semibold text-purple-900">Adaptive</h3>
            <p className="text-sm text-purple-700 mt-1">
              Plans update weekly based on your performance
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
