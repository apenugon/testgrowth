import { verifyUserToken } from "@whop/api"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { whopApi } from "@/lib/whop-api"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trophy, Users, Target, TrendingUp, ArrowLeft } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"

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
        backHref={`/experiences/${experienceId}`}
        backLabel="Back to Contests"
      />
      
      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Creator Dashboard
              </h1>
              <p className="text-gray-600">
                Manage your contests and track performance
              </p>
            </div>
            <Button asChild>
              <Link href={`/experiences/${experienceId}/create`}>
                <Plus className="w-4 h-4 mr-2" />
                Create Contest
              </Link>
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Your Contests</p>
                    <p className="text-2xl font-bold text-gray-900">0</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Participants</p>
                    <p className="text-2xl font-bold text-gray-900">0</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Target className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Contests</p>
                    <p className="text-2xl font-bold text-gray-900">0</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Prize Pools</p>
                    <p className="text-2xl font-bold text-gray-900">$0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Your Contests */}
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Your Contests</h2>
                <Button variant="outline" asChild>
                  <Link href={`/experiences/${experienceId}/contests`}>
                    View All Contests
                  </Link>
                </Button>
              </div>

              <Card>
                <CardContent className="p-12 text-center">
                  <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Contests Created</h3>
                  <p className="text-gray-600 mb-6">
                    Start engaging your community by creating your first sales contest
                  </p>
                  <Button asChild>
                    <Link href={`/experiences/${experienceId}/create`}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Contest
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions & Resources */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" asChild>
                    <Link href={`/experiences/${experienceId}/create`}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Contest
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/experiences/${experienceId}/contests`}>
                      <Trophy className="w-4 h-4 mr-2" />
                      Browse All Contests
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/experiences/${experienceId}`}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Contests
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Contest Tips */}
              <Card className="bg-emerald-50 border-emerald-200">
                <CardContent className="p-4">
                  <h4 className="font-medium text-emerald-900 mb-2">
                    💡 Contest Tips
                  </h4>
                  <ul className="text-sm text-emerald-800 space-y-1">
                    <li>• Set clear, achievable goals</li>
                    <li>• Offer attractive prizes</li>
                    <li>• Promote across all channels</li>
                    <li>• Provide regular updates</li>
                    <li>• Celebrate all participants</li>
                  </ul>
                </CardContent>
              </Card>

              {/* Platform Status */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <h4 className="font-medium text-blue-900 mb-2">
                    🚀 Platform Features
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>✅ Contest Creation</li>
                    <li>✅ Prize Pool Management</li>
                    <li>✅ Real-time Tracking</li>
                    <li>🚧 Shopify Integration</li>
                    <li>🚧 Automated Payouts</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 