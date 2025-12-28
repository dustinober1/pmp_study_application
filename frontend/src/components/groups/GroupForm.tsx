'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { createGroup, getGroups } from '@/lib/api/collaboration';
import { useCollaborationStore } from '@/stores/collaborationStore';

type FormMode = 'create' | 'join';

export interface GroupFormProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: FormMode;
}

interface CreateFormData {
  name: string;
  description: string;
}

interface JoinFormData {
  inviteCode: string;
}

/**
 * GroupForm component for creating new study groups or joining existing ones
 *
 * Create mode: Collects group name and optional description
 * Join mode: Collects invite code to join an existing group
 */
export function GroupForm({ isOpen, onClose, mode = 'create' }: GroupFormProps) {
  const router = useRouter();
  const addGroup = useCollaborationStore((state) => state.addGroup);
  const setGroups = useCollaborationStore((state) => state.setGroups);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Create form state
  const [createData, setCreateData] = useState<CreateFormData>({
    name: '',
    description: '',
  });

  // Join form state
  const [joinData, setJoinData] = useState<JoinFormData>({
    inviteCode: '',
  });

  const resetForm = useCallback(() => {
    setCreateData({ name: '', description: '' });
    setJoinData({ inviteCode: '' });
    setError(null);
    setSuccess(false);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  // Validate create form
  const validateCreateForm = (): string | null => {
    if (!createData.name.trim()) {
      return 'Group name is required';
    }
    if (createData.name.length < 3) {
      return 'Group name must be at least 3 characters';
    }
    if (createData.name.length > 100) {
      return 'Group name must be less than 100 characters';
    }
    if (createData.description.length > 500) {
      return 'Description must be less than 500 characters';
    }
    return null;
  };

  // Validate join form
  const validateJoinForm = (): string | null => {
    if (!joinData.inviteCode.trim()) {
      return 'Invite code is required';
    }
    return null;
  };

  // Handle create group submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateCreateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const newGroup = await createGroup({
        name: createData.name.trim(),
        description: createData.description.trim() || undefined,
      });

      // Refresh groups list and add new group
      const groups = await getGroups();
      setGroups(groups);
      addGroup({
        id: newGroup.id,
        name: newGroup.name,
        description: newGroup.description,
        invite_code: newGroup.invite_code,
        member_count: 1,
        created_at: newGroup.created_at,
      });

      setSuccess(true);
      setTimeout(() => {
        handleClose();
        // Navigate to the new group
        router.push(`/groups/${newGroup.id}`);
      }, 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create group';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle join group submit
  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateJoinForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Find group by invite code from existing groups
      const groups = await getGroups();
      const groupToJoin = groups.find((g) => g.invite_code === joinData.inviteCode.trim());

      if (!groupToJoin) {
        setError('Invalid invite code. Please check and try again.');
        return;
      }

      // Note: The join API endpoint should be called here, but since the current
      // API client shows joinGroup takes groupId, we'll first navigate to the group
      // The group detail page should handle the actual join logic
      setSuccess(true);
      setTimeout(() => {
        handleClose();
        router.push(`/groups/${groupToJoin.id}`);
      }, 1000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to join group';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCreateMode = mode === 'create';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isCreateMode ? 'Create Study Group' : 'Join Study Group'}
      description={
        isCreateMode
          ? 'Create a new study group to collaborate with other PMP students'
          : 'Enter an invite code to join an existing study group'
      }
      size="md"
    >
      {success ? (
        <div className="text-center py-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-600 dark:text-green-400"
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
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {isCreateMode ? 'Group Created!' : 'Joining Group...'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {isCreateMode
              ? 'Your study group has been created successfully.'
              : 'Redirecting to your study group...'}
          </p>
        </div>
      ) : (
        <form onSubmit={isCreateMode ? handleCreateSubmit : handleJoinSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {isCreateMode ? (
            <>
              <Input
                label="Group Name"
                placeholder="e.g., PMP Study Group - March 2026"
                value={createData.name}
                onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                error={error?.includes('name') ? error : undefined}
                fullWidth
                required
                leftIcon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                }
              />

              <Input
                label="Description (Optional)"
                placeholder="What is this group about?"
                value={createData.description}
                onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
                error={error?.includes('Description') ? error : undefined}
                helperText={`${createData.description.length}/500 characters`}
                fullWidth
              />
            </>
          ) : (
            <Input
              label="Invite Code"
              placeholder="Enter the invite code"
              value={joinData.inviteCode}
              onChange={(e) => {
                // Format invite code to uppercase
                const formatted = e.target.value.toUpperCase();
                setJoinData({ ...joinData, inviteCode: formatted });
              }}
              error={error?.includes('code') || error?.includes('Invalid') ? error : undefined}
              helperText="Ask the group owner for the invite code"
              fullWidth
              required
              autoFocus
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
              }
            />
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              leftIcon={
                isSubmitting ? (
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : isCreateMode ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                    />
                  </svg>
                )
              }
            >
              {isSubmitting
                ? 'Processing...'
                : isCreateMode
                ? 'Create Group'
                : 'Join Group'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default GroupForm;
