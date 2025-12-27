'use client'

import { db } from './firebase'
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
  limit,
} from 'firebase/firestore'

export interface DashboardStats {
  totalCardsStudied: number
  currentStreak: number
  totalStudyTime: number
}

export interface CardsDueToday {
  count: number
  byDomain: Record<string, number>
}

export interface DomainProgress {
  domainId: string
  domainName: string
  masteryPercentage: number
  totalCards: number
  masteredCards: number
  newCards: number
  learningCards: number
  reviewCards: number
  relearningCards: number
}

export interface ProgressByDomain {
  domains: DomainProgress[]
  overallMastery: number
}

// Get dashboard statistics for a user
export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  try {
    // Get streak and study time from studySessions
    const sessionsRef = collection(db, 'studySessions')
    const sessionsQuery = query(
      sessionsRef,
      where('userId', '==', userId),
      orderBy('startedAt', 'desc'),
      limit(100)
    )
    const sessionsSnapshot = await getDocs(sessionsQuery)

    // Calculate total studied and study time
    let totalCardsStudied = 0
    let totalStudyTime = 0
    const studyDates = new Set<string>()

    sessionsSnapshot.docs.forEach((doc) => {
      const session = doc.data()
      totalCardsStudied += session.cardsReviewed || 0
      totalStudyTime += session.durationSeconds || 0

      // Track study dates for streak
      if (session.startedAt) {
        const date = new Date(session.startedAt.toDate()).toISOString().split('T')[0]
        studyDates.add(date)
      }
    })

    // Calculate streak
    let currentStreak = 0
    if (studyDates.size > 0) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const dates = Array.from(studyDates).sort().reverse()

      currentStreak = 1
      for (let i = 0; i < dates.length - 1; i++) {
        const current = new Date(dates[i])
        const next = new Date(dates[i + 1])

        const daysDiff = Math.floor((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24))

        if (daysDiff === 1) {
          currentStreak++
        } else {
          break
        }
      }

      // Check if streak is broken (no study today)
      const lastStudyDate = new Date(dates[0])
      const daysSinceLastStudy = Math.floor((today.getTime() - lastStudyDate.getTime()) / (1000 * 60 * 60 * 24))

      if (daysSinceLastStudy > 1) {
        currentStreak = 0
      }
    }

    return {
      totalCardsStudied,
      currentStreak,
      totalStudyTime,
    }
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return {
      totalCardsStudied: 0,
      currentStreak: 0,
      totalStudyTime: 0,
    }
  }
}

// Get cards due today
export async function getCardsDueToday(userId: string): Promise<CardsDueToday> {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const flashcardsRef = collection(db, 'flashcards')
    const dueQuery = query(
      flashcardsRef,
      where('userId', '==', userId),
      where('isSuspended', '==', false),
      where('fsrs.due', '<=', Timestamp.fromDate(today))
    )

    const snapshot = await getDocs(dueQuery)

    let count = 0
    const byDomain: Record<string, number> = {}

    snapshot.docs.forEach((doc) => {
      const card = doc.data()
      count++

      const domainId = card.domainId
      byDomain[domainId] = (byDomain[domainId] || 0) + 1
    })

    return {
      count,
      byDomain,
    }
  } catch (error) {
    console.error('Error fetching cards due today:', error)
    return {
      count: 0,
      byDomain: {},
    }
  }
}

// Get progress by domain
export async function getProgressByDomain(userId: string): Promise<ProgressByDomain> {
  try {
    const progressRef = collection(db, 'users', userId, 'progress')
    const domainQuery = query(
      progressRef,
      where('type', '==', 'domain'),
      orderBy('masteryPercentage', 'desc')
    )

    const snapshot = await getDocs(domainQuery)

    const domains: DomainProgress[] = []
    let totalMastery = 0

    const domainNameMap: Record<string, string> = {
      people: 'People',
      process: 'Process',
      business_environment: 'Business Environment',
    }

    snapshot.docs.forEach((doc) => {
      const progress = doc.data()
      domains.push({
        domainId: progress.domainId,
        domainName: domainNameMap[progress.domainId] || progress.domainId,
        masteryPercentage: progress.masteryPercentage || 0,
        totalCards: progress.totalCards || 0,
        masteredCards: progress.masteredCards || 0,
        newCards: progress.newCards || 0,
        learningCards: progress.learningCards || 0,
        reviewCards: progress.reviewCards || 0,
        relearningCards: progress.relearningCards || 0,
      })
      totalMastery += progress.masteryPercentage || 0
    })

    const overallMastery = domains.length > 0 ? Math.round(totalMastery / domains.length) : 0

    return {
      domains,
      overallMastery,
    }
  } catch (error) {
    console.error('Error fetching progress by domain:', error)
    return {
      domains: [],
      overallMastery: 0,
    }
  }
}
