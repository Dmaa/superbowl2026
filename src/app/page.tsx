"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSuperBowlOdds } from "@/hooks/useSuperBowlOdds";
import { useWallet } from "@/hooks/useWallet";
import EventGroup from "@/components/EventGroup";

const Home = () => {
  const router = useRouter();
  const { events, isLoading: oddsLoading, error } = useSuperBowlOdds();
  const { balance, positions, buyYes, sellYes, isLoading: walletLoading, needsLogin, displayName } = useWallet();

  useEffect(() => {
    if (!walletLoading && needsLogin) {
      router.push("/login");
    }
  }, [walletLoading, needsLogin, router]);

  if (walletLoading || oddsLoading || needsLogin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-muted-foreground animate-pulse">
          Loading Super Bowl Markets...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-destructive">Market Paused — {error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-4">
          <div>
            {displayName && (
              <p className="text-lg font-light tracking-wide text-green-400">
                Hello, <span className="font-semibold">{displayName}</span>
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Super Bowl LX — Feb 8, 2026
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Balance</p>
            <p className="text-2xl font-bold text-green-400">
              ${balance.toFixed(2)}
            </p>
          </div>
        </div>

        {/* All Events */}
        <div className="space-y-6">
          {events.map((event, index) => (
            <EventGroup
              key={event.id}
              event={event}
              balance={balance}
              positions={positions}
              onBuy={buyYes}
              onSell={sellYes}
              defaultOpen={index === 0}
            />
          ))}
        </div>

        {/* Positions */}
        {positions.length > 0 && (
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <h2 className="mb-3 text-lg font-semibold">Your Positions</h2>
            <div className="space-y-2">
              {positions.map((pos) => (
                <div
                  key={pos.marketId}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{pos.marketName}</span>
                  <span className="text-muted-foreground">
                    {pos.shares.toFixed(1)} shares @ {Math.round(pos.avgEntryPrice * 100)}¢
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
