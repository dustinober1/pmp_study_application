'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

export interface ExamTimerProps {
    /** Initial time in seconds (default: 240 minutes = 14400 seconds for PMP exam) */
    initialSeconds?: number;
    /** Callback when timer expires */
    onExpire?: () => void;
    /** Callback when time is updated (every second) */
    onTick?: (remainingSeconds: number) => void;
    /** Show pause/resume button (default: true) */
    showControls?: boolean;
    /** Custom class name for styling */
    className?: string;
    /** Warning threshold in seconds (default: 300 seconds = 5 minutes) */
    warningThreshold?: number;
}

export interface ExamTimerRef {
    pause: () => void;
    resume: () => void;
    reset: () => void;
    isPaused: boolean;
    remainingTime: number;
}

/**
 * ExamTimer component with countdown timer and pause/resume functionality.
 *
 * Features:
 * - Countdown display in MM:SS or HH:MM:SS format
 * - Pause/Resume controls
 * - Warning state when time is low (configurable threshold)
 * - Expired state handling
 * - Callbacks for expiration and time updates
 *
 * @example
 * ```tsx
 * <ExamTimer
 *   initialSeconds={14400}
 *   onExpire={() => console.log('Time expired!')}
 *   warningThreshold={300}
 * />
 * ```
 */
export const ExamTimer = React.forwardRef<ExamTimerRef, ExamTimerProps>(
    (
        {
            initialSeconds = 14400, // 240 minutes for PMP exam
            onExpire,
            onTick,
            showControls = true,
            className = '',
            warningThreshold = 300, // 5 minutes
        },
        ref
    ) => {
        const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
        const [isPaused, setIsPaused] = useState(false);
        const [isExpired, setIsExpired] = useState(false);

        const intervalRef = useRef<NodeJS.Timeout | null>(null);
        const onExpireRef = useRef(onExpire);
        const onTickRef = useRef(onTick);

        // Keep refs in sync with props
        useEffect(() => {
            onExpireRef.current = onExpire;
            onTickRef.current = onTick;
        }, [onExpire, onTick]);

        // Format time as HH:MM:SS or MM:SS
        const formatTime = useCallback((seconds: number): string => {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = seconds % 60;

            if (hours > 0) {
                return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }, []);

        // Pause the timer
        const pause = useCallback(() => {
            setIsPaused(true);
        }, []);

        // Resume the timer
        const resume = useCallback(() => {
            setIsPaused(false);
        }, []);

        // Reset the timer to initial value
        const reset = useCallback(() => {
            setRemainingSeconds(initialSeconds);
            setIsPaused(false);
            setIsExpired(false);
        }, [initialSeconds]);

        // Expose methods via ref
        React.useImperativeHandle(
            ref,
            () => ({
                pause,
                resume,
                reset,
                isPaused,
                remainingTime: remainingSeconds,
            }),
            [pause, resume, reset, isPaused, remainingSeconds]
        );

        // Timer countdown logic
        useEffect(() => {
            if (isPaused || isExpired) {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
                return;
            }

            intervalRef.current = setInterval(() => {
                setRemainingSeconds((prev) => {
                    const newValue = prev - 1;

                    // Trigger tick callback
                    if (onTickRef.current) {
                        onTickRef.current(newValue);
                    }

                    // Check if expired
                    if (newValue <= 0) {
                        setIsExpired(true);
                        if (intervalRef.current) {
                            clearInterval(intervalRef.current);
                            intervalRef.current = null;
                        }
                        // Trigger expire callback
                        if (onExpireRef.current) {
                            onExpireRef.current();
                        }
                        return 0;
                    }

                    return newValue;
                });
            }, 1000);

            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                }
            };
        }, [isPaused, isExpired]);

        // Determine timer state styles
        const getTimerStyles = () => {
            if (isExpired) {
                return 'bg-red-600 text-white animate-pulse';
            }
            if (remainingSeconds <= warningThreshold) {
                return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-2 border-red-300 dark:border-red-700 animate-pulse';
            }
            if (isPaused) {
                return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 border-2 border-yellow-300 dark:border-yellow-700';
            }
            return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
        };

        return (
            <div className={`flex items-center gap-3 ${className}`}>
                {/* Timer Display */}
                <div
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold text-lg ${getTimerStyles()}`}
                >
                    {/* Clock Icon */}
                    <svg
                        className={`w-5 h-5 ${isExpired || remainingSeconds <= warningThreshold ? 'animate-pulse' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                    </svg>
                    <span className="min-w-[80px] text-center">
                        {isExpired ? '00:00' : formatTime(remainingSeconds)}
                    </span>
                </div>

                {/* Pause/Resume Controls */}
                {showControls && !isExpired && (
                    <button
                        onClick={isPaused ? resume : pause}
                        className={`p-2 rounded-lg transition-colors ${
                            isPaused
                                ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                        aria-label={isPaused ? 'Resume timer' : 'Pause timer'}
                        title={isPaused ? 'Resume timer' : 'Pause timer'}
                    >
                        {isPaused ? (
                            // Play Icon
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                            </svg>
                        ) : (
                            // Pause Icon
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                            </svg>
                        )}
                    </button>
                )}

                {/* Expired Message */}
                {isExpired && (
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                        Time Expired
                    </span>
                )}

                {/* Paused Badge */}
                {isPaused && !isExpired && (
                    <span className="text-xs font-semibold px-2 py-1 bg-yellow-200 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 rounded">
                        PAUSED
                    </span>
                )}
            </div>
        );
    }
);

ExamTimer.displayName = 'ExamTimer';

export default ExamTimer;
