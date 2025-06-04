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
import { getSessionFromCookies } from "@/lib/auth"

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

  // Check authentication using unified system
  const headersList = await headers()
  const userToken = headersList.get('x-whop-user-token')
  
  // Variables for user data
  let user = null
  let experienceId = null
  let internalUserId = null
  let userId = null // Whop user ID for iframe users
  
  // Try Whop authentication first (for iframe users)
  if (userToken) {
    try {
      const { userId: whopUserId } = await verifyUserToken(headersList)
      if (whopUserId) {
        userId = whopUserId
        
        const whopUser = await whopApi.getUser({ userId: whopUserId })
        const publicUser = whopUser.publicUser
        if (publicUser) {
          user = {
            name: publicUser.name || undefined,
            username: publicUser.username
          }
        }

        // Map Whop user ID to internal user ID
        const dbUser = await prisma.user.findUnique({
          where: { whopUserId }
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
              whopUserId,
              username: publicUser.username,
              name: publicUser.name || undefined,
              email: `${whopUserId}@whop.user`,
            }
          })
          internalUserId = newUser.id
        }

        // Check if we can get experience ID from headers or context
        const experienceHeader = headersList.get('x-whop-experience-id')
        if (experienceHeader) {
          experienceId = experienceHeader
        }
      }
    } catch (error) {
      console.error("Error fetching Whop user data:", error)
    }
  }
  
  // Try session cookie authentication (for external users)
  if (!internalUserId) {
    try {
      const sessionResult = await getSessionFromCookies()
      if (sessionResult) {
        user = sessionResult.user
        internalUserId = sessionResult.userId
        // For external users, we use the internal user ID as their identifier
        userId = sessionResult.userId
      }
    } catch (error) {
      console.error("Error fetching session data:", error)
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
    userId: p.user.whopUserId || p.userId, // Use whopUserId if available, otherwise internal userId
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
    ? `/experiences/${experienceId}?view=list`
    : "/?view=list"
  const backLabel = experienceId 
    ? "Back to Contests"
    : "Back to Contests"

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