import { redirect } from "next/navigation"
import { getSessionFromCookies } from "@/lib/auth"
import { Header } from "@/components/layout/header"
import { ShopifyConnectionsClient } from "./shopify-connections-client"

export default async function ShopifyConnectionsPage() {
  // Check authentication using unified system
  const sessionResult = await getSessionFromCookies()
  
  if (!sessionResult) {
    // Redirect to login with return URL
    const loginUrl = new URL('/login', process.env.APP_URL || 'http://localhost:3000')
    loginUrl.searchParams.set('redirect', '/shopify-connections')
    redirect(loginUrl.toString())
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        user={{
          name: sessionResult.user.name || undefined,
          username: sessionResult.user.username || sessionResult.user.email.split('@')[0]
        }}
        showBackButton={true}
        backHref="/"
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
          userId={sessionResult.userId}
        />
      </div>
    </div>
  )
} 