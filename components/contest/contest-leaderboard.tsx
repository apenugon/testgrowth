"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

type Participant = {
  id: string
  userId: string
  totalSales: number
  orderCount: number
  user: {
    name?: string
    username: string
  }
}

type Contest = {
  id: string
  metric: string
  prizePoolCents: number
  prizePoolType: string
  entryFeeCents: number
  firstPlacePercent: number
  secondPlacePercent: number
  thirdPlacePercent: number
  maxParticipants?: number | null
}

interface ContestLeaderboardProps {
  contest: Contest
  participants: Participant[]
  currentUserId?: string | null
}

export function ContestLeaderboard({ contest, participants, currentUserId }: ContestLeaderboardProps) {
  // Sort participants based on contest metric
  const sortedParticipants = [...participants].sort((a, b) => {
    if (contest.metric === 'TOTAL_SALES') {
      return b.totalSales - a.totalSales
    } else {
      return b.orderCount - a.orderCount
    }
  })

  // Calculate total prize pool
  const calculateTotalPrizePool = () => {
    if (contest.prizePoolType === "ENTRY_FEES") {
      return contest.entryFeeCents * participants.length
    } else if (contest.prizePoolType === "CREATOR_FUNDED") {
      return contest.prizePoolCents
    } else {
      return (contest.entryFeeCents * participants.length) + contest.prizePoolCents
    }
  }

  const totalPrizePool = calculateTotalPrizePool()

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />
      default:
        return (
          <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
            {rank}
          </div>
        )
    }
  }

  const getPrizeAmount = (rank: number) => {
    if (totalPrizePool === 0) return 0
    
    switch (rank) {
      case 1:
        return Math.round(totalPrizePool * contest.firstPlacePercent / 100)
      case 2:
        return Math.round(totalPrizePool * contest.secondPlacePercent / 100)
      case 3:
        return Math.round(totalPrizePool * contest.thirdPlacePercent / 100)
      default:
        return 0
    }
  }

  const getDisplayValue = (participant: Participant) => {
    if (contest.metric === 'TOTAL_SALES') {
      return formatCurrency(participant.totalSales)
    } else {
      return `${participant.orderCount} orders`
    }
  }

  return (
    <div>
      {participants.length === 0 ? (
        <div className="text-center py-8">
          <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No participants yet</p>
          <p className="text-sm text-gray-400">Be the first to join!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedParticipants.map((participant, index) => {
            const rank = index + 1
            const prizeAmount = getPrizeAmount(rank)
            const isCurrentUser = currentUserId === participant.userId
            
            return (
              <div
                key={participant.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  isCurrentUser 
                    ? 'bg-emerald-50 border-emerald-200' 
                    : rank <= 3 
                    ? 'bg-gradient-to-r from-gray-50 to-white border-gray-200'
                    : 'bg-white border-gray-100'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="text-lg font-bold text-gray-700 min-w-[2rem]">
                    {rank}
                  </div>
                  {getRankIcon(rank)}
                  
                  <div>
                    <div className="font-medium text-gray-900">
                      {participant.user.name || participant.user.username}
                      {isCurrentUser && (
                        <Badge variant="secondary" className="ml-2 text-xs">You</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      @{participant.user.username}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-gray-900">
                    {getDisplayValue(participant)}
                  </div>
                </div>
              </div>
            )
          })}

          {participants.length < 10 && (
            <div className="text-center py-4 text-sm text-gray-500">
              Showing top {participants.length} participant{participants.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  )
} 