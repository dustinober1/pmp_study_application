# PMP Study App - Practice Questions Schema

## Overview

This document describes the Firestore schema for the practice questions feature. Practice questions are multiple-choice questions with 4 possible answers (A, B, C, D) that provide immediate remediation/explanation after each attempt. This feature complements the flashcard-based spaced repetition system.

## Design Principles

1. **Master Content Pattern**: Questions are stored in a master collection (read-only for users) with user attempts referencing this content
2. **Immediate Remediation**: Each attempt provides immediate feedback with detailed explanation
3. **Progress Tracking**: User performance is tracked at both domain and task levels
4. **Hierarchy Alignment**: Questions organize by the same 3 domains and 26 tasks as flashcards
5. **Session Aggregation**: Individual attempts are grouped into practice sessions
6. **Audit Trail**: Complete history of all attempts for analytics

## Collection Architecture

```
firestore/
├── practiceQuestions/              # Master question content (admin-managed)
├── practiceAttempts/               # User's question attempts
├── practiceAttemptHistory/         # Detailed attempt audit trail
├── practiceSessions/               # Practice session records
└── users/
    └── {userId}/
        └── practiceProgress/       # Per-domain/task progress tracking
```

## Collections

### 1. Practice Questions Collection

**Path**: `/practiceQuestions/{questionId}`

**Purpose**: Master practice question content managed by admins. Users read this content but cannot modify it.

**Document ID**: Auto-generated (e.g., `pq-001`, `pq-002`)

**Schema**:
```typescript
{
  id: string;                        // Auto-generated ID

  // Hierarchy
  domainId: string;                  // Domain this question belongs to
  taskId: string;                    // Task this question belongs to

  // Content
  question: string;                  // The question text
  choices: [
    {
      letter: 'A' | 'B' | 'C' | 'D';  // Choice letter
      text: string;                   // Choice text
      isCorrect: boolean;             // Whether this is the correct answer
    }
  ];
  explanation: string;               // Detailed explanation for remediation
  references?: string[];             // PMBOK references

  // Metadata
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  version: number;                   // Content versioning

  // Usage stats (aggregated from all users)
  stats: {
    totalAttempts: number;
    correctAttempts: number;
    successRate: number;             // correctAttempts / totalAttempts (0-1)
  };

  isActive: boolean;                 // Can be deactivated without deletion
  createdAt: Date;
  updatedAt: Date;
}
```

**Example**:
```json
{
  "id": "pq-001",
  "domainId": "people",
  "taskId": "people-1",
  "question": "Which conflict resolution technique is best when both parties need to win and preserve the relationship?",
  "choices": [
    {
      "letter": "A",
      "text": "Withdrawing/Avoiding",
      "isCorrect": false
    },
    {
      "letter": "B",
      "text": "Collaborating/Problem Solving",
      "isCorrect": true
    },
    {
      "letter": "C",
      "text": "Compromising/Reconciling",
      "isCorrect": false
    },
    {
      "letter": "D",
      "text": "Forcing/Directing",
      "isCorrect": false
    }
  ],
  "explanation": "Collaborating/Problem Solving is the best choice because it seeks to find a solution that satisfies both parties. This technique is time-intensive but preserves relationships and finds creative solutions. Compromising can be used when time is limited, but it requires both parties to give up something. Withdrawing/Avoiding does not address the issue, and Forcing/Directing may damage the relationship.",
  "references": ["PMBOK 7th Edition, Section 2.3.7.1"],
  "difficulty": "medium",
  "tags": ["conflict-resolution", "stakeholder-management", "leadership"],
  "version": 1,
  "stats": {
    "totalAttempts": 342,
    "correctAttempts": 289,
    "successRate": 0.845
  },
  "isActive": true,
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z"
}
```

**Security**: Read-only for authenticated users, admin-only writes.

**Indexes**:
- `domainId + taskId + isActive` (fetch questions for a task)
- `isActive + difficulty` (filter by difficulty)
- `domainId + isActive` (fetch all questions for a domain)
- `tags (array-contains) + isActive` (tag-based filtering)

---

