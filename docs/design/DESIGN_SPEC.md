# PassEscort — Design Spec (Weeks 1–14)

**Status:** v2.0, 2026-11-21. Brand art (logo, Passy, tier shields), tokens and type come from Figma. Component styling and several screens still differ from Figma; those are product decisions, listed in `DESIGN_QA.md`. Weeks 7–14 are specified at the end of this document.
**Format:** the design system and every screen are built in code, inside the Expo app, so engineering assembles from the same components the designs use. Nothing has to be redrawn or re-measured.
**Source of truth:** the Figma file [PassEscort (Edtech Product)](https://www.figma.com/design/SOkYxHrsEFY3M02f53AYnq/PassEscort--Edtech-Product-). Where this spec and Figma disagree, Figma wins, except for the accessibility floors under *Legibility*.

## Figma sync status

The Figma MCP account is a Starter seat (20 read calls a month). The November sync spent 11 of them. It refreshed the whole layer tree, because the file had grown from 54 to more than 80 frames, and exported the brand, Passy, badge and share-card sections. `docs/design/figma/README.md` lists what was read and how assets are re-imported.

| Area | Status |
| --- | --- |
| Colour tokens | **Synced** from `PE/Colors/*` variables |
| Typography | **Synced** from `PE/Typography/*`: Inter via `expo-font` |
| Logo, app icon, splash | **Synced.** The mark is redrawn as vectors from the Figma export (1% pixel match). The wordmark lockups are Figma artwork. Icon, adaptive icon, splash and favicon are generated from the mark |
| Mascot | **Synced:** Passy the owl, 8 Figma poses (`assets/passy`) |
| Level-tier shields | **Synced:** 5 shields (`assets/tiers`). Used where a coded title matches (see DESIGN_QA F13) |
| Share cards | **Synced:** score, streak and level match Figma frames 71–73 |
| Subject icons | **Synced:** Figma's Lucide glyphs for its 10 subjects, extended to 25 (WK 11) |
| Achievement badge art | Partly: Figma has 3 of the 17 badges (DESIGN_QA F19) |
| Components (button, option, card, chip) | **Synced (2026-11-21):** Figma's flat style (DESIGN_QA F11) |
| Screens | **Decided (2026-11-21):** 5 tabs, leaderboard and streak calendar are built; feed Home and the long onboarding stay out of v1 (DESIGN_QA F7–F10) |

**Figma covers, but the coded prototype lacks:** a 3-page intro carousel; Apple and Facebook sign-in; name, country of residence, "how did you hear about us", exam session (school vs GCE), target score/grade, confidence level, and a Legend Path onboarding steps; a question-feed Home ("For You / Friends"); a streak calendar; a leaderboard; mini games (hidden frame); emoji reactions in duels.

**The coded prototype covers, but Figma does not (kept as coded v1):** forgot password; the JAMB CBT session (timer, navigator, flag, submit / time-up / quit dialogs) and results; WAEC/NECO theory step-by-step; practice loading / empty / offline / error states; AI Explain; plans and paywall; Paystack checkout and payment results; streak repair; the badge showcase grid; the level roadmap (partly covered by Legend Path); the duel invite-link sender and receiver flow; the wa.me referral invite; the duel connection-drop state; the Brand and Component library screens.

**Product conflicts between Figma and the coded logic.** The logic and its tests are unchanged until product decides:
1. **Level titles:** Figma has 5 tiers (Novice → Scholar → Strategist → Sharpshooter → Legend) and shows Level 12 as Scholar out of 50. `src/game/levels.ts` has 11 titles, and Level 12 is Apprentice.
2. **Duel format:** Figma shows 10 rounds with a 00:42 clock. The coded duel is 7 rounds × 15 s.
3. **Daily target:** Figma offers 10/15/20/30/45 min. The code offers 5/10/20/30.
4. **Onboarding order:** Figma introduces the mascot first. The code personalises first and signs up fourth (the conversion rationale is under WK 02).
5. **Markets:** Figma lists Ghana, Gambia, Liberia and Sierra Leone. The bundled question bank is Nigerian (JAMB/WAEC/NECO).
6. **Tab bar:** the hidden Figma Play frame uses Home · Learn · Compete · Profile. The code uses Home · Practice · Duels · Profile.

**Accessibility issues in the Figma file.** Tokens deviate where noted; the screens are for the designer to fix:
- Sky 500 #1D82F8 used as link text, or with white text on it ("Continue with Email"), is 3.75:1, which fails AA. Tokens use Sky 700 #0967D5 (5.37:1) for links.
- Input borders #E5E7EB on white are 1.24:1, which fails WCAG 1.4.11 (3:1). `borderStrong` stays at #64748B.
- Placeholder text #94A3B8 is 2.56:1. It is used only for placeholders, which is common, but labels must stay visible above fields (as Figma does).
- Line height 100% clips descenders on Android. Tokens use 1.25–1.5×.
- Body text (Figma "Body") is 14. The spec keeps 16 for running text and question copy (Figma "Body Large"), and 14 for secondary copy.

**Copy typos in Figma:** "Stimulate the real exam experience" (should be *Simulate*); "Lets sign you up" (*Let's*); "Juilet" on the leaderboard; frame 07 says "Your Residence" but 07.1 says "Your Nationality".

## How to view

```bash
cd frontend
npm run web        # or: npm run android / npm run ios
```

The app opens on the **Prototype index**. Every screen and state for weeks 1–11 is one tap away. At the top you can switch between an *Active student* and a *Brand-new profile*, and toggle **Simulate offline**. The "▶ Run first-run flow" entry plays onboarding end to end.

| Area | Where |
| --- | --- |
| Tokens (colour, type, spacing, radii, motion) | `frontend/src/theme/tokens.ts` |
| Contrast and legibility tests | `frontend/src/theme/__tests__/contrast.test.ts` |
| Brand artwork (logomark, mascot) | `frontend/src/brand/svg.ts` |
| Component library | `frontend/src/components/` |
| Screens by area | `frontend/src/screens/{design,onboarding,home,practice,gamification,monetization,duels}/` |
| Routes and params (maps 1:1 onto expo-router files later) | `frontend/src/navigation/routes.ts` |
| XP, levels, badges, pricing rules | `frontend/src/game/` |
| Invite and share link helpers | `frontend/src/social/links.ts` |
| Share cards (data + copy), ambassador kit copy | `frontend/src/social/shareCards.ts`, `frontend/src/social/ambassadorKit.ts` |
| Referral & ambassador rules | `frontend/src/game/referral.ts` |
| Subject iconography | `frontend/src/practice/subjects.ts` |
| Store listing images and copy | `docs/store/` (`npm run store:assets`) |
| Release QA and fix list · Launch support | `docs/design/DESIGN_QA.md` · `docs/design/LAUNCH.md` |

**Review links (web):** after `npx expo export -p web`, any screen opens directly with `/?route=<Name>&params=<json>&profile=new|demo|ambassador&offline=1`, for example `/?route=ShareCard&params={"card":{"kind":"streak","days":15}}`. Serve the export with the `Cross-Origin-Embedder-Policy: credentialless` and `Cross-Origin-Opener-Policy: same-origin` headers.

---

## WK 01 — Visual identity & design system

### Brand
*Synced from Figma on 2026-11-21 (Splash Screen `62:574`, Meet Passy `725:595`).*

- **Logomark:** a navy (#042455) "D" stroke with round caps, one sky (#1D82F8) pill inside it and one beneath it. It is redrawn as vectors in `src/brand/svg.ts`, so it is sharp at every size and generates the app icons. Minimum height 20dp. Clear space is one pill's height on every side.
- **Wordmark:** "PassEscort" in a custom geometric face ("Pass" navy, "Escort" sky; all white on dark). It ships as Figma artwork (`assets/brand/lockup*.png`, 960×273). Never retype it in Inter.
- **Mascot — Passy the owl:** rendered artwork from Figma, 8 poses, 512px palette PNGs (~35 KB each). Screens ask for a *mood*, not a file (`src/brand/mascot.ts`):

| Mood | Pose | Use for |
| --- | --- | --- |
| happy | waving | default, welcome, home, onboarding |
| cheer | celebrating with confetti | level up, payment OK, streak saved |
| trophy | holding a trophy | duel win, high score, score share card |
| wow | fired up, flaming eyes | streaks, challenges, paywall hook |
| ai | holding the sparkle | AI Explain: loading, explanation, gate |
| think | taking notes | loading, empty results |
| sleep | reading | idle, offline |
| sad | encouraging thumbs-up | setbacks: defeat, broken streak, errors |

Figma has no sad or sleeping Passy. Setbacks use the pose Figma itself names "Passy – Encouraging", so **Passy never sulks**: a loss is met with a thumbs-up and a next step.

### Colour
From Figma `PE/Colors/*`. Values marked *derived* are not Figma variables. They come from the Tailwind ramps the Figma neutrals and functional colours already use, and exist only where a Figma colour fails a contrast floor.

| Role | Token | Hex | Figma |
| --- | --- | --- | --- |
| Primary (buttons, headings on brand) | `primary` | #042455 | Navy 900 (brand) |
| Primary pressed / ledge | `primaryPressed` / `primaryLedge` | #0A4A91 / #021A3D | Navy 700 / Navy 950 |
| Soft brand fill / progress track | `primarySoft` / `surfaceSunken` | #F3F7FC / #E6EEF8 | Navy 50 / Navy 100 |
| Accent (progress, selection, focus) | `accent` / `focus` | #1D82F8 | Sky 500 (brand) |
| Link text | `textLink` / `accentText` | #0967D5 | Sky 700 (Sky 500 fails AA as text) |
| Text / secondary text | `text` / `textSecondary` | #0F172A / #64748B | Neutral Text / Sec Text |
| Background / surface / border | `background` / `surface` / `border` | #F8FAFC / #FFFFFF / #E5E7EB | Neutral Background / Surface / Border |
| Disabled | `disabledBg` / `disabledText` / `placeholder` | #F1F5F9 / #475569 / #94A3B8 | derived / derived / Neutral Disabled |
| XP | `xp` / `xpSoft` | #1D82F8 / #DCEEFF | Sky 500 / Sky 100 (XP hexagon, XP pill) |
| Gold accent and gems | `gold` / `gem` / `goldSoft` | #F59E0B / #F59E0B / #FEF3C7 | Yellow / Yellow / derived |
| Streak | `streak` / `streakSoft` | #FF7324 / #FFF7ED | Color / Orange / derived |
| Correct | `success` / `successText` | #16A34A / #15803D | Green / derived (Green is 3.3:1 as text) |
| Wrong | `danger` / `dangerText` | #DC2626 / #B91C1C | Red / derived |
| Dark moments (Level 50, share cards) | `ink` | #0F172A | Dark mode |

The old v1 `xp` token did double duty as "gold". It is now split: `gold*` is the premium/reward accent (gold buttons, tags, medals, avatar rings) and `xp*` is XP itself (XP bar, XP counter, +XP burst), which Figma draws in sky blue.

### Typography
**Inter** (Figma `PE/Typography/*`), loaded at runtime with `expo-font` from `@expo-google-fonts/inter`. Only four faces ship (Regular, Medium, SemiBold, Bold: about 1.4 MB), imported per weight so the other 14 faces stay out of the bundle. `<Text>` maps each variant's weight to its own family (`Inter_700Bold` and so on), because Android faux-bolds a single family. The native splash stays up until the fonts load; if loading fails, the app falls back to the system font.

| Token | Figma style | Size / weight |
| --- | --- | --- |
| `display` | Display | 32 Bold |
| `h1` | H1 | 28 Bold |
| `h2` | H2 | 22 Bold |
| `h3` | H3 | 18 SemiBold |
| `body` | Body Large | 16 Regular |
| `bodySm` | Body | 14 Regular |
| `label` | Label | 14 Medium |
| `caption` | Caption | 12 Medium |
| `bodyLg`, `bodyStrong`, `button`, `overline`, `mono` | not in Figma (coded roles) | 17 Regular, 16 SemiBold, 16 Medium, 12 Bold, 16 Bold tabular |

### Legibility on low-end screens
These rules are enforced by tests, not left as guidelines:
- Every shipped text/background pair meets WCAG AA (4.5:1). Input borders and other UI boundaries meet 3:1. The lowest text pair is 4.55:1 (secondary text on the background).
- No font weight below 400. Body text is never below 16sp. Font scaling is capped at 1.4×.
- All touch targets are at least 48dp.
- Surfaces are flat, as in Figma: 1px borders, 12px radius and a fill change on press. Never blurred shadows, which are expensive on cheap GPUs and look muddy on low-contrast panels.
- Correct/wrong always pairs colour with an icon (✓ / ✕), so it works for colour-blind students.
- Animations use only transform and opacity (native driver). No state is communicated by motion alone.
- Layouts are checked at 360dp wide (phones), 507dp (iPad Split View) and iPad full screen in both orientations. From 768dp the content column widens from 480 to 720dp (`contentWidthFor`).

### Component library (`src/components`)
| Component | Variants / states |
| --- | --- |
| `Button` | primary, secondary (1px navy outline), gold, danger, ghost, whatsapp · lg 56 / md 48 / sm 40 · 12px radius · pressed (darker fill), loading, disabled · trailing arrow on forward actions |
| `IconButton` | plain, soft · always 48dp |
| `TextField` | default, focused, filled, error (border + icon + message), invalid (border only), disabled, password show/hide |
| `Card` | surface, soft, primary, gold, success, danger, ink · 1px border, 12px radius · pressable (fills on press) · selected (2px navy border) |
| `Tag` / `Chip` | Tag: 8 tones, optional icon. Chip: 1px border, selectable with check mark, disabled |
| `AppBar`, `TabBar`, `SegmentedControl`, `StepProgress` | Navigation |
| `ProgressBar`, `XpBar`, `ProgressRing`, `StreakIndicator`, `CounterPill` | Progress and rewards. Streak has three states: active (lit flame), pending (outline, practise today), broken (grey) |
| `OptionButton` | Flat row, letter on the left, radio on the right · default, selected (dot), correct (✓), incorrect (✕), dimmed |
| `Toggle` | On/off switch in brand colours (Settings) |
| `Banner` | info, offline, warning, success, danger, primary |
| `Sheet`, `Dialog` | Bottom sheet (navigator, details) and blocking dialog (submit, quit, time-up) |
| `EmptyState`, `Skeleton` | Mascot-led empty/error states and pulsing loading blocks |
| `Avatar`, `BadgeMedal`, `ListItem` | Badge tiers: bronze, silver, gold, legend, locked |
| `XpBurst`, `Confetti`, `PopIn` | Celebration micro-interactions (WK 04) |

### App icon & splash
- `assets/icon.png` (1024, full-bleed, the OS applies its own mask), Android adaptive foreground/background/monochrome, `splash-icon.png`, `favicon.png`.
- **App icon:** the navy/sky mark on white, full-bleed and opaque. The adaptive icon puts the mark inside the 61% safe circle on white, and the monochrome layer is a white silhouette. Figma has no icon frame, so this is derived from the mark.
- **Splash:** the mark on #F8FAFC, as in Figma frame 01 (`expo-splash-screen`: `imageWidth` 110, mark about 99dp tall). The in-app `Splash` route shows the same mark at the same size, then fades up Figma's mountain-and-flag art, so the hand-off is invisible.
- Regenerate all of them from the vector source with `npm run brand:assets` (needs a local Chrome/Chromium).

---

## WK 02 — Onboarding & auth

**Flow:** Welcome → Exam → Subjects → Daily target → Sign up ("Save your plan") → Passy welcome → Home (first open).

The student personalises first and signs up fourth. They have already invested in a plan, so sign-up converts better, and the whole path takes about 60–90 seconds, well under the 2-minute target.

| Screen | Spec |
| --- | --- |
| Welcome | Passy intro, three value points, "Get started" / "I already have an account" |
| Exam | Multi-select cards: JAMB UTME, WAEC WASSCE, NECO SSCE |
| Subjects | JAMB: English is locked and required, plus exactly 3 more (counter "n of 4"). WAEC/NECO only: 1–9. Six core subjects shown first, the rest behind "Show N more" |
| Daily target | 5/10/20/30 min, mapped to about 5/15/25/40 questions per day (~45s per question). 20 min is recommended |
| Sign up | Google (Firebase Auth) or name/email/password. Validation runs on submit with inline errors. The button shows a loading state |
| Log in | Email/password + Google. A failed login shows one banner and marks both fields red; it never says which field was wrong. Links to "Forgot password" |
| Forgot password | Email → "Check your inbox" confirmation with resend |
| Passy welcome | Personalised plan summary (exams, subjects, daily goal), "Let's go!" |
| Home — first open | Day-1 hero card with "Start {first subject}", XP bar at Level 1 0/100, locked badges ("First Steps is one session away"), reading-Passy duel empty state. Streak 0, starting gems 50 |

---

## WK 03 — Practice screens

### JAMB CBT mode
- **Sprint:** 40 questions in 30 minutes (JAMB's pace is about 2h for 180). If the bank has fewer than 40, the intro says so ("all 37 available offline").
- **Timer pill:** neutral, then amber at 5:00 left (plus a 10-second warning banner), then red at 1:00. The clock keeps running if the app is backgrounded, as in the exam hall.
- **No instant feedback.** Answers stay changeable until submit.
- **Flag** a question from the header tag.
- **Navigator** (bottom sheet, opened from the "12/40" pill): a grid of 40 cells. Answered cells are navy, flagged cells have a flame border and flag, the current cell has an ink ring, unanswered cells are outlined. The legend shows counts. Tapping a cell jumps to it.
- **Submit dialog:** shows unanswered count, flagged count and time left.
- **Time-up dialog:** auto-submits, then "See my results".
- **Quit dialog:** quitting means no score and no XP.
- **Results:** score n/40 and %, XP earned, time used. Per-topic bars, worst topic first, with a "Focus next" tag below 70%. Review filters: Wrong / Skipped / Flagged / All. Each item expands to show your answer, the correct answer, the stored explanation, and an "AI Explain" button (disabled offline).

### WAEC / NECO mode
- **Objective:** sets of 10. Select an option, then "Check answer". Feedback shows correct/incorrect states plus icon, the explanation, and a "+XP" burst. A combo tag appears at 2+ in a row. Then "Next". The summary screen awards XP.
- **Theory:** the stem plus parts (a)(b) with marks. "Show step-by-step" reveals one step at a time on a numbered rail. Each step can carry a monospace working box and "+n marks". The final answer box appears after the last step.
- **Free tier:** step 1 of each part is free. A gold gate card then offers "Unlock full solutions" (PRD §5.8 gates full solutions).

### States (both modes)
| State | Trigger | Design |
| --- | --- | --- |
| Loading | Assembling the set from the on-device bank | Skeleton question and options, small note-taking Passy, "Shuffling your questions…" |
| Empty | Filter returns no questions | Note-taking Passy, explains which filter is empty, "Clear filters" / "Pick another topic" |
| Offline (pack available) | No network, subject downloaded | Offline banner; practice fully works; "Saved on phone" tag; AI Explain disabled with "Explain later" |
| Offline (pack missing) | No network, subject not downloaded | Reading Passy, pack size, disabled "Download when online", "Practise {downloaded subject} instead" |
| Error | Local DB read fails | Encouraging Passy, "Your progress is safe", Retry / Report |

**Engineering note:** the prototype picks questions from the bundled JSON (`src/practice/questions.ts`). Production should call `searchQuestions(db, { examBody, subject, limit })` from `src/db`, which is already offline-first.

---

## WK 04 — Gamification & profile

### Rules (`src/game/levels.ts`)
| Event | XP |
| --- | --- |
| Correct answer | +10 (+5 if hard) |
| Every 5th answer in a row | +5 combo |
| Finish a session or sprint | +25 |
| Duel win / draw / loss | +30 / +15 / +10 |

- **Levels:** clearing level *n* costs 100 + 25(n−1) XP. Level 50 needs 34,300 XP in total.
- **Titles:** Novice 1, Learner 5, Apprentice 10, Scholar 15, Achiever 20, Prodigy 25, Expert 30, Master 35, Grandmaster 40, Distinction 45, **UTME Legend 50**.
- **Streak:** grows on the first completed session of a day. It is *pending* (outline flame) until today's goal is met and *broken* after a missed day. It can be repaired within 48 hours for 200 gems; Monthly includes 2 repairs a month.

### Screens and moments
| Moment | Spec |
| --- | --- |
| Home | Level card with XP bar (tap → roadmap), daily-goal ring, subject mastery tiles, duel CTA, 7-day activity bars, earned badges. Top bar shows streak and gems |
| Streak-repair paywall | Encouraging Passy, struck-through streak count, live countdown, week strip with the missed day dashed. Options: repair with gems (or "Need N more gems"), buy a gem pack, Monthly upsell. "Start a new streak instead" is always visible and never shamed. Success: confetti, celebrating Passy, "Streak saved!", Comeback Kid badge |
| Level up | Full-bleed navy (ink for Level 50). Sequence: confetti 0ms → medal springs in 150ms → Passy pops 350ms → rewards 550ms. Rewards: new title when entering a tier, gems, unlocks. Actions: Continue / Share to WhatsApp Status. Never auto-dismisses |
| Badge showcase | 17 badges in 5 categories, 3-column grid. Locked badges show a progress bar. Tap opens a detail sheet with description and progress, or "Earned" and Share |
| Profile | Avatar with gold ring, level tag, exams. XP bar, streak, 6 stat tiles (XP, questions, accuracy, best streak, duels W–L, badges). Subject mastery bars labelled Needs work <40, Getting there <70, Strong <90, Mastered. Plan, invite and settings rows |
| Level roadmap | All 11 tiers with done / current / upcoming status, and XP needed for the next title |

### Micro-interactions
| Interaction | Spec |
| --- | --- |
| +XP burst | Gold pill "+10 XP". Rises 8 → −32dp, scales 0.6 → 1.1 → 1, fades in for the first 15% and out after 70%. 900ms, ease-out cubic. Fires on each correct answer |
| Progress bar fill | Width animates over 400ms, ease-out cubic. The track never animates |
| Button press | Fill darkens (Navy 900 → Navy 700; secondary fills Navy 50). Instant, no easing |
| Confetti | 36–60 pieces, staggered up to 600ms, fall 2.4s with ease-in and spin, fade over the last 15%. One shot only |
| PopIn | Spring with friction 5 and tension 120, scale 0.6 → 1, plus opacity |
| Streak flame | Filled when active, outlined when pending, grey with strike-through when broken |

---

## WK 05 — AI explanations & monetization

### AI Explain
- **States:** loading (Passy holding the AI sparkle, three pulsing dots, skeleton steps, "Usually 3–5 seconds") → explanation → feedback. Also: gate, offline, error.
- **Explanation layout:** green answer chip → numbered step rail → gold **Key idea** card → "Why not the others?" (one line per distractor) → 👍/👎 → AI disclaimer.
- **Quota:** 3 free explanations per day, resetting at midnight. The count is shown in the app bar ("2 of 3 free left today"). A failed or errored call does not consume quota.
- **Gate:** step 1 stays visible as proof of value. Then a lock card offers Day Pass ₦100 and Monthly ₦800 ("Best value", "about ₦27/day"), plus "Compare plans" and "come back tomorrow".
- **Offline:** shows the stored short explanation if there is one, plus "Save to Explain later".
- **API contract** (what the Groq/Gemini endpoint must return) — `src/practice/aiExplain.ts`:
  ```ts
  interface Explanation { summary: string; steps: { title: string; body: string }[]; keyIdea: string; distractors: { key: string; reason: string }[] }
  ```

### Plans (Day Pass vs Monthly)
The headline changes with the entry point: AI, streak, solutions or generic. Monthly is pre-selected and carries a "BEST VALUE · SAVE 73%" ribbon. A radio pair is followed by a feature table (Free / Day / Month, Month column tinted). The CTA is gold: "Continue · ₦800". Active subscribers see a "You're on Monthly" state instead.

### Checkout (Paystack)
1. **Our screen:** order summary, receipt email, method (debit card, bank transfer, USSD), optional **ambassador code** (PRD §5.9), "Pay ₦X securely", "Payments processed by Paystack".
2. **Paystack hosted checkout** (popup/WebView) handles card entry, OTP and transfer details. We never touch card data.
3. **Verifying overlay:** "Confirming your payment…". The server verifies the transaction reference with Paystack before granting the entitlement (PRD §6).
4. **Result:**
   - *Success:* confetti, receipt (item, amount, reference, email), then "Start practising" (or "Repair my streak" after a gem purchase).
   - *Pending transfer:* account details, amount, expiry countdown, "I've sent the money" / change method.
   - *Failed:* "You have not been charged", common fixes, Try again / Contact support.

---

## WK 06 — Duels & social

### Duels
| Screen | Spec |
| --- | --- |
| Hub | W–L record card, quick match (subject chips, "Find an opponent", disabled offline), "Challenge a friend", recent duels (empty state for new players) |
| Matchmaking | Pulsing rings around your avatar, elapsed timer, "Looking for a {subject} player around Level n", Cancel. Found: VS card (avatars, names, levels), then a 3-2-1 countdown, then the battle |
| Live battle | 7 rounds × 15s. Header scoreboard (avatar, score, 7 result pips per player) and a shrinking round timer (green → amber at 10s → red at 5s). Opponent status: "thinking…" with spinner, then "answered" (correctness hidden until reveal). Lock-in message. 1.6s reveal with correct/incorrect and points per player. Forfeit dialog |
| Connection drop | Warning banner "Connection lost — reconnecting…", the round clock pauses for both players, answers are kept |
| Result | VICTORY! / GOOD FIGHT / DRAW (Figma copy, updated WK 09) with trophy/encouraging Passy, confetti on wins only, XP tag, side-by-side score card (correct count, average speed), round-by-round table. Rematch / Share / Back to duels |

- **Scoring:** a correct answer earns 100 plus up to 50 for speed: `100 + round(50 × (15 − t) / 15)`. Wrong or timed-out answers score 0.
- **Realtime contract** (Socket.io working assumption; the server owns the clock and scoring):
  `round:start {index, deadline}` → `answer:submit {key, ms}` → `opponent:answered {ms}` → `round:reveal {correctKey, points}` → … → `duel:end {outcome}`.

### Invite via link
- **Sender:** pick a subject. The link `https://passescort.app/d/{CODE}` uses a 6-character code from an unambiguous alphabet (no 0/O/1/I), works for one opponent, and expires after 15 minutes. Copy, "Send on WhatsApp" (wa.me with the message prefilled), and the system share sheet. Shows a message preview and a "Waiting for your friend…" state.
- **Receiver (deep link):** fired-up Passy, "{Name} wants to duel you!", challenger card (level, subject, rules, reward), Accept / Not now. With no app installed, the link's web fallback sends them to the Play Store, then opens the challenge on first launch.

### Share cards (WhatsApp Status)
- *Superseded in WK 09:* the cards now follow Figma's Social Sharing Cards (609 × 696, exported 1080 × 1234). See **WK 09** below.
- **Engineering:** render the card view off-screen, capture it with `react-native-view-shot`, and share the PNG through `expo-sharing` (the WhatsApp Status target).

### wa.me invite
Celebrating Passy, invite code (tap to copy), message preview, "Invite on WhatsApp" (`https://wa.me/?text=…`), "Other apps", and stats (invited, joined, gems earned). Reward: 100 gems each once the friend finishes a first practice, plus the Recruiter badge.

---

## WK 07 — Referral & store assets

### Ambassador program (PRD §5.9)
**One personal code per student** (`personalCode`: first name, letters only, up to 6, plus a 2-character readable suffix, e.g. `ADAEZE7K`).
- Anyone can share the code: a friend who joins with it gets gems, and so does the sender.
- A student who **joins the Ambassador program** keeps the same code. From then on, Day Pass and Monthly purchases made with it also earn them cash commission.
- One code is easier to explain, print and remember than two.

**Rules** (`src/game/referral.ts`; every number is a placeholder until product signs off):

| Rule | Value |
| --- | --- |
| Commission | 20% of the price paid, on Day Pass and Monthly (₦20 / ₦160). Gem packs earn nothing |
| Attribution | A friend's purchases count for 12 months after they join with the code |
| Hold | Commission is *clearing* for 7 days (refund window), then *ready to withdraw* |
| Payout | From ₦1,000, to a Nigerian bank account in the ambassador's own name, sent every Friday, no fee |
| Eligibility | 5 completed practice sessions, a verified email, online |
| Invite reward | 100 gems each, once the friend finishes a first practice |

The server owns attribution, commission and payouts (PRD §6); the app only shows what the API returns.

| Screen | Spec |
| --- | --- |
| Intro (`AmbassadorIntro`) | Trophy Passy, "Earn while you study". A gold card with the example earnings, computed (₦1,600 a month from 10 friends on Monthly). 3 numbered steps. A "Who can join" checklist with live status (✓ or lock). A gold "Become an ambassador" CTA, disabled until eligible. Terms line underneath |
| Dashboard (`Ambassador`) | The code **pass** (tap to copy) with WhatsApp and Starter-kit buttons. **Ready to withdraw** amount with a Withdraw CTA, or a progress bar to the minimum. Clearing / Paid out / All-time row. A funnel (joined → practising → bought a plan). The friend list shows first name and initial only, with a stage tag, the commission earned from each friend, and "clearing" if it isn't available yet. The help button (top right) opens "How commission works" |
| Dashboard — just joined | Fired-up Passy, "Your first friend is one message away", Starter kit CTA |
| Payout, step 1 (first time) | Bank picker (sheet), 10-digit NUBAN field with a digit counter. The bank's name lookup runs automatically ("Checking the account name with your bank…") and shows a green ACCOUNT NAME card. Save is enabled only once the name resolves |
| Payout, step 2 | Amount, To (bank •••• 6789), Name, Arrives (by Friday), Fee (Free), Change account. Disabled offline |
| Payout sent | Celebrating Passy, "₦1,000 is on its way", receipt. The dashboard shows a success banner until the transfer lands |
| Checkout code field | Normalises case, spaces and dashes; error for a malformed code; "We'll check ADAEZE7K when you pay" |

**Engineering:** the payout name check is Paystack *Resolve Account Number*; transfers are Paystack *Transfers*, batched on Fridays.

### Store assets
`npm run store:assets` (`frontend/scripts/store-assets.ts`) renders the store images **from the real app**:
1. web export;
2. deep link into each screen;
3. 3× capture in headless Chrome;
4. composition with Inter.

Output goes to `docs/store/`: 8 Play screenshots (1080 × 1920), 8 App Store 6.9" screenshots (1320 × 2868), the Play feature graphic (1024 × 500) and the 512 icon. Captions read the same constants as the app (CBT length, duel format, commission), so the store can't drift from the product. Listing copy and character counts: `docs/store/LISTING.md`.

### Handoff
- This spec is the handoff, together with `DESIGN_QA.md` (what differs from Figma), the prototype index (every state is one tap away) and the review links above.
- Measurements live in code (`src/theme/tokens.ts`). Assets are exported at the sizes they ship (`assets/brand`, `assets/passy`, `assets/tiers`, `docs/store`). Every number on screen comes from a named constant.

---

## WK 08 — Usability, motion & accessibility polish
There was no beta build to take feedback from, so this pass audited the prototype against the WK 01 legibility rules. Fixes are listed in `DESIGN_QA.md` §1. The new system rules are:
- **Reduce motion.** `useReduceMotion()` reads the OS setting. With it on, confetti doesn't fall; PopIn, XP bursts and points pops fade without moving or scaling; counters jump to their value; matchmaking rings and the splash slide stop. Nothing is communicated by motion alone, so every moment still reads.
- **Counting numbers** (`CountUp`) expose only the final value to screen readers.
- **Every pressable** has a role, and every image has a label or sits inside a labelled container.
- **No colour outside tokens.** Third-party and artwork colours (WhatsApp, medal metals, share-card art) are the only exceptions, and each is commented.
- **Real copy only.** Numbers in copy are computed (question count, prices, duel rules, commission), never typed.

---

## WK 09 — Duel & share polish
| Moment | Spec |
| --- | --- |
| Round timer | `RoundTimer`: a full-width bar that drains smoothly on the native driver (scaleX from the left edge) instead of stepping every 100ms. Green, then amber at 10s, then red at 5s. It pauses in place during the reveal and while reconnecting. The seconds tag stays, so colour is never the only cue |
| Score landing | At each reveal the header score counts up (600ms, ease-out cubic) and a green **+points** chip pops from it (1.1s). Nothing pops for a miss; the red pip already says so |
| Victory | Trophy Passy springs in, "VICTORY!", confetti, +XP tag. Both scores count up from 0 after 350ms |
| Loss | Encouraging Passy, "GOOD FIGHT" (Figma), "{Name} edged it this time", no confetti |
| Spec QA | 7 rounds × 15s, 1.6s reveal, 100 + up to 50 speed points, forfeit dialog, reconnect pause: all match WK 06. The duel rules in the hub, invite message, receiver card and Home card are now derived from constants |

### Share cards (Figma: Social Sharing Cards, frames 71–73)
- **Format:** 609 × 696 artboards, exported at **1080 × 1234**. Portrait, so it fills a phone in WhatsApp Status and survives Instagram/X 4:5 crops.
- **Drawing:** the cards are drawn in Figma units and scaled (`ShareCardView`), so preview and export match.

| Template | Built from | Design |
| --- | --- | --- |
| Score | `{percent, examBody, subject}` from the CBT result or WAEC/NECO summary | Navy with a sky glow and panel lines. "I just scored", a huge number with the % in sky. "in WAEC Biology" is fitted, then wraps to 2 lines for long subjects. "Think you can beat me?", a **Challenge me** pill (Sky 700: Figma's Sky 500 fails AA) and the short duel link. Trophy Passy with Figma's book stack, white lockup |
| Streak | `{days}` | Amber-to-orange frame, white card, "I'm on a", the numeral in orange-600 (3.56:1 large text; Figma's amber is 2.15:1), "Day learning streak! 🔥", fired-up Passy, navy lockup |
| Level | `{level, title}` | Ink with a green glow and confetti. The **Figma tier shield** when the title has one (Novice, Scholar, Legend), otherwise celebrating Passy. "I just unlocked a new level badge." and the title in capitals, fitted |
| Badge | `{badgeId}` | Same layout as Level, with the badge medal, "I just unlocked a new badge." and the badge name |
| Duel | `{opponent, myScore, theirScore, subject}` | Same system as Score. VICTORY (gold pill) or GOOD FIGHT. "I beat Tunde" or "Tunde edged it", the scoreline, Duel me pill |

- **Data:** every card is opened with real data by the screen that earned it. Opened from the prototype index, a card falls back to the student's own streak, level and latest badge, or to a result computed from the real bank. A kind with no data (a streak of 0, no badges yet) is disabled.
- **Caption** (`shareMessage`): always states the true result, including losses ("Tunde beat me 700–540"), and ends with the duel link.

---

## WK 10 — Referral program materials
- **The pass** (`ReferralCodeCard`): the referral code drawn as a ticket, a nod to the name, with perforation notches. Navy with a sky glow, waving Passy on the stub, "AMBASSADOR CODE" or "MY INVITE CODE", and the code in tracked white. The code size is fitted so 4–10 characters always fit on one line. Same artwork in the app, on kit graphics and in store assets.
- **Starter kit** (`AmbassadorKit`):
  - **Graphics:** Status 9:16 (1080 × 1920), Post 1:1 (1080 × 1080) and Pass only (1080 × 600). Each is drawn in base units with the student's code on it.
  - **Messages** (WhatsApp DM, class group, Status caption, Instagram/TikTok caption): each has Copy, plus a WhatsApp button where it applies. The year in hashtags is the *next* sitting (rolls over in July). Prices and gems come from the rules.
  - **Do's and don'ts:** no spam, no paid ads with the brand, no grade promises.
- **Dashboard QA:** checked at 360dp. The title was shortened ("Ambassadors") so it doesn't truncate.

---

## WK 11 — Content & subject consistency
- **Subject iconography** (`src/practice/subjects.ts`, `SubjectIcon`, *Design → Subject iconography* in the prototype).
  - **Glyphs:** one Lucide glyph per subject. The 10 Figma subjects use Figma's own glyphs (calculator, book-text, book-open-text, atom, flask-conical, dna, leaf, scale, landmark, globe). The other 15 extend the same family, with exact path data from lucide-static 1.77.0 (ISC).
  - **Colours:** six department colours, each soft tile and strong glyph pair ≥ 3:1. Maths navy, Sciences sky, Languages orange, Social sciences green, Commercial amber, Arts & religion red.
  - **Aliases:** "English Language", "Literature", "CRS" and others map to the bank's names.
  - **Tests:** every subject in the bank must have designed iconography (no fallback), and glyphs are unique within a department.
  - **Where it's used:** onboarding chips, practice hub, Home tiles, profile mastery, duel and invite chips, question bank.
- **Layouts:** objective and theory screens are subject-agnostic (the same components for every subject and exam body). Checked with a newer subject (WAEC Literature-in-English), NECO theory, and the longest name on cards (NECO Christian Religious Studies).

---

## WK 12 — Release-candidate design QA
See **`DESIGN_QA.md`**: 17 fixes made in this pass, and a fix list of 22 items with owners (P0 before submission, P1 Figma-vs-app decisions, P2 debt).

---

## WK 13 — Store presence
Final screenshots and the feature graphic come from launch-ready screens, through the WK 07 pipeline. Listing copy, keywords and character counts are in `docs/store/LISTING.md`. Launch social graphics are the share cards and the starter kit; the press kit is the logo lockups, Passy poses and the feature graphic. Open items before submission: privacy policy, data safety, real deep-link domain. iPad is supported, with its own 13" screenshot set.

---

## WK 14 — Launch support
Triage levels, a fast-fix map, the launch-week watch list and the seeded post-launch backlog are in **`LAUNCH.md`**. Being on call is people's work and can't be shipped in code.

---

## Open questions for product
Product decisions were made on 2026-11-21 (PRD §11, DESIGN_QA F5–F16):
1. ~~Gem economy~~ **Decided:** 200 gems a repair; packs of 250 for ₦100 and 800 for ₦250; 50 starting gems.
2. ~~Free AI quota~~ **Decided:** 3 a day.
3. ~~Monthly perks~~ **Decided:** 2 streak repairs a month.
4. **Deep-link domain:** `passescort.app` must be registered, with App Links and Universal Links set up (DESIGN_QA F2). Still open: the domain has to be bought.
5. ~~Duel question source~~ **Decided:** duels draw from JAMB and WAEC questions for the subject (same syllabus, more variety), falling back to any exam body.
6. ~~Ambassador codes~~ **Decided:** no buyer discount; the code only credits the ambassador.
7. **Theory content:** the four theory questions are hand-authored prototype content. Production needs the content pipeline (Roadmap phase 2).
8. **Figma access:** a Starter seat allows 20 reads a month. Future syncs need an upgrade, a REST API token, or manual exports (`docs/design/figma/README.md`).
9. ~~Figma vs coded logic~~ **Decided:** level tiers follow Figma's shields, duels are 10 × 15s with reactions, short onboarding, Nigeria launch, five tabs.
10. ~~Ambassador economics~~ **Decided as built:** 20% on Day Pass and Monthly, 12-month attribution, 7-day hold, ₦1,000 minimum, Friday payouts, no fee, 5 sessions to join, no buyer discount.
11. ~~Figma structure~~ **Decided:** dashboard Home, five tabs, leaderboard and streak calendar built, short onboarding, PassEscort+, flat components.
