import { ContestCreationWizard } from "@/components/contest/contest-creation-wizard"
import { Header } from "@/components/layout/header"
import { verifyUserToken } from "@whop/api"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { whopApi } from "@/lib/whop-api"

export default async function CreateContestPage({
  params,
}: {
  params: Promise<{ experienceId: string }>;
}) {
  // Verify user is authenticated
  const headersList = await headers()
  const { userId } = await verifyUserToken(headersList)
  
  if (!userId) {
    redirect("/")
  }

  // Get user token to pass to client components
  const userToken = headersList.get('x-whop-user-token')

  // Get experience ID
  const { experienceId } = await params

  // Verify user has access to this experience
  const result = await whopApi.checkIfUserHasAccessToExperience({
    userId,
    experienceId,
  })

  if (!result.hasAccessToExperience.hasAccess) {
    redirect(`/experiences/${experienceId}`)
  }

  // Get user info for header
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <Header 
        user={user || undefined}
        experienceId={experienceId}
        showBackButton={true}
        backHref={`/experiences/${experienceId}?view=list`}
        backLabel="Back to Contests"
      />
      
      <div className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Create Your Sales Contest
            </h1>
            <p className="text-lg text-gray-600">
              Set up a competitive challenge for Shopify store owners
            </p>
          </div>
          
          <ContestCreationWizard 
            userToken={userToken} 
            experienceId={experienceId}
          />
        </div>
      </div>
    </div>
  )
} 