# PMP Study App

A cross-platform study application for the PMP 2026 exam featuring flashcards with FSRS-based spaced repetition.

## Overview

This application helps students prepare for the PMP (Project Management Professional) 2026 exam using scientifically-proven spaced repetition algorithms. The app covers all 3 domains (People, Process, Business Environment) and 26 tasks from the PMP exam content outline.

## Tech Stack

- **Mobile**: Flutter (iOS + Android)
- **Web**: Next.js with TypeScript
- **Backend**: Firebase
  - Firestore (Database)
  - Authentication (Email/Password + Google OAuth)
  - Storage (Assets)
  - Cloud Functions (FSRS calculations)
- **SRS Algorithm**: FSRS (Free Spaced Repetition Scheduler)

## Project Structure

```
pmp_study_app/
├── functions/              # Firebase Cloud Functions
│   ├── src/
│   │   ├── index.ts       # Main functions entry point
│   │   └── fsrs.ts        # FSRS algorithm implementation
│   ├── package.json
│   └── tsconfig.json
├── flutter/               # Flutter mobile app (iOS + Android) - Coming soon
├── web/                   # Next.js web app - Coming soon
├── firebase.json          # Firebase configuration
├── .firebaserc           # Firebase project settings
├── firestore.rules       # Firestore security rules
├── firestore.indexes.json # Firestore indexes
├── storage.rules         # Storage security rules
├── FIREBASE_SETUP.md     # Detailed Firebase setup guide
└── README.md             # This file
```

## PMP 2026 Exam Coverage

The app organizes content according to the PMP exam structure:

1. **People** (33%) - Managing and leading project teams
2. **Process** (41%) - Managing project lifecycle
3. **Business Environment** (26%) - Understanding business strategy and organizational context

Total: 26 tasks across all domains

## Features

### Implemented (Backend)
- ✅ Firebase project configuration
- ✅ Firestore database with security rules
- ✅ Firebase Authentication setup
- ✅ Firebase Storage configuration
- ✅ Cloud Functions for FSRS calculations
- ✅ User management (auto-created profiles, cleanup on delete)
- ✅ Spaced repetition algorithm (FSRS-4.5)

### Planned
- 📱 Flutter mobile app (iOS/Android)
- 🌐 Next.js web application
- 🃏 Flashcard creation and management
- 📊 Study progress tracking
- 📈 Analytics and insights
- 🎯 Daily goals and streaks
- 🔔 Review reminders

## Quick Start

### Prerequisites
- Node.js 18+
- Firebase CLI: `npm install -g firebase-tools`
- Google account for Firebase

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pmp_study_app
   ```

2. **Follow the Firebase setup guide**
   ```bash
   # See FIREBASE_SETUP.md for detailed instructions
   cat FIREBASE_SETUP.md
   ```

3. **Install functions dependencies**
   ```bash
   cd functions
   npm install
   npm run build
   ```

4. **Login to Firebase and link project**
   ```bash
   firebase login
   firebase use --add
   ```

5. **Deploy to Firebase**
   ```bash
   # Deploy everything
   firebase deploy

   # Or deploy individually
   firebase deploy --only firestore:rules
   firebase deploy --only functions
   ```

6. **Start local development with emulators**
   ```bash
   firebase emulators:start
   ```

## FSRS Algorithm

The app uses FSRS (Free Spaced Repetition Scheduler), a modern alternative to SM-2/Anki algorithms:

- **Adaptive**: Adjusts to individual learning patterns
- **Efficient**: Optimizes review intervals for better retention
- **Research-based**: Built on cognitive science principles

### Rating System
- **Again (1)**: Forgot/incorrect - card needs relearning
- **Hard (2)**: Recalled with difficulty
- **Good (3)**: Recalled correctly
- **Easy (4)**: Recalled easily

## Data Model

### Firestore Collections

- `users/{userId}` - User profiles and settings
- `flashcards/{flashcardId}` - User flashcards with FSRS data
- `studySessions/{sessionId}` - Study session records
- `reviewHistory/{reviewId}` - Individual card review history
- `domains/{domainId}` - PMP exam domains (reference data)
- `tasks/{taskId}` - PMP exam tasks (reference data)

## Cloud Functions

- `calculateNextReview` - Calculate next review date using FSRS
- `getDueFlashcards` - Get flashcards due for review
- `onUserCreate` - Initialize user profile on signup
- `onUserDelete` - Clean up user data on account deletion

## Development

### Functions Development
```bash
cd functions
npm run build:watch  # Watch mode for TypeScript
npm run serve        # Start emulator
```

### Testing
```bash
# Start all emulators
firebase emulators:start

# Access emulator UI at http://localhost:4000
```

## Deployment

```bash
# Deploy all
firebase deploy

# Deploy specific services
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [FSRS Algorithm](https://github.com/open-spaced-repetition/fsrs4anki)
- [PMP Exam Content Outline](https://www.pmi.org/certifications/project-management-pmp)
- [Flutter Documentation](https://flutter.dev/docs)
- [Next.js Documentation](https://nextjs.org/docs)
