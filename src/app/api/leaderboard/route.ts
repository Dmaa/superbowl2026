import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

const GAMMA_API_URL = "https://gamma-api.polymarket.com/events";

const SUPER_BOWL_EVENT_SLUGS = [
  "super-bowl-champion-2026-731",
  "super-bowl-lx-mvp",
  "super-bowl-lx-coin-toss",
  "super-bowl-lx-gatorade-shower-color",
  "sup-bowl-national-anthem-ou-119pt5-seconds",
  "who-will-attend-the-2026-pro-football-championship",
  "pro-football-championship-player-to-cry-during-national-anthem",
  "super-bowl-lx-overtime",
  "super-bowl-lx-winning-seed",
  "what-will-be-said-during-the-super-bowl",
  "will-bad-bunny-say-fuck-ice-at-the-super-bowl",
  "bad-bunny-wears-a-dress-at-the-super-bowl",
  "bad-bunny-video-becomes-most-viewed-sb-halftime-on-youtube-in-1st-month",
  "super-bowl-lx-exact-outcome",
];

const safeJsonParse = (val: unknown): string[] => {
  if (typeof val !== "string") return [];
  try {
    return JSON.parse(val);
  } catch {
    return [];
  }
};

/** Build a price map from all Polymarket events: marketId → price */
const buildPriceMap = async (): Promise<Map<string, number>> => {
  const results = await Promise.all(
    SUPER_BOWL_EVENT_SLUGS.map(async (slug) => {
      const res = await fetch(`${GAMMA_API_URL}?slug=${slug}`, {
        next: { revalidate: 0 },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data[0] ?? null;
    })
  );

  const priceMap = new Map<string, number>();

  for (const event of results.filter(Boolean)) {
    const markets = (event.markets as Record<string, unknown>[]) || [];
    for (const raw of markets) {
      if (!raw.active || raw.closed) continue;

      const id = raw.id as string;
      const outcomes = safeJsonParse(raw.outcomes);
      const outcomePrices = safeJsonParse(raw.outcomePrices);

      const isYesNo =
        outcomes.length === 2 &&
        outcomes[0].toLowerCase() === "yes" &&
        outcomes[1].toLowerCase() === "no";

      if (isYesNo) {
        // Regular Yes/No market
        priceMap.set(id, parseFloat(outcomePrices[0] ?? "0"));
        priceMap.set(`${id}_no`, parseFloat(outcomePrices[1] ?? "0"));
      } else {
        // Multi-outcome: expand to virtual markets ${id}_${i}
        outcomes.forEach((_, i) => {
          const yesPrice = parseFloat(outcomePrices[i] ?? "0");
          priceMap.set(`${id}_${i}`, yesPrice);
          priceMap.set(`${id}_${i}_no`, 1 - yesPrice);
        });
      }
    }
  }

  return priceMap;
};

interface LeaderboardEntry {
  displayName: string;
  balance: number;
  positionValue: number;
  unrealizedPnl: number;
  totalValue: number;
  positionCount: number;
}

export const GET = async () => {
  try {
    const supabase = getSupabase();

    // Fetch users, positions, and prices in parallel
    const [usersResult, positionsResult, priceMap] = await Promise.all([
      supabase.from("users").select("id, display_name, balance"),
      supabase.from("positions").select("user_id, market_id, shares, avg_entry_price"),
      buildPriceMap(),
    ]);

    if (usersResult.error) {
      return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
    }
    if (positionsResult.error) {
      return NextResponse.json({ error: "Failed to fetch positions" }, { status: 500 });
    }

    const users = usersResult.data ?? [];
    const positions = positionsResult.data ?? [];

    // Group positions by user
    const positionsByUser = new Map<string, typeof positions>();
    for (const pos of positions) {
      const list = positionsByUser.get(pos.user_id) ?? [];
      list.push(pos);
      positionsByUser.set(pos.user_id, list);
    }

    // Compute leaderboard
    const leaderboard: LeaderboardEntry[] = users.map((user) => {
      const userPositions = positionsByUser.get(user.id) ?? [];
      const balance = Number(user.balance);

      let positionValue = 0;
      let unrealizedPnl = 0;

      for (const pos of userPositions) {
        const shares = Number(pos.shares);
        const avgEntry = Number(pos.avg_entry_price);
        const currentPrice = priceMap.get(pos.market_id) ?? 0;

        positionValue += shares * currentPrice;
        unrealizedPnl += shares * (currentPrice - avgEntry);
      }

      return {
        displayName: user.display_name ?? "Anonymous",
        balance,
        positionValue,
        unrealizedPnl,
        totalValue: balance + positionValue,
        positionCount: userPositions.length,
      };
    });

    // Sort by total value descending
    leaderboard.sort((a, b) => b.totalValue - a.totalValue);

    return NextResponse.json(leaderboard);
  } catch {
    return NextResponse.json(
      { error: "Failed to compute leaderboard" },
      { status: 500 }
    );
  }
};
