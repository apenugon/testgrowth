import Shopify from 'shopify-api-node'
import crypto from 'crypto'
import { createHmac } from 'crypto'

export interface ShopifyConfig {
  apiKey: string
  apiSecret: string
  webhookSecret: string
}

export const shopifyConfig: ShopifyConfig = {
  apiKey: process.env.SHOPIFY_API_KEY || '',
  apiSecret: process.env.SHOPIFY_API_SECRET || '',
  webhookSecret: process.env.SHOPIFY_WEBHOOK_SECRET || '',
}

export function createShopifyClient(shopDomain: string, accessToken: string) {
  return new Shopify({
    shopName: shopDomain,
    accessToken: accessToken,
  })
}

export function generateShopifyOAuthUrl(shopDomain: string, redirectUri: string) {
  const scopes = ['read_orders', 'read_products']
  const state = crypto.randomBytes(16).toString('hex')
  
  const params = new URLSearchParams({
    client_id: shopifyConfig.apiKey,
    scope: scopes.join(','),
    redirect_uri: redirectUri,
    state,
  })

  return {
    url: `https://${shopDomain}/admin/oauth/authorize?${params.toString()}`,
    state,
  }
}

export async function exchangeCodeForToken(
  shopDomain: string,
  code: string,
  redirectUri: string
): Promise<string> {
  const response = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: shopifyConfig.apiKey,
      client_secret: shopifyConfig.apiSecret,
      code,
      redirect_uri: redirectUri,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to exchange code for token')
  }

  const data = await response.json()
  return data.access_token
}

export function verifyShopifyWebhook(body: string, signature: string): boolean {
  if (!process.env.SHOPIFY_WEBHOOK_SECRET) {
    throw new Error('SHOPIFY_WEBHOOK_SECRET is not set')
  }

  const hmac = createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET)
  hmac.update(body, 'utf8')
  const calculatedSignature = hmac.digest('base64')

  return calculatedSignature === signature
}

export function parseShopifyOrder(orderData: Record<string, unknown>) {
  return {
    id: orderData.id as string | number,
    number: orderData.number as string | number,
    email: orderData.email as string,
    total_price: orderData.total_price as string,
    currency: orderData.currency as string,
    financial_status: orderData.financial_status as string,
    fulfillment_status: orderData.fulfillment_status as string | null,
    created_at: orderData.created_at as string,
    updated_at: orderData.updated_at as string,
    customer: orderData.customer as Record<string, unknown> | null,
    line_items: orderData.line_items as Array<Record<string, unknown>>,
  }
}

export async function createWebhook(
  shopDomain: string,
  accessToken: string,
  webhookUrl: string,
  topic: 'orders/paid' | 'orders/create' | 'orders/updated'
) {
  const shopify = createShopifyClient(shopDomain, accessToken)
  
  return shopify.webhook.create({
    topic: topic as 'orders/paid' | 'orders/create' | 'orders/updated',
    address: webhookUrl,
    format: 'json',
  })
}

export async function getOrders(
  shopDomain: string,
  accessToken: string,
  createdAtMin?: Date,
  createdAtMax?: Date
) {
  const shopify = createShopifyClient(shopDomain, accessToken)
  
  const params: {
    status: string;
    financial_status: string;
    created_at_min?: string;
    created_at_max?: string;
  } = {
    status: 'any',
    financial_status: 'paid',
  }
  
  if (createdAtMin) {
    params.created_at_min = createdAtMin.toISOString()
  }
  
  if (createdAtMax) {
    params.created_at_max = createdAtMax.toISOString()
  }
  
  return shopify.order.list(params)
} 