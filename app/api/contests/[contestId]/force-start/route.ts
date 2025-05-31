import { NextRequest, NextResponse } from 'next/server'
import { verifyUserToken } from '@whop/api'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { contestId: string } }
) {
  try {
    // Verify user authentication
    const { userId: whopUserId } = await verifyUserToken(request.headers)
    
    if (!whopUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { contestId } = params

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
    })

    if (!contest) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 })
    }

    // Check if user is the creator
    if (contest.creatorId !== userId) {
      return NextResponse.json({ 
        error: 'Only the contest creator can force start a contest' 
      }, { status: 403 })
    }

    // Check if contest has already started
    const now = new Date()
    if (now >= contest.startAt) {
      return NextResponse.json({ 
        error: 'Contest has already started' 
      }, { status: 400 })
    }

    // Check if contest has ended
    if (now >= contest.endAt) {
      return NextResponse.json({ 
        error: 'Cannot start a contest that has already ended' 
      }, { status: 400 })
    }

    // Update the start date to now
    const updatedContest = await prisma.contest.update({
      where: { id: contestId },
      data: { 
        startAt: now,
      },
    })

    return NextResponse.json({ 
      success: true,
      contest: {
        id: updatedContest.id,
        startAt: updatedContest.startAt,
        endAt: updatedContest.endAt,
      }
    })

  } catch (error) {
    console.error('Error force starting contest:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 