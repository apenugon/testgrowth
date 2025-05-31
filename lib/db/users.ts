import { prisma } from '../prisma'
import type { User } from '@prisma/client'

export async function createOrUpdateUser(whopUserData: {
  id: string
  email: string
  name?: string
  username?: string
}): Promise<User> {
  const user = await prisma.user.upsert({
    where: { whopUserId: whopUserData.id },
    update: {
      email: whopUserData.email,
      name: whopUserData.name,
      username: whopUserData.username,
    },
    create: {
      whopUserId: whopUserData.id,
      email: whopUserData.email,
      name: whopUserData.name,
      username: whopUserData.username,
    },
  })

  // Check if this user was pre-whitelisted and link the whitelist entry
  if (whopUserData.username) {
    try {
      const preWhitelistEntry = await prisma.creatorWhitelist.findUnique({
        where: { username: whopUserData.username.toLowerCase() }
      })

      // If found and not yet linked to a user, link it now
      if (preWhitelistEntry && !preWhitelistEntry.userId) {
        await prisma.creatorWhitelist.update({
          where: { id: preWhitelistEntry.id },
          data: { userId: user.id }
        })
        console.log(`Linked pre-whitelisted user ${whopUserData.username} to user ID ${user.id}`)
      }
    } catch (error) {
      console.error("Error linking pre-whitelisted user:", error)
      // Don't fail user creation if this fails
    }
  }

  return user
}

export async function findUserByWhopId(whopUserId: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { whopUserId },
    include: {
      shopifyStores: true,
      createdContests: {
        include: {
          participants: true,
        },
      },
      contestParticipants: {
        include: {
          contest: true,
          store: true,
        },
      },
    },
  })
}

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id },
    include: {
      shopifyStores: true,
      createdContests: true,
      contestParticipants: true,
    },
  })
} 