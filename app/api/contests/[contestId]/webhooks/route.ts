import { NextRequest, NextResponse } from "next/server";
import { verifyUserToken } from "@whop/api";
import { webhookManager } from "@/lib/webhook-manager";
import { prisma } from "@/lib/prisma";
import { createOrUpdateUser } from "@/lib/db/users";
import { whopApi } from "@/lib/whop-api";
import { isUserAdmin } from "@/lib/permissions";

interface RouteParams {	
  params: Promise<{
    contestId: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify user authentication
    const { userId } = await verifyUserToken(request.headers);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contestId } = await params;

    // Get user data from Whop and create/update in our database
    const whopUser = await whopApi.getUser({ userId });
    if (!whopUser.publicUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const dbUser = await createOrUpdateUser({
      id: userId,
      email: `${whopUser.publicUser.username}@whop.user`,
      name: whopUser.publicUser.name || undefined,
      username: whopUser.publicUser.username,
    });

    // Check if user is admin or contest creator
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      select: { creatorId: true },
    });

    if (!contest) {
      return NextResponse.json({ error: "Contest not found" }, { status: 404 });
    }

    const isContestCreator = contest.creatorId === dbUser.id;
    const isUserAdminCheck = await isUserAdmin(userId);

    if (!isUserAdminCheck && !isContestCreator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const action = body.action; // "start" or "stop"

    if (action === "start") {
      await webhookManager.setupWebhooksForContest(contestId);
      return NextResponse.json({ 
        success: true, 
        message: "Webhooks set up successfully" 
      });
    } else if (action === "stop") {
      await webhookManager.removeWebhooksForContest(contestId);
      return NextResponse.json({ 
        success: true, 
        message: "Webhooks removed successfully" 
      });
    } else {
      return NextResponse.json({ 
        error: "Invalid action. Use 'start' or 'stop'" 
      }, { status: 400 });
    }

  } catch (error) {
    console.error("Error managing contest webhooks:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Verify user authentication
    const { userId } = await verifyUserToken(request.headers);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contestId } = await params;

    // Get webhook subscription status for the contest
    const subscriptions = await prisma.webhookSubscription.findMany({
      where: { 
        contestId: contestId,
        isActive: true 
      },
      include: {
        store: {
          select: {
            shopDomain: true,
          },
        },
      },
    });

    interface GroupedSubscription {
      storeId: string;
      shopDomain: string;
      topics: string[];
    }

    const groupedSubscriptions = subscriptions.reduce((acc: Record<string, GroupedSubscription>, sub) => {
      if (!acc[sub.storeId]) {
        acc[sub.storeId] = {
          storeId: sub.storeId,
          shopDomain: sub.store.shopDomain,
          topics: [],
        };
      }
      acc[sub.storeId].topics.push(sub.topic);
      return acc;
    }, {});

    return NextResponse.json({
      contestId: contestId,
      activeWebhooks: Object.values(groupedSubscriptions),
      totalStores: Object.keys(groupedSubscriptions).length,
    });

  } catch (error) {
    console.error("Error fetching webhook status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 