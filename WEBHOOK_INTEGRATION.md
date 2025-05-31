# Webhook Integration Documentation

## ✅ Corrected Architecture

The webhook system follows this architecture:

```
Shopify → Google Pub/Sub → Your App
```

**Key Points:**
- Shopify publishes webhooks **directly** to Google Pub/Sub topics using `pubsub://` URLs
- Uses **GraphQL Admin API** (not REST API) for webhook management  
- **No HMAC verification needed** for Pub/Sub (handled by Google Cloud)
- App subscribes to Pub/Sub topics to receive webhook messages

## Implementation Details

### 1. Server-Side Initialization

The webhook system automatically starts when the Next.js server boots via `instrumentation.ts`:

```typescript
// instrumentation.ts - Next.js calls this when server starts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initWebhooks } = await import('./lib/init-webhooks');
    await initWebhooks(); // Start Pub/Sub subscriptions
  }
}
```

### 2. Webhook Topics Configuration

```typescript
const PUBSUB_TOPICS = {
  'orders/paid': 'shopify-orders-paid',
  'orders/create': 'shopify-orders-create', 
  'refunds/create': 'shopify-refunds-create',
} as const;
```

### 3. Shopify GraphQL Webhook Setup

The system uses Shopify's GraphQL Admin API with this address format:
```
pubsub://{project-id}:{topic-id}
```

Example webhook creation:
```typescript
const mutation = `
  mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
    webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
      webhookSubscription {
        id
        callbackUrl
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const variables = {
  topic: "ORDERS_PAID", // GraphQL enum format
  webhookSubscription: {
    callbackUrl: "pubsub://growtharena:shopify-orders-paid",
    format: "JSON"
  }
};
```

### 4. Database Models

- **ContestStoreBalance**: Tracks running sales totals per store per contest
- **WebhookSubscription**: Manages Shopify webhook subscriptions 
- **OrderEvent**: Logs all webhook events for debugging/audit trail

### 5. Business Logic

**Order Processing:**
- `orders/paid` + `orders/create` → **Positive balance**
- `refunds/create` → **Negative balance** (subtracts from totals)

**Contest Lifecycle:**
- Contest starts → Webhooks created for participating stores
- Contest ends → Webhooks removed, balances finalized

## Environment Variables Required

```bash
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=growtharena
GOOGLE_APPLICATION_CREDENTIALS=/path/to/your/service-account-key.json

# Shopify App Configuration  
SHOPIFY_APP_API_KEY=your_shopify_app_key
SHOPIFY_APP_SECRET=your_shopify_app_secret
```

## Setup Instructions

### 1. Google Cloud Setup

1. **Create a Google Cloud Project** (if you don't have one)
   ```bash
   gcloud projects create growtharena
   ```

2. **Enable the Pub/Sub API**
   ```bash
   gcloud services enable pubsub.googleapis.com --project=growtharena
   ```

3. **Create a Service Account**
   ```bash
   gcloud iam service-accounts create shopify-webhooks \
     --description="Service account for Shopify webhook integration" \
     --display-name="Shopify Webhooks"
   ```

4. **Grant Pub/Sub Permissions**
   ```bash
   gcloud projects add-iam-policy-binding growtharena \
     --member="serviceAccount:shopify-webhooks@growtharena.iam.gserviceaccount.com" \
     --role="roles/pubsub.admin"
   ```

5. **Download Service Account Key**
   ```bash
   gcloud iam service-accounts keys create ~/growtharena-service-account.json \
     --iam-account=shopify-webhooks@growtharena.iam.gserviceaccount.com
   ```

### 2. Environment Configuration

Create a `.env.local` file in your project root:

```bash
# .env.local
GOOGLE_CLOUD_PROJECT_ID=growtharena
GOOGLE_APPLICATION_CREDENTIALS=/Users/yourusername/growtharena-service-account.json
SHOPIFY_APP_API_KEY=your_existing_shopify_key
SHOPIFY_APP_SECRET=your_existing_shopify_secret
```

⚠️ **Important:** Add `.env.local` and `*.json` to your `.gitignore` to avoid committing credentials!

### 3. Verify Setup

Check that everything is configured correctly:
```bash
curl -X GET http://localhost:3000/api/webhooks/init
```

Should return:
```json
{
  "environment": {
    "GOOGLE_CLOUD_PROJECT_ID": true,
    "GOOGLE_APPLICATION_CREDENTIALS": true,
    "SHOPIFY_APP_API_KEY": true,
    "SHOPIFY_APP_SECRET": true
  },
  "credentialsFileExists": true
}
```

## API Endpoints

- `POST /api/webhooks/init` - Start/stop webhook system
- `GET /api/webhooks/init` - Check system status
- `POST /api/contests/{id}/status` - Start/stop contest (triggers webhooks)
- `GET /api/contests/{id}/balances` - Get real-time contest standings

## Reference

Based on [Shopify's official documentation](https://shopify.dev/docs/apps/build/webhooks/subscribe/subscribe-using-api) for webhook subscriptions using GraphQL Admin API with Google Pub/Sub. 