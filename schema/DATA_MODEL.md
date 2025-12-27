# PMP Study App - Firestore Data Model

## Overview

This document describes the complete Firestore database schema for the PMP Study App. The app uses Firebase Firestore as its backend database to support a cross-platform (iOS, Android, Web) study application with FSRS-based spaced repetition.

## Design Principles

1. **User-centric data isolation**: Each user's study data is isolated and secured
2. **Efficient querying**: Composite indexes support common query patterns
3. **FSRS integration**: Card scheduling data follows the FSRS algorithm specification
4. **Hierarchical organization**: Content organized by Domain → Task → Flashcard
5. **Audit trail**: Complete review history for analytics and optimization
6. **Scalability**: Designed to support thousands of users and flashcards

## Collection Architecture

```
firestore/
├── domains/                    # Static reference data (3 domains)
├── tasks/                      # Static reference data (26 tasks)
├── flashcardContent/           # Master flashcard content (admin-managed)
├── users/                      # User profiles
│   └── {userId}/
│       └── progress/           # Per-domain/task progress tracking
├── flashcards/                 # User's flashcard instances with FSRS data
├── studySessions/              # Study session records
└── reviewHistory/              # Individual review audit trail
```

## Collections

### 1. Domains Collection

**Path**: `/domains/{domainId}`

**Purpose**: Static reference data for the 3 PMP exam domains.

**Document IDs**: `people`, `process`, `business_environment`

**Schema**:
```typescript
{
  id: string;                    // 'people', 'process', 'business_environment'
  name: string;                  // Display name
  percentage: number;            // Exam weight (33, 41, or 26)
  description: string;           // Domain description
  taskIds: string[];             // Array of task IDs in this domain
  createdAt: Date;
  updatedAt: Date;
}
```

**Example**:
```json
{
  "id": "people",
  "name": "People",
  "percentage": 33,
  "description": "Domain focusing on people management and leadership",
  "taskIds": ["people-1", "people-2", "people-3", ...],
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z"
}
```

**Security**: Read-only for authenticated users, write-only via Firebase Console or admin SDK.

**Indexes**: None required (small collection, simple queries).

---

### 2. Tasks Collection

**Path**: `/tasks/{taskId}`

**Purpose**: Static reference data for the 26 PMP exam tasks.

**Document IDs**: `people-1`, `people-2`, ..., `process-1`, ..., `business_environment-1`, ...

**Schema**:
```typescript
{
  id: string;                    // e.g., 'people-1'
  domainId: string;              // Parent domain ID
  taskNumber: number;            // Task number within domain (1-based)
  title: string;                 // Task title
  description: string;           // Detailed task description
  flashcardIds: string[];        // Array of flashcard content IDs
  createdAt: Date;
  updatedAt: Date;
}
```

**Example**:
```json
{
  "id": "people-1",
  "domainId": "people",
  "taskNumber": 1,
  "title": "Manage Conflict",
  "description": "Enable stakeholders to resolve their own conflicts...",
  "flashcardIds": ["fc-001", "fc-002", "fc-003"],
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z"
}
```

**Security**: Read-only for authenticated users, write-only via Firebase Console or admin SDK.

**Indexes**: None required (small collection).

---

### 3. Flashcard Content Collection

**Path**: `/flashcardContent/{contentId}`

**Purpose**: Master flashcard content managed by admins. Users reference this content via their personal flashcard instances.

**Schema**:
```typescript
{
  id: string;                    // Auto-generated
  domainId: string;              // Domain this card belongs to
  taskId: string;                // Task this card belongs to
  front: string;                 // Question/prompt
  back: string;                  // Answer/explanation
  hints?: string[];              // Optional hints
  references?: string[];         // PMBOK references
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  version: number;               // Content versioning
  stats: {
    totalReviews: number;
    averageRating: number;       // 1-4 scale
    averageRetention: number;    // Success rate
  };
  isActive: boolean;             // Can be deactivated
  createdAt: Date;
  updatedAt: Date;
}
```

