"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShoppingBag, Clock, Download, ExternalLink } from "lucide-react";
import { formatCurrency, formatDate, getContestTimeStatus } from "@/lib/utils";

type Contest = {
  id: string;
  name: string;
  slug: string;
  startAt: Date | string;
  endAt: Date | string;
  prizePoolCents: number;
  prizePoolType: string;
  entryFeeCents: number;
  maxParticipants?: number | null;
  status: string;
  isPublic: boolean;
  participants: { userId: string }[];
};

type ShopifyStore = {
  id: string;
  shopDomain: string;
  isActive: boolean;
};

interface ContestPageHeaderProps {
  contest: Contest;
  userId?: string | null;
  isParticipating: boolean;
  experienceId?: string | null;
  userToken?: string | null;
}

export function ContestPageHeader({ 
  contest, 
  userId, 
  isParticipating, 
  experienceId,
  userToken 
}: ContestPageHeaderProps) {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [stores, setStores] = useState<ShopifyStore[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [checkingStores, setCheckingStores] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string>("");

  // Calculate total prize pool
  const calculateTotalPrizePool = () => {
    if (contest.prizePoolType === "ENTRY_FEES") {
      return contest.entryFeeCents * (contest.maxParticipants || 20);
    } else if (contest.prizePoolType === "CREATOR_FUNDED") {
      return contest.prizePoolCents;
    } else {
      return (contest.entryFeeCents * (contest.maxParticipants || 20)) + contest.prizePoolCents;
    }
  };

  const totalPrizePool = calculateTotalPrizePool();
  const timeStatus = getContestTimeStatus(contest.startAt, contest.endAt);

  const getJoinButtonContent = () => {
    if (isParticipating) {
      return "Already Joined";
    } else if (timeStatus === 'ended') {
      return "Competition Ended";
    } else {
      return "Join Competition";
    }
  };

  // Allow button to be clickable even without userId (for install modal)
  const isJoinable = !isParticipating && timeStatus !== 'ended';
  const requiresAuth = isJoinable && !userId;

  // Fetch user's Shopify stores - same as ShopifyConnectionsClient
  const fetchStores = async () => {
    if (!userId) return []; // No user, no stores
    
    setCheckingStores(true);
    try {
      const response = await fetch(`/api/stores/all/${userId}`)
      if (response.ok) {
        const data = await response.json()
        setStores(data.stores || [])
        
        // Auto-select first store if there's only one
        if (data.stores && data.stores.length === 1) {
          setSelectedStoreId(data.stores[0].id);
        }
        
        return data.stores || []
      } else {
        console.error('Failed to fetch stores')
        setStores([])
        return []
      }
    } catch (error) {
      console.error('Error fetching stores:', error)
      setStores([])
      return []
    } finally {
      setCheckingStores(false);
    }
  }

  const handleAddStore = () => {
    // Open connection page in popup
    const connectUrl = experienceId 
      ? `/experiences/${experienceId}/connect-shopify?returnTo=/c/${contest.slug}&popup=true`
      : `/connect-shopify?returnTo=/c/${contest.slug}&popup=true`;

    const popup = window.open(
      connectUrl,
      'shopify-connect',
      'width=600,height=700,scrollbars=yes,resizable=yes'
    );

    if (!popup) {
      setError('Popup blocked. Please allow popups and try again.');
      return;
    }

    // Listen for messages from the popup
    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === 'SHOPIFY_OAUTH_SUCCESS') {
        console.log('OAuth success message received!');
        popup.close();
        window.removeEventListener('message', handleMessage);
        
        // Automatically join the contest with the newly connected store
        try {
          console.log('Refreshing stores list...');
          // Refresh the stores list
          const stores = await fetchStores();
          
          console.log('Stores after refresh:', stores.length);
          if (stores.length > 0) {
            // Use the most recently connected store (last in the list)
            const newStore = stores[stores.length - 1];
            console.log('Using store:', newStore);
            
            // Join the contest with this store
            console.log('Attempting to join contest...');
            const joinResponse = await fetch(`/api/contests/${contest.id}/join`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                storeId: newStore.id
              }),
            });

            console.log('Join response status:', joinResponse.status);
            if (joinResponse.ok) {
              console.log('Successfully joined contest! Refreshing page...');
              // Success! Refresh the page to show updated participation status
              window.location.reload();
            } else {
              const errorData = await joinResponse.json();
              console.error('Join failed:', errorData);
              setError(errorData.error || 'Failed to join contest after connecting store');
            }
          } else {
            console.error('No active stores found after connection');
            setError('No active stores found after connection');
          }
        } catch (err) {
          console.error('Error joining contest after OAuth:', err);
          setError('Failed to join contest after connecting store');
        }
      } else if (event.data.type === 'SHOPIFY_OAUTH_ERROR') {
        popup.close();
        window.removeEventListener('message', handleMessage);
        setError(event.data.error || 'Failed to connect Shopify store');
      }
    };

    window.addEventListener('message', handleMessage);

    // Check if popup was closed without completing OAuth
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
      }
    }, 1000);
  };

  const handleJoin = async () => {
    if (!userId || !selectedStoreId) return;

    setIsJoining(true);
    setError(null);

    try {
      const response = await fetch(`/api/contests/${contest.id}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId: selectedStoreId
        }),
      });

      if (response.ok) {
        setShowJoinModal(false);
        // Refresh the page to update participation status
        window.location.reload();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to join contest');
      }
    } catch (err) {
      console.error('Error joining contest:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoinClick = async () => {
    if (!isJoinable) return;

    // If not authenticated, show install modal
    if (!userId) {
      console.log('User not authenticated, showing install modal');
      setShowInstallModal(true);
      return;
    }

    console.log('Join button clicked, fetching stores...');
    setCheckingStores(true);
    
    // Fetch stores first
    const fetchedStores = await fetchStores();
    setCheckingStores(false);
    
    console.log('Stores fetched:', fetchedStores.length);
    
    if (fetchedStores.length === 0) {
      // No stores - show install modal
      console.log('No stores found, showing install modal');
      setShowInstallModal(true);
      return;
    } else if (fetchedStores.length === 1) {
      // One store - auto-join with that store
      console.log('One store found, auto-joining with:', fetchedStores[0].shopDomain);
      setSelectedStoreId(fetchedStores[0].id);
      // Auto-join immediately
      setIsJoining(true);
      setError(null);

      try {
        const response = await fetch(`/api/contests/${contest.id}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            storeId: fetchedStores[0].id
          }),
        });

        if (response.ok) {
          // Refresh the page to update participation status
          window.location.reload();
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to join contest');
        }
      } catch (err) {
        console.error('Error joining contest:', err);
        setError('An unexpected error occurred');
      } finally {
        setIsJoining(false);
      }
    } else {
      // Multiple stores - show selection modal
      console.log('Multiple stores found, showing selection modal');
      setShowJoinModal(true);
    }
  };

  const handleInstallApp = () => {
    // Redirect to Shopify App Store
    window.location.href = 'https://apps.shopify.com/growth-arena';
  };

  const handleWithdraw = async () => {
    if (!userId || !isParticipating) return;

    try {
      const response = await fetch(`/api/contests/${contest.id}/withdraw`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(userToken && { 'x-whop-user-token': userToken }),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to withdraw from contest');
      }

      // Refresh the page to update participation status
      window.location.reload();
    } catch (err) {
      console.error('Error withdrawing from contest:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    }
  };

  // Update countdown every second
  useEffect(() => {
    if (!isParticipating || timeStatus === 'ended') return;

    const updateCountdown = () => {
      const now = new Date();
      const endTime = new Date(contest.endAt);
      const timeDiff = endTime.getTime() - now.getTime();

      if (timeDiff <= 0) {
        setCountdown("Contest Ended");
        return;
      }

      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

      if (days > 0) {
        setCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      } else if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setCountdown(`${minutes}m ${seconds}s`);
      }
    };

    updateCountdown(); // Initial call
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [isParticipating, contest.endAt, timeStatus]);

  return (
    <>
      {/* Header Section with Background */}
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
        {/* Contest Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{contest.name}</h1>
          <div className="text-gray-600">
            {formatDate(contest.startAt)} - {formatDate(contest.endAt)}
          </div>
        </div>

        {/* Prize and Action Section - Stacked Vertically */}
        <div className="flex flex-col items-center space-y-6 max-w-sm mx-auto">
          {/* Prize Pool */}
          {totalPrizePool > 0 && (
            <div className="bg-white rounded-lg px-8 py-6 shadow-lg w-full">
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600">
                  {formatCurrency(totalPrizePool)}
                </div>
                <div className="text-sm text-gray-500 mt-1">Prize</div>
              </div>
            </div>
          )}
          
          {/* Join Button or Countdown */}
          {isParticipating && timeStatus !== 'ended' ? (
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <Clock className="w-4 h-4 text-gray-500 mr-1" />
                <span className="text-sm text-gray-600">Time Remaining</span>
              </div>
              <div className="text-lg font-semibold text-gray-800">
                {countdown}
              </div>
            </div>
          ) : (
            <Button
              size="lg"
              className="px-12 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all w-full cursor-pointer"
              onClick={handleJoinClick}
              disabled={!isJoinable || (!!userId && (checkingStores || isJoining))}
              variant={isParticipating ? "outline" : timeStatus === 'ended' ? "outline" : "default"}
            >
              {!!userId && checkingStores ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Checking stores...
                </>
              ) : !!userId && isJoining ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Joining contest...
                </>
              ) : (
                getJoinButtonContent()
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Withdraw Link for Upcoming Contests */}
      {isParticipating && timeStatus === 'upcoming' && (
        <div className="text-center py-4">
          <button
            onClick={handleWithdraw}
            className="text-sm text-red-600 hover:text-red-700 underline transition-colors cursor-pointer"
          >
            Withdraw
          </button>
        </div>
      )}

      {/* Store Selection Modal */}
      <Dialog open={showJoinModal} onOpenChange={setShowJoinModal}>
        <DialogContent className="max-w-sm [&>button]:hidden">
          <DialogHeader>
            <DialogTitle>Select Store</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Store Selection */}
            {stores.length > 1 ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Choose which store to use:
                </label>
                <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select store" />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.shopDomain}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : stores.length === 1 ? (
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                <ShoppingBag className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium">{stores[0].shopDomain}</span>
              </div>
            ) : null}

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Join Button */}
            <Button
              onClick={handleJoin}
              disabled={isJoining || (stores.length > 1 && !selectedStoreId)}
              className="w-full cursor-pointer"
              size="lg"
            >
              {isJoining ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Joining...
                </>
              ) : (
                "Join Contest"
              )}
            </Button>

            {/* Add another store option */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddStore}
              className="w-full cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 mr-2" />
              Connect Different Store
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Install App Modal */}
      <Dialog open={showInstallModal} onOpenChange={setShowInstallModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Download className="w-5 h-5 text-emerald-600" />
              <span>Install Growth Arena App</span>
            </DialogTitle>
            <DialogDescription className="text-left space-y-3 pt-2">
              <p>
                Before joining this contest, you need to install the Growth Arena app from the Shopify App Store.
              </p>
              <p className="text-sm text-gray-600">
                After installation, you'll be redirected back here to complete joining the contest.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-3 pt-4">
            <Button 
              onClick={handleInstallApp}
              className="w-full"
              size="lg"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Install from Shopify App Store
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowInstallModal(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 