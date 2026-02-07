# Spec: Super Bowl LX (Seahawks vs Patriots) Betting Toy

## 1. Core Concept
A real-time simulated betting dashboard for Super Bowl LX (Feb 8, 2026).
- Users start with **$100.00** (Simulated Play Money).
- Users can buy "YES" shares on outcomes using real-time Polymarket odds.
- **Goal:** Leaderboard showing who made the most profit by the end of the game.

## 2. Real-Time Data (Polymarket)
Fetch these specific markets (Search query: "Super Bowl LX"):
1.  **Game Winner:** Seattle Seahawks vs New England Patriots.
2.  **Coin Toss:** Heads vs Tails.
3.  **Halftime Show:** "First Song by Bad Bunny" (or similar active prop bets).

## 3. User Experience (The Flow)
1.  **Landing:** User enters a Display Name (e.g., "Dharma") -> Account created with $100.
2.  **Dashboard:**
    - Top: "Balance: $100.00" | "Portfolio Value: $0.00"
    - Center: Cards for each Bet.
        - *Example Card:* "Seahawks to Win" | Price: 68¢ | [BUY YES]
    - Bottom: "Live Bets" feed (simulated or real from other users).
3.  **Betting Logic (Simplified):**
    - User clicks [BUY YES] on Seahawks at 68¢.
    - Input: "Amount to wager" (e.g., $10).
    - System calculates shares: $10 / $0.68 = 14.7 shares.
    - Money deducted from Balance. Shares added to Portfolio.
    - *Note:* No "Selling" logic needed for MVP. Just Buy and Hold until resolution.

## 4. Database Schema (Supabase)
- `users`: id, username, cash_balance (float), created_at
- `positions`: id, user_id, market_name (string), shares_owned (float), avg_entry_price (float)
- `leaderboard`: View calculating `cash_balance + (shares * current_market_price)`

## 5. Deployment
- Domain: `www.dharmanaidu.com/superbowl2026`
- Host: Vercel (Project: `superbowl-bet-sim`)
