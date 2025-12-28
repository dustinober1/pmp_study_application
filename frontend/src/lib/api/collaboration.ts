/**
 * API client for Collaboration features (Study Groups, Discussions, Challenges)
 */

import { post, fetcher } from './client';

// ============ Types ============

export interface StudyGroupCreate {
  name: string;
  description?: string;
}

export interface StudyGroup {
  id: number;
  name: string;
  description: string | null;
  invite_code: string;
  created_by_id: string;
  created_at: string;
  updated_at: string;
}

export interface StudyGroupList {
  id: number;
  name: string;
  description: string | null;
  invite_code: string;
  member_count: number;
  created_at: string;
}

export interface JoinGroupRequest {
  invite_code: string;
}

export interface JoinGroupResponse {
  message: string;
  group_id: number;
  group_name: string;
}

export interface GroupMember {
  user_id: string;
  display_name: string | null;
  role: string;
  joined_at: string;
}

export interface DiscussionCreate {
  title: string;
  content: string;
}

export interface Discussion {
  id: number;
  group_id: number;
  user_id: string;
  author_name: string | null;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ChallengeCreate {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
}

export interface Challenge {
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

// ============ Study Group API ============

/**
 * Create a new study group
 * POST /api/groups
 */
export async function createGroup(data: StudyGroupCreate): Promise<StudyGroup> {
  return post<StudyGroupCreate, StudyGroup>('/api/groups', data);
}

/**
 * List all study groups with pagination
 * GET /api/groups?limit=50&offset=0
 */
export async function getGroups(limit = 50, offset = 0): Promise<StudyGroupList[]> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  return fetcher<StudyGroupList[]>(`/api/groups?${params.toString()}`);
}

/**
 * List user's joined groups
 * GET /api/groups/my-groups
 */
export async function getMyGroups(): Promise<StudyGroupList[]> {
  return fetcher<StudyGroupList[]>('/api/groups/my-groups');
}

/**
 * Get challenge notification counts
 * GET /api/groups/challenge-notifications
 */
export interface ChallengeNotifications {
  active_count: number;
  new_this_week: number;
  expiring_soon: number;
}

export async function getChallengeNotifications(): Promise<ChallengeNotifications> {
  return fetcher<ChallengeNotifications>('/api/groups/challenge-notifications');
}

/**
 * Join a study group using invite code
 * POST /api/groups/{groupId}/join
 */
export async function joinGroup(groupId: number, code: string): Promise<JoinGroupResponse> {
  return post<JoinGroupRequest, JoinGroupResponse>(
    `/api/groups/${groupId}/join`,
    { invite_code: code }
  );
}

/**
 * Get members of a study group
 * GET /api/groups/{groupId}/members
 */
export async function getGroupMembers(groupId: number): Promise<GroupMember[]> {
  return fetcher<GroupMember[]>(`/api/groups/${groupId}/members`);
}

// ============ Discussion API ============

/**
 * Create a new discussion in a study group
 * POST /api/groups/{groupId}/discussions
 */
export async function createDiscussion(
  groupId: number,
  data: DiscussionCreate
): Promise<Discussion> {
  return post<DiscussionCreate, Discussion>(
    `/api/groups/${groupId}/discussions`,
    data
  );
}

/**
 * Get discussions in a study group
 * GET /api/groups/{groupId}/discussions?limit=50&offset=0
 */
export async function getDiscussions(
  groupId: number,
  limit = 50,
  offset = 0
): Promise<Discussion[]> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  return fetcher<Discussion[]>(`/api/groups/${groupId}/discussions?${params.toString()}`);
}

// ============ Challenge API ============

/**
 * Create a new challenge in a study group
 * POST /api/groups/{groupId}/challenges
 */
export async function createChallenge(
  groupId: number,
  data: ChallengeCreate
): Promise<Challenge> {
  return post<ChallengeCreate, Challenge>(
    `/api/groups/${groupId}/challenges`,
    data
  );
}

/**
 * Get challenges in a study group
 * GET /api/groups/{groupId}/challenges?limit=50&offset=0
 */
export async function getChallenges(
  groupId: number,
  limit = 50,
  offset = 0
): Promise<Challenge[]> {
  const params = new URLSearchParams({
    limit: limit.toString(),
    offset: offset.toString(),
  });
  return fetcher<Challenge[]>(`/api/groups/${groupId}/challenges?${params.toString()}`);
}

/**
 * Join a challenge
 * POST /api/groups/{groupId}/challenges/{challengeId}/join
 */
export async function joinChallenge(
  groupId: number,
  challengeId: number
): Promise<{ message: string }> {
  return post<Record<string, never>, { message: string }>(
    `/api/groups/${groupId}/challenges/${challengeId}/join`,
    {}
  );
}

/**
 * Get challenge leaderboard
 * GET /api/groups/{groupId}/challenges/{challengeId}/leaderboard
 */
export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string | null;
  score: number;
  completed_at: string | null;
}

export interface ChallengeLeaderboard {
  challenge_id: number;
  challenge_name: string;
  entries: LeaderboardEntry[];
  current_user_rank: number | null;
}

export async function getChallengeLeaderboard(
  groupId: number,
  challengeId: number
): Promise<ChallengeLeaderboard> {
  return fetcher<ChallengeLeaderboard>(
    `/api/groups/${groupId}/challenges/${challengeId}/leaderboard`
  );
}
