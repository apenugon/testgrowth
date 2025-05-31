import { verifyUserToken } from "@whop/api"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { whopApi } from "@/lib/whop-api"
import { Header } from "@/components/layout/header"
import { isUserAdmin, ensureAdminUser } from "@/lib/permissions"
import { WhitelistManagementClient } from "./whitelist-client"

export default async function AdminWhitelistPage({
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

  // Get user info for header and admin check
  let user = null
  try {
    const whopUser = await whopApi.getUser({ userId })
    const publicUser = whopUser.publicUser
    if (publicUser) {
      user = {
        name: publicUser.name || undefined,
        username: publicUser.username
      }
      
      // Ensure admin user exists if this is the hardcoded admin
      if (publicUser.username === "akulkid") {
        await ensureAdminUser(userId, publicUser.username)
      }
    }
  } catch (error) {
    console.error("Error fetching user data:", error)
  }

  // Check if user is admin
  const isAdmin = await isUserAdmin(userId)
  if (!isAdmin) {
    redirect(`/experiences/${experienceId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <Header 
        user={user || undefined}
        experienceId={experienceId}
        showBackButton={true}
        backHref={`/experiences/${experienceId}/dashboard`}
        backLabel="Back to Dashboard"
        isCreatorMode={true}
      />
      
      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Creator Whitelist Management
            </h1>
            <p className="text-gray-600">
              Manage which users can access creator features and create contests
            </p>
          </div>

          <WhitelistManagementClient experienceId={experienceId} />
        </div>
      </div>
    </div>
  )
} 