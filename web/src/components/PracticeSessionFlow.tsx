'use client';

import { useState } from 'react';
import {
  PracticeQuestionContentDocument,
  PracticeSessionDocument,
  PracticeAttemptDocument,
} from '@/types/firestore';
import { PracticeService } from '@/lib/practice';
import PracticeQuestion from './PracticeQuestion';
import PracticeResults from './PracticeResults';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorAlert } from './ErrorAlert';

interface ScopeSelectionProps {
  domains: Array<{ id: string; name: string; description?: string }>;
  tasks: Array<{ id: string; domainId: string; name: string; description?: string }>;
  onScopeSelected: (scope: { type: 'all' | 'domain' | 'task'; domainId?: string; taskId?: string }) => void;
}

function ScopeSelection({ domains, tasks, onScopeSelected }: ScopeSelectionProps) {
  const [scopeType, setScopeType] = useState<'all' | 'domain' | 'task' | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  const handleStartSession = () => {
    if (scopeType === 'all') {
      onScopeSelected({ type: 'all' });
    } else if (scopeType === 'domain' && selectedDomain) {
      onScopeSelected({ type: 'domain', domainId: selectedDomain });
    } else if (scopeType === 'task' && selectedTask) {
      onScopeSelected({ type: 'task', taskId: selectedTask });
    }
  };

  const domainTasks = selectedDomain ? tasks.filter((t) => t.domainId === selectedDomain) : [];

  return (
    <div className="space-y-6">
      {/* Scope Type Selection */}
      <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Select Practice Scope</h2>
        <div className="space-y-3">
          <label className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="radio"
              name="scope"
              value="all"
              checked={scopeType === 'all'}
              onChange={() => {
                setScopeType('all');
                setSelectedDomain(null);
                setSelectedTask(null);
              }}
              className="w-4 h-4 text-blue-600"
            />
            <div className="ml-3">
              <p className="font-semibold text-gray-800">All Questions</p>
              <p className="text-sm text-gray-600">Practice from all domains</p>
            </div>
          </label>

          <label className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="radio"
              name="scope"
              value="domain"
              checked={scopeType === 'domain'}
              onChange={() => setScopeType('domain')}
              className="w-4 h-4 text-blue-600"
            />
            <div className="ml-3">
              <p className="font-semibold text-gray-800">By Domain</p>
              <p className="text-sm text-gray-600">Practice questions from a specific domain</p>
            </div>
          </label>

          <label className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="radio"
              name="scope"
              value="task"
              checked={scopeType === 'task'}
              onChange={() => setScopeType('task')}
              className="w-4 h-4 text-blue-600"
            />
            <div className="ml-3">
              <p className="font-semibold text-gray-800">By Task</p>
              <p className="text-sm text-gray-600">Practice questions from a specific task</p>
            </div>
          </label>
        </div>
      </div>

      {/* Domain Selection */}
      {scopeType === 'domain' && (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Select Domain</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {domains.map((domain) => (
              <button
                key={domain.id}
                onClick={() => {
                  setSelectedDomain(domain.id);
                  setSelectedTask(null);
                }}
                className={`p-4 text-left rounded-lg border-2 transition-colors ${
                  selectedDomain === domain.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-semibold text-gray-800">{domain.name}</p>
                {domain.description && (
                  <p className="text-sm text-gray-600 mt-1">{domain.description}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Task Selection */}
      {scopeType === 'task' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Select Domain</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {domains.map((domain) => (
                <button
                  key={domain.id}
                  onClick={() => {
                    setSelectedDomain(domain.id);
                    setSelectedTask(null);
                  }}
                  className={`p-4 text-left rounded-lg border-2 transition-colors ${
                    selectedDomain === domain.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-semibold text-gray-800">{domain.name}</p>
                  {domain.description && (
                    <p className="text-sm text-gray-600 mt-1">{domain.description}</p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {selectedDomain && (
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Select Task</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {domainTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTask(task.id)}
                    className={`p-4 text-left rounded-lg border-2 transition-colors ${
                      selectedTask === task.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-semibold text-gray-800">{task.name}</p>
                    {task.description && (
                      <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Start Button */}
      <button
        onClick={handleStartSession}
        disabled={
          scopeType === null ||
          (scopeType === 'domain' && !selectedDomain) ||
          (scopeType === 'task' && !selectedTask)
        }
        className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        Start Practice Session
      </button>
    </div>
  );
}

interface PracticeSessionFlowProps {
  domains: Array<{ id: string; name: string; description?: string }>;
  tasks: Array<{ id: string; domainId: string; name: string; description?: string }>;
  onClose: () => void;
}

export default function PracticeSessionFlow({
  domains,
  tasks,
  onClose,
}: PracticeSessionFlowProps) {
  const [stage, setStage] = useState<'selection' | 'session' | 'results'>(
    'selection'
  );
  const [questions, setQuestions] = useState<PracticeQuestionContentDocument[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionDoc, setSessionDoc] = useState<PracticeSessionDocument | null>(null);
  const [attempts, setAttempts] = useState<PracticeAttemptDocument[]>([]);

  const handleScopeSelected = async (newScope: {
    type: 'all' | 'domain' | 'task';
    domainId?: string;
    taskId?: string;
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const practiceService = new PracticeService();
      let questionsData: PracticeQuestionContentDocument[] = [];

      if (newScope.type === 'all') {
        questionsData = await practiceService.getAllPracticeQuestions();
      } else if (newScope.type === 'domain' && newScope.domainId) {
        questionsData = await practiceService.getPracticeQuestionsByDomain(
          newScope.domainId
        );
      } else if (newScope.type === 'task' && newScope.taskId) {
        questionsData = await practiceService.getPracticeQuestionsByTask(
          newScope.taskId
        );
      }

      if (questionsData.length === 0) {
        setError('No questions available for the selected scope.');
        setIsLoading(false);
        return;
      }

      // Shuffle questions
      const shuffled = [...questionsData].sort(() => Math.random() - 0.5);

      setQuestions(shuffled);

      // Create session
      const newSession = await practiceService.createPracticeSession(
        newScope,
        shuffled.map((q) => q.id)
      );

      setSessionId(newSession.id);
      setSessionDoc(newSession);
      setAttempts([]);
      setCurrentQuestionIndex(0);
      setStage('session');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load practice questions'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestionAnswered = async (
    isCorrect: boolean,
    selectedChoice: 'A' | 'B' | 'C' | 'D',
    timeSpent: number,
    skipped: boolean = false
  ) => {
    if (!sessionId) return;

    try {
      const practiceService = new PracticeService();
      const currentQuestion = questions[currentQuestionIndex];

      const attempt = await practiceService.recordPracticeAttempt(
        sessionId,
        currentQuestion.id,
        selectedChoice,
        isCorrect,
        timeSpent,
        skipped
      );

      // Add attempt to list
      setAttempts([...attempts, attempt]);

      // Move to next question or results
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        // End session
        const now = new Date();
        const durationSeconds = sessionDoc ? Math.round(
          (now.getTime() - sessionDoc.startedAt.getTime()) / 1000
        ) : 0;

        await practiceService.endPracticeSession(sessionId, durationSeconds);

        // Fetch updated session
        const updatedSession = await practiceService.getPracticeSession(sessionId);
        if (updatedSession) {
          setSessionDoc(updatedSession);
        }

        setStage('results');
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to record answer'
      );
    }
  };

  const handleRetry = () => {
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setSessionId(null);
    setSessionDoc(null);
    setAttempts([]);
    setStage('selection');
    setError(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <ErrorAlert
          error={error}
          type="error"
          onDismiss={() => stage === 'selection' ? undefined : setError(null)}
        />
        {stage !== 'selection' && (
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {stage === 'selection' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Practice Questions</h1>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <ScopeSelection
            domains={domains}
            tasks={tasks}
            onScopeSelected={handleScopeSelected}
          />
        </>
      )}

      {stage === 'session' && questions.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">
              Question {currentQuestionIndex + 1} of {questions.length}
            </h1>
            <button
              onClick={() => {
                setStage('selection');
                setQuestions([]);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <PracticeQuestion
            question={questions[currentQuestionIndex]}
            onAnswered={handleQuestionAnswered}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={questions.length}
          />
        </>
      )}

      {stage === 'results' && sessionDoc && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Session Complete</h1>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <PracticeResults
            session={sessionDoc}
            attempts={attempts}
            onRetake={handleRetry}
            onBackToDashboard={onClose}
          />
        </>
      )}
    </div>
  );
}
