'use client'

// Mark this page as dynamic to prevent pre-rendering
export const dynamic = 'force-dynamic'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { logout } from '@/lib/auth'
import { ErrorAlert } from '@/components/ErrorAlert'
import {
  getDashboardStats,
  getCardsDueToday,
  getProgressByDomain,
  type DashboardStats,
  type CardsDueToday,
  type ProgressByDomain,
} from '@/lib/dashboard'

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [cardsDueToday, setCardsDueToday] = useState<CardsDueToday | null>(null)
  const [progressByDomain, setProgressByDomain] = useState<ProgressByDomain | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Fetch dashboard data
  useEffect(() => {
    async function fetchData() {
      if (!user?.uid) return

      setIsLoading(true)
      setError(null)
      try {
        const [stats, due, progress] = await Promise.all([
          getDashboardStats(user.uid),
          getCardsDueToday(user.uid),
          getProgressByDomain(user.uid),
        ])

        setDashboardStats(stats)
        setCardsDueToday(due)
        setProgressByDomain(progress)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard data'
        setError(errorMessage)
        console.error('Error fetching dashboard data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user?.uid])

  async function handleLogout() {
    setIsLoggingOut(true)
    setError(null)
    try {
      await logout()
      router.push('/')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Logout failed. Please try again.'
      setError(errorMessage)
      console.error('Logout failed:', error)
      setIsLoggingOut(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container-responsive py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">PMP Study App</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user.displayName || user.email}</span>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="btn-secondary text-sm"
            >
              {isLoggingOut ? 'Signing out...' : 'Sign Out'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-responsive py-12">
        {/* Error Alert */}
        {error && (
          <div className="mb-6">
            <ErrorAlert
              error={error}
              type="error"
              onDismiss={() => setError(null)}
            />
          </div>
        )}

        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {user.displayName || 'Student'}!
          </h2>
          <p className="text-gray-600">
            Track your progress and master the PMP 2026 exam
          </p>
        </div>

        {/* Quick Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Study Streak Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Study Streak</h3>
              <span className="text-3xl">🔥</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold text-green-600">
                {isLoading ? '-' : dashboardStats?.currentStreak || 0}
              </p>
              <p className="text-gray-600">days</p>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Keep up your daily streak!
            </p>
          </div>

          {/* Cards Due Today Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Due Today</h3>
              <span className="text-3xl">📚</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold text-orange-600">
                {isLoading ? '-' : cardsDueToday?.count || 0}
              </p>
              <p className="text-gray-600">cards</p>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Time for your review!
            </p>
          </div>

          {/* Total Studied Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Total Studied</h3>
              <span className="text-3xl">✅</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-bold text-blue-600">
                {isLoading ? '-' : dashboardStats?.totalCardsStudied || 0}
              </p>
              <p className="text-gray-600">cards</p>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Great progress!
            </p>
          </div>
        </div>

        {/* Progress by Domain Section */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Progress by Domain</h3>

          {isLoading ? (
            <div className="card flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                <p className="text-gray-600">Loading progress...</p>
              </div>
            </div>
          ) : progressByDomain && progressByDomain.domains.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {progressByDomain.domains.map((domain) => (
                <div key={domain.domainId} className="card">
                  <div className="mb-4">
                    <h4 className="text-lg font-bold text-gray-900 mb-2">{domain.domainName}</h4>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${domain.masteryPercentage}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      {domain.masteryPercentage}% Mastery
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-600 text-xs">Mastered</p>
                      <p className="font-bold text-blue-600">{domain.masteredCards}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-600 text-xs">Learning</p>
                      <p className="font-bold text-orange-600">{domain.learningCards}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-600 text-xs">In Review</p>
                      <p className="font-bold text-purple-600">{domain.reviewCards}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-600 text-xs">New</p>
                      <p className="font-bold text-green-600">{domain.newCards}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-12">
              <p className="text-gray-600">No progress data yet. Start studying to see your progress!</p>
            </div>
          )}
        </div>

        {/* Overall Mastery Card */}
        {!isLoading && progressByDomain && (
          <div className="card mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Overall Progress</h3>

            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <div className="flex items-center justify-center">
                  <div className="relative w-32 h-32">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="8"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="8"
                        strokeDasharray={`${2 * Math.PI * 45 * (progressByDomain.overallMastery / 100)} ${2 * Math.PI * 45}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-blue-600">
                          {progressByDomain.overallMastery}%
                        </p>
                        <p className="text-xs text-gray-600">Mastery</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1">
                <h4 className="font-bold text-gray-900 mb-4">Domain Breakdown</h4>
                <div className="space-y-3">
                  {progressByDomain.domains.map((domain) => (
                    <div key={domain.domainId} className="flex items-center justify-between">
                      <span className="text-gray-700">{domain.domainName}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full"
                            style={{ width: `${domain.masteryPercentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900 w-10 text-right">
                          {domain.masteryPercentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Study Time Stats */}
        {!isLoading && dashboardStats && (
          <div className="card">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Study Statistics</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="text-gray-600 text-sm mb-2">Total Study Time</p>
                <p className="text-4xl font-bold text-blue-600 mb-4">
                  {Math.floor((dashboardStats.totalStudyTime || 0) / 3600)}
                  <span className="text-lg text-gray-600">h</span>
                </p>
                <p className="text-sm text-gray-500">
                  {Math.floor(((dashboardStats.totalStudyTime || 0) % 3600) / 60)} minutes
                </p>
              </div>

              <div>
                <p className="text-gray-600 text-sm mb-2">Cards Due Today</p>
                <div className="text-4xl font-bold text-orange-600 mb-4">
                  {cardsDueToday?.count || 0}
                </div>
                {cardsDueToday && cardsDueToday.count > 0 && (
                  <div className="space-y-2">
                    {Object.entries(cardsDueToday.byDomain).map(([domainId, count]) => {
                      const domainNameMap: Record<string, string> = {
                        people: 'People',
                        process: 'Process',
                        business_environment: 'Business Environment',
                      }
                      return (
                        <div key={domainId} className="flex justify-between text-sm">
                          <span className="text-gray-600">{domainNameMap[domainId] || domainId}:</span>
                          <span className="font-semibold text-gray-900">{count} cards</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
