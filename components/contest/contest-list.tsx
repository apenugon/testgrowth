"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Clock, DollarSign, Target, Calendar, Eye, Plus, List } from "lucide-react";
import { formatCurrency, formatDate, getContestStatusBadge, getContestTimeStatus } from "@/lib/utils";

type Contest = {
  id: string;
  name: string;
  description?: string;
  slug: string;
  entryFeeCents: number;
  prizePoolCents: number;
  prizePoolType: string;
  maxParticipants: number | null;
  status: string;
  startAt: Date | string;
  endAt: Date | string;
  _count: {
    participants: number;
  };
  createdAt?: string;
};

type FilterType = 'upcoming' | 'live' | 'ended' | 'my-contests';

interface ContestListProps {
  experienceId: string;
  userId?: string | null;
  userToken?: string | null;
  showMyContests?: boolean; // Whether to show the "My Contests" filter option
  isCreator?: boolean; // Whether the current user is a creator
}

// Countdown Timer Component
function CountdownTimer({ targetDate }: { targetDate: Date | string }) {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const target = new Date(targetDate);
      const timeDiff = target.getTime() - now.getTime();

      if (timeDiff <= 0) {
        setTimeLeft('Starting soon');
        return;
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m`);
      } else {
        setTimeLeft('Starting soon');
      }
    };

    updateCountdown(); // Initial call
    const interval = setInterval(updateCountdown, 1000 * 60); // Update every minute

    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="flex items-center space-x-2 text-sm text-blue-600">
      <Clock className="w-4 h-4" />
      <span>Starting in {timeLeft}</span>
    </div>
  );
}

export function ContestList({ 
  experienceId, 
  userId, 
  userToken, 
  showMyContests = false,
  isCreator = false 
}: ContestListProps) {
  const [allContests, setAllContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('upcoming');
  const searchParams = useSearchParams();
  const shouldShowList = searchParams.get('view') === 'list' || searchParams.get('fromCreate') === 'true';

  // Determine the best default filter based on available contests
  useEffect(() => {
    if (allContests.length > 0 && !shouldShowList) {
      const now = new Date();
      
      // Group contests by status
      const upcomingContests = allContests.filter(c => getContestTimeStatus(c.startAt, c.endAt) === 'upcoming');
      const liveContests = allContests.filter(c => getContestTimeStatus(c.startAt, c.endAt) === 'active');
      const endedContests = allContests.filter(c => getContestTimeStatus(c.startAt, c.endAt) === 'ended');

      let targetContest = null;

      // Priority 1: The soonest upcoming competition
      if (upcomingContests.length > 0) {
        targetContest = upcomingContests.sort((a, b) => 
          new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
        )[0];
      } 
      // Priority 2: If no upcoming competitions, the live competition with the most time left
      else if (liveContests.length > 0) {
        targetContest = liveContests.sort((a, b) => 
          new Date(b.endAt).getTime() - new Date(a.endAt).getTime()
        )[0];
      } 
      // Priority 3: If no live competitions, then show the competition list filtered to ended
      else if (endedContests.length > 0) {
        setActiveFilter('ended');
        return;
      }

      // If we found a target competition, redirect to it
      if (targetContest) {
        window.location.href = `/experiences/${experienceId}/contest/${targetContest.slug}`;
        return;
      }

      // Fallback to upcoming filter if no contests found
      setActiveFilter('upcoming');
    } else if (allContests.length > 0) {
      // If shouldShowList is true, set appropriate default filter
      const upcomingContests = allContests.filter(c => getContestTimeStatus(c.startAt, c.endAt) === 'upcoming');
      const liveContests = allContests.filter(c => getContestTimeStatus(c.startAt, c.endAt) === 'active');
      const endedContests = allContests.filter(c => getContestTimeStatus(c.startAt, c.endAt) === 'ended');

      if (upcomingContests.length > 0) {
        setActiveFilter('upcoming');
      } else if (liveContests.length > 0) {
        setActiveFilter('live');
      } else if (endedContests.length > 0) {
        setActiveFilter('ended');
      }
    }
  }, [allContests, experienceId, shouldShowList]);

  useEffect(() => {
    const fetchContests = async () => {
      try {
        // Don't initialize users here - let proper user creation happen 
        // when they actually interact with contests to avoid wrong usernames
        
        let response;
        
        if (showMyContests && userId) {
          // For creator dashboard, fetch all contests AND user's contests
          const [allResponse, createdResponse] = await Promise.all([
            fetch('/api/contests/all', {
              headers: userToken ? { 'x-whop-user-token': userToken } : {},
            }),
            fetch(`/api/contests/by-creator/${userId}`, {
              headers: userToken ? { 'x-whop-user-token': userToken } : {},
            })
          ]);

          if (allResponse.ok && createdResponse.ok) {
            const allContests = await allResponse.json();
            const createdContests = await createdResponse.json();
            
            // Store both datasets
            setAllContests(allContests);
            setCreatedContests(createdContests);
          }
        } else {
          // For user dashboard, just fetch all contests
          response = await fetch('/api/contests/all', {
            headers: userToken ? { 'x-whop-user-token': userToken } : {},
          });

          if (response.ok) {
            const contests = await response.json();
            setAllContests(contests);
          }
        }
      } catch (error) {
        console.error('Error fetching contest data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchContests();
  }, [userId, userToken, showMyContests]);

  const [createdContests, setCreatedContests] = useState<Contest[]>([]);

  // Filter contests based on active filter
  const filteredContests = (() => {
    let contests = allContests;
    
    if (activeFilter === 'my-contests') {
      contests = createdContests;
      // For "My Contests", sort by status (upcoming, live, ended) then by start date
      return contests.sort((a, b) => {
        const statusA = getContestTimeStatus(a.startAt, a.endAt);
        const statusB = getContestTimeStatus(b.startAt, b.endAt);
        
        // Priority order: upcoming > active > ended
        const statusPriority = { upcoming: 3, active: 2, ended: 1 };
        const priorityDiff = statusPriority[statusB] - statusPriority[statusA];
        
        if (priorityDiff !== 0) return priorityDiff;
        
        // If same status, sort by start date
        return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
      });
    }
    
    // Filter by time status and apply specific sorting for each type
    const timeStatus = getContestTimeStatus;
    const statusMapping = {
      'live': 'active',
      'upcoming': 'upcoming', 
      'ended': 'ended'
    };
    
    const filtered = contests.filter(contest => {
      return timeStatus(contest.startAt, contest.endAt) === statusMapping[activeFilter];
    });

    // Apply sorting based on filter type
    if (activeFilter === 'upcoming') {
      // Sort by soonest start date (earliest first)
      return filtered.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    } else if (activeFilter === 'live') {
      // Sort by most time remaining (latest end date first)
      return filtered.sort((a, b) => new Date(b.endAt).getTime() - new Date(a.endAt).getTime());
    } else if (activeFilter === 'ended') {
      // Sort by most recent end date (latest ended first)
      return filtered.sort((a, b) => new Date(b.endAt).getTime() - new Date(a.endAt).getTime());
    }
    
    return filtered;
  })();

  // Calculate counts for each filter
  const contestCounts = {
    upcoming: allContests.filter(c => getContestTimeStatus(c.startAt, c.endAt) === 'upcoming').length,
    live: allContests.filter(c => getContestTimeStatus(c.startAt, c.endAt) === 'active').length,
    ended: allContests.filter(c => getContestTimeStatus(c.startAt, c.endAt) === 'ended').length,
    'my-contests': createdContests.length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading contests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Sales Contests
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          {showMyContests 
            ? "Manage your contests and discover new opportunities"
            : "Join competitive challenges and win prizes by growing your Shopify sales"
          }
        </p>
        
        {/* Create Contest Button for Creators */}
        {isCreator && showMyContests && (
          <div className="mb-6">
            <Button asChild>
              <Link href={`/experiences/${experienceId}/create?returnTo=${encodeURIComponent(`/experiences/${experienceId}?view=list`)}`}>
                <Plus className="w-4 h-4 mr-2" />
                Create Contest
              </Link>
            </Button>
          </div>
        )}
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
          {showMyContests && (
            <Button
              variant={activeFilter === 'my-contests' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveFilter('my-contests')}
              className="px-6"
            >
              My Contests ({contestCounts['my-contests']})
            </Button>
          )}
        </div>
      </div>

      {/* Contests List */}
      {filteredContests.length === 0 ? (
        <Card className="max-w-md mx-auto text-center py-12">
          <CardContent>
            <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {activeFilter === 'my-contests' 
                ? "No contests created" 
                : `No ${activeFilter} contests`
              }
            </h3>
            <p className="text-gray-600 mb-4">
              {activeFilter === 'my-contests' && "Start engaging your community by creating your first sales contest"}
              {activeFilter === 'upcoming' && "Check back soon for new contests!"}
              {activeFilter === 'live' && "No contests are currently running."}
              {activeFilter === 'ended' && "No completed contests to show."}
            </p>
            {activeFilter === 'my-contests' && isCreator && (
              <Button asChild>
                <Link href={`/experiences/${experienceId}/create?returnTo=${encodeURIComponent(`/experiences/${experienceId}?view=list`)}`}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Contest
                </Link>
              </Button>
            )}
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

            const timeStatus = getContestTimeStatus(contest.startAt, contest.endAt);

            return (
              <Link key={contest.id} href={`/experiences/${experienceId}/contest/${contest.slug}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 mr-6">
                        {/* Contest Header */}
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-xl font-bold text-gray-900">
                            {contest.name}
                          </h3>
                          <Badge variant={variant}>
                            {label}
                          </Badge>
                        </div>

                        {/* Contest Stats */}
                        <div className="flex items-center space-x-6">
                          {/* Start - End Date */}
                          <div className="flex items-center space-x-2 text-sm">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span>
                              {formatDate(contest.startAt)} - {formatDate(contest.endAt)}
                            </span>
                          </div>

                          {/* Prize Pool */}
                          {totalPrizePool > 0 && (
                            <div className="flex items-center space-x-2 text-sm">
                              <Trophy className="w-4 h-4 text-gray-500" />
                              <span>{formatCurrency(totalPrizePool)}</span>
                            </div>
                          )}
                        </div>

                        {/* Countdown Timer for Upcoming Contests */}
                        {timeStatus === 'upcoming' && (
                          <div className="mt-2">
                            <CountdownTimer targetDate={contest.startAt} />
                          </div>
                        )}
                      </div>

                      {/* Right side: Participants and Action Button */}
                      <div className="flex flex-col items-end space-y-3">
                        {/* Action Button */}
                        <div 
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          {activeFilter === 'my-contests' ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // Navigate to contest page
                                window.location.href = `/experiences/${experienceId}/contest/${contest.slug}`;
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          ) : timeStatus === 'upcoming' ? (
                            <Button
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // Navigate to contest page for joining
                                window.location.href = `/experiences/${experienceId}/contest/${contest.slug}`;
                              }}
                            >
                              Join Contest
                            </Button>
                          ) : timeStatus === 'active' ? (
                            <Button
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // Navigate to contest page
                                window.location.href = `/experiences/${experienceId}/contest/${contest.slug}`;
                              }}
                            >
                              View Details
                            </Button>
                          ) : (
                            <Button 
                              variant="outline"
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // Navigate to contest page
                                window.location.href = `/experiences/${experienceId}/contest/${contest.slug}`;
                              }}
                            >
                              View Results
                            </Button>
                          )}
                        </div>

                        {/* Participants Count */}
                        <div className="flex items-center space-x-2 text-sm">
                          <Users className="w-4 h-4 text-gray-500" />
                          <span>{contest._count.participants} joined</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
} 