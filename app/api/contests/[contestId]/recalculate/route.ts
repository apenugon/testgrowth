import { NextRequest, NextResponse } from 'next/server'
import { verifyUserToken } from '@whop/api'
import { prisma } from '@/lib/prisma'
import { recalculateAllContestBalances } from '@/lib/webhook-manager'

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

    // Find the user record using Whop user ID
    const user = await prisma.user.findUnique({
      where: { whopUserId: whopUserId },
      include: {
        adminUser: true,
      },
    })

    if (!user) {
      return NextResponse.json({ 
        error: 'User not found. Please contact support.' 
      }, { status: 404 })
    }

    // Check if user is an admin
    if (!user.adminUser) {
      return NextResponse.json({ 
        error: 'Admin access required' 
      }, { status: 403 })
    }

    const { contestId } = await params
    
    // Check if contest exists
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      select: { id: true, name: true, status: true },
    })

    if (!contest) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 })
    }

    // Trigger recalculation
    await recalculateAllContestBalances(contestId)

    return NextResponse.json({ 
      success: true,
      message: `Successfully recalculated balances for contest: ${contest.name}`,
      contestId: contest.id,
    })

  } catch (error) {
    console.error('Error recalculating contest balances:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 