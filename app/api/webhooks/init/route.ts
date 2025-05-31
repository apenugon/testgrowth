import { NextRequest, NextResponse } from "next/server";
import { verifyUserToken } from "@whop/api";

export async function GET(request: NextRequest) {
  try {
    // Verify user authentication
    const { userId } = await verifyUserToken(request.headers);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check environment variables
    const envCheck = {
      GOOGLE_CLOUD_PROJECT_ID: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
      GOOGLE_APPLICATION_CREDENTIALS: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
      SHOPIFY_APP_API_KEY: !!process.env.SHOPIFY_APP_API_KEY,
      SHOPIFY_APP_SECRET: !!process.env.SHOPIFY_APP_SECRET,
    };

    // Additional file path validation
    let credentialsValid = false;
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        const fs = require('fs');
        credentialsValid = fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      } catch (error) {
        credentialsValid = false;
      }
    }

    return NextResponse.json({
      status: "Webhook system running",
      environment: envCheck,
      credentialsFileExists: credentialsValid,
      architecture: "✅ Auto-started: Shopify → Google Pub/Sub → Your App",
      implementation: "Pub/Sub subscriptions auto-start when app boots",
      lifecycle: {
        appStart: "Pub/Sub subscriptions start automatically",
        contestStart: "Shopify webhooks registered for contest stores", 
        contestEnd: "Shopify webhooks removed for contest stores",
        appAlwaysListening: "System processes incoming webhook messages"
      },
      setup: {
        step1: "Download service account JSON from Google Cloud Console",
        step2: "Set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json",
        step3: "Set GOOGLE_CLOUD_PROJECT_ID=your-project-id",
        step4: "Start app - webhook system auto-initializes"
      },
      documentation: "https://shopify.dev/docs/apps/build/webhooks/subscribe/subscribe-using-api"
    });

  } catch (error) {
    console.error("Error checking webhook system status:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 