# Firestore Schema Summary

## Quick Reference

### Collections Overview

| Collection | Purpose | Security | Documents | Subcollections |
|------------|---------|----------|-----------|----------------|
| `domains` | PMP exam domains (3) | Read: Auth, Write: Admin | 3 | None |
| `tasks` | PMP exam tasks (26) | Read: Auth, Write: Admin | 26 | None |
| `flashcardContent` | Master flashcard content | Read: Auth, Write: Admin | ~500 | None |
| `users` | User profiles & settings | Read/Write: Owner | ~1000s | `progress` |
| `flashcards` | User flashcard instances | Read/Write: Owner | ~500 per user | None |
| `studySessions` | Study session records | Read/Write: Owner | ~2 per user per day | None |
| `reviewHistory` | Review audit trail | Read: Owner, Write: Immutable | ~10 per session | None |

### Data Hierarchy

```
PMP Exam
├── Domain (3)
│   └── Task (26 total)
│       └── Flashcard Content (500 total)
│           └── User Flashcard Instance (500 per user)
│               └── Review History (many per card)

User
├── Profile
├── Preferences
├── Stats
├── FSRS Parameters
└── Progress (29: 3 domains + 26 tasks)
```

## Key Document Structures

### User Document
```typescript
/users/{userId}
├── uid: string
├── email: string
├── subscriptionTier: 'free' | 'premium'
├── preferences: { dailyGoal, theme, notifications }
├── stats: { totalCardsStudied, currentStreak, totalStudyTime }
└── fsrsParameters: { requestRetention, maximumInterval, w[] }
```

### Flashcard Document
```typescript
/flashcards/{flashcardId}
├── userId: string
├── contentId: string (reference)
├── domainId: string
├── taskId: string
├── fsrs: {
│   ├── state: 0-3 (NEW, LEARNING, REVIEW, RELEARNING)
│   ├── difficulty: 0-10
│   ├── stability: number (days)
│   ├── due: Date
│   ├── reps: number
│   └── lapses: number
├── isSuspended: boolean
└── tags: string[]
```

### Study Session Document
```typescript
/studySessions/{sessionId}
├── userId: string
├── startedAt: Date
├── durationSeconds: number
├── scope: { type, domainId?, taskId? }
├── cardsReviewed: number
├── ratings: { again, hard, good, easy }
├── reviews: ReviewItem[]
└── platform: 'web' | 'ios' | 'android'
```

## FSRS States & Ratings

### Card States (fsrs.state)
- `0` - NEW: Never studied
- `1` - LEARNING: Currently being learned
- `2` - REVIEW: In review phase
- `3` - RELEARNING: Forgotten, being relearned

### Ratings
- `1` - AGAIN: Complete blackout, wrong answer
- `2` - HARD: Wrong answer, but remembered something
- `3` - GOOD: Correct answer with effort
- `4` - EASY: Perfect answer, effortless recall

## Common Query Patterns

### 1. Get Due Cards
```typescript
// All due cards for user
flashcards
  .where('userId', '==', uid)
  .where('isSuspended', '==', false)
  .where('fsrs.due', '<=', now)
  .orderBy('fsrs.due', 'asc')

// Due cards for specific domain
flashcards
  .where('userId', '==', uid)
  .where('domainId', '==', 'people')
  .where('fsrs.due', '<=', now)
  .orderBy('fsrs.due', 'asc')

// Due cards for specific task
flashcards
  .where('userId', '==', uid)
  .where('domainId', '==', 'people')
  .where('taskId', '==', 'people-1')
  .where('fsrs.due', '<=', now)
  .orderBy('fsrs.due', 'asc')
```

### 2. Get User Progress
```typescript
// All domain-level progress
users/{uid}/progress
  .where('type', '==', 'domain')
  .orderBy('masteryPercentage', 'desc')

// Progress for specific domain
users/{uid}/progress
  .where('domainId', '==', 'people')
  .orderBy('masteryPercentage', 'desc')

// Task-level progress for domain
users/{uid}/progress
  .where('type', '==', 'task')
  .where('domainId', '==', 'people')
  .orderBy('masteryPercentage', 'desc')
```

### 3. Get Study History
```typescript
// Recent study sessions
studySessions
  .where('userId', '==', uid)
  .orderBy('startedAt', 'desc')
  .limit(10)

// Sessions for specific domain
studySessions
  .where('userId', '==', uid)
  .where('scope.domainId', '==', 'people')
  .orderBy('startedAt', 'desc')

// Review history for card
reviewHistory
  .where('userId', '==', uid)
  .where('flashcardId', '==', cardId)
  .orderBy('reviewedAt', 'desc')
```

