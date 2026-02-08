"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Trophy, ArrowLeft } from "lucide-react";

const basePath = process.env.__NEXT_ROUTER_BASEPATH || "";

const STARTING_BALANCE = 100;

interface LeaderboardEntry {
  displayName: string;
  balance: number;
  positionValue: number;
  unrealizedPnl: number;
  totalValue: number;
}

const POLL_INTERVAL = 30_000;

const LeaderboardPage = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch(`${basePath}/api/leaderboard`);
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const data = await res.json();
      setEntries(data);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-muted-foreground animate-pulse">
          Loading Leaderboard...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-destructive">
          Failed to load leaderboard — {error}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-yellow-400" />
            <div>
              <h1 className="text-xl font-bold text-green-400">Leaderboard</h1>
              <p className="text-sm text-muted-foreground">
                Super Bowl LX — Feb 8, 2026
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1 rounded-lg border border-border/50 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Markets
          </Link>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
          {/* Desktop table header */}
          <div className="hidden md:grid grid-cols-[2rem_1fr_6.5rem_6.5rem_6.5rem] gap-3 px-4 py-3 border-b border-border/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <span>#</span>
            <span>Player</span>
            <span className="text-right">Cash</span>
            <span className="text-right">Portfolio</span>
            <span className="text-right">Total P/L</span>
          </div>

          {/* Mobile table header */}
          <div className="grid md:hidden grid-cols-[1fr_5.5rem] gap-2 px-4 py-3 border-b border-border/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <span>Player</span>
            <span className="text-right">Cash</span>
          </div>

          {/* Rows */}
          {entries.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground">
              No players yet
            </div>
          ) : (
            entries.map((entry, i) => {
              const rank = i + 1;
              const totalPnl = entry.totalValue - STARTING_BALANCE;
              const pnlPositive = totalPnl >= 0;

              const rankColor =
                rank === 1
                  ? "text-yellow-400"
                  : rank === 2
                    ? "text-slate-300"
                    : rank === 3
                      ? "text-amber-600"
                      : "text-muted-foreground";

              const borderColor =
                rank === 1
                  ? "border-l-yellow-400"
                  : rank === 2
                    ? "border-l-slate-300"
                    : rank === 3
                      ? "border-l-amber-700"
                      : "";

              const rowBg = i % 2 === 0 ? "bg-card" : "bg-muted/10";

              return (
                <div key={`${entry.displayName}-${i}`}>
                  {/* Desktop row */}
                  <div
                    className={`hidden md:grid grid-cols-[2rem_1fr_6.5rem_6.5rem_6.5rem] gap-3 px-4 py-3 text-sm items-center ${rowBg} ${rank <= 3 ? "border-l-2" : ""} ${borderColor}`}
                  >
                    <span className={`font-bold ${rankColor}`}>{rank}</span>
                    <span className="font-medium truncate">{entry.displayName}</span>
                    <span className="text-right font-bold text-green-400 font-mono">
                      ${entry.balance.toFixed(2)}
                    </span>
                    <span className="text-right text-muted-foreground font-mono">
                      ${entry.totalValue.toFixed(2)}
                    </span>
                    <span className={`text-right font-mono font-semibold ${pnlPositive ? "text-green-400" : "text-red-400"}`}>
                      {pnlPositive ? "+" : ""}${totalPnl.toFixed(2)}
                    </span>
                  </div>

                  {/* Mobile row */}
                  <div
                    className={`md:hidden px-4 py-3 text-sm ${rowBg} ${rank <= 3 ? "border-l-2" : ""} ${borderColor}`}
                  >
                    <div className="grid grid-cols-[1fr_5.5rem] gap-2 items-center">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`font-bold shrink-0 ${rankColor}`}>{rank}</span>
                        <span className="font-medium truncate">{entry.displayName}</span>
                      </div>
                      <span className="text-right font-bold text-green-400 font-mono">
                        ${entry.balance.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex gap-3 mt-1 ml-6 text-xs text-muted-foreground">
                      <span>Portfolio: ${entry.totalValue.toFixed(2)}</span>
                      <span className={pnlPositive ? "text-green-400/70" : "text-red-400/70"}>
                        P/L: {pnlPositive ? "+" : ""}${totalPnl.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground">
          All players start with $100.00 · Refreshes every 30s
        </p>
      </div>
    </div>
  );
};

export default LeaderboardPage;