### 2. Practice Attempts Collection

**Path**: `/practiceAttempts/{attemptId}`

**Purpose**: Records each time a user attempts a practice question.

**Schema**:
```typescript
{
  id: string;                        // Auto-generated ID
  userId: string;                    // User who attempted this question

  // Content reference
  contentId: string;                 // Reference to practiceQuestions
  domainId: string;
  taskId: string;

  // Session reference
  sessionId: string;                 // Parent practice session

  // Attempt data
  selectedChoice: 'A' | 'B' | 'C' | 'D';  // User's selected answer
  isCorrect: boolean;                // Whether the answer was correct
  timeSpent: number;                 // Seconds spent on this question

  // Metadata
  attempt: number;                   // Attempt sequence (1st, 2nd, etc.)
  skipped: boolean;                  // Whether user skipped this question

  attemptedAt: Date;
  createdAt: Date;
}
```

**Example**:
```json
{
  "id": "pa-001",
  "userId": "user123",
  "contentId": "pq-001",
  "domainId": "people",
  "taskId": "people-1",
  "sessionId": "ps-001",
  "selectedChoice": "B",
  "isCorrect": true,
  "timeSpent": 45,
  "attempt": 1,
  "skipped": false,
  "attemptedAt": "2025-01-15T19:05:00Z",
  "createdAt": "2025-01-15T19:05:00Z"
}
```

**Security**: Users can only access their own attempts.

**Indexes**:
- `userId + sessionId + attemptedAt` (session questions)
- `userId + contentId + attemptedAt` (question history)
- `userId + domainId + attemptedAt` (domain performance)
- `userId + taskId + attemptedAt` (task performance)

---

### 3. Practice Attempt History Collection

**Path**: `/practiceAttemptHistory/{historyId}`

**Purpose**: Immutable audit trail of every practice question attempt. Provides detailed analytics.

**Schema**:
```typescript
{
  id: string;                        // Auto-generated ID
  userId: string;
  contentId: string;                 // Reference to practiceQuestions

  // Context
  sessionId: string;                 // Parent practice session
  domainId: string;
  taskId: string;

  // Attempt data
  selectedChoice: 'A' | 'B' | 'C' | 'D';
  correctChoice: 'A' | 'B' | 'C' | 'D';
  isCorrect: boolean;
  timeSpent: number;                 // Seconds

  // Metadata
  attempt: number;                   // Attempt sequence in session
  skipped: boolean;

  attemptedAt: Date;
  createdAt: Date;
}
```

**Example**:
```json
{
  "id": "pah-001",
  "userId": "user123",
  "contentId": "pq-001",
  "sessionId": "ps-001",
  "domainId": "people",
  "taskId": "people-1",
  "selectedChoice": "B",
  "correctChoice": "B",
  "isCorrect": true,
  "timeSpent": 45,
  "attempt": 1,
  "skipped": false,
  "attemptedAt": "2025-01-15T19:05:00Z",
  "createdAt": "2025-01-15T19:05:00Z"
}
```

**Security**: Users can only access their own history. Immutable once created.

**Indexes**:
- `userId + contentId + attemptedAt` (question history)
- `userId + sessionId + attemptedAt` (session history)
- `userId + domainId + attemptedAt` (domain analytics)
- `userId + taskId + attemptedAt` (task analytics)
- `userId + isCorrect + attemptedAt` (performance analysis)

---

### 4. Practice Sessions Collection

**Path**: `/practiceSessions/{sessionId}`

**Purpose**: Records a complete practice test session with aggregated metrics.

**Schema**:
```typescript
{
  id: string;                        // Auto-generated ID
  userId: string;

  // Session metadata
  startedAt: Date;
  endedAt?: Date;
  durationSeconds: number;           // Total session time

  // Session scope
  scope: {
    type: 'all' | 'domain' | 'task';
    domainId?: string;
    taskId?: string;
  };

  // Session metrics
  questionsPresented: number;        // Total questions in session
  questionsAnswered: number;         // Questions user answered (not skipped)
  questionsSkipped: number;          // Questions user skipped

  // Performance metrics
  correctAnswers: number;
  incorrectAnswers: number;
  successRate: number;               // correctAnswers / questionsAnswered (0-1)

  // Question IDs in this session
  questionIds: string[];

  // Platform
  platform: 'web' | 'ios' | 'android';

  createdAt: Date;
}
```

