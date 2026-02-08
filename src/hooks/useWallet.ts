"use client";

import { useState, useCallback, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";

const STARTING_BALANCE = 100;
const USER_ID_KEY = "superbowl2026_user_id";
const USER_NAME_KEY = "superbowl2026_user_name";

export interface Position {
  marketId: string;
  marketName: string;
  shares: number;
  avgEntryPrice: number;
}

export const useWallet = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState(STARTING_BALANCE);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const stored = localStorage.getItem(USER_ID_KEY);
        if (!stored) {
          setNeedsLogin(true);
          setIsLoading(false);
          return;
        }

        setUserId(stored);
        setDisplayName(localStorage.getItem(USER_NAME_KEY));

        const { data: user } = await getSupabase()
          .from("users")
          .select("balance")
          .eq("id", stored)
          .single();
        if (user) setBalance(Number(user.balance));

        const { data: rows } = await getSupabase()
          .from("positions")
          .select("market_id, market_name, shares, avg_entry_price")
          .eq("user_id", stored);
        if (rows) {
          setPositions(
            rows.map((r) => ({
              marketId: r.market_id,
              marketName: r.market_name,
              shares: Number(r.shares),
              avgEntryPrice: Number(r.avg_entry_price),
            }))
          );
        }
      } catch (err) {
        console.error("Failed to initialize wallet:", err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const buyYes = useCallback(
    async (marketId: string, marketName: string, shares: number, yesPrice: number) => {
      if (!userId || shares <= 0 || yesPrice <= 0) return false;

      const cost = parseFloat((shares * yesPrice).toFixed(2));
      if (cost > balance) return false;

      const newBalance = parseFloat((balance - cost).toFixed(2));

      const { error: balErr } = await getSupabase()
        .from("users")
        .update({ balance: newBalance })
        .eq("id", userId);
      if (balErr) return false;

      setBalance(newBalance);

      // Log transaction
      await getSupabase().from("transactions").insert({
        user_id: userId,
        market_id: marketId,
        market_name: marketName,
        action_type: "BUY",
        shares,
        price_per_share: yesPrice,
        total_cost: cost,
      });

      // Upsert position
      const existing = positions.find((p) => p.marketId === marketId);
      if (existing) {
        const totalShares = existing.shares + shares;
        const totalCost = existing.shares * existing.avgEntryPrice + cost;
        const newAvg = totalCost / totalShares;

        await getSupabase()
          .from("positions")
          .update({
            shares: totalShares,
            avg_entry_price: newAvg,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("market_id", marketId);

        setPositions((prev) =>
          prev.map((p) =>
            p.marketId === marketId
              ? { ...p, shares: totalShares, avgEntryPrice: newAvg }
              : p
          )
        );
      } else {
        await getSupabase().from("positions").insert({
          user_id: userId,
          market_id: marketId,
          market_name: marketName,
          shares,
          avg_entry_price: yesPrice,
        });

        setPositions((prev) => [
          ...prev,
          { marketId, marketName, shares, avgEntryPrice: yesPrice },
        ]);
      }

      return true;
    },
    [userId, balance, positions]
  );

  const sellYes = useCallback(
    async (marketId: string, sharesToSell: number, currentPrice: number) => {
      if (!userId || sharesToSell <= 0 || currentPrice <= 0) return false;

      const existing = positions.find((p) => p.marketId === marketId);
      if (!existing || sharesToSell > existing.shares) return false;

      const proceeds = parseFloat((sharesToSell * currentPrice).toFixed(2));
      const newBalance = parseFloat((balance + proceeds).toFixed(2));

      const { error: balErr } = await getSupabase()
        .from("users")
        .update({ balance: newBalance })
        .eq("id", userId);
      if (balErr) return false;

      setBalance(newBalance);

      // Log transaction
      await getSupabase().from("transactions").insert({
        user_id: userId,
        market_id: marketId,
        market_name: existing.marketName,
        action_type: "SELL",
        shares: sharesToSell,
        price_per_share: currentPrice,
        total_cost: proceeds,
      });

      // Update or remove position
      const remaining = existing.shares - sharesToSell;
      if (remaining <= 0) {
        await getSupabase()
          .from("positions")
          .delete()
          .eq("user_id", userId)
          .eq("market_id", marketId);

        setPositions((prev) => prev.filter((p) => p.marketId !== marketId));
      } else {
        await getSupabase()
          .from("positions")
          .update({
            shares: remaining,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId)
          .eq("market_id", marketId);

        setPositions((prev) =>
          prev.map((p) =>
            p.marketId === marketId ? { ...p, shares: remaining } : p
          )
        );
      }

      return true;
    },
    [userId, balance, positions]
  );

  const portfolioValue = useCallback(
    (getPriceForMarket: (marketId: string) => number) => {
      return positions.reduce((total, p) => {
        return total + p.shares * getPriceForMarket(p.marketId);
      }, 0);
    },
    [positions]
  );

  const refreshBalance = useCallback(async () => {
    if (!userId) return;
    const { data } = await getSupabase()
      .from("users")
      .select("balance")
      .eq("id", userId)
      .single();
    if (data) setBalance(Number(data.balance));
  }, [userId]);

  const refreshPositions = useCallback(async () => {
    if (!userId) return;
    const { data: rows } = await getSupabase()
      .from("positions")
      .select("market_id, market_name, shares, avg_entry_price")
      .eq("user_id", userId);
    if (rows) {
      setPositions(
        rows.map((r) => ({
          marketId: r.market_id,
          marketName: r.market_name,
          shares: Number(r.shares),
          avgEntryPrice: Number(r.avg_entry_price),
        }))
      );
    }
  }, [userId]);

  return { balance, positions, buyYes, sellYes, portfolioValue, isLoading, needsLogin, displayName, userId, refreshBalance, refreshPositions };
};
