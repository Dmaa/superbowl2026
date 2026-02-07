"use client";

import { useSuperBowlOdds } from "@/hooks/useSuperBowlOdds";

const Home = () => {
  const { events, isLoading, error } = useSuperBowlOdds();

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

  const totalMarkets = events.reduce((sum, e) => sum + e.markets.length, 0);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-lg text-muted-foreground">
        {events.length} events, {totalMarkets} active markets loaded. Check console for details.
      </p>
    </div>
  );
};

export default Home;
