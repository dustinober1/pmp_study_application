import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

export function initSentry(): void {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured')
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    enabled: process.env.NODE_ENV === 'production',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event, hint) {
      // Filter out certain errors
      if (event.exception) {
        const error = hint.originalException
        if (error instanceof Error) {
          // Don't report known non-critical errors
          if (error.message.includes('Network request failed')) {
            return null
          }
        }
      }
      return event
    },
  })
}
