import { findContestBySlug } from "@/lib/db/contests"
import { verifyUserToken } from "@whop/api"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { Header } from "@/components/layout/header"
import { ContestPageHeader } from "@/components/contest/contest-page-header"
import { ContestLeaderboard } from "@/components/contest/contest-leaderboard"
import { ContestJoinButton } from "@/components/contest/contest-join-button"
import { Card, CardContent } from "@/components/ui/card"
import { whopApi } from "@/lib/whop-api"
import { prisma } from "@/lib/prisma"

interface ContestPageProps {
  params: Promise<{ slug: string }>
}

export default async function ContestPage({ params }: ContestPageProps) {
  const { slug } = await params
  
  // Get contest data
  const contest = await findContestBySlug(slug)
  if (!contest) {
    notFound()
  }

  // Check if user is authenticated (optional for public contests)
  const headersList = await headers()
  const userToken = headersList.get('x-whop-user-token')
  const { userId } = await verifyUserToken(headersList)

  // Get user and experience data if authenticated
  let user = null
  let experienceId = null
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
        
        // Update user record with latest Whop username if different
        if (dbUser.username !== publicUser.username) {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: { 
              username: publicUser.username,
              name: publicUser.name || undefined
            }
          })
        }
      } else if (publicUser) {
        // Create user record if it doesn't exist
        const newUser = await prisma.user.create({
          data: {
            whopUserId: userId,
            username: publicUser.username,
            name: publicUser.name || undefined,
            email: `${userId}@whop.user`,
          }
        })
        internalUserId = newUser.id
      }

      // Check if we can get experience ID from headers or context
      // The Whop platform should provide this context
      const experienceHeader = headersList.get('x-whop-experience-id')
      if (experienceHeader) {
        experienceId = experienceHeader
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
    userId: p.user.whopUserId,
    totalSales: p.totalSales,
    orderCount: p.orderCount,
    user: {
      name: p.user.name || undefined,
      username: p.user.username || "unknown"
    }
  }))

  const contestForJoinButton = {
    ...contest,
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

  // Determine the appropriate back navigation
  const backHref = experienceId 
    ? `/experiences/${experienceId}/contests`
    : "/"
  const backLabel = experienceId 
    ? "Back to Contests"
    : "Back to Home"

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <Header 
        user={user || undefined}
        experienceId={experienceId || undefined}
        showBackButton={true}
        backHref={backHref}
        backLabel={backLabel}
      />
      
      <div className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Integrated Contest Card */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <ContestPageHeader
              contest={{
                id: contest.id,
                name: contest.name,
                slug: contest.slug,
                startAt: contest.startAt,
                endAt: contest.endAt,
                prizePoolCents: contest.prizePoolCents,
                prizePoolType: contest.prizePoolType,
                entryFeeCents: contest.entryFeeCents,
                maxParticipants: contest.maxParticipants,
                status: contest.status,
                isPublic: contest.isPublic,
                participants: contest.participants.map(p => ({ userId: p.userId })),
              }}
              userId={userId || undefined}
              isParticipating={isParticipating}
              experienceId={experienceId}
              userToken={userToken}
            />

            <div className="p-6">
              <ContestLeaderboard 
                contest={contest}
                participants={participantsForLeaderboard}
                currentUserId={userId}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 