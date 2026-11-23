# PassEscort — Release-candidate design QA (WK 12)

**Date:** 2026-11-21 · **Against:** Figma *PassEscort (Edtech Product)*, refreshed today (layer tree in `figma/mobile-page-metadata.xml`) · **App:** `frontend/` at this commit.

**Method:**
- Every route was opened in the web build at 390dp and 360dp wide and compared with the Figma section renders.
- A static audit covered the screens and components: hard-coded colours, unlabelled pressables, type below the floor, and motion.
- The automated checks cover contrast, copy accuracy and layout fitting (`npm test`, 120 tests, 21 of them new in this pass).

This document has two parts: what this pass **fixed**, and the **fix list** that remains, with an owner for each item. Row 18 was found later, during the end-to-end test of the full build.

---

## 1. Fixed in this pass

| # | Issue | Fix |
| --- | --- | --- |
| 1 | The logo, mascot, app icon and splash were coded placeholders (indigo eaglet "Ace", mortarboard mark). | The Figma mark is redrawn as vectors (1% pixel match) and the wordmark is shipped as Figma artwork. Passy now appears in 8 Figma poses. The icon, adaptive icon, splash (#F8FAFC + mountain) and favicon were regenerated (`npm run brand:assets`). |
| 2 | The share cards were coded 9:16 placeholders with made-up numbers ("I beat Tunde", "95%"). | Score, streak and level are redrawn to Figma's Social Sharing Cards (609×696). Badge and duel templates were added in the same system. Every card is built from typed, real data. |
| 3 | Sharing a *badge* used the *level* template ("Sharpshooter · New badge unlocked"). | It now uses its own badge card. |
| 4 | The duel result said "DEFEAT". | It now uses Figma's "VICTORY!" / "GOOD FIGHT", with trophy and encouraging Passy and scores that count up. |
| 5 | Duel rules ("7 questions, 15s, +30 XP") were typed in 4 places. | They are derived from `DUEL_ROUNDS`, `DUEL_SECONDS_PER_QUESTION` and `XP_RULES`. |
| 6 | Copy claimed "Real past questions, 2010–2025". The bank is 1,810 questions dated 2012–2023, and the NECO set is hand-authored. | Claims are computed from the bank ("1,800+ … practice questions"). A test blocks "real past questions" and "2010–2025" in kit copy. |
| 7 | `WaInvite` showed fake stats ("2 invited / 1 joined") and built its own code format. | It uses the one personal code (`personalCode`) and real counts. |
| 8 | The checkout ambassador code accepted anything 4+ characters long. | It normalises case, spaces and dashes, checks the format, and shows an inline error. |
| 9 | The Question bank was an unstyled engine demo (Google-blue `#1a73e8`, grey hex text, 11px type, no roles), and the Practice hub links to it. | It is rebuilt on the design system, with subject icons, ✓-labelled correct answers and an empty state. |
| 10 | The Question bank spun forever if the database failed to open. | It now shows an error state with Retry (on web this is triggered by "no such module: fts5", see #F17). |
| 11 | Nothing respected the OS **Reduce motion** setting. | `useReduceMotion()`: confetti, springs, bursts, count-ups, matchmaking rings and the splash slide now hold still. Opacity fades remain. |
| 12 | The sheet backdrop had a label but no role, and the duel "reconnecting" overlay used the old indigo-era `#F4F4F9`. | Fixed. |
| 13 | The message bubbles in invite flows used hard-coded `#E7FFDB` / `#C9EBB8`. | They use the `successSoft` tokens. |
| 14 | The Brand screen still described the eaglet, "system font" and "320dp". | It is rewritten to the Figma brand, Inter and 360dp. |
| 15 | Subjects had no visual identity outside their names. | WK 11 subject iconography: 25 subjects, with Figma's Lucide glyphs where they exist. |
| 16 | Long titles truncated at 360dp ("Ambassador prog…", "SHARPSHOO…"). | Titles are shortened, and headline fitting accounts for capitals (0.74em). |
| 17 | `npm run web`, the design review path in DESIGN_SPEC, did not build (missing `.wasm` asset ext). | `metro.config.js` is added per the Expo v57 expo-sqlite web setup. |
| 18 | **Every question's correct answer was option A**, so always picking A scored 100% in practice, CBT and duels. | Options are reordered per question with a seeded, reproducible shuffle (answers unchanged; `frontend/scripts/rebalance-answer-keys.py`). Keys are now A 442 / B 446 / C 483 / D 414. A test fails the build if any letter passes 35% overall or 50% in a subject. |

---

## 2. Fix list (open)

Priorities:
- **P0:** blocks store submission.
- **P1:** Figma and the app disagree on structure; product decides, then design/engineering build.
- **P2:** design debt.

### P0 — before the release-candidate build

| # | Item | Owner | Notes |
| --- | --- | --- | --- |
| F1 | ~~Share cards don't export the image yet.~~ **Done (2026-11-21):** share cards and starter-kit graphics are captured at export size (react-native-view-shot) and shared as PNGs (expo-sharing). The caption with the link is copied for pasting under the Status image. | — | — |
| F2 | **Deep-link domain.** `passescort.app` is printed on cards, captions and the store frames. | Product / Eng | Register the domain, set up App Links / Universal Links, rerun `npm run store:assets`. |
| F3 | **Question provenance.** The copy now says "practice questions". | Content | Confirm which JAMB/WAEC sets are real past papers before any copy says so. |
| F4 | **Privacy policy URL and Play data-safety form.** | Product / Eng | See `docs/store/LISTING.md` → Open items. |
| F5 | ~~**iPad.**~~ **Decided and built (2026-11-21): iPad is supported.** `ios.supportsTablet: true`; iPad rotates to any orientation and supports Split View/Slide Over (Apple requires all four orientations for multitasking), iPhone stays portrait. Windows 768 dp and wider get a 720 dp content column (phones and narrow Split View keep 480), the tab bar runs edge to edge, share-card previews grow. 13" iPad screenshots come from `npm run store:assets` (`docs/store/ipad/`). | — | Check on a real iPad before RC: keyboard on the auth screens, rotation mid-duel, Split View resize. |
| F6 | ~~**Placeholder numbers.**~~ **Decided (2026-11-21):** the numbers are final as built (PRD §11 lists them). No buyer discount on ambassador codes. | — | They live in `shared/pricing.ts` and `shared/referral.ts`; changing one updates every screen, card and caption. Re-run the store assets after any change. |

### P1 — Figma vs app structure (decide, then build)

| # | Figma has (node) | App has | Decision needed |
| --- | --- | --- | --- |
| F7 | Home is a swipe feed (`725:5670`) | Dashboard Home | **Decided: dashboard for v1.** The feed needs a card-ranking service; revisit after launch data. |
| F8 | 5 tabs: Feed · Practice · Play · Leaderboard · Profile | **Built:** Home · Practice · Duels · Ranks · Profile | **Decided:** five tabs, with the dashboard in place of the feed and Duels in place of Play. |
| F9 | Leaderboard (`727:17452`), Streak calendar (`726:8754`) | **Built** | **Decided: in.** Weekly (resets Monday 00:00 WAT), friends (invites + duel opponents) and all-time boards from `GET /leaderboard`, first name and initial only. Streak calendar from `GET /leaderboard/activity`, opened from the streak on Home and Profile. |
| F10 | 12-step onboarding (`725:595`…) | Exam → subjects → target → sign up → Passy | **Decided: keep it short** (PRD: first practice in under 2 minutes). Name comes from sign-up; the other questions are left out. |
| F11 | Flat component style (`14:38`) | **Built:** flat | **Decided: Figma flat.** `Button` (12px radius, darker fill on press, 1px navy outline for secondary, trailing arrow on forward actions), `OptionButton` (flat row, radio on the right), `Card` (1px border, 12px radius) and `Chip` (1px border) were restyled in one pass. Disabled buttons keep the legible slate colours (F18). |
| F12 | "PassEscort+" premium branding | **Built** | **Decided: PassEscort+**, sold as Day Pass and Monthly. |
| F13 | 5 tier shields | **Built:** Novice 1 · Scholar 10 · Strategist 20 · Sharpshooter 30 · Legend 40 · UTME Legend 50 | **Decided: Figma's shields**, with the PRD's UTME Legend at level 50. |
| F14 | 10 rounds, emoji reactions (`726:16491`) | **Built:** 10 × 15s, reactions | **Decided:** 10 rounds of 15s. Six fixed emoji (no free text, so nothing to moderate), one every 1.5s and at most 20 per duel, relayed by the server. Hidden against Passy Bot. |
| F15 | Play hub / mini games (`748:20750`, `748:21639`) | Not built | **Decided: out.** Not in the PRD. |
| F16 | Markets: Ghana, Gambia, Liberia, Sierra Leone (`725:715`) | Nigeria | **Decided: Nigeria-only launch** (JAMB/NECO are Nigerian; Naira payments; Nigerian bank payouts). |

### P2 — design debt

| # | Item | Owner | Notes |
| --- | --- | --- | --- |
| F17 | **expo-sqlite web has no FTS5.** The question bank fails on web (handled by the error state). | Eng | Native builds include FTS5. Only matters if web becomes a target; then add a `LIKE` fallback in `questionsRepository`. |
| F18 | **Accessibility issues in the Figma file:** disabled button white on `#94A3B8` (2.56:1), Sky 500 link text (3.75:1), input borders `#E5E7EB` (1.24:1), Body 14 for running text, "Challenge me" pill white on Sky 500 | Design | The app's tokens already deviate where needed (DESIGN_SPEC → Legibility). Update Figma so the two stop disagreeing. |
| F19 | **Badge art.** Figma has 3 achievement badges (7-day flame, 25 brain, target); the app has 17 coded medals. | Design | Draw the other 14 in the Figma style, or keep coded medals for v1. Mixing both in one grid looks broken. |
| F20 | **Figma spacing and radius variables** sit on hidden boards and weren't read. | Design | Unhide `Border Radius`, `Spacing` and `Theme` on the Design System page so the next sync can check spacing drift. |
| F21 | **On-device checks** that web can't do: 1.4× font scale on the new screens; Passy PNG memory on 2 GB phones (8 × 512px, about 1 MB decoded each); TalkBack reading order on the ticket and cards | Design + QA | Run on a low-end Android (720p, 2 GB) before RC. |
| F22 | **Copy typos still in Figma** (refreshed file): "Stimulate the real exam experience" (*Simulate*, Practice and Leaderboard frames), "Lets sign you up" (*Let's*, `62:579`), "Juilet" (*Juliet*, leaderboard). | Design | Fix in Figma; the app copy is already correct. |
