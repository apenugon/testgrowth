import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/auth"

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ storeId: string }> }
) {
  try {
    // Get authenticated user from session
    const sessionResult = await getSessionFromCookies()
    
    if (!sessionResult) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { storeId } = await params

    if (!storeId) {
      return NextResponse.json(
        { error: "Store ID is required" },
        { status: 400 }
      )
    }

    // Find the store and verify ownership
    const store = await prisma.shopifyStore.findFirst({
      where: {
        id: storeId,
        userId: sessionResult.userId // Use the authenticated user's ID
      },
      include: {
        contestParticipants: {
          include: {
            contest: {
              select: {
                id: true,
                name: true,
                endAt: true,
                startAt: true
              }
            }
          }
        }
      }
    })

    if (!store) {
      return NextResponse.json(
        { error: "Store not found or not owned by user" },
        { status: 404 }
      )
    }

    // Check which contests the user will be removed from
    const now = new Date()
    const affectedContests = store.contestParticipants
      .filter(participant => now < new Date(participant.contest.endAt))
      .map(participant => ({
        id: participant.contest.id,
        name: participant.contest.name,
        endAt: participant.contest.endAt,
        startAt: participant.contest.startAt
      }))

    // First, explicitly remove contest participations
    if (affectedContests.length > 0) {
      await prisma.contestParticipant.deleteMany({
        where: {
          storeId: storeId,
          contestId: {
            in: affectedContests.map(c => c.id)
          }
        }
      })
    }

    // Then delete the store
    await prisma.shopifyStore.delete({
      where: { id: storeId }
    })

    console.log('Store disconnected successfully:', {
      storeId,
      shopDomain: store.shopDomain,
      userId: sessionResult.userId,
      affectedContests: affectedContests.length
    })

    return NextResponse.json({
      success: true,
      message: "Store disconnected successfully",
      removedFromContests: affectedContests
    })

  } catch (error) {
    console.error("Error disconnecting Shopify store:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 