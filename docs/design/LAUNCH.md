# PassEscort — Launch support (WK 14)

**Window:** launch week, Dec 21–25 2026. **Goal from Trello:** launch week passes with no unresolved visual issues, and a next-iteration design backlog exists.

Being on call is people's work. This file gives the on-call designer what they need to do it: how visual bugs are ranked, how each kind gets fixed fast, and the backlog to start from.

---

## 1. Visual-bug triage

| Severity | Means | Examples | Response |
| --- | --- | --- | --- |
| **S1** | A student can't finish a core task, or money/trust is at risk | Pay button hidden behind the keyboard; wrong price; text unreadable (contrast); a screen blank on a common phone | Fix the same day; hotfix build |
| **S2** | The task works but looks broken | Truncated title; overlapping Passy; wrong subject icon; layout breaks at 1.4× font | Fix within 48h; next build |
| **S3** | Polish | Spacing a few dp off; animation timing | Into the backlog |

**Every report needs:**
- a screenshot;
- the phone model, Android version and font size setting;
- the screen. On web review builds, the URL from `?route=` names it exactly.

## 2. Fast fixes by kind

| Kind of fix | Where | Then |
| --- | --- | --- |
| Copy or a number (price, reward, duel rules, commission) | Strings in the screen, or the constant in `src/game/pricing.ts`, `src/game/referral.ts`, `src/practice/types.ts` | `npm test`. If a number changed, rerun `npm run store:assets` and update `docs/store/LISTING.md` |
| Colour or contrast | `src/theme/tokens.ts` (never in a screen) | `npm test` runs the contrast suite |
| Mascot pose for a moment | `src/brand/mascot.ts` mood map | — |
| Logo, icon, splash | `src/brand/svg.ts` | `npm run brand:assets` |
| Subject icon or colour | `src/practice/subjects.ts` | `npm test` checks coverage and contrast |
| Share-card layout | `src/screens/duels/ShareCards.tsx` (Figma units, 609 × 696) | Check the longest subject: NECO Christian Religious Studies |
| A Passy pose or tier shield from Figma | `docs/design/figma/process-assets.py` | Re-export the section node from Figma (see `figma/README.md`) |

## 3. Watch list for launch week

These moments are most likely to break on real devices. They're new, raster-heavy, or depend on the phone's settings:
1. **Passy images on 2 GB phones.** First open of Welcome, Level up and Duel result.
2. **The ambassador payout form** with the keyboard open on small screens (360 × 640).
3. **Share cards** once the image export (DESIGN_QA F1) lands. Check WhatsApp Status crops and the 1080 × 1234 export.
4. **Reduce motion** on, then a level up and a duel win. The screen should hold still and still read as a celebration.
5. **Largest font size** (1.4×) on the duel header, plans table and ticket.

## 4. Post-launch design backlog

The order follows the PRD §3 success metrics: time to first practice under 2 minutes, D1/D7 retention, free-to-paid conversion, and the viral coefficient. Usage data has to tell us which of these matters most. Analytics isn't chosen yet (DESIGN_QA F4), so step zero is agreeing which events to track.

| Order | Item | Metric it serves | From |
| --- | --- | --- | --- |
| 0 | Event list for each metric: onboarding step completion, first practice, streak kept or broken, paywall views and conversions per entry point, share and invite opens | All | — |
| 1 | Decide the component style, then restyle Button, Option, Card and Chip in one pass | Polish / trust | QA F11 |
| 2 | Home: dashboard or Figma feed | D1/D7 | QA F7, F8 |
| 3 | Onboarding trimmed to the PRD's 2-minute target, using Figma's Passy-led screens | Time to first practice | QA F10 |
| 4 | Leaderboard and streak calendar | D7 retention | QA F9 |
| 5 | Premium naming (PassEscort+?) and paywall copy per entry point | Conversion | QA F12 |
| 6 | Badge artwork for all 17 badges | Retention | QA F19 |
| 7 | Duel format, emoji reactions | Viral coefficient | QA F14 |
| 8 | Ambassador program tuning (rate, minimum), once real payout data exists | Viral coefficient | DESIGN_SPEC → Open questions |

When launch week closes, record in this file which S1/S2 issues came up, how they were fixed, and anything that changes the order above.
