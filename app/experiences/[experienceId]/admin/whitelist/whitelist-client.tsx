"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Trash2, User, Shield, Calendar, Clock } from "lucide-react"
import { formatDate } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type WhitelistEntry = {
  id: string
  username: string
  createdAt: string
  user?: {
    username: string
    name?: string
    whopUserId: string
    createdAt: string
  } | null
  admin: {
    username: string
    name?: string
  }
}

interface WhitelistManagementClientProps {
  experienceId: string
}

export function WhitelistManagementClient({ experienceId }: WhitelistManagementClientProps) {
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newUsername, setNewUsername] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [userToRemove, setUserToRemove] = useState<WhitelistEntry | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  useEffect(() => {
    fetchWhitelist()
  }, [])

  const fetchWhitelist = async () => {
    try {
      const response = await fetch('/api/admin/whitelist')
      if (response.ok) {
        const data = await response.json()
        setWhitelist(data)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to load whitelist')
      }
    } catch (error) {
      console.error('Error fetching whitelist:', error)
      setError('Failed to load whitelist')
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async () => {
    if (!newUsername.trim()) return

    setAdding(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/admin/whitelist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: newUsername.trim().toLowerCase()
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSuccess(data.message || `Successfully added ${newUsername} to creator whitelist`)
        setNewUsername("")
        fetchWhitelist() // Refresh the list
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to add user to whitelist')
      }
    } catch (err) {
      setError('Failed to add user to whitelist')
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveUser = async () => {
    if (!userToRemove) return

    setRemoving(userToRemove.id)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch('/api/admin/whitelist', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: userToRemove.username
        }),
      })

      if (response.ok) {
        setSuccess(`Successfully removed ${userToRemove.username} from creator whitelist`)
        fetchWhitelist() // Refresh the list
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to remove user from whitelist')
      }
    } catch (err) {
      setError('Failed to remove user from whitelist')
    } finally {
      setRemoving(null)
      setUserToRemove(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mr-3"></div>
        <span className="text-gray-600">Loading whitelist...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Add User Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>Add User to Whitelist</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-3">
            <Input
              placeholder="Username (e.g., johndoe)"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              disabled={adding}
              onKeyPress={(e) => e.key === 'Enter' && handleAddUser()}
            />
            <Button onClick={handleAddUser} disabled={adding || !newUsername.trim()}>
              {adding ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-gray-500">
            You can whitelist users by username whether they have joined the platform or not. 
            Users who haven't joined yet will automatically get creator access when they sign up.
          </p>
        </CardContent>
      </Card>

      {/* Status Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      {/* Whitelist Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>Whitelisted Creators ({whitelist.length})</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {whitelist.length === 0 ? (
            <div className="text-center py-8">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No users whitelisted yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {whitelist.map((entry) => {
                const isExistingUser = !!entry.user
                
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isExistingUser ? 'bg-emerald-100' : 'bg-amber-100'
                      }`}>
                        {isExistingUser ? (
                          <User className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-amber-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">
                            @{entry.username}
                          </span>
                          {isExistingUser ? (
                            <>
                              {entry.user?.name && (
                                <span className="text-gray-500">({entry.user.name})</span>
                              )}
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                Active User
                              </Badge>
                            </>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              Pre-whitelisted
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          Added by @{entry.admin.username} on {formatDate(new Date(entry.createdAt))}
                          {isExistingUser && (
                            <span className="ml-2">• Joined {formatDate(new Date(entry.user!.createdAt))}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUserToRemove(entry)}
                      disabled={removing === entry.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {removing === entry.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove
                        </>
                      )}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!userToRemove} onOpenChange={() => setUserToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Whitelist</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>@{userToRemove?.username}</strong> from the creator whitelist?
              <br /><br />
              {userToRemove?.user ? (
                <>They will no longer be able to access creator features or create contests.</>
              ) : (
                <>This will remove their pre-whitelisted status. If they join later, they won't have creator access unless re-whitelisted.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveUser}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
} 