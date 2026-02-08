"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { getSupabase } from "@/lib/supabase";
import { SuperBowlEvent } from "@/hooks/useSuperBowlOdds";

export interface LimitOrder {
  id: string;
  marketId: string;
  marketName: string;
  orderType: "BUY" | "SELL";
  shares: number;
  limitPrice: number;
  escrowedAmount: number;
  status: "PENDING" | "FILLED" | "CANCELLED";
  createdAt: string;
  filledAt: string | null;
}

interface UseLimitOrdersOptions {
  userId: string | null;
  refreshBalance: () => Promise<void>;
  refreshPositions: () => Promise<void>;
}

export const useLimitOrders = ({ userId, refreshBalance, refreshPositions }: UseLimitOrdersOptions) => {
  const [limitOrders, setLimitOrders] = useState<LimitOrder[]>([]);
  const fillingRef = useRef<Set<string>>(new Set());

  // Load orders on mount
  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const { data } = await getSupabase()
        .from("limit_orders")
        .select("*")
        .eq("user_id", userId)
        .in("status", ["PENDING", "FILLED"])
        .order("created_at", { ascending: false });
      if (data) {
        setLimitOrders(data.map(mapRow));
      }
    };
    load();
  }, [userId]);

  const getLockedShares = useCallback(
    (marketId: string) =>
      limitOrders
        .filter((o) => o.marketId === marketId && o.orderType === "SELL" && o.status === "PENDING")
        .reduce((sum, o) => sum + o.shares, 0),
    [limitOrders]
  );

  const placeBuyLimit = useCallback(
    async (marketId: string, marketName: string, shares: number, limitPrice: number) => {
      if (!userId || shares <= 0 || limitPrice <= 0 || limitPrice >= 1) return false;

      const escrow = parseFloat((shares * limitPrice).toFixed(2));

      // Deduct escrow from balance atomically — read current balance first
      const { data: user } = await getSupabase()
        .from("users")
        .select("balance")
        .eq("id", userId)
        .single();
      if (!user || Number(user.balance) < escrow) return false;

      const newBalance = parseFloat((Number(user.balance) - escrow).toFixed(2));
      const { error: balErr } = await getSupabase()
        .from("users")
        .update({ balance: newBalance })
        .eq("id", userId);
      if (balErr) return false;

      const { data: row, error: insErr } = await getSupabase()
        .from("limit_orders")
        .insert({
          user_id: userId,
          market_id: marketId,
          market_name: marketName,
          order_type: "BUY",
          shares,
          limit_price: limitPrice,
          escrowed_amount: escrow,
          status: "PENDING",
        })
        .select()
        .single();

      if (insErr || !row) {
        // Refund on failure
        await getSupabase()
          .from("users")
          .update({ balance: Number(user.balance) })
          .eq("id", userId);
        await refreshBalance();
        return false;
      }

      setLimitOrders((prev) => [mapRow(row), ...prev]);
      await refreshBalance();
      return true;
    },
    [userId, refreshBalance]
  );

  const placeSellLimit = useCallback(
    async (marketId: string, marketName: string, shares: number, limitPrice: number) => {
      if (!userId || shares <= 0 || limitPrice <= 0 || limitPrice >= 1) return false;

      const { data: row, error: insErr } = await getSupabase()
        .from("limit_orders")
        .insert({
          user_id: userId,
          market_id: marketId,
          market_name: marketName,
          order_type: "SELL",
          shares,
          limit_price: limitPrice,
          escrowed_amount: 0,
          status: "PENDING",
        })
        .select()
        .single();

      if (insErr || !row) return false;

      setLimitOrders((prev) => [mapRow(row), ...prev]);
      return true;
    },
    [userId]
  );

  const cancelOrder = useCallback(
    async (orderId: string) => {
      if (!userId) return false;

      const order = limitOrders.find((o) => o.id === orderId);
      if (!order || order.status !== "PENDING") return false;

      const { data, error } = await getSupabase()
        .from("limit_orders")
        .update({ status: "CANCELLED" })
        .eq("id", orderId)
        .eq("status", "PENDING")
        .select()
        .single();

      if (error || !data) return false;

      // Refund escrow for BUY orders
      if (order.orderType === "BUY" && order.escrowedAmount > 0) {
        const { data: user } = await getSupabase()
          .from("users")
          .select("balance")
          .eq("id", userId)
          .single();
        if (user) {
          const newBalance = parseFloat((Number(user.balance) + order.escrowedAmount).toFixed(2));
          await getSupabase()
            .from("users")
            .update({ balance: newBalance })
            .eq("id", userId);
        }
        await refreshBalance();
      }

      setLimitOrders((prev) => prev.filter((o) => o.id !== orderId));
      return true;
    },
    [userId, limitOrders, refreshBalance]
  );

  const checkAndFillOrders = useCallback(
    async (events: SuperBowlEvent[]) => {
      if (!userId) return;

      // Build price map from all markets across events
      const priceMap = new Map<string, number>();
      for (const event of events) {
        for (const market of event.markets) {
          if (!market.closed) {
            priceMap.set(market.id, parseFloat(market.outcomePrices[0]));
          }
        }
      }

      const pending = limitOrders.filter((o) => o.status === "PENDING");

      for (const order of pending) {
        const currentPrice = priceMap.get(order.marketId);
        if (currentPrice === undefined) continue;

        // Skip if already being filled by this or another tab
        if (fillingRef.current.has(order.id)) continue;

        const shouldFill =
          (order.orderType === "BUY" && currentPrice <= order.limitPrice) ||
          (order.orderType === "SELL" && currentPrice >= order.limitPrice);

        if (!shouldFill) continue;

        fillingRef.current.add(order.id);

        try {
          // Atomic status update — prevents double-fill across tabs
          const { data: filled, error: fillErr } = await getSupabase()
            .from("limit_orders")
            .update({ status: "FILLED", filled_at: new Date().toISOString() })
            .eq("id", order.id)
            .eq("status", "PENDING")
            .select()
            .single();

          if (fillErr || !filled) {
            // Another tab already filled or cancelled this order
            fillingRef.current.delete(order.id);
            continue;
          }

          if (order.orderType === "BUY") {
            await executeBuyFill(userId, order, currentPrice);
          } else {
            await executeSellFill(userId, order, currentPrice);
          }

          // Update local state
          setLimitOrders((prev) =>
            prev.map((o) =>
              o.id === order.id ? { ...o, status: "FILLED" as const, filledAt: new Date().toISOString() } : o
            )
          );

          await refreshBalance();
          await refreshPositions();
        } catch (err) {
          console.error("[useLimitOrders] Fill error:", err);
        } finally {
          fillingRef.current.delete(order.id);
        }
      }
    },
    [userId, limitOrders, refreshBalance, refreshPositions]
  );

  return { limitOrders, placeBuyLimit, placeSellLimit, cancelOrder, checkAndFillOrders, getLockedShares };
};

