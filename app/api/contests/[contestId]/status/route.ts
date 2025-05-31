import { NextRequest, NextResponse } from "next/server";
import { verifyUserToken } from "@whop/api";
import { updateContestStatus } from "@/lib/contest-lifecycle";
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
      select: { creatorId: true, status: true },
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
    const newStatus = body.status; // "DRAFT", "ACTIVE", "CLOSED", "CANCELLED"

    if (!['DRAFT', 'ACTIVE', 'CLOSED', 'CANCELLED'].includes(newStatus)) {
      return NextResponse.json({ 
        error: "Invalid status. Must be one of: DRAFT, ACTIVE, CLOSED, CANCELLED" 
      }, { status: 400 });
    }

    await updateContestStatus(contestId, newStatus);

    return NextResponse.json({ 
      success: true, 
      message: `Contest status updated to ${newStatus}`,
      previousStatus: contest.status,
      newStatus 
    });

  } catch (error) {
    console.error("Error updating contest status:", error);
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

    // Get contest status
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      select: { 
        id: true,
        status: true, 
        startAt: true, 
        endAt: true,
        createdAt: true,
        updatedAt: true 
      },
    });

    if (!contest) {
      return NextResponse.json({ error: "Contest not found" }, { status: 404 });
    }

    const now = new Date();
    const shouldBeActive = now >= contest.startAt && now <= contest.endAt;
    const shouldBeClosed = now > contest.endAt;

    return NextResponse.json({
      contestId: contestId,
      currentStatus: contest.status,
      startAt: contest.startAt,
      endAt: contest.endAt,
      shouldBeActive,
      shouldBeClosed,
      createdAt: contest.createdAt,
      updatedAt: contest.updatedAt,
    });

  } catch (error) {
    console.error("Error fetching contest status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 