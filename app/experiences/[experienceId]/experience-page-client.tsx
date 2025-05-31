"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trophy, Users, Clock, DollarSign, Target, TrendingUp, Calendar, Settings, User } from "lucide-react";
import { formatCurrency, formatDate, getContestStatusBadge, getContestTimeStatus } from "@/lib/utils";

type Contest = {
  id: string;
  name: string;
  description: string;
  slug: string;
  entryFeeCents: number;
  prizePoolCents: number;
  prizePoolType: string;
  maxParticipants: number | null;
  status: string;
  startAt: Date | string;
  endAt: Date;
  _count: {
    participants: number;
  };
};

type User = {
  name?: string | null;
  username: string;
};

type Experience = {
  name: string;
};

type ExperiencePageClientProps = {
  userId: string;
  user: User;
  experience: Experience;
  experienceId: string;
  accessLevel: string;
  userToken: string | null;
};

export function ExperiencePageClient({
  userId,
  user,
  experience,
  experienceId,
  accessLevel,
  userToken,
}: ExperiencePageClientProps) {
  const [allContests, setAllContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'upcoming' | 'live' | 'ended'>('live');

  // Determine the best default filter based on available contests
  useEffect(() => {
    if (allContests.length > 0) {
      const contestsByStatus = {
        live: allContests.filter(c => getContestTimeStatus(c.startAt, c.endAt) === 'active'),
        upcoming: allContests.filter(c => getContestTimeStatus(c.startAt, c.endAt) === 'upcoming'),
        ended: allContests.filter(c => getContestTimeStatus(c.startAt, c.endAt) === 'ended'),
      };

      console.log('Contests by status:', contestsByStatus); // Debug log

      // Set the best default filter
      if (contestsByStatus.live.length > 0) {
        setActiveFilter('live');
      } else if (contestsByStatus.upcoming.length > 0) {
        setActiveFilter('upcoming');
      } else if (contestsByStatus.ended.length > 0) {
        setActiveFilter('ended');
      }
    }
  }, [allContests]);

  useEffect(() => {
    const initializeData = async () => {
      try {
        // Create or update user in our database
        await fetch('/api/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(userToken && { 'x-whop-user-token': userToken }),
          },
          body: JSON.stringify({
            id: userId,
            email: `${user.username}@whop.user`,
            name: user.name || undefined,
            username: user.username,
          }),
        });

        // Fetch all contests
        const response = await fetch('/api/contests/all', {
          headers: userToken ? { 'x-whop-user-token': userToken } : {},
        });

        if (response.ok) {
          const contests = await response.json();
          console.log('Fetched contests:', contests);
          setAllContests(contests);
        } else {
          console.error('Failed to fetch contests:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error fetching contest data:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [userId, user, userToken]);

  // Filter contests based on active filter
  const filteredContests = allContests.filter(contest => {
    const timeStatus = getContestTimeStatus(contest.startAt, contest.endAt);
    console.log(`Contest ${contest.name}: timeStatus=${timeStatus}, activeFilter=${activeFilter}, startAt=${contest.startAt}, endAt=${contest.endAt}`);
    
    // Map the filter to the actual time status returned by getContestTimeStatus
    const statusMapping = {
      'live': 'active',
      'upcoming': 'upcoming', 
      'ended': 'ended'
    };
    
    return timeStatus === statusMapping[activeFilter];
  });

  console.log(`Total contests: ${allContests.length}, Filtered contests (${activeFilter}): ${filteredContests.length}`);

  // Calculate counts for each filter
  const contestCounts = {
    upcoming: allContests.filter(c => getContestTimeStatus(c.startAt, c.endAt) === 'upcoming').length,
    live: allContests.filter(c => getContestTimeStatus(c.startAt, c.endAt) === 'active').length,
    ended: allContests.filter(c => getContestTimeStatus(c.startAt, c.endAt) === 'ended').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading contests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <Header 
        user={user}
        experienceId={experienceId}
      />
      
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Sales Contests
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Join competitive challenges and win prizes by growing your Shopify sales
          </p>
          
          {/* Creator Button - Secondary */}
          <div className="flex justify-center mb-8">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/experiences/${experienceId}/dashboard`}>
                <Settings className="w-4 h-4 mr-2" />
                Creator Dashboard
              </Link>
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm">
            <Button
              variant={activeFilter === 'upcoming' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveFilter('upcoming')}
              className="px-6"
            >
              Upcoming ({contestCounts.upcoming})
            </Button>
            <Button
              variant={activeFilter === 'live' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveFilter('live')}
              className="px-6"
            >
              Live ({contestCounts.live})
            </Button>
            <Button
              variant={activeFilter === 'ended' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveFilter('ended')}
              className="px-6"
            >
              Ended ({contestCounts.ended})
            </Button>
          </div>
        </div>

        {/* Contests List */}
        {filteredContests.length === 0 ? (
          <Card className="max-w-md mx-auto text-center py-12">
            <CardContent>
              <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No {activeFilter} contests
              </h3>
              <p className="text-gray-600 mb-6">
                {activeFilter === 'upcoming' && "Check back soon for new contests!"}
                {activeFilter === 'live' && "No contests are currently running."}
                {activeFilter === 'ended' && "No completed contests to show."}
              </p>
              <Button variant="outline" asChild>
                <Link href={`/experiences/${experienceId}/dashboard`}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Contest
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {filteredContests.map((contest) => {
              const { label, variant } = getContestStatusBadge(contest.startAt, contest.endAt);
              const totalPrizePool = contest.prizePoolType === "CREATOR_FUNDED" 
                ? contest.prizePoolCents
                : contest.prizePoolType === "ENTRY_FEES"
                ? contest.entryFeeCents * (contest.maxParticipants || 20)
                : (contest.entryFeeCents * (contest.maxParticipants || 20)) + contest.prizePoolCents;

              return (
                <Card key={contest.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Contest Header */}
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-xl font-bold text-gray-900">
                            {contest.name}
                          </h3>
                          <Badge variant={variant}>
                            {label}
                          </Badge>
                          {contest.entryFeeCents === 0 && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              FREE
                            </Badge>
                          )}
                        </div>

                        <p className="text-gray-600 mb-4 line-clamp-2">
                          {contest.description}
                        </p>

                        {/* Contest Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div className="flex items-center space-x-2 text-sm">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span>{contest._count.participants} joined</span>
                          </div>
                          
                          <div className="flex items-center space-x-2 text-sm">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span>
                              {activeFilter === 'upcoming' && `Starts ${formatDate(contest.startAt)}`}
                              {activeFilter === 'live' && `Ends ${formatDate(contest.endAt)}`}
                              {activeFilter === 'ended' && `Ended ${formatDate(contest.endAt)}`}
                            </span>
                          </div>

                          {contest.entryFeeCents > 0 && (
                            <div className="flex items-center space-x-2 text-sm">
                              <DollarSign className="w-4 h-4 text-gray-500" />
                              <span>{formatCurrency(contest.entryFeeCents)} entry</span>
                            </div>
                          )}

                          {totalPrizePool > 0 && (
                            <div className="flex items-center space-x-2 text-sm">
                              <Trophy className="w-4 h-4 text-gray-500" />
                              <span>{formatCurrency(totalPrizePool)} prizes</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col space-y-2 ml-6">
                        {activeFilter !== 'ended' ? (
                          <Button asChild>
                            <Link href={`/experiences/${experienceId}/contest/${contest.slug}`}>
                              Join Contest
                            </Link>
                          </Button>
                        ) : (
                          <Button variant="outline" asChild>
                            <Link href={`/experiences/${experienceId}/contest/${contest.slug}`}>
                              View Results
                            </Link>
                          </Button>
                        )}
                        
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/experiences/${experienceId}/contest/${contest.slug}`}>
                            View Details
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 