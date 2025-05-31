import { verifyUserToken } from "@whop/api"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { whopApi } from "@/lib/whop-api"
import { Header } from "@/components/layout/header"
import { DashboardClient } from "./dashboard-client"
import { isUserAdmin, isUserWhitelistedCreator, ensureAdminUser } from "@/lib/permissions"

export default async function CreatorDashboardPage({
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
      
      // Ensure admin user exists if this is the hardcoded admin
      if (publicUser.username === "akulkid") {
        await ensureAdminUser(userId, publicUser.username)
      }
    }
  } catch (error) {
    console.error("Error fetching user data:", error)
  }

  // Check permissions
  const isAdmin = await isUserAdmin(userId)
  const isWhitelistedCreator = await isUserWhitelistedCreator(userId)
  
  // Redirect if not whitelisted as creator
  if (!isWhitelistedCreator) {
    redirect(`/experiences/${experienceId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <Header 
        user={user || undefined}
        experienceId={experienceId}
        showBackButton={true}
        backHref={`/experiences/${experienceId}`}
        backLabel="Back"
        isCreatorMode={true}
        isAdmin={isAdmin}
        isWhitelistedCreator={isWhitelistedCreator}
      />
      
      <DashboardClient userId={userId} experienceId={experienceId} />
    </div>
  )
} 