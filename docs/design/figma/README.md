# Figma sync — PassEscort (Edtech Product)

File: <https://www.figma.com/design/SOkYxHrsEFY3M02f53AYnq/PassEscort--Edtech-Product-> (key `SOkYxHrsEFY3M02f53AYnq`)
Last sync: **2026-11-21**, through the Figma MCP server (Starter seat: 20 read calls a month).

| File | What it is |
| --- | --- |
| `mobile-page-metadata.xml` | Layer tree of "PassEscort — Mobile" (`0:1`), refreshed 2026-11-21: node IDs, names, sizes, positions. Some frames came back without their children (a page-level read limit). |
| `frame-texts.md` | Visible text per frame, generated from the XML. Use it to see what a screen says without spending a call. |
| `process-assets.py` | Turns raw Figma image exports into the app's assets (trim, square, resize, 256-colour quantise). |
| `reference/*.png` | Screenshots from the **October** survey, 324px wide. Kept for history; several node IDs in their names no longer exist. |

> **Node IDs changed between October and November.** The designer rebuilt the page into sections (for example, "04 Meet Passy" moved from `77:35` to `725:669`). Always look IDs up in today's XML; don't reuse old ones.

## Page structure (2026-11-21)

**PassEscort — Design System** (`1:2`): colours, typography, buttons (`14:38`), gamification (`18:55`). Border radius, spacing and theme boards are hidden (DESIGN_QA F20).

**PassEscort — Mobile** (`0:1`), by section:

| Section (node) | Frames | In the app |
| --- | --- | --- |
| Splash Screen (`62:574`) | splash, 3-page intro | Splash ✓ (synced); intro carousel → DESIGN_QA F10 |
| Authentication (`722:402`) | sign-up options, email sign-up, log in | SignUp, Login |
| Meet Passy (`725:595`) | Meet Passy, name, how did you hear, country | OnboardMascot; the rest → F10 |
| Exam Selection (`725:1037`) | exam, specific exam / session | OnboardExam; session → F10 |
| Subject Selection & Target (`725:2149`) | subjects, target score | OnboardSubjects; target score → F10 |
| Goals & Overview (`725:4375`) | confidence, daily target, Legend Path, journey summary | OnboardTarget, OnboardMascot |
| Home / Feed Screen (`725:5670`) | feed cards: question, quest, PvP, PassEscort+, leaderboard, streak | Dashboard Home → F7, F8 |
| Practice Screen (`726:9215`) | practice, mock exams, daily quest | PracticeHub |
| JAMB Mock Exam (`726:10294`) | session, submit, palette, results | CbtSession, CbtResult |
| WAEC Mock Exam (`726:11629`) | session, palette, results | WaecSession |
| Play Screen (`726:14394`), PvP (`726:15863`) | quick match, friends, VS, battle, result | DuelHub, Matchmaking, DuelBattle, DuelResult |
| Leaderboard (`727:16920`) | weekly leaderboard | → F9 |
| Profile (`727:17793`) | profile | Profile |
| PassEscort+ (`748:20924`), Premium modal (`726:7919`) | premium, AI and solutions upsells | Plans, AI gate → F12 |
| Feedback & Level up (`725:6752`) | answer selected, correct, incorrect, level up | WaecSession, LevelUp |
| Streak Calendar (`726:8602`) | streak calendar | → F9 |
| Social Sharing Cards (`726:8936`) | frames 71–73 | ShareCard ✓ (synced, WK 09) |
| Levels & Badges (`734:18445`) | 5 tier shields, 3 badges | TierShield ✓; badges → F19 |

## Assets imported (2026-11-21)

Raw exports were saved by content hash and turned into app assets with `process-assets.py`:

| App asset | Source image (hash) | Section exported |
| --- | --- | --- |
| Logomark | Redrawn as vectors from `a0b1d1c3` (2556px) — `src/brand/svg.ts` | Splash Screen `62:574` |
| `assets/brand/lockup.png`, `lockup-white.png` | `e020efa0`, `bac8876a` | Splash Screen `62:574`, Social Sharing Cards `726:8936` |
| `assets/brand/mountain.png` | `3830e3b4` | Splash Screen `62:574` |
| `assets/brand/books.png` | `a253a9e8` | Social Sharing Cards `726:8936` |
| `assets/passy/wave.png` | `fee5724d` | Meet Passy `725:595` |
| `assets/passy/celebrate.png` | `56c776c4` | Social Sharing Cards `726:8936` |
| `assets/passy/trophy.png` | `71fccddb` | Social Sharing Cards `726:8936` |
| `assets/passy/fire.png` | `98324ee6` | Home / Feed `725:5670` |
| `assets/passy/ai.png` | `9833bc20` | Home / Feed `725:5670` |
| `assets/passy/study.png` | `68ea898f` | Meet Passy `725:595` |
| `assets/passy/encourage.png` | `686b96e2` | Home / Feed `725:5670` |
| `assets/passy/read.png` | `33a91e15` | Home / Feed `725:5670` |
| `assets/tiers/{novice,scholar,strategist,sharpshooter,legend}.png` | `d2b5d365`, `e66164f0`, `6443782a`, `08c5870f`, `ffbfa409` | Levels & Badges `734:18445` |
| Subject glyphs | Lucide names from layer names (`lucide/atom`, …); path data from lucide-static 1.77.0 | Subject Selection `725:2149` |

To re-import after the designer changes art:
1. Call `download_assets` on the **section** node. One call returns up to 20 source images.
2. Save the images by content hash.
3. Run `python3 -I process-assets.py <raw-dir> <out-dir>` and copy the output into `frontend/assets/`.

## Call log

| Date | Calls | Spent on |
| --- | --- | --- |
| 2026-10-04 | 20 | Survey: metadata, variables, 14 screenshots |
| 2026-11-21 | 11 | Session; 3 reads on stale October node IDs (empty or not found); page list; full page metadata; 5 section asset exports (Splash, Meet Passy, Home/Feed, Levels & Badges, Social Sharing Cards) |

Rebuilding the Figma-only screens (DESIGN_QA F7–F10) will need about 30–40 more `get_design_context` calls. Do that after product has decided on them, and with a plan that allows it: Professional (200 calls a day) or a REST API token (`GET /v1/files/:key` returns the whole tree in one call).
