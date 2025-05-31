import { NextResponse } from "next/server"
import { getActiveContests } from "@/lib/db/contests"

export async function GET() {
  try {
    const contests = await getActiveContests()
    return NextResponse.json(contests)
  } catch (error) {
    console.error("Error fetching active contests:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 