**Example**:
```json
{
  "id": "ps-001",
  "userId": "user123",
  "startedAt": "2025-01-15T19:00:00Z",
  "endedAt": "2025-01-15T19:30:00Z",
  "durationSeconds": 1800,
  "scope": {
    "type": "domain",
    "domainId": "people"
  },
  "questionsPresented": 20,
  "questionsAnswered": 19,
  "questionsSkipped": 1,
  "correctAnswers": 16,
  "incorrectAnswers": 3,
  "successRate": 0.842,
  "questionIds": ["pq-001", "pq-002", "pq-003", ...],
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

### 5. User Practice Progress Subcollection

**Path**: `/users/{userId}/practiceProgress/{progressId}`

**Purpose**: Track user performance per domain and per task for practice questions.

**Document IDs**: `{domainId}` or `{domainId}-{taskId}`

**Schema**:
```typescript
{
  id: string;                        // Domain or task ID
  userId: string;                    // Parent user ID
  type: 'domain' | 'task';           // Progress level

  // Hierarchy
  domainId: string;
  taskId?: string;                   // Only for task-level

  // Performance metrics
  totalQuestions: number;            // Total unique questions attempted
  totalAttempts: number;             // Total attempt count (may retry)
  correctAnswers: number;
  incorrectAnswers: number;
  successRate: number;               // correctAnswers / totalAttempts (0-1)

  // Detailed tracking
  averageTimeSeconds: number;        // Average time per question
  lastPracticedAt?: Date;            // When this scope was last practiced

  updatedAt: Date;
}
```

**Example**:
```json
{
  "id": "people-1",
  "userId": "user123",
  "type": "task",
  "domainId": "people",
  "taskId": "people-1",
  "totalQuestions": 12,
  "totalAttempts": 18,
  "correctAnswers": 15,
  "incorrectAnswers": 3,
  "successRate": 0.833,
  "averageTimeSeconds": 42,
  "lastPracticedAt": "2025-01-15T19:30:00Z",
  "updatedAt": "2025-01-15T19:30:00Z"
}
```

**Security**: Users can only read/write their own progress.

**Indexes**:
- `userId + type + successRate` (sort by performance)
- `userId + domainId + successRate` (domain-specific progress)
- `userId + type + updatedAt` (recently practiced)

---

## Data Flow

### 1. Starting a Practice Session
1. Client calls `createPracticeSession({scope, platform})` → gets `sessionId`
2. Client calls `getPracticeQuestions({limit, scope, difficulty?})`
3. Questions are fetched from `/practiceQuestions` collection

### 2. Attempting a Question
1. User selects an answer (A, B, C, or D)
2. Client validates if answer is correct
3. Client immediately shows explanation from question content
4. Client creates `/practiceAttempts/{attemptId}` document
5. Client creates `/practiceAttemptHistory/{historyId}` document
6. Client updates session metrics

### 3. Ending a Practice Session
1. Update `/practiceSessions/{sessionId}` with `endedAt` and final metrics
2. Update `/users/{userId}/practiceProgress/*` documents with new totals
3. Cloud Function triggered to update aggregate stats in `/practiceQuestions` documents

### 4. Progress Tracking
1. On each attempt, update `/users/{userId}/practiceProgress/{progressId}` documents
2. Calculate performance per domain/task
3. Cloud Function aggregates stats back to question documents

---

## Query Patterns

### Get Practice Questions for a Domain
```typescript
db.collection('practiceQuestions')
  .where('domainId', '==', 'people')
  .where('isActive', '==', true)
  .limit(50)
```

### Get Practice Questions for a Task
```typescript
db.collection('practiceQuestions')
  .where('domainId', '==', 'people')
  .where('taskId', '==', 'people-1')
  .where('isActive', '==', true)
  .limit(20)
```

### Get Recent Practice Sessions
```typescript
db.collection('practiceSessions')
  .where('userId', '==', currentUserId)
  .orderBy('startedAt', 'desc')
  .limit(10)
```

### Get User's Practice Performance by Domain
```typescript
db.collection('users').doc(currentUserId)
  .collection('practiceProgress')
  .where('type', '==', 'domain')
  .orderBy('successRate', 'desc')
```

### Get Attempt History for a Question
```typescript
db.collection('practiceAttemptHistory')
  .where('userId', '==', currentUserId)
  .where('contentId', '==', questionId)
  .orderBy('attemptedAt', 'desc')
```

---

## Security Rules Summary

1. **Practice Questions** (`practiceQuestions`): Read-only for authenticated users, admin-only writes
2. **Practice Attempts** (`practiceAttempts`): Users can only access their own attempts
3. **Practice Attempt History** (`practiceAttemptHistory`): Users can only access their own history; immutable once created
4. **Practice Sessions** (`practiceSessions`): Users can only access their own sessions
5. **Practice Progress** (`users/{uid}/practiceProgress`): Users can only access their own progress
6. **Validation**: Field-level validation enforces data integrity (domain IDs, choices A-D, etc.)

---

## Indexes Summary

Total composite indexes: 13

- **Practice Questions**: 4 indexes (hierarchy, difficulty, tags, active status)
- **Practice Attempts**: 4 indexes (session, content, domain/task analytics)
- **Practice Attempt History**: 5 indexes (content, session, domain/task analytics, performance)
- **Practice Sessions**: 4 indexes (time-based, scope-based, platform)
- **Practice Progress**: 3 indexes (performance, domain, recency)

---

## Storage Estimates

Assuming 1000 users and 100 practice questions per task (2600 questions total):

- **Practice Questions**: 2600 documents (~1.3 MB)
- **Practice Attempts**: ~5,000,000 documents (1000 users × 50 attempts/year) (~2.5 GB)
- **Practice Attempt History**: ~5,000,000 documents (~3 GB)
- **Practice Sessions**: ~100,000 documents (1000 users × 100 sessions/year) (~50 MB)
- **Practice Progress**: 87,000 documents (1000 users × 87 progress docs) (~40 MB)

**Total for Practice Feature**: ~5.6 GB for 1000 active users over 1 year

---

## Import Format (JSON)

Practice questions can be imported from JSON format with the following structure:

```json
{
  "questions": [
    {
      "domainId": "people",
      "taskId": "people-1",
      "question": "Which conflict resolution technique...",
      "choices": [
        { "letter": "A", "text": "Option A", "isCorrect": false },
        { "letter": "B", "text": "Option B", "isCorrect": true },
        { "letter": "C", "text": "Option C", "isCorrect": false },
        { "letter": "D", "text": "Option D", "isCorrect": false }
      ],
      "explanation": "Detailed explanation here...",
      "references": ["PMBOK 7th Edition, Section X.X.X"],
      "difficulty": "medium",
      "tags": ["tag1", "tag2"],
      "version": 1
    }
  ]
}
```

---

## Best Practices

1. **Immediate Feedback**: Always show explanation immediately after user selects an answer
2. **Time Tracking**: Use client-side timers to accurately measure time spent per question
3. **Batch Updates**: Update progress documents in batches when session ends
4. **Cache Questions**: Cache practice question content on client (read-only data)
5. **Pagination**: Use pagination when loading large question sets
6. **Analytics**: Monitor `successRate` on questions to identify commonly missed questions
7. **A/B Testing**: Use question `version` field for content updates without losing history

---

## Migration from Flashcards

Users can convert flashcard content to practice questions:

1. Use existing `flashcardContent` collection data
2. Transform front (question) and back (answer) into question format
3. Manually add 4 choices and mark correct answer
4. Map existing flashcard performance to practice progress

---

## Related Files

- **TypeScript Types**: `/functions/src/types/index.ts`
- **Security Rules**: `/firestore.rules`
- **Indexes**: `/firestore.indexes.json`
- **Flashcard Schema**: `/schema/DATA_MODEL.md` (for comparison)
