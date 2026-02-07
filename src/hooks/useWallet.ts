"use client";

import { useState, useCallback } from "react";

const STARTING_BALANCE = 100;

export interface Position {
  marketId: string;
  marketName: string;
  shares: number;
  avgEntryPrice: number;
}

export const useWallet = () => {
  const [balance, setBalance] = useState(STARTING_BALANCE);
  const [positions, setPositions] = useState<Position[]>([]);

  const buyYes = useCallback(
    (marketId: string, marketName: string, shares: number, yesPrice: number) => {
      if (shares <= 0 || yesPrice <= 0) return false;

      const cost = parseFloat((shares * yesPrice).toFixed(2));
      if (cost > balance) return false;

      setBalance((prev) => parseFloat((prev - cost).toFixed(2)));
      setPositions((prev) => {
        const existing = prev.find((p) => p.marketId === marketId);
        if (existing) {
          const totalShares = existing.shares + shares;
          const totalCost =
            existing.shares * existing.avgEntryPrice + cost;
          return prev.map((p) =>
            p.marketId === marketId
              ? {
                  ...p,
                  shares: totalShares,
                  avgEntryPrice: totalCost / totalShares,
                }
              : p
          );
        }
        return [...prev, { marketId, marketName, shares, avgEntryPrice: yesPrice }];
      });

      return true;
    },
    [balance]
  );

  const sellYes = useCallback(
    (marketId: string, sharesToSell: number, currentPrice: number) => {
      if (sharesToSell <= 0 || currentPrice <= 0) return false;

      const existing = positions.find((p) => p.marketId === marketId);
      if (!existing || sharesToSell > existing.shares) return false;

      const proceeds = parseFloat((sharesToSell * currentPrice).toFixed(2));
      setBalance((prev) => parseFloat((prev + proceeds).toFixed(2)));
      setPositions((prev) => {
        const remaining = existing.shares - sharesToSell;
        if (remaining <= 0) {
          return prev.filter((p) => p.marketId !== marketId);
        }
        return prev.map((p) =>
          p.marketId === marketId ? { ...p, shares: remaining } : p
        );
      });

      return true;
    },
    [positions]
  );

  const portfolioValue = useCallback(
    (getPriceForMarket: (marketId: string) => number) => {
      return positions.reduce((total, p) => {
        return total + p.shares * getPriceForMarket(p.marketId);
      }, 0);
    },
    [positions]
  );

  return { balance, positions, buyYes, sellYes, portfolioValue };
};
