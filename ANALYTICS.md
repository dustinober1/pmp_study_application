# Firebase Analytics & Crashlytics Integration

This document describes the analytics and error tracking implementation for the PMP Study App across all platforms.

## Overview

The app uses:
- **Firebase Analytics**: For tracking user behavior and engagement metrics
- **Firebase Crashlytics** (Flutter & Web): For real-time error monitoring and crash reporting
- **Sentry** (Web only): For additional error tracking and session replays

## Web App (Next.js)

### Setup

Analytics is automatically initialized when the Firebase module loads in `web/src/lib/firebase.ts`. Sentry is configured in `web/sentry.config.ts`.

**Required environment variables:**
```env
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
```

### Usage

```typescript
import {
  logEvent,
  setAnalyticsUserId,
  trackStudySessionStarted,
  trackCardReview,
  trackError
} from '@/lib/analytics'

// Set user ID after authentication
await setAnalyticsUserId(userId)

// Track study session
trackStudySessionStarted('domain', cardCount)

// Track card review
trackCardReview(rating, timeSpentMs)

// Track custom events
logEvent('custom_event_name', {
  param1: 'value',
  param2: 123
})

// Track errors
try {
  // some operation
} catch (error) {
  trackError(error, { context: 'additional_info' })
}
```

### Available Tracking Functions

| Function | Purpose |
|----------|---------|
| `logEvent(name, params)` | Log custom event to Firebase Analytics |
| `setAnalyticsUserId(userId)` | Set user identifier for analytics |
| `setAnalyticsUserProperties(props)` | Set custom user properties |
| `trackStudySessionStarted(scope, cards)` | Track when study session begins |
| `trackStudySessionEnded(scope, duration, cards, rating)` | Track when study session ends |
| `trackCardReview(rating, timeSpent)` | Track individual card review |
| `trackFlashcardImported(count)` | Track flashcard import |
| `trackPageView(pageName, props)` | Track page navigation |
| `trackError(error, context)` | Track and report errors to both Firebase and Sentry |

## Flutter App

### Setup

Analytics and Crashlytics are automatically initialized in `flutter/lib/main.dart` via `AnalyticsService.initialize()`.

**Required:**
- Firebase project with Analytics and Crashlytics enabled
- Add to `GoogleService-Info.plist` (iOS) and `google-services.json` (Android)

### Usage

```dart
import 'package:pmp_study_app/services/analytics_service.dart';

final analytics = AnalyticsService();

// Set user ID after authentication
await analytics.setUserId(userId);

// Track study session
await analytics.trackStudySessionStarted(
  scope: 'domain',
  cardCount: 20
);

// Track card review
await analytics.trackCardReview(
  rating: 3,
  timeSpentMs: 5000
);

// Track custom events
await analytics.trackPageView('study_screen', properties: {'domain': 'people'});

// Track errors
try {
  // some operation
} catch (error, stackTrace) {
  await analytics.trackError(
    error,
    stackTrace,
    context: {'operation': 'import_cards'}
  );
}

// Log messages to Crashlytics
analytics.logMessage('User started study session');

// Set custom Crashlytics context
await analytics.setCustomKey('study_scope', 'domain');
```

### Available Tracking Functions

| Function | Purpose |
|----------|---------|
| `initialize()` | Initialize analytics and crashlytics |
| `setUserId(userId)` | Set user identifier |
| `clearUserId()` | Clear user identifier |
| `setUserProperties(props)` | Set custom user properties |
| `trackStudySessionStarted(...)` | Track session start |
| `trackStudySessionEnded(...)` | Track session end |
| `trackCardReview(...)` | Track card review |
| `trackFlashcardImported(count)` | Track flashcard import |
| `trackPageView(pageName, properties)` | Track page view |
| `trackError(error, stack, context)` | Report error to Crashlytics |
| `logMessage(message)` | Log message to Crashlytics |
| `setCustomKey(key, value)` | Set Crashlytics context |

### Error Handling

In Flutter, all uncaught errors are automatically captured:
- **Flutter Errors**: Caught by `FlutterError.onError`
- **Async Errors**: Caught by `PlatformDispatcher.instance.onError`
- **Manual Errors**: Caught and reported via `trackError()`

## Cloud Functions

### Setup

Error tracking is implemented in `functions/src/errorTracking.ts` via the `ErrorTracker` class.

Errors are automatically logged to:
- **Firestore**: Stored in user-specific or system-wide error logs
- **Cloud Logging**: Available in Firebase Console

### Usage

