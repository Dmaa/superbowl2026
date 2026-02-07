"use client";

import { useSuperBowlOdds } from "@/hooks/useSuperBowlOdds";
import { useWallet } from "@/hooks/useWallet";
import BetCard from "@/components/BetCard";

const CHAMPION_SLUG = "super-bowl-champion-2026-731";

const Home = () => {
  const { events, isLoading, error } = useSuperBowlOdds();
  const { balance, positions, buyYes, sellYes } = useWallet();

  if (isLoading) {
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

  const championEvent = events.find((e) => e.slug === CHAMPION_SLUG);
  const gameMarkets = championEvent?.markets ?? [];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-4">
          <div>
            <h1 className="text-xl font-bold">Super Bowl LX</h1>
            <p className="text-sm text-muted-foreground">
              Seahawks vs Patriots — Feb 8, 2026
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Balance</p>
            <p className="text-2xl font-bold text-green-400">
              ${balance.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Bet Cards */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">
            Game Winner
          </h2>
          {gameMarkets.map((market) => (
            <BetCard
              key={market.id}
              market={market}
              balance={balance}
              position={positions.find((p) => p.marketId === market.id)}
              onBuy={buyYes}
              onSell={sellYes}
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
