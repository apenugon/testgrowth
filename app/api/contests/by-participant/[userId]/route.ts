import { NextRequest, NextResponse } from "next/server"
import { getContestsByParticipant } from "@/lib/db/contests"
import { verifyUserToken } from "@whop/api"

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

    const { userId } = await params

    // Users can only access their own participations
    if (userId !== authenticatedUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const contests = await getContestsByParticipant(userId)
    return NextResponse.json(contests)
  } catch (error) {
    console.error("Error fetching contests by participant:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 