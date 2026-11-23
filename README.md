# PassEscort

Gamified exam prep for JAMB, WAEC and NECO: an offline question bank, XP, streaks and badges, live 1v1 duels, AI step-by-step explanations and Paystack payments. Product requirements: [`docs/PRD.md`](docs/PRD.md).

| Folder | What it is |
| --- | --- |
| `frontend/` | The app: React Native + Expo (SDK 57), TypeScript |
| `backend/` | The API: Node + Express + MongoDB, Firebase Admin, Socket.io |
| `shared/` | Rules and API types both compile against (XP, streaks, badges, pricing, referrals, duel scoring, contracts) |
| `docs/` | PRD, design spec, design QA, launch plan, store listing |

## Run everything locally (no keys needed)

Every external service has a local stand-in, so the whole product runs on a laptop:
- **Auth:** any email with an 8+ character password. The app sends `dev:` tokens.
- **Payments:** a test checkout page with "Pay" and "Decline" buttons.
- **AI:** explanations built from each question's marking note.

**1. MongoDB.** Use a local `mongod` (default `mongodb://localhost:27017`) or a free Atlas cluster.

**2. API:**

```bash
cd backend
npm install
cp .env.development.example .env   # AUTH_MODE=dev, PAYMENTS_MODE=mock, AI_PROVIDER=mock
npm run seed                       # loads the question bank and theory solutions (idempotent)
npm run dev                        # http://localhost:4000
```

**3. App:**

```bash
cd frontend
npm install
cp .env.example .env               # EXPO_PUBLIC_API_URL=http://localhost:4000, EXPO_PUBLIC_AUTH_MODE=dev
npx expo start
```

On a physical phone, set `EXPO_PUBLIC_API_URL` to your computer's LAN address, e.g. `http://192.168.1.20:4000`.

The design prototype, which runs on demo data with every screen state one tap away, opens with `EXPO_PUBLIC_START=prototype`.

## Tests

```bash
cd backend && npm test     # HTTP + Socket.io integration against a real mongod, plus the shared rules
cd frontend && npm test    # offline engine, question bank, share cards, referrals, subjects, deep links, contrast
```

`backend` tests use `mongodb-memory-server`. It uses a local `/usr/bin/mongod` if one is installed, and downloads one otherwise (as in CI).

## Production setup

Production refuses to start with any dev or mock mode (`backend/src/config/env.ts`). You need:

| Service | Where to set it |
| --- | --- |
| **Firebase** (Authentication, email/password) | API: `AUTH_MODE=firebase` and `FIREBASE_SERVICE_ACCOUNT_JSON` (or `_PATH`). App: `EXPO_PUBLIC_AUTH_MODE=firebase` and the `EXPO_PUBLIC_FIREBASE_*` web config |
| **Google sign-in** | Enable Google in Firebase → Authentication. App: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (the *web* OAuth client ID) and, for iOS, `EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME` (reversed iOS client ID). Add the Android app's SHA-1 (from `eas credentials`) in Firebase. Needs a development build, not Expo Go |
| **Push notifications** | Firebase: add the Android app (`app.passescort`), download `google-services.json`, set `GOOGLE_SERVICES_JSON` to its path. `eas init`, then set `EAS_PROJECT_ID`. Upload the FCM V1 service-account key with `eas credentials` (Android → Push Notifications); iOS uses an APNs key, also via `eas credentials`. API: `PUSH_MODE=expo` (default) and, if you turn on Expo's enhanced push security, `EXPO_ACCESS_TOKEN`. Cron daily at 17:00 UTC (18:00 in Lagos): `cd backend && npm run push:reminders` |
| **Paystack** | `PAYMENTS_MODE=paystack`, `PAYSTACK_SECRET_KEY`. In the Paystack dashboard, set the webhook URL to `https://<api>/payments/webhook`. `PUBLIC_API_URL` must be the API's public URL, because Paystack returns students to `/payments/return` |
| **AI** (free tiers) | `AI_PROVIDER=groq` with `GROQ_API_KEY` (free key at console.groq.com) and `GEMINI_API_KEY` as the fallback (free key at aistudio.google.com), or `AI_PROVIDER=gemini`. Fill the explanation cache once within the free limits: `cd backend && npm run ai:pregenerate` (resumable; `--limit`, `--subject`). After that, students mostly hit the cache |
| **Ambassador payouts** | A weekly cron (Fridays): `cd backend && npm run payouts:process`. Paystack transfer webhooks settle each payout |
| **Deep links** | `LINK_HOST` (API) and `EXPO_PUBLIC_LINK_HOST` (app) must match `app.json` → `android.intentFilters` / `ios.associatedDomains`. Host `assetlinks.json` and `apple-app-site-association` on that domain |
| **Content** | `npm run seed` after content changes. Phones pick up changed questions through `/questions/sync` |

Build the API with `npm run build`, then `npm start` (Node 24). Build the app with EAS (`eas build`).

Store images are regenerated from the real screens with `cd frontend && npm run store:assets`; they're written to `docs/store/`.

## Where things are

- **Practice sync** (server-side scoring, XP, streaks, badges): `backend/src/services/practice.ts`. The app's outbox is `frontend/src/sync/outbox.ts`.
- **Duels:** the server is `backend/src/realtime/duels.ts`, the app side is `frontend/src/realtime/duelSession.ts`, and the contract is `shared/duel.ts`.
- **Payments:** `backend/src/services/payments.ts` and `paystack.ts`. App checkout is `frontend/src/screens/monetization/CheckoutScreens.tsx`.
- **AI explanations:** `backend/src/services/ai.ts`.
- **Referrals and ambassadors:** `backend/src/services/ambassador.ts`, with the rules in `shared/referral.ts`.
- **Design system and spec:** `frontend/src/theme`, `frontend/src/components`, `docs/design/DESIGN_SPEC.md`.
