"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, DollarSign, Trophy, Users, Globe, Lock, Target, Edit } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"

type Contest = {
  id: string
  name: string
  description: string
  slug: string
  metric: string
  startAt: Date
  endAt: Date
  entryFeeCents: number
  prizePoolCents: number
  prizePoolType: string
  firstPlacePercent: number
  secondPlacePercent: number
  thirdPlacePercent: number
  maxParticipants: number | null
  isPublic: boolean
  status: string
  creator: {
    name?: string
    username: string
  }
}

interface ContestHeaderProps {
  contest: Contest
  isCreator: boolean
  participantCount: number
}

export function ContestHeader({ contest, isCreator, participantCount }: ContestHeaderProps) {
  // Calculate total prize pool
  const calculateTotalPrizePool = () => {
    if (contest.prizePoolType === "ENTRY_FEES") {
      return contest.entryFeeCents * participantCount
    } else if (contest.prizePoolType === "CREATOR_FUNDED") {
      return contest.prizePoolCents
    } else {
      // HYBRID
      return (contest.entryFeeCents * participantCount) + contest.prizePoolCents
    }
  }

  const totalPrizePool = calculateTotalPrizePool()
  const now = new Date()
  const hasStarted = now >= new Date(contest.startAt)
  const hasEnded = now >= new Date(contest.endAt)

  const getStatusBadge = () => {
    if (hasEnded) {
      return <Badge variant="destructive">Ended</Badge>
    } else if (hasStarted) {
      return <Badge variant="default" className="bg-emerald-500">Live</Badge>
    } else {
      return <Badge variant="secondary">Upcoming</Badge>
    }
  }

  return (
    <Card className="border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
      <CardContent className="p-8">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{contest.name}</h1>
              {getStatusBadge()}
            </div>
            
            <div className="flex items-center space-x-6 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Target className="w-4 h-4" />
                <span>
                  {contest.metric === 'TOTAL_SALES' ? 'Total Sales Value' : 'Number of Orders'}
                </span>
              </div>
              
              <div className="flex items-center space-x-1">
                {contest.isPublic ? (
                  <>
                    <Globe className="w-4 h-4" />
                    <span>Public</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Private</span>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>
                  {participantCount} participant{participantCount !== 1 ? 's' : ''}
                  {contest.maxParticipants && ` / ${contest.maxParticipants} max`}
                </span>
              </div>
            </div>
          </div>

          {isCreator && (
            <Button variant="outline" disabled>
              <Edit className="w-4 h-4 mr-2" />
              Manage Contest
              {/* TODO: Update to use /experiences/{experienceId}/contest/{slug}/manage when implemented */}
            </Button>
          )}
        </div>

        {/* Contest Details Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Duration */}
          <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              <h3 className="font-semibold text-gray-900">Duration</h3>
            </div>
            <div className="space-y-1 text-sm">
              <div>
                <span className="text-gray-600">Start: </span>
                <span className="font-medium">{formatDate(new Date(contest.startAt))}</span>
              </div>
              <div>
                <span className="text-gray-600">End: </span>
                <span className="font-medium">{formatDate(new Date(contest.endAt))}</span>
              </div>
            </div>
          </div>

          {/* Entry Fee */}
          <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <h3 className="font-semibold text-gray-900">Entry Fee</h3>
            </div>
            <div className="text-2xl font-bold text-emerald-600">
              {contest.entryFeeCents === 0 ? 'FREE' : formatCurrency(contest.entryFeeCents)}
            </div>
          </div>

          {/* Prize Pool */}
          {totalPrizePool > 0 && (
            <div className="bg-white/50 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Trophy className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-gray-900">Prize Pool</h3>
              </div>
              <div className="text-2xl font-bold text-emerald-600 mb-1">
                {formatCurrency(totalPrizePool)}
              </div>
              <div className="text-xs text-gray-600">
                {contest.prizePoolType === "ENTRY_FEES" ? "From entry fees" :
                 contest.prizePoolType === "CREATOR_FUNDED" ? "Creator funded" :
                 "Entry fees + Creator"}
              </div>
            </div>
          )}
        </div>

        {/* Prize Distribution */}
        {totalPrizePool > 0 && (
          <div className="mt-6 bg-white/50 backdrop-blur-sm rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-emerald-600" />
              <span>Prize Distribution</span>
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-emerald-600">
                  {formatCurrency(Math.round(totalPrizePool * contest.firstPlacePercent / 100))}
                </div>
                <div className="text-sm text-gray-600">
                  1st Place ({contest.firstPlacePercent}%)
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-emerald-600">
                  {formatCurrency(Math.round(totalPrizePool * contest.secondPlacePercent / 100))}
                </div>
                <div className="text-sm text-gray-600">
                  2nd Place ({contest.secondPlacePercent}%)
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-emerald-600">
                  {formatCurrency(Math.round(totalPrizePool * contest.thirdPlacePercent / 100))}
                </div>
                <div className="text-sm text-gray-600">
                  3rd Place ({contest.thirdPlacePercent}%)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Time Remaining */}
        {!hasEnded && (
          <div className="mt-4 bg-emerald-100 rounded-lg p-3">
            <div className="flex items-center justify-center space-x-2 text-emerald-800">
              <Clock className="w-4 h-4" />
              <span className="font-medium">
                {hasStarted 
                  ? `Contest ends ${formatDate(new Date(contest.endAt))}`
                  : `Contest starts ${formatDate(new Date(contest.startAt))}`
                }
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 