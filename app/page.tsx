import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trophy, Users, Zap } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-600 opacity-10"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Shopify Sales Contest Platform
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Create competitive challenges for Shopify store owners. Track real-time sales data, 
              engage your community, and reward top performers with our powerful contest platform.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8 py-3">
                <Link href="/app/create">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Contest
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-3">
                <Link href="/app">
                  <Trophy className="w-5 h-5 mr-2" />
                  View Dashboard
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Everything You Need for Sales Contests
          </h2>
          <p className="text-lg text-gray-600">
            Powerful features to create engaging competitions and drive sales growth
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-emerald-600" />
              </div>
              <CardTitle>Real-time Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Connect Shopify stores and track sales metrics in real-time with live leaderboards
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle>Easy Participation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Simple Shopify OAuth integration for participants to join contests securely
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle>Flexible Contests</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Create free or paid contests with custom metrics, timeframes, and participant limits
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Navigation for Testing */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            🚀 Testing Navigation
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/app/create">
                <Plus className="w-8 h-8 mb-2 text-emerald-600" />
                <span className="font-medium">Create Contest</span>
                <span className="text-xs text-gray-500 mt-1">4-step wizard</span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/app">
                <Trophy className="w-8 h-8 mb-2 text-blue-600" />
                <span className="font-medium">Dashboard</span>
                <span className="text-xs text-gray-500 mt-1">Your contests</span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/settings/stores">
                <Users className="w-8 h-8 mb-2 text-purple-600" />
                <span className="font-medium">Store Settings</span>
                <span className="text-xs text-gray-500 mt-1">Shopify connections</span>
              </Link>
            </Button>

            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/c/demo-contest">
                <Zap className="w-8 h-8 mb-2 text-orange-600" />
                <span className="font-medium">Contest Page</span>
                <span className="text-xs text-gray-500 mt-1">Example contest</span>
              </Link>
            </Button>
          </div>

          <div className="mt-6 p-4 bg-emerald-50 rounded-lg">
            <h4 className="font-medium text-emerald-900 mb-2">Development Status</h4>
            <ul className="text-sm text-emerald-800 space-y-1">
              <li>✅ Contest Creation Wizard (4 steps)</li>
              <li>✅ Database & API Setup</li>
              <li>✅ UI Component System</li>
              <li>🚧 Contest Display Components</li>
              <li>🚧 Shopify Integration</li>
              <li>🚧 Real-time Leaderboard</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center text-gray-600">
            <p>Shopify Sales Contest Platform - Built with Next.js, Prisma, and Whop</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
