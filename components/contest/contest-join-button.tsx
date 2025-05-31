"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, DollarSign, CheckCircle, Clock, Lock, ShoppingBag, ChevronDown } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Contest = {
  id: string
  name: string
  slug: string
  status: string
  entryFeeCents: number
  maxParticipants?: number | null
  startAt: Date
  endAt: Date
  isPublic: boolean
  participants: Array<{ userId: string }>
}

type ShopifyStore = {
  id: string
  shopDomain: string
  isActive: boolean
}

interface ContestJoinButtonProps {
  contest: Contest
  userId?: string | null
  isParticipating: boolean
  experienceId?: string
}

export function ContestJoinButton({ contest, userId, isParticipating, experienceId }: ContestJoinButtonProps) {
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stores, setStores] = useState<ShopifyStore[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState<string>("")
  const [checkingStores, setCheckingStores] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const router = useRouter()

  const now = new Date()
  const hasStarted = now >= new Date(contest.startAt)
  const hasEnded = now >= new Date(contest.endAt)
  const isFull = contest.maxParticipants && contest.participants.length >= contest.maxParticipants

  // Fetch user's Shopify stores
  useEffect(() => {
    const fetchStores = async () => {
      if (!userId) {
        setCheckingStores(false)
        return
      }

      try {
        const response = await fetch(`/api/stores/all/${userId}`)
        if (response.ok) {
          const data = await response.json()
          const activeStores = data.stores.filter((store: any) => store.isActive)
          setStores(activeStores)
          
          // Auto-select first store if there's only one
          if (activeStores.length === 1) {
            setSelectedStoreId(activeStores[0].id)
          }
        } else {
          setStores([])
        }
      } catch (error) {
        console.error('Error fetching stores:', error)
        setStores([])
      } finally {
        setCheckingStores(false)
      }
    }

    fetchStores()
  }, [userId])

  const handleAddStore = () => {
    // Open connection page in popup
    const connectUrl = experienceId 
      ? `/experiences/${experienceId}/connect-shopify?returnTo=/experiences/${experienceId}/contest/${contest.slug}&popup=true`
      : `/connect-shopify?returnTo=/contest/${contest.slug}&popup=true`

    const popup = window.open(
      connectUrl,
      'shopify-connect',
      'width=600,height=700,scrollbars=yes,resizable=yes'
    )

    if (!popup) {
      setError('Popup blocked. Please allow popups and try again.')
      return
    }

    // Listen for messages from the popup
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return
      }

      if (event.data.type === 'SHOPIFY_OAUTH_SUCCESS') {
        popup.close()
        window.removeEventListener('message', handleMessage)
        // Refresh the page to show new store and update join status
        window.location.reload()
      } else if (event.data.type === 'SHOPIFY_OAUTH_ERROR') {
        popup.close()
        window.removeEventListener('message', handleMessage)
        setError(event.data.error || 'Failed to connect Shopify store')
      }
    }

    window.addEventListener('message', handleMessage)

    // Check if popup was closed without completing OAuth
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed)
        window.removeEventListener('message', handleMessage)
      }
    }, 1000)
  }

  const handleJoinClick = async () => {
    if (!userId) {
      setError("You must be logged in to join a contest")
      return
    }

    // If user doesn't have stores, prompt to add one
    if (stores.length === 0) {
      handleAddStore()
      return
    }

    // If multiple stores and none selected, show error
    if (stores.length > 1 && !selectedStoreId) {
      setError("Please select a Shopify store to use for this contest")
      return
    }

    // Proceed with joining the contest
    await handleJoin()
  }

  const handleJoin = async () => {
    setIsJoining(true)
    setError(null)

    try {
      const response = await fetch(`/api/contests/${contest.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId: selectedStoreId || stores[0]?.id
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to join contest')
      }

      // Refresh the page to update participation status
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsJoining(false)
    }
  }

  const getJoinStatus = () => {
    if (!userId) {
      return {
        canJoin: false,
        reason: "You must be logged in to join",
        icon: <Lock className="w-4 h-4" />,
        requiresShopify: false
      }
    }

    if (isParticipating) {
      return {
        canJoin: false,
        reason: "Already participating",
        icon: <CheckCircle className="w-4 h-4 text-emerald-500" />,
        requiresShopify: false
      }
    }

    if (hasEnded) {
      return {
        canJoin: false,
        reason: "Contest has ended",
        icon: <Clock className="w-4 h-4" />,
        requiresShopify: false
      }
    }

    // Check if contest has already started - REQUIREMENT 1
    if (hasStarted) {
      return {
        canJoin: false,
        reason: "Contest has already started",
        icon: <Clock className="w-4 h-4" />,
        requiresShopify: false
      }
    }

    if (isFull) {
      return {
        canJoin: false,
        reason: "Contest is full",
        icon: <Users className="w-4 h-4" />,
        requiresShopify: false
      }
    }

    if (!contest.isPublic) {
      return {
        canJoin: false,
        reason: "Private contest",
        icon: <Lock className="w-4 h-4" />,
        requiresShopify: false
      }
    }

    if (stores.length === 0) {
      return {
        canJoin: true,
        reason: "Connect your Shopify store to join",
        icon: <ShoppingBag className="w-4 h-4" />,
        requiresShopify: true
      }
    }

    return {
      canJoin: true,
      reason: `Starts ${formatDate(new Date(contest.startAt))}`,
      icon: <Clock className="w-4 h-4" />,
      requiresShopify: false
    }
  }

  const joinStatus = getJoinStatus()

  if (checkingStores) {
    return (
      <Card className="border-2 border-emerald-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mr-2"></div>
            <span className="text-sm text-gray-600">Checking eligibility...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-emerald-200">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Join Contest</span>
          {isParticipating && (
            <Badge variant="default" className="bg-emerald-500">
              Participating
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Shopify Connection Status */}
        {userId && stores.length > 0 && (
          <div className="p-3 rounded-lg border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-4 h-4" />
                <div>
                  <span className="text-sm font-medium">
                    {stores.length > 1 ? (
                      <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                        <SelectTrigger className="w-[120px]">
                          <SelectValue placeholder="Select store" />
                        </SelectTrigger>
                        <SelectContent>
                          {stores.map((store) => (
                            <SelectItem key={store.id} value={store.id}>
                              {store.shopDomain}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      stores[0].shopDomain
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Entry Fee */}
        {contest.entryFeeCents > 0 ? (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Entry Fee</span>
            </div>
            <span className="text-lg font-bold text-blue-600">
              {formatCurrency(contest.entryFeeCents)}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center p-3 bg-green-50 rounded-lg">
            <span className="text-sm font-medium text-green-900">FREE TO JOIN</span>
          </div>
        )}

        {/* Participant Count */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Participants</span>
          <span className="font-medium">
            {contest.participants.length}
            {contest.maxParticipants && ` / ${contest.maxParticipants}`}
          </span>
        </div>

        {/* Contest Status */}
        <div className="flex items-center space-x-2 text-sm">
          {joinStatus.icon}
          <span className={`${joinStatus.canJoin ? 'text-gray-600' : 'text-gray-500'}`}>
            {joinStatus.reason}
          </span>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Join Button */}
        {isParticipating ? (
          <Button disabled className="w-full" variant="outline">
            <CheckCircle className="w-4 h-4 mr-2" />
            Already Joined
          </Button>
        ) : (
          <Button
            onClick={handleJoinClick}
            disabled={!joinStatus.canJoin || isJoining}
            className="w-full"
            size="lg"
          >
            {isJoining ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Joining...
              </>
            ) : joinStatus.requiresShopify ? (
              <>
                <ShoppingBag className="w-4 h-4 mr-2" />
                Connect Shopify & Join
              </>
            ) : contest.entryFeeCents > 0 ? (
              <>
                <DollarSign className="w-4 h-4 mr-2" />
                Pay {formatCurrency(contest.entryFeeCents)} & Join
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                Join Contest
              </>
            )}
          </Button>
        )}

        {/* Additional Info */}
        {joinStatus.requiresShopify && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 text-center">
              You need a connected Shopify store to participate in sales contests
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddStore}
              className="w-full"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Connect Shopify Store
            </Button>
          </div>
        )}
        
        {/* Add More Stores for users who already have stores */}
        {stores.length > 0 && !isParticipating && (
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddStore}
              className="w-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Add Another Store
            </Button>
          </div>
        )}
        
        {contest.entryFeeCents > 0 && !isParticipating && !joinStatus.requiresShopify && (
          <p className="text-xs text-gray-500 text-center">
            Secure payment processed through Whop
          </p>
        )}
      </CardContent>
    </Card>
  )
} 