/**
 * SWR hooks for Collaboration API with polling support for real-time updates
 */

import useSWR from 'swr';
import { fetcher } from './client';
import {
  getChallenges,
  getGroups,
  getDiscussions,
  getMyGroups,
  getChallengeNotifications,
  type Challenge,
  type StudyGroupList,
  type Discussion,
  type ChallengeNotifications,
} from './collaboration';

// ============ Challenge Hooks with Polling ============

interface ChallengeNotifications {
  activeCount: number;
  newThisWeek: number;
  expiringSoon: number;
  hasActive: boolean;
}

/**
 * Hook for fetching challenges with polling for real-time notifications
 * Polls every 30 seconds to check for new/updated challenges
 */
export function useChallengesWithPolling(
  groupId: number | undefined,
  options?: { refreshInterval?: number; enablePolling?: boolean }
) {
  const refreshInterval = options?.refreshInterval ?? 30000; // Default 30 seconds
  const enablePolling = options?.enablePolling ?? true;

  const shouldFetch = groupId !== undefined;

  const {
    data: challenges,
    error,
    isLoading,
    mutate,
  } = useSWR<Challenge[]>(
    shouldFetch ? `challenges-${groupId}` : null,
    () => (groupId ? getChallenges(groupId) : Promise.resolve([])),
    {
      refreshInterval: enablePolling && shouldFetch ? refreshInterval : 0,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // Prevent duplicate requests within 5 seconds
    }
  );

  // Calculate notification counts
  const notifications = challenges
    ? calculateChallengeNotifications(challenges)
    : {
        activeCount: 0,
        newThisWeek: 0,
        expiringSoon: 0,
        hasActive: false,
      };

  return {
    challenges,
    notifications,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Calculate challenge notification counts for badges
 */
function calculateChallengeNotifications(challenges: Challenge[]): ChallengeNotifications {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  const active = challenges.filter((c) => {
    const start = new Date(c.start_date);
    const end = new Date(c.end_date);
    return start <= now && end >= now;
  });

  const newThisWeek = challenges.filter((c) => {
    const created = new Date(c.created_at);
    return created >= oneWeekAgo;
  });

  const expiringSoon = challenges.filter((c) => {
    const end = new Date(c.end_date);
    return end <= twoDaysFromNow && end >= now;
  });

  return {
    activeCount: active.length,
    newThisWeek: newThisWeek.length,
    expiringSoon: expiringSoon.length,
    hasActive: active.length > 0,
  };
}

/**
 * Hook for all user's challenges across their groups
 * Aggregates challenges from all groups the user is a member of
 */
export function useAllChallengesWithPolling(
  groupIds: number[],
  options?: { refreshInterval?: number; enablePolling?: boolean }
) {
  const refreshInterval = options?.refreshInterval ?? 30000;
  const enablePolling = options?.enablePolling ?? true;

  // Fetch challenges for all groups in parallel
  const queries = groupIds.map((groupId) => `challenges-${groupId}`);

  const {
    data: allChallenges,
    error,
    isLoading,
    mutate,
  } = useSWR<Challenge[]>(
    groupIds.length > 0 ? ['all-challenges', ...queries] : null,
    async () => {
      if (groupIds.length === 0) return [];
      const results = await Promise.all(
        groupIds.map((groupId) => getChallenges(groupId).catch(() => []))
      );
      return results.flat();
    },
    {
      refreshInterval: enablePolling && groupIds.length > 0 ? refreshInterval : 0,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  );

  const notifications = allChallenges
    ? calculateChallengeNotifications(allChallenges)
    : {
        activeCount: 0,
        newThisWeek: 0,
        expiringSoon: 0,
        hasActive: false,
      };

  return {
    allChallenges,
    notifications,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Simplified hook for just getting notification counts
 * Use this in the navigation/header to show badge counts
 * Uses the dedicated /challenge-notifications endpoint for efficiency
 */
export function useChallengeNotifications(
  options?: { refreshInterval?: number; enablePolling?: boolean }
) {
  const refreshInterval = options?.refreshInterval ?? 30000; // Default 30 seconds
  const enablePolling = options?.enablePolling ?? true;

  const { data, error, isLoading } = useSWR<ChallengeNotifications>(
    'challenge-notifications',
    getChallengeNotifications,
    {
      refreshInterval: enablePolling ? refreshInterval : 0,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );

  const notifications = data ?? {
    active_count: 0,
    new_this_week: 0,
    expiring_soon: 0,
  };

  // Total notification count is the sum of new and expiring challenges
  const totalCount = notifications.new_this_week + notifications.expiring_soon;

  return {
    count: totalCount,
    activeCount: notifications.active_count,
    newThisWeek: notifications.new_this_week,
    expiringSoon: notifications.expiring_soon,
    hasActive: notifications.active_count > 0,
    hasNotifications: totalCount > 0,
    isLoading,
    error,
  };
}

/**
 * Hook for user's joined groups with polling
 */
export function useMyGroupsWithPolling(options?: {
  refreshInterval?: number;
  enablePolling?: boolean;
}) {
  const refreshInterval = options?.refreshInterval ?? 60000; // Default 60 seconds
  const enablePolling = options?.enablePolling ?? true;

  return useSWR<StudyGroupList[]>('my-groups', getMyGroups, {
    refreshInterval: enablePolling ? refreshInterval : 0,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });
}

// ============ Group Hooks with Polling ============

/**
 * Hook for study groups with polling
 */
export function useGroupsWithPolling(options?: {
  refreshInterval?: number;
  enablePolling?: boolean;
}) {
  const refreshInterval = options?.refreshInterval ?? 60000; // Default 60 seconds
  const enablePolling = options?.enablePolling ?? true;

  return useSWR<StudyGroupList[]>('groups', () => getGroups(), {
    refreshInterval: enablePolling ? refreshInterval : 0,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });
}

// ============ Discussion Hooks with Polling ============

/**
 * Hook for discussions with polling
 */
export function useDiscussionsWithPolling(
  groupId: number | undefined,
  options?: { refreshInterval?: number; enablePolling?: boolean }
) {
  const refreshInterval = options?.refreshInterval ?? 30000; // Default 30 seconds
  const enablePolling = options?.enablePolling ?? true;

  const shouldFetch = groupId !== undefined;

  return useSWR<Discussion[]>(
    shouldFetch ? `discussions-${groupId}` : null,
    () => (groupId ? getDiscussions(groupId) : Promise.resolve([])),
    {
      refreshInterval: enablePolling && shouldFetch ? refreshInterval : 0,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
    }
  );
}
