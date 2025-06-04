import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromCookies } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const sessionResult = await getSessionFromCookies()
    
    if (!sessionResult) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { tempUserId } = await request.json()
    
    if (!tempUserId) {
      return NextResponse.json({ error: 'Temporary user ID required' }, { status: 400 })
    }

    // Find the temporary user record
    const tempUser = await prisma.user.findUnique({
      where: { id: tempUserId },
      include: {
        shopifyStores: true
      }
    })

    if (!tempUser) {
      return NextResponse.json({ error: 'Temporary user not found' }, { status: 404 })
    }

    // Transfer all Shopify stores from temp user to authenticated user
    await prisma.shopifyStore.updateMany({
      where: { userId: tempUserId },
      data: { userId: sessionResult.userId }
    })

    // Delete the temporary user record
    await prisma.user.delete({
      where: { id: tempUserId }
    })

    return NextResponse.json({ 
      success: true,
      linkedStores: tempUser.shopifyStores.length
    })

  } catch (error) {
    console.error('Error linking store:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 