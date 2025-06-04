import { Suspense } from "react"
import { redirect } from "next/navigation"
import { ExternalContestList } from "@/components/contest/external-contest-list"
import { Header } from "@/components/layout/header"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookies } from "@/lib/auth"

interface PageProps {
  searchParams: { view?: string }
}

async function getRedirectContest() {
  // Get all public contests
  const contests = await prisma.contest.findMany({
    where: {
      isPublic: true,
    },
    include: {
      participants: true,
    },
    orderBy: {
      startAt: 'asc',
    },
  })

  if (contests.length === 0) return null

  const now = new Date()

  // First, try to find live contests and pick the one ending soonest
  const liveContests = contests.filter((contest: any) => {
    const start = new Date(contest.startAt)
    const end = new Date(contest.endAt)
    return now >= start && now <= end
  })

  if (liveContests.length > 0) {
    // Sort by end time (ascending) - soonest ending first
    liveContests.sort((a: any, b: any) => new Date(a.endAt).getTime() - new Date(b.endAt).getTime())
    return liveContests[0]
  }

  // If no live contests, find upcoming contests and pick the one starting soonest
  const upcomingContests = contests.filter((contest: any) => {
    const start = new Date(contest.startAt)
    return now < start
  })

  if (upcomingContests.length > 0) {
    // Already sorted by startAt ascending, so take the first
    return upcomingContests[0]
  }

  // If no live or upcoming contests, return null (will show list)
  return null
}

export default async function HomePage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams
  
  // Get user session from cookies (for external users)
  const session = await getSessionFromCookies()
  const user = session?.user
  
  // If ?view=list is present, always show the list
  if (resolvedSearchParams.view === 'list') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header user={user} />
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          }>
            <ExternalContestList />
          </Suspense>
        </div>
      </div>
    )
  }

  // Otherwise, try to redirect to the most relevant contest
  const redirectContest = await getRedirectContest()
  
  if (redirectContest) {
    redirect(`/c/${redirectContest.slug}`)
  }

  // If no contests to redirect to, show the list
  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        }>
          <ExternalContestList />
        </Suspense>
      </div>
    </div>
  )
}
