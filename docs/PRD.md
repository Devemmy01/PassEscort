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
| Auth | Firebase Authentication | Replaces Supabase Auth; backend verifies Firebase ID tokens |
| Push notifications | Firebase Cloud Messaging (planned) | For streak reminders, duel invites |
| AI explanations | Groq API / Gemini API (planned) | Unchanged from original plan — cheap/free tier RAG for step-by-step solutions |
| Payments | Paystack / Flutterwave (planned) | Unchanged from original plan |
| Realtime (1v1 duels) | TBD — Socket.io is the working assumption | Original plan used Supabase Realtime, which is no longer in the stack; see Open Decisions |
| On-device offline storage | TBD | Original plan used WatermelonDB/SQLite; see Open Decisions |
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
- `frontend/`: Expo + React Native + TypeScript scaffold, branded as PassEscort, passes `tsc` and `expo-doctor`.
- `backend/`: Express + TypeScript scaffold with MongoDB (Mongoose) connection, Firebase Admin SDK setup, Firebase ID-token auth middleware, initial `User` model, and `/users/me` GET/POST routes.
- CI/CD: GitHub Actions workflows for `frontend/` (typecheck + `expo-doctor`) and `backend/` (typecheck + build), path-filtered so each only runs on relevant changes.
- Explicitly **not** doing: local SQLite schema configuration, since MongoDB is the database of record and the original Supabase/SQLite split no longer applies as originally scoped.

## 11. Open Decisions

- **On-device offline storage:** the original plan relied on WatermelonDB/SQLite for a fully offline-first client. Moving to MongoDB as the server DB doesn't remove the need for *some* on-device cache if offline practice is still a requirement — this needs an explicit decision (e.g., `expo-sqlite`, WatermelonDB, or accept an online-only v1 and defer offline support).
- **Realtime transport for duels:** Socket.io on the Express server is the working assumption; needs confirming before Phase 6 (Realtime duels) starts.
- **Firebase scope:** currently scoped to Auth only. Confirm whether Firebase Cloud Messaging (push) and/or Firebase Storage are also in scope, or if those move to another provider.
- **Hosting target for the backend** (Render/Fly/Railway/etc.) is not yet chosen.
