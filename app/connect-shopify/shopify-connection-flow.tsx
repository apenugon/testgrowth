"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ShoppingBag, ArrowRight, CheckCircle, AlertTriangle, ExternalLink, Trophy, Plus } from "lucide-react"

type User = {
  name?: string
  username?: string
  email: string
}

interface ShopifyConnectionFlowProps {
  userId: string
  user: User
  returnTo?: string
}

export function ShopifyConnectionFlow({
  userId,
  user,
  returnTo,
}: ShopifyConnectionFlowProps) {
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shopDomain, setShopDomain] = useState('')
  const [hasExistingStores, setHasExistingStores] = useState(false)
  const [loadingStores, setLoadingStores] = useState(true)
  const [autoConnecting, setAutoConnecting] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Check if this component is running in popup mode
  const isPopupMode = searchParams.get('popup') === 'true'
  
  // Check if this is auto-connect from Shopify installation
  const isAutoConnect = searchParams.get('auto') === 'true'
  const prefilledShop = searchParams.get('shop')

  // Check for existing stores on component mount
  useEffect(() => {
    const checkExistingStores = async () => {
      try {
        const response = await fetch(`/api/stores/all/${userId}`)
        if (response.ok) {
          const data = await response.json()
          setHasExistingStores((data.stores || []).length > 0)
        }
      } catch (error) {
        console.error('Error checking existing stores:', error)
      } finally {
        setLoadingStores(false)
      }
    }

    checkExistingStores()
  }, [userId])

  // Pre-fill shop domain if provided
  useEffect(() => {
    if (prefilledShop) {
      setShopDomain(prefilledShop)
    }
  }, [prefilledShop])

  // Auto-connect if auto=true and shop is provided
  useEffect(() => {
    if (isAutoConnect && prefilledShop && !loadingStores && !autoConnecting) {
      console.log('Auto-connecting to shop:', prefilledShop)
      setAutoConnecting(true)
      
      // Small delay to show the UI before starting connection
      setTimeout(() => {
        handleConnectShopify(true)
      }, 1000)
    }
  }, [isAutoConnect, prefilledShop, loadingStores, autoConnecting])

  const handleConnectShopify = async (isAutoConnect = false) => {
    const domain = isAutoConnect ? prefilledShop : shopDomain
    
    if (!domain?.trim()) {
      setError('Please enter your shop domain')
      return
    }

    setConnecting(true)
    setError(null)

    try {
      // Clean and validate shop domain
      let cleanDomain = domain.trim().toLowerCase()
      
      // Remove protocol if present
      cleanDomain = cleanDomain.replace(/^https?:\/\//, '')
      
      // Remove .myshopify.com if present (we'll add it back)
      cleanDomain = cleanDomain.replace(/\.myshopify\.com$/, '')
      
      // Validate domain format (basic alphanumeric and hyphens)
      if (!/^[a-zA-Z0-9-]+$/.test(cleanDomain)) {
        throw new Error('Invalid shop domain format')
      }

      // Build OAuth initiation URL
      const oauthUrl = new URL('/api/auth/shopify', window.location.origin)
      oauthUrl.searchParams.set('shop', cleanDomain)
      oauthUrl.searchParams.set('userId', userId)
      
      // For auto-connect or non-popup mode, use redirect instead of popup
      if (isAutoConnect || searchParams.get('auto') === 'true') {
        // Use redirect flow for app installation
        if (returnTo) {
          oauthUrl.searchParams.set('returnTo', returnTo)
        }
        
        // Redirect directly to OAuth (no popup)
        window.location.href = oauthUrl.toString()
        return
      }

      // Legacy popup flow for manual connections
      oauthUrl.searchParams.set('popup', 'true')
      if (returnTo) {
        oauthUrl.searchParams.set('returnTo', returnTo)
      }

      if (isPopupMode) {
        // If we're already in a popup, navigate this window to Shopify OAuth
        window.location.href = oauthUrl.toString()
      } else {
        // If not in popup mode, use the original popup flow
        const popup = window.open(
          oauthUrl.toString(),
          'shopify-oauth',
          'width=500,height=600,scrollbars=yes,resizable=yes'
        )

        if (!popup) {
          throw new Error('Popup blocked. Please allow popups and try again.')
        }

        // Listen for messages from the popup
        const handleMessage = (event: MessageEvent) => {
          // Ensure message is from our domain
          if (event.origin !== window.location.origin) {
            return
          }

          if (event.data.type === 'SHOPIFY_OAUTH_SUCCESS') {
            // Connection successful
            popup.close()
            window.removeEventListener('message', handleMessage)
            
            if (isPopupMode) {
              // If we're in popup mode, send success message to parent and close
              if (window.opener) {
                window.opener.postMessage({
                  type: 'SHOPIFY_OAUTH_SUCCESS'
                }, window.location.origin)
              }
              window.close()
            } else {
              // Normal redirect
              const redirectUrl = returnTo || '/'
              window.location.href = redirectUrl
            }
          } else if (event.data.type === 'SHOPIFY_OAUTH_ERROR') {
            // Connection failed
            popup.close()
            window.removeEventListener('message', handleMessage)
            setError(event.data.error || 'Failed to connect Shopify store')
            setConnecting(false)
            setAutoConnecting(false)
          }
        }

        window.addEventListener('message', handleMessage)

        // Check if popup was closed without completing OAuth
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed)
            window.removeEventListener('message', handleMessage)
            setConnecting(false)
            setAutoConnecting(false)
          }
        }, 1000)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setConnecting(false)
      setAutoConnecting(false)
    }
  }

  if (loadingStores) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
        <Header user={{
          name: user.name || undefined,
          username: user.username || user.email.split('@')[0]
        }} />
        
        <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
        </div>
      </div>
    )
  }

  const isButtonDisabled = connecting || 
    (!shopDomain.trim() && !(prefilledShop?.trim())) || 
    (isAutoConnect && autoConnecting)

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <Header user={{
        name: user.name || undefined,
        username: user.username || user.email.split('@')[0]
      }} />
      
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Logo and Title */}
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              {isAutoConnect 
                ? "Connecting Your Store" 
                : hasExistingStores 
                  ? "Connect Another Store" 
                  : "Connect Your Shopify Store"
              }
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {isAutoConnect 
                ? `Automatically connecting ${prefilledShop}.myshopify.com`
                : hasExistingStores 
                  ? "Add another Shopify store to your Growth Arena account"
                  : "Connect your Shopify store to participate in sales contests"
              }
            </p>
          </div>

          {/* Auto-connect progress */}
          {isAutoConnect && autoConnecting && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <div className="text-sm">
                    <h4 className="font-medium text-blue-900 mb-1">Setting up your store connection...</h4>
                    <p className="text-blue-700">
                      Please authorize the connection in the popup window.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Connection Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Store Connection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div>
                <Label htmlFor="shopDomain">Shop Domain</Label>
                <div className="mt-1 relative">
                  <Input
                    id="shopDomain"
                    type="text"
                    placeholder="your-store-name"
                    value={shopDomain}
                    onChange={(e) => setShopDomain(e.target.value)}
                    className="pr-32"
                    disabled={connecting || (isAutoConnect && Boolean(prefilledShop))}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-gray-500">
                    .myshopify.com
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {isAutoConnect && prefilledShop 
                    ? "Store domain detected from installation"
                    : "Enter your Shopify store name (e.g., \"my-store\" for my-store.myshopify.com)"
                  }
                </p>
              </div>

              <Button
                onClick={() => handleConnectShopify()}
                disabled={isButtonDisabled}
                className="w-full"
                size="lg"
              >
                {connecting || (isAutoConnect && autoConnecting) ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isAutoConnect ? "Auto-connecting..." : "Connecting..."}
                  </div>
                ) : (
                  <div className="flex items-center">
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Connect Shopify Store
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                )}
              </Button>

              {/* Info Section */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="text-sm">
                    <h4 className="font-medium text-blue-900 mb-1">What happens next?</h4>
                    <ul className="text-blue-700 space-y-1 list-disc list-inside ml-2">
                      <li>You'll be redirected to Shopify to authorize the connection</li>
                      <li>We'll securely connect to your store's order data</li>
                      <li>You can then join sales contests and track your performance</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Existing stores notice */}
              {hasExistingStores && !isAutoConnect && (
                <div className="text-center pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-3">
                    You already have stores connected to your account.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.location.href = '/shopify-connections'}
                    className="text-emerald-600 border-emerald-600 hover:bg-emerald-50"
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    Manage Existing Stores
                  </Button>
                </div>
              )}

              {/* Install App Link - Only show if user has no stores and not auto-connecting */}
              {!hasExistingStores && !isAutoConnect && (
                <div className="text-center pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-3">
                    Don't have our app installed yet?
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.open('https://apps.shopify.com/growth-arena', '_blank')}
                    className="text-emerald-600 border-emerald-600 hover:bg-emerald-50"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Install from Shopify App Store
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 