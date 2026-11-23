# PassEscort — Store listing (WK 07 / WK 13)

**Status:** ready for review, 2026-11-21. Character counts are checked by script (see the end of this file).
**Images:** `docs/store/play/`, `docs/store/ios/` and `docs/store/ipad/`, regenerated from the real app with `npm run store:assets` (in `frontend/`).

Two rules for anyone editing this copy:
1. **Say "practice questions", not "real past questions"**, until the content team confirms where every set came from. The NECO set is hand-authored and the WAEC/JAMB sources haven't been checked yet (PRD §10). The question count comes from the bundled bank (`bankCoverage()` in `src/practice/questions.ts`), so it rounds down to the nearest hundred and is never padded.
2. **No promises about grades.** PassEscort helps students practise; the results are theirs.

---

## Google Play

| Field | Limit | Copy |
| --- | --- | --- |
| App name | 30 | PassEscort: JAMB, WAEC & NECO |
| Short description | 80 | Practise JAMB, WAEC & NECO questions offline, with CBT mode and quiz duels. |
| Category | — | Education |
| Tags | — | Education, Test preparation |
| Contact email | — | *(to be provided by the founder)* |
| Privacy policy URL | — | *(required before submission; see Open items)* |

### Full description (limit 4,000)

```
Get exam-ready for JAMB UTME, WASSCE (WAEC) and NECO, one question at a time.

PassEscort turns exam prep into a daily habit. Practise with 1,800+ questions with answers across 21 subjects, keep your streak alive, level up, and challenge your friends to quiz duels. Most of it works without data.

JAMB CBT MODE
• Timed 40-question sprints in 30 minutes, set out like the real CBT
• Question navigator, flag questions, and change answers until you submit
• Results by topic, so you know exactly what to revise next

WAEC & NECO PRACTICE
• Objective questions with instant feedback and explanations
• Theory questions broken down step by step, mark by mark

WORKS OFFLINE
• Download a subject once and practise anywhere, even with no data

PASSY EXPLAINS IT
• Stuck on a question? Get a plain-English, step-by-step explanation
• 3 free explanations every day

STAY MOTIVATED
• Daily goal and study streaks
• Earn XP and climb from Level 1 Novice to Level 50
• Collect badges for practice, streaks, duels and mastery
• Track your mastery in every subject

DUEL YOUR FRIENDS
• Live 1v1 quiz duels: 7 questions, 15 seconds each
• Faster correct answers score more
• Send a duel link on WhatsApp, and share your wins to your Status

FREE TO START
Practice questions, CBT sprints and duels are free. Upgrade when you need more:
• Day Pass: ₦100 for 24 hours of everything
• Monthly: ₦800 for 30 days (about ₦27 a day)
Paid plans unlock unlimited AI explanations and full worked solutions. Pay by card, bank transfer or USSD through Paystack.

AMBASSADORS
Share your personal code with classmates. Friends who join get 100 gems, and you do too. Ambassadors also earn 20% when friends buy a plan with their code, paid to a Nigerian bank account.

Made for students in Nigeria, for low-cost Android phones and expensive data.
```

## Apple App Store

| Field | Limit | Copy |
| --- | --- | --- |
| Name | 30 | PassEscort: JAMB, WAEC & NECO |
| Subtitle | 30 | Exam practice, even offline |
| Promotional text | 170 | New: Ambassadors earn 20% when friends subscribe with their code. Share your pass from your profile. |
| Keywords | 100 | jamb,utme,waec,wassce,neco,cbt,past questions,exam,practice,nigeria,quiz,ssce,gce |
| Primary category | — | Education |
| Description | 4,000 | Same as Google Play |

---

## Screenshots (both stores, same order)

Captions are composed onto the images; the numbers come from the same constants the app uses.

| # | Headline | Subline | Screen |
| --- | --- | --- | --- |
| 1 | Your daily exam plan | Streaks, XP and a goal that fits your day | Home |
| 2 | JAMB CBT, just like exam day | 40 questions, 30 minutes, a real timer | CBT sprint |
| 3 | WAEC & NECO, step by step | See the working behind every mark | WAEC theory, step 1 + free-plan gate |
| 4 | Stuck? Passy explains it | Plain-English steps for tricky questions | AI Explain |
| 5 | Duel your friends live | 7 questions · 15 seconds each · winner takes XP | Live duel |
| 6 | Works offline. No data wahala. | Download once, practise anywhere | Practice hub, offline |
| 7 | From Novice to UTME Legend | Level up, earn badges, keep your streak | Level up (Scholar shield) |
| 8 | Earn while you study | Ambassadors earn 20% when friends subscribe | Ambassador dashboard |

| Asset | Size | File |
| --- | --- | --- |
| Play phone screenshots | 1080 × 1920 (9:16) | `play/01-home.png` … `play/08-ambassador.png` |
| Play feature graphic | 1024 × 500 | `play/feature-graphic.png` |
| Play hi-res icon | 512 × 512 | `play/icon-512.png` |
| App Store iPhone 6.9" | 1320 × 2868 | `ios/01-home.png` … `ios/08-ambassador.png` |
| App Store iPad 13" | 2064 × 2752 | `ipad/01-home.png` … `ipad/08-ambassador.png` (captured at iPad size, 1032 × 1376 at 2×) |

All people in the screenshots are fictional demo profiles (Adaeze Okafor, Tunde Bakare and so on).

## Launch social graphics

The share cards (`ShareCard` route) and the ambassador starter kit (`AmbassadorKit` route) are the launch social set: they come out on-brand at 1080 wide, with the code and link already on them. For the press kit, use the logo lockups in `frontend/assets/brand/`, Passy poses in `frontend/assets/passy/` and the feature graphic.

## Open items before submission

1. **Privacy policy URL and Play data-safety form.** The app collects name, email, exam choices and practice history (Firebase Auth, MongoDB), and processes payments through Paystack (no card data touches our servers). Engineering must confirm analytics and crash reporting before the form is filled in.
2. ~~**iPad screenshots.**~~ **Done (2026-11-21):** iPad is supported (`ios.supportsTablet: true`), and `npm run store:assets` renders the 13" iPad set (2064 × 2752) in `docs/store/ipad/`.
3. **Deep-link domain.** `passescort.app` appears on cards and in captions; it must be the real domain before launch (DESIGN_SPEC → Open questions).
4. **Question provenance.** If the content team confirms the JAMB/WAEC sets are real past papers, the copy can say "past questions" for those exam bodies specifically.
5. ~~**Placeholder numbers.**~~ **Signed off (2026-11-21, PRD §11):** 20% commission, ₦1,000 payout minimum, 100 invite gems, 3 free explanations a day. Update this copy if any of them change.
6. **Feature scope at launch.** The description promises live duels (built on Socket.io) and offline practice. Remove a section if its feature slips past launch.
