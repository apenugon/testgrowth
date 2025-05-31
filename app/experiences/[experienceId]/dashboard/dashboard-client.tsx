"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Trophy, Users, Target, TrendingUp, Calendar, Clock, DollarSign, Eye } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"

type Contest = {
  id: string
  name: string
  slug: string
  description?: string
  metric: string
  startAt: string
  endAt: string
  entryFeeCents: number
  prizePoolCents: number
  status: string
  isPublic: boolean
  maxParticipants?: number
  createdAt: string
  _count: {
    participants: number
  }
}

interface DashboardClientProps {
  userId: string
  experienceId: string
}

export function DashboardClient({ userId, experienceId }: DashboardClientProps) {
  const [contests, setContests] = useState<Contest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchContests()
  }, [userId])

  const fetchContests = async () => {
    try {
      const response = await fetch(`/api/contests/by-creator/${userId}`)
      if (response.ok) {
        const data = await response.json()
        setContests(data)
      } else {
        console.error('Failed to fetch contests')
        setError('Failed to load contests')
      }
    } catch (error) {
      console.error('Error fetching contests:', error)
      setError('Failed to load contests')
    } finally {
      setLoading(false)
    }
  }

  const getContestStatus = (contest: Contest) => {
    const now = new Date()
    const startAt = new Date(contest.startAt)
    const endAt = new Date(contest.endAt)

    if (now < startAt) {
      return { label: 'Upcoming', color: 'bg-blue-100 text-blue-800' }
    } else if (now >= startAt && now < endAt) {
      return { label: 'Live', color: 'bg-green-100 text-green-800' }
    } else {
      return { label: 'Ended', color: 'bg-gray-100 text-gray-800' }
    }
  }

  // Calculate stats
  const totalParticipants = contests.reduce((sum, contest) => sum + contest._count.participants, 0)
  const activeContests = contests.filter(contest => {
    const now = new Date()
    const startAt = new Date(contest.startAt)
    const endAt = new Date(contest.endAt)
    return now >= startAt && now < endAt
  }).length
  const totalPrizePools = contests.reduce((sum, contest) => sum + contest.prizePoolCents, 0)

  if (loading) {
    return (
      <div className="py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mr-3"></div>
            <span className="text-gray-600">Loading dashboard...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
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
                  <p className="text-2xl font-bold text-gray-900">{contests.length}</p>
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
                  <p className="text-2xl font-bold text-gray-900">{totalParticipants}</p>
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
                  <p className="text-2xl font-bold text-gray-900">{activeContests}</p>
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
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPrizePools)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-1 gap-8">
          {/* Your Contests */}
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Your Contests</h2>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {contests.length === 0 ? (
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
            ) : (
              <div className="space-y-4">
                {contests.map((contest) => {
                  const status = getContestStatus(contest)
                  return (
                    <Card key={contest.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {contest.name}
                              </h3>
                              <Badge className={status.color}>
                                {status.label}
                              </Badge>
                              {!contest.isPublic && (
                                <Badge variant="outline">Private</Badge>
                              )}
                            </div>
                            
                            {contest.description && (
                              <p className="text-gray-600 mb-3 line-clamp-2">
                                {contest.description}
                              </p>
                            )}
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div className="flex items-center space-x-2">
                                <Users className="w-4 h-4 text-gray-400" />
                                <span>{contest._count.participants} participants</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span>{formatDate(new Date(contest.startAt))}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span>Ends {formatDate(new Date(contest.endAt))}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <DollarSign className="w-4 h-4 text-gray-400" />
                                <span>
                                  {contest.entryFeeCents > 0 
                                    ? formatCurrency(contest.entryFeeCents) 
                                    : 'Free'
                                  }
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 ml-6">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/experiences/${experienceId}/contest/${contest.slug}`}>
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 