import { Suspense } from 'react';
import PracticeTestClient from './PracticeTestClient';

function PracticeTestLoading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 animate-pulse font-medium">Preparing your practice test...</p>
        </div>
    );
}

export default function PracticeTestPage() {
    return (
        <Suspense fallback={<PracticeTestLoading />}>
            <PracticeTestClient />
        </Suspense>
    );
}
