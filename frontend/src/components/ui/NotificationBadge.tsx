'use client';

import React from 'react';

interface NotificationBadgeProps {
  count: number;
  maxCount?: number;
  className?: string;
  children: React.ReactNode;
  showZero?: boolean;
  variant?: 'default' | 'active' | 'urgent';
}

const variantStyles = {
  default: 'bg-red-500 text-white',
  active: 'bg-blue-500 text-white',
  urgent: 'bg-orange-500 text-white animate-pulse',
};

/**
 * NotificationBadge component that displays a count badge over its children
 * Typically used for showing challenge notifications or updates
 */
export function NotificationBadge({
  count,
  maxCount = 99,
  className = '',
  children,
  showZero = false,
  variant = 'default',
}: NotificationBadgeProps) {
  const displayCount = count > maxCount ? `${maxCount}+` : count;
  const shouldShow = showZero || count > 0;

  return (
    <div className={`relative ${className}`}>
      {children}
      {shouldShow && (
        <span
          className={`
            absolute top-1 right-1
            flex items-center justify-center
            min-w-[1.25rem] h-5
            px-1
            text-xs font-bold
            rounded-full
            shadow-sm
            ${variantStyles[variant]}
          `}
        >
          {displayCount}
        </span>
      )}
    </div>
  );
}

/**
 * Simple dot indicator for subtle notifications
 */
interface NotificationDotProps {
  show: boolean;
  className?: string;
  variant?: 'default' | 'active' | 'urgent';
}

export function NotificationDot({
  show,
  className = '',
  variant = 'default',
}: NotificationDotProps) {
  if (!show) return null;

  const dotVariantStyles = {
    default: 'bg-red-500',
    active: 'bg-blue-500',
    urgent: 'bg-orange-500 animate-ping',
  };

  return (
    <span
      className={`
        absolute top-0 right-0
        w-3 h-3
        rounded-full
        ${dotVariantStyles[variant]}
        ${className}
      `}
    />
  );
}

/**
 * NotificationBell component with optional badge count
 */
interface NotificationBellProps {
  count?: number;
  className?: string;
  onClick?: () => void;
}

export function NotificationBell({
  count = 0,
  className = '',
  onClick,
}: NotificationBellProps) {
  return (
    <button
      onClick={onClick}
      className={`relative p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors ${className}`}
      aria-label={`Notifications${count > 0 ? ` (${count})` : ''}`}
    >
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      {count > 0 && (
        <span className="absolute top-1 right-1 min-w-[1rem] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  );
}
