import { NextRequest, NextResponse } from "next/server"
import { getContestsByCreator } from "@/lib/db/contests"
import { verifyUserToken } from "@whop/api"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // Verify user authentication
    const { userId: authenticatedUserId } = await verifyUserToken(request.headers)
    if (!authenticatedUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { userId: whopUserId } = await params

    // Users can only access their own contests
    if (whopUserId !== authenticatedUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Map Whop user ID to internal user ID
    const user = await prisma.user.findUnique({
      where: { whopUserId: whopUserId }
    })

    if (!user) {
      // User doesn't exist in our database yet, so no contests
      return NextResponse.json([])
    }

    const contests = await getContestsByCreator(user.id) // Use internal user ID
    return NextResponse.json(contests)
  } catch (error) {
    console.error("Error fetching contests by creator:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 