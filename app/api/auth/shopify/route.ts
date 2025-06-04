import { NextResponse } from "next/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const shop = searchParams.get('shop')
    const userId = searchParams.get('userId')
    const experienceId = searchParams.get('experienceId')
    const returnTo = searchParams.get('returnTo')
    const isPopup = searchParams.get('popup') === 'true'

    if (!shop || !userId) {
      return NextResponse.json(
        { error: "Shop and userId parameters are required" },
        { status: 400 }
      )
    }

    let isWhopUser = false
    let isTemporaryInstall = false
    
    // Check if this is a temporary install flow (unauthenticated user)
    if (userId === 'temp-install') {
      isTemporaryInstall = true
    } else {
      // Determine if this is a Whop user or external user
      try {
        // Check if the user exists as a Whop user
        const whopUser = await prisma.user.findUnique({
          where: { whopUserId: userId },
          select: { id: true }
        })
        
        if (whopUser) {
          isWhopUser = true
        } else {
          // Check if it's an internal user ID
          const externalUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { whopUserId: true }
          })
          
          if (!externalUser) {
            return NextResponse.json(
              { error: "User not found" },
              { status: 404 }
            )
          }
          
          // If the user has a whopUserId, they're a Whop user
          isWhopUser = !!externalUser.whopUserId
        }
      } catch (error) {
        console.error('Error checking user type:', error)
        return NextResponse.json(
          { error: "Failed to verify user" },
          { status: 500 }
        )
      }
    }

    // Validate shop domain format
    const shopDomain = shop.endsWith('.myshopify.com') ? shop : `${shop}.myshopify.com`

    // Required environment variables
    const apiKey = process.env.SHOPIFY_APP_API_KEY
    const scopes = process.env.SHOPIFY_APP_SCOPES || 'read_orders'
    
    // Ensure proper URL format for redirect URI
    let baseUrl = process.env.APP_URL || 'http://localhost:3000'
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
      popup: isPopup,
      isWhopUser,
      isTemporaryInstall
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