'use client';

import { useState, useEffect, FormEvent } from 'react';
import useSWR, { mutate } from 'swr';
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useCollaborationStore } from '@/stores/collaborationStore';
import {
  getDiscussions,
  createDiscussion,
  type Discussion,
  type DiscussionCreate,
} from '@/lib/api/collaboration';

interface ForumViewProps {
  groupId: number;
}

interface ReplyForm {
  discussionId: number;
  content: string;
}

export function ForumView({ groupId }: ForumViewProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyForms, setReplyForms] = useState<Record<number, string>>({});
  const [expandedReplies, setExpandedReplies] = useState<Record<number, boolean>>({});

  // Fetch discussions using SWR
  const { data: discussions, isLoading, isValidating } = useSWR<Discussion[]>(
    `/api/groups/${groupId}/discussions`,
    () => getDiscussions(groupId),
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
    }
  );

  // Sync discussions with store
  const setDiscussions = useCollaborationStore((state) => state.setDiscussions);
  const addDiscussion = useCollaborationStore((state) => state.addDiscussion);

  useEffect(() => {
    if (discussions) {
      setDiscussions(discussions);
    }
  }, [discussions, setDiscussions]);

  // Create discussion form state
  const [formData, setFormData] = useState<DiscussionCreate>({
    title: '',
    content: '',
  });

  // Format timestamp for display
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  // Format user display name
  const formatUserName = (name: string | null): string => {
    if (!name) return 'Anonymous';
    return name;
  };

  // Get user initials for avatar
  const getUserInitials = (name: string | null): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Handle create discussion
  const handleCreateDiscussion = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const newDiscussion = await createDiscussion(groupId, formData);
      addDiscussion(newDiscussion);

      // Reset form
      setFormData({ title: '', content: '' });
      setShowCreateForm(false);

      // Refresh discussions
      mutate(`/api/groups/${groupId}/discussions`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create discussion');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle reply form input
  const handleReplyChange = (discussionId: number, content: string) => {
    setReplyForms((prev) => ({
      ...prev,
      [discussionId]: content,
    }));
  };

  // Toggle reply section
  const toggleReplySection = (discussionId: number) => {
    setExpandedReplies((prev) => ({
      ...prev,
      [discussionId]: !prev[discussionId],
    }));
  };

  // Handle submit reply (placeholder for future backend support)
  const handleSubmitReply = async (discussionId: number) => {
    const content = replyForms[discussionId];
    if (!content?.trim()) return;

    // TODO: Implement reply submission when backend API is ready
    console.log('Reply to discussion', discussionId, ':', content);
    alert('Reply functionality will be available when the backend API is extended.');
    setReplyForms((prev) => ({
      ...prev,
      [discussionId]: '',
    }));
  };

  return (
    <div className="space-y-4">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Discussions
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {discussions?.length ?? 0} {discussions?.length === 1 ? 'discussion' : 'discussions'}
          </p>
        </div>
        <Button
          onClick={() => setShowCreateForm(!showCreateForm)}
          variant="primary"
        >
          {showCreateForm ? 'Cancel' : 'New Discussion'}
        </Button>
      </div>

      {/* Create discussion form */}
      {showCreateForm && (
        <Card variant="outlined" padding="md">
          <form onSubmit={handleCreateDiscussion} className="space-y-4">
            <div>
              <label
                htmlFor="discussion-title"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Title
              </label>
              <input
                id="discussion-title"
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="What would you like to discuss?"
                required
                maxLength={200}
              />
            </div>
            <div>
              <label
                htmlFor="discussion-content"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Content
              </label>
              <textarea
                id="discussion-content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
                rows={4}
                placeholder="Share your thoughts, questions, or insights..."
                required
                maxLength={5000}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                {formData.content.length} / 5000
              </p>
            </div>
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowCreateForm(false);
                  setFormData({ title: '', content: '' });
                  setError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || !formData.title.trim() || !formData.content.trim()}
              >
                {isSubmitting ? 'Creating...' : 'Create Discussion'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Discussions list */}
      {isLoading && !discussions ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading discussions...</p>
          </div>
        </div>
      ) : discussions && discussions.length > 0 ? (
        <div className="space-y-3">
          {discussions.map((discussion) => (
            <Card
              key={discussion.id}
              variant="default"
              padding="none"
              hoverable
              className="cursor-pointer"
            >
              <CardHeader>
                <div className="flex items-start gap-3">
                  {/* User avatar */}
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                    {getUserInitials(discussion.author_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                        {discussion.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {formatUserName(discussion.author_name)}
                      </span>
                      <span>·</span>
                      <span>{formatTimestamp(discussion.created_at)}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardBody>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                  {discussion.content}
                </p>
              </CardBody>
              <CardFooter>
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleReplySection(discussion.id)}
                  >
                    {expandedReplies[discussion.id] ? 'Hide Replies' : 'Reply'}
                  </Button>
                  <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                    <svg
                      className="w-4 h-4"
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
                    <span>0 replies</span>
                  </div>
                </div>

                {/* Reply section (expandable) */}
                {expandedReplies[discussion.id] && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                      Replies will be available when the backend API is extended.
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={replyForms[discussion.id] || ''}
                        onChange={(e) => handleReplyChange(discussion.id, e.target.value)}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Write a reply..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleSubmitReply(discussion.id);
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleSubmitReply(discussion.id)}
                        disabled={!replyForms[discussion.id]?.trim()}
                      >
                        Reply
                      </Button>
                    </div>
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
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
                d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              No discussions yet
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Start a conversation by creating the first discussion.
            </p>
          </div>
        </Card>
      )}

      {/* Refreshing indicator */}
      {isValidating && discussions && discussions.length > 0 && (
        <div className="flex items-center justify-center gap-2 py-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-blue-600 border-r-transparent"></div>
          <span className="text-xs text-gray-500 dark:text-gray-400">Refreshing...</span>
        </div>
      )}
    </div>
  );
}
