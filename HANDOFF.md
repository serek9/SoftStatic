# SoftStatic: Handoff

How to pick the project up on another computer. **PLAN.md §8 Project Status is the authoritative status** (phases, architecture, decisions, known issues, baselines, next task) and is updated every phase. The status sections below are a snapshot from 2026-10-29, at `afedba0` on `origin/main` (the merge of [serek9/SoftStatic#3](https://github.com/serek9/SoftStatic/pull/3), Phases 16–18).

## State in one paragraph

Phases 1 to 12 of [PLAN.md](PLAN.md) are built, checked and committed, one commit per phase, and pushed to `origin/main`. **Milestone A** (the cozy loop, Phase 7) and **Milestone B** (the liminal slice on Fogbound, Phase 10) are reached. On Fogbound Lake you sail, cast, watch the lure sink, hook and fight a fish, and sell or keep it. A HUD shows the clock, coins and bait. P pauses (volume, mute, save export/import), J opens the field journal, M opens the map, which leads to the bait shop and the cabin. At night, with unease, the water reflects things the shore does not have, the dog stares at a hidden spot, an owl calls at 02:47 and 03:33, and journal pages gain hints after you leave them. The map now opens three more waters: Blackwater Creek (300 coins; a current carries the lure), The Pines (1500; a traffic light that blinks faster near the owl's hours, a diner, a parking lot, the same pier as Fogbound) and the Red Room Reservoir (6000 plus a catch made in a clock window; curtains, a zigzag shore, a crimson reflection, and structures that move after every cast). None of the three has fish yet (Phase 14). TAB turns on passive mode: the boat fishes by itself at about 60% of active income. Time away is fished the same way when you come back (up to 8 hours), and a VHS-style tape shows what was caught, sometimes with `???` lines, a missing stretch, or a fish in your own handwriting that you never caught. `?compact` opens a small view for a second monitor. Since then the improvement audit ([SOFTSTATIC_IMPROVEMENT_AUDIT.md](SOFTSTATIC_IMPROVEMENT_AUDIT.md)) has been built in batches: a keyframed dusk sky with a moon, stars and clouds, fog that drifts and thickens, light on the water, gear shown on the boat, Phase 13's audio (`js/audio/engine.js`), feedback on bite, hook and landing, petting the dog (S or ↓), a HUD that fades when idle (H hides it), ambient life, a drizzle that comes with unease, and the map no longer sells waters that have no fish yet. Phase 14 is done too (**Milestone C**): 36 species across the four waters, the Red Room opening to whoever catches the Pines' 03:33 fish, final balance, touch controls with on-screen buttons, a performance audit, and save-migration checks (`node tools/balance.js --saves`). Every phase in PLAN.md §4 is built. Phase 15 (visual detail) then repainted the world after reference shots the user supplied: a split view with a bright waterline, painted mountains, forests and shores (`js/gfx/paint.js`), light that changes with the hour, a larger boat, fisher and dog, and detailed landmarks and underwater scenes. **Since then the game has moved to a native 640×360 view** (the user's choice, replacing §0.9's 320×180; see PLAN.md §8.3 #82–94), after Cast n Chill screenshots the user supplied, under strict pixel-art rules (one pixel size, flat colour clusters, no dithering or random speckle; §8.3 #84). Phase 16 and 17b redrew the bait shop after the Cast n Chill shop, with an original old shopkeeper, Rusty, worn down to the game's mood; Phase 17 added the 640×360 base, a fine bitmap font, painted fish portraits (`fishgen.portrait`), and repainted the journal (an open book) and the cabin (a log room with a fireplace and five restoration stages); Phase 18 repainted the four waters, the boat, the fisher, the dog in all its poses, and the HUD, catch card, map, pause and tape. Phase 19 repainted the underwater view (the bed, boulders, snags, weed, far rocks, light shafts, the lantern's cone, the creek's current) and made the fish native swimmers with a tail flick and a glitch shimmer, and moved `?gallery` to 640×360. **The whole game now draws at 640×360.** No next phase is scheduled (PLAN.md §8.6).

## Completed phases

| Phase | Commit | What it gave the game |
|---|---|---|
| 1 Foundation | `2f90f2b` | Canvas with whole-pixel scaling, fixed 1/60 loop, seeded RNG, input actions, scene manager and fishing state machine, `?debug` overlay, save skeleton |
| 2 Graphics core | `c147075` | Palette (dusk ceiling enforced), sprite DSL, bitmap font with handwriting jitter, bake utilities, pooled particles, `?gallery` |
| 3 Sailing | `16901ad` | Fogbound Lake data and parallax layers, camera, boat physics, mirror reflection, wake and ripples, dog poses, clock-driven sky |
| 4 Cast | `f04a040` | Forgiving charge, landing marker, bending rod, parabola that lands exactly on the marker, splash |
| 5 Underwater | `cd1aece` | Fade to the cross-section, bottom and weeds, light shafts, vertical camera clamped to `maxDepth`, sinking lure, depth readout |
| 6 Fish, clock, unease | `87206cb` | Game clock and forgiving windows, unease, fish schema and 4 placeholder species, species weighting, fish generator (8 bodies × 15 parts), fish AI, fish drawing |
| 7 Bite, fight, landing | `1b6ab97` | Bite window, the V4 fight model, auto-player, fight visuals, catch card, dog reactions, heavy-fish hints |
| 8 Economy, save, balance | `855d35a`, `ead0edf` | `data/gear.js`, `sim/economy.js`, save v2 with migration and autosave, gear wired into play, `tools/balance.js` |
| 9 Interface | `29a69dc` | HUD; overlays (pause menu with settings and export/import, journal, map); shop and cabin scenes; shopkeeper dialogue; travel; save v3 |
| 10 Anomalies | `b041d97` | Anomaly scheduler and data; reflection deltas; spot boosts; dog stare and bark; the owl at the clock windows; journal pages that gain hints; save v4 |
| 11 Locations 2–4 | `5c9b3c8` | Creek, Pines and Red Room data; the creek's current; the scenery hook and modules; moving structures; unlock costs in the location files |
| 12 Passive and the tape | `159b20d` | `sim/passive.js` (cycles, time away, the tape's contents); live passive on TAB from any state; `ui/tape.js`; phantom journal entries; `?compact`; one tab owns the save |
| Audit batches 1–6 (with Phase 13 audio) | `82dd8c1` … `235881c` | Sky, fog, light on the water, visible gear; `js/audio/engine.js`; bite and landing feedback, petting the dog, the fading HUD; ambient life, drizzle; polish |
| 14 Content and polish | `0ffdd33` | 36 species in four waters, the Red Room's unlock, final balance, touch and on-screen buttons, performance, `--saves` (**Milestone C**) |
| 15 Visual detail | `09e7c58` | Split view, painted layers (`js/gfx/paint.js`), the light of the hour, larger boat/fisher/dog, landmarks, underwater detail |
| 16 Bait shop look | `778a2b1` | The shop redrawn after a reference shot (320×180, superseded) |
| 17 640×360 base, shop, journal, cabin | `9741579` | `G.core.view` (native and ×2 scenes), `S.fine` font, paint helpers, `fishgen.portrait`, journal as a book, cabin as a log room |
| 17b Rusty's shop | `c8e7adf` | The shop after the Cast n Chill shop, with Rusty |
| 18 The waters at 640×360 | `fad59fa` | Painters, landmarks, scenery, sky and mirror at 2×; boat, fisher, dog; HUD, card, map, pause, tape; input in 640×360 |
| 19 The underwater view at 640×360 | `Phase 19: The underwater view at 640x360` | Cross-section at 2× under the pixel-art rules; `fishgen.swimmer` (rest, tail flick, shimmer, silhouettes); the creek's current streaks; `?gallery` native |

## Architecture

The tree follows PLAN.md §3. These files exist so far:

```
index.html           canvas, script load order (core → data → sim → gfx → scene → ui), boot
js/core/             debug.js rng.js state.js input.js save.js loop.js
data/                loc_fog.js loc_creek.js loc_pines.js loc_red.js fish.js gear.js dialogue.js anomalies.js
js/sim/              clock.js unease.js fish_ai.js bite.js fight.js economy.js passive.js   (pure; run in Node)
js/gfx/              bake.js sprites.js paint.js fx.js water.js fishgen.js
js/scene/            boat.js dog.js underwater.js scenery.js sailing.js
js/audio/            engine.js
js/ui/               hud.js card.js menu.js journal.js shop.js map.js cabin.js tape.js
tools/balance.js     --validate | --replay <seed> | --pacing | --passive | --saves
```

- **The view (640×360):** `G.core.view` in `core/loop.js`. A scene or overlay with `native: true` (shop, cabin, journal, map, pause, tape) draws in the view's pixels; the sailing scene still works in world pixels (the sim's 320×180 units) under a ×2 transform, but bakes every image at `HI` = 2 and draws it at half size, and draws live things in half pixels, so it is native too. The HUD and the catch card switch the view to native for themselves. `underwater.js` works the same way since Phase 19, and its fish are `fishgen.swimmer` canvases. Text at 640×360 uses `G.gfx.sprites.fine` (`drawText`, `bold`, `measure`, `wrap`); painted art uses `G.gfx.paint` (`area`, `tone`, `blob`, `limb`, `line`, `slab`, `box`).

- **Flow:** the scene manager holds `sailing`, `shop`, `cabin` and `gallery`. Each loop step first gives the overlays (`G.ui.menu`: pause, journal, map, tape) the step; while one is open the scene waits. `sailing.js` is the scene in play: the passive toggle, clock, unease, anomaly scheduler, owl, cast (with the creek's drift), fish school, the passive cycle, the location's scenery module, then `underwater.catchStep` (bite → hook → fight → landing → card), dog cues. The map is the way into the shop and the cabin.
- **State:** `G.state.save` is saved. `G.state.run` is never saved and holds the boat, camera, cast (with its spot boost), school, fight, hook, the active anomaly, the owl, the spots as they stand (the Red Room moves them), the scenery module's state, passive mode and so on. The boot script fishes time away (`G.ui.tape.away`) before the first frame.
- **Saves:** localStorage key `softstatic_save_v1`, save format version 4 (migrations from v1). They are stored per browser, so they do not travel with git.
- **Keys:** A/D or arrows sail, Space (or mouse) casts and reels, W/S or ↑/↓ move in menus, Enter confirms, Esc goes back, P pauses, J journal, M map, TAB passive. URL flags: `?debug`, `?seed=N`, `?gallery`, `?compact`.
- **Debug:** with `?debug`, the console has `dbg.state, hour, unease, tp, cast, lure, give(id, quick), land, spawn, dog, rod, money, buy, caught, save, wipe, sprite, fx, ui(name), travel(id), restore, anomaly(id), passive(on), away(seconds), tape(i)`.

## How to continue on another computer

1. **Clone** the repository: `git clone https://github.com/serek9/SoftStatic.git`.
2. **Install Node** (any recent LTS; developed on v26) and **Python 3** to serve the files. VS Code Live Server works too. No `npm install` is needed: there are no dependencies.
3. **Run the game:** `python3 -m http.server 5517 --bind 127.0.0.1` (on Windows, `python`), then open `http://127.0.0.1:5517/?debug`.
4. **Check that everything works:** `node tools/balance.js --validate`, `node tools/balance.js --replay 12345` (hash `2593400009`), `node tools/balance.js --pacing`, `node tools/balance.js --passive`, `node tools/balance.js --saves`. All should end with OK or PASS and exit 0 (expected output in PLAN.md §8.5).
5. **Claude Code:** open the folder and Claude will read [CLAUDE.md](CLAUDE.md). To resume, read PLAN.md §8.6 (no phase is scheduled after Phase 19; name the next one). Visual work is checked with screenshots: in a cloud session, Playwright's Chromium against the local server (`?debug&seed=N`, then `dbg.hour(h)`, `dbg.tp(x)`, `dbg.ui(name)`, `G.scene.sailing.load(id)`). Claude's memory and settings are per machine and are not in git; everything it needs is in PLAN.md, CLAUDE.md and this file.
6. **Moving a save:** saves stay in each browser (and only one tab plays a save at a time; an older tab waits until clicked). In the game, press P, choose **Export save** (it copies the save string, or shows it to copy), and on the other machine choose **Import save** and paste it (between casts). The console equivalents are `G.core.save.exportString(G.state.save)` and `G.ui.menu.importSave(s)`.

**Portability notes:** line endings are fixed to LF by `.gitattributes`, so `core.autocrlf` settings don't matter. All script paths in `index.html` match the files' case exactly, which matters on case-sensitive file systems. The code has no absolute paths. `tools/balance.js` builds paths with `path.join`.

## Pending work

**Every phase in PLAN.md §4 is done** (Milestone C), and so is the improvement audit. There are no `TODO(Px.y)` markers left in the code. So are Phases 15–19, which took the whole game to 640×360. No next phase is scheduled. Known issues are PLAN.md §8.4 (#24: the journal's first opening costs one ~90 ms frame; #25: three unused old sprites).

**Checks outside the repo:** the Phase 15–18 screenshot scripts (Playwright, in the session scratchpad), the per-phase Node scripts (Phases 1, 6, 7, 8) and the Phase 9–12 browser checks (a small headless-Brave DevTools driver in Node, plus Node checks of the shop lines, anomaly scheduler, spot value, late hints and the creek's drift; Phase 12's TAB-in-every-state, tape and two-tab checks) lived in temporary folders and are not in git. The checks that matter long-term are in `tools/balance.js`; the results of the rest are recorded in PLAN.md §8.5.

## Decisions and departures from the plan

The full, numbered list is PLAN.md §8.3 (99 entries). The ones most likely to surprise:

- **640×360 instead of 320×180** (user's decision, 2026-10-29): the sim still uses 320×180 world pixels; only drawing changed, so the replay hash and balance did not move.
- **Pixel-art rules for new art** (§8.3 #84): no `ctx.scale` of art (except the sailing scene's half-size drawing of 2× bakes), no dithering, no random speckle, 3–6 flat keys per material, light that steps with planks or logs.
- **Rusty** is an original shopkeeper in the spirit of the reference, not a copy; the shop's lines are still `data/dialogue.js`.

- **Debug overlay and red errors are page text**, not canvas text. Save export/import also uses the browser's own prompt dialog when the clipboard is unavailable.
- **No fail states:** extra state-machine exits back to `sailing` (cancel a charge, reel in early, snap, escape).
- **Save format:** `SS1.<base64>.<checksum>`, for storage and export. A corrupt save is kept under `softstatic_save_v1_corrupt` and the game starts fresh.
- **Overlays freeze the world:** while the pause menu, journal or map is open, nothing moves, including the clock.
- **The map is the hub:** the bait shop and the cabin are reached from it; M works only from the boat with no line out.
- **Shopkeeper lines are chosen without randomness;** each special line is said once per save.
- **Anomalies run only in the game, not in the balance sessions,** so the replay hash and pacing are unaffected by them. Their cooldowns live in run state and reset on reload.
- **Where a cast lands matters:** an anomaly or a spot under the landing point boosts that cast until it is reeled in.
- **Journal hints are discovered by catching** (hint lines on the first catch, bait on the second, depth and hours on the third), and late hints arrive one per new catch at unease 0.4 or more, in blue pen.
- **Trophies that face the door** are decided only on entering the cabin, from the unease of the water you came from.
- **Location costs and conditions live in each `data/loc_*.js`** (`cost`, `need`); `data/gear.js` no longer lists them.
- **Scenery modules** (`js/scene/scenery.js`, a file not in the §3 tree) draw what baked layers cannot: the Pines' signal, neon and lamps, the Red Room's moving structures and crimson reflection. Fogbound and the creek have none.
- **The Red Room's structures move after each cast lands** (seeded by that cast), each carrying a spot; the boost goes by where they stood when the lure landed.
- **Passive mode is the same cycle everywhere:** live (TAB) and time away both run `sim/passive.js` plan/apply, so they earn alike. `incomeMult` (0.6) is the only knob for the share; the wait `base` (48 s) is set so a cycle matches an active cast before it.
- **Time away moves the game clock** (it used to resume where it was saved), and on boot the tape shows what happened.
- **A phantom journal entry never counts as caught** until you really catch that fish.
- **One tab owns the save:** opening the game in a second tab (or `?compact`) makes the first one wait, so they never overwrite each other.
- **Pacing model:** it moves to each water it opens and hunts the Pines' key in the 03:33 window (task 14.5).
