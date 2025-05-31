import { verifyUserToken } from "@whop/api"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { whopApi } from "@/lib/whop-api"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Trophy, Users, Clock, DollarSign, Calendar } from "lucide-react"
import { formatCurrency, formatDate, getContestStatusBadge } from "@/lib/utils"
import Link from "next/link"

export default async function ContestsPage({
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
    }
  } catch (error) {
    console.error("Error fetching user data:", error)
  }

  // Fetch actual contests data
  let contests: Array<{
    id: string
    name: string
    description: string | null
    slug: string
    status: string
    entryFeeCents: number
    startAt: Date | string
    endAt: Date | string
    participantCount?: number
    _count?: { participants: number }
  }> = []

  try {
    // Fetch all contests via API route
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_BASE_URL 
      : 'http://localhost:3000'
    
    const response = await fetch(`${baseUrl}/api/contests/all`, {
      cache: 'no-store' // Ensure fresh data on each request
    })
    
    if (response.ok) {
      contests = await response.json()
    }
  } catch (error) {
    console.error("Error fetching contests:", error)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <Header 
        user={user || undefined}
        experienceId={experienceId}
        showBackButton={true}
        backHref={`/experiences/${experienceId}`}
        backLabel="Back to Dashboard"
      />
      
      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                All Contests
              </h1>
              <p className="text-gray-600">
                Browse and manage sales contests
              </p>
            </div>
            <Button asChild>
              <Link href={`/experiences/${experienceId}/create`}>
                <Plus className="w-4 h-4 mr-2" />
                Create Contest
              </Link>
            </Button>
          </div>

          {/* Filter Tabs */}
          <div className="flex space-x-1 mb-6">
            <Button variant="default" size="sm">
              All Contests
            </Button>
            <Button variant="ghost" size="sm">
              Active
            </Button>
            <Button variant="ghost" size="sm">
              Upcoming
            </Button>
            <Button variant="ghost" size="sm">
              Ended
            </Button>
            <Button variant="ghost" size="sm">
              My Contests
            </Button>
          </div>

          {/* Contests List */}
          {contests.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Contests Yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Get started by creating your first sales contest
                </p>
                <Button asChild>
                  <Link href={`/experiences/${experienceId}/create`}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Contest
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="bg-white rounded-lg shadow">
              <div className="px-4 py-5 sm:p-6">
                <div className="space-y-4">
                  {contests.map((contest, index) => (
                    <div 
                      key={contest.id} 
                      className={`flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors ${
                        index !== contests.length - 1 ? 'border-b' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                              <Trophy className="w-5 h-5 text-emerald-600" />
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3">
                              <h3 className="text-lg font-medium text-gray-900 truncate">
                                <Link 
                                  href={`/experiences/${experienceId}/contest/${contest.slug}`}
                                  className="hover:text-emerald-600 transition-colors"
                                >
                                  {contest.name}
                                </Link>
                              </h3>
                              {(() => {
                                const { label, variant } = getContestStatusBadge(contest.startAt, contest.endAt)
                                return (
                                  <Badge variant={variant}>
                                    {label.toLowerCase()}
                                  </Badge>
                                )
                              })()}
                            </div>
                            
                            <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                              {contest.description || "No description provided"}
                            </p>
                            
                            <div className="flex items-center space-x-6 mt-2 text-sm text-gray-500">
                              <div className="flex items-center space-x-1">
                                <Users className="w-4 h-4" />
                                <span>{contest._count?.participants || contest.participantCount || 0} participants</span>
                              </div>
                              
                              <div className="flex items-center space-x-1">
                                <DollarSign className="w-4 h-4" />
                                <span>
                                  {contest.entryFeeCents === 0 ? 'Free' : formatCurrency(contest.entryFeeCents)}
                                </span>
                              </div>
                              
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4" />
                                <span>Ends {formatDate(contest.endAt)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0 ml-4">
                        <Button size="sm" asChild>
                          <Link href={`/experiences/${experienceId}/contest/${contest.slug}`}>
                            View Contest
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid md:grid-cols-4 gap-4 mt-8">
            <Card>
              <CardContent className="p-4 text-center">
                <Trophy className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">0</div>
                <div className="text-sm text-gray-600">Total Contests</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">0</div>
                <div className="text-sm text-gray-600">Active Participants</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <DollarSign className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">$0</div>
                <div className="text-sm text-gray-600">Total Prize Pool</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">0</div>
                <div className="text-sm text-gray-600">Live Contests</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 