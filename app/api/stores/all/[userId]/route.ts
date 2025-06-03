import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: whopUserId } = await params
    
    // Find the user record using Whop user ID
    const user = await prisma.user.findUnique({
      where: { whopUserId: whopUserId }
    })

    if (!user) {
      // User doesn't exist in our database yet
      return NextResponse.json({
        stores: []
      })
    }
    
    // Get all stores for the user with active contest participation info
    const stores = await prisma.shopifyStore.findMany({
      where: {
        userId: user.id // Use internal user ID
      },
      include: {
        contestParticipants: {
          include: {
            contest: {
              select: {
                id: true,
                name: true,
                endAt: true,
                startAt: true,
                status: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    // Transform the data to include active contests info
    const storesWithActiveContests = stores.map(store => {
      const now = new Date()
      const activeContests = store.contestParticipants
        .filter(participant => {
          const contest = participant.contest
          // Contest is active if it hasn't ended yet (includes both upcoming and running contests)
          return now < new Date(contest.endAt)
        })
        .map(participant => ({
          id: participant.contest.id,
          name: participant.contest.name,
          endAt: participant.contest.endAt.toISOString()
        }))
      
      return {
        id: store.id,
        shopDomain: store.shopDomain,
        isActive: store.isActive,
        createdAt: store.createdAt.toISOString(),
        lastSyncAt: store.lastSyncAt?.toISOString(),
        activeContests
      }
    })
    
    return NextResponse.json({
      stores: storesWithActiveContests
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 