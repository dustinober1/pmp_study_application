'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { useMyGroupsWithPolling } from '@/lib/api/collaboration-hooks';
import { getChallenges } from '@/lib/api/collaboration';
import type { Challenge, StudyGroupList } from '@/lib/api/collaboration';

export default function ChallengesPage() {
  const { data: groups = [], isLoading: groupsLoading } = useMyGroupsWithPolling({
    refreshInterval: 30000,
  });

  const [allChallenges, setAllChallenges] = useState<Array<{ challenge: Challenge; group: StudyGroupList }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadChallenges = useCallback(async () => {
    if (groups.length === 0) {
      setAllChallenges([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const challengesPromises = groups.map((group) =>
        getChallenges(group.id).catch(() => [])
      );
      const challengesArray = await Promise.all(challengesPromises);

      const flattened = challengesArray.flatMap((challenges, index) =>
        challenges.map((challenge) => ({
          challenge,
          group: groups[index],
        }))
      );

      setAllChallenges(flattened);
    } catch (error) {
      console.error('Failed to load challenges:', error);
    } finally {
      setIsLoading(false);
    }
  }, [groups]);

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getChallengeStatus = (challenge: Challenge) => {
    const now = new Date();
    const start = new Date(challenge.start_date);
    const end = new Date(challenge.end_date);

    if (now < start) return { label: 'Upcoming', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' };
    if (now > end) return { label: 'Ended', color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400' };
    return { label: 'Active', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
  };

  // Filter: active challenges first
  const sortedChallenges = [...allChallenges].sort((a, b) => {
    const aStatus = getChallengeStatus(a.challenge).label;
    const bStatus = getChallengeStatus(b.challenge).label;
    if (aStatus === 'Active' && bStatus !== 'Active') return -1;
    if (bStatus === 'Active' && aStatus !== 'Active') return 1;
    return new Date(b.challenge.created_at).getTime() - new Date(a.challenge.created_at).getTime();
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Challenges
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          View and join challenges from your study groups
        </p>
      </div>

      {/* Content */}
      {groupsLoading || isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardBody>
                <div className="animate-pulse space-y-4">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <svg
              className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Challenges Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Join a study group to access challenges
            </p>
            <Link href="/groups">
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                Browse Study Groups
              </button>
            </Link>
          </CardBody>
        </Card>
      ) : sortedChallenges.length === 0 ? (
        <Card>
          <CardBody className="text-center py-12">
            <svg
              className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Active Challenges
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Check back later for new challenges from your groups
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedChallenges.map(({ challenge, group }) => {
            const status = getChallengeStatus(challenge);
            return (
              <Link key={challenge.id} href={`/groups/${group.id}`}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader
                    title={challenge.name}
                    subtitle={
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          from {group.name}
                        </span>
                      </div>
                    }
                  />
                  <CardBody>
                    {challenge.description && (
                      <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                        {challenge.description}
                      </p>
                    )}
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Starts: {formatDate(challenge.start_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Ends: {formatDate(challenge.end_date)}</span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
