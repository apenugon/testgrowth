import { prisma } from './prisma';
import { createShopifyClient, createWebhook, deleteWebhook } from './shopify';
import fs from 'fs';

// Conditionally import Google Cloud PubSub only when needed
let PubSub: any = null;
let Message: any = null;

// Check if Google Cloud is properly configured
function isGoogleCloudConfigured(): boolean {
  // Only enable in production with proper credentials
  if (process.env.NODE_ENV !== 'production') {
    return false;
  }
  
  // Check if we have the required environment variables
  if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
    return false;
  }
  
  // Check if service key file exists (if GOOGLE_APPLICATION_CREDENTIALS is set)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      return fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    } catch {
      return false;
    }
  }
  
  // If no explicit credentials file, assume it's configured via other means (like GCP environment)
  return true;
}

// Lazy load Google Cloud PubSub imports
async function loadPubSubDependencies() {
  if (!PubSub) {
    const module = await import('@google-cloud/pubsub');
    PubSub = module.PubSub;
    Message = module.Message;
  }
}

// Initialize Google Pub/Sub client only if properly configured
let pubsub: any = null;

async function getPubSubClient(): Promise<any> {
  if (!isGoogleCloudConfigured()) {
    return null;
  }
  
  if (!pubsub) {
    await loadPubSubDependencies();
    pubsub = new PubSub({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });
  }
  return pubsub;
}

// Pub/Sub topic names for different webhook types
const PUBSUB_TOPICS = {
  'orders/paid': 'shopify-orders-paid',
  'orders/create': 'shopify-orders-create', 
  'refunds/create': 'shopify-refunds-create'
} as const;

// Webhook topics we need to track
const WEBHOOK_TOPICS = ['orders/paid', 'orders/create', 'refunds/create'] as const;
type WebhookTopic = typeof WEBHOOK_TOPICS[number];

export interface ContestWebhookManager {
  setupWebhooksForContest(contestId: string): Promise<void>;
  removeWebhooksForContest(contestId: string): Promise<void>;
  startSubscribing(): Promise<void>;
  stopSubscribing(): Promise<void>;
}

export class ShopifyWebhookManager implements ContestWebhookManager {
  private subscriptions: Map<string, any> = new Map();

  constructor() {
    // Don't create topics in constructor - do it lazily when needed
    console.log('ShopifyWebhookManager initialized');
  }

  /**
   * Ensure all required Pub/Sub topics exist
   */
  private async ensureTopicsExist(): Promise<void> {
    const client = await getPubSubClient();
    if (!client) {
      console.log('Skipping Pub/Sub topic creation - Google Cloud not configured');
      return;
    }

    for (const topicName of Object.values(PUBSUB_TOPICS)) {
      try {
        const topic = client.topic(topicName);
        const [exists] = await topic.exists();
        
        if (!exists) {
          await topic.create();
          console.log(`Created Pub/Sub topic: ${topicName}`);
        }
      } catch (error) {
        console.error(`Failed to create topic ${topicName}:`, error);
      }
    }
  }

  /**
   * Set up webhooks for all stores participating in a contest
   */
  async setupWebhooksForContest(contestId: string): Promise<void> {
    console.log(`Setting up webhooks for contest ${contestId}`);

    // Get all stores participating in this contest
    const participants = await prisma.contestParticipant.findMany({
      where: { contestId },
      include: {
        store: true,
      },
    });

    const uniqueStores = new Map(
      participants.map(p => [p.store.id, p.store])
    );

    // Create webhooks for each unique store
    for (const store of uniqueStores.values()) {
      await this.setupWebhooksForStore(contestId, store);
    }

    // Initialize contest balances for all participating stores
    await this.initializeContestBalances(contestId, Array.from(uniqueStores.keys()));
  }

