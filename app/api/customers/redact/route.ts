import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    // Get the HMAC header
    const shopifyHmac = request.headers.get('x-shopify-hmac-sha256')
    
    if (!shopifyHmac) {
      console.error('Missing X-Shopify-Hmac-SHA256 header')
      return NextResponse.json(
        { error: 'Missing HMAC header' },
        { status: 401 }
      )
    }

    // Get the raw body as buffer
    const body = await request.arrayBuffer()
    const bodyBuffer = Buffer.from(body)

    // Get the secret key
    const secret = process.env.SHOPIFY_APP_SECRET
    if (!secret) {
      console.error('SHOPIFY_APP_SECRET not configured')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Calculate HMAC
    const calculatedHmacDigest = crypto
      .createHmac('sha256', secret)
      .update(bodyBuffer)
      .digest('base64')

    // Validate HMAC using timing-safe comparison
    const hmacValid = crypto.timingSafeEqual(
      Buffer.from(calculatedHmacDigest),
      Buffer.from(shopifyHmac)
    )

    if (!hmacValid) {
      console.error('HMAC validation failed for customers/redact')
      return NextResponse.json(
        { error: 'HMAC validation failed' },
        { status: 401 }
      )
    }

    // HMAC is valid, parse and log the JSON
    const bodyString = bodyBuffer.toString('utf8')
    const jsonData = JSON.parse(bodyString)
    
    console.log('=== Shopify Customer Data Redaction ===')
    console.log('Timestamp:', new Date().toISOString())
    console.log('Data:', JSON.stringify(jsonData, null, 2))
    console.log('=======================================')

    return NextResponse.json({ status: 'success' }, { status: 200 })

  } catch (error) {
    console.error('Error processing customer data redaction:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 