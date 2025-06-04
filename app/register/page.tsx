"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Header } from "@/components/layout/header"
import { Trophy, Eye, EyeOff, ShoppingBag, CheckCircle } from "lucide-react"

function RegisterForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
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
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          email, 
          password, 
          name: name || undefined,
          username: username || undefined
        }),
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
        setError(data.error || "Registration failed")
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
          {isFromShopifyInstall ? "Complete Your Setup" : "Join Growth Arena"}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {isFromShopifyInstall 
            ? "Create your Growth Arena account to connect your Shopify store"
            : "Create your account to participate in sales contests"
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
                  Great! You've successfully installed the Growth Arena app. 
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
                    <span className="text-xs">Step 2: Create Growth Arena account</span>
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

      {/* Registration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Sign Up</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="email">Email address*</Label>
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
              <Label htmlFor="password">Password*</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password (min 8 characters)"
                  minLength={8}
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

            <div>
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
                placeholder="Enter your full name (optional)"
              />
            </div>

            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1"
                placeholder="Choose a username (optional)"
                minLength={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                If not provided, we'll use the part before @ in your email
              </p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Creating account..." : (
                isFromShopifyInstall ? "Create account & Connect Store" : "Create account"
              )}
            </Button>
          </form>

          <div className="mt-6">
            <div className="text-center">
              <span className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link 
                  href={isFromShopifyInstall ? "/login?shopify=install" : "/login"} 
                  className="font-medium text-emerald-600 hover:text-emerald-500"
                >
                  Sign in
                </Link>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          By creating an account, you agree to participate in our sales contests and competition platform.
        </p>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <Header user={undefined} />
      
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        }>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  )
} 