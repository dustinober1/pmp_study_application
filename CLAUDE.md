# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PMP Study App is a cross-platform study application for the PMP 2026 exam featuring flashcards with FSRS (Free Spaced Repetition Scheduler) based spaced repetition.

**Tech Stack:**
- **Mobile**: Flutter (iOS + Android)
- **Web**: Next.js 16 with TypeScript, React 19, Tailwind CSS 4
- **Backend**: Firebase (Firestore, Authentication, Storage, Cloud Functions)
- **Algorithm**: FSRS-4.5 for spaced repetition

**Project Structure:**
```
pmp_study_app/
├── functions/              # Firebase Cloud Functions (Node.js/TypeScript)
├── flutter/               # Flutter mobile app (iOS + Android)
├── web/                   # Next.js web app
├── firebase.json          # Firebase configuration
├── firestore.rules        # Firestore security rules
├── firestore.indexes.json # 24 composite indexes
└── schema/                # Data model documentation
```

## Development Commands

### Firebase (Root)
```bash
firebase emulators:start        # Start all emulators
firebase deploy                 # Deploy all
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### Cloud Functions (`functions/`)
```bash
cd functions
npm run build        # Compile TypeScript
npm run build:watch  # Watch mode
npm run serve        # Start emulators
npm run shell        # Functions shell
npm run deploy       # Deploy to Firebase
npm run logs         # View function logs
npm run test         # Run Jest tests
npm run lint         # ESLint
```

### Web App (`web/`)
```bash
cd web
npm run dev          # Start dev server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run type-check   # TypeScript check
```

### Flutter App (`flutter/`)
```bash
cd flutter
flutter pub get      # Install dependencies
flutter run          # Run on connected device/emulator
flutter test         # Run unit tests
flutter build ios    # iOS release build
flutter build apk    # Android APK build
flutter build appbundle  # Android App Bundle (Play Store)
```

## Architecture

### Cross-Platform Architecture

This app uses a **shared backend** with **platform-specific frontends**. Both Flutter and Web apps:

1. Connect to the same Firebase project
2. Share the same Firestore database schema
3. Call the same Cloud Functions
4. Implement offline-first caching with sync
5. Support light/dark/system themes

### Data Flow

**Study Session Flow:**
1. Client calls `createStudySession({scope, platform})` → gets `sessionId`
2. Client calls `getCardsForReview({limit, scope, state})` or `fetchNewCards({limit, scope})`
3. For each card review, client calls `reviewCardInSession({sessionId, flashcardId, rating, elapsedMs})`
   - Updates flashcard FSRS data
   - Creates review history entry
   - Updates session metrics (all in a batch transaction)
4. Client calls `endStudySession({sessionId})` to finalize

**User Lifecycle:**
- `onUserCreate` auth trigger automatically creates user profile and default preferences
- `onUserDelete` auth trigger cleans up all user data (flashcards, sessions, reviews)

### State Management

**Flutter**: Riverpod providers in `flutter/lib/providers/`
- `auth_provider.dart`: Firebase Authentication state
- `flashcard_provider.dart`: Flashcard CRUD operations
- `theme_provider.dart`: Theme (light/dark/auto)
- `user_provider.dart`: User profile management

**Web**: React Context in `web/src/contexts/`
- `AuthContext.tsx`: Firebase Authentication state
- `ThemeContext.tsx`: Dark mode (light/dark/system)

### Offline Support

Both platforms implement full offline-first architecture:

**Flutter** (`flutter/lib/services/`):
- `local_cache_service.dart`: SQLite cache with sync status tracking
- `background_sync_service.dart`: Auto-sync on connectivity restore

**Web** (`web/src/lib/`):
- `localCache.ts`: IndexedDB cache
- `backgroundSync.ts`: Auto-sync on connectivity restore
- `offlineFlashcardService.ts`: Unified offline-aware service

**Conflict Resolution Strategies**: ServerWins, LocalWins, LastWriteWins (default), Merge

## FSRS Algorithm

The app uses FSRS-4.5, a modern spaced repetition algorithm. Key concepts:

**Card States** (`functions/src/fsrs.ts`):
- `0 = NEW`: Never reviewed
- `1 = LEARNING`: Currently learning
- `2 = REVIEW`: Long-term retention
- `3 = RELEARNING`: Forgot, relearning

**Rating System**:
- `1 = Again`: Forgot/incorrect
- `2 = Hard`: Recalled with difficulty
- `3 = Good`: Recalled correctly
- `4 = Easy`: Recalled easily

**FSRS Fields on Flashcards**:
- `fsrs.due`: Next review date
- `fsrs.state`: Current card state (0-3)
- `fsrs.stability`: Memory stability (days)
- `fsrs.difficulty`: Card difficulty (0-10)
- `fsrs.reps`: Total review count
- `fsrs.lapses`: Times forgotten

## Firestore Data Model

**Key Collections:**

| Collection | Purpose | Key Query Patterns |
|------------|---------|-------------------|
| `users/{uid}` | User profiles, FSRS parameters | Access by UID only |
| `users/{uid}/progress/*` | Per-domain/task progress | `userId + type + masteryPercentage` |
| `flashcards/{id}` | User flashcard instances | `userId + fsrs.due`, `userId + domainId + taskId` |
| `flashcardContent/{id}` | Master content (admin-managed) | `domainId + taskId + isActive` |
| `studySessions/{id}` | Study session records | `userId + startedAt`, `userId + scope.domainId` |
| `reviewHistory/{id}` | Review audit trail | `userId + flashcardId + reviewedAt` |
| `domains/{id}` | PMP domains (3) | Read-only reference |
| `tasks/{id}` | PMP tasks (26) | Read-only reference |

**Content Hierarchy**: Domain → Task → Flashcards
- 3 domains: People (33%), Process (41%), Business Environment (26%)
- 26 tasks across all domains
- Flashcards reference both `domainId` and `taskId`

**Critical Indexes** (24 total in `firestore.indexes.json`):
- Flashcards: 7 indexes (due date queries, hierarchy navigation, tags, suspension)
- Study Sessions: 4 indexes (time-based, scope-based, platform)
- Review History: 5 indexes (card history, session, analytics)
- Progress: 3 indexes (mastery sorting, recency)
- Flashcard Content: 4 indexes (hierarchy, difficulty, tags)

## Cloud Functions

All functions are callable (`functions.https.onCall`) except auth triggers:

**Study Session Functions**:
- `createStudySession({scope, platform})`: Initialize session
- `getCardsForReview({limit, scope, state})`: Get due cards
- `fetchNewCards({limit, scope})`: Get NEW state cards
- `reviewCardInSession({sessionId, flashcardId, rating, elapsedMs})`: Main review handler
- `updateStudySessionMetrics({sessionId, flashcardId, rating, elapsedMs})`: Update metrics
- `endStudySession({sessionId})`: Finalize session
- `getSessionStats({sessionId})`: Get session details

**Card Functions**:
- `calculateNextReview({flashcardId, rating})`: Calculate FSRS schedule (legacy)
- `getDueFlashcards({limit})`: Get due cards (legacy)

**Auth Triggers**:
- `onUserCreate`: Auto-create profile on signup
- `onUserDelete`: Cleanup user data on deletion

## Important Implementation Notes

### User Data Isolation
- All user-data queries MUST include `userId == currentUser`
- Security rules enforce user ownership
- Never expose other users' data

### Query Patterns
Due to Firestore query limitations, always check `firestore.indexes.json` before creating new composite queries. Common patterns:

```typescript
// Get due cards for today
db.collection("flashcards")
  .where("userId", "==", userId)
  .where("isSuspended", "==", false)
  .where("fsrs.due", "<=", now)
  .orderBy("fsrs.due", "asc")

// Browse hierarchy (domain → task → cards)
db.collection("flashcards")
  .where("userId", "==", userId)
  .where("domainId", "==", "people")
  .where("taskId", "==", "people-1")
```

### TypeScript Types
Shared types are in `functions/src/types/index.ts`. Always import from here when working with Cloud Functions to maintain consistency.

### Firebase Emulator
Set `NEXT_PUBLIC_FIREBASE_USE_EMULATOR=true` in `.env.local` for web development. Always test with emulators before deploying.

### Material 3 (Flutter)
The app uses Material 3 theming. Theme files are in `flutter/lib/theme/`. Always use Material 3 components.

### Tailwind CSS (Web)
Uses Tailwind CSS 4 with dark mode support. Use `dark:` prefix for dark mode styles. Theme context handles automatic class application.

## Common Tasks

### Adding a New Cloud Function
1. Add function in `functions/src/index.ts`
2. Update types in `functions/src/types/index.ts` if needed
3. Test locally: `cd functions && npm run serve`
4. Deploy: `firebase deploy --only functions`

### Modifying Firestore Schema
1. Update `schema/DATA_MODEL.md` with changes
2. Add composite indexes to `firestore.indexes.json` if needed
3. Update security rules in `firestore.rules`
4. Deploy: `firebase deploy --only firestore:indexes,firestore:rules`

### Adding New Flashcard Content
Flashcard content is managed by admins in `flashcardContent` collection. Users create personal instances in `flashcards` collection that reference `contentId`.

### Running Tests
- Functions: `cd functions && npm test`
- Flutter: `cd flutter && flutter test`
- Web: Use Vitest/Jest (when configured)

## Deployment

See `DEPLOYMENT.md` for detailed deployment guides:
- **Web**: Deploy to Vercel
- **iOS**: App Store submission guide
- **Android**: Google Play submission guide

## Documentation

- `README.md`: Project overview and quick start
- `FIREBASE_SETUP.md`: Complete Firebase setup
- `OFFLINE_SUPPORT.md`: Offline architecture details
- `THEMING.md`: Dark mode implementation
- `schema/DATA_MODEL.md`: Complete Firestore schema
- `schema/SCHEMA_SUMMARY.md`: Quick schema reference
