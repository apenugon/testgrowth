import { findContestBySlug } from "@/lib/db/contests"
import { verifyUserToken } from "@whop/api"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { Header } from "@/components/layout/header"
import { ContestPageHeader } from "@/components/contest/contest-page-header"
import { ContestLeaderboard } from "@/components/contest/contest-leaderboard"
import { ContestJoinButton } from "@/components/contest/contest-join-button"
import { Card, CardContent } from "@/components/ui/card"
import { whopApi } from "@/lib/whop-api"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/auth"

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

  // Get user session from cookies (for external users) - EXACT COPY FROM MAIN PAGE
  const session = await getSessionFromCookies()
  const user = session?.user

  // Check if user is authenticated (optional for public contests)
  const headersList = await headers()
  const userToken = headersList.get('x-whop-user-token')
  let userId = null
  
  try {
    const result = await verifyUserToken(headersList)
    userId = result.userId
  } catch (error) {
    // User is not authenticated - this is OK for public contests
    console.log("User not authenticated (this is OK for public contests)")
  }

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
  let whopUser = null
  let internalUserId = null
  if (userId) {
    try {
      const whopUserData = await whopApi.getUser({ userId })
      const publicUser = whopUserData.publicUser
      if (publicUser) {
        whopUser = {
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
    userId: p.user.whopUserId || p.userId,
    totalSales: p.totalSales,
    orderCount: p.orderCount,
    user: {
      name: p.user.name || undefined,
      username: p.user.username || "unknown"
    }
  }))

  // Auto-fix any users with wrong usernames (user-{whopUserId} pattern)
  const fixWrongUsernames = async () => {
    try {
      for (const participant of contest.participants) {
        const user = participant.user;
        if (user.whopUserId && user.username === `user-${user.whopUserId}`) {
          try {
            // Fetch real username from Whop
            const whopUser = await whopApi.getUser({ userId: user.whopUserId });
            const publicUser = whopUser.publicUser;
            
            if (publicUser && publicUser.username && publicUser.username !== user.username) {
              // Update the user with correct username and name
              await prisma.user.update({
                where: { id: user.id },
                data: {
                  username: publicUser.username,
                  name: publicUser.name || undefined
                }
              });
              
              console.log(`Auto-fixed user ${user.whopUserId}: ${user.username} -> ${publicUser.username}`);
            }
          } catch (error) {
            console.error(`Error auto-fixing user ${user.whopUserId}:`, error);
          }
        }
      }
    } catch (error) {
      console.error("Error in auto-fix usernames:", error);
    }
  };

  // Run the fix in the background (don't await to avoid blocking page render)
  fixWrongUsernames().catch(console.error);

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
        user={user || whopUser}
        experienceId={experienceId}
        showBackButton={true}
        backHref={`/experiences/${experienceId}?view=list`}
        backLabel="Back to Contests"
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
              userId={internalUserId || undefined}
              isParticipating={isParticipating}
              experienceId={experienceId}
              userToken={userToken || undefined}
            />

            <div className="p-6">
              <ContestLeaderboard 
                contest={contest}
                participants={participantsForLeaderboard}
                currentUserId={internalUserId || undefined}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 