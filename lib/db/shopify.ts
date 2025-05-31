import { prisma } from '../prisma'
import type { ShopifyStore, OrderSnapshot } from '@prisma/client'

export async function createShopifyStore(data: {
  userId: string
  shopDomain: string
  accessToken: string
}): Promise<ShopifyStore> {
  return prisma.shopifyStore.create({
    data: {
      ...data,
      // TODO: Encrypt accessToken before storing
    },
  })
}

export async function findShopifyStoreByDomain(userId: string, shopDomain: string) {
  return prisma.shopifyStore.findUnique({
    where: {
      userId_shopDomain: {
        userId,
        shopDomain,
      },
    },
  })
}

export async function getUserShopifyStores(userId: string) {
  return prisma.shopifyStore.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function updateStoreLastSync(storeId: string) {
  return prisma.shopifyStore.update({
    where: { id: storeId },
    data: { lastSyncAt: new Date() },
  })
}

export async function deactivateShopifyStore(storeId: string) {
  return prisma.shopifyStore.update({
    where: { id: storeId },
    data: { isActive: false },
  })
}

export async function createOrderSnapshot(data: {
  storeId: string
  contestId: string
  orderId: string
  totalPrice: number // Will be converted to cents
  currency?: string
  orderNumber?: string
}): Promise<OrderSnapshot> {
  return prisma.orderSnapshot.create({
    data: {
      ...data,
      totalPrice: Math.round(data.totalPrice * 100), // Convert to cents
    },
  })
}

export async function updateParticipantStats(
  contestId: string,
  userId: string,
  orderValue: number // In cents
) {
  return prisma.contestParticipant.update({
    where: {
      contestId_userId: {
        contestId,
        userId,
      },
    },
    data: {
      totalSales: {
        increment: orderValue,
      },
      orderCount: {
        increment: 1,
      },
    },
  })
}

export async function getContestOrderSnapshots(contestId: string) {
  return prisma.orderSnapshot.findMany({
    where: { contestId },
    include: {
      store: {
        include: {
          user: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
} 