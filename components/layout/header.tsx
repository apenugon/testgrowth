"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Trophy, 
  ChevronLeft,
  Menu,
  Settings,
  ShoppingBag,
  Shield,
  LogOut
} from "lucide-react"
import { useState } from "react"

interface HeaderProps {
  user?: {
    name?: string | null
    username: string
  }
  experienceId?: string
  showBackButton?: boolean
  backHref?: string
  backLabel?: string
  isCreatorMode?: boolean
  isAdmin?: boolean
  isWhitelistedCreator?: boolean
}

export function Header({ 
  user, 
  experienceId, 
  showBackButton = false, 
  backHref, 
  backLabel = "Back",
  isCreatorMode = false,
  isAdmin = false,
  isWhitelistedCreator = false
}: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()

  const homeHref = experienceId ? `/experiences/${experienceId}` : "/"

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      })

      if (response.ok) {
        // Redirect to home page after logout
        window.location.href = '/'
      } else {
        console.error('Logout failed')
      }
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Logo and Back Button */}
          <div className="flex items-center space-x-4">
            {showBackButton && backHref && (
              <Button variant="ghost" size="sm" asChild>
                <Link href={backHref}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  {backLabel}
                </Link>
              </Button>
            )}
            
            <Link href={homeHref} className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">
                Growth Arena
              </span>
            </Link>
          </div>

          {/* Right side - User info and dropdown */}
          <div className="flex items-center space-x-3">
            {/* User info with dropdown */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 p-2 hover:bg-gray-100 data-[state=open]:bg-gray-100 rounded-md">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm">
                        {user.name?.[0] || user.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:block text-left">
                      <div className="text-sm font-medium text-gray-900">
                        {user.name || user.username}
                      </div>
                      <div className="text-xs text-gray-500">
                        @{user.username}
                      </div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {experienceId && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href={`/experiences/${experienceId}/shopify-connections`}>
                          <ShoppingBag className="w-4 h-4 mr-2" />
                          Shopify Connections
                        </Link>
                      </DropdownMenuItem>
                      
                      {/* Admin Options */}
                      {isAdmin && (
                        <DropdownMenuItem asChild>
                          <Link href={`/experiences/${experienceId}/admin/whitelist`}>
                            <Shield className="w-4 h-4 mr-2" />
                            Modify Whitelist
                          </Link>
                        </DropdownMenuItem>
                      )}
                      
                      {/* Creator Mode Toggle - Only show if whitelisted */}
                      {isWhitelistedCreator && (
                        <DropdownMenuItem 
                          onClick={() => {
                            const currentUrl = new URL(window.location.href);
                            if (isCreatorMode) {
                              // Switch to competitor mode - remove mode parameter
                              currentUrl.searchParams.delete('mode');
                            } else {
                              // Switch to creator mode - add mode parameter
                              currentUrl.searchParams.set('mode', 'creator');
                            }
                            router.push(currentUrl.toString());
                          }}
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          {isCreatorMode ? 'Switch to competitor mode' : 'Switch to creator mode'}
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuSeparator />
                    </>
                  )}
                  
                  {/* Logout option */}
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // Show Login/Register buttons for non-authenticated users  
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/register">Sign up</Link>
                </Button>
              </div>
            )}

            {/* Mobile menu button - only show if needed for other content */}
            {!user && (
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <Menu className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Mobile menu - simplified */}
        {isMobileMenuOpen && !user && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {/* Add any mobile-specific items here if needed */}
            </div>
          </div>
        )}
      </div>
    </header>
  )
} 