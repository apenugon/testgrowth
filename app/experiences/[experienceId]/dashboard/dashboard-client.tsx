"use client"

import { ContestList } from "@/components/contest/contest-list"

interface DashboardClientProps {
  userId: string
  experienceId: string
}

export function DashboardClient({ userId, experienceId }: DashboardClientProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <ContestList 
        experienceId={experienceId}
        userId={userId}
        showMyContests={true}
        isCreator={true}
      />
    </div>
  )
} 