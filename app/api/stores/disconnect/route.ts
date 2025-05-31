import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId: whopUserId, storeId } = body

    if (!whopUserId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Find the user record using Whop user ID
    const user = await prisma.user.findUnique({
      where: { whopUserId: whopUserId }
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    if (storeId) {
      // Disconnect specific store
      const store = await prisma.shopifyStore.findFirst({
        where: {
          id: storeId,
          userId: user.id
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

      return NextResponse.json({
        success: true,
        message: "Store disconnected successfully",
        removedFromContests: affectedContests
      })
    } else {
      // Disconnect all stores for the user
      const stores = await prisma.shopifyStore.findMany({
        where: {
          userId: user.id
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

      // Collect all affected contests
      const now = new Date()
      const allAffectedContests = stores.flatMap(store => 
        store.contestParticipants
          .filter(participant => now < new Date(participant.contest.endAt))
          .map(participant => ({
            id: participant.contest.id,
            name: participant.contest.name,
            endAt: participant.contest.endAt,
            startAt: participant.contest.startAt
          }))
      )

      // Remove duplicates
      const uniqueAffectedContests = allAffectedContests.filter((contest, index, self) => 
        index === self.findIndex(c => c.id === contest.id)
      )

      // First, remove all contest participations
      if (uniqueAffectedContests.length > 0) {
        await prisma.contestParticipant.deleteMany({
          where: {
            userId: user.id,
            contestId: {
              in: uniqueAffectedContests.map(c => c.id)
            }
          }
        })
      }

      // Then delete all stores
      const deletedStores = await prisma.shopifyStore.deleteMany({
        where: {
          userId: user.id
        }
      })

      return NextResponse.json({
        success: true,
        message: `${deletedStores.count} store(s) disconnected successfully`,
        deletedCount: deletedStores.count,
        removedFromContests: uniqueAffectedContests
      })
    }

  } catch (error) {
    console.error("Error disconnecting Shopify store:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 