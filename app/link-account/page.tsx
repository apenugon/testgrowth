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
import { Footer } from "@/components/layout/footer"
import { Trophy, Eye, EyeOff, ShoppingBag, CheckCircle, UserCheck, UserPlus } from "lucide-react"

function LinkAccountForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get the store information and return URL from search params
  const storeInfo = searchParams.get('store')
  const returnTo = searchParams.get('returnTo')
  const tempUserId = searchParams.get('tempUserId')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
      const body = mode === 'login' 
        ? { email, password }
        : { 
            email, 
            password, 
            name: name || undefined,
            username: username || undefined
          }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        // Link the temporary store connection to this user account
        if (tempUserId) {
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

        // Redirect to the return URL or default location
        const redirectUrl = returnTo || '/'
        window.location.href = redirectUrl
      } else {
        const data = await response.json()
        setError(data.error || `${mode === 'login' ? 'Login' : 'Registration'} failed`)
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
          Complete Your Setup
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Link your Shopify store to your Growth Arena account
        </p>
      </div>

      {/* Store Connection Success */}
      {storeInfo && (
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
                  Now link it to your Growth Arena account to start competing.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mode Toggle */}
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            mode === 'login'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <UserCheck className="w-4 h-4 inline mr-2" />
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setMode('register')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            mode === 'register'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <UserPlus className="w-4 h-4 inline mr-2" />
          Create Account
        </button>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">
            {mode === 'login' ? 'Sign In to Your Account' : 'Create Your Account'}
          </CardTitle>
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
              <Label htmlFor="password">
                {mode === 'login' ? 'Password*' : 'Create Password*'}
              </Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === 'login' ? "current-password" : "new-password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'login' ? "Enter your password" : "Create a password (min 8 characters)"}
                  minLength={mode === 'register' ? 8 : undefined}
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

            {/* Additional fields for registration */}
            {mode === 'register' && (
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
              {loading ? (
                mode === 'login' ? "Signing in..." : "Creating account..."
              ) : (
                mode === 'login' ? "Sign In & Link Store" : "Create Account & Link Store"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          By proceeding, you agree to link your Shopify store to Growth Arena and participate in sales contests.
        </p>
      </div>
    </div>
  )
}

export default function LinkAccountPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex flex-col">
      <Header user={undefined} />
      
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 flex-1">
        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        }>
          <LinkAccountForm />
        </Suspense>
      </div>
      
      <Footer />
    </div>
  )
} 