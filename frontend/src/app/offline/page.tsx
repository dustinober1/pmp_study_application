'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // Check if we're back online
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Set initial state
    setIsOnline(navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full mb-6">
          <WifiOff className="w-10 h-10 text-gray-400 dark:text-gray-500" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {isOnline ? 'Reconnecting...' : 'You\'re Offline'}
        </h1>

        {/* Message */}
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {isOnline
            ? 'Great! You\'re back online. Refreshing the page...'
            : 'No internet connection detected. Some features may be unavailable.'}
        </p>

        {/* Offline Features Notice */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6 text-left">
          <h2 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
            Available Offline:
          </h2>
          <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
            <li>• Previously loaded flashcards</li>
            <li>• Cached study sessions</li>
            <li>• Progress tracking (syncs when online)</li>
          </ul>
        </div>

        {/* Action Button */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleRefresh}
          leftIcon={<RefreshCw className="w-5 h-5" />}
        >
          {isOnline ? 'Refreshing...' : 'Try Again'}
        </Button>

        {/* Footer */}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-6">
          PMP 2026 Study App - Your progress is saved locally
        </p>
      </div>
    </div>
  );
}
