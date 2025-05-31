"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShoppingBag, ArrowRight, CheckCircle, AlertTriangle, ExternalLink } from "lucide-react"

type User = {
  name?: string
  username: string
}

interface ShopifyConnectionFlowProps {
  userId: string
  user?: User
  experienceId: string
  returnTo?: string
  userToken: string | null
}

export function ShopifyConnectionFlow({
  userId,
  user,
  experienceId,
  returnTo,
  userToken,
}: ShopifyConnectionFlowProps) {
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shopDomain, setShopDomain] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Check if this component is running in popup mode
  const isPopupMode = searchParams.get('popup') === 'true'

  const handleConnectShopify = async () => {
    if (!shopDomain.trim()) {
      setError('Please enter your shop domain')
      return
    }

    setConnecting(true)
    setError(null)

    try {
      // Clean and validate shop domain
      let cleanDomain = shopDomain.trim().toLowerCase()
      
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
      oauthUrl.searchParams.set('experienceId', experienceId)
      oauthUrl.searchParams.set('popup', 'true') // Indicate this is a popup flow
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
              const redirectUrl = returnTo || `/experiences/${experienceId}`
              window.location.href = redirectUrl
            }
          } else if (event.data.type === 'SHOPIFY_OAUTH_ERROR') {
            // Connection failed
            popup.close()
            window.removeEventListener('message', handleMessage)
            setError(event.data.error || 'Failed to connect Shopify store')
            setConnecting(false)
          }
        }

        window.addEventListener('message', handleMessage)

        // Check if popup was closed without completing OAuth
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed)
            window.removeEventListener('message', handleMessage)
            setConnecting(false)
          }
        }, 1000)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setConnecting(false)
    }
  }

  const handleSkip = () => {
    if (isPopupMode) {
      // If in popup mode, just close the popup
      window.close()
    } else {
      // Normal navigation
      const redirectUrl = returnTo || `/experiences/${experienceId}`
      router.push(redirectUrl)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <Header 
        user={user}
        experienceId={experienceId}
        showBackButton={true}
        backHref={returnTo || `/experiences/${experienceId}`}
        backLabel="Back"
      />
      
      <div className="py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Connect Your Shopify Store
            </h1>
            <p className="text-lg text-gray-600 mb-4">
              Connect your Shopify store to participate in sales contests and track your performance
            </p>
          </div>

          {/* Shop Domain Input */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5" />
                <span>Enter Your Shop Domain</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="shopDomain">Shop Domain</Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    id="shopDomain"
                    type="text"
                    placeholder="your-shop-name"
                    value={shopDomain}
                    onChange={(e) => setShopDomain(e.target.value)}
                    disabled={connecting}
                    className="flex-1"
                  />
                  <span className="text-gray-500 text-sm whitespace-nowrap">
                    .myshopify.com
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Enter just the name part (e.g., "my-store" for my-store.myshopify.com)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Connection Steps */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ShoppingBag className="w-5 h-5" />
                <span>Connection Process</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Automatic Sales Tracking</h4>
                    <p className="text-sm text-gray-600">
                      We automatically track your sales and orders during contest periods
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Real-time Leaderboards</h4>
                    <p className="text-sm text-gray-600">
                      See your ranking update in real-time as you make sales
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Secure & Private</h4>
                    <p className="text-sm text-gray-600">
                      We only access sales data during active contests you've joined
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="mb-6 border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-900">Connection Failed</h4>
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="space-y-4">
            <Button
              onClick={handleConnectShopify}
              disabled={connecting || !shopDomain.trim()}
              className="w-full"
              size="lg"
            >
              {connecting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Redirecting to Shopify...
                </>
              ) : (
                <>
                  <ShoppingBag className="w-5 h-5 mr-2" />
                  Connect to Shopify
                  <ExternalLink className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
            
            <Button
              onClick={handleSkip}
              variant="outline"
              className="w-full"
              disabled={connecting}
            >
              Skip for Now
            </Button>
          </div>

          {/* Security Note */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">Secure Connection</h4>
                <p className="text-sm text-blue-800">
                  Your Shopify credentials are encrypted and stored securely. We only request read access to orders and never store sensitive payment information.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 