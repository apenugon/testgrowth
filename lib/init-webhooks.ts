import { webhookManager } from './webhook-manager';

/**
 * Initialize the webhook system - called when server starts
 * This sets up Pub/Sub subscriptions to listen for webhook messages
 */
export async function initWebhooks(): Promise<void> {
  console.log('🚀 Starting webhook system...');
  
  try {
    // Start Pub/Sub subscriptions (this should always be running)
    await webhookManager.startSubscribing();
    console.log('✅ Webhook system initialized and listening for messages');
  } catch (error) {
    console.error('❌ Failed to initialize webhook system:', error);
    throw error;
  }
} 