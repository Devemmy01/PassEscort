# PassEscort — Product Requirements Document

**Status:** Draft v1
**Source:** Adapted from the original "Handy Genius 10-Week Masterplan" planning document, retargeted to the actual tech stack (React Native/Expo, Node/Express, MongoDB, Firebase) in place of the original Flutter/Supabase proposal.

## 1. Summary

PassEscort is a gamified exam-prep mobile app for Nigerian secondary school students preparing for **JAMB UTME**, **WASSCE**, and **NECO**. It combines an offline-capable past-question bank with dopamine-driven progression mechanics (XP, streaks, levels, badges), real-time 1v1 quiz duels, AI-generated step-by-step explanations, and social sharing — monetized through low-friction micro-payments (day passes, monthly subscriptions).

## 2. Problem & Target Users

Nigerian JAMB/WASSCE/NECO candidates need cheap, engaging, high-repetition practice on official past questions. Existing options are either static PDF/paper question banks (no feedback loop, no motivation mechanics) or expensive tutorial centers. Target users are secondary school students (SS2/SS3) and private "GCE" candidates, most on low-end Android devices with unreliable/expensive data — which is why offline capability and small app size matter.

## 3. Goals & Success Metrics

- Time-to-first-practice-session under 2 minutes from install (fast onboarding).
- High D1/D7 retention driven by streaks and daily targets.
- Conversion from free practice to paid tiers (Day Pass / Monthly Subscription).
- Viral coefficient from social share cards and 1v1 duel invites.

## 4. Tech Stack (current decision)

| Layer | Choice | Notes |
| --- | --- | --- |
| Mobile client | React Native + Expo, TypeScript | Single codebase, Android & iOS |
| Backend API | Node.js + Express, TypeScript | Replaces the original Supabase-based backend |
| Primary database | MongoDB (Mongoose) | Replaces the original Postgres (Supabase) |
| Auth | Firebase Authentication | Replaces Supabase Auth; backend verifies Firebase ID tokens. Email/password and Google sign-in |
| Push notifications | Firebase Cloud Messaging, through the Expo push service | Built: streak reminders (6 pm WAT cron), duel invites, friend joined, payout sent. Per-category opt-out |
| AI explanations | Groq API (`openai/gpt-oss-120b`) with Gemini (`gemini-flash-lite-latest`) fallback | Built. Both free tiers; explanations are cached per question and can be pre-generated once (`npm run ai:pregenerate`) |
| Payments | Paystack | Built (hosted checkout, verification, webhook). Flutterwave not needed for v1 |
| Realtime (1v1 duels) | Socket.io | Built; see Open Decisions |
| On-device offline storage | expo-sqlite (SQLite + FTS5) | Decided — see Section 10/11; question bank is bulk-seeded into an on-device SQLite database with an FTS5 index for instant local search/filtering |
| CI/CD | GitHub Actions | Separate workflows for `frontend/` and `backend/`, path-filtered |

## 5. Core Features

### 5.1 Onboarding
Target exam selection (JAMB vs. WAEC/NECO), subject selection, daily study-time target, mascot/persona welcome screen.

### 5.2 Practice Question Bank
Digitized past questions (2010–2025) across 6 initial subjects: English, Mathematics, Physics, Chemistry, Biology, Economics. Each question tagged with subject, exam body, year, topic, difficulty, and answer key.

### 5.3 Practice Modes
- **JAMB CBT mode:** timed 40-question sprints matching the real CBT format.
- **WAEC/NECO mode:** objective + theory view with step-by-step breakdowns.

### 5.4 Gamification Engine
XP per correct answer, daily streaks with a "streak repair" paid recovery, level progression (Level 1 "Novice" → Level 50 "UTME Legend"), badges, and a profile mastery/stats page.

### 5.5 AI Step-by-Step Explanations
On difficult questions, the backend calls Groq/Gemini with the question + official mark scheme to generate a plain-language, step-by-step explanation, gated as a paid feature.

### 5.6 Real-time 1v1 PvP Quiz Duels
Two users are matched (or one invites another via a shareable link) into a synchronized, timed quiz battle with live score updates and a victory/defeat summary screen.

