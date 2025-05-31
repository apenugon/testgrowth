import { NextRequest, NextResponse } from "next/server";
import { verifyUserToken } from "@whop/api";
import { getContestBalances } from "@/lib/webhook-manager";
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
      select: { 
        id: true, 
        name: true, 
        metric: true, 
        startAt: true, 
        endAt: true,
        status: true 
      },
    });

    if (!contest) {
      return NextResponse.json({ error: "Contest not found" }, { status: 404 });
    }

    // Get contest balances
    const balances = await getContestBalances(contestId);

    // Transform the data for the response
    const leaderboard = balances.map((balance: any, index: number) => ({
      rank: index + 1,
      storeId: balance.storeId,
      shopDomain: balance.store.shopDomain,
      userId: balance.store.userId,
      username: balance.store.user.username,
      totalSales: balance.totalSales,
      orderCount: balance.orderCount,
      lastUpdated: balance.lastUpdatedAt,
    }));

    return NextResponse.json({
      contestId: contestId,
      contestName: contest.name,
      metric: contest.metric,
      startAt: contest.startAt,
      endAt: contest.endAt,
      status: contest.status,
      leaderboard,
      totalParticipants: leaderboard.length,
    });

  } catch (error) {
    console.error("Error fetching contest balances:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 