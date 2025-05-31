import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createOrUpdateUser } from "@/lib/db/users"
import { verifyUserToken } from "@whop/api"

const createUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  username: z.string(),
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
    const validatedData = createUserSchema.parse(body)

    // Verify the user ID matches the authenticated user
    if (validatedData.id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Create or update user in database
    const user = await createOrUpdateUser(validatedData)

    return NextResponse.json(user, { status: 200 })
  } catch (error) {
    console.error("Error creating/updating user:", error)

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