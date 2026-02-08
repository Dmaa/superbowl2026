"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSuperBowlOdds } from "@/hooks/useSuperBowlOdds";
import { useWallet } from "@/hooks/useWallet";
import { useLimitOrders } from "@/hooks/useLimitOrders";
import { ChevronDown, ChevronRight } from "lucide-react";
import EventGroup from "@/components/EventGroup";
import PendingOrders from "@/components/PendingOrders";

const Home = () => {
  const router = useRouter();
  const { events, isLoading: oddsLoading, error } = useSuperBowlOdds();
  const {
    balance, positions, buyYes, sellYes, isLoading: walletLoading,
    needsLogin, displayName, userId, refreshBalance, refreshPositions,
  } = useWallet();
  const {
    limitOrders, placeBuyLimit, placeSellLimit, cancelOrder,
    checkAndFillOrders, getLockedShares,
  } = useLimitOrders({ userId, refreshBalance, refreshPositions });

  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());

  const eventsRef = useRef(events);
  eventsRef.current = events;

  // Build a price map from all markets for position display
  const priceMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const event of events) {
      for (const market of event.markets) {
        map.set(market.id, parseFloat(market.outcomePrices[0]));
        if (market.outcomePrices[1]) {
          map.set(`${market.id}_no`, parseFloat(market.outcomePrices[1]));
        }
      }
    }
    return map;
  }, [events]);

  // Check limit orders on every price update
  useEffect(() => {
    if (events.length > 0 && userId) {
      checkAndFillOrders(events);
    }
  }, [events, userId, checkAndFillOrders]);

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
      <div className="mx-auto max-w-6xl space-y-6">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {events.map((event, index) => (
            <EventGroup
              key={event.id}
              event={event}
              balance={balance}
              positions={positions}
              onBuy={buyYes}
              onSell={sellYes}
              pendingOrders={limitOrders.filter((o) => o.status === "PENDING")}
              onPlaceBuyLimit={placeBuyLimit}
              onPlaceSellLimit={placeSellLimit}
              onDeleteOrder={cancelOrder}
              getLockedShares={getLockedShares}
              defaultOpen={index === 0}
            />
          ))}
        </div>

        {/* Pending Orders */}
        <PendingOrders orders={limitOrders} onDelete={cancelOrder} />

        {/* Positions */}
        {positions.length > 0 && (
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <h2 className="mb-3 text-lg font-semibold">Your Positions</h2>
            <div className="space-y-1">
              {positions.map((pos) => {
                const isNo = pos.marketId.endsWith("_no");
                const currentPrice = priceMap.get(pos.marketId) ?? 0;
                const entryPrice = pos.avgEntryPrice;
                const delta = currentPrice - entryPrice;
                const totalPnl = delta * pos.shares;
                const profitable = delta >= 0;
                const isExpanded = expandedPositions.has(pos.marketId);

                const toggleExpand = () => {
                  setExpandedPositions((prev) => {
                    const next = new Set(prev);
                    if (next.has(pos.marketId)) next.delete(pos.marketId);
                    else next.add(pos.marketId);
                    return next;
                  });
                };

                return (
                  <div key={pos.marketId}>
                    <button
                      onClick={toggleExpand}
                      className="flex w-full items-center justify-between py-2.5 px-2 text-sm gap-2 rounded hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold ${
                          isNo ? "bg-slate-700/60 text-slate-300" : "bg-yellow-900/50 text-yellow-400"
                        }`}>
                          {isNo ? "NO" : "YES"}
                        </span>
                        <span className="truncate text-left">{pos.marketName}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-muted-foreground text-xs">
                          {pos.shares % 1 === 0 ? pos.shares : pos.shares.toFixed(1)} shares
                        </span>
                        <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                          profitable ? "bg-green-900/50 text-green-400" : "bg-red-900/50 text-red-400"
                        }`}>
                          {profitable ? "+" : ""}{(delta * 100).toFixed(0)}¢
                        </span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="ml-8 mb-2 px-2 py-2 rounded bg-muted/10 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Current Price</span>
                          <span className="font-mono font-medium">{Math.round(currentPrice * 100)}¢</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Avg Entry Price</span>
                          <span className="font-mono font-medium">{Math.round(entryPrice * 100)}¢</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">P/L per Share</span>
                          <span className={`font-mono font-semibold ${profitable ? "text-green-400" : "text-red-400"}`}>
                            {profitable ? "+" : ""}{(delta * 100).toFixed(1)}¢
                          </span>
                        </div>
                        <div className="flex justify-between border-t border-border/20 pt-1">
                          <span className="text-muted-foreground">Total P/L</span>
                          <span className={`font-mono font-bold ${profitable ? "text-green-400" : "text-red-400"}`}>
                            {profitable ? "+" : ""}${totalPnl.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
