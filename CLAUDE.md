# CLAUDE.md - Project Guidelines

## Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS + Shadcn UI (Lucide Icons)
- **Database:** Supabase (Postgres) - *Keep it simple: Users table + Bets table.*
- **Auth:** Supabase Auth (Email/Password or Anonymous)
- **Deployment:** Vercel

## Data Source Strategy
- **Provider:** Polymarket API (Gamma API)
- **Endpoint:** `https://gamma-api.polymarket.com/events`
- **Method:** Client-side polling every 5 seconds (SWR or React Query).
- **No Backend Proxy:** Fetch directly from client to avoid rate limits on Vercel.

## Coding Standards
- **Functional Components:** Arrow functions only.
- **Strict Types:** Define a `Market` interface matching the Polymarket JSON.
- **Error Handling:** If API fails, show "Market Paused" UI, don't crash.
- **Simplicity:** No complex order books. "Buy" = Market Buy at current 'Yes' price.

## Behavior Rules
- **Speed:** If I ask for a feature, build the simplest working version first.
- **Styling:** Use a "Dark Mode" sports betting aesthetic (Greens, Dark Greys, Neon accents).
- **Files:** Keep components small. Put logic in custom hooks (e.g., `usePolymarketOdds`).
