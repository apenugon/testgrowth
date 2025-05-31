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
        }
      })

      if (!store) {
        return NextResponse.json(
          { error: "Store not found or not owned by user" },
          { status: 404 }
        )
      }

      await prisma.shopifyStore.delete({
        where: { id: storeId }
      })

      return NextResponse.json({
        success: true,
        message: "Store disconnected successfully"
      })
    } else {
      // Disconnect all stores for the user
      const deletedStores = await prisma.shopifyStore.deleteMany({
        where: {
          userId: user.id
        }
      })

      return NextResponse.json({
        success: true,
        message: `${deletedStores.count} store(s) disconnected successfully`,
        deletedCount: deletedStores.count
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