import { prisma } from './prisma';
import { webhookManager } from './webhook-manager';

export type ContestStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'CANCELLED';

/**
 * Update contest status and handle lifecycle events
 */
export async function updateContestStatus(contestId: string, newStatus: ContestStatus) {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: { status: true, startAt: true, endAt: true },
  });

  if (!contest) {
    throw new Error('Contest not found');
  }

  // Update the contest status
  await prisma.contest.update({
    where: { id: contestId },
    data: { status: newStatus },
  });

  // Handle lifecycle events
  if (newStatus === 'ACTIVE' && contest.status !== 'ACTIVE') {
    await handleContestStart(contestId);
  } else if (newStatus === 'CLOSED' && contest.status === 'ACTIVE') {
    await handleContestEnd(contestId);
  }
}

/**
 * Handle contest start - set up Shopify webhooks to send to Pub/Sub
 */
async function handleContestStart(contestId: string) {
  console.log(`Starting contest ${contestId} - setting up Shopify webhooks to Pub/Sub`);
  
  if (!webhookManager) {
    console.log('📝 Webhook manager not available - skipping webhook setup');
    return;
  }
  
  try {
    await webhookManager.setupWebhooksForContest(contestId);
    console.log(`Successfully set up webhooks for contest ${contestId}`);
  } catch (error) {
    console.error(`Failed to set up webhooks for contest ${contestId}:`, error);
    // Don't throw here - contest can still run without webhooks
  }
}

/**
 * Handle contest end - remove Shopify webhooks and calculate final results
 */
async function handleContestEnd(contestId: string) {
  console.log(`Ending contest ${contestId} - cleaning up Shopify webhooks`);
  
  if (!webhookManager) {
    console.log('📝 Webhook manager not available - skipping webhook cleanup');
  } else {
    try {
      await webhookManager.removeWebhooksForContest(contestId);
      console.log(`Successfully removed webhooks for contest ${contestId}`);
    } catch (error) {
      console.error(`Failed to remove webhooks for contest ${contestId}:`, error);
    }
  }

  // Calculate final results and payouts
  await calculateFinalResults(contestId);
}

/**
 * Calculate final results and determine winners
 */
async function calculateFinalResults(contestId: string) {
  console.log(`Calculating final results for contest ${contestId}`);
  
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: { metric: true },
  });

  if (!contest) {
    throw new Error('Contest not found');
  }

  // Get final balances using the webhook manager function
  const { getContestBalances } = await import('./webhook-manager');
  const balances = await getContestBalances(contestId);

  // TODO: Create payout records for winners
  console.log(`Contest ${contestId} final results:`, balances.slice(0, 3));
}

/**
 * Check and update contest statuses based on current time
 * This should be called periodically (e.g., via cron job)
 */
export async function updateContestStatuses() {
  const now = new Date();

  // Find contests that should be active but aren't
  const contestsToStart = await prisma.contest.findMany({
    where: {
      status: 'DRAFT',
      startAt: { lte: now },
      endAt: { gt: now },
    },
  });

  for (const contest of contestsToStart) {
    await updateContestStatus(contest.id, 'ACTIVE');
  }

  // Find contests that should be closed
  const contestsToEnd = await prisma.contest.findMany({
    where: {
      status: 'ACTIVE',
      endAt: { lte: now },
    },
  });

  for (const contest of contestsToEnd) {
    await updateContestStatus(contest.id, 'CLOSED');
  }
}

/**
 * All the logic that happens when a contest starts
 */
export async function startContest(contestId: string): Promise<void> {
  console.log(`🏁 Starting contest ${contestId}`);

  try {
    // Update contest status
    await prisma.contest.update({
      where: { id: contestId },
      data: { 
        status: 'ACTIVE',
        actualStartAt: new Date()
      },
    });

    // Set up webhooks for all participating stores (only if webhook manager is available)
    if (webhookManager) {
      await webhookManager.setupWebhooksForContest(contestId);
    } else {
      console.log('📝 Webhook manager not available - skipping webhook setup');
    }
    
    console.log(`✅ Contest ${contestId} started successfully`);
  } catch (error) {
    console.error(`❌ Failed to start contest ${contestId}:`, error);
    throw error;
  }
}

/**
 * All the logic that happens when a contest ends
 */
export async function endContest(contestId: string): Promise<void> {
  console.log(`🏁 Ending contest ${contestId}`);

  try {
    // Update contest status
    await prisma.contest.update({
      where: { id: contestId },
      data: { 
        status: 'ENDED',
        actualEndAt: new Date()
      },
    });

    // Remove webhooks for this contest (only if webhook manager is available)
    if (webhookManager) {
      await webhookManager.removeWebhooksForContest(contestId);
    } else {
      console.log('📝 Webhook manager not available - skipping webhook cleanup');
    }
    
    // TODO: Distribute prizes to winners
    
    console.log(`✅ Contest ${contestId} ended successfully`);
  } catch (error) {
    console.error(`❌ Failed to end contest ${contestId}:`, error);
    throw error;
  }
} 