import { NextRequest, NextResponse } from 'next/server'
import { authenticateWithEmail, registerWithEmail } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, username } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { 
        email,
        authProvider: 'email'
      }
    })

    let authResult

    if (existingUser) {
      // User exists, authenticate with password
      authResult = await authenticateWithEmail(email, password)
    } else {
      // User doesn't exist, create new account
      authResult = await registerWithEmail(email, password, name, username)
    }

    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      )
    }

    // Create session token
    const { createSessionToken } = await import('@/lib/auth')
    const sessionToken = createSessionToken({
      userId: authResult.user!.id,
      email: authResult.user!.email,
      authProvider: authResult.user!.authProvider
    })

    // Set session cookie
    const response = NextResponse.json({
      success: true,
      user: authResult.user,
      isNewUser: !existingUser
    })

    response.cookies.set('session-token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })

    return response

  } catch (error) {
    console.error('Sign-in error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 