import { NextRequest, NextResponse } from 'next/server'
import { verifyUserToken } from '@whop/api'
import { joinContest, findContestBySlug } from '@/lib/db/contests'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contestId: string }> }
) {
  try {
    // Verify user authentication
    const { userId: whopUserId } = await verifyUserToken(request.headers)
    
    if (!whopUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { contestId } = await params

    // Find the user record using Whop user ID
    const user = await prisma.user.findUnique({
      where: { whopUserId: whopUserId }
    })

    if (!user) {
      return NextResponse.json({ 
        error: 'User not found. Please contact support.' 
      }, { status: 404 })
    }

    const userId = user.id // Use internal user ID for database queries

    // Get contest details
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        participants: true,
      },
    })

    if (!contest) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 })
    }

    // Check if contest hasn't started yet (requirement 1)
    const now = new Date()
    if (now >= contest.startAt) {
      return NextResponse.json({ 
        error: 'Cannot join contest that has already started' 
      }, { status: 400 })
    }

    // Check if user is already participating
    const existingParticipant = contest.participants.find(p => p.userId === userId)
    if (existingParticipant) {
      return NextResponse.json({ 
        error: 'You are already participating in this contest' 
      }, { status: 400 })
    }

    // Check if contest is public
    if (!contest.isPublic) {
      return NextResponse.json({ error: 'Contest is private' }, { status: 403 })
    }

    // Check if contest is full
    if (contest.maxParticipants && contest.participants.length >= contest.maxParticipants) {
      return NextResponse.json({ error: 'Contest is full' }, { status: 400 })
    }

    // Get user's Shopify store
    const userStore = await prisma.shopifyStore.findFirst({
      where: { 
        userId, // Now using internal user ID
        isActive: true 
      },
    })

    if (!userStore) {
      return NextResponse.json({ 
        error: 'You must connect a Shopify store to join this contest' 
      }, { status: 400 })
    }

    // Join the contest
    const participant = await joinContest({
      contestId,
      userId,
      storeId: userStore.id,
      isPaid: contest.entryFeeCents === 0, // Free contests are automatically paid
    })

    return NextResponse.json({ 
      success: true,
      participant: {
        contestId: participant.contestId,
        userId: participant.userId,
        storeId: participant.storeId,
        joinedAt: participant.joinedAt,
      }
    })

  } catch (error) {
    console.error('Error joining contest:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 