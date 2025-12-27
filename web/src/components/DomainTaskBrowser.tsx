'use client';

import { useState } from 'react';
import { Domain, Task, Progress } from '@/types';

interface DomainTaskBrowserProps {
  domains: Domain[];
  tasks: Task[];
  progress?: Record<string, Progress>;
  selectedDomain?: string;
  selectedTask?: string;
  onDomainSelect: (domainId: string) => void;
  onTaskSelect: (taskId: string) => void;
  onStudyClick: (type: 'all' | 'domain' | 'task', id?: string) => void;
}

interface DomainWithProgress extends Domain {
  taskCount: number;
  masteryPercentage?: number;
}

export default function DomainTaskBrowser({
  domains,
  tasks,
  progress,
  selectedDomain,
  selectedTask,
  onDomainSelect,
  onTaskSelect,
  onStudyClick,
}: DomainTaskBrowserProps) {
  const [expandedDomain, setExpandedDomain] = useState<string | null>(selectedDomain || null);
  const [filterType, setFilterType] = useState<'all' | 'due' | 'new'>('all');

  // Enrich domains with task count and progress
  const domainsWithProgress: DomainWithProgress[] = domains.map((domain) => {
    const domainTasks = tasks.filter((t) => t.domainId === domain.id);
    const domainProgress = progress?.[domain.id];
    return {
      ...domain,
      taskCount: domainTasks.length,
      masteryPercentage: domainProgress?.masteryPercentage,
    };
  });

  const getTasksForDomain = (domainId: string) => {
    return tasks.filter((t) => t.domainId === domainId);
  };

  const getTaskProgress = (taskId: string) => {
    return progress?.[taskId];
  };

  const getMasteryColor = (masteryPercentage?: number) => {
    if (masteryPercentage === undefined) return 'text-gray-500';
    if (masteryPercentage >= 80) return 'text-green-600';
    if (masteryPercentage >= 60) return 'text-blue-600';
    if (masteryPercentage >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6 border border-gray-200">
      {/* Header with Filter */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Study Browser</h3>
        <div className="flex gap-2">
          {['all', 'due', 'new'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type as 'all' | 'due' | 'new')}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${
                  filterType === type
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {type === 'all' && 'All Cards'}
              {type === 'due' && 'Due Cards'}
              {type === 'new' && 'New Cards'}
            </button>
          ))}
        </div>
      </div>

      {/* Study All Button */}
      <button
        onClick={() => onStudyClick('all')}
        className="w-full mb-6 px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Study All Cards
      </button>

      {/* Domains List */}
      <div className="space-y-3">
        {domainsWithProgress.map((domain) => {
          const isExpanded = expandedDomain === domain.id;
          const domainTasks = getTasksForDomain(domain.id);

          return (
            <div key={domain.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Domain Header */}
              <button
                onClick={() => {
                  setExpandedDomain(isExpanded ? null : domain.id);
                  onDomainSelect(domain.id);
                }}
                className={`
                  w-full px-4 py-4 flex items-center justify-between
                  transition-colors
                  ${
                    selectedDomain === domain.id
                      ? 'bg-blue-50 border-l-4 border-blue-500'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }
                `}
              >
                <div className="flex-1 text-left">
                  <div className="font-semibold text-gray-800">
                    {domain.name}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {domain.percentage}% of exam • {domainTasks.length} tasks
                  </div>
                </div>

                {/* Mastery Display */}
                {domain.masteryPercentage !== undefined && (
                  <div className="flex items-center gap-3 mr-3">
                    <div className="text-right">
                      <div
                        className={`text-sm font-bold ${getMasteryColor(
                          domain.masteryPercentage
                        )}`}
                      >
                        {domain.masteryPercentage.toFixed(0)}%
                      </div>
                      <div className="w-16 h-2 bg-gray-300 rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-green-500"
                          style={{
                            width: `${domain.masteryPercentage}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Expand Icon */}
                <div className={`text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                  ▼
                </div>
              </button>

              {/* Tasks List */}
              {isExpanded && (
                <div className="bg-white border-t border-gray-200">
                  <div className="space-y-2 p-4">
                    {domainTasks.length === 0 ? (
                      <p className="text-sm text-gray-500">No tasks available</p>
                    ) : (
                      domainTasks.map((task) => {
                        const taskProgress = getTaskProgress(task.id);
                        return (
                          <div
                            key={task.id}
                            className={`
                              p-3 rounded-lg border transition-colors cursor-pointer
                              ${
                                selectedTask === task.id
                                  ? 'bg-blue-50 border-blue-300'
                                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                              }
                            `}
                            onClick={() => onTaskSelect(task.id)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-700">
                                {task.name}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onStudyClick('task', task.id);
                                }}
                                className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors"
                              >
                                Study
                              </button>
                            </div>

                            {taskProgress && (
                              <div className="flex items-center justify-between text-xs text-gray-600">
                                <span>
                                  {taskProgress.totalCards} cards
                                </span>
                                <span
                                  className={`font-semibold ${getMasteryColor(
                                    taskProgress.masteryPercentage
                                  )}`}
                                >
                                  {taskProgress.masteryPercentage.toFixed(0)}% mastered
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
