import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter/foundation.dart';

/// Service for handling Firebase Analytics and Crashlytics
class AnalyticsService {
  static final AnalyticsService _instance = AnalyticsService._internal();

  late FirebaseAnalytics _analytics;
  late FirebaseCrashlytics _crashlytics;

  AnalyticsService._internal();

  factory AnalyticsService() {
    return _instance;
  }

  /// Initialize analytics and crashlytics
  Future<void> initialize() async {
    _analytics = FirebaseAnalytics.instance;
    _crashlytics = FirebaseCrashlytics.instance;

    // Set up error handling for Flutter errors
    FlutterError.onError = (FlutterErrorDetails errorDetails) {
      _crashlytics.recordFlutterError(errorDetails);
    };

    // Pass all uncaught asynchronous errors that aren't handled by Flutter
    PlatformDispatcher.instance.onError = (error, stack) {
      _crashlytics.recordError(error, stack, fatal: true);
      return true;
    };

    // Enable analytics collection (optional: set to false for development)
    if (!kDebugMode) {
      await _analytics.setAnalyticsCollectionEnabled(true);
    } else {
      await _analytics.setAnalyticsCollectionEnabled(false);
    }

    // Enable crashlytics collection
    await _crashlytics.setCrashlyticsCollectionEnabled(true);
  }

  /// Set user ID for analytics and crashlytics
  Future<void> setUserId(String userId) async {
    await _analytics.setUserId(userId);
    await _crashlytics.setUserIdentifier(userId);
  }

  /// Clear user ID
  Future<void> clearUserId() async {
    await _analytics.setUserId(null);
    await _crashlytics.setUserIdentifier('');
  }

  /// Set custom user properties
  Future<void> setUserProperties(Map<String, String> properties) async {
    for (final entry in properties.entries) {
      await _analytics.setUserProperty(
        name: entry.key,
        value: entry.value,
      );
    }
  }

  /// Track study session started
  Future<void> trackStudySessionStarted({
    required String scope,
    required int cardCount,
  }) async {
    await _analytics.logEvent(
      name: 'study_session_started',
      parameters: {
        'scope': scope,
        'card_count': cardCount,
      },
    );
  }

  /// Track study session ended
  Future<void> trackStudySessionEnded({
    required String scope,
    required int durationMs,
    required int cardsReviewed,
    required double avgRating,
  }) async {
    await _analytics.logEvent(
      name: 'study_session_ended',
      parameters: {
        'scope': scope,
        'duration_ms': durationMs,
        'cards_reviewed': cardsReviewed,
        'avg_rating': avgRating.toStringAsFixed(2),
      },
    );
  }

  /// Track card review
  Future<void> trackCardReview({
    required int rating,
    required int timeSpentMs,
  }) async {
    await _analytics.logEvent(
      name: 'card_reviewed',
      parameters: {
        'rating': rating,
        'time_spent_ms': timeSpentMs,
      },
    );
  }

  /// Track flashcard imported
  Future<void> trackFlashcardImported({required int count}) async {
    await _analytics.logEvent(
      name: 'flashcards_imported',
      parameters: {
        'count': count,
      },
    );
  }

  /// Track page view
  Future<void> trackPageView({
    required String pageName,
    Map<String, String>? properties,
  }) async {
    await _analytics.logEvent(
      name: 'page_view',
      parameters: {
        'page_name': pageName,
        ...?properties,
      },
    );
  }

  /// Track error
  Future<void> trackError(
    Object error,
    StackTrace stackTrace, {
    Map<String, String>? context,
  }) async {
    // Log to Crashlytics
    await _crashlytics.recordError(error, stackTrace);

    // Also log as an event
    await _analytics.logEvent(
      name: 'error_occurred',
      parameters: {
        'error_type': error.runtimeType.toString(),
        ...?context,
      },
    );
  }

  /// Manually log message to Crashlytics
  void logMessage(String message) {
    _crashlytics.log(message);
  }

  /// Set custom key-value pairs for Crashlytics context
  Future<void> setCustomKey(String key, dynamic value) async {
    await _crashlytics.setCustomKey(key, value);
  }

  /// Get instance of Firebase Analytics
  FirebaseAnalytics get analytics => _analytics;

  /// Get instance of Firebase Crashlytics
  FirebaseCrashlytics get crashlytics => _crashlytics;
}
