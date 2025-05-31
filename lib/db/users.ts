import { prisma } from '../prisma'
import type { User } from '@prisma/client'

export async function createOrUpdateUser(whopUserData: {
  id: string
  email: string
  name?: string
  username?: string
}): Promise<User> {
  return prisma.user.upsert({
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