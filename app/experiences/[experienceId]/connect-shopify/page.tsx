import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getSessionFromCookies } from "@/lib/auth"
import { verifyUserToken } from "@whop/api"
import { whopApi } from "@/lib/whop-api"
import { ShopifyConnectionFlow } from "./shopify-connection-flow"

export default async function ConnectShopifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ experienceId: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { experienceId } = await params
  const { returnTo } = await searchParams

  // Try unified authentication first
  let user = null
  let userId = null
  let userToken = null

  // Try Whop authentication first (for iframe users)
  const headersList = await headers()
  userToken = headersList.get('x-whop-user-token')
  
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

        // Get user info
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
        // For external users accessing experience pages, we should redirect them
        // to the standalone connect page instead
        const redirectUrl = `/connect-shopify${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`
        redirect(redirectUrl)
      }
    } catch (error) {
      console.error("Error with session authentication:", error)
    }
  }

  // If no authentication succeeded, redirect to login
  if (!userId) {
    const loginUrl = new URL('/login', process.env.APP_URL || 'http://localhost:3000')
    loginUrl.searchParams.set('redirect', `/experiences/${experienceId}/connect-shopify${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`)
    redirect(loginUrl.toString())
  }

  return (
    <ShopifyConnectionFlow
      userId={userId}
      user={user || undefined}
      experienceId={experienceId}
      returnTo={returnTo}
      userToken={userToken}
    />
  )
} 