**Example**:
```json
{
  "id": "fc-001",
  "domainId": "people",
  "taskId": "people-1",
  "front": "What are the 5 conflict resolution techniques?",
  "back": "1. Collaborate/Problem Solve\n2. Compromise/Reconcile\n3. Withdraw/Avoid\n4. Smooth/Accommodate\n5. Force/Direct",
  "hints": ["Think of the Thomas-Kilmann model"],
  "references": ["PMBOK 7th Edition, Section 2.3"],
  "difficulty": "medium",
  "tags": ["conflict", "leadership", "stakeholder-management"],
  "version": 1,
  "stats": {
    "totalReviews": 1250,
    "averageRating": 2.8,
    "averageRetention": 0.85
  },
  "isActive": true,
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z"
}
```

**Security**: Read-only for authenticated users, write-only for admins.

**Indexes**:
- `domainId + taskId + isActive` (fetch all active cards for a task)
- `isActive + difficulty` (filter by difficulty)
- `domainId + isActive` (fetch all active cards for a domain)
- `tags (array-contains) + isActive` (tag-based filtering)

---

### 4. Users Collection

**Path**: `/users/{userId}`

**Purpose**: User profiles, preferences, statistics, and personalized FSRS parameters.

**Document ID**: Firebase Auth UID

**Schema**:
```typescript
{
  uid: string;                   // Firebase Auth UID
  email: string;
  displayName?: string;
  photoURL?: string;
  subscriptionTier: 'free' | 'premium';
  subscriptionExpiresAt?: Date;
  preferences: {
    dailyGoal: number;           // Target cards per day
    studyReminderTime?: string;  // HH:MM format
    enableNotifications: boolean;
    theme: 'light' | 'dark' | 'auto';
  };
  stats: {
    totalCardsStudied: number;
    currentStreak: number;       // Days in a row
    longestStreak: number;
    totalStudyTime: number;      // Minutes
    lastStudyDate?: Date;
  };
  fsrsParameters: {
    requestRetention: number;    // Target retention (default: 0.9)
    maximumInterval: number;     // Max review interval days (default: 36500)
    w: number[];                 // 17 FSRS weights
  };
  createdAt: Date;
  updatedAt: Date;
}
```

**Example**:
```json
{
  "uid": "abc123",
  "email": "user@example.com",
  "displayName": "John Doe",
  "photoURL": "https://...",
  "subscriptionTier": "premium",
  "subscriptionExpiresAt": "2026-01-01T00:00:00Z",
  "preferences": {
    "dailyGoal": 20,
    "studyReminderTime": "19:00",
    "enableNotifications": true,
    "theme": "auto"
  },
  "stats": {
    "totalCardsStudied": 450,
    "currentStreak": 7,
    "longestStreak": 21,
    "totalStudyTime": 1280,
    "lastStudyDate": "2025-01-15T19:30:00Z"
  },
  "fsrsParameters": {
    "requestRetention": 0.9,
    "maximumInterval": 36500,
    "w": [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61]
  },
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-15T19:30:00Z"
}
```

**Security**: Users can only read/write their own profile.

**Indexes**: None required (documents accessed by UID).

---

### 5. User Progress Subcollection

**Path**: `/users/{userId}/progress/{progressId}`

**Purpose**: Track mastery and progress per domain and per task.

**Document IDs**: `{domainId}` or `{domainId}-{taskId}`

**Schema**:
```typescript
{
  id: string;                    // Domain or task ID
  userId: string;                // Parent user ID
  type: 'domain' | 'task';       // Progress level
  domainId: string;
  taskId?: string;               // Only for task-level
  totalCards: number;
  newCards: number;              // CardState.NEW
  learningCards: number;         // CardState.LEARNING
  reviewCards: number;           // CardState.REVIEW
  relearningCards: number;       // CardState.RELEARNING
  masteredCards: number;         // Cards with stability > 21 days
  masteryPercentage: number;     // masteredCards / totalCards * 100
  totalReviews: number;
  averageRetention: number;      // Success rate (0-1)
  lastStudiedAt?: Date;
  updatedAt: Date;
}
```

**Example**:
```json
{
  "id": "people-1",
  "userId": "abc123",
  "type": "task",
  "domainId": "people",
  "taskId": "people-1",
  "totalCards": 15,
  "newCards": 2,
  "learningCards": 3,
  "reviewCards": 8,
  "relearningCards": 2,
  "masteredCards": 8,
  "masteryPercentage": 53.33,
  "totalReviews": 127,
  "averageRetention": 0.87,
  "lastStudiedAt": "2025-01-15T19:30:00Z",
  "updatedAt": "2025-01-15T19:30:00Z"
}
```

