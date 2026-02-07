"use client";

import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const STARTING_BALANCE = 100;
const USER_ID_KEY = "superbowl2026_user_id";

export interface Position {
  marketId: string;
  marketName: string;
  shares: number;
  avgEntryPrice: number;
}

const getOrCreateUserId = async (): Promise<string> => {
  const stored = localStorage.getItem(USER_ID_KEY);
  if (stored) return stored;

  const { data, error } = await supabase
    .from("users")
    .insert({ balance: STARTING_BALANCE })
    .select("id")
    .single();

  if (error) throw error;
  localStorage.setItem(USER_ID_KEY, data.id);
  return data.id;
};

export const useWallet = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState(STARTING_BALANCE);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize user and load data
  useEffect(() => {
    const init = async () => {
      try {
        const id = await getOrCreateUserId();
        setUserId(id);

        // Load balance
        const { data: user } = await supabase
          .from("users")
          .select("balance")
          .eq("id", id)
          .single();
        if (user) setBalance(Number(user.balance));

        // Load positions
        const { data: bets } = await supabase
          .from("bets")
          .select("market_id, market_name, shares, avg_entry_price")
          .eq("user_id", id);
        if (bets) {
          setPositions(
            bets.map((b) => ({
              marketId: b.market_id,
              marketName: b.market_name,
              shares: Number(b.shares),
              avgEntryPrice: Number(b.avg_entry_price),
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

      // Update balance in DB
      const { error: balErr } = await supabase
        .from("users")
        .update({ balance: newBalance })
        .eq("id", userId);
      if (balErr) return false;

      setBalance(newBalance);

      // Upsert position
      const existing = positions.find((p) => p.marketId === marketId);
      if (existing) {
        const totalShares = existing.shares + shares;
        const totalCost = existing.shares * existing.avgEntryPrice + cost;
        const newAvg = totalCost / totalShares;

        await supabase
          .from("bets")
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
        await supabase.from("bets").insert({
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

      // Update balance
      const { error: balErr } = await supabase
        .from("users")
        .update({ balance: newBalance })
        .eq("id", userId);
      if (balErr) return false;

      setBalance(newBalance);

      // Update or remove position
      const remaining = existing.shares - sharesToSell;
      if (remaining <= 0) {
        await supabase
          .from("bets")
          .delete()
          .eq("user_id", userId)
          .eq("market_id", marketId);

        setPositions((prev) => prev.filter((p) => p.marketId !== marketId));
      } else {
        await supabase
          .from("bets")
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

  return { balance, positions, buyYes, sellYes, portfolioValue, isLoading };
};
