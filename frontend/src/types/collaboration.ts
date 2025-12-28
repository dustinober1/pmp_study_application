/**
 * TypeScript type definitions for Collaboration Features
 * Matches backend Pydantic schemas for Study Groups, Discussions, and Challenges
 */

// ============ Enums ============

export type GroupRole = 'owner' | 'admin' | 'member';
export type GroupStatus = 'active' | 'archived';
export type MembershipStatus = 'pending' | 'active' | 'removed';
export type DiscussionStatus = 'open' | 'closed' | 'pinned';
export type ChallengeStatus = 'pending' | 'active' | 'completed' | 'expired';
export type ChallengeType = 'daily_quiz' | 'flashcard_speed' | 'streak_challenge' | 'domain_mastery';

// ============ Study Group Types ============

export interface StudyGroup {
  id: string; // UUID
  name: string;
  description: string | null;
  owner_id: string; // UUID
  invite_code: string;
  max_members: number;
  member_count: number;
  status: GroupStatus;
  created_at: string;
  updated_at: string;
}

export interface StudyGroupDetail extends StudyGroup {
  members: StudyGroupMember[];
}

export interface StudyGroupMember {
  id: string; // UUID
  group_id: string; // UUID
  user_id: string; // UUID
  role: GroupRole;
  status: MembershipStatus;
  points: number;
  joined_at: string;
}

export interface StudyGroupMemberWithUser extends StudyGroupMember {
  user: {
    id: string;
    display_name: string | null;
  };
}

export interface StudyGroupCreate {
  name: string;
  description?: string;
  max_members?: number;
}

export interface StudyGroupUpdate {
  name?: string;
  description?: string;
  max_members?: number;
  status?: GroupStatus;
}

export interface StudyGroupJoinRequest {
  invite_code: string;
}

// ============ Invite Code Types ============

export interface InviteCode {
  id: string; // UUID
  group_id: string; // UUID
  code: string;
  max_uses: number | null;
  use_count: number;
  expires_at: string | null;
  created_by: string; // UUID
  created_at: string;
}

export interface InviteCodeCreate {
  max_uses?: number;
  expires_hours?: number;
}

export interface InviteCodeResponse {
  code: string;
  invite_link: string;
  expires_at: string | null;
  max_uses: number | null;
}

// ============ Discussion Types ============

export interface Discussion {
  id: string; // UUID
  group_id: string; // UUID
  user_id: string; // UUID
  title: string;
  content: string;
  domain_id: number | null;
  task_id: number | null;
  flashcard_id: number | null;
  question_id: number | null;
  status: DiscussionStatus;
  view_count: number;
  reply_count: number;
  created_at: string;
  updated_at: string;
}

export interface DiscussionDetail extends Discussion {
  user: {
    id: string;
    display_name: string | null;
  };
  replies: DiscussionReply[];
}

export interface DiscussionCreate {
  title: string;
  content: string;
  domain_id?: number;
  task_id?: number;
  flashcard_id?: number;
  question_id?: number;
}

export interface DiscussionUpdate {
  title?: string;
  content?: string;
  status?: DiscussionStatus;
}

export interface DiscussionReply {
  id: string; // UUID
  discussion_id: string; // UUID
  user_id: string; // UUID
  content: string;
  created_at: string;
  updated_at: string;
}

export interface DiscussionReplyWithUser extends DiscussionReply {
  user: {
    id: string;
    display_name: string | null;
  };
}

export interface DiscussionReplyCreate {
  content: string;
}

// ============ Challenge Types ============

export interface Challenge {
  id: string; // UUID
  group_id: string; // UUID
  created_by: string; // UUID
  name: string;
  description: string | null;
  challenge_type: ChallengeType;
  status: ChallengeStatus;
  domain_id: number | null;
  target_score: number | null;
  start_at: string;
  end_at: string;
  created_at: string;
  updated_at: string;
}

export interface ChallengeDetail extends Challenge {
  participants: ChallengeParticipant[];
  creator: {
    id: string;
    display_name: string | null;
  };
}

export interface ChallengeCreate {
  name: string;
  description?: string;
  challenge_type: ChallengeType;
  domain_id?: number;
  target_score?: number;
  start_at: string;
  end_at: string;
}

export interface ChallengeUpdate {
  name?: string;
  description?: string;
  status?: ChallengeStatus;
  end_at?: string;
}

export interface ChallengeParticipant {
  id: string; // UUID
  challenge_id: string; // UUID
  user_id: string; // UUID
  score: number;
  completed_at: string | null;
  joined_at: string;
}

export interface ChallengeParticipantWithUser extends ChallengeParticipant {
  user: {
    id: string;
    display_name: string | null;
  };
}

export interface ChallengeLeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string | null;
  score: number;
  completed_at: string | null;
}

export interface ChallengeLeaderboardResponse {
  challenge_id: string;
  challenge_name: string;
  entries: ChallengeLeaderboardEntry[];
  current_user_rank: number | null;
}

// ============ Notification Types ============

export type NotificationType = 'group_invite' | 'discussion_reply' | 'challenge_invite' | 'challenge_update' | 'achievement';

export interface Notification {
  id: string; // UUID
  user_id: string; // UUID
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface NotificationUpdate {
  read: boolean;
}

// ============ Activity Types ============

export type ActivityType = 'group_created' | 'member_joined' | 'discussion_created' | 'discussion_replied' | 'challenge_created' | 'challenge_completed' | 'achievement_earned';

export interface GroupActivity {
  id: string; // UUID
  group_id: string; // UUID
  user_id: string; // UUID;
  activity_type: ActivityType;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface GroupActivityWithUser extends GroupActivity {
  user: {
    id: string;
    display_name: string | null;
  };
}

// ============ Leaderboard Types ============

export interface GroupLeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string | null;
  points: number;
  flashcards_reviewed: number;
  questions_answered: number;
  streak_days: number;
}

export interface GroupLeaderboardResponse {
  group_id: string;
  period: 'all_time' | 'weekly' | 'monthly';
  entries: GroupLeaderboardEntry[];
  current_user_rank: number | null;
}
