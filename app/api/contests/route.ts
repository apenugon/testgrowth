import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createContest } from "@/lib/db/contests"
import { createOrUpdateUser } from "@/lib/db/users"
import { whopApi } from "@/lib/whop-api"
import { verifyUserToken } from "@whop/api"

const createContestSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  metric: z.enum(["TOTAL_SALES", "ORDER_COUNT"]),
  startAt: z.string().transform((str) => new Date(str)),
  endAt: z.string().transform((str) => new Date(str)),
  entryFeeCents: z.number().min(0),
  prizePoolCents: z.number().min(0),
  prizePoolType: z.enum(["ENTRY_FEES", "CREATOR_FUNDED", "HYBRID"]),
  firstPlacePercent: z.number().min(0).max(100),
  secondPlacePercent: z.number().min(0).max(100),
  thirdPlacePercent: z.number().min(0).max(100),
  isPublic: z.boolean().default(true),
  maxParticipants: z.number().optional(),
}).refine((data) => {
  const total = data.firstPlacePercent + data.secondPlacePercent + data.thirdPlacePercent
  return total === 100
}, {
  message: "Prize percentages must add up to 100%",
  path: ["thirdPlacePercent"],
})

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const { userId } = await verifyUserToken(request.headers)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = createContestSchema.parse(body)

    // Get user data from Whop
    const whopUser = await whopApi.getUser({ userId })
    if (!whopUser.publicUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Create or update user in our database and get the internal database user
    const dbUser = await createOrUpdateUser({
      id: userId,
      email: `${whopUser.publicUser.username}@whop.user`, // Fallback email since email is not available
      name: whopUser.publicUser.name || undefined,
      username: whopUser.publicUser.username,
    })

    let whopPlanId: string | undefined

    // Create Whop plan if contest has entry fee
    if (validatedData.entryFeeCents > 0) {
      try {
        // TODO: Implement Whop plan creation
        // This would create a product and plan in Whop for the contest
        // For now, we'll leave this as undefined and implement later
        console.log("TODO: Create Whop plan for paid contest")
      } catch (error) {
        console.error("Failed to create Whop plan:", error)
        return NextResponse.json(
          { error: "Failed to set up payment processing" },
          { status: 500 }
        )
      }
    }

    // Create contest in database using the internal database user ID
    const contest = await createContest({
      creatorId: dbUser.id, // Use the internal database user ID, not the Whop user ID
      name: validatedData.name,
      description: validatedData.description || "",
      metric: validatedData.metric,
      startAt: validatedData.startAt,
      endAt: validatedData.endAt,
      entryFeeCents: validatedData.entryFeeCents,
      prizePoolCents: validatedData.prizePoolCents,
      prizePoolType: validatedData.prizePoolType,
      firstPlacePercent: validatedData.firstPlacePercent,
      secondPlacePercent: validatedData.secondPlacePercent,
      thirdPlacePercent: validatedData.thirdPlacePercent,
      isPublic: validatedData.isPublic,
      maxParticipants: validatedData.maxParticipants,
    })

    // Update contest with Whop plan ID if created
    if (whopPlanId) {
      // TODO: Update contest with whopPlanId
    }

    return NextResponse.json(contest, { status: 201 })
  } catch (error) {
    console.error("Error creating contest:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // TODO: Implement contest listing with filters
    // For now, return empty array
    return NextResponse.json([])
  } catch (error) {
    console.error("Error fetching contests:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 