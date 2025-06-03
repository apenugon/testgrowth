import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Helper function to ensure proper URL format
function getBaseUrl(): string {
  let baseUrl = process.env.APP_URL || 'http://localhost:3000'
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `http://${baseUrl}`
  }
  return baseUrl
}

export async function GET(request: Request) {
  try {
    console.log('=== Shopify OAuth Callback Started ===')
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const shop = searchParams.get('shop')
    const state = searchParams.get('state')

    console.log('Callback params:', { code: !!code, shop, state: !!state })

    if (!code || !shop || !state) {
      console.error('Missing OAuth parameters:', { code: !!code, shop: !!shop, state: !!state })
      return NextResponse.json(
        { error: "Missing required OAuth parameters" },
        { status: 400 }
      )
    }

    // Decode and validate state parameter
    let stateData
    try {
      stateData = JSON.parse(atob(state))
      console.log('Decoded state:', { ...stateData, timestamp: !!stateData.timestamp })
    } catch (error) {
      console.error('Failed to decode state:', error)
      return NextResponse.json(
        { error: "Invalid state parameter" },
        { status: 400 }
      )
    }

    const { userId: whopUserId, experienceId, returnTo } = stateData

    // Required environment variables
    const apiKey = process.env.SHOPIFY_APP_API_KEY
    const apiSecret = process.env.SHOPIFY_APP_SECRET

    console.log('Environment check:', { 
      hasApiKey: !!apiKey, 
      hasApiSecret: !!apiSecret,
      shop 
    })

    if (!apiKey || !apiSecret) {
      console.error('Missing Shopify app credentials')
      return NextResponse.json(
        { error: "Shopify app not configured" },
        { status: 500 }
      )
    }

    // Exchange authorization code for access token
    console.log('Exchanging authorization code for access token...')
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: apiKey,
        client_secret: apiSecret,
        code: code,
      }),
    })

    console.log('Token response status:', tokenResponse.status)

    if (!tokenResponse.ok) {
      console.error('Token exchange failed:', tokenResponse.status, tokenResponse.statusText)
      throw new Error('Failed to exchange code for access token')
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token
    console.log('Access token received:', !!accessToken)

    // Get shop info to store shop name
    const shopInfoResponse = await fetch(`https://${shop}/admin/api/2023-10/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
      },
    })

    let shopName = shop
    if (shopInfoResponse.ok) {
      const shopInfo = await shopInfoResponse.json()
      shopName = shopInfo.shop?.name || shop
    }

    // Find or create the user record
    console.log('Finding/creating user record for:', whopUserId)
    
    // Get user info from Whop API to get real username
    let whopUsername = whopUserId; // fallback
    let whopName = null;
    try {
      const { whopApi } = await import('@/lib/whop-api');
      const whopUser = await whopApi.getUser({ userId: whopUserId });
      if (whopUser.publicUser) {
        whopUsername = whopUser.publicUser.username;
        whopName = whopUser.publicUser.name;
      }
    } catch (error) {
      console.error('Failed to fetch Whop user info:', error);
    }
    
    let user = await prisma.user.findUnique({
      where: { whopUserId: whopUserId }
    })

    if (!user) {
      console.log('User not found, creating new user...')
      user = await prisma.user.create({
        data: {
          whopUserId: whopUserId,
          email: `${whopUserId}@whop.user`,
          username: whopUsername,
          name: whopName,
        }
      })
      console.log('New user created:', user.id)
    } else {
      console.log('Existing user found:', user.id)
      
      // Update username if it's different (sync with Whop)
      if (user.username !== whopUsername || user.name !== whopName) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            username: whopUsername,
            name: whopName,
          }
        })
        console.log('User updated with latest Whop info')
      }
    }

    // Check if store is already connected by ANY user (prevent duplicate connections)
    console.log('Checking if store is already connected by any user...')
    const storeConnectedByAnyUser = await prisma.shopifyStore.findFirst({
      where: {
        shopDomain: shop
      },
      include: {
        user: {
          select: {
            whopUserId: true
          }
        }
      }
    })

    if (storeConnectedByAnyUser && storeConnectedByAnyUser.userId !== user.id) {
      console.log('Store already connected by another user:', storeConnectedByAnyUser.userId)
      throw new Error(`This Shopify store (${shop}) is already connected to another account. Each store can only be connected to one Growth Arena account.`)
    }

    // Check if store already exists for current user
    console.log('Checking for existing store for current user...')
    const existingStore = await prisma.shopifyStore.findFirst({
      where: {
        userId: user.id,
        shopDomain: shop
      }
    })

    if (existingStore) {
      console.log('Updating existing store:', existingStore.id)
      // Update existing store with new access token
      await prisma.shopifyStore.update({
        where: { id: existingStore.id },
        data: {
          accessToken: accessToken,
          isActive: true,
          updatedAt: new Date(),
        }
      })
      console.log('Store updated successfully')
    } else {
      console.log('Creating new store record...')
      // Create new store record
      await prisma.shopifyStore.create({
        data: {
          userId: user.id,
          shopDomain: shop,
          accessToken: accessToken,
          isActive: true,
        }
      })
      console.log('New store created successfully')
    }

    console.log('Store operation completed successfully')

    // Redirect back to the app
    const redirectPath = experienceId 
      ? (returnTo || `/experiences/${experienceId}`)
      : (returnTo || '/')
    
    // Convert to absolute URL
    const redirectUrl = new URL(redirectPath, getBaseUrl()).toString()
    
    console.log('Completing OAuth flow:', { redirectUrl })
    
    // Always return HTML that checks if it's in a popup or should redirect normally
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Connection Successful</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #f0fdf4;
              color: #166534;
            }
            .success {
              text-align: center;
              padding: 2rem;
            }
            .checkmark {
              font-size: 3rem;
              margin-bottom: 1rem;
            }
          </style>
        </head>
        <body>
          <div class="success">
            <div class="checkmark">✅</div>
            <h2>Store Connected Successfully!</h2>
            <p id="status">Processing...</p>
          </div>
          <script>
            console.log('Popup callback: checking if in popup window');
            
            if (window.opener && !window.opener.closed) {
              // We're in a popup - send message to parent and close
              console.log('In popup mode - sending success message to parent');
              document.getElementById('status').textContent = 'Closing window...';
              
              window.opener.postMessage({
                type: 'SHOPIFY_OAUTH_SUCCESS',
                redirectUrl: '${redirectUrl}'
              }, '${getBaseUrl()}');
              
              setTimeout(() => {
                console.log('Closing popup window');
                window.close();
              }, 1500);
            } else {
              // Not in popup - redirect normally
              console.log('Not in popup mode - redirecting to:', '${redirectUrl}');
              document.getElementById('status').textContent = 'Redirecting...';
              window.location.href = '${redirectUrl}';
            }
          </script>
        </body>
      </html>
    `
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    })

  } catch (error) {
    console.error('=== Shopify OAuth Callback Error ===')
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error: error
    })
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to connect Shopify store'
    
    // Always return HTML that checks if it's in a popup or should redirect to error page
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Connection Failed</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: #fef2f2;
              color: #dc2626;
              padding: 1rem;
            }
            .error {
              text-align: center;
              padding: 2rem;
              max-width: 500px;
            }
            .error-icon {
              font-size: 3rem;
              margin-bottom: 1rem;
            }
            .error-message {
              margin: 1rem 0;
              padding: 1rem;
              background: #fee2e2;
              border: 1px solid #fecaca;
              border-radius: 8px;
              font-size: 14px;
              line-height: 1.5;
            }
          </style>
        </head>
        <body>
          <div class="error">
            <div class="error-icon">❌</div>
            <h2>Connection Failed</h2>
            <div class="error-message">${errorMessage}</div>
            <p id="status">Processing...</p>
          </div>
          <script>
            console.log('Error callback: checking if in popup window');
            
            if (window.opener && !window.opener.closed) {
              // We're in a popup - send error message to parent and close
              console.log('In popup mode - sending error message to parent');
              document.getElementById('status').textContent = 'Closing window...';
              
              window.opener.postMessage({
                type: 'SHOPIFY_OAUTH_ERROR',
                error: '${errorMessage.replace(/'/g, "\\'")}'
              }, '${getBaseUrl()}');
              
              setTimeout(() => {
                console.log('Closing popup window');
                window.close();
              }, 3000);
            } else {
              // Not in popup - redirect to error page
              console.log('Not in popup mode - redirecting to error page');
              document.getElementById('status').textContent = 'Redirecting...';
              const errorUrl = new URL('/error', '${getBaseUrl()}');
              errorUrl.searchParams.set('message', '${errorMessage}');
              window.location.href = errorUrl.toString();
            }
          </script>
        </body>
      </html>
    `
    
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    })
  }
} 