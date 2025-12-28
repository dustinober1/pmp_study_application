'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ForumView } from '@/components/discussions/ForumView';
import { getGroups, type StudyGroupList } from '@/lib/api/collaboration';

// Group selector component
function GroupSelector({
  groups,
  selectedGroupId,
  onSelectGroup,
  isLoading,
}: {
  groups: StudyGroupList[];
  selectedGroupId: number | null;
  onSelectGroup: (groupId: number | null) => void;
  isLoading: boolean;
}) {
  return (
    <Card variant="outlined" padding="md">
      <label
        htmlFor="group-select"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
      >
        Select Study Group
      </label>
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent"></div>
          Loading groups...
        </div>
      ) : groups.length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          No study groups available. Create or join a group to participate in discussions.
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            id="group-select"
            value={selectedGroupId ?? ''}
            onChange={(e) => onSelectGroup(e.target.value ? Number(e.target.value) : null)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">-- Select a group --</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} {group.member_count > 0 ? `(${group.member_count} members)` : ''}
              </option>
            ))}
          </select>
          {selectedGroupId && (
            <Button
              variant="secondary"
              onClick={() => onSelectGroup(null)}
            >
              Clear
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

// Loading skeleton for discussions
function DiscussionsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
        </div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg w-32 animate-pulse"></div>
      </div>
      {[1, 2, 3].map((i) => (
        <Card key={i} variant="default" padding="none">
          <div className="p-4 space-y-3 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// Empty state for no group selected
function NoGroupSelected() {
  return (
    <Card variant="outlined" padding="lg">
      <div className="text-center py-8">
        <svg
          className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
          No group selected
        </h3>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Select a study group above to view and participate in discussions.
        </p>
      </div>
    </Card>
  );
}

// Main discussions content component
function DiscussionsContent() {
  const searchParams = useSearchParams();
  const groupIdParam = searchParams.get('group_id');
  const initialGroupId = groupIdParam ? Number(groupIdParam) : null;

  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(initialGroupId);

  // Sync URL params with state
  useEffect(() => {
    const paramGroupId = searchParams.get('group_id');
    const urlGroupId = paramGroupId ? Number(paramGroupId) : null;
    if (urlGroupId !== selectedGroupId) {
      setSelectedGroupId(urlGroupId);
    }
  }, [searchParams, selectedGroupId]);

  // Fetch groups
  const { data: groups, isLoading: groupsLoading, error: groupsError } = useSWR<StudyGroupList[]>(
    '/api/groups',
    () => getGroups(),
    {
      revalidateOnFocus: true,
    }
  );

  // Handle group selection
  const handleSelectGroup = (groupId: number | null) => {
    setSelectedGroupId(groupId);
    // Update URL without navigating
    const url = new URL(window.location.href);
    if (groupId) {
      url.searchParams.set('group_id', groupId.toString());
    } else {
      url.searchParams.delete('group_id');
    }
    window.history.replaceState({}, '', url.toString());
  };

  // Get selected group info
  const selectedGroup = groups?.find((g) => g.id === selectedGroupId);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Discussion Forums
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Connect with your study groups and join the conversation
        </p>
      </div>

      {/* Group Selector */}
      <GroupSelector
        groups={groups ?? []}
        selectedGroupId={selectedGroupId}
        onSelectGroup={handleSelectGroup}
        isLoading={groupsLoading}
      />

      {/* Groups Error State */}
      {groupsError && !groupsLoading && (
        <Card variant="outlined" padding="md" className="border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Unable to load study groups
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                You can still access discussions directly via URL if you know the group ID.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Discussions for selected group */}
      {selectedGroupId ? (
        <>
          {/* Group info header */}
          {selectedGroup && (
            <Card variant="default" padding="md">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedGroup.name}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedGroup.member_count} {selectedGroup.member_count === 1 ? 'member' : 'members'}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Forum View */}
          <Suspense fallback={<DiscussionsSkeleton />}>
            <ForumView groupId={selectedGroupId} />
          </Suspense>
        </>
      ) : (
        <NoGroupSelected />
      )}
    </div>
  );
}

// Main page component with Suspense boundary for useSearchParams
export default function DiscussionsPage() {
  return (
    <Suspense fallback={<DiscussionsSkeleton />}>
      <DiscussionsContent />
    </Suspense>
  );
}
