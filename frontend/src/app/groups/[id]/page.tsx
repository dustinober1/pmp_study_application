'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { StudyGroupDashboard } from '@/components/groups/StudyGroupDashboard';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { getGroups } from '@/lib/api/collaboration';
import type { StudyGroup } from '@/lib/api/collaboration';

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const setCurrentGroup = useCollaborationStore((state) => state.setCurrentGroup);
  const currentGroup = useCollaborationStore((state) => state.currentGroup);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGroup = useCallback(async () => {
    if (!groupId) return;

    setIsLoading(true);
    setError(null);

    try {
      const groups = await getGroups();
      const group = groups.find((g) => g.id === Number(groupId));

      if (!group) {
        setError('Group not found');
        return;
      }

      // Set the full group object in store
      const fullGroup: StudyGroup = {
        id: group.id,
        name: group.name,
        description: group.description,
        invite_code: group.invite_code,
        created_by_id: '', // Will be filled by backend
        created_at: group.created_at,
        updated_at: group.created_at, // Use created_at as fallback
      };

      setCurrentGroup(fullGroup);
    } catch (err) {
      console.error('Failed to load group:', err);
      setError('Failed to load group');
    } finally {
      setIsLoading(false);
    }
  }, [groupId, setCurrentGroup]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <Card>
            <CardBody>
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded" />
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card>
          <CardBody className="text-center py-12">
            <svg
              className="w-16 h-16 mx-auto text-red-500 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {error}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The study group you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
            </p>
            <div className="flex justify-center gap-3">
              <Link href="/groups">
                <Button variant="primary">Browse Groups</Button>
              </Link>
              <Button variant="secondary" onClick={() => router.back()}>
                Go Back
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center gap-2 text-sm">
          <li>
            <Link
              href="/groups"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Study Groups
            </Link>
          </li>
          <li className="text-gray-400">/</li>
          <li className="text-gray-900 dark:text-white font-medium">
            {currentGroup?.name || 'Group'}
          </li>
        </ol>
      </nav>

      {/* Group Dashboard */}
      <StudyGroupDashboard groupId={Number(groupId)} />
    </div>
  );
}
