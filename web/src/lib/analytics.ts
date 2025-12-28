'use client'

import { getAnalytics, logEvent as firebaseLogEvent, Analytics, setUserId, setUserProperties } from 'firebase/analytics'
import { app } from './firebase'
import * as Sentry from '@sentry/nextjs'

let analytics: Analytics | null = null

/**
 * Initialize Firebase Analytics
 */
export function initializeAnalytics(): Analytics {
  if (analytics) {
    return analytics
  }

  try {
    analytics = getAnalytics(app)
  } catch (error) {
    console.error('Failed to initialize analytics:', error)
  }

  return analytics as Analytics
}

/**
 * Log a custom event to Firebase Analytics
 */
export function logEvent(eventName: string, eventParams?: Record<string, any>): void {
  try {
    if (!analytics) {
      initializeAnalytics()
    }

    if (analytics) {
      firebaseLogEvent(analytics, eventName, eventParams)
    }
  } catch (error) {
    console.error(`Failed to log event "${eventName}":`, error)
    Sentry.captureException(error, {
      tags: {
        component: 'analytics',
        event: eventName,
      },
    })
  }
}

/**
 * Set user ID for analytics
 */
export function setAnalyticsUserId(userId: string | null): void {
  try {
    if (!analytics) {
      initializeAnalytics()
    }

    if (analytics && userId) {
      setUserId(analytics, userId)
    }
  } catch (error) {
    console.error('Failed to set analytics user ID:', error)
    Sentry.captureException(error, {
      tags: {
        component: 'analytics',
        action: 'setUserId',
      },
    })
  }
}

/**
 * Set user properties for analytics
 */
export function setAnalyticsUserProperties(properties: Record<string, string | number | boolean>): void {
  try {
    if (!analytics) {
      initializeAnalytics()
    }

    if (analytics) {
      setUserProperties(analytics, properties)
    }
  } catch (error) {
    console.error('Failed to set analytics user properties:', error)
    Sentry.captureException(error, {
      tags: {
        component: 'analytics',
        action: 'setUserProperties',
      },
    })
  }
}

/**
 * Track study session started
 */
export function trackStudySessionStarted(scope: string, cards: number): void {
  logEvent('study_session_started', {
    scope,
    card_count: cards,
  })
}

/**
 * Track study session ended
 */
export function trackStudySessionEnded(scope: string, duration: number, cardsReviewed: number, avgRating: number): void {
  logEvent('study_session_ended', {
    scope,
    duration_ms: duration,
    cards_reviewed: cardsReviewed,
    avg_rating: avgRating.toFixed(2),
  })
}

/**
 * Track card review
 */
export function trackCardReview(rating: number, timeSpent: number): void {
  logEvent('card_reviewed', {
    rating,
    time_spent_ms: timeSpent,
  })
}

/**
 * Track flashcard imported
 */
export function trackFlashcardImported(count: number): void {
  logEvent('flashcards_imported', {
    count,
  })
}

/**
 * Track page view
 */
export function trackPageView(pageName: string, properties?: Record<string, any>): void {
  logEvent('page_view', {
    page_name: pageName,
    ...properties,
  })
}

/**
 * Track error event
 */
export function trackError(error: Error, context?: Record<string, any>): void {
  logEvent('error_occurred', {
    error_name: error.name,
    error_message: error.message,
    ...context,
  })

  // Also capture with Sentry for better error tracking
  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  })
}
