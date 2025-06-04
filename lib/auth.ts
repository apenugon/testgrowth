import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const SALT_ROUNDS = 12

// Types
export interface SessionData {
  userId: string
  email: string
  authProvider: string
}

export interface AuthResult {
  success: boolean
  user?: {
    id: string
    email: string
    name?: string
    username?: string
    authProvider: string
  }
  error?: string
}

// Password utilities
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// JWT utilities
export function createSessionToken(sessionData: SessionData): string {
  return jwt.sign(sessionData, JWT_SECRET, { expiresIn: '7d' })
}

export function verifySessionToken(token: string): SessionData | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionData
  } catch {
    return null
  }
}

// Authentication functions
export async function authenticateWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { 
        email,
        authProvider: 'email'
      }
    })

    if (!user || !user.password) {
      return { success: false, error: 'Invalid email or password' }
    }

    const isValidPassword = await verifyPassword(password, user.password)
    if (!isValidPassword) {
      return { success: false, error: 'Invalid email or password' }
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        username: user.username || undefined,
        authProvider: user.authProvider
      }
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return { success: false, error: 'Authentication failed' }
  }
}

export async function registerWithEmail(
  email: string, 
  password: string, 
  name?: string,
  username?: string
): Promise<AuthResult> {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return { success: false, error: 'User already exists with this email' }
    }

    // Check if username is taken (if provided)
    if (username) {
      const existingUsername = await prisma.user.findFirst({
        where: { username }
      })

      if (existingUsername) {
        return { success: false, error: 'Username is already taken' }
      }
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Generate username if not provided
    const finalUsername = username || email.split('@')[0]

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        username: finalUsername,
        authProvider: 'email',
        emailVerified: false // TODO: Implement email verification
      }
    })

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        username: user.username || undefined,
        authProvider: user.authProvider
      }
    }
  } catch (error) {
    console.error('Registration error:', error)
    return { success: false, error: 'Registration failed' }
  }
}

// Session management
export async function getSessionFromRequest(request: NextRequest): Promise<SessionData | null> {
  // Try to get token from Authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    return verifySessionToken(token)
  }

  // Try to get token from cookie
  const sessionCookie = request.cookies.get('session-token')
  if (sessionCookie) {
    return verifySessionToken(sessionCookie.value)
  }

  return null
}

export async function getUserFromSession(sessionData: SessionData) {
  return prisma.user.findUnique({
    where: { 
      id: sessionData.userId,
      authProvider: sessionData.authProvider
    },
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      authProvider: true,
      emailVerified: true
    }
  })
}

// Server-side session utilities
export async function getSessionFromCookies(): Promise<{ user: any, userId: string } | null> {
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session-token')
    
    if (!sessionCookie) {
      return null
    }

    const sessionData = verifySessionToken(sessionCookie.value)
    if (!sessionData) {
      return null
    }

    const user = await getUserFromSession(sessionData)
    if (!user) {
      return null
    }

    return {
      user: {
        name: user.name || undefined,
        username: user.username || undefined,
        email: user.email
      },
      userId: user.id
    }
  } catch (error) {
    console.error('Error getting session from cookies:', error)
    return null
  }
}

// Unified authentication for API endpoints
export async function authenticateRequest(request: NextRequest): Promise<{
  success: boolean
  userId?: string
  whopUserId?: string
  authProvider?: string
  error?: string
}> {
  try {
    // First, try Whop token authentication (for iframe users)
    const whopToken = request.headers.get('x-whop-user-token')
    if (whopToken) {
      try {
        const { verifyUserToken } = await import('@whop/api')
        const result = await verifyUserToken(request.headers)
        
        if (result.userId) {
          // Find or create internal user record
          const user = await prisma.user.findUnique({
            where: { whopUserId: result.userId }
          })
          
          if (user) {
            return {
              success: true,
              userId: user.id,
              whopUserId: result.userId,
              authProvider: 'whop'
            }
          } else {
            // User exists in Whop but not in our database
            return {
              success: false,
              error: 'User not found in database'
            }
          }
        }
      } catch (error) {
        console.log('Whop token verification failed:', error)
        // Continue to try session cookie
      }
    }

    // Try session cookie authentication (for external users)
    const sessionCookie = request.cookies.get('session-token')
    if (sessionCookie) {
      const sessionData = verifySessionToken(sessionCookie.value)
      if (sessionData) {
        const user = await getUserFromSession(sessionData)
        if (user) {
          return {
            success: true,
            userId: user.id,
            authProvider: user.authProvider
          }
        }
      }
    }

    return {
      success: false,
      error: 'Authentication required'
    }
  } catch (error) {
    console.error('Authentication error:', error)
    return {
      success: false,
      error: 'Authentication failed'
    }
  }
} 