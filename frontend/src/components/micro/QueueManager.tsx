'use client';

import { useState } from 'react';
import {
  RefreshCw,
  Filter,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import {
  useStudyQueue,
  useRebuildQueue,
  useMicroStats,
} from '@/lib/api/micro';
import {
  useShouldRebuildQueue,
  useMicroStore,
} from '@/stores/microStore';
import type { MicroContext, StudyQueueEntry } from '@/types';

interface QueueManagerProps {
  onStartSession?: (context: MicroContext) => void;
}

const contextLabels: Record<MicroContext, string> = {
  commute: 'Commute',
  break: 'Coffee Break',
  waiting: 'Waiting',
  general: 'General',
};

const contextColors: Record<MicroContext, string> = {
  commute: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  break: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  waiting: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  general: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

const priorityLabels = [
  { max: 150, label: 'Overdue', color: 'text-red-600 dark:text-red-400', icon: AlertCircle },
  { max: 100, label: 'High Priority', color: 'text-orange-600 dark:text-orange-400', icon: TrendingUp },
  { max: 50, label: 'Medium', color: 'text-yellow-600 dark:text-yellow-400', icon: Clock },
  { max: 0, label: 'Normal', color: 'text-gray-600 dark:text-gray-400', icon: CheckCircle2 },
];

function getPriorityInfo(score: number) {
  return priorityLabels.find((p) => score >= p.max) || priorityLabels[priorityLabels.length - 1];
}

export default function QueueManager({ onStartSession }: QueueManagerProps) {
  const { data: queueData, isLoading, error } = useStudyQueue();
  const { data: statsData } = useMicroStats();
  const { trigger: rebuildQueue, isMutating: isRebuilding } = useRebuildQueue();

  const shouldRebuild = useShouldRebuildQueue();
  const setSelectedContext = useMicroStore((state) => state.setSelectedContext);

  const [filterContext, setFilterContext] = useState<MicroContext | null>(null);

  const queue = queueData?.queue ?? [];
  const filteredQueue = filterContext
    ? queue.filter((entry) => entry.recommended_context === filterContext)
    : queue;

  const handleRebuildQueue = async () => {
    await rebuildQueue({ context: filterContext ?? undefined, limit: 50 });
  };

  const handleContextFilter = (context: MicroContext | null) => {
    setFilterContext(context);
    setSelectedContext(context ?? 'general');
  };

  const uniqueContexts = Array.from(
    new Set(queue.map((entry) => entry.recommended_context))
  ) as MicroContext[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Study Queue
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {queue.length} cards ready for review
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          isLoading={isRebuilding}
          leftIcon={<RefreshCw className="w-4 h-4" />}
          onClick={handleRebuildQueue}
        >
          Rebuild
        </Button>
      </div>

      {/* Rebuild Notice */}
      {shouldRebuild && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Queue update available
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Your progress has changed. Rebuilding the queue will update priority
              scores based on your latest performance.
            </p>
          </div>
        </div>
      )}

      {/* Stats Overview */}
      {statsData && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {statsData.total_reviews}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Total Reviews
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.round(statsData.overall_accuracy * 100)}%
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Accuracy
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {statsData.unique_cards_learned}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Cards Learned
            </div>
          </div>
        </div>
      )}

      {/* Context Filter */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <button
          onClick={() => handleContextFilter(null)}
          className={`
            px-3 py-1.5 rounded-full text-sm font-medium transition-colors
            ${
              filterContext === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }
          `}
        >
          All ({queue.length})
        </button>
        {uniqueContexts.map((context) => (
          <button
            key={context}
            onClick={() => handleContextFilter(context)}
            className={`
              px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap
              ${
                filterContext === context
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }
            `}
          >
            {contextLabels[context]} (
            {queue.filter((e) => e.recommended_context === context).length})
          </button>
        ))}
      </div>

      {/* Queue List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-pulse"
            >
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-center">
          <p className="text-sm text-red-800 dark:text-red-200">
            Failed to load study queue
          </p>
        </div>
      ) : filteredQueue.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">
            {filterContext
              ? `No cards in ${contextLabels[filterContext]} context`
              : 'No cards in queue'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            Try rebuilding the queue or changing context filter
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQueue.map((entry) => (
            <QueueCard
              key={entry.queue_id}
              entry={entry}
              onStart={onStartSession}
            />
          ))}
        </div>
      )}

      {/* Context Accuracy */}
      {statsData && Object.keys(statsData.context_accuracy).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Performance by Context
          </h3>
          <div className="space-y-2">
            {Object.entries(statsData.context_accuracy).map(([context, accuracy]) => (
              <div key={context} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {contextLabels[context as MicroContext]}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 dark:bg-blue-500 rounded-full"
                      style={{ width: `${accuracy * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white w-12 text-right">
                    {Math.round(accuracy * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface QueueCardProps {
  entry: StudyQueueEntry;
  onStart?: (context: MicroContext) => void;
}

function QueueCard({ entry, onStart }: QueueCardProps) {
  const priorityInfo = getPriorityInfo(entry.priority_score);
  const PriorityIcon = priorityInfo.icon;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Context Badge */}
          <div className="mb-2">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                contextColors[entry.recommended_context]
              }`}
            >
              {contextLabels[entry.recommended_context]}
            </span>
          </div>

          {/* Card Content */}
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {entry.micro_flashcard.micro_front}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
            {entry.micro_flashcard.micro_back}
          </p>

          {/* Meta Info */}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {entry.micro_flashcard.estimated_seconds}s
            </span>
            <span>#{entry.position}</span>
            <span
              className={`flex items-center gap-1 ${priorityInfo.color}`}
            >
              <PriorityIcon className="w-3 h-3" />
              {priorityInfo.label}
            </span>
          </div>
        </div>

        {/* Action */}
        {onStart && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onStart(entry.recommended_context)}
          >
            Start
          </Button>
        )}
      </div>
    </div>
  );
}