### 5.7 Social Sharing
Auto-generated share cards ("I just scored 95% in WAEC Physics — challenge me!") for WhatsApp Status, plus one-tap `wa.me` deep links to invite friends to a duel.

### 5.8 Monetization
- Day Pass (₦100), Monthly Subscription (₦800), Streak Repair Gems, via Paystack/Flutterwave in-app checkout.
- Paywall gates unlimited AI explanations and full past-question solution access.

### 5.9 Ambassador / Referral Program
Student ambassadors get a unique referral code and earn a commission on subscriptions purchased through it.

## 6. Non-Functional Requirements

- Practice must work with zero or intermittent connectivity (subject to the offline-storage decision below).
- App binary size target: under 25 MB.
- Must run acceptably on low-end Android devices/screens.
- Infrastructure cost should stay on free/low-cost tiers as long as possible (Firebase free tier, MongoDB Atlas free tier, Groq/Gemini free tier).
- No score/XP manipulation from a compromised or offline client — server is the source of truth for anything that affects leaderboards or payments.

## 7. Data Model (initial MongoDB collections)

- `users` — Firebase UID, email, target exam, subjects, daily target, (gamification fields added in Phase 2: xp, level, streak, badges).
- `questions` — subject, exam body, year, topic, difficulty, prompt, options, answer key.
- `attempts` — user, question, selected answer, correctness, timestamp (source of truth for scoring/leaderboards).
- `duels` — participants, question set, per-participant scores, status, timestamps.
- `transactions` — user, product (day pass / monthly / gem), amount, payment provider reference, status.
- `ambassadors` — user, referral code, referred users, commission accrued.

Only `users` exists so far (backend/src/models/User.ts); the rest are created as their owning features are implemented.

## 8. System Architecture

```
┌─────────────────────────────┐
│   React Native (Expo) app   │
│  - Practice UI, duels, etc. │
│  - Firebase Auth SDK        │
└──────────────┬───────────────┘
               │ HTTPS (Firebase ID token)      │ Realtime (TBD)
               ▼                                 ▼
┌─────────────────────────────┐     ┌─────────────────────────┐
│   Node/Express API          │     │  Realtime duel service   │
│  - verifies Firebase tokens │     │  (Socket.io — TBD)       │
│  - business logic           │     └─────────────────────────┘
└──────────────┬───────────────┘
               ▼
        ┌─────────────┐        ┌────────────────────┐
        │  MongoDB     │        │ Groq / Gemini API   │
        │  (Mongoose)  │        │ Paystack/Flutterwave│
        └─────────────┘        └────────────────────┘
```

## 9. Roadmap

The original masterplan assumed a 4-person volunteer team (Founder, Developer, UI/UX, Growth) executing in parallel over 10 weeks. Restated as engineering milestones for the actual team composition building this:

1. **Foundation** — repo, RN/Expo scaffold, Express + MongoDB + Firebase Auth scaffold, CI/CD. _(In progress — see Section 10.)_
2. **Content pipeline** — ingest and tag past questions into MongoDB; build the practice question API.
3. **Practice UX** — onboarding flow, CBT/theory practice screens, offline storage decision implemented.
4. **Gamification** — XP/streak/level engine, profile stats, badges.
5. **AI explanations** — Groq/Gemini integration behind the paywall boundary.
6. **Realtime duels** — matchmaking, synchronized quiz battles, share cards.
7. **Monetization** — Paystack/Flutterwave integration, paywall UI.
8. **Beta** — closed beta, offline edge-case hardening, bug sweeps.
9. **Launch** — store submission, ambassador/referral program activation.

## 10. Current Status

