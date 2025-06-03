import { NextRequest, NextResponse } from "next/server";
import { verifyUserToken } from "@whop/api";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ contestId: string }> }
) {
  try {
    const { contestId } = await params;

    // Verify user authentication
    const { userId: whopUserId } = await verifyUserToken(request.headers);
    
    if (!whopUserId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Find the user record using Whop user ID
    const user = await prisma.user.findUnique({
      where: { whopUserId: whopUserId }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get the contest and check if it hasn't started yet
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        participants: true,
      },
    });

    if (!contest) {
      return NextResponse.json(
        { error: "Contest not found" },
        { status: 404 }
      );
    }

    // Check if user is actually participating
    const existingParticipant = contest.participants.find(p => p.userId === user.id);
    if (!existingParticipant) {
      return NextResponse.json(
        { error: "You are not participating in this contest" },
        { status: 400 }
      );
    }

    // Check if contest hasn't started yet
    const now = new Date();
    if (contest.startAt <= now) {
      return NextResponse.json(
        { error: "Cannot withdraw from a contest that has already started" },
        { status: 400 }
      );
    }

    // Remove the user's participation
    await prisma.contestParticipant.deleteMany({
      where: {
        contestId: contestId,
        userId: user.id
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error withdrawing from contest:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 