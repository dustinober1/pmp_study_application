'use client';

import React, { useState } from 'react';
import { createRoadmap } from '@/lib/api/roadmap';
import type { CreateRoadmapRequest } from '@/lib/api/roadmap';

interface RoadmapSetupWizardProps {
  onSuccess?: (roadmapId: number) => void;
  onCancel?: () => void;
}

/**
 * RoadmapSetupWizard - Multi-step wizard to create a personalized study roadmap
 *
 * Collects:
 * 1. Exam date
 * 2. Available study hours per week
 * 3. Study days per week
 *
 * Then generates an AI-powered study plan with weekly milestones.
 */
export default function RoadmapSetupWizard({ onSuccess, onCancel }: RoadmapSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [examDate, setExamDate] = useState('');
  const [weeklyHours, setWeeklyHours] = useState(10);
  const [studyDays, setStudyDays] = useState(5);

  // Calculate recommended duration
  const calculateWeeks = () => {
    if (!examDate) return 0;
    const exam = new Date(examDate);
    const today = new Date();
    const diffTime = exam.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.ceil(diffDays / 7));
  };

  const weeksUntilExam = calculateWeeks();
  const totalStudyHours = weeksUntilExam * weeklyHours;

  const intensity = weeklyHours >= 15 ? 'Intensive' : weeklyHours >= 8 ? 'Moderate' : 'Relaxed';
  const intensityColor =
    intensity === 'Intensive' ? 'text-orange-600' : intensity === 'Moderate' ? 'text-blue-600' : 'text-green-600';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const request: CreateRoadmapRequest = {
        exam_date: new Date(examDate).toISOString(),
        weekly_study_hours: weeklyHours,
        study_days_per_week: studyDays,
      };

      const roadmap = await createRoadmap(request);
      onSuccess?.(roadmap.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create roadmap');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return examDate !== '';
    if (step === 2) return weeklyHours >= 1 && weeklyHours <= 40;
    if (step === 3) return studyDays >= 1 && studyDays <= 7;
    return false;
  };

  const nextStep = () => {
    if (canProceed() && step < 3) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-white">
        <h2 className="text-2xl font-bold">Create Your Study Roadmap</h2>
        <p className="text-blue-100 mt-2">
          Let AI build a personalized study plan based on your exam date and availability
        </p>
      </div>

      {/* Progress Steps */}
      <div className="px-6 pt-6">
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    s <= step
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {s}
                </div>
                <span className="text-xs mt-2 text-gray-600">
                  {s === 1 ? 'Exam Date' : s === 2 ? 'Study Time' : 'Schedule'}
                </span>
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-1 mx-2 ${s < step ? 'bg-blue-600' : 'bg-gray-200'}`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="px-6 py-6">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                When is your PMP exam?
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {examDate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-900 font-medium">
                  You have {weeksUntilExam} {weeksUntilExam === 1 ? 'week' : 'weeks'} until your exam
                </p>
                <p className="text-blue-700 text-sm mt-1">
                  {weeksUntilExam < 4
                    ? 'This is a tight timeline. Consider intensive study.'
                    : weeksUntilExam < 12
                    ? 'Good amount of time to prepare thoroughly.'
                    : 'Plenty of time! A relaxed pace will work well.'}
                </p>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How many hours can you study per week?
              </label>
              <input
                type="range"
                min="1"
                max="40"
                value={weeklyHours}
                onChange={(e) => setWeeklyHours(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>1 hour</span>
                <span className="font-bold text-lg text-blue-600">{weeklyHours} hours</span>
                <span>40 hours</span>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-900 font-medium">
                Study Intensity: <span className={intensityColor}>{intensity}</span>
              </p>
              <p className="text-gray-600 text-sm mt-1">
                Total study time before exam: ~{totalStudyHours} hours
              </p>
              <p className="text-gray-500 text-xs mt-2">
                {intensity === 'Intensive' &&
                  'This is a rigorous schedule. Make sure to take breaks and avoid burnout.'}
                {intensity === 'Moderate' &&
                  'A balanced approach that allows for deep learning while maintaining life balance.'}
                {intensity === 'Relaxed' &&
                  'A comfortable pace for steady progress. Great for working professionals.'}
              </p>
            </div>

            {/* Quick presets */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick presets
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setWeeklyHours(5)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="font-medium">Relaxed</div>
                  <div className="text-xs text-gray-500">5 hrs/week</div>
                </button>
                <button
                  type="button"
                  onClick={() => setWeeklyHours(10)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="font-medium">Moderate</div>
                  <div className="text-xs text-gray-500">10 hrs/week</div>
                </button>
                <button
                  type="button"
                  onClick={() => setWeeklyHours(20)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="font-medium">Intensive</div>
                  <div className="text-xs text-gray-500">20 hrs/week</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How many days per week will you study?
              </label>
              <input
                type="range"
                min="1"
                max="7"
                value={studyDays}
                onChange={(e) => setStudyDays(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500 mt-1">
                <span>1 day</span>
                <span className="font-bold text-lg text-blue-600">{studyDays} days</span>
                <span>7 days</span>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-900 font-medium">
                Daily study average: {Math.round((weeklyHours / studyDays) * 10) / 10} hours
              </p>
              <p className="text-gray-600 text-sm mt-1">
                {studyDays === 7 && 'Studying every day! Remember to take rest days.'}
                {studyDays >= 5 && studyDays < 7 && 'Consistent weekday schedule with weekend breaks.'}
                {studyDays < 5 && 'Focused study sessions with more rest days.'}
              </p>
            </div>

            {/* Summary */}
            <div className="border-2 border-blue-200 bg-blue-50 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3">Your Study Plan Summary</h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-center">
                  <span className="mr-2">📅</span>
                  <span>Exam date: {new Date(examDate).toLocaleDateString()}</span>
                </li>
                <li className="flex items-center">
                  <span className="mr-2">⏱️</span>
                  <span>
                    {weeksUntilExam} {weeksUntilExam === 1 ? 'week' : 'weeks'} to prepare
                  </span>
                </li>
                <li className="flex items-center">
                  <span className="mr-2">📚</span>
                  <span>
                    {weeklyHours} hours/week across {studyDays} days
                  </span>
                </li>
                <li className="flex items-center">
                  <span className="mr-2">🎯</span>
                  <span>Intensity: {intensity}</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <button
            type="button"
            onClick={step === 1 ? onCancel : prevStep}
            className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={!canProceed()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canProceed() || loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating Roadmap...
                </>
              ) : (
                'Create Study Roadmap'
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