- Git repo initialized (`main` branch).
- **Product build (2026-11-21): every §5 feature is implemented end to end.** See the root `README.md` for running it.
  - `shared/`: one copy of the rules both apps compile against: XP and levels, streaks (WAT calendar days), badges, mastery, pricing, referral and ambassador rules, duel scoring, and the typed HTTP and Socket.io contracts.
  - `backend/`: Express + MongoDB + Firebase Admin. The server is the source of truth for scores and payments (§6):
    - offline practice sync that re-marks every answer and computes XP, streaks, badges and mastery;
    - question content sync, and paywalled theory solutions;
    - AI explanations from Groq with Gemini fallback, cached per question, 3 free a day;
    - Paystack checkout, verification, webhook and idempotent fulfilment;
    - referrals; the ambassador program with commissions, payout accounts and a weekly payout run;
    - realtime duels on Socket.io (matchmaking, invite links, server clock, reconnect, labelled practice bot).
    - Every external service has a local dev/mock mode, which production refuses. 43 tests: HTTP and Socket.io integration against a real `mongod`, plus the shared rules.
  - `frontend/`: the app boots into the real flow: Firebase auth, onboarding, Home. Practice runs offline from the on-device bank, and answers queue in a persistent outbox that syncs to the server. AI Explain, Paystack checkout (in-app browser), streak repair, duels, share-card image export, ambassador screens and deep links (`/d/…`, `/r/…`) all go through the API. The design prototype is still available as demo mode (`EXPO_PUBLIC_START=prototype`, web review links).
- **Product decisions build (2026-11-21):** Google sign-in; push notifications (registration, Android channels, tap routing, Settings screen with per-category switches, 6 pm streak-reminder cron `npm run push:reminders`); weekly/friends/all-time leaderboards as a fifth tab; streak calendar; duel emoji reactions; Figma flat component style. Backend 43 tests, frontend 128.
- CI/CD: GitHub Actions for `frontend/` (typecheck, tests, `expo-doctor`) and `backend/` (typecheck, tests, build). Both also run on `shared/` changes.
- `frontend/src/db/`: offline-first question bank engine on top of `expo-sqlite` — idempotent bulk JSON import (`seedQuestions`, hash-gated so re-seeding an unchanged dataset is a no-op), validation of imported records, and an FTS5-backed search/filter API (`searchQuestions`, `getFilterFacets`) for instant on-device search across prompt/topic/option text plus subject/exam-body/year/topic/difficulty filters. Covered by `node --test` unit tests run against Node's built-in SQLite (`npm test` in `frontend/`). A small cross-exam-body fixture (`frontend/src/data/sampleQuestions.json`) backs the engine's own tests. The NECO source PDFs on the shared drive turned out to be auto-generated placeholder text (identical dummy options, no answer keys, self-disclaimed as "not a reproduction of NECO examination papers") rather than real digitized past questions, so `frontend/src/data/necoQuestions.json` (220 questions, examBody NECO) was hand-authored instead, covering the app's six initial subjects using the real per-subject topic taxonomy extracted from those PDFs (Physics' generated topic list was generic filler and was replaced with a real syllabus topic set). `frontend/src/data/allQuestions.ts` aggregates all seed sources; the Question bank screen (`frontend/src/screens/QuestionBankScreen.tsx`, linked from the Practice hub) seeds and searches the combined set end-to-end. The other 36 NECO subject files (mostly vocational/trade subjects) are still placeholder-only and need either real sourcing or dedicated subject-matter authoring; the same placeholder-vs-real split was spotted in the WAEC and JAMB drive folders and hasn't been triaged yet. MongoDB remains the server-side source of truth for content authored/updated centrally.
- Design weeks 1–6 delivered in code: design tokens (`frontend/src/theme`, contrast-tested), component library (`frontend/src/components`), and a clickable hi-fi prototype of onboarding/auth, both practice modes, gamification, AI Explain + paywall + Paystack checkout, and duels/sharing (`frontend/src/screens`, app root is the Prototype index).
- Design weeks 7–14 delivered (2026-11-21):
  - **Figma brand sync.** Vector logomark, wordmark lockups, Passy the owl in 8 poses, tier shields. App icon and splash regenerated to the Figma brand.
  - **Ambassador/referral program (§5.9).** Intro, earnings dashboard, payout flow, code "pass", and a starter kit of graphics and message templates. Rules live in `frontend/src/game/referral.ts`; the numbers are placeholders pending product.
  - **Polish.** Duels polished. Share cards redrawn to Figma and built from real data. Subject iconography for all 21 bank subjects. Reduce-motion support.
  - **Store assets.** Rendered from the real app: `npm run store:assets` writes to `docs/store/`; listing copy is in `docs/store/LISTING.md`.
  - **Release QA and launch.** Release-candidate design QA with a 22-item fix list (`docs/design/DESIGN_QA.md`), and a launch-support plan (`docs/design/LAUNCH.md`).
