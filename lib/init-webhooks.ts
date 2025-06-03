import { webhookManager } from './webhook-manager';

/**
 * Initialize the webhook system - called when server starts
 * This sets up Pub/Sub subscriptions to listen for webhook messages
 */
export async function initWebhooks(): Promise<void> {
  try {
    console.log('🔌 Initializing webhook system...');
    
    if (!webhookManager) {
      console.log('📝 Webhook manager not available (Google Cloud not configured) - skipping initialization');
      return;
    }

    // Start subscribing to Pub/Sub topics
    await webhookManager.startSubscribing();
    
    console.log('✅ Webhook system initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize webhook system:', error);
  }
} 