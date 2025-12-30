'use client';

import MainLayout from '@/components/layout/MainLayout';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Heart, Coffee, Github, Globe } from 'lucide-react';

export default function DonationsPage() {
  const bmcUsername = process.env.NEXT_PUBLIC_BUYMEACOFFEE_USERNAME || 'dustinober1';

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Heart className="w-16 h-16 text-red-500 mx-auto mb-4 animate-pulse" />
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl sm:tracking-tight lg:text-6xl">
            Support Open Education
          </h1>
          <p className="mt-5 text-xl text-gray-500 dark:text-gray-400">
            This PMP study app is now fully open-source and free for everyone. Your support helps keep it updated and hosted.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <Card variant="elevated" className="border-2 border-yellow-500/20 hover:border-yellow-500/50 transition-colors">
            <CardHeader
              title="Buy me a coffee"
              subtitle="A small gesture goes a long way in supporting maintenance."
            >
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center mb-4">
                <Coffee className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </CardHeader>
            <CardBody>
              <a
                href={`https://www.buymeacoffee.com/${bmcUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-yellow-500 hover:bg-yellow-600 transition-colors"
              >
                Donate via Buy Me a Coffee
              </a>
            </CardBody>
          </Card>

          <Card variant="elevated" className="border-2 border-indigo-500/20 hover:border-indigo-500/50 transition-colors">
            <CardHeader
              title="GitHub Sponsors"
              subtitle="Support the long-term development of open-source tools."
            >
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
            </CardHeader>
            <CardBody>
              <a
                href={`https://github.com/sponsors/${bmcUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                Sponsor on GitHub
              </a>
            </CardBody>
          </Card>
        </div>

        <div className="mt-16 bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Why open source?</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Education should be accessible to everyone. By making this project open-source, we invite contributors to improve the content, fix bugs, and add features that help students worldwide pass their PMP exam.
              </p>
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <a
                  href="https://github.com/dustinober1/pmp_study_application"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors"
                >
                  <Github className="w-4 h-4" />
                  View Source Code
                </a>
                <a
                  href="/"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-blue-600 transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  Contribute Content
                </a>
              </div>
            </div>
            <div className="hidden lg:block w-48 h-48 bg-gradient-to-br from-yellow-500 to-indigo-600 rounded-full opacity-10 animate-blob" />
          </div>
        </div>

        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">100% Transparent</h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            All donations go directly toward hosting costs, API services, and development time. This project is maintained by a solo developer passionate about making education accessible.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