- Spec and open product questions: `docs/design/DESIGN_SPEC.md`.
- Store and marketing copy says "practice questions", not "real past questions", until question provenance is confirmed (see the NECO note above).
- The bundled bank is 1,785 questions across 21 subjects, dated 2012–2023, short of the 2010–2025 target in §5.2. (The 25-question engine test fixture is no longer shipped.)
- **Content fix (2026-11-21):** every question's correct answer was option A, so always picking A scored 100%. Options were reordered per question with a reproducible seeded shuffle; the answers themselves are unchanged (`frontend/scripts/rebalance-answer-keys.py`), and a test now guards the distribution. The server also marks answers by option *text*, so phones running an older bundle still score correctly after content changes.

## 11. Open Decisions

- **On-device offline storage:** ~~the original plan relied on WatermelonDB/SQLite...~~ **Decided:** `expo-sqlite`, with an FTS5 index for local search. The question bank is bulk-imported from JSON into on-device SQLite (see Section 10); MongoDB stays the server-side content source, synced to the device via a seed dataset rather than queried live during practice.
- **Realtime transport for duels:** **Decided and built:** Socket.io on the Express server (namespace `/duels`). The state is single-instance; running several API instances needs the Socket.io Redis adapter and sticky sessions.
- **Firebase scope:** **Decided and built (2026-11-21):** Auth with email/password and Google sign-in (native Google Sign-In → Firebase credential; popup on web), and push notifications delivered by FCM on Android and APNs on iOS through the Expo push service. Keys to supply: the Google web OAuth client ID, the iOS URL scheme, `google-services.json`, the EAS project ID and the FCM V1 service-account key (`eas credentials`). See the root `README.md`.
- **Hosting target for the backend** (Render/Fly/Railway/etc.) is not yet chosen. It needs: Node 24, MongoDB Atlas, the env in `backend/.env.example`, Paystack's webhook pointed at `/payments/webhook`, and a weekly cron for `npm run payouts:process`.
- **Business numbers:** **Decided (2026-11-21), kept as built:** 50 starting gems; a streak repair costs 200 gems, or uses one of Monthly's 2 free repairs a month; 3 free AI explanations a day; Day Pass ₦100, Monthly ₦800; gem packs 250 gems for ₦100 and 800 for ₦250; invites pay 100 gems to both students once the friend finishes a first session; ambassadors earn 20% commission on Day Pass and Monthly for 12 months, held 7 days, ₦1,000 minimum payout, paid weekly. Ambassador codes give the buyer no discount in v1. All live in `shared/pricing.ts` and `shared/referral.ts`.
- **Product decisions from the Figma review (2026-11-21, `docs/design/DESIGN_QA.md` F5–F16):**
  - Home stays the dashboard; the swipe feed is not in v1 (it needs a card-ranking service).
  - Five tabs: Home · Practice · Duels · Ranks · Profile. Weekly (resets Monday 00:00 WAT), friends and all-time leaderboards, and a streak calendar, are built.
  - Onboarding stays short (exam → subjects → target → sign up), per the under-2-minutes goal; the extra Figma questions are left out.
  - Components follow Figma's flat style (12px radius, 1px borders, darker fill on press).
  - The paid tier is named **PassEscort+** (Day Pass and Monthly).
  - Level tiers follow Figma's shields: Novice (1), Scholar (10), Strategist (20), Sharpshooter (30), Legend (40), UTME Legend (50).
  - Duels are 10 rounds of 15 seconds, with emoji reactions (a fixed set, rate-limited, relayed by the server).
  - Mini games and the Play hub are out of scope (not in this PRD).
  - Launch market is Nigeria only (JAMB, WAEC, NECO; Naira; Nigerian banks).
  - iPad is supported alongside iPhone: any orientation and Split View on iPad (wider content column), portrait on phones.
