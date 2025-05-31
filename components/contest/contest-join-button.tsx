"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, DollarSign, CheckCircle, Clock, Lock, ShoppingBag } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"

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

interface ContestJoinButtonProps {
  contest: Contest
  userId?: string | null
  isParticipating: boolean
  experienceId?: string
}

export function ContestJoinButton({ contest, userId, isParticipating, experienceId }: ContestJoinButtonProps) {
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasShopifyStore, setHasShopifyStore] = useState<boolean | null>(null)
  const [storeDetails, setStoreDetails] = useState<{id: string, shopDomain: string} | null>(null)
  const [checkingStore, setCheckingStore] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const router = useRouter()

  const now = new Date()
  const hasStarted = now >= new Date(contest.startAt)
  const hasEnded = now >= new Date(contest.endAt)
  const isFull = contest.maxParticipants && contest.participants.length >= contest.maxParticipants

  // Check if user has connected Shopify store
  useEffect(() => {
    const checkShopifyConnection = async () => {
      if (!userId) {
        setCheckingStore(false)
        return
      }

      try {
        const response = await fetch(`/api/stores/check/${userId}`)
        if (response.ok) {
          const data = await response.json()
          setHasShopifyStore(data.hasStore)
          if (data.hasStore && data.store) {
            setStoreDetails(data.store)
          }
        } else {
          setHasShopifyStore(false)
        }
      } catch (error) {
        console.error('Error checking Shopify connection:', error)
        setHasShopifyStore(false)
      } finally {
        setCheckingStore(false)
      }
    }

    checkShopifyConnection()
  }, [userId])

  const handleDisconnectStore = async () => {
    if (!userId) return

    setDisconnecting(true)
    setError(null)

    try {
      const response = await fetch('/api/stores/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          storeId: storeDetails?.id
        }),
      })

      if (response.ok) {
        setHasShopifyStore(false)
        setStoreDetails(null)
        // Optionally show success message
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to disconnect store')
      }
    } catch (err) {
      setError('Failed to disconnect store')
    } finally {
      setDisconnecting(false)
    }
  }

  const handleJoinClick = async () => {
    if (!userId) {
      setError("You must be logged in to join a contest")
      return
    }

    // If user doesn't have a Shopify store, open popup for connection
    if (hasShopifyStore === false) {
      openShopifyConnectionPopup()
      return
    }

    // Proceed with joining the contest
    await handleJoin()
  }

  const openShopifyConnectionPopup = () => {
    setIsJoining(true)
    setError(null)

    // Build OAuth initiation URL
    const oauthUrl = new URL('/api/auth/shopify', window.location.origin)
    oauthUrl.searchParams.set('shop', 'placeholder') // Will be prompted in popup
    oauthUrl.searchParams.set('userId', userId!)
    oauthUrl.searchParams.set('popup', 'true')
    if (experienceId) {
      oauthUrl.searchParams.set('experienceId', experienceId)
      oauthUrl.searchParams.set('returnTo', `/experiences/${experienceId}/contest/${contest.slug}`)
    }

    // Open connection page in popup instead of direct OAuth
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
      setIsJoining(false)
      return
    }

    // Listen for messages from the popup
    const handleMessage = (event: MessageEvent) => {
      // Ensure message is from our domain
      if (event.origin !== window.location.origin) {
        return
      }

      if (event.data.type === 'SHOPIFY_OAUTH_SUCCESS') {
        // Connection successful - refresh store status
        popup.close()
        window.removeEventListener('message', handleMessage)
        
        // Refresh the component to show new connection status
        window.location.reload()
      } else if (event.data.type === 'SHOPIFY_OAUTH_ERROR') {
        // Connection failed
        popup.close()
        window.removeEventListener('message', handleMessage)
        setError(event.data.error || 'Failed to connect Shopify store')
        setIsJoining(false)
      }
    }

    window.addEventListener('message', handleMessage)

    // Check if popup was closed without completing OAuth
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed)
        window.removeEventListener('message', handleMessage)
        setIsJoining(false)
      }
    }, 1000)
  }

  const handleJoin = async () => {
    setIsJoining(true)
    setError(null)

    try {
      // TODO: Implement contest joining API
      const response = await fetch(`/api/contests/${contest.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

    if (hasShopifyStore === false) {
      return {
        canJoin: true,
        reason: "Connect your Shopify store to join",
        icon: <ShoppingBag className="w-4 h-4" />,
        requiresShopify: true
      }
    }

    if (!hasStarted) {
      return {
        canJoin: true,
        reason: `Starts ${formatDate(new Date(contest.startAt))}`,
        icon: <Clock className="w-4 h-4" />,
        requiresShopify: false
      }
    }

    return {
      canJoin: true,
      reason: "Ready to join",
      icon: <Users className="w-4 h-4" />,
      requiresShopify: false
    }
  }

  const joinStatus = getJoinStatus()

  if (checkingStore) {
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
        {userId && hasShopifyStore !== null && (
          <div className={`p-3 rounded-lg border ${
            hasShopifyStore 
              ? 'bg-green-50 border-green-200' 
              : 'bg-orange-50 border-orange-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShoppingBag className={`w-4 h-4 ${hasShopifyStore ? 'text-green-600' : 'text-orange-600'}`} />
                <div>
                  <span className={`text-sm font-medium ${hasShopifyStore ? 'text-green-900' : 'text-orange-900'}`}>
                    {hasShopifyStore ? 'Store Connected' : 'No Store Connected'}
                  </span>
                  {hasShopifyStore && storeDetails && (
                    <p className="text-xs text-green-700 mt-0.5">
                      {storeDetails.shopDomain}
                    </p>
                  )}
                </div>
              </div>
              
              {hasShopifyStore && storeDetails && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnectStore}
                  disabled={disconnecting}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                >
                  {disconnecting ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                  ) : (
                    'Disconnect'
                  )}
                </Button>
              )}
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
            <span className="text-sm font-medium text-green-900">Free to Join</span>
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
          <p className="text-xs text-gray-500 text-center">
            You need a connected Shopify store to participate in sales contests
          </p>
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