**Security**: Users can only read/write their own progress.

**Indexes**:
- `userId + type + masteryPercentage` (sort by mastery)
- `userId + domainId + masteryPercentage` (domain-specific progress)
- `userId + type + updatedAt` (recently updated progress)

---

### 6. Flashcards Collection

**Path**: `/flashcards/{flashcardId}`

**Purpose**: User's personal flashcard instances with FSRS scheduling data. References master content via `contentId`.

**Schema**:
```typescript
{
  id: string;                    // Auto-generated
  userId: string;                // Owner
  contentId: string;             // Reference to flashcardContent
  domainId: string;
  taskId: string;
  fsrs: {
    state: 0 | 1 | 2 | 3;        // NEW, LEARNING, REVIEW, RELEARNING
    difficulty: number;          // 0-10
    stability: number;           // Memory stability (days)
    lastReview?: Date;
    due: Date;                   // Next review due date
    elapsedDays: number;
    scheduledDays: number;
    reps: number;                // Total review count
    lapses: number;              // Times forgotten
  };
  isSuspended: boolean;          // User can suspend cards
  tags: string[];                // User-defined tags
  notes?: string;                // Personal notes
  createdAt: Date;
  updatedAt: Date;
}
```

**Example**:
```json
{
  "id": "fc-user-001",
  "userId": "abc123",
  "contentId": "fc-001",
  "domainId": "people",
  "taskId": "people-1",
  "fsrs": {
    "state": 2,
    "difficulty": 5.2,
    "stability": 28.5,
    "lastReview": "2025-01-10T19:00:00Z",
    "due": "2025-02-07T19:00:00Z",
    "elapsedDays": 5,
    "scheduledDays": 28,
    "reps": 8,
    "lapses": 1
  },
  "isSuspended": false,
  "tags": ["important", "review-later"],
  "notes": "Remember the order matters!",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-10T19:00:00Z"
}
```

**Security**: Users can only access their own flashcards.

**Indexes**:
- `userId + domainId + taskId` (hierarchy navigation)
- `userId + fsrs.due` (get due cards)
- `userId + fsrs.state + fsrs.due` (filter by state and due date)
- `userId + domainId + fsrs.due` (domain-specific due cards)
- `userId + domainId + taskId + fsrs.due` (task-specific due cards)
- `userId + isSuspended + fsrs.due` (exclude suspended)
- `userId + tags (array-contains) + fsrs.due` (tag filtering)

---

### 7. Study Sessions Collection

**Path**: `/studySessions/{sessionId}`

**Purpose**: Record complete study sessions with aggregated metrics and detailed review list.

**Schema**:
```typescript
{
  id: string;
  userId: string;
  startedAt: Date;
  endedAt?: Date;
  durationSeconds: number;
  scope: {
    type: 'all' | 'domain' | 'task';
    domainId?: string;
    taskId?: string;
  };
  cardsReviewed: number;
  cardsNew: number;
  cardsRelearning: number;
  ratings: {
    again: number;               // Count of Rating.AGAIN (1)
    hard: number;                // Count of Rating.HARD (2)
    good: number;                // Count of Rating.GOOD (3)
    easy: number;                // Count of Rating.EASY (4)
  };
  reviews: [
    {
      flashcardId: string;
      contentId: string;
      domainId: string;
      taskId: string;
      rating: 1 | 2 | 3 | 4;
      timeSpent: number;         // Seconds
      previousState: 0 | 1 | 2 | 3;
      newState: 0 | 1 | 2 | 3;
      previousDue: Date;
      newDue: Date;
    }
  ];
  platform: 'web' | 'ios' | 'android';
  createdAt: Date;
}
```

