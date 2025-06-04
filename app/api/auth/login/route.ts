import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authenticateWithEmail, createSessionToken } from "@/lib/auth"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = loginSchema.parse(body)

    // Authenticate user
    const result = await authenticateWithEmail(email, password)
    
    if (!result.success || !result.user) {
      return NextResponse.json(
        { error: result.error || 'Authentication failed' },
        { status: 401 }
      )
    }

    // Create session token
    const sessionToken = createSessionToken({
      userId: result.user.id,
      email: result.user.email,
      authProvider: result.user.authProvider
    })

    // Create response with user data
    const response = NextResponse.json({
      user: result.user,
      token: sessionToken
    })

    // Set session cookie (httpOnly for security)
    response.cookies.set('session-token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    })

    return response
  } catch (error) {
    console.error('Login error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 