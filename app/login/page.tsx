"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Trophy, Eye, EyeOff, ShoppingBag, CheckCircle } from "lucide-react"

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Check if this is from Shopify app installation
  const isFromShopifyInstall = searchParams.get('shopify') === 'install'
  const shopDomain = searchParams.get('shop')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // If from Shopify install, redirect to connections page
        if (isFromShopifyInstall) {
          if (shopDomain) {
            // Auto-connect to specific shop
            const connectUrl = new URL('/connect-shopify', window.location.origin)
            connectUrl.searchParams.set('shop', shopDomain)
            connectUrl.searchParams.set('auto', 'true')
            window.location.href = connectUrl.toString()
          } else {
            // Manual connection
            window.location.href = '/shopify-connections'
          }
        } else {
          // Redirect to the page they were trying to access or home
          const redirect = searchParams.get('redirect') || '/'
          window.location.href = redirect
        }
      } else {
        const data = await response.json()
        setError(data.error || "Login failed")
      }
    } catch (err) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md w-full space-y-8">
      {/* Logo and Title */}
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900">
          {isFromShopifyInstall ? "Welcome back!" : "Welcome back"}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {isFromShopifyInstall 
            ? "Sign in to complete your Shopify store connection"
            : "Sign in to your Growth Arena account"
          }
        </p>
      </div>

      {/* Shopify Installation Flow Info */}
      {isFromShopifyInstall && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <ShoppingBag className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <h4 className="font-medium text-blue-900 mb-1">Shopify App Installed!</h4>
                <p className="text-blue-700 mb-2">
                  Sign in to your existing account to connect your store.
                </p>
                <div className="space-y-1">
                  <div className="flex items-center text-blue-700">
                    <CheckCircle className="w-3 h-3 mr-2" />
                    <span className="text-xs">Step 1: Install Shopify app ✓</span>
                  </div>
                  <div className="flex items-center text-blue-700">
                    <div className="w-3 h-3 mr-2 border border-blue-600 rounded-full flex items-center justify-center">
                      <div className="w-1 h-1 bg-blue-600 rounded-full"></div>
                    </div>
                    <span className="text-xs">Step 2: Sign in to Growth Arena</span>
                  </div>
                  <div className="flex items-center text-blue-600">
                    <div className="w-3 h-3 mr-2 border border-blue-400 rounded-full"></div>
                    <span className="text-xs">Step 3: Connect your store</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Login Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Log In</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Signing in..." : (
                isFromShopifyInstall ? "Sign in & Connect Store" : "Sign in"
              )}
            </Button>
          </form>

          <div className="mt-6">
            <div className="text-center">
              <span className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link 
                  href={isFromShopifyInstall ? "/register?shopify=install" : "/register"} 
                  className="font-medium text-emerald-600 hover:text-emerald-500"
                >
                  Sign up
                </Link>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          By signing in, you agree to participate in our sales contests and competition platform.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex flex-col">
      <Header user={undefined} />
      
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 flex-1">
        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        }>
          <LoginForm />
        </Suspense>
      </div>
      
      <Footer />
    </div>
  )
} 