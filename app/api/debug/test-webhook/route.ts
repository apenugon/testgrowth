import { NextRequest, NextResponse } from "next/server";
import { verifyUserToken } from "@whop/api";
import { createWebhook } from "@/lib/shopify";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Skip auth in development mode for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('🛠️ Development mode: skipping auth for test webhook endpoint');
    } else {
      // Verify user authentication in production
      const { userId } = await verifyUserToken(request.headers);
      if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json();
    const { storeId, topic = 'orders/create' } = body;

    if (!storeId) {
      return NextResponse.json({ error: "storeId is required" }, { status: 400 });
    }

    // Get the store
    const store = await prisma.shopifyStore.findUnique({
      where: { id: storeId },
      include: { user: true },
    });

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Check environment
    const envCheck = {
      GOOGLE_CLOUD_PROJECT_ID: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    };

    // Map webhook topic to Pub/Sub topic
    const topicMapping = {
      'orders/create': 'shopify-orders-create',
      'refunds/create': 'shopify-refunds-create'
    };

    const pubsubTopic = topicMapping[topic as keyof typeof topicMapping];
    if (!pubsubTopic) {
      return NextResponse.json({ error: "Invalid topic" }, { status: 400 });
    }

    const pubsubAddress = `pubsub://${process.env.GOOGLE_CLOUD_PROJECT_ID}:${pubsubTopic}`;

    console.log(`🧪 Testing webhook creation for store ${store.shopDomain}`);
    console.log(`📍 Pub/Sub address: ${pubsubAddress}`);
    console.log(`🎯 Topic: ${topic}`);

    try {
      // Attempt to create the webhook
      const webhook = await createWebhook(
        store.shopDomain,
        store.accessToken,
        pubsubTopic,
        topic as any
      );

      return NextResponse.json({
        success: true,
        webhook,
        testDetails: {
          storeDomain: store.shopDomain,
          storeUserEmail: store.user.email,
          topic,
          pubsubTopic,
          pubsubAddress,
          environment: envCheck,
          accessTokenLength: store.accessToken?.length || 0,
        }
      });

    } catch (webhookError) {
      console.error(`❌ Webhook creation failed:`, webhookError);
      
      return NextResponse.json({
        success: false,
        error: webhookError instanceof Error ? webhookError.message : String(webhookError),
        testDetails: {
          storeDomain: store.shopDomain,
          storeUserEmail: store.user.email,
          topic,
          pubsubTopic,
          pubsubAddress,
          environment: envCheck,
          accessTokenLength: store.accessToken?.length || 0,
        }
      });
    }

  } catch (error) {
    console.error("Error testing webhook creation:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 