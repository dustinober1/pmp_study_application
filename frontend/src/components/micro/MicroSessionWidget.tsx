'use client';

import { useEffect, useState } from 'react';
import { Play, Clock, Users, Zap, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/ui/Button';
import {
  useStudyQueue,
  useStartQuickSession,
  useMicroStats,
} from '@/lib/api/micro';
import {
  useMicroStore,
  useShouldRebuildQueue,
  useIsInMicroSession,
} from '@/stores/microStore';
import type { MicroContext } from '@/types';

interface MicroSessionWidgetProps {
  onClose?: () => void;
  standalone?: boolean;
}

const contextInfo: Record<
  MicroContext,
  { label: string; icon: typeof Clock; description: string; color: string }
> = {
  commute: {
    label: 'Commute',
    icon: Clock,
    description: 'Quick reviews while traveling',
    color: 'bg-blue-500',
  },
  break: {
    label: 'Coffee Break',
    icon: Zap,
    description: '2-minute learning sprint',
    color: 'bg-amber-500',
  },
  waiting: {
    label: 'Waiting',
    icon: Users,
    description: 'Fill idle moments productively',
    color: 'bg-purple-500',
  },
  general: {
    label: 'Quick Study',
    icon: Play,
    description: 'Anytime micro-learning',
    color: 'bg-green-500',
  },
};

export default function MicroSessionWidget({
  onClose,
  standalone = false,
}: MicroSessionWidgetProps) {
  const { data: queueData } = useStudyQueue();
  const { data: statsData } = useMicroStats();
  const { trigger: startSession, isMutating } = useStartQuickSession();

  const { preferredContext, setPreferredContext } = useMicroStore();
  const shouldRebuild = useShouldRebuildQueue();
  const isInSession = useIsInMicroSession();

  const [selectedContext, setSelectedContext] = useState<MicroContext>(
    preferredContext
  );
  const [sessionStarted, setSessionStarted] = useState(false);

  // Update local state when store changes
  useEffect(() => {
    setSelectedContext(preferredContext);
  }, [preferredContext]);

  const handleStartSession = async (context: MicroContext) => {
    setPreferredContext(context);
    setSessionStarted(true);

    try {
      const result = await startSession({
        context,
        mode: 'cards',
        target: 5,
      });

      if (result) {
        // Navigate to micro session or open modal
        window.location.href = `/micro/session/${result.session_id}`;
      }
    } catch (error) {
      console.error('Failed to start session:', error);
      setSessionStarted(false);
    }
  };

  if (isInSession && !standalone) {
    return null; // Don't show if already in a session
  }

  const queueSize = queueData?.queue_size ?? 0;
  const todayReviews = statsData?.recent_sessions?.total ?? 0;
  const accuracy = statsData?.overall_accuracy ?? 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={`
          fixed bottom-4 right-4 z-50
          ${standalone ? 'inset-0 bottom-auto right-auto flex items-center justify-center bg-gray-50/50 backdrop-blur-sm' : ''}
        `}
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden max-w-sm w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-white" />
              <span className="text-white font-semibold">2-Minute Study</span>
            </div>
            {!standalone && onClose && (
              <button
                onClick={onClose}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Stats Row */}
            <div className="flex items-center justify-between text-sm">
              <div className="text-center flex-1">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {queueSize}
                </div>
                <div className="text-gray-500 dark:text-gray-400">Cards Ready</div>
              </div>
              <div className="w-px h-10 bg-gray-200 dark:bg-gray-700" />
              <div className="text-center flex-1">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {todayReviews}
                </div>
                <div className="text-gray-500 dark:text-gray-400">Today</div>
              </div>
              <div className="w-px h-10 bg-gray-200 dark:bg-gray-700" />
              <div className="text-center flex-1">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.round(accuracy * 100)}%
                </div>
                <div className="text-gray-500 dark:text-gray-400">Accuracy</div>
              </div>
            </div>

            {/* Rebuild Notice */}
            {shouldRebuild && !standalone && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                Your study queue could be refreshed for better recommendations.
              </div>
            )}

            {/* Context Selector */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Choose your context
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(contextInfo) as MicroContext[]).map(
                  (context) => {
                    const info = contextInfo[context];
                    const Icon = info.icon;
                    const isSelected = selectedContext === context;

                    return (
                      <button
                        key={context}
                        onClick={() => handleStartSession(context)}
                        disabled={isMutating || sessionStarted}
                        className={`
                          relative p-3 rounded-lg border-2 transition-all duration-200
                          ${
                            isSelected
                              ? `${info.color} border-transparent text-white shadow-lg`
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                          }
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                      >
                        <div className="flex items-start gap-2">
                          <Icon
                            className={`w-5 h-5 flex-shrink-0 ${
                              isSelected ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                            }`}
                          />
                          <div className="text-left">
                            <div
                              className={`font-medium text-sm ${
                                isSelected ? 'text-white' : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              {info.label}
                            </div>
                            <div
                              className={`text-xs ${
                                isSelected
                                  ? 'text-white/80'
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}
                            >
                              {info.description}
                            </div>
                          </div>
                        </div>

                        {sessionStarted && isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/10 rounded-lg">
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          </div>
                        )}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Quick Start Button */}
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => handleStartSession(selectedContext)}
              isLoading={isMutating || sessionStarted}
              leftIcon={<Play className="w-5 h-5" />}
            >
              Start 2-Minute Session
            </Button>

            {/* Footer Info */}
            <div className="text-center text-xs text-gray-400 dark:text-gray-500">
              Powered by AI-optimized scheduling
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
