import { Suspense } from 'react';
import FlashcardStudyClient from './FlashcardStudyClient';

function FlashcardStudyLoading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 animate-pulse">Loading cards...</p>
        </div>
    );
}

export default function FlashcardStudyPage() {
    return (
        <Suspense fallback={<FlashcardStudyLoading />}>
            <FlashcardStudyClient />
        </Suspense>
    );
}
