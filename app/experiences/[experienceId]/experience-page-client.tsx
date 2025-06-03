"use client";

import { Header } from "@/components/layout/header";
import { ContestList } from "@/components/contest/contest-list";

interface ExperiencePageClientProps {
  userId: string | null;
  user: { name?: string; username: string } | null;
  experience: any;
  experienceId: string;
  accessLevel: string;
  userToken?: string;
  isAdmin: boolean;
  isWhitelistedCreator: boolean;
}

export function ExperiencePageClient({
  userId,
  user,
  experience,
  experienceId,
  accessLevel,
  userToken,
  isAdmin,
  isWhitelistedCreator,
}: ExperiencePageClientProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <Header 
        user={user}
        experienceId={experienceId}
        isAdmin={isAdmin}
        isWhitelistedCreator={isWhitelistedCreator}
      />
      
      <ContestList 
        experienceId={experienceId}
        userId={userId || undefined}
        userToken={userToken}
        showMyContests={false}
        isCreator={isWhitelistedCreator}
      />
    </div>
  );
} 