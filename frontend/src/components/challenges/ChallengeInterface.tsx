'use client';

import { useState, useEffect } from 'react';
import Card, { CardHeader, CardBody, CardFooter } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useCollaborationStore } from '@/stores/collaborationStore';
import {
  getChallenges,
  joinChallenge,
  getChallengeLeaderboard,
  type LeaderboardEntry,
  type ChallengeLeaderboard,
} from '@/lib/api/collaboration';

interface ChallengeInterfaceProps {
  groupId: number;
}

type ChallengeStatus = 'pending' | 'active' | 'completed' | 'expired';

interface Challenge {
  id: number;
  group_id: number;
  created_by_id: string;
  created_by_name: string | null;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  created_at: string;
}

export default function ChallengeInterface({ groupId }: ChallengeInterfaceProps) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [leaderboard, setLeaderboard] = useState<ChallengeLeaderboard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'leaderboard'>('list');

  const setErrorCollab = useCollaborationStore((state) => state.setError);

  // Load challenges on mount
  useEffect(() => {
    loadChallenges();
  }, [groupId]);

  const loadChallenges = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getChallenges(groupId);
      setChallenges(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load challenges');
      setErrorCollab(err instanceof Error ? err.message : 'Failed to load challenges');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLeaderboard = async (challenge: Challenge) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getChallengeLeaderboard(groupId, challenge.id);
      setLeaderboard(data);
      setSelectedChallenge(challenge);
      setView('leaderboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinChallenge = async (challenge: Challenge) => {
    setIsJoining(true);
    setError(null);
    try {
      await joinChallenge(groupId, challenge.id);
      // Refresh leaderboard after joining
      await loadLeaderboard(challenge);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join challenge');
    } finally {
      setIsJoining(false);
    }
  };

  const getChallengeStatus = (challenge: Challenge): ChallengeStatus => {
    const now = new Date();
    const start = new Date(challenge.start_date);
    const end = new Date(challenge.end_date);

    if (now < start) return 'pending';
    if (now > end) return 'expired';
    return 'active';
  };

  const getStatusBadgeStyles = (status: ChallengeStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'expired':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

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

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Challenges
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Compete with your group and track your progress
          </p>
        </div>
        {view === 'leaderboard' && selectedChallenge && (
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              setView('list');
              setSelectedChallenge(null);
              setLeaderboard(null);
            }}
          >
            Back to Challenges
          </Button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {view === 'list' ? (
        <>
          {/* Challenge List */}
          {isLoading && challenges.length === 0 ? (
            <Card padding="lg">
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            </Card>
          ) : challenges.length === 0 ? (
            <Card padding="lg">
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
                  No challenges yet
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Challenges will appear here once created by group members.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {challenges.map((challenge) => {
                const status = getChallengeStatus(challenge);
                return (
                  <Card key={challenge.id} hoverable padding="md">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {challenge.name}
                          </h3>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeStyles(
                              status
                            )}`}
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        </div>
                        {challenge.description && (
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {challenge.description}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <span>
                              {formatDate(challenge.start_date)} - {formatDate(challenge.end_date)}
                            </span>
                          </div>
                          {challenge.created_by_name && (
                            <div className="flex items-center gap-1">
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                              </svg>
                              <span>Created by {challenge.created_by_name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => loadLeaderboard(challenge)}
                          disabled={isLoading}
                        >
                          View Leaderboard
                        </Button>
                        {status === 'active' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleJoinChallenge(challenge)}
                            disabled={isJoining}
                          >
                            {isJoining ? 'Joining...' : 'Join Challenge'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Leaderboard View */}
          {selectedChallenge && (
            <>
              <Card>
                <CardHeader
                  title={selectedChallenge.name}
                  subtitle={
                    leaderboard
                      ? `${leaderboard.entries.length} participant${leaderboard.entries.length !== 1 ? 's' : ''}`
                      : 'Loading leaderboard...'
                  }
                />
                <CardBody>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : leaderboard && leaderboard.entries.length > 0 ? (
                    <div className="space-y-2">
                      {/* Current user highlight */}
                      {leaderboard.current_user_rank !== null && (
                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                #{leaderboard.current_user_rank}
                              </span>
                              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                Your Rank
                              </span>
                            </div>
                            <div className="text-sm text-blue-700 dark:text-blue-300">
                              {leaderboard.entries.find((e) => e.rank === leaderboard.current_user_rank)?.score || 0}{' '}
                              points
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Leaderboard entries */}
                      {leaderboard.entries.map((entry) => (
                        <div
                          key={entry.user_id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-lg font-bold text-gray-700 dark:text-gray-300 min-w-[60px]">
                              {getRankIcon(entry.rank)}
                            </span>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {entry.display_name || 'Anonymous User'}
                              </p>
                              {entry.completed_at && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Completed {formatDate(entry.completed_at)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                              {entry.score}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">points</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
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
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                        No participants yet
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Be the first to join this challenge!
                      </p>
                      <div className="mt-4">
                        <Button
                          size="md"
                          variant="primary"
                          onClick={() => handleJoinChallenge(selectedChallenge)}
                          disabled={isJoining}
                        >
                          {isJoining ? 'Joining...' : 'Join Challenge'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Challenge Details */}
              <Card>
                <CardHeader title="Challenge Details" />
                <CardBody>
                  <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Challenge Type
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                        Study Competition
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Status
                      </dt>
                      <dd className="mt-1">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeStyles(
                            getChallengeStatus(selectedChallenge)
                          )}`}
                        >
                          {getChallengeStatus(selectedChallenge).charAt(0).toUpperCase() +
                            getChallengeStatus(selectedChallenge).slice(1)}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Start Date
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                        {formatDate(selectedChallenge.start_date)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        End Date
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                        {formatDate(selectedChallenge.end_date)}
                      </dd>
                    </div>
                  </dl>
                  {selectedChallenge.description && (
                    <div className="mt-4">
                      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Description
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                        {selectedChallenge.description}
                      </dd>
                    </div>
                  )}
                </CardBody>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