```typescript
import { errorTracker } from './errorTracking'

try {
  // function logic
  await errorTracker.logEvent('action_completed', {
    userId,
    data: { actionId, status: 'success' }
  })
} catch (error) {
  await errorTracker.logError(error, {
    userId,
    functionName: 'myFunction',
    action: 'specific_action',
    severity: 'high',
    additionalData: { context: 'info' }
  })
  throw error
}
```

### Error Storage

Errors are stored in Firestore with the following structure:

**User-specific errors:** `users/{userId}/errorLogs/{docId}`
```json
{
  "message": "Error message",
  "stack": "Stack trace",
  "functionName": "createStudySession",
  "action": "create_session",
  "severity": "high",
  "timestamp": "2024-12-27T...",
  "additionalData": { ... }
}
```

**System-wide errors:** `systemErrorLogs/{docId}`
```json
{
  "message": "Error message",
  "functionName": "onUserCreate",
  "severity": "medium",
  "timestamp": "2024-12-27T...",
  "additionalData": { ... }
}
```

### Function Analytics

All function calls are tracked in `functionAnalytics` collection:
```json
{
  "functionName": "createStudySession",
  "userId": "user123",
  "success": true,
  "durationMs": 245,
  "timestamp": "2024-12-27T...",
  "additionalData": { ... }
}
```

## Events Tracked

### Core Study Events
- `study_session_started`: When user starts a study session
- `study_session_ended`: When user completes a study session
- `card_reviewed`: When user reviews a flashcard
- `page_view`: When user navigates to a new page

### Import Events
- `flashcards_imported`: When user imports flashcards

### Error Events
- `error_occurred`: When any application error occurs

## User Properties

Standard user properties set on authentication:
- `platform`: 'web' or 'mobile'
- `study_streak`: Current study streak (days)
- `total_cards`: Total flashcards user has

## Analytics Query Examples

### Firebase Console Queries

**Study sessions per user:**
```
SELECT COUNT(*) as sessions, userId
FROM `project.analytics_events_YYYYMMDD`
WHERE event_name = 'study_session_started'
GROUP BY userId
```

**Average session duration:**
```
SELECT AVG(CAST(value.int_value as INT64)) as avg_duration
FROM `project.analytics_events_YYYYMMDD`,
UNNEST(event_params) as value
WHERE event_name = 'study_session_ended'
AND value.key = 'duration_ms'
```

### Firestore Queries

**Recent errors by user:**
```typescript
db.collection('users').doc(userId)
  .collection('errorLogs')
  .orderBy('timestamp', 'desc')
  .limit(10)
```

**Function performance:**
```typescript
db.collection('functionAnalytics')
  .where('functionName', '==', 'reviewCardInSession')
  .where('success', '==', true)
  .select('durationMs')
```

## Monitoring & Alerts

### Firebase Crashlytics Dashboard
- View real-time crash reports
- Track crash-free users percentage
- Analyze crash trends by app version
- Set alerts for critical crashes

### Sentry Dashboard (Web)
- Real-time error alerts
- Source map support for debugging
- Session replay for user context
- Performance monitoring

### Firestore Analytics
- Manual queries for custom insights
- Export to BigQuery for advanced analysis
- Build custom dashboards

## Best Practices

1. **Always set user ID after authentication** to associate events with users
2. **Track errors early** in try-catch blocks before throwing
3. **Use meaningful event names** for easy filtering in analytics
4. **Include context** in error logs for debugging
5. **Respect user privacy** - don't log sensitive data (passwords, tokens)
6. **Batch events** when possible to reduce network overhead
7. **Test analytics locally** before deploying - turn off in debug mode

## Troubleshooting

### Analytics not appearing
- Check Firebase project has Analytics enabled
- Verify environment variables are set correctly
- Ensure user ID is set with `setAnalyticsUserId()`
- Note: Events may take 24-48 hours to appear in console

### Errors not being recorded
- Check Cloud Functions have proper permissions
- Verify Firestore rules allow writing to error logs
- Check Cloud Logging for function execution logs
- Ensure error tracking service is initialized

### High memory/network usage
- Reduce event tracking frequency
- Use event batching
- Turn off analytics in development mode
- Limit Crashlytics crash reporting to production

## References

- [Firebase Analytics Docs](https://firebase.google.com/docs/analytics)
- [Firebase Crashlytics Docs](https://firebase.google.com/docs/crashlytics)
- [Sentry Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Flutter Firebase Integration](https://firebase.flutter.dev/)
