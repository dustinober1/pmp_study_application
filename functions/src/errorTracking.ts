import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

/**
 * Error tracking and logging utility for Cloud Functions
 */
export class ErrorTracker {
  private db: FirebaseFirestore.Firestore;
  private logger = functions.logger;

  constructor() {
    this.db = admin.firestore();
  }

  /**
   * Log an error to Firestore for debugging and analytics
   */
  async logError(
    error: Error | unknown,
    context: {
      userId?: string;
      functionName: string;
      action?: string;
      severity?: "low" | "medium" | "high" | "critical";
      additionalData?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      const errorDoc = {
        message: errorMessage,
        stack: errorStack,
        functionName: context.functionName,
        action: context.action || "unknown",
        userId: context.userId,
        severity: context.severity || "medium",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        additionalData: context.additionalData || {},
      };

      // Log to Firestore for long-term analysis
      if (context.userId) {
        await this.db
          .collection("users")
          .doc(context.userId)
          .collection("errorLogs")
          .add(errorDoc);
      } else {
        // System-wide error log
        await this.db.collection("systemErrorLogs").add(errorDoc);
      }

      // Also log to Cloud Logging
      this.logger.error(
        `[${context.functionName}] Error in ${context.action}: ${errorMessage}`,
        {
          severity: context.severity || "MEDIUM",
          userId: context.userId,
          additionalData: context.additionalData,
        }
      );
    } catch (loggingError) {
      // Fail silently if logging fails to avoid cascading errors
      this.logger.error("Failed to log error to Firestore:", loggingError);
    }
  }

  /**
   * Track a function call for analytics
   */
  async trackFunctionCall(
    functionName: string,
    context: {
      userId?: string;
      duration?: number;
      success: boolean;
      error?: Error | unknown;
      additionalData?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const callDoc = {
        functionName,
        userId: context.userId,
        success: context.success,
        durationMs: context.duration || 0,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        additionalData: context.additionalData || {},
      };

      // Log to analytics collection
      await this.db.collection("functionAnalytics").add(callDoc);

      if (!context.success && context.error) {
        await this.logError(context.error, {
          userId: context.userId,
          functionName,
          severity: "high",
          additionalData: {
            ...context.additionalData,
            duration: context.duration,
          },
        });
      }
    } catch (error) {
      this.logger.error("Failed to track function call:", error);
    }
  }

  /**
   * Create a wrapped function that automatically logs errors and tracks execution
   */
  createTrackedFunction<T extends (...args: any[]) => Promise<any>>(
    functionName: string,
    fn: T
  ): T {
    return (async (...args: any[]) => {
      const startTime = Date.now();
      const context = args[1] as functions.https.CallableContext | undefined;
      const userId = context?.auth?.uid;

      try {
        const result = await fn(...args);
        const duration = Date.now() - startTime;

        await this.trackFunctionCall(functionName, {
          userId,
          duration,
          success: true,
        });

        return result;
      } catch (error) {
        const duration = Date.now() - startTime;

        await this.trackFunctionCall(functionName, {
          userId,
          duration,
          success: false,
          error,
        });

        throw error;
      }
    }) as T;
  }

  /**
   * Log a custom event
   */
  async logEvent(
    eventName: string,
    context: {
      userId?: string;
      data?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const eventDoc = {
        eventName,
        userId: context.userId,
        data: context.data || {},
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      };

      await this.db.collection("functionEvents").add(eventDoc);
    } catch (error) {
      this.logger.error("Failed to log event:", error);
    }
  }
}

export const errorTracker = new ErrorTracker();
