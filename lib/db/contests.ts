import { prisma } from '../prisma'
import type { Contest, ContestParticipant } from '@prisma/client'
import { nanoid } from 'nanoid'

// Type definitions for contest metrics and status
export type ContestMetric = 'TOTAL_SALES' | 'ORDER_COUNT'
export type ContestStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'CANCELLED'

export async function createContest(data: {
  creatorId: string
  name: string
  description?: string
  metric: ContestMetric
  startAt: Date
  endAt: Date
  entryFeeCents: number
  prizePoolCents: number
  prizePoolType: string
  firstPlacePercent: number
  secondPlacePercent: number
  thirdPlacePercent: number
  isPublic?: boolean
  maxParticipants?: number
}): Promise<Contest> {
  const slug = `${data.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${nanoid(6)}`
  
  // Set status to ACTIVE by default - real status will be calculated dynamically based on dates
  const status = 'ACTIVE'
  
  return prisma.contest.create({
    data: {
      ...data,
      slug,
      status,
    },
  })
}

export async function findContestBySlug(slug: string) {
  return prisma.contest.findUnique({
    where: { slug },
    include: {
      creator: true,
      participants: {
        include: {
          user: true,
          store: true,
        },
        orderBy: [
          { totalSales: 'desc' },
          { orderCount: 'desc' },
        ],
      },
    },
  })
}

export async function getContestLeaderboard(contestId: string, metric: ContestMetric) {
  const orderBy = metric === 'TOTAL_SALES' 
    ? [{ totalSales: 'desc' as const }, { orderCount: 'desc' as const }]
    : [{ orderCount: 'desc' as const }, { totalSales: 'desc' as const }]

  return prisma.contestParticipant.findMany({
    where: { contestId },
    include: {
      user: true,
      store: {
        select: {
          shopDomain: true,
        },
      },
    },
    orderBy,
  })
}

export async function joinContest(data: {
  contestId: string
  userId: string
  storeId: string
  isPaid?: boolean
}): Promise<ContestParticipant> {
  return prisma.contestParticipant.create({
    data,
  })
}

export async function updateContestStatus(contestId: string, status: ContestStatus) {
  return prisma.contest.update({
    where: { id: contestId },
    data: { status },
  })
}

export async function getActiveContests() {
  return prisma.contest.findMany({
    where: {
      status: 'ACTIVE',
      isPublic: true,
    },
    include: {
      creator: true,
      _count: {
        select: {
          participants: true,
        },
      },
    },
    orderBy: {
      startAt: 'desc',
    },
  })
}

export async function getContestsByCreator(creatorId: string) {
  return prisma.contest.findMany({
    where: { creatorId },
    include: {
      _count: {
        select: {
          participants: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export async function getContestsByParticipant(userId: string) {
  return prisma.contestParticipant.findMany({
    where: { userId },
    include: {
      contest: {
        include: {
          creator: true,
          _count: {
            select: {
              participants: true,
            },
          },
        },
      },
    },
    orderBy: {
      joinedAt: 'desc',
    },
  })
} 