// --- Helpers ---

const mapRow = (r: Record<string, unknown>): LimitOrder => ({
  id: r.id as string,
  marketId: r.market_id as string,
  marketName: r.market_name as string,
  orderType: r.order_type as "BUY" | "SELL",
  shares: Number(r.shares),
  limitPrice: Number(r.limit_price),
  escrowedAmount: Number(r.escrowed_amount),
  status: r.status as "PENDING" | "FILLED" | "CANCELLED",
  createdAt: r.created_at as string,
  filledAt: r.filled_at as string | null,
});

const executeBuyFill = async (userId: string, order: LimitOrder, fillPrice: number) => {
  const fillCost = parseFloat((order.shares * fillPrice).toFixed(2));
  const escrowRefund = parseFloat((order.escrowedAmount - fillCost).toFixed(2));

  // Refund escrow difference to balance (fill price may be lower than limit)
  if (escrowRefund > 0) {
    const { data: user } = await getSupabase()
      .from("users")
      .select("balance")
      .eq("id", userId)
      .single();
    if (user) {
      const newBalance = parseFloat((Number(user.balance) + escrowRefund).toFixed(2));
      await getSupabase()
        .from("users")
        .update({ balance: newBalance })
        .eq("id", userId);
    }
  }

  // Log transaction
  await getSupabase().from("transactions").insert({
    user_id: userId,
    market_id: order.marketId,
    market_name: order.marketName,
    action_type: "BUY",
    shares: order.shares,
    price_per_share: fillPrice,
    total_cost: fillCost,
  });

  // Upsert position
  const { data: existing } = await getSupabase()
    .from("positions")
    .select("shares, avg_entry_price")
    .eq("user_id", userId)
    .eq("market_id", order.marketId)
    .single();

  if (existing) {
    const oldShares = Number(existing.shares);
    const oldAvg = Number(existing.avg_entry_price);
    const totalShares = oldShares + order.shares;
    const newAvg = (oldShares * oldAvg + order.shares * fillPrice) / totalShares;
    await getSupabase()
      .from("positions")
      .update({ shares: totalShares, avg_entry_price: newAvg, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("market_id", order.marketId);
  } else {
    await getSupabase().from("positions").insert({
      user_id: userId,
      market_id: order.marketId,
      market_name: order.marketName,
      shares: order.shares,
      avg_entry_price: fillPrice,
    });
  }
};

const executeSellFill = async (userId: string, order: LimitOrder, fillPrice: number) => {
  const proceeds = parseFloat((order.shares * fillPrice).toFixed(2));

  // Add proceeds to balance
  const { data: user } = await getSupabase()
    .from("users")
    .select("balance")
    .eq("id", userId)
    .single();
  if (user) {
    const newBalance = parseFloat((Number(user.balance) + proceeds).toFixed(2));
    await getSupabase()
      .from("users")
      .update({ balance: newBalance })
      .eq("id", userId);
  }

  // Log transaction
  await getSupabase().from("transactions").insert({
    user_id: userId,
    market_id: order.marketId,
    market_name: order.marketName,
    action_type: "SELL",
    shares: order.shares,
    price_per_share: fillPrice,
    total_cost: proceeds,
  });

  // Update or remove position
  const { data: existing } = await getSupabase()
    .from("positions")
    .select("shares")
    .eq("user_id", userId)
    .eq("market_id", order.marketId)
    .single();

  if (existing) {
    const remaining = Number(existing.shares) - order.shares;
    if (remaining <= 0) {
      await getSupabase()
        .from("positions")
        .delete()
        .eq("user_id", userId)
        .eq("market_id", order.marketId);
    } else {
      await getSupabase()
        .from("positions")
        .update({ shares: remaining, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("market_id", order.marketId);
    }
  }
};
