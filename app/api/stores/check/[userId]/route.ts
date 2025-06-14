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
        hasStore: false,
        storeCount: 0
      })
    }
    
    // Check if user has any connected Shopify stores
    const store = await prisma.shopifyStore.findFirst({
      where: {
        userId: user.id // Use internal user ID
      },
      select: {
        id: true,
        shopDomain: true,
        isActive: true
      }
    })
    
    return NextResponse.json({
      hasStore: !!store,
      storeCount: store ? 1 : 0,
      store: store ? {
        id: store.id,
        shopDomain: store.shopDomain,
        isActive: store.isActive
      } : null
    })
    
  } catch (error) {
    console.error("Error checking Shopify store:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 