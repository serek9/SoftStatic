# SoftStatic: Handoff

Where the project stands, and how to pick it up on another computer. Last updated 2026-10-28, at commit `ead0edf`.

## State in one paragraph

Phases 1 to 8 of [PLAN.md](PLAN.md) are built, checked and committed, one commit per phase. **Milestone A** (the cozy loop, Phase 7) is complete. On Fogbound Lake you sail, cast, watch the lure sink into the underwater view, get a bite, hook it, fight it, lift it out, and sell or keep it. Gear, prices, saving and the balance tool (Phase 8) are in. **Next is Phase 9 (Interface)**: HUD, pause menu, journal, shop, map, cabin. Nothing from Phase 9 has been started.

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

## Architecture

The tree follows PLAN.md §3. These files exist so far:

```
index.html           canvas, script load order (core → data → sim → gfx → scene → ui), boot
js/core/             debug.js rng.js state.js input.js save.js loop.js
data/                loc_fog.js fish.js gear.js
js/sim/              clock.js unease.js fish_ai.js bite.js fight.js economy.js   (pure; run in Node)
js/gfx/              bake.js sprites.js fx.js water.js fishgen.js
js/scene/            boat.js dog.js underwater.js sailing.js
js/ui/               hud.js card.js
tools/balance.js     --validate | --replay <seed> | --pacing
```

- **Flow:** `sailing.js` is the one scene in play. Each step it runs the clock, unease and gear effects, then the cast steps, the fish school, then `underwater.catchStep` (bite → hook → fight → landing → card). The underwater view is part of the same scene; it fades in when the lure is in the water.
- **State:** `G.state.save` is saved. `G.state.run` is never saved and holds the boat, camera, cast, school, fight, hook and so on.
- **Saves:** localStorage key `softstatic_save_v1`, save format version 2. They are stored per browser, so they do not travel with git.
- **Debug:** with `?debug`, the console has `dbg.state, hour, unease, tp, cast, lure, give(id, quick), land, spawn, dog, rod, money, buy, caught, save, wipe, sprite, fx`.

## How to continue on another computer

1. **Clone** the repository, once it is on GitHub.
2. **Install Node** (any recent LTS; developed on v26) and **Python 3** to serve the files. VS Code Live Server works too. No `npm install` is needed: there are no dependencies.
3. **Run the game:** `python3 -m http.server 5517 --bind 127.0.0.1` (on Windows, `python`), then open `http://127.0.0.1:5517/?debug`.
4. **Check that everything works:** `node tools/balance.js --validate`, `node tools/balance.js --replay 12345`, `node tools/balance.js --pacing`. All three should end with PASS or OK and exit 0.
5. **Claude Code:** open the folder and Claude will read [CLAUDE.md](CLAUDE.md). To resume, say "Start Phase 9". Claude's memory and settings are per machine and are not in git; everything it needs is in PLAN.md, CLAUDE.md and this file.
6. **Moving a save:** saves stay in each browser. In the browser console, `G.core.save.exportString(G.state.save)` gives a string. On the other machine, run `G.core.save.importString(s)` and assign `.save` (checksummed). The menu's export/import is task 9.2.

**Portability notes:** line endings are fixed to LF by `.gitattributes`, so `core.autocrlf` settings don't matter. All script paths in `index.html` match the files' case exactly, which matters on case-sensitive file systems. The code has no absolute paths. `tools/balance.js` builds paths with `path.join`.

## Pending work

**Next phases** (PLAN.md §4): 9 Interface, 10 Anomalies (Milestone B), 11 Locations 2–4, 12 Passive and the tape, 13 Audio (can run alongside from Phase 7 on), 14 Content and polish (Milestone C).

**Open `TODO(Px.y)` markers left in the code for later phases:**

| Task | Where | What |
|---|---|---|
| 9.2 | `js/core/loop.js` | P toggles pause in the loop; the pause menu takes it over |
| 9.4 | `js/sim/unease.js` | The shop sets `atShop` (unease drains there) |
| 9.5 | `js/scene/sailing.js` | Start at the saved location instead of always Fogbound |
| 10.1 | `js/sim/unease.js`, `js/core/state.js` | Anomaly scheduler and the active anomaly in run state |
| 10.3 | `js/scene/dog.js`, `data/loc_fog.js` | The dog's stare (at the hidden `reed_gap` spot) and bark |
| 11.1 | `data/gear.js` | Location unlock costs move into each location file |
| 12.2 | `js/scene/underwater.js` | Passive mode hooks automatically |
| 13.1, 13.3 | `index.html`, `js/scene/underwater.js` | Audio engine; slip sound and the heavy-fish line hum |
| 14.1 | `data/fish.js` | Full Fogbound roster (currently 4 placeholder species) |
| 14.6 | `js/core/input.js` | Touch controls |

**Stale notes** (the work is done but the comment wasn't removed; safe to delete when nearby code is next touched): `js/core/state.js` lines 25–26 (run fields now created in `sailing.load`), `js/core/debug.js` around line 123 ("the clock does not advance": it does since Phase 6), `data/loc_fog.js` `species: []` with `TODO(P6.3)` (species list their locations in `data/fish.js` instead).

**Checks outside the repo:** the per-phase Node scripts for Phases 1, 6, 7 and 8 lived in a temporary folder on the Windows machine and are not in git. The checks that matter long-term are in `tools/balance.js`. The rest can be recreated from the "done when" column of PLAN.md.

## Decisions and departures from the plan

These are interpretations made while building, each reported at the time.

- **Debug overlay and red errors are page text**, not canvas text, so they stay readable and survive a crashed loop. Errors show even without `?debug`.
- **Fishing state machine:** extra exits back to `sailing` (cancel a charge, reel in early, snapped line or escape) to keep "no fail states".
- **Save format:** saves are stored and exported as `SS1.<base64>.<checksum>`. A corrupt save is kept under `softstatic_save_v1_corrupt` and the game starts fresh.
- **Reflection:** the scene above the water is redrawn mirrored into a buffer each frame, instead of storing flipped layers. The boat gets a reflection too, and Phase 10's reflection effects (deltas) draw into that same buffer.
- **Underwater controls:** tap to stop the sinking lure at a depth; hold to reel up and in. The lure hangs straight below its entry point.
- **Window latching** happens when the lure lands (D1); a window that is open right now always counts.
- **Fish only notice baits they like.** Others still show up nearby.
- **Fish speed is in V4 fight units** (1.0–2.2). Swimming multiplies by 10 px/s.
- **The fight starts at D = 0.6.** The plan doesn't say.
- **Auto-player landing band** (7.3, not defined in the plan): skill 0.8 lands at least 90% of fish within the line's rating, and stronger fish less often but above 40%.
- **Wandering fish drift toward a nearby lure** (Phase 8), giving about one bite per cast.
- **Pacing model:** buys line, reel, rod, lantern and depth finder before the creek. Medians: first upgrade 6 catches, creek 32 min, Red Room 5.4 h. It uses the Fogbound roster for the whole run until Phases 11 and 14, so final tuning is task 14.5.
- **Autosave** also runs when the tab is hidden or closed, so the clock and unease survive a reload. A new game starts at 19:00.
- **Window catches** are recorded in `save.flags.windowCatch` and open the Red Room's condition. Task 11.3 can narrow it to a specific fish.
