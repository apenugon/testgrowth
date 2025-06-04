import { NextRequest, NextResponse } from 'next/server'
import { joinContest, findContestBySlug } from '@/lib/db/contests'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

// TEMPORARY: Set to true to skip Shopify connection requirement
const SKIP_SHOPIFY_CHECK = true;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contestId: string }> }
) {
  try {
    // Verify user authentication using unified system
    const authResult = await authenticateRequest(request)
    
    if (!authResult.success || !authResult.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { contestId } = await params
    
    // Parse request body to get selected store ID
    const body = await request.json().catch(() => ({}))
    const { storeId: requestedStoreId } = body

    const userId = authResult.userId // Use internal user ID for database queries

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

    // Check if contest has ended (new logic: allow joining until contest ends)
    const now = new Date()
    if (now >= contest.endAt) {
      return NextResponse.json({ 
        error: 'Cannot join contest that has already ended' 
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

    // TEMPORARY: Skip Shopify store requirement if flag is set
    // Set SKIP_SHOPIFY_CHECK=true in environment to allow joining without Shopify connection
    
    let userStore = null
    
    if (!SKIP_SHOPIFY_CHECK) {
      // Original Shopify store check logic
      if (requestedStoreId) {
        // Use specific store if provided
        userStore = await prisma.shopifyStore.findFirst({
          where: { 
            id: requestedStoreId,
            userId,
            isActive: true 
          },
        })
        
        if (!userStore) {
          return NextResponse.json({ 
            error: 'Selected Shopify store not found or inactive' 
          }, { status: 400 })
        }
      } else {
        // Fall back to first active store
        userStore = await prisma.shopifyStore.findFirst({
          where: { 
            userId,
            isActive: true 
          },
        })
      }

      if (!userStore) {
        return NextResponse.json({ 
          error: 'You must connect a Shopify store to join this contest' 
        }, { status: 400 })
      }
    } else {
      // TEMPORARY: When skipping Shopify check, create a dummy store entry if none exists
      console.log('⚠️  SKIPPING SHOPIFY CHECK - Development mode')
      
      // Try to find any existing store first
      userStore = await prisma.shopifyStore.findFirst({
        where: { 
          userId,
          isActive: true 
        },
      })
      
      // If no store exists, create a temporary one for development
      if (!userStore) {
        userStore = await prisma.shopifyStore.create({
          data: {
            userId,
            shopDomain: `temp-${userId.slice(-8)}.myshopify.com`, // Use last 8 chars of user ID
            accessToken: 'temp-token-dev-only', // Temporary token
            isActive: true,
          }
        })
        console.log(`Created temporary store for user ${userId}: ${userStore.shopDomain}`)
      }
    }

    // Join the contest with current timestamp as joinedAt
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