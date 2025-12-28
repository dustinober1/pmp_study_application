'use client';

import { useDomains } from '@/lib/api/hooks';
import PerformanceDashboard from '@/components/analytics/PerformanceDashboard';
import { StudyPath } from '@/components/analytics/StudyPath';
import { useAnalytics } from '@/stores/analyticsStore';

export default function AnalyticsPage() {
  const { data: domains } = useDomains();
  const analytics = useAnalytics();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Detailed performance insights and personalized study recommendations
          </p>
        </div>
      </div>

      {/* Performance Dashboard */}
      <section>
        <PerformanceDashboard userId={analytics?.user_id} />
      </section>

      {/* Study Path Recommendations */}
      <section>
        <StudyPath domains={domains} />
      </section>
    </div>
  );
}
