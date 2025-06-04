import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getSessionFromCookies } from "@/lib/auth"
import { ShopifyConnectionFlow } from "./shopify-connection-flow"

export default async function ConnectShopifyPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  // Check authentication using unified system
  const sessionResult = await getSessionFromCookies()
  
  if (!sessionResult) {
    // Redirect to login with return URL
    const { returnTo } = await searchParams
    const loginUrl = new URL('/login', process.env.APP_URL || 'http://localhost:3000')
    loginUrl.searchParams.set('redirect', `/connect-shopify${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ''}`)
    redirect(loginUrl.toString())
  }

  // Get return URL
  const { returnTo } = await searchParams

  return (
    <ShopifyConnectionFlow
      userId={sessionResult.userId}
      user={sessionResult.user}
      returnTo={returnTo}
    />
  )
} 