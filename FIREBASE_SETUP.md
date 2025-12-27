# Firebase Setup Guide for PMP Study App

This guide will walk you through setting up Firebase for the PMP Study App MVP.

## Prerequisites

- Node.js 18 or higher
- Firebase CLI installed globally: `npm install -g firebase-tools`
- A Google account

## Step 1: Create Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter project name: `pmp-study-app` (or your preferred name)
4. Disable Google Analytics (can be enabled later if needed)
5. Click "Create project"

## Step 2: Register Your Apps

### Web App (Next.js)
1. In the Firebase Console, click the web icon (`</>`)
2. Register app with nickname: "PMP Study Web"
3. Enable Firebase Hosting (optional for now)
4. Copy the Firebase configuration object - you'll need this later
5. Save the config for your Next.js app

### Android App (Flutter)
1. Click the Android icon
2. Enter Android package name: `com.pmpstudy.app` (or your preference)
3. Download `google-services.json`
4. Save for your Flutter Android configuration

### iOS App (Flutter)
1. Click the iOS icon
2. Enter iOS bundle ID: `com.pmpstudy.app` (or your preference)
3. Download `GoogleService-Info.plist`
4. Save for your Flutter iOS configuration

## Step 3: Enable Firebase Services

### Authentication
1. In Firebase Console, go to "Authentication"
2. Click "Get started"
3. Enable "Email/Password" sign-in method
4. Enable "Google" sign-in method
   - Add your support email
   - Configure OAuth consent screen if needed

### Firestore Database
1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Start in **Production mode** (we have security rules configured)
4. Choose a Cloud Firestore location (e.g., `us-central1`)
5. Click "Enable"

### Storage
1. In Firebase Console, go to "Storage"
2. Click "Get started"
3. Start in **Production mode** (we have security rules configured)
4. Use the same location as Firestore
5. Click "Done"

### Firebase Functions
1. In Firebase Console, go to "Functions"
2. Click "Get started"
3. Upgrade to Blaze (pay-as-you-go) plan if needed
   - Required for Cloud Functions
   - Free tier is generous for development

## Step 4: Install Firebase CLI and Login

```bash
# Install Firebase CLI globally
npm install -g firebase-tools

# Login to Firebase
firebase login

# Verify your project
firebase projects:list
```

## Step 5: Link Local Project to Firebase

```bash
# Navigate to project root
cd /Users/dustinober/Projects/pmp_study_app

# Initialize Firebase (select existing project)
firebase use --add

# Select your project: pmp-study-app
# Enter alias: default
```

## Step 6: Install Functions Dependencies

```bash
# Navigate to functions directory
cd functions

# Install dependencies
npm install

# Build TypeScript
npm run build
```

## Step 7: Deploy Firebase Configuration

### Deploy Security Rules
```bash
# From project root
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

### Deploy Firestore Indexes
```bash
firebase deploy --only firestore:indexes
```

### Deploy Functions
```bash
firebase deploy --only functions
```

### Deploy Everything
```bash
# Deploy all Firebase resources at once
firebase deploy
```

## Step 8: Initialize Reference Data (Optional)

You may want to add the PMP domain and task reference data to Firestore:

### Domains Collection Structure
```javascript
// Collection: domains
{
  "id": "people",
  "name": "People",
  "percentage": 33,
  "description": "Managing and leading project teams",
  "order": 1
}

{
  "id": "process",
  "name": "Process",
  "percentage": 41,
  "description": "Managing project lifecycle",
  "order": 2
}

{
  "id": "business-environment",
  "name": "Business Environment",
  "percentage": 26,
  "description": "Understanding business strategy and organizational context",
  "order": 3
}
```

### Tasks Collection Structure
```javascript
// Collection: tasks
{
  "id": "people-1",
  "domainId": "people",
  "taskNumber": 1,
  "title": "Manage conflict",
  "description": "Enable team members to resolve their own conflicts...",
  "order": 1
}
// ... and so on for all 26 tasks
```

You can add these manually via the Firebase Console or create a data migration script.

## Step 9: Test with Firebase Emulator Suite

```bash
# Start all emulators
firebase emulators:start

