'use client';

import { Coffee } from 'lucide-react';

/**
 * Floating Buy Me a Coffee button
 * Displays in bottom-right corner of the screen
 */
export function BMCButton() {
  const username = process.env.NEXT_PUBLIC_BUYMEACOFFEE_USERNAME || 'dustinober1';

  return (
    <a
      href={`https://www.buymeacoffee.com/${username}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full p-3 shadow-lg transition-all hover:scale-110"
      title="Buy Me a Coffee"
      aria-label="Buy Me a Coffee"
    >
      <Coffee className="w-6 h-6" />
    </a>
  );
}
