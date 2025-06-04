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
import { Trophy, Eye, EyeOff, CheckCircle } from "lucide-react"

export const dynamic = 'force-dynamic'

function SignInForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showOptionalFields, setShowOptionalFields] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // OAuth flow parameters
  const storeInfo = searchParams.get('store')
  const tempUserId = searchParams.get('tempUserId')
  const returnTo = searchParams.get('returnTo')
  const isFromOAuth = !!(storeInfo && tempUserId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/auth/signin", {
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
        
        // If from OAuth flow, link the temporary store connection
        if (isFromOAuth && tempUserId) {
          try {
            await fetch('/api/auth/link-store', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ tempUserId }),
            })
          } catch (linkError) {
            console.error('Failed to link store:', linkError)
            // Continue even if linking fails
          }
        }
        
        // Redirect to return URL or home
        const redirectUrl = returnTo || '/'
        window.location.href = redirectUrl
      } else {
        const data = await response.json()
        setError(data.error || "Authentication failed")
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
          {isFromOAuth ? "Complete Your Setup" : "Welcome to Growth Arena"}
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {isFromOAuth 
            ? "Enter your details to link your Shopify store and start competing"
            : "Sign in to your account or create a new one"
          }
        </p>
      </div>

      {/* Store Connection Info for OAuth Flow */}
      {isFromOAuth && storeInfo && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <h4 className="font-medium text-green-900 mb-1">Shopify Store Connected!</h4>
                <p className="text-green-700 mb-2">
                  Successfully connected <strong>{storeInfo}</strong>
                </p>
                <p className="text-green-700 text-xs">
                  Enter your details below to complete the setup and start competing.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sign In Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">Sign In</CardTitle>
          <p className="text-sm text-gray-600 text-center">
            Enter your email and password. We'll create an account if you're new!
          </p>
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
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
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
              <p className="text-xs text-gray-500 mt-1">
                Minimum 8 characters
              </p>
            </div>

            {/* Optional Fields Toggle */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowOptionalFields(!showOptionalFields)}
                className="text-sm text-emerald-600 hover:text-emerald-500 underline"
              >
                {showOptionalFields ? 'Hide' : 'Add'} optional details
              </button>
            </div>

            {/* Optional Fields */}
            {showOptionalFields && (
              <>
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
              </>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Processing..." : (
                isFromOAuth ? "Complete Setup" : "Continue"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          By continuing, you agree to participate in our sales contests and competition platform.
        </p>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex flex-col">
      <Header user={undefined} />
      
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 flex-1">
        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        }>
          <SignInForm />
        </Suspense>
      </div>
      
      <Footer />
    </div>
  )
} 