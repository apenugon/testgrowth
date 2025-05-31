import { ContestCreationWizard } from "@/components/contest/contest-creation-wizard"
import { verifyUserToken } from "@whop/api"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export default async function CreateContestPage() {
  // Verify user is authenticated
  const headersList = await headers()
  const { userId } = await verifyUserToken(headersList)
  
  if (!userId) {
    redirect("/")
  }

  // Get the user token from headers to pass to client
  const userToken = headersList.get('x-whop-user-token')

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Create Your Sales Contest
          </h1>
          <p className="text-lg text-gray-600">
            Set up a competitive challenge for Shopify store owners
          </p>
        </div>
        
        <ContestCreationWizard userToken={userToken} />
        
        {/* Note: This page doesn't have experienceId, so redirects will use fallback */}
      </div>
    </div>
  )
} 