'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { useActiveRecommendations } from '@/stores/analyticsStore';
import { Domain } from '@/types';

interface StudyTopic {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  domainId: number | null;
  taskId: number | null;
  domainName: string | null;
  taskName: string | null;
  estimatedMinutes: number | null;
  actionType: 'flashcards' | 'questions' | 'exam' | 'mixed';
  progress: number; // 0-100
}

interface StudyPathProps {
  domains?: Domain[];
}

const priorityOrder = { high: 0, medium: 1, low: 2 };

const priorityStyles = {
  high: {
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    border: 'border-l-red-500',
  },
  medium: {
    badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    border: 'border-l-yellow-500',
  },
  low: {
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    border: 'border-l-green-500',
  },
};

const actionTypeLabels: Record<string, string> = {
  flashcards: 'Flashcards',
  questions: 'Practice Questions',
  exam: 'Mock Exam',
  mixed: 'Mixed Study',
};

export function StudyPath({ domains = [] }: StudyPathProps) {
  const router = useRouter();
  const recommendations = useActiveRecommendations();

  const studyTopics = useMemo<StudyTopic[]>(() => {
    const domainMap = new Map(domains.map((d) => [d.id, d]));

    return recommendations
      .filter((rec) => !rec.dismissed)
      .map((rec) => {
        let actionType: StudyTopic['actionType'] = 'mixed';
        if (rec.type === 'review_flashcards') actionType = 'flashcards';
        else if (rec.type === 'practice_questions') actionType = 'questions';
        else if (rec.type === 'take_exam') actionType = 'exam';

        let progress = 0;
        // If domain_id is present, we could calculate progress based on domain performance
        // For now, using a simplified approach
        if (rec.domain_id) {
          // This could be enhanced with actual progress data from analytics
          progress = Math.floor(Math.random() * 60); // Placeholder
        }

        return {
          id: rec.id,
          title: rec.title,
          description: rec.description,
          priority: rec.priority,
          domainId: rec.domain_id,
          taskId: rec.task_id,
          domainName: rec.domain_id ? domainMap.get(rec.domain_id)?.name ?? null : null,
          taskName: null, // Could be enhanced with task lookup
          estimatedMinutes: rec.estimated_minutes,
          actionType,
          progress,
        };
      })
      .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [recommendations, domains]);

  const handleStartStudy = (topic: StudyTopic) => {
    const params = new URLSearchParams();

    if (topic.domainId) params.set('domain', topic.domainId.toString());
    if (topic.taskId) params.set('task', topic.taskId.toString());

    const queryString = params.toString();

    if (topic.actionType === 'flashcards') {
      router.push(`/flashcards/study${queryString ? `?${queryString}` : ''}`);
    } else if (topic.actionType === 'questions' || topic.actionType === 'mixed') {
      router.push(`/practice/test${queryString ? `?${queryString}` : ''}`);
    } else if (topic.actionType === 'exam') {
      router.push('/exam');
    }
  };

  const getPriorityLabel = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1) + ' Priority';
  };

  if (studyTopics.length === 0) {
    return (
      <Card variant="default" padding="lg">
        <CardHeader
          title="Recommended Study Path"
          subtitle="Complete some practice activities to get personalized recommendations"
        />
        <CardBody>
          <div className="text-center py-8">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No recommendations yet
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Start studying to generate personalized recommendations based on your performance.
            </p>
            <div className="mt-6">
              <Button
                variant="primary"
                onClick={() => router.push('/flashcards')}
              >
                Start Studying
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Recommended Study Path
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Personalized topics prioritized to improve your weak areas
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {studyTopics.map((topic) => (
          <Card
            key={topic.id}
            variant="default"
            padding="md"
            hoverable
            className={`border-l-4 ${priorityStyles[topic.priority].border}`}
          >
            <div className="flex items-start gap-4">
              {/* Priority Badge */}
              <div className="flex-shrink-0">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    priorityStyles[topic.priority].badge
                  }`}
                >
                  {getPriorityLabel(topic.priority)}
                </span>
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      {topic.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {topic.description}
                    </p>

                    {/* Metadata */}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-500">
                      {topic.domainName && (
                        <span className="inline-flex items-center">
                          <svg
                            className="mr-1 h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                            />
                          </svg>
                          {topic.domainName}
                        </span>
                      )}
                      {topic.taskName && (
                        <span className="inline-flex items-center">
                          <svg
                            className="mr-1 h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                            />
                          </svg>
                          {topic.taskName}
                        </span>
                      )}
                      <span className="inline-flex items-center">
                        <svg
                          className="mr-1 h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                        {actionTypeLabels[topic.actionType]}
                      </span>
                      {topic.estimatedMinutes && (
                        <span className="inline-flex items-center">
                          <svg
                            className="mr-1 h-3.5 w-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          ~{topic.estimatedMinutes} min
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500 mb-1">
                        <span>Progress</span>
                        <span>{topic.progress}%</span>
                      </div>
                      <div className="overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 h-2">
                        <div
                          className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
                          style={{ width: `${topic.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex-shrink-0">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleStartStudy(topic)}
                    >
                      Start Study
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card variant="outlined" padding="md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Need more options?
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Browse all flashcards or practice questions
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => router.push('/flashcards')}>
              All Flashcards
            </Button>
            <Button size="sm" variant="secondary" onClick={() => router.push('/practice')}>
              All Questions
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default StudyPath;
