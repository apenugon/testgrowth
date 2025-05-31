import { NextRequest, NextResponse } from "next/server";
import { verifyUserToken } from "@whop/api";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Skip auth in development mode for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('🛠️ Development mode: skipping auth for debug endpoint');
    } else {
      // Verify user authentication in production
      const { userId } = await verifyUserToken(request.headers);
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Get all webhook subscriptions from our database
    const webhookSubscriptions = await prisma.webhookSubscription.findMany({
      include: {
        store: true,
        contest: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get some sample stores for testing
    const stores = await prisma.shopifyStore.findMany({
      take: 5,
      include: { user: true },
    });

    // Get active contests
    const activeContests = await prisma.contest.findMany({
      where: { status: 'ACTIVE' },
      include: {
        participants: {
          include: { store: true }
        }
      }
    });

    return NextResponse.json({
      webhookSubscriptions: webhookSubscriptions.map(sub => ({
        id: sub.id,
        contestId: sub.contestId,
        contestName: sub.contest.name,
        storeId: sub.storeId,
        storeDomain: sub.store.shopDomain,
        topic: sub.topic,
        webhookId: sub.webhookId,
        isActive: sub.isActive,
        createdAt: sub.createdAt,
      })),
      stores: stores.map(store => ({
        id: store.id,
        shopDomain: store.shopDomain,
        hasAccessToken: !!store.accessToken,
        accessTokenLength: store.accessToken?.length || 0,
        userId: store.userId,
        userEmail: store.user.email,
      })),
      activeContests: activeContests.map(contest => ({
        id: contest.id,
        name: contest.name,
        status: contest.status,
        startAt: contest.startAt,
        endAt: contest.endAt,
        participantCount: contest.participants.length,
        stores: contest.participants.map(p => p.store.shopDomain),
      })),
      totals: {
        totalWebhookSubscriptions: webhookSubscriptions.length,
        activeWebhookSubscriptions: webhookSubscriptions.filter(s => s.isActive).length,
        totalStores: stores.length,
        storesWithTokens: stores.filter(s => s.accessToken).length,
        activeContests: activeContests.length,
      },
      environment: process.env.NODE_ENV,
    });

  } catch (error) {
    console.error("Error debugging webhooks:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 