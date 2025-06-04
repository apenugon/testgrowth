"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { ShoppingBag, Plus, Trash2, ExternalLink, AlertTriangle, Download } from "lucide-react"

type ShopifyStore = {
  id: string
  shopDomain: string
  isActive: boolean
  createdAt: string
  lastSyncAt?: string
}

interface ShopifyConnectionsClientProps {
  userId: string
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

export function ShopifyConnectionsClient({ userId }: ShopifyConnectionsClientProps) {
  const [stores, setStores] = useState<ShopifyStore[]>([])
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [storeToDisconnect, setStoreToDisconnect] = useState<ShopifyStore | null>(null)
  const [showInstallModal, setShowInstallModal] = useState(false)
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
    // If user has no stores, show install modal first
    if (stores.length === 0) {
      setShowInstallModal(true)
      return
    }

    // If user already has stores, proceed with OAuth popup
    handleConnectExistingStore()
  }

  const handleConnectExistingStore = () => {
    // Open connection page in popup
    const connectUrl = `/connect-shopify?returnTo=/shopify-connections&popup=true`

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

  const handleInstallApp = () => {
    // Redirect to Shopify App Store
    window.location.href = 'https://apps.shopify.com/growth-arena'
  }

  const handleDisconnectClick = (store: ShopifyStore) => {
    setStoreToDisconnect(store)
  }

  const handleDisconnectConfirm = async () => {
    if (!storeToDisconnect) return

    setDisconnecting(storeToDisconnect.id)
    setError(null)

    try {
      const response = await fetch(`/api/stores/disconnect/${storeToDisconnect.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setStores(stores.filter(store => store.id !== storeToDisconnect.id))
        setStoreToDisconnect(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to disconnect store')
      }
    } catch (err) {
      setError('Failed to disconnect store')
    } finally {
      setDisconnecting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="text-sm text-red-800">{error}</div>
          </div>
        </div>
      )}

      {/* Add Connection Button */}
      <div className="text-center">
        <Button 
          onClick={handleAddConnection}
          className="inline-flex items-center px-6 py-3"
        >
          <Plus className="w-4 h-4 mr-2" />
          {stores.length === 0 ? "Connect Your First Store" : "Connect New Store"}
        </Button>
      </div>

      {/* Connected Stores */}
      {stores.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No stores connected</h3>
            <p className="text-gray-500 mb-4">
              Connect your Shopify store to participate in sales contests
            </p>
            <Button onClick={handleAddConnection}>
              <Plus className="w-4 h-4 mr-2" />
              Connect Your First Store
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
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

      {/* Install App Modal */}
      <Dialog open={showInstallModal} onOpenChange={setShowInstallModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Download className="w-5 h-5 text-emerald-600" />
              <span>Install Growth Arena App</span>
            </DialogTitle>
            <DialogDescription className="text-left space-y-3 pt-2">
              <p>
                Before connecting your store, you need to install the Growth Arena app from the Shopify App Store.
              </p>
              <p className="text-sm text-gray-600">
                After installation, you'll be redirected back here to complete the connection.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-3 pt-4">
            <Button 
              onClick={handleInstallApp}
              className="w-full"
              size="lg"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Install from Shopify App Store
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowInstallModal(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={!!storeToDisconnect} onOpenChange={() => setStoreToDisconnect(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Store</DialogTitle>
            <DialogDescription>
              Are you sure you want to disconnect {storeToDisconnect?.shopDomain}? 
              This will remove access to order data and you won't be able to participate 
              in contests with this store.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 mt-6">
            <Button 
              variant="outline" 
              onClick={() => setStoreToDisconnect(null)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDisconnectConfirm}
              disabled={!!disconnecting}
            >
              {disconnecting ? 'Disconnecting...' : 'Disconnect'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 