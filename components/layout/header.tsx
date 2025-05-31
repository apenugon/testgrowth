"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  Home, 
  Trophy, 
  Plus, 
  ChevronLeft,
  Menu
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
}

export function Header({ 
  user, 
  experienceId, 
  showBackButton = false, 
  backHref, 
  backLabel = "Back" 
}: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const dashboardHref = experienceId ? `/experiences/${experienceId}` : "/"

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
            
            <Link href={dashboardHref} className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900 hidden sm:block">
                Growth Arena
              </span>
            </Link>
          </div>

          {/* Center - Navigation (hidden on mobile) */}
          <nav className="hidden md:flex items-center space-x-1">
            <Button variant="ghost" asChild>
              <Link href={dashboardHref}>
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Link>
            </Button>
            
            {experienceId && (
              <>
                <Button variant="ghost" asChild>
                  <Link href={`/experiences/${experienceId}/contests`}>
                    <Trophy className="w-4 h-4 mr-2" />
                    Contests
                  </Link>
                </Button>
                
                <Button variant="ghost" asChild>
                  <Link href={`/experiences/${experienceId}/create`}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create
                  </Link>
                </Button>
              </>
            )}
          </nav>

          {/* Right side - User info and mobile menu */}
          <div className="flex items-center space-x-3">
            {/* Create button for mobile */}
            {experienceId && (
              <Button size="sm" className="md:hidden" asChild>
                <Link href={`/experiences/${experienceId}/create`}>
                  <Plus className="w-4 h-4" />
                </Link>
              </Button>
            )}

            {/* User info */}
            {user && (
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm">
                    {user.name?.[0] || user.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:block">
                  <div className="text-sm font-medium text-gray-900">
                    {user.name || user.username}
                  </div>
                  <div className="text-xs text-gray-500">
                    @{user.username}
                  </div>
                </div>
              </div>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <Link
                href={dashboardHref}
                className="flex items-center px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Home className="w-5 h-5 mr-3" />
                Dashboard
              </Link>
              
              {experienceId && (
                <>
                  <Link
                    href={`/experiences/${experienceId}/contests`}
                    className="flex items-center px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Trophy className="w-5 h-5 mr-3" />
                    Contests
                  </Link>
                  
                  <Link
                    href={`/experiences/${experienceId}/create`}
                    className="flex items-center px-3 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Plus className="w-5 h-5 mr-3" />
                    Create Contest
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
} 