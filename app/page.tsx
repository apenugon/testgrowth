import { Suspense } from "react"
import { redirect } from "next/navigation"
import { ExternalContestList } from "@/components/contest/external-contest-list"
import { Header } from "@/components/layout/header"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/auth"
import { createHmac } from "crypto"

interface PageProps {
  searchParams: { 
    view?: string 
    hmac?: string
    host?: string
    timestamp?: string
    shop?: string
  }
}

// Helper function to verify Shopify HMAC
function verifyShopifyHmac(params: Record<string, string>, hmac: string): boolean {
  if (!process.env.SHOPIFY_APP_SECRET) {
    console.error('SHOPIFY_APP_SECRET not configured')
    return false
  }

  try {
    // Create a copy of params without the hmac
    const { hmac: _, ...queryParams } = params
    
    // Sort parameters and create query string
    const sortedParams = Object.keys(queryParams)
      .sort()
      .map(key => `${key}=${queryParams[key]}`)
      .join('&')
    
    // Calculate expected HMAC
    const calculatedHmac = createHmac('sha256', process.env.SHOPIFY_APP_SECRET)
      .update(sortedParams)
      .digest('hex')
    
    return calculatedHmac === hmac
  } catch (error) {
    console.error('Error verifying HMAC:', error)
    return false
  }
}

// Helper function to decode Shopify host parameter
function decodeShopifyHost(host: string): string | null {
  try {
    const decoded = Buffer.from(host, 'base64').toString('utf-8')
    // Extract shop domain from the decoded host (format: shop.myshopify.com/admin)
    const match = decoded.match(/^([^.]+\.myshopify\.com)/)
    return match ? match[1] : null
  } catch (error) {
    console.error('Error decoding host parameter:', error)
    return null
  }
}

async function getRedirectContest() {
  // Get all public contests
  const contests = await prisma.contest.findMany({
    where: {
      isPublic: true,
    },
    include: {
      participants: true,
    },
    orderBy: {
      startAt: 'asc',
    },
  })

  if (contests.length === 0) return null

  const now = new Date()

  // First, try to find live contests and pick the one ending soonest
  const liveContests = contests.filter((contest: any) => {
    const start = new Date(contest.startAt)
    const end = new Date(contest.endAt)
    return now >= start && now <= end
  })

  if (liveContests.length > 0) {
    // Sort by end time (ascending) - soonest ending first
    liveContests.sort((a: any, b: any) => new Date(a.endAt).getTime() - new Date(b.endAt).getTime())
    return liveContests[0]
  }

  // If no live contests, find upcoming contests and pick the one starting soonest
  const upcomingContests = contests.filter((contest: any) => {
    const start = new Date(contest.startAt)
    return now < start
  })

  if (upcomingContests.length > 0) {
    // Already sorted by startAt ascending, so take the first
    return upcomingContests[0]
  }

  // If no live or upcoming contests, return null (will show list)
  return null
}

export default async function HomePage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  
  // Check if this is a Shopify app installation callback
  const isShopifyInstallCallback = !!(
    resolvedSearchParams.hmac && 
    resolvedSearchParams.host && 
    resolvedSearchParams.timestamp
  )
  
  // Get user session from cookies (for external users)
  const session = await getSessionFromCookies()
  const user = session?.user
  
  // If this is a Shopify app installation callback
  if (isShopifyInstallCallback) {
    console.log('Shopify app installation callback detected')
    
    // Verify HMAC to ensure request is legitimate
    const hmacValid = verifyShopifyHmac(
      resolvedSearchParams as Record<string, string>, 
      resolvedSearchParams.hmac!
    )
    
    if (!hmacValid) {
      console.error('Invalid HMAC in Shopify callback')
      // Redirect to error page or continue with normal flow
      return redirect('/?error=invalid_shopify_callback')
    }
    
    // Extract shop domain from host parameter
    let shopDomain: string | null = null
    
    if (resolvedSearchParams.host) {
      shopDomain = decodeShopifyHost(resolvedSearchParams.host)
    }
    
    // Fallback to shop parameter if host decoding fails
    if (!shopDomain && resolvedSearchParams.shop) {
      shopDomain = resolvedSearchParams.shop.endsWith('.myshopify.com') 
        ? resolvedSearchParams.shop 
        : `${resolvedSearchParams.shop}.myshopify.com`
    }
    
    console.log('Extracted shop domain:', shopDomain)
    
    if (user && shopDomain) {
      // User is logged in and we have shop domain, redirect to auto-connect flow
      const connectUrl = new URL('/connect-shopify', process.env.APP_URL || 'http://localhost:3000')
      connectUrl.searchParams.set('shop', shopDomain.replace('.myshopify.com', ''))
      connectUrl.searchParams.set('auto', 'true')
      redirect(connectUrl.toString())
    } else if (user && !shopDomain) {
      // User is logged in but no shop domain, redirect to manual connection
      redirect('/shopify-connections')
    } else if (!user && shopDomain) {
      // User is not logged in, redirect to register with shop info
      const registerUrl = new URL('/register', process.env.APP_URL || 'http://localhost:3000')
      registerUrl.searchParams.set('shopify', 'install')
      registerUrl.searchParams.set('shop', shopDomain.replace('.myshopify.com', ''))
      redirect(registerUrl.toString())
    } else {
      // User is not logged in and no shop domain, redirect to register
      const registerUrl = new URL('/register', process.env.APP_URL || 'http://localhost:3000')
      registerUrl.searchParams.set('shopify', 'install')
      redirect(registerUrl.toString())
    }
  }
  
  // If ?view=list is present, always show the list
  if (resolvedSearchParams.view === 'list') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header user={user} />
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          }>
            <ExternalContestList />
          </Suspense>
        </div>
      </div>
    )
  }

  // Otherwise, try to redirect to the most relevant contest
  const redirectContest = await getRedirectContest()
  
  if (redirectContest) {
    redirect(`/c/${redirectContest.slug}`)
  }

  // If no contests to redirect to, show the list
  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        }>
          <ExternalContestList />
        </Suspense>
      </div>
    </div>
  )
}
