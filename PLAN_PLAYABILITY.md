# SoftStatic: Playability, UX and UI, Phases 88–96 (built)

Adds phases after the approved spec; decisions are in PLAN.md §8.3. Built: 90, 88, 89, 91, 93, 92, 96, 94. 95 was declined; 97 is the backlog. §7 is the UI style every later phase follows.

## 1. What the audit found (2026-11-04)
Content was not missing; explaining it, readability on a phone and small comforts were: nothing taught the game; a lost fish was silent; the fight was hard to read; phone text and targets were too small; phone controls covered the picture and were labelled with key letters; no offline play or persistent storage; no way to choose the hour; no goals beyond the journal; thin settings.

## 4. The phases
Every phase keeps §0: one `G`, palette keys, the bitmap font, `update()` never draws, no allocations in hot paths, nothing blocks input or shouts (§0.14).

### Phase 88: The first hour (teach without a tutorial)
- **88.1** Quiet first-time tips, one line at a time near the boat, each shown until done once (`save.tipsDone`): cast, wait for the nod, set the hook, reel and ease, Sell/Keep/Release, the journal, tackle, the chart. Device-aware words. A pause row turns them off.
- **88.2** Why it got away: one HUD line for 4 s (snapped, threw the hook on a slack line, ran off, saw the line).
- **88.3** The action word beside the rod tip on a PC too (HOOK, REEL, ease) for the first fights.
- **88.4** How to work a lure, in words, in the setup panel and shop; one HUD hint per cast if it is worked badly.
- **88.5** A Controls page from one table (PLAN_MOBILE.md §2b).

### Phase 89: A livelier fight (presentation only)
No gauge (Q6). **89.1** Each run picks a side (away from the last one 70% of the time) at 1.4–1.8× speed with a hard turn; tired fish are led in. The line swings and the rod leans with the run. **89.2** Thrash bubbles, swirls, spray; drag clicks follow the run. **89.3** REEL/EASE by the tip in the first three fights.

### Phase 90: Big enough on a phone
- **90.1** A UI scale *u* (1, 1.5, 2) for panels so the fine font's capitals are ≥10 CSS px on phones; a *Text size* setting on PC. Panels lay out in 640/u × 360/u; the world stays 640×360.
- **90.2** Touch targets: buttons ≥44 CSS px, list rows ≥28, 6 px slop, a pressed state.
- **90.3** On wide phones the pad and action button sit in the black margins; otherwise 35% opacity, fading with the HUD. J/M/S/P become drawn icons with words.
- **90.4** Touch leftovers (no key letters on the card, the first tap only wakes, WALK in rooms, rooms centred).
- **90.5** One UI style (§7) applied everywhere; a `ui` gallery page and a layout check.

### Phase 91: The phone as an app
**91.1** `sw.js` caches every file (version string; `--validate` checks the list); an *Updated* line. **91.2** `navigator.storage.persist()`; a one-time note on iOS to add to the Home Screen; export reminders. **91.3** Optional vibration.

### Phase 92: Settings and access
**92.1** Volumes: Master, Music, World, Effects, Dog barks. **92.2** Reduce flashes, Reduce motion, Hold or toggle reel, Text size.

### Phase 93: Choosing the hour
**93.1** Rest until dawn/day/dusk/night from the cabin bed or the pier (never with the line out). **93.2** The journal marks each species' best period and records when a best catch was made.

### Phase 94: Milestones, rewards and the size badge (economy)
**94.1** Milestones from what is already counted (`data/milestones.js`, `js/sim/milestones.js`), paid once, a MILESTONES tab in the journal. **94.2** A first-catch bonus per species, paid even if kept or released. **94.3** The size badge: a new size class or record rises as a brass medallion over the card (gold rim for a trophy), skippable at once. **94.4** A quiet top-centre line for a reached milestone, never during a fight.

### Phase 95: Watch mode (declined)

### Phase 96: Lower prices (economy)
Waters about 8,900 in all (creek 250 … Wreckhollow 2250), cheaper gear, lures as packs with *Buy 5* and clear counts, and a gentler first session (the first fish inside a minute, checked by `--first`). Pacing bands: first upgrade 2–6 catches, creek 5–20 min, Russetwood 60–150 min, a sea 150–300 min.

### Phase 97 (backlog, optional)
A gamepad; more pets and coats; a feeding frenzy; steering a running fish by leaning the rod; boat looks.

## 6. The user's answers (2026-11-04)

| # | Question | Answer | Where it went |
|---|---|---|---|
| Q1 | A screensaver that fishes by itself and earns nothing? | No | Phase 95 not built |
| Q2 | Quiet one-time tips near the boat? | Yes | 88.1 |
| Q3 | Lures consumable, bought once, or re-tied free? | Consumable | 96.3 |
| Q4 | Pace and prices | Lower costs, like a relaxed idle fishing game | 96.1, 96.2 |
| Q5 | Should milestones pay? | Yes, and a badge with the fish and its numbers when a bigger size is caught | 94.1–94.4 |
| Q6 | A fight gauge? | No; keep the fight, but give fish more speed and side-to-side runs, as in real life | 89.1–89.2 |
| Q7 | Controls in the margins on wide phones? | Yes, and make the UI and UX as professional as possible | 90.3, 90.5, §7 |
| Q8 | Gamepad now? | No, maybe later | Phase 97 |

## 7. The UI style (for 90.5 and every later phase)

- **Grid and space.** Every panel position and size is a multiple of 4 panel px; padding 8, gap between rows 4, between groups 12.
- **Type.** Three sizes: the title (the bold title font, panel tabs and the badge's name), the body (the fine font) and small (the fine font in `fog_mid`, for hints and old values). No other sizes. Numbers use tabular spacing so columns line up.
- **Colour roles** (palette keys, no new hex): panel ground, panel edge, text, quiet text, selected (lit amber), good (`moss_lit`), can't afford or warning (`rust_hi`), money (brass). Selection is never shown by colour alone: a selected row also gets an edge bar.
- **Buttons.** One shape: a rounded key with a verb, four states (idle, hover or focus, pressed 1 px down, disabled at half contrast). On a phone at least 44 CSS px tall; on a PC, hover shows.
- **Icons.** One set, 12 and 16 px, palette keys: journal, chart, tackle box, pause, coin, clock, size medallions S–XXL, trophy, milestone, lock, check.
- **Motion.** Panels fade and slide 4 px in 120 ms; the badge rises in 250 ms; nothing moves under *Reduce motion*. Nothing waits on an animation: input always works at once.
- **Sound.** A soft click on move, a soft confirm on choose, a muted thud on a refusal; on the effects bus.
- **Words.** Short, calm, second person where needed; a verb on every button; numbers with units (*31.2 cm*, *1.4 kg*, *250c*); hints name the device in use (key, tap).
