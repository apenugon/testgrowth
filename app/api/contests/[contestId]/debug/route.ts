import { NextRequest, NextResponse } from "next/server";
import { verifyUserToken } from "@whop/api";
import { webhookManager } from "@/lib/webhook-manager";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{
    contestId: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify user authentication
    const { userId } = await verifyUserToken(request.headers);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contestId } = await params;

    // Check if contest exists
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        participants: {
          include: {
            store: true,
            user: true,
          },
        },
      },
    });

    if (!contest) {
      return NextResponse.json({ error: "Contest not found" }, { status: 404 });
    }

    // Check participants and stores
    const participants = contest.participants;
    const uniqueStores = new Map(
      participants.map(p => [p.store.id, p.store])
    );

    // Check existing webhook subscriptions
    const existingSubscriptions = await prisma.webhookSubscription.findMany({
      where: { contestId },
      include: { store: true },
    });

    // Check contest balances
    const contestBalances = await prisma.contestStoreBalance.findMany({
      where: { contestId },
      include: { store: true },
    });

    // Environment check
    const envCheck = {
      GOOGLE_CLOUD_PROJECT_ID: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
      SHOPIFY_APP_API_KEY: !!process.env.SHOPIFY_APP_API_KEY,
      SHOPIFY_APP_SECRET: !!process.env.SHOPIFY_APP_SECRET,
    };

    return NextResponse.json({
      contestId,
      contest: {
        id: contest.id,
        name: contest.name,
        status: contest.status,
        startAt: contest.startAt,
        endAt: contest.endAt,
      },
      participants: participants.map(p => ({
        userId: p.userId,
        username: p.user.username,
        storeId: p.storeId,
        shopDomain: p.store.shopDomain,
      })),
      uniqueStores: Array.from(uniqueStores.values()).map(store => ({
        id: store.id,
        shopDomain: store.shopDomain,
        isActive: store.isActive,
      })),
      existingSubscriptions: existingSubscriptions.map(sub => ({
        id: sub.id,
        storeId: sub.storeId,
        shopDomain: sub.store.shopDomain,
        topic: sub.topic,
        webhookId: sub.webhookId,
        isActive: sub.isActive,
      })),
      contestBalances: contestBalances.map(balance => ({
        storeId: balance.storeId,
        shopDomain: balance.store.shopDomain,
        totalSales: balance.totalSales,
        orderCount: balance.orderCount,
      })),
      environment: envCheck,
    });

  } catch (error) {
    console.error("Error in debug endpoint:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify user authentication
    const { userId } = await verifyUserToken(request.headers);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contestId } = await params;

    const body = await request.json();
    const action = body.action; // "setup_webhooks" or "test_pubsub"

    if (action === "setup_webhooks") {
      console.log(`Debug: Manually setting up webhooks for contest ${contestId}`);
      await webhookManager.setupWebhooksForContest(contestId);
      
      return NextResponse.json({ 
        success: true, 
        message: `Webhooks set up for contest ${contestId}` 
      });
    } else if (action === "test_pubsub") {
      console.log("Debug: Testing Pub/Sub connection");
      await webhookManager.startSubscribing();
      
      return NextResponse.json({ 
        success: true, 
        message: "Pub/Sub subscriptions started" 
      });
    } else {
      return NextResponse.json({ 
        error: "Invalid action. Use 'setup_webhooks' or 'test_pubsub'" 
      }, { status: 400 });
    }

  } catch (error) {
    console.error("Error in debug action:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 