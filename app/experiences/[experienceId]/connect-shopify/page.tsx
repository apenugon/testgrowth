import { verifyUserToken } from "@whop/api"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { whopApi } from "@/lib/whop-api"
import { ShopifyConnectionFlow } from "./shopify-connection-flow"

export default async function ConnectShopifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ experienceId: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  // Verify user is authenticated
  const headersList = await headers()
  const { userId } = await verifyUserToken(headersList)
  
  if (!userId) {
    redirect("/")
  }

  // Get experience ID and return URL
  const { experienceId } = await params
  const { returnTo } = await searchParams

  // Verify user has access to this experience
  const result = await whopApi.checkIfUserHasAccessToExperience({
    userId,
    experienceId,
  })

  if (!result.hasAccessToExperience.hasAccess) {
    redirect(`/experiences/${experienceId}`)
  }

  // Get user info
  let user = null
  try {
    const whopUser = await whopApi.getUser({ userId })
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

  // Get the user token from headers to pass to client
  const userToken = headersList.get('x-whop-user-token')

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