  /**
   * Set up webhooks for a specific store in a contest
   */
  private async setupWebhooksForStore(contestId: string, store: any): Promise<void> {
    console.log(`Setting up webhooks for store ${store.shopDomain} in contest ${contestId}`);
	 return;

    // Ensure topics exist before creating webhooks
    try {
      await this.ensureTopicsExist();
    } catch (error) {
      console.error('Failed to ensure Pub/Sub topics exist:', error);
      return; // Skip webhook setup if topics can't be created
    }

    for (const topic of WEBHOOK_TOPICS) {
      try {
        // Check if webhook subscription already exists
        const existingSubscription = await prisma.webhookSubscription.findUnique({
          where: {
            contestId_storeId_topic: {
              contestId,
              storeId: store.id,
              topic,
            },
          },
        });

        if (existingSubscription?.isActive) {
          console.log(`Webhook already exists for ${store.shopDomain} - ${topic}`);
          continue;
        }

        // Get the Pub/Sub topic name for this webhook type
        const pubsubTopicName = PUBSUB_TOPICS[topic];

        // Create webhook in Shopify pointing to Pub/Sub using GraphQL Admin API
        const webhook = await createWebhook(
          store.shopDomain,
          store.accessToken,
          pubsubTopicName, // Pass topic name directly
          topic as any
        );

        // Store webhook subscription in database
        await prisma.webhookSubscription.upsert({
          where: {
            contestId_storeId_topic: {
              contestId,
              storeId: store.id,
              topic,
            },
          },
          update: {
            webhookId: webhook.id.toString(),
            isActive: true,
          },
          create: {
            contestId,
            storeId: store.id,
            webhookId: webhook.id.toString(),
            topic,
            isActive: true,
          },
        });

        console.log(`Created webhook ${webhook.id} for ${store.shopDomain} - ${topic} → pubsub://${process.env.GOOGLE_CLOUD_PROJECT_ID}:${pubsubTopicName}`);
      } catch (error) {
        console.error(`Failed to create webhook for ${store.shopDomain} - ${topic}:`, error);
        // Continue with other webhooks even if one fails
      }
    }
  }

  /**
   * Remove all webhooks for a contest
   */
  async removeWebhooksForContest(contestId: string): Promise<void> {
    console.log(`Removing webhooks for contest ${contestId}`);
	 return;
    const subscriptions = await prisma.webhookSubscription.findMany({
      where: { contestId },
      include: { store: true },
    });

    for (const subscription of subscriptions) {
      try {
        // Remove webhook from Shopify using GraphQL Admin API
        await deleteWebhook(
          subscription.store.shopDomain,
          subscription.store.accessToken,
          subscription.webhookId
        );
        
        // Mark subscription as inactive
        await prisma.webhookSubscription.update({
          where: { id: subscription.id },
          data: { isActive: false },
        });

        console.log(`Removed webhook ${subscription.webhookId} for ${subscription.store.shopDomain}`);
      } catch (error) {
        console.error(`Failed to remove webhook ${subscription.webhookId}:`, error);
      }
    }
  }

  /**
   * Start subscribing to Pub/Sub topics
   */
  async startSubscribing(): Promise<void> {
    console.log('Starting Pub/Sub subscriptions for webhook processing');
    
    const client = await getPubSubClient();
    if (!client) {
      console.log('Skipping Pub/Sub subscriptions - Google Cloud not configured');
      return;
    }

    return; // Comment this out when ready to enable in production
    
    for (const [webhookTopic, topicName] of Object.entries(PUBSUB_TOPICS)) {
      try {
        const topic = client!.topic(topicName); // Non-null assertion since we checked above
        const subscriptionName = `projects/growtharena/subscriptions/shopify-sub`;
        const [subscription] = await topic.subscription(subscriptionName).get({ autoCreate: true });

        // Set up message handler
        subscription.on('message', (message: any) => {
          this.handlePubSubMessage(message, webhookTopic as WebhookTopic);
        });

        subscription.on('error', (error: Error) => {
          console.error(`Subscription error for ${topicName}:`, error);
        });

        this.subscriptions.set(topicName, subscription);
        console.log(`Subscribed to ${topicName}`);
      } catch (error) {
        console.error(`Failed to subscribe to ${topicName}:`, error);
      }
    }
  }

  /**
   * Stop all Pub/Sub subscriptions
   */
  async stopSubscribing(): Promise<void> {
    console.log('Stopping Pub/Sub subscriptions');

    for (const [topicName, subscription] of this.subscriptions) {
      try {
        await subscription.close();
        console.log(`Closed subscription for ${topicName}`);
      } catch (error) {
        console.error(`Failed to close subscription for ${topicName}:`, error);
      }
    }

    this.subscriptions.clear();
  }

