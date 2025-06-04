import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getSessionFromCookies } from "@/lib/auth"
import { verifyUserToken } from "@whop/api"
import { whopApi } from "@/lib/whop-api"
import { Header } from "@/components/layout/header"
import { ShopifyConnectionsClient } from "./shopify-connections-client"

export const dynamic = 'force-dynamic'

export default async function ShopifyConnectionsPage({
  params,
}: {
  params: Promise<{ experienceId: string }>;
}) {
  const { experienceId } = await params

  // Try unified authentication
  let user = null
  let userId = null

  // Try Whop authentication first (for iframe users)
  const headersList = await headers()
  const userToken = headersList.get('x-whop-user-token')
  
  if (userToken) {
    try {
      const { userId: whopUserId } = await verifyUserToken(headersList)
      if (whopUserId) {
        userId = whopUserId

        // Verify user has access to this experience
        const result = await whopApi.checkIfUserHasAccessToExperience({
          userId: whopUserId,
          experienceId,
        })

        if (!result.hasAccessToExperience.hasAccess) {
          redirect(`/experiences/${experienceId}`)
        }

        // Get user info for header
        try {
          const whopUser = await whopApi.getUser({ userId: whopUserId })
          const publicUser = whopUser.publicUser
          if (publicUser) {
            user = {
              name: publicUser.name || undefined,
              username: publicUser.username
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error)
        }
      }
    } catch (error) {
      console.error("Error with Whop authentication:", error)
    }
  }

  // Try session cookie authentication if Whop auth failed
  if (!userId) {
    try {
      const sessionResult = await getSessionFromCookies()
      if (sessionResult) {
        user = sessionResult.user
        userId = sessionResult.userId
        // External users should use the standalone page
        redirect('/connect-shopify')
      }
    } catch (error) {
      console.error("Error with session authentication:", error)
    }
  }

  // If no authentication succeeded, redirect to login
  if (!userId) {
    const loginUrl = new URL('/login', process.env.APP_URL || 'http://localhost:3000')
    loginUrl.searchParams.set('redirect', `/experiences/${experienceId}/shopify-connections`)
    redirect(loginUrl.toString())
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        user={user || undefined} 
        experienceId={experienceId}
        showBackButton={true}
        backHref={`/experiences/${experienceId}`}
        backLabel="Back to Contests"
      />
      
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Shopify Connections</h1>
          <p className="mt-2 text-gray-600">
            Manage your connected Shopify stores for sales contests
          </p>
        </div>

        <ShopifyConnectionsClient 
          userId={userId} 
          experienceId={experienceId} 
        />
      </div>
    </div>
  )
} 