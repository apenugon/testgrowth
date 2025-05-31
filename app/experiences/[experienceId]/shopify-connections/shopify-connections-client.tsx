"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, ShoppingBag, ExternalLink, Trash2, AlertTriangle } from "lucide-react"
import { formatDate } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type ShopifyStore = {
  id: string
  shopDomain: string
  isActive: boolean
  createdAt: string
  lastSyncAt?: string
  activeContests?: Array<{
    id: string
    name: string
    endAt: string
  }>
}

interface ShopifyConnectionsClientProps {
  userId: string
  experienceId: string
}

export function ShopifyConnectionsClient({ userId, experienceId }: ShopifyConnectionsClientProps) {
  const [stores, setStores] = useState<ShopifyStore[]>([])
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [storeToDisconnect, setStoreToDisconnect] = useState<ShopifyStore | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStores()
  }, [userId])

  const fetchStores = async () => {
    try {
      const response = await fetch(`/api/stores/all/${userId}`)
      if (response.ok) {
        const data = await response.json()
        setStores(data.stores || [])
      } else {
        console.error('Failed to fetch stores')
        setStores([])
      }
    } catch (error) {
      console.error('Error fetching stores:', error)
      setStores([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddConnection = () => {
    // Open connection page in popup
    const connectUrl = `/experiences/${experienceId}/connect-shopify?returnTo=/experiences/${experienceId}/shopify-connections&popup=true`

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
        // Refresh the stores list
        fetchStores()
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

  const handleDisconnectClick = (store: ShopifyStore) => {
    setStoreToDisconnect(store)
  }

  const confirmDisconnect = async () => {
    if (!storeToDisconnect) return

    setDisconnecting(storeToDisconnect.id)
    setError(null)

    try {
      const response = await fetch('/api/stores/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          storeId: storeToDisconnect.id
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Remove the store from the list
        setStores(stores.filter(s => s.id !== storeToDisconnect.id))
        
        // Show success message with details about contest removals
        if (data.removedFromContests && data.removedFromContests.length > 0) {
          const contestNames = data.removedFromContests.map((c: any) => c.name).join(', ')
          alert(`Store disconnected successfully! You have been removed from ${data.removedFromContests.length} contest(s): ${contestNames}`)
        } else {
          alert('Store disconnected successfully!')
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to disconnect store')
      }
    } catch (err) {
      setError('Failed to disconnect store')
    } finally {
      setDisconnecting(null)
      setStoreToDisconnect(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mr-3"></div>
        <span className="text-gray-600">Loading connections...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Add Connection Button */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Add New Connection
              </h3>
              <p className="text-gray-600">
                Connect additional Shopify stores to participate in contests
              </p>
            </div>
            <Button onClick={handleAddConnection}>
              <Plus className="w-4 h-4 mr-2" />
              Connect Store
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Connected Stores */}
      {stores.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Connected Stores</h3>
            <p className="text-gray-600 mb-6">
              Connect your first Shopify store to start participating in sales contests
            </p>
            <Button onClick={handleAddConnection}>
              <Plus className="w-4 h-4 mr-2" />
              Connect Your First Store
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Connected Stores ({stores.length})
          </h3>
          
          {stores.map((store) => (
            <Card key={store.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="flex items-center space-x-2">
                        <ShoppingBag className="w-5 h-5 text-emerald-600" />
                        <h4 className="text-lg font-medium text-gray-900">
                          {store.shopDomain}
                        </h4>
                      </div>
                      <Badge variant={store.isActive ? "default" : "secondary"}>
                        {store.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Connected: {formatDate(new Date(store.createdAt))}</p>
                      {store.lastSyncAt && (
                        <p>Last sync: {formatDate(new Date(store.lastSyncAt))}</p>
                      )}
                    </div>

                    {/* Show warning if store is used in active contests */}
                    {store.activeContests && store.activeContests.length > 0 && (
                      <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-orange-800">
                              Active in {store.activeContests.length} contest{store.activeContests.length !== 1 ? 's' : ''}
                            </p>
                            <p className="text-xs text-orange-700 mt-1">
                              Disconnecting will remove you from these contests:
                            </p>
                            <ul className="text-xs text-orange-700 mt-1 ml-4">
                              {store.activeContests.map(contest => (
                                <li key={contest.id}>
                                  • {contest.name} (ends {formatDate(new Date(contest.endAt))})
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 ml-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`https://${store.shopDomain}`, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Visit Store
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnectClick(store)}
                      disabled={disconnecting === store.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {disconnecting === store.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-1" />
                          Disconnect
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog open={!!storeToDisconnect} onOpenChange={() => setStoreToDisconnect(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Shopify Store</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect "{storeToDisconnect?.shopDomain}"?
              
              {storeToDisconnect?.activeContests && storeToDisconnect.activeContests.length > 0 && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800">
                        Warning: You will be removed from {storeToDisconnect.activeContests.length} active contest{storeToDisconnect.activeContests.length !== 1 ? 's' : ''}
                      </p>
                      <ul className="text-xs text-red-700 mt-1">
                        {storeToDisconnect.activeContests.map(contest => (
                          <li key={contest.id}>• {contest.name}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDisconnect}
              className="bg-red-600 hover:bg-red-700"
            >
              {storeToDisconnect?.activeContests && storeToDisconnect.activeContests.length > 0 
                ? "Remove from Contests & Disconnect"
                : "Disconnect Store"
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 