  /**
   * Handle incoming Pub/Sub message
   */
  private async handlePubSubMessage(message: any, eventType: WebhookTopic): Promise<void> {
   return; 
	try {
      // Parse the Shopify webhook data
      const webhookData = JSON.parse(message.data.toString());
      
      // Extract store information from the webhook data or message attributes
      const shopDomain = message.attributes?.shop_domain || webhookData.domain;
      
      if (!shopDomain) {
        console.error('No shop domain found in message');
        message.ack();
        return;
      }

      // Find the store in our database
      const store = await prisma.shopifyStore.findFirst({
        where: { shopDomain },
      });

      if (!store) {
        console.error(`Store not found for domain: ${shopDomain}`);
        message.ack();
        return;
      }

      // Process the webhook (store is guaranteed to be non-null here)
      await this.processOrderWebhook(store!.id, webhookData, eventType);
      
      // Acknowledge the message
      message.ack();
      
    } catch (error) {
      console.error('Failed to process Pub/Sub message:', error);
      // Nack the message to retry later
      message.nack();
    }
  }

  /**
   * Initialize contest balances for all participating stores
   */
  private async initializeContestBalances(contestId: string, storeIds: string[]): Promise<void> {
    for (const storeId of storeIds) {
      await prisma.contestStoreBalance.upsert({
        where: {
          contestId_storeId: {
            contestId,
            storeId,
          },
        },
        update: {}, // Don't update if already exists
        create: {
          contestId,
          storeId,
          totalSales: 0,
          orderCount: 0,
        },
      });
    }
  }

  /**
   * Process an order webhook and update contest balances
   */
  async processOrderWebhook(storeId: string, orderData: any, eventType: string): Promise<void> {
    console.log(`Processing ${eventType} webhook for store ${storeId}, order ${orderData.id}`);

    // Determine the amount and whether it's positive or negative
    let amount = 0;
    let orderCount = 0;

    if (eventType === 'orders/paid' || eventType === 'orders/create') {
      // For orders, amount is positive
      amount = Math.round(parseFloat(orderData.total_price || '0') * 100); // Convert to cents
      orderCount = 1;
    } else if (eventType === 'refunds/create') {
      // For refunds, amount is negative
      amount = -Math.round(parseFloat(orderData.amount || '0') * 100); // Convert to cents
      orderCount = 0; // Don't count refunds as orders
    }

    // Store the order event
    await prisma.orderEvent.create({
      data: {
        storeId,
        orderId: orderData.id.toString(),
        eventType: eventType.replace('/', '_'),
        amount,
        currency: orderData.currency || 'USD',
        orderNumber: orderData.order_number?.toString(),
        webhookData: JSON.stringify(orderData),
      },
    });

    // Find all active contests this store is participating in
    const activeContests = await prisma.contestParticipant.findMany({
      where: {
        storeId,
        contest: {
          status: 'ACTIVE',
        },
      },
      include: {
        contest: true,
      },
    });

    // Update balances for each contest
    for (const participant of activeContests) {
      const contest = participant.contest;
      
      // Only count orders within the contest timeframe
      const orderDate = new Date(orderData.created_at || orderData.updated_at);
      if (orderDate < contest.startAt || orderDate > contest.endAt) {
        continue; // Skip orders outside contest timeframe
      }

      // NEW: Only count orders after the participant joined the contest
      if (orderDate < participant.joinedAt) {
        console.log(`Skipping order from ${orderDate} for contest ${contest.id} - participant joined at ${participant.joinedAt}`);
        continue; // Skip orders from before the participant joined
      }

      // Update contest-store balance
      await prisma.contestStoreBalance.update({
        where: {
          contestId_storeId: {
            contestId: contest.id,
            storeId,
          },
        },
        data: {
          totalSales: {
            increment: amount,
          },
          orderCount: {
            increment: orderCount,
          },
        },
      });

      // Also update the participant's totals for backward compatibility
      await prisma.contestParticipant.update({
        where: {
          contestId_userId: {
            contestId: contest.id,
            userId: participant.userId,
          },
        },
        data: {
          totalSales: {
            increment: amount,
          },
          orderCount: {
            increment: orderCount,
          },
        },
      });

      console.log(`Updated contest ${contest.id} balance for store ${storeId}: ${amount} cents, ${orderCount} orders`);
    }
  }
}

