export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // This runs when the Node.js server starts
    const { initWebhooks } = await import('./lib/init-webhooks');
    
    console.log('🚀 Server starting - initializing webhook system...');
    try {
      await initWebhooks();
      console.log('✅ Webhook system initialized on server startup');
    } catch (error) {
      console.error('❌ Failed to initialize webhook system on startup:', error);
    }
  }
} 