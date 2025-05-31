"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShoppingBag, Plus, Trash2, ExternalLink, AlertTriangle } from "lucide-react"

type User = {
  name?: string
  username: string
}

type Experience = {
  id: string
  name: string
}

interface ShopifyStore {
  id: string
  shopDomain: string
  isActive: boolean
}

interface StoresManagementClientProps {
  userId: string
  user?: User
  experience: Experience
  experienceId: string
  userToken: string | null
}

export function StoresManagementClient({
  userId,
  user,
  experience,
  experienceId,
  userToken,
}: StoresManagementClientProps) {
  const [stores, setStores] = useState<ShopifyStore[]>([])
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    fetchStores()
  }, [userId])

  const fetchStores = async () => {
    try {
      const response = await fetch(`/api/stores/check/${userId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.hasStore && data.store) {
          setStores([data.store])
        } else {
          setStores([])
        }
      } else {
        setStores([])
      }
    } catch (error) {
      console.error('Error fetching stores:', error)
      setError('Failed to load stores')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnectStore = async (storeId: string) => {
    setDisconnecting(storeId)
    setError(null)

    try {
      const response = await fetch('/api/stores/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          storeId
        }),
      })

      if (response.ok) {
        setStores(stores.filter(store => store.id !== storeId))
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

  const handleConnectStore = () => {
    const connectUrl = `/experiences/${experienceId}/connect-shopify?returnTo=/experiences/${experienceId}/stores&popup=true`
    
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
      // Ensure message is from our domain
      if (event.origin !== window.location.origin) {
        return
      }

      if (event.data.type === 'SHOPIFY_OAUTH_SUCCESS') {
        // Connection successful - refresh store list
        popup.close()
        window.removeEventListener('message', handleMessage)
        fetchStores() // Refresh the stores list
      } else if (event.data.type === 'SHOPIFY_OAUTH_ERROR') {
        // Connection failed
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
        <Header 
          user={user}
          experienceId={experienceId}
          showBackButton={true}
          backHref={`/experiences/${experienceId}`}
          backLabel="Back to Contests"
        />
        <div className="py-8 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading stores...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <Header 
        user={user}
        experienceId={experienceId}
        showBackButton={true}
        backHref={`/experiences/${experienceId}`}
        backLabel="Back to Contests"
      />
      
      <div className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Shopify Stores
            </h1>
            <p className="text-lg text-gray-600">
              Manage your connected Shopify stores for {experience.name}
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-900">Error</h4>
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Connected Stores */}
          {stores.length > 0 ? (
            <div className="space-y-4 mb-6">
              {stores.map((store) => (
                <Card key={store.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <ShoppingBag className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{store.shopDomain}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant={store.isActive ? "default" : "secondary"}>
                              {store.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
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
                          onClick={() => handleDisconnectStore(store.id)}
                          disabled={disconnecting === store.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {disconnecting === store.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 mr-1"></div>
                              Disconnecting...
                            </>
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
          ) : (
            <Card className="mb-6">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Stores Connected
                </h3>
                <p className="text-gray-600 mb-4">
                  Connect your Shopify store to participate in sales contests and track your performance.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Connect New Store */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Plus className="w-5 h-5" />
                <span>Connect New Store</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Connect another Shopify store to your account to participate in more contests.
              </p>
              <Button onClick={handleConnectStore}>
                <Plus className="w-4 h-4 mr-2" />
                Connect Shopify Store
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 