# SoftStatic: Playability, UX and UI, Phases 88–96

**Date:** 2026-11-04. **Repo state audited:** `main` at `de54944` (Phase 87 done, PLAN.md §8).
**Status:** Proposed. Nothing in this file is built. The user asked (2026-11-04) for "an audit of the whole game, compared against the Cast n Chill wiki (https://castnchill.unpack.wiki/), and a plan for an overall improvement in playability, UX and UI, playable on desktop and on mobile". Each phase starts only on the user's word. The open questions are in §6.
**Read with:** PLAN.md §0 (conventions, required) and §8 (status). Like the other PLAN_*.md files, this one adds phases after the approved spec and does not edit §0–§7 or Appendix V. It replaces nothing in [SOFTSTATIC_IMPROVEMENT_AUDIT.md](SOFTSTATIC_IMPROVEMENT_AUDIT.md). That audit covered the game at Phase 12, and every item in it is done.

Labels: **[V]** verified (seen in the code, in the running game or on the wiki), **[S]** suggestion, **[U]** unverified.

---

## 1. Summary

SoftStatic now has almost every system Cast n Chill (CnC) has. It has 9 waters plus the ice and the pond, 69 species with S–XXL sizes and trophies, rods, 23 lures by type and size, and mono, fluoro and braid line. It also has the dog and petting, the cabin restoration, the pond clean-up and stocking, the ice holes, and storms. Several systems go deeper than CnC's: the rope line, the rod solver, fish homes by reach, depth and hour, and lures that have to be worked. The look is close to the reference, and the checks are green: `--validate` OK, `--replay 12345` identical (`2417951256`), `--pacing` PASS (6.0 catches, creek 40.0 min, Russetwood 338.8 min), `--saves` PASS, no page errors in a headless session on desktop or phone.

**Content is not what's missing. What's missing is explaining it, making it readable on a phone, and the small comforts CnC gives the player.** The main problems, in order:

