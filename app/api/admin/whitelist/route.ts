import { NextRequest, NextResponse } from "next/server"
import { verifyUserToken } from "@whop/api"
import { prisma } from "@/lib/prisma"
import { isUserAdmin } from "@/lib/permissions"

// GET - List all whitelisted creators
export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const { userId } = await verifyUserToken(request.headers)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const isAdmin = await isUserAdmin(userId)
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    // Get all whitelisted creators
    const whitelist = await prisma.creatorWhitelist.findMany({
      include: {
        user: {
          select: {
            username: true,
            name: true,
            whopUserId: true,
            createdAt: true
          }
        },
        admin: {
          select: {
            username: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(whitelist)
  } catch (error) {
    console.error("Error fetching whitelist:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// POST - Add user to whitelist
export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const { userId } = await verifyUserToken(request.headers)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const isAdmin = await isUserAdmin(userId)
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { username } = await request.json()
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: "Username is required" }, { status: 400 })
    }

    // Get admin user record
    const adminUser = await prisma.user.findUnique({
      where: { whopUserId: userId }
    })

    if (!adminUser) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 })
    }

    const normalizedUsername = username.toLowerCase()

    // Check if already whitelisted
    const existingEntry = await prisma.creatorWhitelist.findUnique({
      where: { username: normalizedUsername }
    })

    if (existingEntry) {
      return NextResponse.json({ 
        error: "User is already whitelisted" 
      }, { status: 400 })
    }

    // Try to find existing user by username
    const targetUser = await prisma.user.findFirst({
      where: { username: normalizedUsername }
    })

    // Create whitelist entry - either linked to existing user or as future user
    const whitelistEntry = await prisma.creatorWhitelist.create({
      data: {
        userId: targetUser?.id, // Will be null if user doesn't exist yet
        username: normalizedUsername,
        addedBy: adminUser.id
      },
      include: {
        user: targetUser ? {
          select: {
            username: true,
            name: true,
            whopUserId: true
          }
        } : undefined
      }
    })

    return NextResponse.json({
      success: true,
      entry: whitelistEntry,
      message: targetUser 
        ? `Added existing user ${normalizedUsername} to creator whitelist`
        : `Pre-whitelisted user ${normalizedUsername} - they will have creator access when they join`
    })
  } catch (error) {
    console.error("Error adding to whitelist:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// DELETE - Remove user from whitelist
export async function DELETE(request: NextRequest) {
  try {
    // Verify user authentication
    const { userId } = await verifyUserToken(request.headers)
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const isAdmin = await isUserAdmin(userId)
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { username } = await request.json()
    if (!username || typeof username !== 'string') {
      return NextResponse.json({ error: "Username is required" }, { status: 400 })
    }

    // Find and remove whitelist entry
    const deleted = await prisma.creatorWhitelist.deleteMany({
      where: { username: username.toLowerCase() }
    })

    if (deleted.count === 0) {
      return NextResponse.json({ 
        error: "User not found in whitelist" 
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: `Removed ${username} from creator whitelist`
    })
  } catch (error) {
    console.error("Error removing from whitelist:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 