"use client";

import { useState, useEffect, useCallback } from "react";

const ODDS_API_URL = "/api/odds";
const POLL_INTERVAL = 5000;

export interface Market {
  id: string;
  question: string;
  slug: string;
  outcomes: string[];
  outcomePrices: string[];
  groupItemTitle: string;
  image: string;
  icon: string;
  volume: string;
  active: boolean;
  closed: boolean;
  lastTradePrice: number;
  bestAsk: number;
  clobTokenIds: string[];
  endDate: string;
  description: string;
}

export interface SuperBowlEvent {
  id: string;
  title: string;
  slug: string;
  description: string;
  active: boolean;
  closed: boolean;
  liquidity: number;
  volume: number;
  markets: Market[];
}

const safeJsonParse = (val: unknown, fallback: unknown[] = []): string[] => {
  if (typeof val !== "string") return fallback as string[];
  try { return JSON.parse(val); } catch { return fallback as string[]; }
};

const parseMarket = (raw: Record<string, unknown>): Market => ({
  id: raw.id as string,
  question: raw.question as string,
  slug: raw.slug as string,
  outcomes: safeJsonParse(raw.outcomes),
  outcomePrices: safeJsonParse(raw.outcomePrices, ["0", "0"]),
  groupItemTitle: raw.groupItemTitle as string,
  image: raw.image as string,
  icon: raw.icon as string,
  volume: raw.volume as string,
  active: raw.active as boolean,
  closed: raw.closed as boolean,
  lastTradePrice: raw.lastTradePrice as number,
  bestAsk: raw.bestAsk as number,
  clobTokenIds: safeJsonParse(raw.clobTokenIds),
  endDate: raw.endDate as string,
  description: raw.description as string,
});

const parseEvent = (raw: Record<string, unknown>): SuperBowlEvent => ({
  id: raw.id as string,
  title: raw.title as string,
  slug: raw.slug as string,
  description: raw.description as string,
  active: raw.active as boolean,
  closed: raw.closed as boolean,
  liquidity: raw.liquidity as number,
  volume: raw.volume as number,
  markets: ((raw.markets as Record<string, unknown>[]) || [])
    .map(parseMarket)
    .filter((m) => m.active && !m.closed),
});

export const useSuperBowlOdds = () => {
  const [events, setEvents] = useState<SuperBowlEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOdds = useCallback(async () => {
    try {
      const res = await fetch(ODDS_API_URL);

      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      const data = await res.json();

      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error("No event data returned");
      }

      const parsed = data.map(parseEvent).filter((e: SuperBowlEvent) => e.markets.length > 0);

      console.log("[useSuperBowlOdds] Events:", parsed.map((e) => ({
        title: e.title,
        markets: e.markets.map((m) => ({
          team: m.groupItemTitle,
          yesPrice: m.outcomePrices[0],
        })),
      })));

      setEvents(parsed);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[useSuperBowlOdds] Fetch error:", message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOdds();
    const interval = setInterval(fetchOdds, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchOdds]);

  return { events, isLoading, error };
};