# Or start specific emulators
firebase emulators:start --only firestore,auth,functions
```

The emulator UI will be available at: http://localhost:4000

## Step 10: Environment Configuration

### Next.js Web App
Create `web/.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Flutter App
1. Place `google-services.json` in `flutter/android/app/`
2. Place `GoogleService-Info.plist` in `flutter/ios/Runner/`

## Firebase Structure Overview

### Collections

#### `users/{userId}`
- User profile information
- Subcollections: `progress`, `settings`

#### `flashcards/{flashcardId}`
- User's flashcards with FSRS data
- Fields: `userId`, `domain`, `taskNumber`, `question`, `answer`, `fsrsData`, `nextReviewDate`

#### `studySessions/{sessionId}`
- Study session records
- Fields: `userId`, `sessionDate`, `cardsReviewed`, `duration`

#### `reviewHistory/{reviewId}`
- Individual card review history
- Fields: `userId`, `flashcardId`, `rating`, `reviewedAt`, `scheduledDays`

#### `domains/{domainId}` (Read-only reference data)
- PMP exam domains
- Fields: `name`, `percentage`, `description`, `order`

#### `tasks/{taskId}` (Read-only reference data)
- PMP exam tasks
- Fields: `domainId`, `taskNumber`, `title`, `description`, `order`

## Cloud Functions

### `calculateNextReview`
- Callable function
- Calculates next review date using FSRS algorithm
- Input: `{flashcardId, rating}`
- Returns: `{nextReviewDate, scheduledDays}`

### `getDueFlashcards`
- Callable function
- Gets flashcards due for review
- Input: `{limit}` (optional, default: 20)
- Returns: `{flashcards, count}`

### `onUserCreate` (Automatic trigger)
- Creates user profile when new user signs up
- Initializes default settings

### `onUserDelete` (Automatic trigger)
- Cleans up user data when account is deleted
- Removes flashcards, sessions, and review history

## Testing Functions Locally

```bash
# Start functions emulator
npm --prefix functions run serve

# Test with curl
curl -X POST http://localhost:5001/pmp-study-app/us-central1/calculateNextReview \
  -H "Content-Type: application/json" \
  -d '{"data":{"flashcardId":"abc123","rating":3}}'
```

## Security Rules Summary

### Firestore
- Users can only read/write their own data
- Flashcards are user-scoped
- Domains and tasks are read-only reference data

### Storage
- User profile images: max 5MB
- User materials: max 10MB
- Shared resources: read-only

## Monitoring and Logs

```bash
# View function logs
firebase functions:log

# View specific function logs
firebase functions:log --only calculateNextReview
```

## Cost Considerations

Firebase Blaze plan is pay-as-you-go with generous free tier:
- Firestore: 50K reads/day, 20K writes/day free
- Functions: 2M invocations/month free
- Storage: 5GB storage, 1GB/day download free
- Authentication: Free for most providers

For a study app with moderate usage, you'll likely stay within free tier during development.

## Troubleshooting

### "Permission Denied" errors
- Verify security rules are deployed
- Check user is authenticated
- Ensure userId matches in security rules

### Functions not deploying
- Check Node.js version (must be 18)
- Verify billing is enabled (Blaze plan)
- Run `npm run build` in functions directory

### Emulator issues
- Clear emulator data: `firebase emulators:start --import=./emulator-data --export-on-exit`
- Check ports are not in use
- Update Firebase CLI: `npm install -g firebase-tools@latest`

## Next Steps

1. Create Flutter app and integrate Firebase SDK
2. Create Next.js app and integrate Firebase SDK
3. Implement flashcard creation and review UI
4. Add PMP domain and task reference data
5. Test FSRS algorithm with real study patterns
6. Set up CI/CD pipeline for automatic deployments

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [FSRS Algorithm](https://github.com/open-spaced-repetition/fsrs4anki)
- [PMP Exam Content Outline](https://www.pmi.org/certifications/project-management-pmp)
