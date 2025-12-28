'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useCollaborationStore } from '@/stores/collaborationStore';
import {
  getGroupMembers,
  getDiscussions,
  getChallenges,
  type GroupMember,
  type Discussion,
  type Challenge,
} from '@/lib/api/collaboration';

interface StudyGroupDashboardProps {
  groupId: number;
}

interface InviteCodeData {
  code: string;
  invite_link: string;
  expires_at: string | null;
  max_uses: number | null;
}

/**
 * StudyGroupDashboard component
 *
 * Displays:
 * - Group information (name, description, member count)
 * - Member list with roles
 * - Invite code display with copy functionality
 * - Create challenge button
 * - Recent discussions preview
 */
export function StudyGroupDashboard({ groupId }: StudyGroupDashboardProps) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [inviteCode, setInviteCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  const currentGroup = useCollaborationStore((state) => state.currentGroup);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  // Copy invite code to clipboard
  const copyInviteCode = useCallback(async () => {
    if (!inviteCode) return;

    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [inviteCode]);

  // Load group data
  useEffect(() => {
    const loadGroupData = async () => {
      if (!groupId) return;

      setIsLoading(true);
      try {
        const [membersData, discussionsData, challengesData] = await Promise.all([
          getGroupMembers(groupId),
          getDiscussions(groupId, 5, 0),
          getChallenges(groupId, 3, 0),
        ]);

        setMembers(membersData);
        setDiscussions(discussionsData);
        setChallenges(challengesData);

        // Set invite code from current group
        if (currentGroup?.invite_code) {
          setInviteCode(currentGroup.invite_code);
        }
      } catch (error) {
        console.error('Failed to load group data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadGroupData();
  }, [groupId, currentGroup]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardBody>
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Group Info Card */}
      <Card>
        <CardHeader
          title={currentGroup?.name || 'Study Group'}
          subtitle={currentGroup?.description || 'No description'}
        />
        <CardBody>
          <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5"
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
              <span>{members.length} members</span>
            </div>
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>Created {currentGroup?.created_at ? formatDate(currentGroup.created_at) : 'Recently'}</span>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Members Card */}
        <Card>
          <CardHeader
            title="Members"
            subtitle={`${members.length} ${members.length === 1 ? 'member' : 'members'}`}
          />
          <CardBody>
            {members.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">No members yet</p>
            ) : (
              <ul className="space-y-3">
                {members.map((member) => (
                  <li
                    key={member.user_id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                        {member.display_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {member.display_name || 'Anonymous User'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {member.role}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Joined {formatDate(member.joined_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Invite Code Card */}
        <Card>
          <CardHeader
            title="Invite Code"
            subtitle="Share this code to let others join"
          />
          <CardBody>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteCode || 'Loading...'}
                  className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white font-mono"
                />
                <Button
                  variant={copySuccess ? 'success' : 'secondary'}
                  size="md"
                  onClick={copyInviteCode}
                  disabled={!inviteCode}
                >
                  {copySuccess ? (
                    <>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Share this code with other PMP students to invite them to your study group.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Actions Card */}
      <Card>
        <CardHeader title="Group Actions" />
        <CardBody>
          <div className="flex flex-wrap gap-3">
            <Link href={`/groups/${groupId}/challenges/new`}>
              <Button variant="primary" leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              }>
                Create Challenge
              </Button>
            </Link>
            <Link href={`/groups/${groupId}/discussions/new`}>
              <Button variant="secondary" leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              }>
                Start Discussion
              </Button>
            </Link>
          </div>
        </CardBody>
      </Card>

      {/* Recent Discussions Card */}
      <Card>
        <CardHeader
          title="Recent Discussions"
          subtitle={discussions.length > 0 ? `${discussions.length} active discussions` : 'No discussions yet'}
          action={
            discussions.length > 0 && (
              <Link href={`/groups/${groupId}/discussions`}>
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            )
          }
        />
        <CardBody>
          {discussions.length === 0 ? (
            <div className="text-center py-8">
              <svg
                className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-600 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No discussions yet. Start the conversation!
              </p>
              <Link href={`/groups/${groupId}/discussions/new`}>
                <Button variant="primary" size="sm">
                  Create Discussion
                </Button>
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {discussions.map((discussion) => (
                <li key={discussion.id}>
                  <Link
                    href={`/groups/${groupId}/discussions/${discussion.id}`}
                    className="block p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                      {discussion.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {discussion.content}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>by {discussion.author_name || 'Anonymous'}</span>
                      <span>•</span>
                      <span>{formatDate(discussion.created_at)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Active Challenges Card */}
      {challenges.length > 0 && (
        <Card>
          <CardHeader
            title="Active Challenges"
            subtitle={`${challenges.length} challenge${challenges.length > 1 ? 's' : ''} in progress`}
            action={
              <Link href={`/groups/${groupId}/challenges`}>
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            }
          />
          <CardBody>
            <ul className="space-y-3">
              {challenges.map((challenge) => (
                <li key={challenge.id}>
                  <Link
                    href={`/groups/${groupId}/challenges/${challenge.id}`}
                    className="block p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                      {challenge.name}
                    </h4>
                    {challenge.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {challenge.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>Ends {formatDate(challenge.end_date)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

export default StudyGroupDashboard;
