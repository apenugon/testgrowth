import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/auth"

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

    const { userId, experienceId, returnTo, isWhopUser, isTemporaryInstall } = stateData

    // Required environment variables
    const apiKey = process.env.SHOPIFY_APP_API_KEY
    const apiSecret = process.env.SHOPIFY_APP_SECRET

    console.log('Environment check:', { 
      hasApiKey: !!apiKey, 
      hasApiSecret: !!apiSecret,
      shop,
      userId,
      isWhopUser,
      isTemporaryInstall
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

    // Check if user is currently authenticated (different from the state userId)
    let currentUser = null
    let createTempUser = false
    
    if (isTemporaryInstall) {
      // For temporary install flow, always create a temp user
      console.log('Temporary install flow detected, will create temporary user')
      createTempUser = true
    } else {
      try {
        const sessionResult = await getSessionFromCookies()
        if (sessionResult) {
          currentUser = sessionResult
          console.log('Current authenticated user found:', currentUser.userId)
        } else {
          console.log('No current authenticated user, will create temporary user')
          createTempUser = true
        }
      } catch (error) {
        console.log('No session found, will create temporary user')
        createTempUser = true
      }
    }

    let user;
    let tempUserId = null;
    
    if (createTempUser) {
      // Create a temporary user for the OAuth flow
      console.log('Creating temporary user for store connection...')
      user = await prisma.user.create({
        data: {
          email: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@temp.user`,
          username: `temp-user-${Date.now()}`,
          name: `Temporary User`,
        }
      })
      tempUserId = user.id
      console.log('Temporary user created:', user.id)
    } else if (currentUser) {
      // Use the current authenticated user
      user = await prisma.user.findUnique({
        where: { id: currentUser.userId }
      })
      
      if (!user) {
        throw new Error('Authenticated user not found in database')
      }
      
      console.log('Using current authenticated user:', user.id, 'email:', user.email)
    } else {
      // Fallback: try to find/create user based on state
      if (isWhopUser) {
        // Handle Whop user
        let whopUsername = userId; // fallback
        let whopName = null;
        try {
          const { whopApi } = await import('@/lib/whop-api');
          const whopUser = await whopApi.getUser({ userId });
          if (whopUser.publicUser) {
            whopUsername = whopUser.publicUser.username;
            whopName = whopUser.publicUser.name;
          }
        } catch (error) {
          console.error('Failed to fetch Whop user info:', error);
        }
        
        user = await prisma.user.findUnique({
          where: { whopUserId: userId }
        })

        if (!user) {
          console.log('Whop user not found, creating new user...')
          user = await prisma.user.create({
            data: {
              whopUserId: userId,
              email: `${userId}@whop.user`,
              username: whopUsername,
              name: whopName,
            }
          })
          console.log('New Whop user created:', user.id)
        } else {
          console.log('Existing Whop user found:', user.id)
        }
      } else {
        // Handle external user from state
        user = await prisma.user.findUnique({
          where: { id: userId }
        })

        if (!user) {
          console.error('External user not found:', userId)
          throw new Error('User not found. Please ensure you are logged in.')
        }
        
        console.log('External user found:', user.id, 'email:', user.email)
      }
    }

    if (!user) {
      throw new Error('Failed to find or create user for store connection')
    }

    console.log('Final user for store connection:', { 
      id: user.id, 
      email: user.email, 
      whopUserId: user.whopUserId,
      shop: shop
    })

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
      const updatedStore = await prisma.shopifyStore.update({
        where: { id: existingStore.id },
        data: {
          accessToken: accessToken,
          isActive: true,
          updatedAt: new Date(),
        }
      })
      console.log('Store updated successfully:', { 
        storeId: updatedStore.id, 
        shopDomain: updatedStore.shopDomain,
        userId: updatedStore.userId
      })
    } else {
      console.log('Creating new store record...')
      // Create new store record
      const newStore = await prisma.shopifyStore.create({
        data: {
          userId: user.id,
          shopDomain: shop,
          accessToken: accessToken,
          isActive: true,
        }
      })
      console.log('New store created successfully:', { 
        storeId: newStore.id, 
        shopDomain: newStore.shopDomain,
        userId: newStore.userId
      })
    }

    console.log('Store operation completed successfully')

    // Determine redirect URL based on authentication status
    let redirectUrl: string;
    
    if (tempUserId) {
      if (isTemporaryInstall) {
        // For temporary install flow, redirect to signin with store info
        const authUrl = new URL('/signin', getBaseUrl())
        authUrl.searchParams.set('store', shop)
        authUrl.searchParams.set('tempUserId', tempUserId)
        if (returnTo) {
          authUrl.searchParams.set('returnTo', returnTo)
        }
        redirectUrl = authUrl.toString()
        console.log('Redirecting temporary install user to signin page:', redirectUrl)
      } else {
        // Redirect to account linking page for other temporary users
        const linkUrl = new URL('/link-account', getBaseUrl())
        linkUrl.searchParams.set('store', shop)
        linkUrl.searchParams.set('tempUserId', tempUserId)
        if (returnTo) {
          linkUrl.searchParams.set('returnTo', returnTo)
        }
        redirectUrl = linkUrl.toString()
        console.log('Redirecting temporary user to account linking:', redirectUrl)
      }
    } else {
      // Normal redirect for authenticated users
      const redirectPath = experienceId 
        ? (returnTo || `/experiences/${experienceId}`)
        : (returnTo || '/')
      
      redirectUrl = new URL(redirectPath, getBaseUrl()).toString()
      console.log('Redirecting authenticated user:', redirectUrl)
    }
    
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