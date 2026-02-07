import { NextResponse } from "next/server";

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

export const GET = async () => {
  try {
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

    const events = results.filter(Boolean);
    return NextResponse.json(events);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch from Polymarket" },
      { status: 502 }
    );
  }
};
