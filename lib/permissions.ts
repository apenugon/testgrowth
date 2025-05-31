import { prisma } from "./prisma"

// Check if a user is an admin (hardcoded for "akulkid" initially)
export async function isUserAdmin(whopUserId: string): Promise<boolean> {
  try {
    // Find the user first
    const user = await prisma.user.findUnique({
      where: { whopUserId },
      include: { adminUser: true }
    })

    if (!user) return false

    // Check if user has admin record OR is the hardcoded admin
    return user.adminUser !== null || user.username === "akulkid"
  } catch (error) {
    console.error("Error checking admin status:", error)
    return false
  }
}

// Check if a user is whitelisted as a creator
export async function isUserWhitelistedCreator(whopUserId: string): Promise<boolean> {
  try {
    // Find the user first
    const user = await prisma.user.findUnique({
      where: { whopUserId },
      include: { whitelistEntry: true, adminUser: true }
    })

    if (!user) return false

    // Admins are automatically whitelisted
    if (user.adminUser !== null || user.username === "akulkid") {
      return true
    }

    // Check if user has explicit whitelist entry linked to their user ID
    if (user.whitelistEntry !== null) {
      return true
    }

    // Check if user was pre-whitelisted by username before they joined
    if (user.username) {
      const usernameWhitelist = await prisma.creatorWhitelist.findUnique({
        where: { username: user.username.toLowerCase() }
      })

      // If found and not yet linked to a user, link it now
      if (usernameWhitelist && !usernameWhitelist.userId) {
        await prisma.creatorWhitelist.update({
          where: { id: usernameWhitelist.id },
          data: { userId: user.id }
        })
        return true
      }

      return usernameWhitelist !== null
    }

    return false
  } catch (error) {
    console.error("Error checking creator whitelist status:", error)
    return false
  }
}

// Ensure admin user exists in database
export async function ensureAdminUser(whopUserId: string, username: string): Promise<void> {
  try {
    // Find or create the user
    let user = await prisma.user.findUnique({
      where: { whopUserId },
      include: { adminUser: true }
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          whopUserId,
          email: `${whopUserId}@whop.user`,
          username,
        },
        include: { adminUser: true }
      })
    }

    // Create admin record if it doesn't exist and this is the hardcoded admin
    if (!user.adminUser && username === "akulkid") {
      await prisma.adminUser.create({
        data: {
          userId: user.id,
          username: user.username || username,
        }
      })
    }
  } catch (error) {
    console.error("Error ensuring admin user:", error)
  }
} 