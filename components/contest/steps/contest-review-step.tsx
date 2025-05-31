"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, Calendar, DollarSign, Target, Users, Globe, Lock, Trophy } from "lucide-react"
import type { ContestFormData } from "../contest-creation-wizard"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface ContestReviewStepProps {
  data: ContestFormData
  userToken?: string | null
  experienceId?: string
  onPrev: () => void
  isSubmitting: boolean
  setIsSubmitting: (submitting: boolean) => void
}

export function ContestReviewStep({ 
  data, 
  userToken, 
  experienceId, 
  onPrev, 
  isSubmitting, 
  setIsSubmitting 
}: ContestReviewStepProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const handlePublish = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/contests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userToken && { 'x-whop-user-token': userToken }),
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create contest')
      }

      const contest = await response.json()
      
      // Redirect to the contest page using the experience-scoped path
      const contestPath = experienceId 
        ? `/experiences/${experienceId}/contest/${contest.slug}`
        : `/c/${contest.slug}` // fallback for backwards compatibility
      
      router.push(contestPath)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const metricLabel = data.metric === 'TOTAL_SALES' ? 'Total Sales Value' : 'Number of Orders'
  const duration = Math.ceil((data.endAt.getTime() - data.startAt.getTime()) / (1000 * 60 * 60 * 24))

  // Calculate total prize pool
  const calculateTotalPrizePool = () => {
    if (data.prizePoolType === "ENTRY_FEES") {
      const estimatedParticipants = data.maxParticipants || 20
      return data.entryFeeCents * estimatedParticipants
    } else if (data.prizePoolType === "CREATOR_FUNDED") {
      return data.prizePoolCents
    } else {
      // HYBRID
      const estimatedParticipants = data.maxParticipants || 20
      return (data.entryFeeCents * estimatedParticipants) + data.prizePoolCents
    }
  }

  const totalPrizePool = calculateTotalPrizePool()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Review & Publish</h2>
        <p className="text-gray-600">
          Review your contest details before publishing
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Contest Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Contest Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900">{data.name}</h4>
              <p className="text-sm text-gray-600 mt-1">{data.description}</p>
            </div>
            
            <div className="flex items-center space-x-2 text-sm">
              <Target className="h-4 w-4 text-emerald-600" />
              <span>Metric: {metricLabel}</span>
            </div>

            <div className="flex items-center space-x-2 text-sm">
              {data.isPublic ? (
                <>
                  <Globe className="h-4 w-4 text-blue-600" />
                  <span>Public contest</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 text-gray-600" />
                  <span>Private contest</span>
                </>
              )}
            </div>

            {data.maxParticipants && (
              <div className="flex items-center space-x-2 text-sm">
                <Users className="h-4 w-4 text-purple-600" />
                <span>Max {data.maxParticipants} participants</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeframe & Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Schedule & Pricing</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-gray-600">Start Date</div>
              <div className="font-medium">{formatDate(data.startAt)}</div>
            </div>
            
            <div>
              <div className="text-sm text-gray-600">End Date</div>
              <div className="font-medium">{formatDate(data.endAt)}</div>
            </div>

            <div>
              <div className="text-sm text-gray-600">Duration</div>
              <div className="font-medium">
                {duration === 1 ? '1 day' : `${duration} days`}
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <span className="font-medium">
                  {data.entryFeeCents === 0 
                    ? 'Free to join' 
                    : `${formatCurrency(data.entryFeeCents)} entry fee`
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Prize Pool Information */}
      {totalPrizePool > 0 && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-emerald-600" />
              <span className="text-emerald-900">Prize Pool</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-emerald-800">Total Prize Pool:</span>
              <span className="text-xl font-bold text-emerald-600">
                {formatCurrency(totalPrizePool)}
              </span>
            </div>

            <div className="text-sm text-emerald-700">
              <strong>Source:</strong> {
                data.prizePoolType === "ENTRY_FEES" ? "Entry fees only" :
                data.prizePoolType === "CREATOR_FUNDED" ? "Creator funded" :
                "Entry fees + Creator contribution"
              }
            </div>

            {data.prizePoolType === "ENTRY_FEES" && (
              <div className="text-xs text-emerald-600">
                *Estimated based on {data.maxParticipants || 20} participants
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 pt-3 border-t border-emerald-200">
              <div className="text-center">
                <div className="text-lg font-bold text-emerald-600">
                  {formatCurrency(Math.round(totalPrizePool * data.firstPlacePercent / 100))}
                </div>
                <div className="text-xs text-emerald-700">1st Place ({data.firstPlacePercent}%)</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-emerald-600">
                  {formatCurrency(Math.round(totalPrizePool * data.secondPlacePercent / 100))}
                </div>
                <div className="text-xs text-emerald-700">2nd Place ({data.secondPlacePercent}%)</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-emerald-600">
                  {formatCurrency(Math.round(totalPrizePool * data.thirdPlacePercent / 100))}
                </div>
                <div className="text-xs text-emerald-700">3rd Place ({data.thirdPlacePercent}%)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Important Notes */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <h4 className="font-medium text-amber-900 mb-2">Before Publishing</h4>
          <ul className="text-sm text-amber-800 space-y-1">
            <li>• Once published, contest details cannot be changed</li>
            <li>• Participants will be able to join immediately</li>
            {data.entryFeeCents > 0 && (
              <li>• A Whop payment plan will be created automatically</li>
            )}
            {(data.prizePoolType === "CREATOR_FUNDED" || data.prizePoolType === "HYBRID") && data.prizePoolCents > 0 && (
              <li>• Your prize pool contribution ({formatCurrency(data.prizePoolCents)}) will be held in escrow</li>
            )}
            <li>• You can monitor progress and manage participants from the contest page</li>
          </ul>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="text-red-800">
              <strong>Error:</strong> {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button type="button" variant="outline" onClick={onPrev} disabled={isSubmitting}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Pricing
        </Button>
        <Button 
          onClick={handlePublish} 
          disabled={isSubmitting} 
          size="lg"
          className="min-w-[140px]"
        >
          {isSubmitting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Publishing...
            </>
          ) : (
            'Publish Contest'
          )}
        </Button>
      </div>
    </div>
  )
} 