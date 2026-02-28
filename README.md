# HomePilot 🏠
**AI Rental Copilot — built for first-time renters.**

HomePilot is a proactive AI-powered rental platform that monitors listings, predicts approval odds, detects scams, and guides users through the entire rental application process — without waiting for them to ask.

---

## What It Does

- **Renter Passport** — a one-time document setup that bundles everything a landlord needs into a downloadable ZIP, reusable across all applications with 1-click auto-fill
- **Acceptance Probability Engine** — scores every listing with an approval % based on the user's income, credit, and profile
- **Proactive AI Coach** — guides first-time renters step by step through every document they need, with button-driven flows (no typing required)
- **Realtime Alert Feed** — surfaces high-match listings, scam risks, and urgency signals the moment they appear
- **Auto-Optimization Engine** — suggests profile improvements ranked by approval impact (e.g. "Add guarantor → +12%")
- **Livability & Risk Intelligence** — crime index, rent inflation trend, demand heat, and scam detection per property

---

## Key Design Principle

> The AI never waits for the user to ask. Every interface decision point surfaces pre-built action buttons — the user selects, the AI reacts.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) |
| Auth | Supabase Auth (email, Google OAuth, magic link) |
| Database | Supabase (PostgreSQL) |
| File Storage | Supabase Storage |
| Realtime | Supabase Realtime |
| AI Coach | Anthropic Claude API (Haiku + Sonnet) |
| Background Jobs | Supabase Edge Functions + pg_cron |
| Email | Resend |
| ZIP/PDF Generation | jszip + pdf-lib (client-side) |
| Deployment | Vercel |

---

## Build Phases

1. **Foundation** — Supabase setup, auth, Next.js scaffold
2. **Onboarding** — Profile flow, Renter Score calculation
3. **Document Coaching** — AI coach, uploads, situation selector
4. **Passport Export** — ZIP assembly, review screen, expiry emails
5. **Listings & Alerts** — Scraper, scorer, realtime alert feed
6. **Strategy & Polish** — Suggestions engine, nudge system, mobile

---

## Getting Started

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Deploy
vercel --prod
```
