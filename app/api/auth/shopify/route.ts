import { NextResponse } from "next/server"
import { redirect } from "next/navigation"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop')
    const userId = searchParams.get('userId')
    const experienceId = searchParams.get('experienceId')
    const returnTo = searchParams.get('returnTo')
    const isPopup = searchParams.get('popup') === 'true'

    if (!shop) {
      return NextResponse.json(
        { error: "Shop parameter is required" },
        { status: 400 }
      )
    }

    // Validate shop domain format
    const shopDomain = shop.endsWith('.myshopify.com') ? shop : `${shop}.myshopify.com`

    // Required environment variables
    const apiKey = process.env.SHOPIFY_APP_API_KEY
    const scopes = process.env.SHOPIFY_APP_SCOPES || 'read_orders'
    
    // Ensure proper URL format for redirect URI
    let baseUrl = process.env.VERCEL_URL || 'http://localhost:3000'
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = `http://${baseUrl}`
    }
    const redirectUri = `${baseUrl}/api/auth/shopify/callback`

    if (!apiKey) {
      return NextResponse.json(
        { error: "Shopify app not configured" },
        { status: 500 }
      )
    }

    // Generate a random state parameter for security
    const state = btoa(JSON.stringify({
      userId,
      experienceId,
      returnTo,
      timestamp: Date.now(),
      popup: isPopup
    }))

    // Build Shopify OAuth URL
    const oauthUrl = new URL(`https://${shopDomain}/admin/oauth/authorize`)
    oauthUrl.searchParams.set('client_id', apiKey)
    oauthUrl.searchParams.set('scope', scopes)
    oauthUrl.searchParams.set('redirect_uri', redirectUri)
    oauthUrl.searchParams.set('state', state)

    // Redirect to Shopify OAuth
    return NextResponse.redirect(oauthUrl.toString())

  } catch (error) {
    console.error('Error initiating Shopify OAuth:', error)
    return NextResponse.json(
      { error: "Failed to initiate OAuth" },
      { status: 500 }
    )
  }
} 