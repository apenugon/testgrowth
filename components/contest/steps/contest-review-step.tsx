"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft } from "lucide-react"
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
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const returnTo = searchParams.get('returnTo')

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
      
      // Check if we have a returnTo URL, otherwise redirect to contest page
      if (returnTo) {
        router.push(returnTo)
      } else {
        // Default behavior: redirect to the contest page
        const contestPath = experienceId 
          ? `/experiences/${experienceId}/contest/${contest.slug}?fromCreate=true`
          : `/c/${contest.slug}?fromCreate=true`
        
        router.push(contestPath)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Review & Publish</h2>
        <p className="text-gray-600">
          Review your contest details before publishing
        </p>
      </div>

      {/* Contest Summary */}
      <div className="space-y-4 p-6 bg-gray-50 rounded-lg">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{data.name}</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Start Date:</span>
            <div className="font-medium">{formatDate(data.startAt)}</div>
          </div>
          <div>
            <span className="text-gray-600">End Date:</span>
            <div className="font-medium">{formatDate(data.endAt)}</div>
          </div>
        </div>

        {data.prizePoolCents > 0 && (
          <div className="pt-3 border-t border-gray-300">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Prize Pool:</span>
              <span className="text-2xl font-bold text-emerald-600">
                {formatCurrency(data.prizePoolCents)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Important Notes */}
      <div className="space-y-4 p-6 bg-amber-50 rounded-lg">
        <h3 className="text-lg font-semibold text-amber-900">Before Publishing</h3>
        <ul className="text-sm text-amber-800 space-y-1">
          <li>• Once published, contest details cannot be changed</li>
          <li>• Participants will be able to join immediately</li>
          {data.prizePoolCents > 0 && (
            <li>• Your prize pool contribution ({formatCurrency(data.prizePoolCents)}) will be held in escrow</li>
          )}
          <li>• You can monitor progress and manage participants from the contest page</li>
        </ul>
      </div>

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
      <div className="flex justify-between">
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