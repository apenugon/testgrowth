import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const contests = await prisma.contest.findMany({
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          }
        },
        _count: {
          select: {
            participants: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json(contests)
  } catch (error) {
    console.error("Error fetching all contests:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 