**Example**:
```json
{
  "id": "session-001",
  "userId": "abc123",
  "startedAt": "2025-01-15T19:00:00Z",
  "endedAt": "2025-01-15T19:30:00Z",
  "durationSeconds": 1800,
  "scope": {
    "type": "domain",
    "domainId": "people"
  },
  "cardsReviewed": 20,
  "cardsNew": 5,
  "cardsRelearning": 2,
  "ratings": {
    "again": 3,
    "hard": 5,
    "good": 10,
    "easy": 2
  },
  "reviews": [
    {
      "flashcardId": "fc-user-001",
      "contentId": "fc-001",
      "domainId": "people",
      "taskId": "people-1",
      "rating": 3,
      "timeSpent": 45,
      "previousState": 2,
      "newState": 2,
      "previousDue": "2025-01-15T00:00:00Z",
      "newDue": "2025-02-12T00:00:00Z"
    }
  ],
  "platform": "web",
  "createdAt": "2025-01-15T19:30:00Z"
}
```

**Security**: Users can only access their own sessions.

**Indexes**:
- `userId + startedAt` (recent sessions)
- `userId + scope.domainId + startedAt` (domain-specific sessions)
- `userId + scope.taskId + startedAt` (task-specific sessions)
- `userId + platform + startedAt` (platform analytics)

---

### 8. Review History Collection

**Path**: `/reviewHistory/{reviewId}`

**Purpose**: Immutable audit trail of every individual card review. Used for analytics and FSRS optimization.

**Schema**:
```typescript
{
  id: string;
  userId: string;
  flashcardId: string;
  contentId: string;
  sessionId: string;             // Parent session
  domainId: string;
  taskId: string;
  rating: 1 | 2 | 3 | 4;
  timeSpent: number;             // Seconds
  stateBefore: 0 | 1 | 2 | 3;
  stateAfter: 0 | 1 | 2 | 3;
  dueBefore: Date;
  dueAfter: Date;
  difficultyBefore: number;
  difficultyAfter: number;
  stabilityBefore: number;
  stabilityAfter: number;
  reviewedAt: Date;
  createdAt: Date;
}
```

**Example**:
```json
{
  "id": "review-001",
  "userId": "abc123",
  "flashcardId": "fc-user-001",
  "contentId": "fc-001",
  "sessionId": "session-001",
  "domainId": "people",
  "taskId": "people-1",
  "rating": 3,
  "timeSpent": 45,
  "stateBefore": 2,
  "stateAfter": 2,
  "dueBefore": "2025-01-15T00:00:00Z",
  "dueAfter": "2025-02-12T00:00:00Z",
  "difficultyBefore": 5.2,
  "difficultyAfter": 5.0,
  "stabilityBefore": 28.5,
  "stabilityAfter": 32.1,
  "reviewedAt": "2025-01-15T19:15:00Z",
  "createdAt": "2025-01-15T19:15:00Z"
}
```

**Security**: Users can only access their own reviews. Reviews are immutable once created.

**Indexes**:
- `userId + flashcardId + reviewedAt` (card history)
- `userId + sessionId + reviewedAt` (session reviews)
- `userId + domainId + reviewedAt` (domain analytics)
- `userId + taskId + reviewedAt` (task analytics)
- `userId + rating + reviewedAt` (performance analysis)

---

## Data Flow

### 1. User Signup
1. Create user in Firebase Auth
2. Create `/users/{uid}` document with default preferences and FSRS parameters
3. Optionally initialize flashcard instances for the user

### 2. Starting a Study Session
1. Query `/flashcards` where `userId == currentUser` and `fsrs.due <= now` and `isSuspended == false`
2. Sort by `fsrs.due` ascending
3. Optionally filter by `domainId` or `taskId`
4. Create `/studySessions/{sessionId}` document

### 3. Reviewing a Card
1. Fetch flashcard from `/flashcards/{flashcardId}`
2. Fetch content from `/flashcardContent/{contentId}`
3. Present card to user
4. User provides rating (1-4)
5. Run FSRS algorithm to calculate new scheduling
6. Update `/flashcards/{flashcardId}` with new FSRS data
7. Create `/reviewHistory/{reviewId}` record
8. Update session's `reviews` array

### 4. Ending a Study Session
1. Update `/studySessions/{sessionId}` with `endedAt` and final metrics
2. Update `/users/{userId}/progress/*` documents with new totals
3. Update `/users/{userId}` stats (totalCardsStudied, currentStreak, etc.)

### 5. Progress Tracking
1. Cloud Function triggered on flashcard updates
2. Aggregate card states per domain/task
3. Update `/users/{userId}/progress/{progressId}` documents
4. Calculate mastery percentages