/**
 * Get contest balances for all stores in a contest
 */
export async function getContestBalances(contestId: string) {
  return prisma.contestStoreBalance.findMany({
    where: { contestId },
    include: {
      store: {
        include: {
          user: true,
        },
      },
    },
    orderBy: [
      { totalSales: 'desc' },
      { orderCount: 'desc' },
    ],
  });
}

/**
 * Get detailed order events for a store in a contest
 * Optionally filter by participant's join date if userId is provided
 */
export async function getStoreOrderEvents(storeId: string, contestId?: string, userId?: string) {
  const where: any = { storeId };
  
  if (contestId) {
    // Filter events within contest timeframe
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      select: { startAt: true, endAt: true },
    });
    
    if (contest) {
      where.processedAt = {
        gte: contest.startAt,
        lte: contest.endAt,
      };

      // If userId is provided, only show events after they joined
      if (userId) {
        const participant = await prisma.contestParticipant.findUnique({
          where: {
            contestId_userId: {
              contestId,
              userId,
            },
          },
          select: { joinedAt: true },
        });

        if (participant) {
          // Use the later of contest start or join date
          const effectiveStartDate = new Date(Math.max(
            contest.startAt.getTime(),
            participant.joinedAt.getTime()
          ));
          
          where.processedAt.gte = effectiveStartDate;
        }
      }
    }
  }

  return prisma.orderEvent.findMany({
    where,
    orderBy: { processedAt: 'desc' },
  });
}

/**
 * Recalculate balances for a specific participant based on their join date
 * This is useful for ensuring data integrity after the join date logic change
 */
export async function recalculateParticipantBalances(contestId: string, userId: string): Promise<void> {
  console.log(`Recalculating balances for participant ${userId} in contest ${contestId}`);

  // Get participant data
  const participant = await prisma.contestParticipant.findUnique({
    where: {
      contestId_userId: {
        contestId,
        userId,
      },
    },
    include: {
      contest: true,
      store: true,
    },
  });

  if (!participant) {
    throw new Error('Participant not found');
  }

  // Get all order events for this store within the contest timeframe and after join date
  const orderEvents = await prisma.orderEvent.findMany({
    where: {
      storeId: participant.storeId,
      processedAt: {
        gte: participant.joinedAt, // Only orders after they joined
        lte: participant.contest.endAt, // And before contest ended
      },
    },
  });

  // Calculate totals
  let totalSales = 0;
  let orderCount = 0;

  for (const event of orderEvents) {
    // Only count events within contest timeframe
    if (event.processedAt >= participant.contest.startAt && event.processedAt <= participant.contest.endAt) {
      totalSales += event.amount;
      if (event.eventType === 'orders_paid' || event.eventType === 'orders_create') {
        orderCount += 1;
      }
    }
  }

  // Update participant totals
  await prisma.contestParticipant.update({
    where: {
      contestId_userId: {
        contestId,
        userId,
      },
    },
    data: {
      totalSales,
      orderCount,
    },
  });

  // Update contest store balance
  await prisma.contestStoreBalance.update({
    where: {
      contestId_storeId: {
        contestId: participant.storeId,
        storeId: participant.storeId,
      },
    },
    data: {
      totalSales,
      orderCount,
    },
  });

  console.log(`Recalculated balances for participant ${userId}: ${totalSales} cents, ${orderCount} orders`);
}

/**
 * Recalculate balances for all participants in a contest
 * This ensures all data reflects the "only count sales after join date" logic
 */
export async function recalculateAllContestBalances(contestId: string): Promise<void> {
  console.log(`Recalculating all balances for contest ${contestId}`);

  const participants = await prisma.contestParticipant.findMany({
    where: { contestId },
  });

  for (const participant of participants) {
    await recalculateParticipantBalances(contestId, participant.userId);
  }

  console.log(`Finished recalculating balances for ${participants.length} participants`);
}

// Conditionally export singleton instance - only create if Google Cloud is configured
let webhookManagerInstance: ShopifyWebhookManager | null = null;

export const webhookManager = (() => {
  if (isGoogleCloudConfigured() && !webhookManagerInstance) {
    webhookManagerInstance = new ShopifyWebhookManager();
  }
  return webhookManagerInstance;
})(); 