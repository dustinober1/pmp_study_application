'use client';

import React, { useState } from 'react';
import type { RoadmapMilestone, DailyPlan } from '@/lib/api/roadmap';
import { updateMilestone } from '@/lib/api/roadmap';

interface DailyStudyPlanProps {
  milestone: RoadmapMilestone;
  roadmapId: number;
  onBack: () => void;
  onUpdate: () => void;
}

/**
 * DailyStudyPlan - Shows daily study plans for a milestone
 *
 * Displays:
 * - Daily breakdown of study activities
 * - Progress tracking for the milestone
 * - Actions to mark milestone complete
 */
export default function DailyStudyPlan({ milestone, roadmapId, onBack, onUpdate }: DailyStudyPlanProps) {
  const [updating, setUpdating] = useState(false);

  const dailyPlans: Record<string, DailyPlan> = milestone.daily_plan || {};
  const days = Object.keys(dailyPlans).sort((a, b) => {
    const order = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return order.indexOf(a) - order.indexOf(b);
  });

  const criteria = milestone.completion_criteria || {};
  const targetFlashcards = (criteria as any).flashcards || 0;
  const targetQuestions = (criteria as any).questions || 0;
  const minScore = (criteria as any).min_score || 0.7;

  const handleMarkComplete = async () => {
    if (!confirm('Mark this milestone as complete?')) return;
    setUpdating(true);
    try {
      await updateMilestone(roadmapId, milestone.id, { mark_complete: true });
      onUpdate();
      onBack();
    } catch (err) {
      console.error('Failed to mark milestone complete:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleStartMilestone = () => {
    // Change status to in_progress
    updateMilestone(roadmapId, milestone.id, { mark_complete: false }).then(() => {
      onUpdate();
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
              Week {milestone.week_number}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              milestone.status === 'completed' ? 'bg-green-100 text-green-700' :
              milestone.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {milestone.status.replace('_', ' ')}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{milestone.title}</h1>
          {milestone.description && (
            <p className="text-gray-600 mt-1">{milestone.description}</p>
          )}
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Progress Tracking</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">
              {milestone.flashcards_completed}/{targetFlashcards}
            </div>
            <div className="text-sm text-blue-700 mt-1">Flashcards</div>
            <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{
                  width: `${targetFlashcards > 0 ? (milestone.flashcards_completed / targetFlashcards) * 100 : 0}%`
                }}
              />
            </div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600">
              {milestone.questions_completed}/{targetQuestions}
            </div>
            <div className="text-sm text-green-700 mt-1">Questions</div>
            <div className="w-full bg-green-200 rounded-full h-2 mt-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{
                  width: `${targetQuestions > 0 ? (milestone.questions_completed / targetQuestions) * 100 : 0}%`
                }}
              />
            </div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">
              {milestone.quiz_score ? `${Math.round(milestone.quiz_score * 100)}%` : '--'}
            </div>
            <div className="text-sm text-purple-700 mt-1">Quiz Score</div>
            <div className="text-xs text-purple-500 mt-2">Target: {Math.round(minScore * 100)}%</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          {milestone.status === 'pending' && (
            <button
              onClick={handleStartMilestone}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Start This Milestone
            </button>
          )}
          {milestone.status !== 'completed' &&
            milestone.flashcards_completed >= targetFlashcards &&
            milestone.questions_completed >= targetQuestions && (
              <button
                onClick={handleMarkComplete}
                disabled={updating}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 transition"
              >
                {updating ? 'Marking...' : 'Mark Complete'}
              </button>
            )}
        </div>
      </div>

      {/* Date Range */}
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <span>📅</span>
          <span>
            {new Date(milestone.scheduled_date).toLocaleDateString()} - {new Date(milestone.target_date).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Daily Plans */}
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Daily Study Plan</h2>
          <p className="text-sm text-gray-500 mt-1">
            Click on any day to start your study session
          </p>
        </div>

        <div className="divide-y divide-gray-200">
          {days.length > 0 ? (
            days.map((day) => {
              const plan = dailyPlans[day];
              return <DayPlanCard key={day} day={day} plan={plan} />;
            })
          ) : (
            <div className="p-6 text-center text-gray-500">
              No daily plans available for this milestone
            </div>
          )}
        </div>
      </div>

      {/* Completion Criteria */}
      {(targetFlashcards > 0 || targetQuestions > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-900 mb-2">Completion Criteria</h3>
          <ul className="text-sm text-amber-800 space-y-1">
            {targetFlashcards > 0 && (
              <li>Complete {targetFlashcards} flashcards</li>
            )}
            {targetQuestions > 0 && (
              <li>Answer {targetQuestions} practice questions</li>
            )}
            {minScore > 0 && (
              <li>Achieve at least {Math.round(minScore * 100)}% quiz score</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============ Sub-components ============

function DayPlanCard({ day, plan }: { day: string; plan: DailyPlan }) {
  const dayNames: Record<string, string> = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
  };

  const typeConfig = {
    study: { bg: 'bg-blue-50', border: 'border-blue-200', icon: '📚', label: 'Study Day' },
    rest: { bg: 'bg-green-50', border: 'border-green-200', icon: '😴', label: 'Rest Day' },
    review: { bg: 'bg-purple-50', border: 'border-purple-200', icon: '🔄', label: 'Review Day' },
  };

  const config = typeConfig[plan.type as keyof typeof typeConfig] || typeConfig.study;

  return (
    <div className={`p-4 border-l-4 ${config.bg} ${config.border}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{dayNames[day] || day}</h3>
              <span className={`text-xs px-2 py-0.5 rounded ${config.bg} ${config.border} border`}>
                {config.label}
              </span>
            </div>
            {plan.domain && (
              <p className="text-sm text-gray-600 mt-1">Focus: {plan.domain}</p>
            )}
            {plan.hours && (
              <p className="text-sm text-gray-500">Study time: {plan.hours} hours</p>
            )}
          </div>
        </div>
      </div>

      {/* Activities */}
      {plan.activities && plan.activities.length > 0 && (
        <div className="mt-3 ml-10 space-y-2">
          {plan.activities.map((activity, idx) => (
            <ActivityItem key={idx} activity={activity} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityItem({ activity }: { activity: { type: string; count?: number; duration_minutes?: number; full?: boolean } }) {
  const activityConfig: Record<string, { icon: string; label: string; color: string }> = {
    flashcards: { icon: '🎴', label: 'Flashcards', color: 'text-blue-600' },
    questions: { icon: '❓', label: 'Practice Questions', color: 'text-green-600' },
    review: { icon: '📖', label: 'Review', color: 'text-purple-600' },
    practice_exam: { icon: '📝', label: 'Practice Exam', color: 'text-orange-600' },
    weak_areas: { icon: '🎯', label: 'Weak Areas Focus', color: 'text-red-600' },
    formula_review: { icon: '🧮', label: 'Formula Review', color: 'text-indigo-600' },
  };

  const config = activityConfig[activity.type] || { icon: '📌', label: activity.type, color: 'text-gray-600' };

  return (
    <div className="flex items-center gap-2 text-sm">
      <span>{config.icon}</span>
      <span className={`font-medium ${config.color}`}>{config.label}</span>
      {activity.count && <span className="text-gray-600">× {activity.count}</span>}
      {activity.duration_minutes && (
        <span className="text-gray-600">({activity.duration_minutes} minutes)</span>
      )}
      {activity.full !== undefined && (
        <span className="text-gray-600">({activity.full ? 'Full' : 'Mini'} exam)</span>
      )}
    </div>
  );
}
