"use client";

import { Header } from "@/components/layout/header";
import { ContestList } from "@/components/contest/contest-list";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

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
  const searchParams = useSearchParams();
  
  // Check if we're in creator mode based on URL parameter
  const isCreatorMode = useMemo(() => {
    return searchParams.get('mode') === 'creator' && isWhitelistedCreator;
  }, [searchParams, isWhitelistedCreator]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <Header 
        user={user || undefined}
        experienceId={experienceId}
        isAdmin={isAdmin}
        isWhitelistedCreator={isWhitelistedCreator}
        isCreatorMode={isCreatorMode}
      />
      
      <ContestList 
        experienceId={experienceId}
        userId={userId || undefined}
        userToken={userToken}
        showMyContests={isCreatorMode}
        isCreator={isWhitelistedCreator && isCreatorMode}
      />
    </div>
  );
} 