## Index Requirements

### Critical Indexes (Required for Core Functionality)
1. `flashcards: userId + fsrs.due` - Get due cards
2. `flashcards: userId + domainId + taskId` - Browse by hierarchy
3. `studySessions: userId + startedAt` - Recent sessions
4. `reviewHistory: userId + flashcardId + reviewedAt` - Card history
5. `progress: userId + type + masteryPercentage` - Progress dashboard

### Performance Indexes (Improve Query Speed)
6. `flashcards: userId + fsrs.state + fsrs.due` - Filter by state
7. `flashcards: userId + domainId + fsrs.due` - Domain-specific due
8. `flashcards: userId + domainId + taskId + fsrs.due` - Task-specific due
9. `studySessions: userId + scope.domainId + startedAt` - Domain sessions
10. `reviewHistory: userId + domainId + reviewedAt` - Domain analytics

### Optional Indexes (Advanced Features)
11. `flashcards: userId + isSuspended + fsrs.due` - Exclude suspended
12. `flashcards: userId + tags + fsrs.due` - Tag filtering
13. `studySessions: userId + platform + startedAt` - Platform analytics
14. `reviewHistory: userId + rating + reviewedAt` - Performance analysis

## Security Rules Overview

### Helper Functions
- `isSignedIn()` - Check authentication
- `isOwner(userId)` - Check ownership
- `isAdmin()` - Check admin custom claim
- `isValidDomain(domainId)` - Validate domain ID
- `isValidRating(rating)` - Validate rating (1-4)
- `isValidCardState(state)` - Validate card state (0-3)

### Access Patterns
- **Static Data** (domains, tasks, flashcardContent): Auth read, Admin write
- **User Data** (users, progress): Owner only
- **Study Data** (flashcards, sessions, reviews): Owner only
- **Review History**: Immutable after creation

### Validation
- Required fields enforced on create
- Domain IDs validated against allowed values
- Ratings must be 1-4
- Card states must be 0-3
- Numeric fields validated for ranges

## Data Initialization

### Required Static Data (Admin setup)

1. **Create 3 Domains**
   ```typescript
   domains/people
   domains/process
   domains/business_environment
   ```

2. **Create 26 Tasks**
   ```typescript
   tasks/people-1 through tasks/people-N
   tasks/process-1 through tasks/process-N
   tasks/business_environment-1 through tasks/business_environment-N
   ```

3. **Create ~500 Flashcard Content**
   ```typescript
   flashcardContent/{id} for each flashcard
   ```

### User Initialization (On signup)

1. **Create User Profile**
   ```typescript
   users/{uid} with default preferences and FSRS parameters
   ```

2. **Initialize Progress Tracking**
   ```typescript
   users/{uid}/progress/{domainId} for each domain (3)
   users/{uid}/progress/{taskId} for each task (26)
   ```

3. **Create Initial Flashcard Instances**
   ```typescript
   flashcards/{id} for each content the user wants to study
   ```

## Performance Considerations

### Write Operations
- Batch writes when updating multiple related documents
- Use transactions for critical data consistency
- Offload complex aggregations to Cloud Functions

### Read Operations
- Cache static data (domains, tasks, content) client-side
- Use pagination for large result sets
- Implement optimistic UI updates
- Consider denormalization for frequently accessed data

### Storage Optimization
- Archive old review history (older than 2 years)
- Compress large text fields
- Use Cloud Storage for media assets

## Monitoring & Metrics

### Key Metrics to Track
- Read/write operations per collection
- Index usage and performance
- Query execution times
- Storage size per collection
- Cost per user per month

### Alerts to Configure
- Unusual spike in writes (potential abuse)
- Failed security rule checks
- Missing required indexes
- High query latency

## Development Workflow

1. **Local Development**: Use Firebase Emulator Suite
2. **Schema Changes**: Update types, rules, indexes together
3. **Testing**: Test rules with emulator and unit tests
4. **Deployment**: Deploy rules and indexes before functions
5. **Migration**: Use Cloud Functions for data migrations
6. **Monitoring**: Set up Firebase Performance Monitoring

## Related Documentation

- [Complete Data Model](./DATA_MODEL.md) - Detailed schema documentation
- [TypeScript Types](../functions/src/types/index.ts) - Type definitions
- [Security Rules](../firestore.rules) - Firestore security rules
- [Indexes](../firestore.indexes.json) - Composite indexes configuration
- [FSRS Implementation](../functions/src/fsrs.ts) - Spaced repetition algorithm
