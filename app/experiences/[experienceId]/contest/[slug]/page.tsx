import { findContestBySlug } from "@/lib/db/contests"
import { verifyUserToken } from "@whop/api"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { Header } from "@/components/layout/header"
import { ContestHeader } from "@/components/contest/contest-header"
import { ContestLeaderboard } from "@/components/contest/contest-leaderboard"
import { ContestJoinButton } from "@/components/contest/contest-join-button"
import { Card, CardContent } from "@/components/ui/card"
import { whopApi } from "@/lib/whop-api"
import { prisma } from "@/lib/prisma"

interface ContestPageProps {
  params: Promise<{ 
    experienceId: string
    slug: string 
  }>
}

export default async function ContestPage({ params }: ContestPageProps) {
  const { experienceId, slug } = await params
  
  // Get contest data
  const contest = await findContestBySlug(slug)
  if (!contest) {
    notFound()
  }

  // Check if user is authenticated (optional for public contests)
  const headersList = await headers()
  const { userId } = await verifyUserToken(headersList)

  // Verify user has access to this experience if authenticated
  if (userId) {
    try {
      const result = await whopApi.checkIfUserHasAccessToExperience({
        userId,
        experienceId,
      })

      if (!result.hasAccessToExperience.hasAccess) {
        redirect(`/experiences/${experienceId}`)
      }
    } catch (error) {
      console.error("Error checking experience access:", error)
    }
  }

  // Get user data if authenticated
  let user = null
  let internalUserId = null
  if (userId) {
    try {
      const whopUser = await whopApi.getUser({ userId })
      const publicUser = whopUser.publicUser
      if (publicUser) {
        user = {
          name: publicUser.name || undefined,
          username: publicUser.username
        }
      }

      // Map Whop user ID to internal user ID
      const dbUser = await prisma.user.findUnique({
        where: { whopUserId: userId }
      })
      if (dbUser) {
        internalUserId = dbUser.id
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
    }
  }

  // Check if user is already participating (using internal user ID)
  const isParticipating = internalUserId 
    ? contest.participants.some(p => p.userId === internalUserId)
    : false

  // Check if user is the creator (using internal user ID)
  const isCreator = internalUserId === contest.creatorId

  // Transform contest data to match component types
  const participantsForLeaderboard = contest.participants.map(p => ({
    id: p.contestId,
    userId: p.userId,
    totalSales: p.totalSales,
    orderCount: p.orderCount,
    user: {
      name: p.user.name || undefined,
      username: p.user.username || "unknown"
    }
  }))

  const contestForJoinButton = {
    ...contest,
    slug: contest.slug,
    participants: contest.participants.map(p => ({ userId: p.userId }))
  }

  const contestForHeader = {
    ...contest,
    description: contest.description || "",
    creator: {
      ...contest.creator,
      name: contest.creator.name || undefined,
      username: contest.creator.username || "unknown"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <Header 
        user={user || undefined}
        experienceId={experienceId}
        showBackButton={true}
        backHref={`/experiences/${experienceId}`}
        backLabel="Back to Contests"
      />
      
      <div className="py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Contest Header */}
          <ContestHeader 
            contest={contestForHeader} 
            isCreator={isCreator}
            participantCount={contest.participants.length}
          />

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contest Description */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    About This Contest
                  </h3>
                  <p className="text-gray-600 whitespace-pre-wrap">
                    {contest.description}
                  </p>
                </CardContent>
              </Card>

              {/* Leaderboard */}
              <ContestLeaderboard 
                contest={contest}
                participants={participantsForLeaderboard}
                currentUserId={userId}
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Join/Status Card */}
              <ContestJoinButton
                contest={contestForJoinButton}
                userId={userId}
                isParticipating={isParticipating}
                experienceId={experienceId}
              />

              {/* Contest Stats */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Contest Stats
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Participants</span>
                      <span className="font-medium">
                        {contest.participants.length}
                        {contest.maxParticipants && ` / ${contest.maxParticipants}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Metric</span>
                      <span className="font-medium">
                        {contest.metric === 'TOTAL_SALES' ? 'Total Sales' : 'Order Count'}
                      </span>
                    </div>
                    {contest.entryFeeCents > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Entry Fee</span>
                        <span className="font-medium">
                          ${(contest.entryFeeCents / 100).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Creator Info */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Contest Creator
                  </h3>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">
                        {contestForHeader.creator.name?.[0] || contestForHeader.creator.username[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {contestForHeader.creator.name || contestForHeader.creator.username}
                      </div>
                      <div className="text-sm text-gray-500">
                        @{contestForHeader.creator.username}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 