---

## Query Patterns

### Get Due Cards for Today
```typescript
db.collection('flashcards')
  .where('userId', '==', currentUserId)
  .where('isSuspended', '==', false)
  .where('fsrs.due', '<=', new Date())
  .orderBy('fsrs.due', 'asc')
  .limit(20)
```

### Get Cards for Specific Task
```typescript
db.collection('flashcards')
  .where('userId', '==', currentUserId)
  .where('domainId', '==', 'people')
  .where('taskId', '==', 'people-1')
  .where('fsrs.due', '<=', new Date())
  .orderBy('fsrs.due', 'asc')
```

### Get Recent Study Sessions
```typescript
db.collection('studySessions')
  .where('userId', '==', currentUserId)
  .orderBy('startedAt', 'desc')
  .limit(10)
```

### Get Progress for All Domains
```typescript
db.collection('users').doc(currentUserId)
  .collection('progress')
  .where('type', '==', 'domain')
  .orderBy('masteryPercentage', 'desc')
```

### Get Review History for a Card
```typescript
db.collection('reviewHistory')
  .where('userId', '==', currentUserId)
  .where('flashcardId', '==', cardId)
  .orderBy('reviewedAt', 'desc')
  .limit(50)
```

---

## Security Rules Summary

1. **Static Reference Data** (`domains`, `tasks`, `flashcardContent`): Read-only for authenticated users, admin-only writes
2. **Users**: Users can only access their own profile and subcollections
3. **Flashcards**: Users can only access their own flashcard instances
4. **Study Sessions**: Users can only access their own sessions
5. **Review History**: Users can only access their own reviews; reviews are immutable
6. **Validation**: Field-level validation enforces data integrity (domain IDs, ratings, card states, etc.)

---

## Indexes Summary

Total composite indexes: 24

- **Flashcards**: 7 indexes (hierarchy, due date, state, tags, suspension)
- **Study Sessions**: 4 indexes (time-based, scope-based, platform)
- **Review History**: 5 indexes (card history, session, domain/task analytics)
- **Progress**: 3 indexes (mastery, type, recency)
- **Flashcard Content**: 4 indexes (hierarchy, difficulty, tags, active status)
- **Domains/Tasks**: 0 indexes (small collections)

---

## Storage Estimates

Assuming 1000 users and 500 flashcards per user:

- **Domains**: 3 documents (~1 KB)
- **Tasks**: 26 documents (~10 KB)
- **Flashcard Content**: 500 documents (~200 KB)
- **Users**: 1000 documents (~500 KB)
- **User Progress**: 29,000 documents (1000 users × 29 progress docs) (~15 MB)
- **Flashcards**: 500,000 documents (1000 users × 500 cards) (~250 MB)
- **Study Sessions**: ~730,000 documents (1000 users × 2 sessions/day × 365 days) (~500 MB)
- **Review History**: ~7,300,000 documents (10 reviews/session) (~4 GB)

**Total**: ~4.75 GB for 1000 active users over 1 year

---

## Best Practices

1. **Use Firestore batch writes** when updating multiple documents atomically
2. **Paginate large queries** using `limit()` and `startAfter()`
3. **Use Cloud Functions** for complex aggregations (progress tracking)
4. **Cache static data** (domains, tasks, flashcard content) on client side
5. **Optimize reads** by denormalizing frequently accessed data
6. **Monitor index usage** and remove unused indexes
7. **Set up TTL policies** for old review history (e.g., delete after 2 years)
8. **Use Firebase Local Emulator** for development and testing

---

## Migration Strategy

When schema changes are needed:

1. **Versioning**: Add `schemaVersion` field to documents
2. **Backward compatibility**: Cloud Functions handle both old and new formats
3. **Gradual migration**: Use Cloud Functions to migrate documents on read
4. **Bulk migration**: Use Firebase Admin SDK for one-time migrations
5. **Testing**: Always test migrations on emulator first

---

## Related Files

- **TypeScript Types**: `/functions/src/types/index.ts`
- **Security Rules**: `/firestore.rules`
- **Indexes**: `/firestore.indexes.json`
- **FSRS Implementation**: `/functions/src/fsrs.ts`
