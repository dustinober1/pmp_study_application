/**
 * Zustand store for collaboration state management
 * Handles study groups, discussions, and challenges
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  StudyGroup,
  StudyGroupList,
  GroupMember,
  Discussion,
  Challenge,
} from '@/lib/api/collaboration';

interface CollaborationState {
  // Study groups
  groups: StudyGroupList[];
  currentGroup: StudyGroup | null;
  groupMembers: GroupMember[];
  inviteCode: string | null;

  // Discussions
  discussions: Discussion[];

  // Challenges
  challenges: Challenge[];

  // Loading states
  isLoadingGroups: boolean;
  isLoadingDiscussions: boolean;
  isLoadingChallenges: boolean;
  error: string | null;

  // Actions - Study Groups
  setGroups: (groups: StudyGroupList[]) => void;
  setCurrentGroup: (group: StudyGroup | null) => void;
  setGroupMembers: (members: GroupMember[]) => void;
  setInviteCode: (code: string | null) => void;
  addGroup: (group: StudyGroupList) => void;
  updateGroup: (groupId: number, updates: Partial<StudyGroupList>) => void;
  removeGroup: (groupId: number) => void;

  // Actions - Discussions
  setDiscussions: (discussions: Discussion[]) => void;
  addDiscussion: (discussion: Discussion) => void;
  updateDiscussion: (discussionId: number, updates: Partial<Discussion>) => void;
  removeDiscussion: (discussionId: number) => void;

  // Actions - Challenges
  setChallenges: (challenges: Challenge[]) => void;
  addChallenge: (challenge: Challenge) => void;
  updateChallenge: (challengeId: number, updates: Partial<Challenge>) => void;
  removeChallenge: (challengeId: number) => void;

  // Loading states
  setLoadingGroups: (loading: boolean) => void;
  setLoadingDiscussions: (loading: boolean) => void;
  setLoadingChallenges: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  groups: [],
  currentGroup: null,
  groupMembers: [],
  inviteCode: null,
  discussions: [],
  challenges: [],
  isLoadingGroups: false,
  isLoadingDiscussions: false,
  isLoadingChallenges: false,
  error: null,
};

export const useCollaborationStore = create<CollaborationState>()(
  persist(
    (set) => ({
      ...initialState,

      // Study Group actions
      setGroups: (groups) => {
        set({ groups });
      },

      setCurrentGroup: (group) => {
        set({ currentGroup: group });
      },

      setGroupMembers: (members) => {
        set({ groupMembers: members });
      },

      setInviteCode: (code) => {
        set({ inviteCode: code });
      },

      addGroup: (group) => {
        set((state) => ({
          groups: [...state.groups, group],
        }));
      },

      updateGroup: (groupId, updates) => {
        set((state) => ({
          groups: state.groups.map((g) =>
            g.id === groupId ? { ...g, ...updates } : g
          ),
          currentGroup:
            state.currentGroup?.id === groupId
              ? { ...state.currentGroup, ...updates }
              : state.currentGroup,
        }));
      },

      removeGroup: (groupId) => {
        set((state) => ({
          groups: state.groups.filter((g) => g.id !== groupId),
          currentGroup:
            state.currentGroup?.id === groupId ? null : state.currentGroup,
        }));
      },

      // Discussion actions
      setDiscussions: (discussions) => {
        set({ discussions });
      },

      addDiscussion: (discussion) => {
        set((state) => ({
          discussions: [...state.discussions, discussion],
        }));
      },

      updateDiscussion: (discussionId, updates) => {
        set((state) => ({
          discussions: state.discussions.map((d) =>
            d.id === discussionId ? { ...d, ...updates } : d
          ),
        }));
      },

      removeDiscussion: (discussionId) => {
        set((state) => ({
          discussions: state.discussions.filter((d) => d.id !== discussionId),
        }));
      },

      // Challenge actions
      setChallenges: (challenges) => {
        set({ challenges });
      },

      addChallenge: (challenge) => {
        set((state) => ({
          challenges: [...state.challenges, challenge],
        }));
      },

      updateChallenge: (challengeId, updates) => {
        set((state) => ({
          challenges: state.challenges.map((c) =>
            c.id === challengeId ? { ...c, ...updates } : c
          ),
        }));
      },

      removeChallenge: (challengeId) => {
        set((state) => ({
          challenges: state.challenges.filter((c) => c.id !== challengeId),
        }));
      },

      // Loading states
      setLoadingGroups: (loading) => {
        set({ isLoadingGroups: loading });
      },

      setLoadingDiscussions: (loading) => {
        set({ isLoadingDiscussions: loading });
      },

      setLoadingChallenges: (loading) => {
        set({ isLoadingChallenges: loading });
      },

      setError: (error) => {
        set({ error });
      },

      // Reset
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'pmp-collaboration-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentGroup: state.currentGroup,
        inviteCode: state.inviteCode,
      }),
    }
  )
);

// Selector hooks for common use cases
export const useGroups = () => useCollaborationStore((state) => state.groups);
export const useCurrentGroup = () => useCollaborationStore((state) => state.currentGroup);
export const useGroupMembers = () => useCollaborationStore((state) => state.groupMembers);
export const useInviteCode = () => useCollaborationStore((state) => state.inviteCode);
export const useDiscussions = () => useCollaborationStore((state) => state.discussions);
export const useChallenges = () => useCollaborationStore((state) => state.challenges);
export const useIsLoadingGroups = () => useCollaborationStore((state) => state.isLoadingGroups);
export const useIsLoadingDiscussions = () => useCollaborationStore((state) => state.isLoadingDiscussions);
export const useIsLoadingChallenges = () => useCollaborationStore((state) => state.isLoadingChallenges);
export const useCollaborationError = () => useCollaborationStore((state) => state.error);

// Computed selectors
export const useGroupById = (groupId: number) => {
  return useCollaborationStore((state) =>
    state.groups.find((g) => g.id === groupId)
  );
};

export const useDiscussionById = (discussionId: number) => {
  return useCollaborationStore((state) =>
    state.discussions.find((d) => d.id === discussionId)
  );
};

export const useChallengeById = (challengeId: number) => {
  return useCollaborationStore((state) =>
    state.challenges.find((c) => c.id === challengeId)
  );
};

export const useGroupDiscussions = (groupId: number) => {
  return useCollaborationStore((state) =>
    state.discussions.filter((d) => d.group_id === groupId)
  );
};

export const useGroupChallenges = (groupId: number) => {
  return useCollaborationStore((state) =>
    state.challenges.filter((c) => c.group_id === groupId)
  );
};

export const useActiveChallenges = () => {
  const now = new Date();
  return useCollaborationStore((state) =>
    state.challenges.filter((c) => {
      const start = new Date(c.start_date);
      const end = new Date(c.end_date);
      return start <= now && end >= now;
    })
  );
};
