'use client';

import { Progress, StudyStats } from '@/types';

interface ProgressDisplayProps {
  progress?: Progress;
  stats?: StudyStats;
  title?: string;
}

export default function ProgressDisplay({
  progress,
  stats,
  title,
}: ProgressDisplayProps) {
  if (!progress && !stats) {
    return (
      <div className="text-center text-gray-500 py-8">
        No progress data available
      </div>
    );
  }

  // Progress per state
  const progressBars = progress ? [
    { label: 'New', count: progress.newCards, total: progress.totalCards, color: 'bg-gray-400', textColor: 'text-gray-600' },
    { label: 'Learning', count: progress.learningCards, total: progress.totalCards, color: 'bg-yellow-400', textColor: 'text-yellow-600' },
    { label: 'Review', count: progress.reviewCards, total: progress.totalCards, color: 'bg-blue-400', textColor: 'text-blue-600' },
    { label: 'Relearning', count: progress.relearningCards, total: progress.totalCards, color: 'bg-orange-400', textColor: 'text-orange-600' },
    { label: 'Mastered', count: progress.masteredCards, total: progress.totalCards, color: 'bg-green-500', textColor: 'text-green-600' },
  ] : [];

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6 border border-gray-200">
      {title && (
        <h3 className="text-lg font-bold text-gray-800 mb-6">{title}</h3>
      )}

      {/* Study Stats Section */}
      {stats && (
        <div className="mb-8">
          <h4 className="font-semibold text-gray-700 mb-4">Study Statistics</h4>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-600 font-semibold">Cards Available</p>
              <p className="text-2xl font-bold text-blue-700">{stats.cardsAvailable}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <p className="text-sm text-red-600 font-semibold">Cards Due</p>
              <p className="text-2xl font-bold text-red-700">{stats.cardsDue}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-sm text-green-600 font-semibold">Study Streak</p>
              <p className="text-2xl font-bold text-green-700">{stats.streak}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-600 font-semibold">New</p>
              <p className="text-xl font-bold text-gray-700">{stats.cardsNew}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <p className="text-sm text-yellow-600 font-semibold">Learning</p>
              <p className="text-xl font-bold text-yellow-700">{stats.cardsLearning}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <p className="text-sm text-purple-600 font-semibold">Review</p>
              <p className="text-xl font-bold text-purple-700">{stats.cardsReview}</p>
            </div>
          </div>
          {stats.lastStudyDate && (
            <p className="text-xs text-gray-500 mt-4">
              Last studied: {new Date(stats.lastStudyDate).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Progress by State */}
      {progress && progressBars.length > 0 && (
        <div className="mb-8">
          <h4 className="font-semibold text-gray-700 mb-4">Card Distribution</h4>
          <div className="space-y-4">
            {progressBars.map((bar) => {
              const percentage = progress.totalCards > 0 ? (bar.count / progress.totalCards) * 100 : 0;
              return (
                <div key={bar.label}>
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-sm font-semibold ${bar.textColor}`}>
                      {bar.label}
                    </span>
                    <span className="text-sm font-semibold text-gray-600">
                      {bar.count} / {progress.totalCards}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full ${bar.color} transition-all duration-300`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Overall Mastery */}
      {progress && (
        <div className="border-t border-gray-200 pt-6">
          <h4 className="font-semibold text-gray-700 mb-4">Overall Mastery</h4>
          <div className="flex items-end justify-between mb-2">
            <span className="text-2xl font-bold text-gray-800">
              {progress.masteryPercentage.toFixed(1)}%
            </span>
            <span className="text-sm text-gray-600">
              {progress.totalReviews} total reviews
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
              style={{ width: `${progress.masteryPercentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Retention rate: {(progress.averageRetention * 100).toFixed(1)}%
          </p>
        </div>
      )}
    </div>
  );
}