1. **Nothing teaches the game.** [V] On a fresh save the only words on screen are the clock, coins, bait and "W the pier". Nothing tells the player to hold Space to cast, that the tip nods on a bite, to ease off when the fish runs, or that a lure (unlike bait) must be worked. No screen lists the controls, on desktop or on a phone.
2. **Losing a fish is silent.** [V] A snap, a thrown hook and a fish that swims off all end the fight with no message. The reason is written only to the debug log (`underwater.js:1505`). In a headless session a passive player lost 3 of 3 fish in about 6 s each and never saw why.
3. **The fight is hard to read.** [V] Tension shows only in the colour of a 1 px dotted line (`hud.tensionKey`), in the rod's bend, and in sound. CnC's "Fish Fighting Update" (v1.0.2) added "clear visual cues" for slack and tension, plus thrash bubbles, because players asked for them.
4. **On a phone the text is too small to read and the targets too small to hit.** [V] On an iPhone 13 in landscape with the browser bars, the 640×360 canvas is drawn at 0.95 CSS px per game px. The fine font's capitals (7 game px) come out about 6.6 CSS px tall, against roughly 11 CSS px that is comfortable on a phone. The catch card's SELL, KEEP and RELEASE keys are 11 game px tall (about 10 CSS px), against Apple's 44 and Google's 48. The journal's text, the shop's item window and the map's card are all at that size.
5. **Phone controls cover the game and use letters for names.** [V] J, M, S and P are opaque black squares labelled with a keyboard letter. The steering pad and the action button sit over the underwater view. On a 19.5:9 phone, 19% of the screen's width is unused black bars beside the 16:9 picture, while the controls sit on top of the picture.
6. **Phone leftovers.** [V] The catch card still says `A/D  SPACE` in touch mode (`card.js:13,121`). The first tap both wakes the page and casts. [V] There is no service worker, so the home-screen app needs a network connection. There is no `navigator.storage.persist()`. iOS Safari can delete a site's localStorage after 7 days without a visit unless the page is installed, and the save lives only there. [V] iPhone Safari has no Fullscreen API for a canvas, so on iPhone the bars stay unless the game is added to the Home Screen, and nothing tells the player that.
7. **The player can't choose the hour.** [V] Fish homes are by dawn, day, dusk and night, the journal tells you "by day", and one game day is 24 real minutes. Nothing lets you wait or sleep until the hour you need: the cabin bed only prints a line. CnC has "change the time of day" (its *Nap Time* achievement).
8. **No goals beyond the journal.** [V] The game has no achievements or milestones at all. CnC has about 40 quiet ones that steer play (catch every size, release one of every species, 12 fish from one hole, clean the pond, restore the cabin), and SoftStatic already counts most of these things.
9. **No hands-off mode.** [V] Passive mode was removed in Phase 52 at the user's request (no passive *income*). CnC's other signature is its idle mode, and since v1.0.2 also a **Screensaver Mode: "no progression, sales, or achievements, just relaxed viewing"**. That would fit the user's rule exactly.
10. **Settings are thin.** [V] There is one master volume, Sound, Dog barks and Full screen. There are no separate music, ambience or effects volumes, no text size, no option to reduce flashes (the storms' lightning), no hold-or-toggle for reeling, no gamepad, and no controls page.

Most of the fixes are presentation and UI only (`js/ui`, `js/core/input.js`, `js/core/device.js`, `index.html`), so the replay hash and the pacing baselines stay as they are. The exceptions are flagged in each phase.

---

## 2. Cast n Chill: what the wiki says

Read on 2026-11-04 from castnchill.unpack.wiki: Mechanics, Rods, Lures, Lines, Boats, Locations, Areas, Time, Companions, Cosmetics, Achievements and the patch notes v1.0.1–v1.3.0. The wiki is thin in places (no speeds, storage sizes or rod stats), and those gaps are marked [U].

| Topic | Cast n Chill (wiki) | SoftStatic now | Gap |
|---|---|---|---|
| Waters | 8 areas, 17 spots: rivers, lakes, seas, 1 ice spot, the cabin. Area prices 0, 250, 500, 1250, 1500, 1750, ice free, cabin 4000 (**about 11,250 in all**) | 9 waters + ice (free once a sea is seen) + pond. Prices 0, 550, 800, 1500, 2400, 3400, 4800, 7000, 9500 (**about 29,950**) | Prices about 2.7× CnC's, with no idle income (see 6.Q4) |
| Fish stats | Speed 1–5, Stamina 1–5, **Vision 1–8** (spooked more easily), Hearing 1–5; fight, chase and flee phases | strength, speed, fatigue, awareness, caution, `lineShy`; pull and tired modes, head shakes, jumps | Equivalent. Hearing (boat noise) has no counterpart; not needed |
| Rarity | Common, Uncommon, Rare, Epic, with value ×5/×8/×10/×15 and a new-species bonus 10/20/50/100 | No rarity (Phase 68: "no rarity"); ice uses `turnUp` | **No new-species bonus**, a cheap "first catch" reward [S] |
| Legendaries | One per species family, in fixed periods (e.g. Muskie and Pike at night), respawn after 20 h | Trophies by weight (brass tag, TROPHY on the card) | Fine. Named trophies could live in milestones (P94) |
| Lures | Bought once at Rusty's, **unlocked by discovering species**, sizes S–XXL, bonus species per lure | 23 lures by type and size; **consumable packs (1–2), lost when the line snaps**; must be worked | **Friction CnC doesn't have** (see 6.Q3) |
| Lines | Mono (seen), Fluoro (50% opacity, doesn't scare small fish), Braid (strong, seen); each rod comes with a line | Same three, with richer feel | Match |
| Rods | 10 rods, each for sizes (S–XXL) and a water type; set cast distance, response, weight | Rods with power, action, `maxMass`, castMax; the ice rods | Match |
| Boats | 5 boats (free → 5000) | One boat and the Snow Machine | Upgrades by look only would be a nice-to-have [S], not needed |
| Storage | A storage limit; v1.2.4: "casting is blocked when storage is full" | Sold or kept at once from the card | **Keep it as it is**: less friction, better on a phone |
| Time | Activity varies by period; legendaries by period; **the player can change the time** (*Nap Time*) | 24-minute day; homes by period; **no way to change it** | P93 |
| Idle | Idle mode (auto gear and spot; v1.0.1: idle catches sell at half) and **Screensaver Mode (no progression)**; the *Fishwatch* achievement for 30 min of it | Removed (Phase 52). Pond Cam on the cabin's TV is the only "watch" | P95 (needs the user's word) |
| Fight UX | v1.0.2: **visible slack and tension cues**, steer the fish by pulling at the right time, better thrash bubbles | Line colour, rod bend, sound | P89 |
| Map | v1.2.4: open the map on the water; tips on how to unlock spots | Map anywhere; the cost on the stop's card | Add "how to open it" tips (P88) |
| Fish book | Trophy icon on tiles; **best catch shows its period**; auto-scroll to the current water | Journal by water and family; homes and hours; sizes | Add the period of the best catch and a trophy mark [S] |
| Achievements | About 40: first fish, releases, size feats, 10 pats in a session, **Feeding Frenzy** (5 fish at the lure), ice holes, collection (every species, every size, release every species), trophies, pond and cabin | None | P94 |
| Companions | 18 (8 breeds and a Maine Coon cat), pattable | 4 dogs, pattable, with barks | A cat and more coats are data (P97) |
| Cosmetics | Hats, outfits, skins; v1.2.0 picker "directly, no shuffle" | 4 fisher looks | Fine |
| Controls | "Two buttons"; gamepad with vibration (v1.1.0); a controls screen (v1.2.4) | Keyboard, mouse, touch; **no gamepad, no controls screen** | P88, P92 |
| Pond and cabin | Stocking, cleaning, Fish Viewer, trophy wall, dock fishing (v1.3.0) | All of these (Phases 83–85) | Match |
| Ice | Drill (stamina), *Hole Dozen* (12 from one hole) | Drill, per-hole catch counts | Match; the milestone is free |

**What carries over [S]:** (1) CnC teaches itself with almost no text, because every action has a visible and audible answer, and SoftStatic needs the same few answers (P88–P89). (2) CnC's comforts (change the hour, a screensaver, quiet goals) cost little and keep a cozy game going. (3) CnC is meant to sit in a second window or on a handheld: legible at a glance, playable with one hand or a pad.

---

## 3. Audit findings in detail

### 3.1 How it was checked
- `node tools/balance.js --validate | --replay 12345 | --pacing | --saves`: all OK or PASS, numbers as in 8.5.
- Headless Chromium (scratchpad scripts, `?debug&seed=7` and `seed=11`, fresh save, overlay hidden), at 1280×720 (PC) and as an iPhone 13 in landscape (750×342 CSS px with bars, dpr 3), each for about 150 s: casting, waiting, bites, hooking, fights, the card, the setup panel, the journal, the map, the shop, the cabin and pause. **0 page errors.**
- Measured: from the cast to a bite with worms at Fogbound at dusk, 52 s, 37 s and 32 s on the PC run and about 42 s on the phone run. A fight left alone (the line slack) ended in a lost fish after about 6 s, three times out of three, with no message.

### 3.2 Desktop

| # | Finding | Evidence | Fix in |
|---|---|---|---|
| D1 | No first-time guidance and no controls list | HUD strings in `hud.js`; menu items `menu.js:68` | P88 |
| D2 | A lost fish is never explained | `underwater.js:1505` (debug only) | P88 |
| D3 | The bite has no on-screen cue beyond the tip and float (the action word exists only in touch mode) | `device.report().word` is `CAST` on PC but never drawn | P88 |
| D4 | Lures must be worked (78b), and nothing says how: steady, stop-and-go, pops, slow | `fish_ai.js:20`, `underwater.js:778` | P88 |
| D5 | Tension is read from a dotted line's colour; red against green-teal is the classic colour-blind pair | `sailing.js:1084` | P89 |
| D6 | The selected row in the pause list has low contrast (a dim amber on dark) | screenshot `desk_06_ui_pause` | P90 (shared panel style) |
| D7 | The walk-in rooms don't sit centred: 105 px of black under the shop at 1280×720, 15 above | screenshot `desk_06_ui_shop` | P90 |
| D8 | No gamepad; no remapping (WASD and the arrows are enough for remapping) | no `getGamepads` in the code | P92 |
| D9 | No way to choose the hour | `cabin.js:492` | P93 |

### 3.3 Phone (iPhone 13 in landscape, emulated)

| # | Finding | Evidence | Fix in |
|---|---|---|---|
| M1 | Text about 6.6 CSS px; panels at 0.95× | `dbg.device()` → `scale 0.95, css [608,342]`; fine font 7 px | P90 |
| M2 | Tap targets 10–12 CSS px (card keys, filter chips, map stops, pause rows) | `panel.js` `KEY_H 11, ROW 12` | P90 |
| M3 | J, M, S, P as letters in opaque black squares | screenshot `phone_p01_first_tap` | P90 |
| M4 | Pad and button over the underwater view, while 19% of the width is black bars | `css [608,342]` in a 750 px viewport | P90 |
| M5 | The card says `A/D  SPACE` in touch mode | `card.js:13,121` | P90 |
| M6 | The first tap casts as well as waking the page | screenshot `phone_p01_first_tap` (REEL, line out) | P90 |
| M7 | The action button is blank in the shop when nothing is near (a big empty circle) | screenshot `phone_f_shop` | P90 |
| M8 | No offline play; the save can be evicted (iOS 7-day rule) | no service worker or `storage.persist` | P91 |
| M9 | On iPhone the bars can't be hidden without Add to Home Screen, and nothing says so | WebKit has no element Fullscreen on iPhone [V known platform limit] | P91 |
| M10 | Holding to reel through a long fight tires the thumb | `input.js` hold model | P92 (hold or toggle) |
| M11 | No vibration on bite or hook (Android has `navigator.vibrate`; iOS Safari doesn't) | — | P91 |

### 3.4 Things that are good and must not change [V]
The look; the sound design; no fail states, with escapes that are gentle; instant selling (no storage chore); the journal's "where and when" lines, which work as a built-in guide; the panel style that keeps the world visible; the 60 fps desktop frame; deterministic sim and the checks. The plan below keeps all of them.

---

## 4. The phases

Every phase keeps §0's rules: one `G`, palette keys, the bitmap font, `update()` never draws, no allocations in hot paths, and nothing that blocks input or shouts (§0.14). "Done when" is a `dbg` or Node check. Unless a phase says so, `js/sim` and `data/` are untouched, so the replay hash, `--pacing`, `--tackle` and `--fight` stay as in 8.5.

### Phase 88: The first hour (teach without a tutorial)
| Task | What | Files | Done when |
|---|---|---|---|
| 88.1 | **Quiet first-time tips.** One short line at a time near the boat, in the HUD's fine font, each shown until the player does the thing once, then never again (`save.tips`, a set of ids; no version bump, read with defaults): *Hold SPACE (or hold the button) to cast, let go to throw*; *Wait. The tip nods when something takes it*; *Now: SPACE to set the hook*; *Hold to reel. Ease off when it runs*; *SELL, KEEP or RELEASE*; *J the journal tells you where and when each fish lives*; *S changes tackle*; *M the chart: new waters cost coins*. Each uses the device's words (keyboard, mouse or touch). Never during a bite unless it's the bite tip; never over a panel. A pause-menu row, **Tips: on/off**. | `js/ui/hud.js`, `js/ui/tips.js` (new, `G.ui.tips`), `js/ui/menu.js`, `js/core/save.js` (defaults only), `index.html` | `dbg.tips()` lists each tip with shown/done; a scripted fresh-save session (cast, bite, hook, fight, card) shows each tip once, in order, and none after it's done; `--saves` PASS |
| 88.2 | **Why it got away.** When a fight ends without a catch, one HUD line for 4 s: *The line snapped. The lure went with it.* / *It threw the hook on a slack line.* / *It ran off. Keep a little tension.* / *It saw the line and turned away* (exists). Read from `F.result`, `F.thrown`, `F.slips`. | `js/scene/underwater.js` (read only), `js/ui/hud.js` | Forcing each outcome with `dbg` shows its line once; `--replay` identical |
| 88.3 | **The bite seen on a PC.** The action word the phone shows (`actionWord()`) is drawn small beside the rod tip on a PC too, while there's a bite (`HOOK`) and on the first fights (`REEL`, then *ease* during a run), fading out once the player has landed 3 fish (`save.tips`). | `js/ui/hud.js` | `dbg.device().word` matches the word drawn through a scripted bite |
| 88.4 | **How to work a lure.** The setup panel's foot line and the shop's item window say the lure's retrieve in words (*steady*, *stop-and-go*, *twitch: tap, tap, wait*, *slow and low*) from its `swim`; while a lure is out and badly worked (`cast.work < workMin` for 3 s) the HUD says it once per cast: *Too still. Try stop-and-go.* | `js/ui/setup.js`, `js/ui/shop.js`, `js/ui/hud.js` | Each of the 23 lures shows a retrieve line; the hint shows at `work 0` and not at `work 1` |
| 88.5 | **Controls page.** A *Controls* row in the pause list opens a panel: keyboard and mouse on a PC, touch on a phone (and the pad once P92 lands), drawn from one table so it can't drift from `input.js` (PLAN_MOBILE.md §2b is the source). | `js/ui/menu.js`, `js/ui/controls.js` (new) | The panel lists every action in `input.KEYS`; a check fails if an action is missing |

### Phase 89: A fight you can read
| Task | What | Files | Done when |
|---|---|---|---|
| 89.1 | **A tension cue that isn't only colour.** A small arc drawn round the reel (or a 3 px bar under the HUD's bait line, the user's pick, 6.Q6): its length is `F.T`, a notch at the slip point, and the line's hum *shape* changes too (it thickens and shivers near the limit; it sags and greys when slack). Setting **Fight gauge: off / subtle / full**, default subtle. | `js/ui/hud.js`, `js/scene/sailing.js` (draw only), `js/ui/menu.js` | `dbg.fight().T` and the drawn arc agree within 2% over a scripted fight; gauge off draws nothing |
| 89.2 | **Runs you can see.** While the fish pulls (`F.mode === 'pull'`), thrash bubbles and a swirl at the fish (`G.gfx.fx`), more in a head shake; the tired fish's roll (exists) gets a soft flash of its flank. | `js/scene/underwater.js`, `js/gfx/fx.js` | fx count rises in `pull` and falls in `tired` (`dbg.fx` count), no allocation per frame |
| 89.3 | **Reel or ease, said once.** In the first three fights only (save.tips), the word above the reel flips between *REEL* and *EASE* with the mode. | `js/ui/hud.js` | as 88.3 |

### Phase 90: Big enough on a phone
| Task | What | Files | Done when |
|---|---|---|---|
| 90.1 | **A UI scale for panels.** Panels, the card, the HUD and the hints are drawn on their own layer at a UI scale *u* (1, 1.5 or 2 game px per panel px), chosen in touch mode so the fine font's capitals are at least 10 CSS px (iPhone 13: u = 1.5), and settable on a PC (**Text size**: normal, large). The panels lay out in a 640/u × 360/u space (427×240 at 1.5), which is why the journal and the setup panel need a narrow layout (one column; the journal's plate above its text). The world stays at 640×360. | `js/ui/panel.js`, `js/ui/*.js` layouts, `js/core/device.js`, `js/gfx/sprites.js` (a scaled draw, no new font) | On 844×390, 750×342 and 667×375, `dbg.device().textPx` ≥ 10 for every panel; on a PC at "normal" the panels are pixel-identical to now |
| 90.2 | **Targets you can hit.** In touch mode every tappable row, key and chip is at least 44 CSS px tall (the card's keys stack in a row of three big keys under the fish); tap slop of 6 CSS px; a pressed state. | `js/ui/panel.js`, `js/ui/card.js`, `js/ui/journal.js`, `js/ui/map.js`, `js/ui/shop.js`, `js/ui/menu.js` | A layout check lists every hit box in touch mode and FAILs below 44 CSS px |
| 90.3 | **Controls in the margins.** When the screen is wider than 16:9, the picture moves to one side's safe edge and the pad and the action button go into the black margins (left thumb, right thumb), not over the water. When there are no margins, they're drawn at 35% opacity and fade with the HUD. J, M, S and P become small drawn icons (a book, a chart, a tackle box, two bars) with a word under each at u ≥ 1.5. | `js/core/device.js`, `js/core/input.js`, `js/ui/hud.js`, `index.html` | On 844×390 no control rect overlaps the canvas rect; on 16:9 the controls' alpha ≤ 0.35 when idle |
| 90.4 | **Touch leftovers.** No `A/D  SPACE` on the card in touch mode (M5); the first tap of a load only wakes (full screen, audio), never casts (M6); the action button shows a faint *WALK* in the rooms when nothing is near (M7); the rooms centred (D7); the pause list's selected row in a lit panel colour (D6). | `js/ui/card.js`, `js/core/input.js`, `js/ui/hud.js`, `js/ui/room.js`, `js/ui/menu.js` | Screens of each in the gallery; `dbg.device().word` in the shop is `WALK` |

### Phase 91: The phone as an app
| Task | What | Files | Done when |
|---|---|---|---|
| 91.1 | **Offline.** A small `sw.js` (no library) caches every file listed in `index.html` with a version string; a new version is fetched in the background and used on the next load, with a one-line *Updated* on the HUD. A PC served by `http.server` works as before. | `sw.js` (new), `index.html`, `tools/balance.js --validate` (checks the list matches `index.html`) | Offline in headless Chromium after one load, the game boots; `--validate` FAILs if a script is missing from the list |
| 91.2 | **Keep the save.** `navigator.storage.persist()` on the first tap; a once-only note on iOS Safari when not installed: *Add to Home Screen to keep your save and play full screen*; a weekly reminder row in pause, *Export save* (exists), when the save isn't persisted. | `js/core/device.js`, `js/core/save.js`, `js/ui/menu.js` | `dbg.device()` reports `persisted`; the note shows once on an emulated iPhone and never in standalone |
| 91.3 | **Feel it.** Optional vibration (Android): a short tick on a bite, a pulse on the hook-set, a buzz on a slip. Setting **Vibration** (touch mode only). | `js/core/device.js`, `js/scene/sailing.js` (calls only), `js/ui/menu.js` | Calls counted by `dbg.device().buzz`; none when the setting is off |

### Phase 92: Settings, access and the pad
| Task | What | Files | Done when |
|---|---|---|---|
| 92.1 | **Volumes by kind.** Master, Music, World (ambience, weather, wildlife), Effects (reel, splash, UI), Dog barks; the engine already has groups to route. | `js/audio/engine.js`, `js/ui/menu.js` | Each slider's gain on its bus checked by `dbg.audio()` |
| 92.2 | **Comfort.** *Reduce flashes* (lightning dimmed to a soft glow, no full-sky flash), *Hold or toggle reel* (a tap starts and stops reeling), *Text size* (90.1). | `js/scene/sailing.js` (storm draw), `js/core/input.js`, `js/ui/menu.js` | The flash's peak brightness ≤ the sky's `dusk_high` with the setting on; toggle reel lands a scripted fight with taps alone |
| 92.3 | **Gamepad.** The Gamepad API mapped onto the same actions: stick or d-pad to steer and move in menus, A action, B back, X setup, Y journal, Start pause, Select map, LB/RB pages; the hints show pad glyphs once a pad is used. Works on a PC, a Steam Deck's browser and a phone with a pad. | `js/core/input.js`, `js/ui/panel.js` (hint glyphs) | A synthetic pad (`dbg.pad`) drives a full cast, bite, fight and card, and opens every panel |

### Phase 93: Choosing the hour
| Task | What | Files | Done when |
|---|---|---|---|
| 93.1 | **Rest until…** The cabin's bed (and, on the water, a row in THE PIER panel: *Wait on the pier*) offers *until dawn / day / dusk / night*. A short fade, the clock jumps to the period's start, the fish already in view swim off quietly, autosave. Never during a fight or with the line out. | `js/ui/cabin.js`, `js/ui/dock.js`, `js/core/save.js` (autosave reason) | `dbg.hour()` reads the period's start after each choice; `--replay` identical (the clock set by a UI action, not the sim) |
| 93.2 | **The journal says when.** A species' page marks its best period with a small sun or moon, and its best catch records the period it was caught in (CnC v1.2.4). | `js/ui/journal.js`, `js/sim/economy.js` (one field on record: **sim-adjacent**, no replay change) | A catch at 06:00 records `dawn`; `--saves` PASS |

### Phase 94: Quiet goals (milestones)
| Task | What | Files | Done when |
|---|---|---|---|
| 94.1 | **Milestones from what is already counted:** first fish, first release, a fish caught again after release (if trackable), every size of a species, every species in a water, every species, release one of every species, a trophy of every species, 10 pats in one session, 12 from one hole, the pond cleaned, the pond full, a stocked fish caught, the cabin restored, every rod. Data in `data/milestones.js` (pure); judged from the save. | `data/milestones.js` (new), `js/sim/milestones.js` (new, pure), `js/ui/journal.js` (a third tab), `js/ui/hud.js` (a quiet line when one is reached) | Node: each milestone's test against fixture saves; `--validate` lints the data; no coins awarded unless 6.Q5 says so |
| 94.2 | **A first-catch bonus** (optional, 6.Q5): a new species pays once more, like CnC's new-species bonus. **Changes the economy:** `--pacing` re-recorded. | `js/sim/economy.js`, `data/gear.js` | `--pacing` inside its bands |

### Phase 95: Watch mode (needs the user's word; 6.Q1)
| Task | What | Files | Done when |
|---|---|---|---|
| 95.1 | **Screensaver mode, no income.** From pause: *Watch*. The fisher casts, waits and fights by himself (the existing auto-player in `fight.js` `ap`), the camera drifts, the HUD hides; fish are released, nothing is sold, kept, saved to the journal or counted. Any key or tap gives control back at once. The clock and the weather run as normal. | `js/scene/sailing.js`, `js/ui/menu.js` | `--passive` still PASS (no coins move); a 10-minute scripted watch leaves `save` byte-identical except the clock |

### Phase 96: Economy and tackle comfort (needs the user's word; 6.Q3, 6.Q4)
Sim changes, so the replay hash and pacing move and are re-recorded in 8.5.
| Task | What |
|---|---|
| 96.1 | Lures **bought once** (as in CnC), lost on a snap but re-tied free from the case, or kept consumable but with a "buy 5" row and a low-stock note. The user picks one. |
| 96.2 | Water prices brought nearer CnC's curve (the seas from 7000 and 9500 to around 4000–5000), with `--pacing` bands re-agreed. |
| 96.3 | A gentler first session: the first cast of a new save draws its first taker within about 15 s (a one-time spawn bias in `fish_ai`), so the first catch comes inside the first minute. |

### Phase 97 (backlog, optional)
A cat and more dog coats (data only); a trophy mark on journal tiles; *Feeding Frenzy*, where a hooked fish draws others for a moment (CnC's mechanic; a sim change); boat looks.

---

## 5. Order and size

| Order | Phase | Kind | Size | Why first |
|---|---|---|---|---|
| 1 | 88 The first hour | UI only | M | The biggest win for a new player on any device |
| 2 | 90 Big enough on a phone | UI and layout | L | Phones are unplayable to read today |
| 3 | 89 A fight you can read | Presentation | S | Lost fish are the main frustration |
| 4 | 91 Phone as an app | Platform | S | Protects saves on iPhone |
| 5 | 93 Choosing the hour | UI and save | S | Unlocks the time-of-day content the journal points to |
| 6 | 92 Settings and pad | Input and audio | M | Comfort and access |
| 7 | 94 Milestones | Data and UI | M | Long-term goals |
| 8 | 95, 96 | Need decisions | S, M | After the user's answers |

---

## 6. Questions for the user

- **Q1 Watch mode.** Phase 52 removed passive income. Should there be a CnC-style screensaver (it fishes by itself, earns and records nothing)? Yes or no.
- **Q2 Tips.** Quiet one-time tips near the boat (88.1), or only a Controls page and the "why it got away" lines?
- **Q3 Lures.** Keep lures as consumable packs lost on a snap (today), make them bought once like CnC, or the middle option (re-tied free from the case)?
- **Q4 Pace and prices.** The waters cost about 30,000 coins against CnC's 11,250, with no idle income. Is the current pace (a sea at about 11 h of active play) what you want, or should it be nearer CnC's?
- **Q5 Milestones.** Should they pay anything (a first-species bonus), or only be recorded?
- **Q6 Fight gauge.** An arc round the reel, a thin bar in the HUD, or only the line's shape and colour (no gauge)?
- **Q7 Phone layout.** May the picture move to one side so the controls sit in the black margins on wide phones (90.3)?
- **Q8 Gamepad.** Worth doing now (Steam Deck or controller on PC)?
