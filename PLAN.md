# SoftStatic: Master Development Plan

> **FOR THE CODING AGENT:** Read **§0 Shared Conventions** first, then ONLY the task or section named in your assignment. Implement nothing that is not named in the task.

**Status:** Plan final and approved. **Phases 1–14 are done (Milestones A, B and C reached),** together with the improvement audit and Phase 15, visual detail (see §8). Each phase starts only after explicit authorization. Progress, architecture as built, decisions, known issues and the exact next task are in **§8 Project Status**, which is updated at the end of every phase.

---

## Contents
- §0 Shared Conventions (required for every task)
- §1 Design Pillars
- §2 Liminal Mechanics Map
- §3 Architecture
- §4 Phases and Tasks
- §5 Technical Risks
- §6 Verification
- §7 Task Template
- §8 Project Status (living: progress, architecture as built, decisions, known issues, next task)
- Appendix V: Game Vision Spec (V1–V13)
- Decision Log

---

## Decision Log

| # | Decision |
|---|---|
| D1 | Clock events use forgiving windows, and a cast whose lure lands inside a window keeps its eligibility (§0.8). |
| D2 | Permanent dusk. Time changes gameplay, events, fog and ambience, never into bright daylight. |
| D3 | Save key is `softstatic_save_v1`. |
| D4 | Fish heavier than the rod allows stay out of the bite pool. They show up through hints inside the world, never UI warnings. |
| D5 | One `passive.incomeMult` in `data/gear.js`, checked by `tools/balance.js`. |
| D6 | The underwater camera follows the lure and is clamped to each location's `maxDepth`. |
| D7 | New files approved: `js/sim/clock.js`, `js/sim/unease.js`, `js/ui/cabin.js`, `js/ui/tape.js`. |
| D8 | §0 (shared conventions) is required for every coding task. |
| D9 | Liminal elements are fishing mechanics (§2); cozy guardrails apply (§1). |

---

## §0 Shared Conventions (every task reads this section first)

**0.1 Scope.** Implement only what the task names. Touch only the files the task lists. If something outside the task is missing, add a `// TODO(Px.y)` stub and report it; don't build it.

**0.2 Stack.** Plain `<script>` tags with one global, `G`. No libraries, no build step, no external assets. Runs under Live Server.

**0.3 File header and namespaces.** Every JS file starts with:
```js
var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});
```
Then it attaches to exactly one namespace: `G.core`, `G.gfx`, `G.sim`, `G.scene`, `G.ui`, `G.audio` or `G.data`.

**0.4 Load order** (fixed in `index.html`): core → data → sim → gfx → scene → ui → audio → boot.

**0.5 Simulation rules** (`js/sim/*` and `data/*`):
- The signature is `step(state, input, dt, rng, data)`. It changes only the state passed in and returns nothing, or a small number.
- No `window`, `document`, `Math.random`, `Date`, `performance` or canvas.
- dt is always the fixed 1/60.
- These files must run unchanged in Node through `vm`.

**0.6 Randomness.** `G.rng` is for simulation only. `G.vrng` is for visuals only. Never cross them. Seed with `?seed=N`.

**0.7 Draw and update.** `update(dt)` never touches `ctx`. `draw(ctx)` never changes state. A scene implements `{enter(prev), exit(next), update(dt), draw(ctx)}`.

**0.8 Time.**
- The game clock runs from 0 to 24. One real minute is one game hour, so a full day is 24 real minutes.
- Hours 07:00–17:00 are "grey hours": unease falls, fog thickens, some species prefer them. Everything else is night.
- Clock windows live in data: `{id, from, to}` in game hours, at least 30 game minutes wide.
  - `owl_247`: 2:30–3:10. The owl cries at 2:47.
  - `owl_333`: 3:20–4:00. The owl cries at 3:33.
- A lure that lands inside a window stays eligible for that window's fish until it is reeled in.
- Note: 15 game minutes is only 15 real seconds, so wider windows plus latching are required to keep these forgiving.

**0.9 Visual rules.**
- Internal canvas 320×180, pixelated.
- One master palette in `gfx/sprites.js`; sprites name colour keys, never hex values.
- The sky ramps only between `dusk_amber` and `night_ink`. No colour brighter than the `dusk_high` key is allowed in sky or water.
- All text uses the baked bitmap font, never `fillText`.

**0.10 Units.** World pixels. Depth in metres is `px × 0.25`. Time in seconds. Mass in kg.

**0.11 Performance.**
- No allocations in hot paths; use preallocated pools.
- Layers and sprites are baked; per-frame drawing is `drawImage`.
- At most 8 fish alive and 1 active anomaly.

**0.12 Save.**
- Key `softstatic_save_v1`, with a `version` field and a `migrate()` chain.
- Autosave on catch, purchase and location change.
- `G.state.save` is saved. `G.state.run` is never saved.

**0.13 Debug.**
- Every feature adds its `dbg.*` hooks and an overlay line.
- "Done" means a `dbg` or Node check passes, never "I fished for a while."

**0.14 Tone guardrails.** Treat any of these as a bug:
- no jumpscares, chases or fail states
- never blocking input or taking control
- never harming or threatening the dog
- no sudden loud sound (the master limiter stays on)
- anomalies are always quiet, short and optional

---

## §1 Design Pillars

1. **Cozy foundation.** Casting, waiting, the tension fight, the journal, the shop and the cabin should feel complete and calm with every liminal element switched off. Phase 7 (Milestone A) proves this.
2. **The uncanny is the fishing.** Every strange thing tells the player something useful about fish: where, when, what bait, or how rare. Noticing it is the skill. Ignoring it costs nothing.
3. **Calm surface, wrong depths.** Strangeness rises with depth, night, stillness and patience (unease), never with danger.
4. **Patience pays.** Unease is the reward axis. Passive play and the tape are where the strangest catches show up.

---

## §2 Liminal Mechanics Map

Each element has a fishing job, a module that owns its logic, and a phase.

| Element | What it does for fishing | Logic lives in | Phase |
|---|---|---|---|
| **Unease** (per location, 0 to 1) | Opens rarer and stranger species, raises how likely anomalies are, and shifts weights toward fish with higher wrongness | `sim/unease.js` → `fish_ai.speciesWeights` | 6 |
| **Clock windows** (2:47, 3:33) | Window-only species; the Red Room unlock catch; owl cry as the cue | `sim/clock.js`, `data/fish.js timeLikes` | 6 |
| **Heavy-fish hints** (D4) | A large shadow passes below the lure, the line hums once, the dog looks down, the journal margin reads "something heavier circles here": a sign to upgrade the rod | `fish_ai` flag `tooHeavyNear` → presentation | 7 |
| **Catch-card lines** | Cryptic text carries real hints about bait, hour or depth | `data/fish.js desc` and `hintRefs` | 7 |
| **Dog** | Points when a fish with high interest is near; stares once per location at a hidden spot that is real and productive; barks toward legendary spots | `sim/fish_ai` interest query, `data/loc_*.spots` | 7, 10 |
| **Reflection deltas** | The reflection shows what the shore lacks; casting under the extra pier or the lit window raises the rare weight for that cast | `sim/unease.js` anomaly with `spotBoost` | 10 |
| **Moving structures** (Red Room) | Spot positions are reseeded each cast; following the moved structure finds the active spot | `data/loc_red.js`, seed for each cast | 11 |
| **Shopkeeper** | Non sequiturs that turn out to be hints; the unlabelled shelf item is a real rare bait | `data/dialogue.js`, `data/gear.js` | 9 |
| **Journal handwriting** | Degrades with unease; pages that gain text later add true hints you didn't discover | `ui/journal.js` (draws), `sim/unease.js` (decides) | 9, 10 |
| **The tape** | Missing time ranges, `???` catches, phantom entries in your handwriting. A phantom points to a species you can actually catch, and catching it makes the entry real | `sim/passive.js`, `ui/tape.js` | 12 |
| **Cabin trophies** | Face the door when you re-enter; how many turn tracks unease (an ambient signal) | `ui/cabin.js` on `enter()` only | 9, 10 |
| **Set pieces** (traffic light, diner, parking lot, fluorescent hum) | Landmarks for remembering spots; the traffic light's blink rate follows the clock window | `data/loc_*.js` | 3, 11 |

**Anomaly data** (`data/anomalies.js`):
```
{id, locations, uneaseMin, hours, cooldown, kind, params, effect?}
```
`effect` can be `spotBoost`, `revealHint` or `none`.

---

## §3 Architecture

```
index.html
js/core/   loop.js state.js input.js rng.js save.js debug.js
js/gfx/    sprites.js bake.js water.js fx.js fishgen.js
js/sim/    clock.js unease.js fish_ai.js bite.js fight.js passive.js economy.js   (pure, no DOM)
js/scene/  boat.js dog.js sailing.js underwater.js
js/ui/     hud.js card.js journal.js shop.js map.js menu.js cabin.js tape.js
js/audio/  engine.js
data/      fish.js gear.js anomalies.js dialogue.js loc_fog.js loc_creek.js loc_pines.js loc_red.js
tools/     balance.js   (--validate, --pacing, --replay)
```

**How data moves:**
```
input → scene.update → G.sim.*.step(state, input, dt, G.rng, G.data) → state
                                                                       │
                     scene.draw(ctx) ← reads state (+ G.vrng for visual effects)
passive.js / balance.js → the same sim functions, with no rendering
```

**Game state:**
- `G.state.save`: coins, gear owned and equipped, baits, journal (per species: `caught, bestLen, bestW, hints, seen, phantom`), kept fish, cabin level, unlocks, unease per location, clock, `lastSeen`, flags (dog stares, special shopkeeper lines, anomalies seen), last 3 tapes, settings, RNG state.
- `G.state.run`: camera, live fish, fight, current FSM state, active anomaly, the cast's seed and latched windows.

**Fishing state machine:**
`sailing → charging → casting → sinking → waiting → interest → hooked → fighting → landing → card → sailing`.
The transition table is enforced, and in debug mode refused transitions are logged.

**How the sim is split:**

| Module | Pure core | Used by |
|---|---|---|
| `clock.js` | hour advance, grey/night flag, window membership, latching for each cast | everything |
| `unease.js` | unease rise and fall per location, anomaly eligibility and scheduling | active, passive |
| `fish_ai.js` | `speciesWeights(ctx)`, `pickSpecies(ctx, rng)`, `stepFish(fish, lure, dt, rng)` | active play (all of it), passive (weights only) |
| `bite.js` | the window from bite to hook, the "may return once" rule | active, passive (auto-hook) |
| `fight.js` | the tension model (V4), `autoPlayer(state, skill, rng)` | active, passive, balance |
| `economy.js` | price, `sizeFactor`, gear effects, unlock checks | everything |
| `passive.js` | `cycle(state, rng)`, `offline(elapsed, rng)` | passive mode, load, balance |

**Rendering order:** sky → far layers → water and reflection (with deltas) → near layers → boat and dog → underwater cross-section → effects → HUD → modal UI.

---

## §4 Phases and Tasks

**Dependencies:**
```
1 Foundation → 2 Gfx core → 3 Sailing → 4 Cast → 5 Underwater → 6 Fish+Clock+Unease
→ 7 Bite/Fight/Landing ★A cozy slice → 8 Economy/Save/Balance → 9 UI
→ 10 Anomalies ★B liminal slice → 11 Locations 2–4 → 12 Passive/Tape → 14 Content & polish ★C
13 Audio runs in parallel from Phase 7.
```

### Phase 1: Foundation
| ID | Task | Files | Done when |
|---|---|---|---|
| 1.1 | Canvas, pixelated scaling with preserved aspect, script load order, boot stub | index.html | No blur; resizes correctly |
| 1.2 | Fixed-timestep loop with accumulator, frame-time cap, pause | js/core/loop.js | Steady update rate; switching tabs causes no spiral |
| 1.3 | mulberry32 as `G.rng` and `G.vrng`; `?seed`; `range/pick/weighted`; state that can be saved | js/core/rng.js | Same seed gives the same sequence in browser and Node |
| 1.4 | Input mapped to abstract actions (`move`, `action` held/pressed/released, `pause/journal/map/passive`) | js/core/input.js | The overlay shows live action states |
| 1.5 | Scene manager plus FSM table | js/core/state.js | `dbg.state()` accepts legal transitions and refuses illegal ones |
| 1.6 | `?debug` overlay, errors shown on screen in red, `dbg` API stubs | js/core/debug.js | A thrown error shows; every `dbg.*` exists |
| 1.7 | Save skeleton: `softstatic_save_v1`, version, migrations, export/import, corruption fallback | js/core/save.js | Round trip is identical; a bad string is refused safely |

### Phase 2: Graphics Core
| ID | Task | Files | Done when |
|---|---|---|---|
| 2.1 | Sprite DSL plus master palette (with the dusk ceiling from §0.9) | js/gfx/sprites.js | Test sprite is pixel-exact |
| 2.2 | Baked bitmap font, `drawText` and `measure`, plus a "handwriting" jitter parameter | js/gfx/sprites.js | All printable ASCII renders; jitter is deterministic |
| 2.3 | Bake utilities: offscreen factory, wide layers, flipped copy, lazy cache | js/gfx/bake.js | A 1200-px layer bakes in under 50 ms |
| 2.4 | Pooled particles (splash, wake, bubbles, dust) | js/gfx/fx.js | 200 particles; no allocation growth |
| 2.5 | `?gallery` debug page listing sprites | js/core/debug.js | Every sprite is viewable |

### Phase 3: Sailing (Fogbound Lake)
| ID | Task | Files | Done when |
|---|---|---|---|
| 3.1 | Location loader plus `loc_fog.js` (layers, landmarks, spots, `maxDepth`, species pool) | data/loc_fog.js, js/scene/sailing.js | `dbg.tp(x)`; landmarks sit where the data says |
| 3.2 | Parallax plus camera follow with clamping and smoothing | js/scene/sailing.js | No jitter at the edges |
| 3.3 | Boat physics: acceleration, drag, drift, bob; "nearly stopped" flag | js/scene/boat.js | Velocity on the overlay; flag switches at the threshold |
| 3.4 | Water line plus reflection (alpha 0.35, darker with depth, 1–2 px sine row shift), with a slot for deltas | js/gfx/water.js | Under 2 ms; lines up with the shore |
| 3.5 | Wake plus ripples | js/gfx/fx.js | Fades out; pooled |
| 3.6 | Dog sprite and poses (`idle/alert/point/look_down/stare/bark`) | js/scene/dog.js | `dbg` switches every pose |
| 3.7 | Sky ramp driven by the clock (dusk to night only) | js/scene/sailing.js | `dbg.hour(0..24)` never gets brighter than the ceiling |

### Phase 4: Cast
| ID | Task | Files | Done when |
|---|---|---|---|
| 4.1 | Forgiving charge, faint landing marker, rod bend | js/scene/sailing.js, js/scene/boat.js | A 30% charge still casts usefully |
| 4.2 | Parabola from the rod tip that lands exactly on the waterline; a seed for each cast is recorded | js/scene/sailing.js | Landing matches the marker within 1 px |
| 4.3 | Splash plus elliptical ripples | js/gfx/fx.js | Visual check |

### Phase 5: Underwater View
| ID | Task | Files | Done when |
|---|---|---|---|
| 5.1 | Transition into the cross-section; boat stays above the surface | js/scene/underwater.js | No pop over 10 casts |
| 5.2 | Baked gradient, bottom and weeds per location; light shafts and particles | js/scene/underwater.js | 60 fps |
| 5.3 | Vertical camera follows the lure, clamped to `maxDepth` (D6) | js/scene/underwater.js | Lure at maximum depth stays on screen |
| 5.4 | Dotted line, lure sinks then sways, depth readout | js/scene/underwater.js, js/ui/hud.js | Readout equals px × 0.25 |

### Phase 6: Fish, Clock, Unease (the liminal core starts here)
| ID | Task | Files | Done when |
|---|---|---|---|
| 6.1 | `sim/clock.js`: advance the hour, grey/night flag, window membership, latching for each cast | js/sim/clock.js | Node: window rules and latch tests |
| 6.2 | `sim/unease.js`: rises with night and stillness, falls in grey hours and at the shop, value per location | js/sim/unease.js | Node: curves over a simulated night |
| 6.3 | Fish schema (V5) plus 4 placeholder Fogbound species (1 window-only, 1 needing high unease) | data/fish.js | Validator passes |
| 6.4 | `speciesWeights` and `pickSpecies`: rarity × bait × depth × hour × unease × window; rod mass filter that sets `tooHeavyNear` (D4) | js/sim/fish_ai.js | Node: rarity shares within ±2%; heavy fish never picked |
| 6.5 | Fish generator: 8 base bodies drawn by hand plus seeded variation | js/gfx/fishgen.js | Each base recognisable; deterministic |
| 6.6 | Part catalog (15 parts), wrongness 0 to 3, asymmetry, shimmer frame | js/gfx/fishgen.js | Gallery: every part on every base |
| 6.7 | Spatial AI: wander → notice → approach → inspect → nibble → bite or leave; cap of 8 | js/sim/fish_ai.js | `?seed` replay matches; states on the overlay |
| 6.8 | Fish presentation: twitching, uneven fins, reversing swim; silhouettes; wrong movement scales with wrongness | js/scene/underwater.js | Reads AI state only |

### Phase 7: Bite, Fight, Landing ★ Milestone A (cozy slice: one lake, 4 fish, the full loop, liminal elements optional)
| ID | Task | Files | Done when |
|---|---|---|---|
| 7.1 | Bite cue (line dip, rod bob), 2 s hook window, a missed fish may return once | js/sim/bite.js, js/scene/underwater.js | `dbg.give` forces a bite |
| 7.2 | Fight sim exactly as in V4, including the slip and the gentle escape | js/sim/fight.js | Node test for each rule |
| 7.3 | Auto-player with a skill parameter | js/sim/fight.js | Node: landing rate at skill 0.8 within the expected band |
| 7.4 | Fight presentation: thrash vs drift, rod bend, line straight vs sagging, tension tint | js/scene/underwater.js, js/ui/hud.js | Both modes readable at 1× |
| 7.5 | Landing lift plus catch card (stats, NEW, record, SELL/KEEP, cryptic line carrying `hintRefs`) | js/ui/card.js, js/scene/underwater.js | `dbg.give(id)` gives a correct card |
| 7.6 | Dog points at high interest; `look_down` when `tooHeavyNear` | js/scene/dog.js | Fires only above the thresholds |
| 7.7 | Heavy-fish hints in the world: large shadow, one line hum, dog looks down (no UI) | js/scene/underwater.js | Triggered by `tooHeavyNear` only |

### Phase 8: Economy, Save, Balance
| ID | Task | Files | Done when |
|---|---|---|---|
| 8.1 | `data/gear.js`: 5 tiers each of rod, reel and line; baits (including the unlabelled bait); lantern; depth finder; fight constants; `passive.incomeMult` (D5) | data/gear.js | Every item has a mechanical effect |
| 8.2 | Economy functions: price, `sizeFactor`, gear effects, unlock checks | js/sim/economy.js | Node checks against hand-computed values |
| 8.3 | Save integration plus autosave; journal records; window and unease state | js/core/save.js | Reload restores everything |
| 8.4 | `balance.js --pacing`: model of an active player, coin curves, upgrade and unlock times | tools/balance.js | Meets the V8 pacing targets |
| 8.5 | `balance.js --validate` (schema, roster counts, parts, depth ≤ `maxDepth`, banned globals) and `--replay` | tools/balance.js | Fails loudly on bad data; replay is identical |

### Phase 9: Interface
| ID | Task | Files | Done when |
|---|---|---|---|
| 9.1 | HUD: coins, clock, depth, bait; small | js/ui/hud.js | Readable at 1× |
| 9.2 | Menu, pause, settings (volume, mute, export/import) | js/ui/menu.js | P pauses; import restores |
| 9.3 | Journal: grid, silhouettes, details, discovered hints, filters, handwriting jitter driven by unease | js/ui/journal.js | `dbg.unease(1)` degrades the writing |
| 9.4 | Shop scene, shelves, grid, purchases; shopkeeper dialogue (lines that act as hints, the repeated line, the reversed line) | js/ui/shop.js, data/dialogue.js | Each special line shows once per save |
| 9.5 | Map and travel, costs, locks | js/ui/map.js | Travel bakes the new location without a hitch |
| 9.6 | Cabin: restoration stages, mounted trophies, turning toward the door decided in `enter()` | js/ui/cabin.js | State persists; trophies never change while visible |

### Phase 10: Anomalies ★ Milestone B (liminal slice on Fogbound)
| ID | Task | Files | Done when |
|---|---|---|---|
| 10.1 | Anomaly scheduler: eligibility, cooldowns, at most 1 active, effects (`spotBoost`, `revealHint`) | js/sim/unease.js, data/anomalies.js | Forced anomalies end on their own; never block input |
| 10.2 | Reflection deltas (figure, lit window, extra pier, boat with no fisher) linked to `spotBoost` | js/gfx/water.js | Drawn only in the reflection pass |
| 10.3 | Dog stare (once per location, at a real hidden spot) and bark toward legendary spots | js/scene/dog.js, data/loc_fog.js | Flags persist; the spot really is productive |
| 10.4 | Owl cry plus window-only bites, end to end | js/sim/clock.js, js/scene/* | Passes with `dbg.hour(2.75)` |
| 10.5 | Journal pages that gain true hints after you leave them | js/ui/journal.js, js/sim/unease.js | Deterministic trigger |

### Phase 11: Locations 2–4
| ID | Task | Files | Done when |
|---|---|---|---|
| 11.1 | Blackwater Creek: cabins, branches, current drift of the lure (simulated) | data/loc_creek.js | Drift is deterministic |
| 11.2 | The Pines: traffic light (blink rate follows windows), owl, diner neon, parking lot, fluorescent hum | data/loc_pines.js | Blinks follow `dbg.hour` |
| 11.3 | Red Room: curtains, zigzag shore, crimson reflection, spot positions reseeded each cast; unlock (window catch plus about 6000 coins) | data/loc_red.js | Unlock passes via `dbg` |
| 11.4 | Scenery module hook; the same pier appearing in two lakes | js/scene/sailing.js | Locations without a module still work |

### Phase 12: Passive and the Tape
| ID | Task | Files | Done when |
|---|---|---|---|
| 12.1 | `passive.cycle`: wait time, `pickSpecies`, auto-fight, `incomeMult`, journal, clock and unease advance | js/sim/passive.js | Node: 60% ±5% of active income |
| 12.2 | Live passive mode: TAB and a button, switches cleanly from any state | js/scene/sailing.js | TAB works in every state |
| 12.3 | Offline: cap 8 h, up to 200 cycles, seeded | js/sim/passive.js | Same input gives the same result |
| 12.4 | Tape screen: VHS look, timestamps, missing ranges, `???`, phantom entries with the `phantom` flag | js/ui/tape.js | Completion counts stay honest; catching the fish makes the phantom real |
| 12.5 | `?compact` 160×90 view, no HUD | index.html, js/core/loop.js | Works next to a normal tab |

### Phase 13: Audio (in parallel, from Phase 7)
| ID | Task | Files | Done when |
|---|---|---|---|
| 13.1 | Engine: unlock on first input, buses, limiter, mute and volume | js/audio/engine.js | No autoplay warnings |
| 13.2 | Ambient: drone, wind and water noise, clanks, foghorn; grey hours vs night | js/audio/engine.js | Changes with `dbg.hour` |
| 13.3 | Effects: splash, reel clicks, tension tone, slip sound, rare-catch sting, owl cry | js/audio/engine.js | Driven by state |
| 13.4 | Pines jazz chords that detune with unease; radio static on travel | js/audio/engine.js | `dbg.unease(1)` detunes |

### Phase 14: Content and Polish ★ Milestone C
| ID | Task | Files | Done when |
|---|---|---|---|
| 14.1 | Fogbound full roster (4 common, 3 uncommon, 1 rare, 1 legendary) with hint lines and gates | data/fish.js | Validator: 9 species for `fog` |
| 14.2 | Blackwater full roster | data/fish.js | Validator: 9 species for `creek` |
| 14.3 | Pines full roster | data/fish.js | Validator: 9 species for `pines` |
| 14.4 | Red Room full roster | data/fish.js | Validator: 9 species for `red`; 36 in total |
| 14.5 | Final balance | data/*.js | `--pacing` meets every target |
| 14.6 | Touch controls plus on-screen buttons for TAB, J and M | js/core/input.js | Playable on a phone in landscape |
| 14.7 | Performance audit (8 fish plus an anomaly plus reflection) | — | 60 fps on the reference laptop |
| 14.8 | Save migration tests from each milestone | js/core/save.js | Old saves load |

---

## §5 Technical Risks

| Risk | Mitigation |
|---|---|
| Sim files running in Node | Header from §0.3; load with `vm`; a lint check in `--validate` for banned globals in `sim` and `data` |
| Determinism drift | Separate `G.rng`/`G.vrng`; fixed dt; seed for each cast; `--replay` |
| Online and offline passive drifting apart | Offline is only a loop over `passive.cycle` |
| Short clock windows | Windows at least 30 game minutes plus lure latching (§0.8) |
| Anomalies that read as bugs | Cooldowns; at most 1; debug log names each one; every anomaly has a fishing effect, so it reads as intended |
| Phantom journal entries | `phantom` flag; excluded from completion until actually caught |
| Reflection cost | Draw only visible columns; measure in task 3.4 |
| Bake time at boot | Current location and fish sprites only; journal and shop art lazily |
| Generator output looking like blobs | Bodies drawn by hand; the generator only adds parts; gallery from Phase 2 |
| Readability at 320×180 | Rod bend and line sag carry the meaning; tint is secondary; tested at 1× |
| Save growth | Keep 3 tapes; kept fish store id, length and weight only |

---

## §6 Verification
- Every task: a `dbg` or Node check from its "Done when" column.
- `node tools/balance.js --validate | --pacing | --replay <seed>`.
- `?gallery` for fish generator output and sprites.
- **Milestone A:** the cozy loop is complete with anomalies off.
- **Milestone B:** every element in §2 is active on Fogbound.
- **Milestone C:** full content, performance and balance.

---

## §7 Task Template for the Coding Agent
```
Read: §0 Shared Conventions, then §4 Task <ID> only (plus any Appendix V section it cites).
Files you may touch: <list>.
Do: <one paragraph>.
Done when: <check>.
Report: what changed, the dbg/Node check output, any TODO stubs left.
```

---

## §8 Project Status

> The only living part of this plan: §0–§7 and Appendix V are the approved spec and do not change. Update this section at the end of every phase: the table in 8.1, anything new in 8.3 and 8.4, the baselines in 8.5, and the next task in 8.6.

**Last updated:** 2026-11-17, after 144 Tips take turns. **Repository:** github.com/serek9/SoftStatic, branch `main`. Setup and moving saves: [HANDOFF.md](HANDOFF.md). Working rules: [CLAUDE.md](CLAUDE.md).

### 8.1 Phases

| Phase | Status | Commit | Notes |
|---|---|---|---|
| 1 Foundation | Done | `2f90f2b` |  |
| 2 Graphics core | Done | `c147075` |  |
| 3 Sailing (Fogbound) | Done | `16901ad` |  |
| 4 Cast | Done | `f04a040` |  |
| 5 Underwater view | Done | `cd1aece` |  |
| 6 Fish, clock, unease | Done | `87206cb` | 4 placeholder species; the full roster is task 14.1 |
| 7 Bite, fight, landing | Done | `1b6ab97` | **Milestone A reached** |
| 8 Economy, save, balance | Done | `855d35a`, `ead0edf` | `tools/balance.js` in place |
| 9 Interface | Done | ✓ | HUD, pause menu, journal, shop, map, cabin; save v3 |
| 10 Anomalies | Done | `b041d97` | **Milestone B reached** (see 8.3 #33 for which §2 elements are live); save v4 |
| 11 Locations 2–4 | Done | `5c9b3c8` | Creek (current), Pines (set pieces), Red Room (moving structures, unlock), scenery hook, the shared pier. |
| 12 Passive and the tape | Done | ✓ | `sim/passive.js` (61.6% of active income), live mode on TAB, time away, the tape with phantoms, `?compact`, one tab owns the save |
| Audit batch 1: Atmosphere | Done | `Audit batch 1: Atmosphere` | From the improvement audit (built, file removed) (approved by the user 2026-10-29): sky, fog and mist, water light, visible gear, the map gate for unstocked waters, the creek… |
| 13 Audio (audit batch 2) | Done | `Audit batch 2: Audio` | 13.1–13.4 in `js/audio/engine.js`, with the audit's P0-1 cues (bite, run, drag, reel, tension) |
| Audit batch 3: Feel | Done | `Audit batch 3: Feel` | P1-4 feedback, P1-6 petting the dog, P1-7 the HUD fades when idle |
| Audit batch 5: Life (P2) | Done | `Audit batch 5: Life` | P2-1 ambient life, P2-2 passive presentation, P2-3 underwater |
| Audit batch 6: Polish (P3) | Done | `Audit batch 6: Polish` | P3-1 drizzle, P3-2 still mode, P3-4 the 8.4 minors. |
| 14 Content and polish | Done | ✓ | **Milestone C reached.** 36 species, final balance, touch, performance, save migrations |
| 15 Visual detail | Done | ✓ | tasks 15.1–15.6 in 8.3 #74–80 |
| 16 The bait shop's look | Done | ✓ | 8.3 #81. Superseded by Phase 17 |
| 17 640×360: base, shop, journal, cabin | Done | ✓ | the whole game moves to 640×360 in three phases, this one first. 8.3 #82–87 |
| 17b Rusty's shop | Done | ✓ | The user asked (2026-10-29) for the shop to follow a reference shop screenshot closely, with an old Rusty, worn down to the game's mood: 8.3 #88 |
| 18 The waters at 640×360 | Done | ✓ | On the user's go-ahead (2026-10-29): 8.3 #89–94 |
| 19 The underwater view at 640×360 | Done | ✓ | On the user's go-ahead (2026-10-29): 8.3 #95–99. The whole game now draws at 640×360 |
| 20 Living water surface | Done | ✓ | First of the realism phases in [PLAN_REALISM.md](PLAN_REALISM.md), approved with deviations R1–R5 on 2026-10-29: 8.3 #100–105 |
| 21 The line as a rope | Done | ✓ | On the user's go-ahead (2026-10-29): 8.3 #106–110 |
| 22 Current and the lure | Done | ✓ | The user asked for all remaining phases, each merged by PR (2026-10-29): 8.3 #111–115 |
| 23 A fight you can lose | Done | ✓ | V4 change (R2); the sim changed, baselines re-recorded in 8.5: 8.3 #116–121 |
| 24 The boat under way | Done | ✓ | Presentation only: 8.3 #122–126 |
| 25 The sounds of fishing | Done | ✓ | Presentation only: 8.3 #127–132. The last realism phase |
| 26 Revisiting three choices | Done | ✓ | a simulated wake, the motor before the boat, every lake cast drifting. 8.3 #133–135 (#124 and #125 in part superseded) |
| 27 The swimming body | Done | ✓ | 8.3 #136–140 |
| 28 Swimming that steers | Done | ✓ | Started by the user on 2026-10-30. Changes `js/sim/fish_ai.js`, so the replay hash and pacing medians moved (8.3 #141–145) |
| 29 The hooked fish swims | Done | ✓ | 8.3 #146–149 |
| 30 Shoals and reactions | Done | ✓ | Presentation only: 8.3 #150–152. The last fish-swimming phase |
| 31 The rod as a tapered blank | Done | ✓ | preparing the lure, opening a beer), planned in [PLAN_ROD.md](PLAN_ROD.md) (Phases 31–35). |
| 31b The rod and the line made real | Done | ✓ | The user saw the rod bend both ways under tension (2026-10-30) and asked for tests and the most real rod and line possible, on a bite and while waiting. |
| 32 The rod in motion | Done | ✓ | Started by the user on 2026-10-30. Hands that move like hands, the cast's load and whip from inertia, head shakes as impulses, the reel's handle and bail; `--rod` gains the cast. |
| 33 The fisher's hands | Done | ✓ | The user asked (2026-10-30) for Phases 33–35 in turn, then a bait-shop plan. |
| 34 Preparing the lure | Done | ✓ | The lure hangs from the tip between casts; the act of letting it down to his face, baiting it and reeling it up; its sounds. |
| 35 Opening a beer | Done | ✓ | A cooler; the beer, its sips and the empty; the thermos by day; the can's sounds. |
| 36 The room and the walk | Done | ✓ | The user asked (2026-10-30) for the bait shop to become a smaller room you walk into, like a building interior in a retro top-down handheld RPG, in the lake's look; planned in [PLAN_SHOP.md](PLAN_SHOP.md) (Phases… |
| 37 Rusty and the text box | Done | ✓ | Rusty top-down; the retro-RPG text box; Buy, Talk, Leave; the item window. |
| 38 Shelves you face | Done | ✓ | Each shelf opens its own items; the rack, the equipment shelf, the tank and the crate show what is left. 8.3 #198–200 |
| 39 Light, life and the strange | Done | ✓ | The lake at the hour in the windows; the lamp's pools at night; dust, bubbles, steam, the clock; three quiet strange things with unease; the shop's sounds. 8.3 #201–205 |
| 40 Fitting it in | Done | ✓ | Touch in the room, `dbg.shopWalk`, a gallery page, the last cleanup, the frame's cost. 8.3 #206–208. The last bait-shop phase |
| 41 Stowing the rod and taking the tiller | Done | ✓ | The user asked (2026-10-30) for a plan for tackle, company and a living lake ([PLAN_TACKLE.md](PLAN_TACKLE.md), Phases 41–50), answered its questions and asked to start. |
| 42 The dog's voice | Done | ✓ | A synthesised woof; idle bouts every 3–8 min and reactions (a jump near the boat, a big catch, the shop's bell), never during a bite or the hook-set; the legendary cue heard too; *Dog barks* on/off… |
| 43 Rods you choose and lures you choose | Done | ✓ | The first phase of the plan that changes the simulation. |
| 44 Smaller fish | Done | ✓ | Started by the user on 2026-10-30. Changes the simulation: ten small species (3–10 cm) in the shallows, two or three to a water; a size curve inside every species (small ones common, big ones rare)… |
| 45 The setup panel (S) | Done | ✓ | Started by the user on 2026-10-30 ("read HANDOFF.md and continue with the next phase"). |
| 46 Small menus | Done | ✓ | Started by the user on 2026-10-30, before 45 as the plan orders them. |
| 47 Choosing the fisher and the dog | Done | ✓ | Started by the user on 2026-10-30. `data/looks.js`: four fishers (the same figure in other colours and hats: Red cap, Knit hat, Rain hat, Headlamp) and four dogs (Golden, Husky, St. Bernard, Poodle)… |
| 48 Life under water | Done | ✓ | Started by the user on 2026-10-30. `js/scene/life.js`: crayfish that walk and back off tail first from a splash or the lure, snails on the boulders, fry clouds by the weed and tadpoles near the shore… |
| 49 Life above the water and a richer background | Done | ✓ | Started by the user on 2026-10-30. In `js/scene/life.js`: a hen and her young that paddle off, slip past behind the boat and dive (seen under water), a heron that stalks the shallows and strikes… |
| 50 Fitting it in | Done | ✓ | Started by the user on 2026-10-30. Six gallery pages (`tackle`, `setup`, `life under`, `bed`, `life above`, `shore`) so every sprite of Phases 41–49 is on one; `dbg.tackle(rod, hook)` and… |
| 51 Letting a fish go | Done | ✓ | no coins, nothing kept, the journal counts it (`released`); the fisher swings the fish back and out and it arcs into the water with a splash and slips away. 8.3 #274–276 |
| 52 No passive income | Done | ✓ | `js/sim/passive.js` and `js/ui/tape.js` deleted, `gear.passive.incomeMult` and `fight.holdPassive` removed. |
| 53 Kinds of line | Done | ✓ | 8.3 #280–285 |
| 54 One look for every menu | Done | ✓ | 8.3 #286–289 |
| 55 Thunderstorms | Done | ✓ | a darker sky whose clouds hide the moon and stars, heavy slanting rain, rougher water, soft lightning flashes with bolts far off behind the hills (mirrored in the water, seen through the shop's… |
| 56 The shop and the cabin, lofi | Done | ✓ | the tackle shop with more detail, rusty and lofi, the fisher and the dog in real shapes; the cabin the same idea as the shop (a room you walk into), cozy, full of details and instruments, at the… |
| 57 The page on a phone | Done | ✓ | touch mode, a fit that fills a phone's safe area (the PC fit unchanged), no zoom or selection, full screen and a landscape lock on the first tap, a home-screen manifest, a portrait notice over the… |
| 58 Thumb controls | Done | ✓ | Started by the user on 2026-11-01 ("continue with phase 58"). |
| 59 Every key by touch | Done | ✓ | Started by the user on 2026-11-01 ("Start Phase 59"). |
| 60 Fitting it in | Done | ✓ | Started by the user on 2026-11-01 ("Start phase 60"). |
| 61 The phone plan's known issues | Done | ✓ | the on-screen ESC covered open panels (#38). #34, playing on a real phone, is the user's. |
| 62 The older known issues | Done | ✓ | 8.3 #329–332 |
| 63 The dog to scale | Done | ✓ | 8.3 #333–334 |
| 64 Rooms that are lived in | Done | ✓ | The cabin: a lava lamp on a side table by the chair, a late-90s grey console on the floor before the TV with its pad on a cable (the TV boots it, then plays a jittering low-polygon fishing game), a… |
| 65 Lures that move like lures | Done | ✓ | The retrieve draws the lure along the line toward the rod tip with the reel's inertia, each lure with its own action, and a paused sinking lure swings back on a tight line; two new lures, the Bobber… |
| 66 The chart | Done | ✓ | The map gains relief (hachures, a contour round each lake and a depth contour in it), each lake's deepest sounding, rivers between the waters, the shore road with its bridge, the pier on Fogbound's… |
| 67 The pier at the edge | Done | ✓ | Fogbound's pier stands at the lake's west end (x 96) with a signpost (BAIT SHOP, CABIN); the boat starts beside it. |
| 68 The species | Done | ✓ | replay hash, pacing and tackle numbers moved (8.5). |
| 69 The tackle | Done | ✓ | Started on 2026-11-02 ("start phase 69"). |
| 70 A painter for real fish, and the perch and bass families | Done | ✓ | Started on 2026-11-02 ("start phase 70"). |
| 71 Trout, salmon, char and whitefish | Done | ✓ | Started on 2026-11-02 ("start phase 71"). |
| 72 The rest of the fish, and the swimmers | Done | ✓ | Started on 2026-11-02 ("start phase 72"). |
| 73 Lure art | Done | ✓ | Started on 2026-11-02 ("start phase 73"). |
| 74 Nine waters on the chart | Done | ✓ | Copperbend River, Stonehorn River, Hartsmere Lake, Russetwood Lake, Coldharbor Sound and Wreckhollow Bay (`data/loc_<id>.js`), painted for now with the existing layer kinds; every water has `water`… |
| 75 Where each fish lives | Done | ✓ | Started on 2026-11-02 ("Start phase 75"). |
| 76 A pier in every water | Done | ✓ | Started on 2026-11-02 ("start phase 76"). |
| 77 The rivers | Done | ✓ | Started on 2026-11-02 ("start phase 77"). |
| 78 The lakes | Done | ✓ | Started on 2026-11-03 ("start phase 78"). |
| 78b The user's fixes | Done | ✓ | the rod, the line, the float, the knock); a lure has to be worked to draw fish (by its retrieve: steady, stop-and-go, pops, slow), a fish may turn down a badly worked one, and some fish only pass by… |
| 79 The seas | Done | ✓ | Started on 2026-11-03 ("start phase 79"). |
| 79b No lantern, no finder | Done | ✓ | from the shop (its gear shelf is now only something to look at), the boat, the data, the economy and the debug; save v10 pays back their price (250 and 180). |
| 80 The ice on the chart | Done | ✓ | The Flats, Pressure Ridge and The Deep Hole over a shaped bed to 28 m, painted with the existing layer kinds in new snow keys; free on the chart once a sea has been seen (`need.seaSeen`), the stop up… |
| 81 On the ice | Done | ✓ | One path with an ice mode (`js/scene/ice.js`, `loc.ice`): the boat is the Snow Machine on the ice (faster, no drift, its own higher whine, the dog in a box sled behind, snow thrown up where the water… |
| 82 Winter | Done | ✓ | Tamarack Lake's scenery (`js/scene/winter.js`, module `tamarack`): snowy woods of spruce loaded with snow and bare winter tamaracks, fishing shanties far out on the ice (their windows lit at night)… |


Every task in Phases 1–12 met its "Done when" check from §4. Each check was run and its output reported in the conversation that built it.
| 83 The pond behind the cabin | Done | `Phase 83: The pond behind the cabin (tasks 83.1-83.2)` | Asked for by the user on 2026-11-04 ("Do phases 83, 84 and 85"). The cabin has a back door in its east wall (row 3, inside it tile 10,3); walking out of it, or Space at it, goes down to the Back Pond (`data/loc_pond.js`, 400 px wide, 6 m), the boat moored at its dock under the cabin's back wall; THE PIER panel there offers The Cabin (back up the steps) and Stay; coming in from the pond he stands inside the back door, the front door always goes out to Fogbound's pier and Esc goes back the way he came. Not on the chart (from the pond the map stands at the cabin's stop). Scenery module `pond` (`js/scene/pond.js`): the cabin's log back wall with two windows (lit at night once the cabin is patched) and the back door at the top of its steps, the stream's rock lip at the west end jammed with branches and an old tyre, the water murky brown (the module's `surface`). Life: ducks, a heron at dawn, dragonflies, the frog on the lilies, striders, fry and tadpoles, no crayfish, and a new animal, the moose, wading at the far shore at dawn and dusk to eat weed, walking off only when the boat comes within 40 px. No wild fish (stocked in Phase 85). Presentation and input only: the replay hash is unchanged. 8.3 #477–482 |
| 84 Cleaning the pond | Done | ✓ | 21 pieces of trash on the pond's bed (`data/pond.js`: 5 bottles, 5 tin cans, 5 boots, 2 tyres, 2 sunk crates, a bicycle, a shopping cart), drawn on the bed in the cross-section; any hook takes one… |
| 85 Stocking | Done | ✓ | The journal records the size classes caught per species (`journal[id].sizes`, from now on: a page says "Catches from before the pond went unsized." where older catches exist) and a freshwater… |
| 86 The ice, looked at again | Done | ✓ | stopped at a hole he gets off the machine and sits on his bucket (`b.sit` eases 0..1 in 0.45 s): the machine slides back 31 px behind him, the bucket comes from its rack behind the seat to under his… |
| 86b The lure at the tip | Done | ✓ | reeled up short, shortening line sped the swing up, and on 3 px of line the boat's and the rod's kicks outweighed gravity. |
| 87 The lake bed, deeper | Done | ✓ | the deeper the bed, the more of the water's dark lies over it (steps of 2 m, 3.5% each, to 50%), baked into the bed and weed layers, so the shallows read bright and the deep bed recedes. 87.2 space… |
| 90 Big enough on a phone, and a professional finish | Done | ✓ | on a phone (and on a PC with Text size: large) the panels, the HUD and the touch controls draw on a second canvas over the whole screen at a whole number of device px, capitals 9.3 CSS px on an… |
| 88 The first hour | Done | ✓ | Started with Phase 90 in the user's order (2026-11-04). |
| 89 A livelier fight | Done | ✓ | The user's answer to PLAN_PLAYABILITY.md 6.Q6: no gauge, but fish that fight with more speed, side to side. |
| 91 The phone as an app | Done | ✓ | a tick on a bite, a pulse on the hook-set, a buzz on a slip, counted by `dbg.device().buzz`. |
| 93 Choosing the hour | Done | ✓ | The cabin's bed opens a REST box with four buttons (Dawn, Day, Dusk, Night; the part it is now marked, the next one chosen); every pier's panel has *Wait on the pier*, which opens WAIT (until dawn… |
| 92 Settings and access | Done | ✓ | The pause list gains Music, World and Effects (ten ticks each, under the master Volume; World is the ambience bus: weather, wildlife, the lake; Effects the reel, splashes, the dog and the UI), Reduce… |
| 96 Lower prices | Done | ✓ | The plan's proposed prices, unchanged: the waters 250 (creek), 400, 600, 900, 1250, 1500 (Russetwood), 1750, 2250 (about 8,900, was 29,950), the Snow Machine 1250; rods 0/100/350/800/1400, reels… |
| 94 Milestones, rewards and the size badge | Done | ✓ | 25 milestones (`data/milestones.js`, judged by `js/sim/milestones.js` from what the save counts, each paid once, 25–500c): the first fish, fifty fish, a release, every size of one fish, every fish in… |
| 98 Fogbound, the hour between | Done | ✓ | rounded hills under a pelt of small conifers going to haze at their foot, a nearer line of them with a lattice radio mast whose red light beats slowly (brighter at night), lavender mist between every… |
| 99 The Pines, a crimson dusk | Done | ✓ | jagged plum ranges with rose-lit crests, a rounded forested hill filling the west (Fogbound's `fbhills`), a flat-topped butte with a rose cliff band across its face under a pelt of small trees, mauve… |
| 100 Blackwater Creek, a blush over snow | Done | ✓ | two ranges of peaks with broad snow lit pink-lavender, rounded slopes of conifers in mist (Fogbound's `fbhills`), a dark line of spruce with a few gold larches, old pines with flat ragged pads of… |
| 101 One fish at a time | Done | ✓ | Started on 2026-11-08 (the user's OK to PLAN_FISHING.md). |
| 102 The strike you see and hear | Done | ✓ | After its last nibble the taker **sets** itself a little off the lure (a new state, `set`: 5-14 px and 0.2-0.55 s by its bite style), then **lunges** onto it (0.1-0.3 s, up to 4x its top speed) and… |
| 103 Letting out line | Done | ✓ | While the lure is in the water and no fish has it, **hold Down (S or the down arrow; on a phone, a new LINE key over the action button)** to open the bail: the line goes slack and pays out, with the… |
| 104 Every lure moves as it really does | Done | ✓ | Each hook has a movement profile (`underwater.js MOVE`) used wherever it falls (the cast's sink, a pause on a tight line, a free fall on a slack one): a **spoon flutters** side to side as it falls… |
| 105 Every species takes it its own way | Done | ✓ | Each species feeds as the real fish does (`data/fish.js` FEED_BY_FAMILY, 17 families, and FEED_OWN for 17 species: walleye, the basses, crappie, lake trout and char, brook trout, grayling, carp… |
| 106 Fishing every hook (the angler bot) | Done | ✓ | `tools/angler.js` (new) plays the real game headless at 8x (a debug-only time scale and per-step hook in the loop) and fishes **all 27 hooks** (4 live baits, 23 lures) for 4 game minutes each at the… |
| 107 Fun and pull | Done | ✓ | **A clean set:** a hook set within 0.4 s of the strike (the firmer hook hold `bite.hold` already gave it) now says so: *Clean set* rises in amber from where it was set, a crisp click and a rising… |
| 108 The journal tip; finer cabins, piers and lamps | Done | ✓ | **The bug:** the first-time tip "J the journal" never went away: `tips.update` runs from the sailing scene's step, which does not run while a menu is open, so it never saw |
| 109 The Heavy Bladebait comes in | Done | ✓ | **The bug:** reeling the Heavy Bladebait never brought it in: it sat on the bed shivering. |
| 110 Every hook comes in at a held reel | Done | ✓ | **The bug:** after Phase 109 the bladebaits did come in, but slowly: held on the reel from the Pines' bed (26 m) they took 30-33 s, the Deep Jighead 20 s, the Dropshot 23-36 s and the Heavy Dropshot… |
| 111 Fish illustration style | Done | ✓ | use the reference game's painted fish plates as the style reference. |

| 112 Fish detail and realism | Done | `Phase 112: Fish detail and realism` | Follow-up to the user's feedback that Phase 111 was too subtle: rounded body lighting, half-tone material ramps, overlapping scales, gill and cheek anatomy, fin membranes and rays, and revised perch, bluegill, trout, pike, carp and catfish profiles. Presentation only: 8.3 #581 |
| 113 The bladebait as quick as a worm | Done | ✓ | **The bug:** after Phase 110 the user still found the Heavy Bladebait too slow to bring in. |
| 114 The lodge sign | Done | ✓ | `scenery.js`: the EAT box on the roof (hidden behind the woods layer in front, and flattened by the mist) is gone; the lodge's name in two rows of pale neon channel letters (`lamp_glow`, a warm `signal_amber`… |
| 115 The shop as a warm lakeside refuge | Done | ✓ | `shop_room.js`: the back wall stands taller (`TOP` 44 → 84; the room now fills the view from y 10 to 350, `OY` 94) and is horizontal cedar planks under a log beam whose cut ends show at both corners… |
| 116 Mini people in the rooms | Done | ✓ | `room.js`: a mini view (`Mini`, as `X.scaled` shape by shape) paints the fisher and Rusty from their 32×48 painters into 24×34, the head at 0.78 and the body below the neck at 0.58: a tile tall with… |
| 117 The shop as the reference lays it out | Done | ✓ | `shop_room.js` rewritten on the reference's measurements: rows 0-1 are the back wall with its built-ins down to one ledge (the floor starts clean at ty(2)), the side walls painted 16 px thin, a log… |
| 118 The shop's colour and Rusty's bust | Done | ✓ | `sprites.js`: the cedar ramp redder and deeper (the reference's boards, #9b3f19, where ours were #8a4a1d). |
| 119 The rooms' people as on the boat | Done | ✓ | `room.js`: the fisher, the dog and Rusty painted the boat's way (`js/scene/fisher.js`, `js/scene/dog.js`): soft round shapes in their ramps with `ink` at the rim, no drawn outline, an eye a single… |
| 120 The rooms' people as overworld sprites | Done | ✓ | `room.js`: the fisher, Rusty and the dog are small grid sprites with a dark outline, a big head and a compact body, shown at 2× (each art pixel 2×2, as the shop's cat is): the fisher and Rusty 16×26… |
| 121 The whole shop in the sprites' style | Done | ✓ | `shop_room.js` rewritten at half size: the room is composed each frame in its own 192×170 canvas (tiles of 16 art px) and drawn at 2× into the view, so the walls, the furniture, the lamps, the cat… |
| 122 The cabin in the shop's style | Done | ✓ | `cabin.js`: the room is shown at 2× from its own 192×150 canvas, as the shop is. |
| 123 Fine detail, cozy people | Done | ✓ | the shop and the cabin are drawn at full resolution again (`shop_room.js` as at Phase 120, `cabin.js` as before Phase 122: Phases 121-122's half-size rooms and `halve` are gone). |
| 124 The shop and its people as the user drew them | Done | ✓ | `js/gfx/people_art.js` (new): the sheet sampled cell by cell to the rooms' size (the fisher 30-32×53, the dog 31-40×38, Rusty 33-37×55) and held to short palettes of their own (`sprites.js` pf0-pf25… |
| 125 A walk that reads as a walk | Done | ✓ | `room.js`: the fisher's strides from the front or behind lift one leg two pixels while his body sinks a pixel; from the side his legs part, one forward and one back, and his body sinks. |
| 126 Every look and breed its own; the shop alive | Done | ✓ | `room.js`: the first look and the golden stay the user's sheet; every other look keeps the sheet's body and face and is given its own hat (the red cap's crown, seam and visor; the tall teal knit with… |
| 127 The other looks and breeds as the user drew them | Done | ✓ | `tools/art/ref/people_sheet2.webp` sampled to the rooms' size (fishers 48-52 px, dogs 36-39 px) with a palette of its own per character (`pk*` … `pc*`, 118 keys); `room.js` draws each look and breed… |
| 128 The cabin as the user drew it | Done | ✓ | `tools/art/ref/cabin.webp` sampled by `tools/art/cabin.py` and `cabin2.py` to 528×352 (nearly the whole view; the old room was 384 wide) with 64 keys (`pv*`, interior), and 16 cuts (shelf, monstera… |
| 129 Key hints the first time | Done | ✓ | `settings.hints` (false by default; old saves get it from the defaults) and a **Key hints** row in the pause list, `first time` or `always`. |
| 130 The title on tape | Done | ✓ | `js/ui/title.js` (new), an overlay (`G.ui.menu.open('title')`, so the world waits under it) opened at boot over the lake's first frame, skipped with `?seed` (the test bots), `?gallery` or `?notitle`… |
| 131 The VCR menu skin | Done | ✓ | `panel.js`: every panel's title is OSD capitals with a play mark and a red/teal chroma split; faint scanlines in the body; a blinking ▶ cursor on the pause and pier lists; panels roll in under a tracking band (PLAN_UX.md). |
| 132 A menu you can read at a glance | Done | ✓ | The pause list is a VCR MENU in three pages: MENU (Resume, Journal, Chart, Milestones, Fisher & dog, Settings, Controls, Save tape), SETTINGS (under SOUND, PLAY and SCREEN headings) and SAVE TAPE (export, import); a PLAY status line; Esc steps back a page. |
| 133 Fixes and a shop that finds things | Done | ✓ | The card's settled size medallion sits beside its NEW tab and its PC hint is a key cap; the pier panel wraps its line; chart names sit on plates; Rusty's Buy opens in five shelves (RODS, REEL & LINE, LURES, BAIT, GEAR) turned with A/D or the list's foot. |
| 134 The tape's menu | Done | ✓ | The title shows a VCR menu under the letters: PLAY (CONTINUE once a fish is caught), SETTINGS, CONTROLS. One key or a tap off the rows still plays at once; the two pages open over the tape and return to it. |
| 135 Something to chase | Done | ✓ | The catch card's foot shows the goal it counts toward (the water's fish, or the nearest milestone) with a bar, counting this fish; the MENU names the next goal; journal tiles of fish not caught that bite here at this hour say *now*. A fresh save's first pause no longer jumps to the export reminder. |
| 136 One voice for the HUD | Done | ✓ | Passing messages (why a fish got away, a lure lost, the last pack) are OSD plates at the top centre where the tips speak, with a teal play mark; a tip steps aside while one shows; the milestone line sits under them on the same plate. |
| 137 Fast-forward between waters | Done | ✓ | Travel's fade plays as a VCR fast-forward: rolling static lines, ▶▶ FF and a running tape counter, then the new water as a channel card (CH 02  BLACKWATER CREEK; the shop and cabin are AV). Same length; the plain fade under Reduce motion. |
| 138 This tape | Done | ✓ | The MENU's foot shows this sitting's tape (TAPE  2 FISH  +76c  25 cm) above the next goal; the milestones page opens on the goal to chase, its row lit. |
| 139 Tape sounds | Done | ✓ | A panel opening plays a cassette deck's key (a low click, a thunk, a breath of hiss); travel plays the tape winding on. Quiet, on the effects bus. |
| 140 The Tape look | Done | ✓ | SETTINGS → SCREEN → Tape look (off by default): the picture with faint scanlines, a soft vignette and one slow tracking line, as a tape played back. The SETTINGS page's hints no longer run past its edge. |
| 141 The fight says what lands fish | Done | ✓ | In the first fights the word over the rod said EASE (let go) on every run, which throws the hook on a slack line; now it says REEL (keep it tight) and EASE only while the line is really tight. The Controls page says the same. |
| 142 Stop it at a depth | Done | ✓ | A first-time tip once a fish is caught: tap SPACE (REEL on a phone) to stop the sinking lure at a depth, since depth decides which fish come. |
| 143 How to play first | Done | ✓ | On a phone, the Add-to-Home-Screen note (91.2) waits until the first fish is landed, so the first line a new player sees is how to cast. |
| 144 Tips take turns | Done | ✓ | A first-time tip other than the basics steps aside after 25 s on screen, so one left undone (the journal's) no longer hides the tips about the tackle, Rusty's and the chart. |
### 8.2 Architecture as built

The files that exist so far. §3 is the target tree; this is what is in it now.

```
index.html          canvas, whole-pixel scaling, script tags in load order, boot (seed, save, scenes, loop)
js/core/  debug.js  ?debug overlay (page text), red error box, dbg.* API, ?gallery scene
          rng.js    mulberry32: G.rng (sim), G.vrng (visual), seedAll
          state.js  fishing state machine table, scene manager, G.state = {save, run}
          input.js  keys/mouse -> actions (left, right, action, pause, journal, map, passive, up, down, back)
          save.js   save v4, migrations, SS1.<base64>.<checksum> format, autosave; which tab owns the save (12.5)
          loop.js   fixed 1/60 step, 0.1 s frame cap (setPaused is a debug freeze; P is the pause menu); no
                    steps while another tab owns the save; hooks.idle and hooks.present (?compact)
data/     loc_fog.js   Fogbound: layers, landmarks, underwater settings, spots (with boosts), maxDepth 96 px (24 m), cost 0
          loc_creek.js Blackwater Creek: forest layers, cabins, snags (above and below water), the current
                       (drift(seed, t, depth, onBottom)), maxDepth 64 px (16 m), cost 300
          loc_pines.js The Pines: far shore with diner and lot, signal, road, owl branch, the shared pier,
                       maxDepth 112 px (28 m), cost 1500
          loc_copper.js, loc_harts.js, loc_stone.js, loc_russet.js, loc_sound.js, loc_wreck.js (Phase 74):
                       Copperbend River, Hartsmere Lake, Stonehorn River, Russetwood Lake, Coldharbor
                       Sound, Wreckhollow Bay; every water has water (lake/river/sea), reaches and a dock.
                       loc_red.js (the Red Room) was deleted in Phase 74
          fish.js      the owl's windows, size classes, lure types, 59 real species (Phase 68), validateFish()
          gear.js      rod/reel/line tiers, baits (with shop pack sizes), lantern, depth finder, fight
                       constants, economy constants, cabin stages,
                       passive.incomeMult (D5)
          dialogue.js  the shopkeeper: small talk and the special lines (hints, repeated, reversed)
          anomalies.js the anomaly list and scheduler constants, validateAnomalies()
          looks.js     four fishers and four dogs to choose (Phase 47), lookOf(), validateLooks()
          fishlooks.js the real fish's anatomy specs (Phase 70): body, fins, head, scales, markings, ramps
js/sim/   clock.js     hour advance, grey/night, windows, per-cast latch, cue crossing (the owl)
          unease.js    per location 0..1; anomaly scheduler; castBoost (anomaly and spots); lateHint (10.5)
          fish_ai.js   speciesWeights/pickSpecies, the school (max 8) and its states
          bite.js      2 s hook window, a missed fish may return once
          fight.js     the V4 tension model and autoPlayer(skill)
          economy.js   price, sizeFactor, the size curve (sizeQ, size; Phase 44), gear effects, purchases, bait use, catches, unlocks, cabin restoration
          passive.js   passive cycles (plan, apply, cycle), time away (offline, away), the tape (record, finish)
js/gfx/   bake.js      offscreen canvases, layers, flipped copies, lazy cache
          sprites.js   palette (only hex in the code), sprite DSL, bitmap font, wrap, hash
          fx.js        particle pool (256) and ripple pool (32), splash
          water.js     mirror reflection; reflection deltas (figure, lit window, second pier) drawn only there
          fishgen.js   8 bases × 15 parts, wrongness (every look plain since Phase 68; replaced in Phases 70–72); portraits and swimmers (rest, tail flick, shimmer) painted natively; small fish from paintTiny (Phase 44); Phase 70: paintSpec, the real-fish painter (a pure key grid), paintFit, bakeSpec, fishLooks()
          rod.js       the rod as a tapered beam bent by the line's load (Phase 31); fishLoad, a fish's weight against the rod (Phase 44)
js/scene/ boat.js      boat physics, the rod's base, tip and parts
          fisher.js    the posable fisher, his poses, the rod holder, the idle director (Phase 33); painted from the look (Phase 47)
          dog.js       6 poses, interest thresholds, the stare and the bark (cues); the breed's look and bark pitch (Phase 47)
          underwater.js  cross-section (with submerged snags), lure sink/stop/reel and the current's drift,
                         swimmers, current streaks, bite -> hook -> fight -> landing, heavy-fish shadow;
                         the bed's things and the new weeds from the water's life table (Phase 48)
          life.js      the life under water (Phase 48): each water's table (WATERS), crayfish, snails, fry
                         and tadpole clouds, the darting perch, the turtle, the night eel, silt
          scenery.js   scenery modules (11.4): 'pines' (blinking signal, neon, fluorescent lot lamps, the
                       perched owl); 'red' was deleted with the Red Room in Phase 74
          rivers.js    Phase 77: the rivers' modules 'copper' and 'stone': landmark painters (bridge, gravel,
                       dam, maple; boulder, bluff with the osprey's nest) and the live water (`surface`:
                       riffles, white water, standing waves, foam collars, the dam's spill, the mist)
          lakes.js     Phase 78: the lakes' modules 'harts' and 'russet': birches, Birch Point, the old
                       bench and rowboat, weed beds seen from above; reed beds, drowned stumps, deadfall,
                       the far dam (a layer of kind 'dam', its crest lamps at night)
          winter.js    Phase 82: Tamarack's module 'tamarack': snowy woods, shanties (lit at night), the
                       landing, the pressure ridge, the frozen falls, old holes on the ice; sailing.js
                       draws snow and the blizzard where a module has `winter`
          ice.js       Phase 81: the ice mode (run.ice: the holes, the drill, the drop, freezing; the ice's
                       underside and its snow from above, the auger, the tip-up), asked by sailing, underwater
                       and boat wherever a water has `ice`
          pond.js      Phase 83: the Back Pond's module 'pond': the cabin's back wall (windows lit at night), the
                       stream's lip with its jam (or the water over it), the murk over the water (`surface`)
                       Phase 84: the trash painted (`trashImg`), on the bed (`drawTrash`) and on the line
data/pond.js (Phase 84) the Back Pond's trash (7 kinds, 21 pieces), the stream's price, the 7 kg rod
js/sim/pond.js (Phase 84) save.pond's rules: the meter, the murk, the clearing, the trash's touch, the stream;
                       Phase 85: the sizes a species comes in, stocking, the pond's fish free to bite, shy, trophies
          sailing.js   the scene in play: location loading, parallax, camera, sky, cast, anomalies, the owl,
                       the scenery hook, the step order below
js/ui/    hud.js       clock, coins, bait in use; depth readout, tension tint, depth-finder bands
          card.js      catch card, sell/keep
          menu.js      overlay manager (pause, journal, map), pause menu with settings and export/import,
                       shared panel helpers
          journal.js   overlay: filters, species grid, entry page, discovered hints, unease handwriting,
                       heavy-fish margin note
          shop.js      scene: baked interior, shelf grid, purchases, the shopkeeper's line per visit
          map.js       overlay: baked chart, travel with a fade, unlocks, the way into the shop and cabin
          cabin.js     scene: restoration stages, mounted trophies, facing decided in enter()
          dock.js      the pier's panel (Phase 67): THE PIER at each water's dock, its rows from the
                       water (The Cabin at Fogbound's only, Phase 76), the fade to the shop or cabin
          tape.js      overlay: the VHS tape of passive fishing (time away and live), and away(now) for boot
          look.js      overlay: the fisher-and-dog picker, from pause and the cabin door; save.look (Phase 47)
tools/    balance.js   --validate [--strict], --replay <seed> [min], --pacing (Node; loads the scripts listed in index.html)
```

**Scenes and overlays:** the scene manager holds `sailing`, `shop`, `cabin` and `gallery`. Each boot-loop step first calls `G.ui.menu.update(dt)`; while an overlay (pause, journal, map) is open it takes the step and the scene does not update, and `G.ui.menu.draw` draws it over the scene.

**One update step** (`sailing.update`): TAB (or, while passive, a move or the action key) toggles passive mode → gear effects → clock → unease → anomaly scheduler → owl → cast steps (charge, flight, or the lure under water, drifting where there is a current) → fish school → passive cycle → scenery module `update` → `underwater.catchStep` (bite, hook, fight, landing, card) → card input → boat → dog cues and dog → camera → underwater view (fade, vertical camera) → particles.

**Drawing order** (`sailing.draw`): sky and layers (the scenery module's `afterLayer` after each) → mirror (anomaly deltas, then the module's `reflect`) (only when the camera is at the surface) or the cross-section → waterline glints → particles → boat and dog → hooked fish → line and lure → HUD → card; then any overlay.

**Run state** (`G.state.run`, never saved): `fsm`, `loc`, `boat`, `dog`, `cam {x, y}`, `uw {alpha}`, `cast` (charge, landing x, lure position, seed, `tw` time in the water, `latched` windows, bait, `boost {attract, rare, legend}`), `school`, `lureIn`, `bite`, `fight`, `hook`, `heavy`, `gearFx`, `dogIn`, `uneaseIn`, `anom` (the active anomaly, gap, next roll, cooldowns), `anomIn`, `owl`, `spots` (the location's spots as they stand for the next cast), `scen` (the scenery module's own state, or null), `passive` (on, the cycle's sim state `ps` and its plan, time into the cycle, the float's x, the live tape, the HUD note; carried across travel).

**Save** (`G.state.save`, version 4): `coins`, `gear {rod, reel, line, lantern, depthFinder, bait}`, `baits {id: count}`, `journal {id: {caught, bestLen, bestW, hints, seen, phantom, read}}` (`read` is set when the entry is looked at; absent means NEW; `late {ref: true}` and `lateNew` mark hints written in later, 10.5, and such an entry can exist with `caught: 0`), `kept [{id, len, w}]`, `cabinLevel`, `unlocks {fog: true}`, `loc` (where the game resumes), `unease {loc: 0..1}`, `clock` (a new game starts at 19:00), `flags {windowCatch {windowId: true}, lines {lineId: visit said on}, shopVisits, heavy {loc: true}, anomalies {id: times seen}, dogStare {loc: true}, lateAt}`, `settings {volume, mute}`, `lastSeen`, `rng`, plus `tapes` (P12). Migrations v1 → v2 → v3 → v4 exist.

### 8.3 Technical decisions
These are interpretations and additions made while building, where the spec above was silent or ambiguous.
1. **Debug text is page text, not canvas text.** It stays readable at any scale and survives a crashed loop.
2. **State machine exits to `sailing`:** cancel a charge, reel in early, snap, escape.
3. **Save format:** `SS1.<base64 of JSON>.<FNV-1a checksum>`, used for both storage and export.
4. **Autosave** happens on catch and purchase (and on travel from 9.5), and also when the tab is hidden or closed, so the clock and unease survive a reload.
5. **Reflection:** the scene above the water is redrawn mirrored into a buffer each frame, instead of storing flipped layers.
6. **Underwater:** the cross-section fades in with the camera at the surface.
7. **Lure control:** the lure hangs below its entry point.
8. **Clock windows** latch only when the lure lands (D1); a window that is open right now always counts.
9. **Fish only notice baits listed in `baitLikes`** (or any bait if the list is empty).
10. **Species `speed` is in V4 fight units** (1.0–2.2).
11. **The fight starts at D = 0.6** (`gear.fight.d0`).
12. **Auto-player landing band** (7.3; the spec gives none): skill 0.8 with starter gear lands at least 90% of fish within the line's rating (strength ≤ line strength), and stronger fish less often but above 40%.
13. **Gear tiers are linear upgrades** (`save.gear.rod = 2` means tier 2 is owned and equipped).
14. **Unlock costs** live in each location file (`cost`, and `need` for a condition) since 11.1; `data/gear.js` no longer has `unlocks`.
15. **Pacing model** (`tools/balance.js`): an active player at depth 8 m, hooking 90% of bites, fight skill 0.85, buying in the order `PLAN` (line, reel, rod, lantern, depth finder, creek, …).
16. **Run state is built by `sailing.load()`**, not by `state.newRun()` (which only creates `fsm`, `fsmPrev` and `fsmT`).
17. **Overlays and scenes (9.2):** pause, journal and map are overlays over the current scene; shop and cabin are scenes.
18. **New input actions:** `up` (W, ↑), `down` (S, ↓) and `back` (Esc) for menus; Enter also counts as `action`.
19. **The map is the hub (9.5):** it lists the four waters plus the Bait Shop and the Cabin (both on the Fogbound shore).
20. **Export and import (9.2):** export saves first, then copies the `SS1` string to the clipboard, falling back to the browser's own prompt to show it.
21. **Journal (9.3):** hints are discovered by catching: the species' `hintRefs` on the first catch, the baits it takes on the second, its depth and hours on the third.
22. **Shopkeeper (9.4):** one line per visit, chosen without RNG.
23. **Shop purchases:** gear and equipment buy the next tier.
24. **Cabin (9.6):** stages and plaque counts live in `data/gear.js` `cabin`, and `economy.restoreCabin` pays for the next stage.
25. **HUD (9.1):** clock, coins and bait (with count, except worms) in the top-left over the sky, with a 1 px ink shadow; depth stays in the top-right while underwater.
26. **The anomaly scheduler is separate from unease's own step (10.1):** `unease.anomalyStep(run.anom, input, dt, rng, data)` runs only in the game (sailing), so the headless pacing and replay sessions are unchanged by anomalies (the…
27. **Anomaly placement:** `place: 'near'` puts it 40 px to the rod's reach from the boat, on either side (the other side if it would leave the world), so a cast can reach it.
28. **Cast boosts (10.1, 10.3):** `unease.castBoost` runs when the lure lands and is kept in `cast.boost` until the next cast starts.
29. **Reflection deltas (10.2):** drawn by `water.drawDelta` through the existing `setDeltas` slot, so only into the mirror buffer.
30. **Dog cues (10.3):** the stare happens when the boat comes within 110 px of the location's `hidden` spot, once per location (`flags.dogStare`), for 4 s.
31. **The owl (10.4):** `clock.cueCrossed` reports when a step passes a window's `cue`.
32. **Late journal hints (10.5):** `unease.lateHint` runs when the journal closes.
33. **Milestone B, as built:** of §2's elements, these are live on Fogbound: unease, clock windows with the owl, heavy-fish hints, catch-card lines, the dog (point, look down, stare; the bark is ready and waits for a legendary…
34. **The Red Room's unlock stays "any window catch" (11.3):** `need: {windowCatch: 'any'}` in `data/loc_red.js`; `economy.canUnlock` also accepts a window id there.
35. **The creek's current (11.1):** `drift(seed, t, depth, onBottom)` in `data/loc_creek.js` is the whole rule: it ramps up over `ramp` s, sways by ±`sway` with a phase hashed from the cast's seed, slows with depth (half as fast at…
36. **Scenery modules (11.4) are a new file, `js/scene/scenery.js`** (not in the §3 tree), registered as `G.scene.scenery[id]` and named by `loc.scenery`.
37. **The traffic light (11.2)** blinks every 1.4 s, at 0.45 s inside a clock window, and closes in on that over the game hour before a window opens (`scenery.pines.blinkPeriod(hour)`, pure).
38. **Moving structures (11.3):** the lamp (rare ×2.5), the armchair (attract ×1.5) and the statue (attract ×1.2, rare ×1.5) each carry a spot.
39. **The same pier (11.4):** a landmark with its own `seed` paints from that seed instead of the layer's shared stream.
40. **Crimson reflection:** the Red Room's module washes the mirror buffer with `crimson` at 0.55 (`loc.reflect`), so `water.js` is unchanged.
41. **Anomalies by location:** the reflected figure and the empty boat can appear on all four waters, the lit window on Fogbound, the creek and the Pines, the second pier on Fogbound and the Pines.
42. **Passive cycles (12.1):** `passive.plan` decides a whole cycle as it starts: wait = `base` (48 s) / (rod × bait attract) × 0.6–1.4, the species from `pickSpecies` at the hour the wait ends (windows latched when it starts, D1)…
43. **Live passive (12.2):** TAB turns it on from any state.
44. **Time away (12.3):** on boot, `G.ui.tape.away(Date.now())` hands `now` to `passive.away` (the sim reads no Date).
45. **The tape (12.4)** is decided in the sim, from the same rng: a catch is listed as `???` with chance unease × 0.1 × (1 + wrongness).
46. **`?compact` (12.5):** the game draws its normal 320×180 frame into an offscreen canvas, and `hooks.present` halves it onto a 160×90 page canvas with smoothing on (the one place smoothing is used, so 1 px lines survive the…
47. **One tab owns the save (12.5):** each tab claims `softstatic_save_v1_owner` on boot.
48. **`tools/balance.js --passive`:** the active model with `shop: false` (both keep the starter gear) against passive cycles, from a new save on Fogbound at 19:00, 10 seeds × 60 min each, plus time away run twice from the same save…
**Audit batches.** On 2026-10-29 the user approved the improvement audit (the improvement audit (built, file removed)) and asked for it to be built batch by batch (its §7), one commit per batch.
49. **Sky (audit P1-1; the user approved this reading of §0.9 on 2026-10-29):** the sky blends palette keys from keyframes (`SKY_KEYS` in `sailing.js`, four keys from the top to the horizon), not only `night_ink` to `dusk_amber`.
50. **Stars, moon, glow and clouds (P1-1):** baked once per location from their own seeded streams: two star fields (`fog_mid`, `fog_light`; one twinkles), a 7 px moon with a halo that rises at 19:30, is highest about 01:00 and sets…
51. **Fog (P1-2; closes 8.4 #1):** fog layers are baked 3× (`FOG_HEAD`) as dense as their data `alpha` and drawn at `fogMul / 3`, where `fogMul = 1.4 + 1.1 × grey + 0.6 × unease` (capped at 3).
52. **Water light (P1-3):** `water.draw` takes an optional `light {x, a, key, w}`: a broken path under the moon (`fog_mid`) or, when the dusk glow is stronger, under the glow (`dusk_rose`), narrow at the horizon and wider nearer…
53. **Visible gear (P1-5):** `boat.draw` takes an optional `gear {rod, lantern, finder, night}`.
54. **Map gate (audit P0-2):** a water no species lives in (`G.ui.map.stocked(id)`) cannot be bought; the map says "The water is still settling.
55. **The creek's canopy (P2-5, done early):** the `trunks` painter no longer draws loose crowns (they read as floating lollipops); trunks run off the top of the view and a ragged `moss_dark` canopy edge runs along the top.
56. **Audio (Phase 13 and audit P0-1), all in `js/audio/engine.js`:** the context is created on the first key, click or touch (a modifier key alone is not a user activation in Chrome, so the first real key starts it) and suspended…
57. **What plays (13.2–13.4):** ambience: wind (stronger in the grey hours), still water, lapping that grows with boat speed, a drone whose third tone goes out of tune with unease (+12 to +67 cents), the creek's stream, the Pines…
58. **Allocation note:** Web Audio one-shots need new source nodes, so each sound allocates a few nodes when it plays.
59. **Feedback (audit P1-4):** a bite opens a ring where the line goes in (on the step the bite starts) and the rod tip dips about 2 px (angle −9° at most, was −5°).
60. **Petting the dog (P1-6):** S or ↓ while the boat sits still between casts (not in passive) calls `dog.pet`: pose `pet` (eyes shut, ears back, the tail wagging at 7 frames/s) for 2 s, at most once every 3 s, and never over the…
61. **Calm HUD (P1-7):** `hud.update(dt, run)` (from sailing's update) counts idle seconds; any mapped input (`input.any()`), a line out (any state but `sailing`), passive news, or a change of coins or bait resets it.
62. **Ambient life (audit P2-1):** every 2–6 s (`G.vrng`) the scene puts a ring, and sometimes a droplet, above one fish swimming shallower than 16 px (4 m).
63. **Passive presentation (P2-2):** while passive fishes and no fish is on, the dog sleeps (pose `sleep`, breathing at 0.7 frames/s; `dogIn.sleep`, the lowest priority in `dog.want`).
64. **Underwater (P2-3):** while the cross-section fades in or out it also opens downward from the surface (a clip of `1 − (1 − alpha)²` of its height), so the view seems to dip under.
65. **Drizzle (audit P3-1):** from unease 0.45 (full at 0.8), in about one game hour in four (`hash(loc.seed, hour) & 3 === 0`), fading in and out over the first and last 15 game minutes of the hour.
66. **Still mode (P3-2):** H (new input action `still`) hides the whole HUD until pressed again; the catch card still shows.
67. **The 8.4 minors (P3-4):** #5: sailing re-runs the pure `speciesWeights` when the rod's limit changes, so `tooHeavyNear` follows a rod upgrade at once (no RNG is used; the replay is unchanged). #17: in the Pines the perched owl…
68. **The rosters (14.1–14.4):** 36 species, 9 per water (4 common, 3 uncommon, 1 rare, 1 legendary); the four placeholders keep their ids.
69. **The Red Room's key (V6, closes 8.3 #34):** `need: {windowCatch: 'owl_333', fish: 'three_thirty_three', text}`: the Pines' rare fish, which bites only in the 03:33 window and lives 20–28 m down.
70. **Final balance (14.5):** the pacing model now moves to each water it opens (depth per water: Fogbound 8 m, creek 6, Pines 8) and, in the Pines, hunts the key: in or just before the 03:33 window it fishes at 24 m.
71. **Touch and buttons (14.6):** `input.js` maps touches to zones: in play, the left 64 px steer left, the right 64 px steer right and the middle is the action (hold to charge or reel); in a menu, the shop or the cabin, the top and…
72. **Performance (14.7):** the loop measures update and draw time and the worst frame each second (overlay and `G.core.loop.stats`).
73. **Save migrations (14.8):** `node tools/balance.js --saves` builds a save shaped as each milestone wrote it (the `defaults()` of Phases 1, 7, 8, 9, 10 and 12, from git history, with some play in them).
**Phase 15, visual detail (2026-10-29).** The user asked for a phase to lift the overall look to the level of detail of five screenshots of a cozy pixel-art fishing game they supplied (painted mountains and forests, a split view with a bright…
74. **Split view (15.1):** the cross-section is always drawn.
75. **Painted layers (15.2), in a new file `js/gfx/paint.js`** (`G.gfx.paint`; the user's request for the phase covered it).
76. **The light of the hour (15.3):** every painted layer except fog is also baked graded: night (`night_deep` at 0.55, source-atop) and grey hours (`fog_dark` at 0.35).
77. **Boat, fisher and dog (15.4):** a 34×8 shaded rowboat with a rust stripe and an outboard motor at the stern; a 10×13 fisher in a red cap and a field jacket, hands on the rod; a 12×10 golden dog in the bow, with every pose…
78. **Landmarks (15.5):** the pier has lit, braced posts, a deck of planks with gaps, a rail and a lamp post.
79. **Underwater (15.6):** the gradient runs from `water_lit` near the surface through blue-green to the deep (2 px steps).
80. **Sky (15.1):** 28 bands (was 14), each edge dithered over two rows.
**Phase 16, the bait shop's look (2026-10-29).** The user asked for the shop to look like a reference screenshot (a painted tackle-shop interior with a large shopkeeper behind the counter on the left, a tabbed item panel on the…
81. **The shop, as built (16):**
**Phase 17, 640×360 (2026-10-29).** The user asked for the shop and the rest of the game to match five screenshots of a cozy pixel-art fishing game in detail and pixel definition, with the game's own mood.
82. **The view (17):** `G.core.view` (in `core/loop.js`) is 640×360. A scene or overlay with `native: true` draws in those pixels; any other still draws in the 320×180 space of the earlier phases through `view.begin(ctx, false)`, a…
83. **The fine font (17):** `sprites.makeFont(glyphs, h, lineH, wander)` builds a bitmap font (the old one is now made by it too).
84. **Pixel-art rules for the 640×360 art (17, from the user's correction):** one pixel size everywhere (no `ctx.scale` of art, no smoothing upscales); shading in flat clusters of 3–6 keys per material (`paint.tone` steps, it never…
85. **Fish portraits (17):** `fishgen.portrait(i, maxW, maxH, sil)` paints a species natively at any size from its look: each of the eight bases has a profile (Catmull-Rom top and bottom lines), a tail (forked or round), shaped fins…
86. **Shop, journal and cabin at 640×360 (17):** the shop keeps Phase 16's layout, repainted natively (planks lit plank by plank under a green enamel lamp, the pegboard of packets, trophies by `portrait`, the keeper in flat clusters…
88. **Rusty's shop (17b):** the shop's room follows the composition of the user's reference: a bait fridge at the left edge; a shelf with books, a coffee can and the radio; a big trophy (`gloam_perch`); the cream oval sign RUSTY'S /…
89. **How the sailing scene reaches 640×360 (18):** it still works in world pixels (the sim's units: 320×180 on screen, §0.10), so nothing in the sim, the replay or the balance moved.
90. **Painters at 640×360 (18), under the rules of #84:** mountains are ranges of jagged peaks, tallest at the back, each split along a wandering ridge into a lit face and a shadowed one, with snow on the high ones, gullies down the…
91. **Boat, fisher and dog (18):** painted at HI× in their old world boxes (`boat.js`, `dog.js`): a rowboat whose bottom sweeps up to the bow, lapped planks, a lit gunwale, a rust stripe, an oarlock; the outboard motor; the fisher in…
92. **Overlays at 640×360 (18):** the HUD (fine font with an ink shadow, a painted coin, the depth bands) and the catch card (a paper card in a wooden frame: the name on a ribbon, the fish on a plate, the numbers, the line in…
93. **Still at the old resolution after Phase 18:** the underwater cross-section and everything in it (fish, weed, light shafts, the hooked fish), and the debug gallery. ~~Phase 19 converts the underwater view.~~ Done in Phase 19…
94. **Cost (18):** drawing the water scene takes about 2.7 ms at 1280×720 in headless Chromium (1.7 ms before), the worst frame under 4 ms; 60 fps.
95. **The cross-section at 640×360 (19):** `underwater.js` follows #89: every layer is baked at `HI` (2) times the world's resolution and drawn at 1/HI size, anything live is drawn in half pixels, and the profile stays in world…
96. **Swimmers (19):** `fishgen.swimmer(i, frame, sil, flip)` paints a species with the portrait painter (#85, now `paintLook(look, ...)`) in a box per base (`fishgen.SWIM`, about twice the old sprites, 34–58 view pixels long): frame…
97. **The creek's current (19):** where a water has `loc.current`, 22 streaks (two dashes each, `water_foam` at 0.3) drift downstream at four times the current's speed, slowed with depth by its `slack`.
98. **Bakes (19):** a water's cross-section and its roster's swimmers (every frame, both ways, in colour and as a silhouette) are baked when the water loads, at the travel fade's black: 39 ms for the creek, 43 for the Pines, 40 for…
99. **The gallery (19):** `?gallery` is native at 640×360 in the fine font: the palette, both fonts, the swimmers of every species (frames in turn, flipped, the silhouette) on two pages, every part on every base (one page per base…
100. **The surface (20.1, R1):** `js/gfx/surface.js` (`G.gfx.surface`, loaded after `water.js`) holds one height per view column across the world (`HI` per world px, up to 2,602 for the widest water), in view px, up positive.
101. **What pokes it (20.2):** `fx.splash` (the lure landing, reeling out, the hook-set, a snap or escape, passive floats and catches, the landing), fish rises, drizzle drops, the bite's ring, the slip, a hooked fish pulling above 4 m…
102. **The waterline (20.3):** `drawWaterline` in `sailing.js` draws one column per view pixel from `surface.fill(camPx)` (computed once a frame, shared with the caustics).
103. **The mirror (20.4):** each mirrored row's swell shiver is the old sine scaled by the water's `swell.mirror` × the weather (the Red Room's reflection stands still).
104. **From below (20.5):** under water a fainter `water_hi` line below the lit band wavers against the surface (its underside reflecting the cross-section back).
105. **Floating (20.6):** `sailing.floatY(x)` is the waterline raised by the surface at x.
106. **The rope (21.1, R1):** `js/gfx/rope.js` (`G.gfx.rope`, loaded after `surface.js`) is a Verlet chain of 48 points in world px in preallocated `Float32Array`s.
107. **Driving it (21.2–21.4):** `ropeStep` in `sailing.js` runs after the boat steps, every update.
108. **Drawing (21.5, R3):** `drawRope` draws the 47 segments with `line()`, whose dotting now runs on across calls (`lineN`), so a polyline dots evenly: solid in the air, dotted and at 75% alpha under the surface.
109. **Debug (21):** `dbg.rope()` returns `{mode, n, onSurface, len, span, taut, sagMax, ms}`; the overlay line is `rope pinned  len  taut  sag  ms`.
110. **Allocation (21.1):** the heap sampling profiler (CDP, 512-byte interval) attributes allocations to the rope code only while V8 warms up (about 15 KB in the first 30 s, number boxing before optimisation).
111. **The current (22.1, R4):** every water has a pure `drift(seed, t, depth, onBottom, wind)` in its data.
112. **The line in the current (22.2):** `underwater.flow(loc, depth)` is the current now (the last cast's seed and time in the water, 20 s on); `rope.st.flow` uses it on every point in the water (`rope.js` replaces `flowX`), so the…
113. **The lure's body (22.3):** `underwater.bodyStep` keeps the lure's heading and flutter from its velocity relative to the water: nose first when it moves faster than 2 px/s through the water (sinking, reeled, flying), nose…
114. **The water moves together (22.4):** the weeds lean the flow's way (frame sequence 2, 2, 1, 2, or mirrored; still water below 0.03 px/s sways as before), the motes drift with the flow at their depth, the creek's streaks move at…
115. **Spots by drift (22.5):** the fish AI already reads the drifted lure (`lureIn.x = cast.x1`).
116. **The hook hold (23.1, R2):** `fight.H` 0..1 is set at the hook-set by `bite.hold(t, auto, data)`: 1 − 0.3 × (t / 2 s) from how long the bite had waited (1 at once, `holdLate` 0.7 at the window's end), `holdPassive` 0.85 for…
117. **Shakes and jumps (23.2, 23.3):** while it pulls, a fish shakes its head in bursts of `shakeLen0..1` (0.4–1 s) every `shakeGap0..1` (1.2–3 s) ÷ its speed.
118. **The auto-player (23.4):** while the fish pulls it keeps `keepT × min(1, keepK × skill)` of tension (0.25, 1.3), and in a shake or jump, once noticed ((1 − skill) × 0.2–1.2 s), the full `keepT`.
119. **`--fight` (23.4):** `node tools/balance.js --fight` fights every species each gear tier's rod can hold, 60 times each, by always reeling, never reeling, tapping (holding and letting go for random 0.1–0.5 s spans: a per-frame…
120. **Retune (23.4):** passive went to 56.8% of active, so `passive.incomeMult` is 0.63 (was 0.6; D5, still the one knob): 59.2%.
121. **What a loss looks like (23.5):** a shake knocks the rod tip and jolts the line near the fish (less when it is taut); a jump lifts the fish clear of the water in an arc with a splash and a surface dent out and back in…
122. **Pitch and heave (24.1):** `boat.motion(b, move, dt, hBow, hStern)` runs after `boat.step` (whose speed rules are unchanged, so casting still unlocks at the same moment).
123. **Drawn as a shear (24.1):** a rotated painting would resample its pixels (8.3 #84), so the pitch is a shear: the hull is drawn in 2-view-px columns, each moved by `shear(b, dx)` (whole view pixels), and the fisher, the dog, the…
124. **The boat's own wake (24.2):** the surface's ripples from the stern are too small and too damped at the hull to rock it (0.08 px of heave at most, at any damping tried), so the wake is modelled directly: when the boat drops from…
125. **The outboard (24.3):** `b.throttle` eases toward the input (up 1/0.6 s, down 1/1.2 s); rpm follows it (idle 900, full 4,500).
126. **Motor and hull sound (24.4):** `makeMotor(ctx, noise, dest)` builds the outboard in any audio context: a pulse train (31 harmonics at 1/√n) at rpm/60 with ±45-cent wander from low-passed noise, through the cowling (430 Hz…
127. **The sound kit (25.1):** `buildKit()` in `js/audio/engine.js` makes every buffer at unlock by plain sample arithmetic from fixed seeds (the plan said an `OfflineAudioContext` render; computing the samples directly gives the same…
128. **Splashes (25.2):** a splash's size picks the bank's row and its gain (0.02 + 0.07 × size) times distance.
129. **Line and reel (25.3):** charging opens the bail (a click in the reel's voice), the release whooshes (keener with the charge), the line hisses off the spool while the lure flies (louder and higher with its speed), and the bail…
130. **Biting and fighting (25.4):** a nibble ticks up the rod (`cue('nibble')`, with the rope's twitch); a bite is a knock and two ticks of the rod tip, with a pop when the lure is shallower than 2 m; the hook-set is a twang and a…
131. **Space (25.5):** splashes, rises, drips and pops go to `bus.water`, which passes a low-pass running from 18 kHz at the surface to 600 Hz under water (`18000 × (600/18000)^uw.alpha`) into the effects bus and into a convolver with…
132. **The mix (25.6):** every new layer goes through the master (mute and volume reach it: muted, master 0).
133. **The wake, simulated (26.1; replaces the scripted wake of #124):** `surface.js` has a third layer, `hw`/`vw`, a wave equation for the waves a moving boat makes.
134. **The motor before the boat (26.2; replaces part of #125):** the outboard's logic is now `boat.outboard(b, move, dt)`, called before `boat.step`, and `step` pushes the boat only while `b.motor` runs; during the 0.4 s pull-start a…
135. **Every lake cast drifts (26.3; replaces the lakes' direction rule of #111):** `G.data.lakeDrift` now sets each cast's direction from its seed (a bit of the hashed seed: left or right, half each) and sways its strength by ±`sway`…
87. **Bakes (17):** the shop room takes about 90 ms (at the travel fade's black), each cabin stage about 45 ms, the journal's book about 90 ms on its first opening (one long frame, once per session).
136. **A side-view tail beat (27.1; replaces Phase 19's tail flick):** seen from the side a beating tail sweeps toward and away from the viewer, so `paintLook` foreshortens it instead of dropping it.
137. **Turning frames (27.2):** frames 4 and 5 paint the whole look narrowed across about the canvas's middle to 0.6 and 0.3 of its length (`wx`/`PX` map through the squash; painted that way, never a scaled sprite), so a fish seen at…
138. **The swimming body (27.3):** `underwater.swimStep(run, dt)` runs in `sailing.update` before `ropeStep` and steps nine bodies (the school's eight slots and the hooked fish), each keyed by the fish's `uid` so a reused slot starts…
139. **Every swimmer through it (27.4):** the hooked fish's body takes its facing from `hook.face` alone (its thrash is in its position), its beat from the fight (4.5 Hz pulling, 1 Hz tired, 3 Hz while lifted), its pitch from its…
140. **Swimmer bake (27.1):** each species is baked in 5 frames (6 with the shimmer) × colour/silhouette × both facings at the travel fade, instead of 2–3. To pay for it a silhouette is now the colour frame's shape filled flat with…
141. **Heading and speed (28.1):** a school fish has `yaw` (0 swimming right, π left; in between it swims across the view, toward or away from the viewer, so its horizontal speed passes through zero as it turns, as a side view shows a…
142. **Burst and glide (28.2):** wandering and approaching fish burst toward 1.45 × the speed their state wants for 0.4–1.0 s, then glide (drag 0.9/s) until under 0.55 × it or 2 s, then burst again; a cycle's median is 1.78 s.
143. **Current and holding station (28.3):** `school.ctx.flowAt(x, depth)` (the scene sets it to `underwater.flow` on waters with `loc.drift`; `null` in the balance models, which have no current) carries every fish.
144. **Circling and nibbling by steering (28.4):** circling steers after a point 0.35 rad ahead on the same flattened circle (`circleK` 2.5/s closes the gap) at most 0.8 of top speed; the circle's angle advances as before, so circling…
145. **Baselines moved (28):** `--replay 12345` is `82118876` (18 catches, 19 casts).
146. **Runs (29.1):** while pulling, the hooked fish's path (`hookPos`) no longer shakes ±3 px across and ±2 px down at about 2 Hz, and the draw's ±1 px jitter is gone (only the wrongness twitch stays).
147. **Head shakes (29.2):** frame 7 (`FR.SHAKE`) paints the head from the gill (`HEAD_X` 0.62) forward foreshortened to 0.7, the head turned.
148. **The roll (29.2):** frame 6 (`FR.ROLL`) paints the fish listed onto its side: the back narrowed, the belly band widened with a pale flash (`Lb` one shade lighter), the dorsal fins foreshortened to 0.55 and the belly fins at 1.3…
149. **A cut-short jump falls back (29.1):** when a jump ended early (the fight turning tired mid-leap) the old clamp snapped the fish from up to 6 px in the air to 2 px under water in one step.
150. **Far shoals (30.1; replace the four lone far silhouettes):** three shoals (perch, trout, carp), 4–7 fish each (carp 3–4), in the far layer (parallax 0.5, wrapping every 640 px).
151. **Startle (30.2):** `fx.listen(fn)` (new) calls back on every `fx.splash`; the shoals map its world x to the far layer at the camera (`x − camX × 0.5 + 160`) and startle every fish within `30 + 60 × power` px (vertical distance…
152. **Cost:** at most 21 far fish (13 in the checked water): fish draw and under-water draw 0.1 ms; bakes for the shoals' frames (REST, AWAY, NEAR, TURN2, both ways, silhouettes) at the water's load. 59.9 fps.
153. **The rod as a beam (31.1, new file like R1):** `js/gfx/rod.js` (`G.gfx.rod`, loaded after `rope.js`) is 12 segments of 22/12 world px from the hands, the first two rigid (fore grip, reel seat).
154. **The load from the line (31.2):** `rodPose` gives `[angle, load, pull]`: the hands' angle as before, except the fight holds the rod higher (`waitAngle + 18 − 8T`, it was `+ 8 − 10T`), since the bend now brings the tip down; the…
155. **The rod's parts (31.3):** drawn in view pixels along the bent blank, two keys per part, nothing rotated (8.3 #84): a cork butt 4.5 px behind the hands along their angle with an ink cap (`wood_lit`/`wood_mid`), the fore grip, a…
156. **Debug (31.4):** `dbg.rodBody()` returns `{load, dir, tip, bendDeg, top3, butt, tier, taper, ms}`; `dbg.rodLoad(x)` forces the load (`null` gives it back); an overlay line `rod tier … load … bend … top3 … butt …`.
157. **Cost:** a solve is 0.021 ms in Node (1,000 random solves after warm-up, 21 ms); the draw is about 120 one-pixel rects.
158. **Why it bent both ways (31b):** measured through whole casts in the browser and over a sweep in Node.
159. **The solver (31b, supersedes #153's relaxation):** two shapes.
160. **The line's stretch (31b):** the load and the line's direction reach the blank through a 0.09 s lag (`K.stretch`), as a nylon line's stretch spreads a sudden pull; when the boat turns the local direction is taken at once.
161. **A stiffer, more tapered blank (31b, supersedes #153's numbers):** `K.power` 2.0 (1.1) and tip/butt 0.32, 0.26, 0.2, 0.15, 0.12 by tier (0.5 … 0.25), nearer real blanks (0.1–0.3), so under load the tip follows the line: with the…
162. **Load only through a tight line (31b):** `rodStep` scales a pull (any load over 0.05) by `1 / (1 + q²)`, `q = sag / (1 + 0.05 × span)`, never under the line's weight 0.02: a line that sags lets the rod spring back.
163. **Waiting, nibbles and the bite (31b):** waiting with nothing on, the angler takes in the slack the sink left (the line out eases toward `1.03 × span + 1.5` at 0.9/s; a lure that drifts away still draws line out): over 120 px of…
164. **The rod in front of the dog (31b, closes 8.4 #27):** it reaches out over the dog in the bow, so `boat.draw` draws it after him and the whole bend shows.
165. **Hands that move like hands (32):** `rod.solve` no longer takes the scene's angle as it is: the hands follow it critically damped at 2.5 Hz (`K.handsHz`), so a state change (40° waiting to 58° hooked, 70° landing to 50° on the…
166. **The cast loads the rod (32.2, replaces 31's ROD_BACK stand-in):** the hands' angular acceleration α is an inertial load on the blank's own mass (m ∝ d²) and, while it hangs at the tip, the lure's (`K.lure` 3 px of butt): joint…
167. **The line rides the tip until the lure flies (32):** during the stroke the rope is held collapsed at the tip every step.
168. **Head shakes as impulses (32.1):** `rod.kick(rad/s)` adds speed to the drawn joints, more toward the tip, the way the line pulls the settled shape; each head-shake twitch of the line (every 0.12 s) kicks the rod 3–5 rad/s…
169. **The bite through the tip (32.3):** 31b's tugs already satisfy it: the tip moves 7.7–9.8 px on a bite while the hands turn 0.10–0.17° (the task allows 2°).
170. **The reel (32.4):** `rod.reel(dt, turns, open)` keeps the handle's turn (`st.crank`) and the bail (`st.bail`).
171. **`--rod` gains the cast (32):** a 14th check runs the stroke as sailing.js does at every tier.
172. **A posable fisher (33.1, new file):** `js/scene/fisher.js` (`G.scene.fisher`, loaded after `boat.js`) replaces `boat.js`'s fisher art and its `sip` variant.
173. **Poses and easing (33.2):** a pose is the near and far hands' places (`rod`, `knees`, `holder`, `cup`, `mouth`); each coordinate is a critically damped spring at 12 rad/s, 32 going back to the rod.
174. **The rod holder (33.3):** a tube on the gunwale behind his hands (local −1, −4.5), drawn over the hull; in it the rod stands at 38° and still bends with the line: a bite bent it to −12° to −17° there.
175. **The idle director (33.4):** `fisher.step(fs, dt, {mode, input}, G.vrng)` from `sailing.fisherStep` (before `rodStep`).
176. **Debug (33.5):** `dbg.fisher()` returns `{pose, hands, holder, act, step, actT, idleT, wait, returning, head, item}`; `dbg.idle(name)` starts an act (null ends it).
177. **Plan wording:** 33.1's "within 4 px of painted difference" is read as the rod pose against the old painting (6 px, the far hand); 33.4's "back to the rod within 0.2 s" became 0.4 s, since the hand first fetches the rod from the…
178. **The lure hangs from the tip (34.1):** between casts (the sailing, charging and card states, not passive, no line out) and during the cast's stroke the lure hangs on 3 px of line under the rod tip: a pendulum…
179. **Preparing the lure (34.2):** the act `lure` (between casts, 8.95 s, picked with the thermos by `G.vrng`): the rod stood upright (96°) in the holder; line paid out (14 px/s, the bail open) until the lure hangs before his face…
180. **The holder moved before his knees (34):** to local (3.5, −4.5) from (−1, −4.5), so an upright rod stands in front of his face rather than across it.
181. **A tug along an upright rod (34):** the line from the tip to his hand runs nearly down the rod, which compresses it rather than bending it, and this soft blank buckles under compression from about 0.2 of its rating (a 0.6 pull…
182. **Sounds (34.3):** `cue('bait')` (a light, high tick as the bait goes on, twice) and `cue('hooked')` (a firmer tick and a small pop as the hook is set) from the act's steps; the engine's reel whir and clicks also run while the…
183. **The cooler (35.1):** a 12×9 view px cooler (a pale lid with a handle, a teal body lit on one side) on the floor behind him (local −5, −4), drawn before him and the hull so the gunwale hides its foot; on every water and in the…
184. **The beer (35.2):** three acts in both of the director's modes (acts now list their `modes`; the thermos plays while waiting too).
185. **The beer and the thermos (35.3):** `fisher.drink(fs, night)`: the thermos in the grey hours (`greyF(hour) ≥ 0.5`, passed as `night` by `sailing.fisherStep`); at dusk and night a beer, a sip or the empty by the can's state, the…
186. **Sounds (35.4):** `cue('crack')` (a high tick and the new `KIT.hiss`: noise with its lows removed by differencing, in at once, fading over about 0.35 s) and `cue('candown')` (the bite's knock pitched up 2.6×, quiet), synthesised…
187. **Debug:** `dbg.fisher()` adds `can`, `sips`, `beerRest`, `night` and `drink` (what he would drink now).
188. **The room (36.1, 36.2, new file):** `js/ui/shop_room.js` (`G.ui.shopRoom`, loaded before `shop.js`): a 12 × 8 map of 32 px tiles (384 × 256) at (128, 52), black around it, painted natively in the lake's keys (31 colours, all…
189. **The fisher on foot (36.3):** a top-down fisher (the red cap, the green jacket, dark trousers) in four facings, a standing frame and two walking frames each, painted natively (left is right mirrored).
190. **The dog follows (36.4):** the dog top-down (a yellow Lab nearly a tile long: four facings, standing, walking, sitting) takes the tile he leaves, faces where it goes and sits facing him when he stops.
191. **The bridge (36.5):** `shop.js` has two modes: `room` (walking) and `panel` (the old painted shop and its tabs).
192. **Debug:** `dbg.shop()` returns `{c, r, face, moving, steps, dog, mode, faced, bakeMs, room, blocked}`.
193. **Rusty top-down (37.1):** painted natively in `shop_room.js` (a pale canvas jacket, a white beard, a paper-coloured cap) behind the counter on tile (9, 2), drawn over the room above the counter's top; frames: standing, blinking…
194. **The text box (37.2):** along the bottom (24, 290, 592 × 62), a cream window in a dark wood frame with a paper rule, the retro-RPG way.
195. **The item window (37.3):** *BUY* opens a list (336, 14, 280 × 270) of every shelf's items (rods, reels, lines, the lantern, the finder, the four baits) with their icons, names and prices (OWNED, BEST, FREE when it applies; the…
196. **Text keys:** the box's text is `wood_deep` (`crimson` reversed); messages `moss_dark` for thanks, `rust` for too few coins; prices `rust`, states `stone`.
197. **Debug:** `dbg.shop()` adds `open` ('', 'box', 'choice', 'items'), `page`, `pages`, `choice`, `items`, `sel`, `from` and `rusty` (facing, frame); `mode` is gone with the panel.
198. **Shelves you face (38.1):** facing the rod rack (rods, reels, lines), the jar shelf (the unlabelled jar), the equipment shelf (lantern, depth finder), the worm box, the cricket crate or the minnow tank and pressing Space opens…
199. **What the shelves show (38.2):** drawn live over the baked room: the rack holds the rods above the one he owns (four at the start, one fewer for each upgrade, by the window or `dbg.buy`); the lantern and the finder sit on their…
200. **Debug:** `dbg.shop().shown` gives what the shelves showed in the last frame (`rods`, `lantern`, `finder`, `minnows`, `crickets`).
201. **The hour in the windows (39.1):** the glass shows the lake: five sky bands from `sailing.skyColor` (the lake's keys, rebuilt when the hour moves by 0.05), the far shore (`mount_far`, `pine_dark`), the water with a faint band of…
202. **The light in the room (39.1):** at night (`sailing.light().night`) a mask baked once darkens the room in four steps of 2 px cells (0, 0.18, 0.34, 0.5 of ink) away from a lamp hung over the rug, leaving the window glass alone…
203. **Life (39.2):** nine motes of dust drift in the lamplight at night, three bubbles rise in the tank, Rusty's cup steams on the counter (except while he sips from it), and the clock's hands follow the game hour (at 09:15 the…
204. **The strange (39.3):** at Fogbound's unease (`unease.get(save, 'fog')`, the shop's, 8.3 #23) of 0.4 or more, after 20–40 s and then every 40–80 s, one of: the clock's minute hand running back two turns over 3 s, or a pale figure…
205. **Sounds (39.4):** the door's bell (two soft sine tones) on entering and leaving the shop, in place of the page sound; a footstep (the bite's knock pitched up, quiet) on each step; the third board from the door (two above the…
206. **Touch (40.1):** the shop needed no new input code: in the shop `input.zone` already gives the left and right edges as left and right, the top and bottom middle as up and down and the centre as the action, so a held touch walks…
207. **Debug and the gallery (40.2):** `dbg.shopWalk('RRRUU')` walks him a tile per letter through the walk's own rules (turns, collisions; the direction let go once each step has begun, else a held key strode on) and returns
208. **Cleanup and cost (40.3):** the old painted room, leaning Rusty and tabbed panel went in Phase 37 (#193); now the last unused aliases (`hash`, `dither`).
209. **The helm is the boat's, not the director's (41.3):** `fisher.helmStep` runs from `fisher.step` on `ctx.helm`, which `sailing.fisherStep` sets while the scene is `sailing` without passive and the boat is not stopped, the cord is…
210. **Where things are (41.1–41.2), local px:** the clips hold the rod's butt at (-3.2, -5.1) at 2° above the facing, so it lies along the near gunwale with its tip past the bow; two short posts (2 and 10 px along the rod) are drawn…
211. **The cord (41.2):** on a pull-start (`boat.M.start`, 0.4 s) the far hand reaches back to (-5.6, -5.4) for its first 35%, then pulls to (-1, -9.6), on the fast spring; a cream line runs from the motor's head to the far hand…
212. **The lure under way:** the plan's keeper ring became the tip-top: while the rod is in the clips the hanging line is reeled to 1 px (`fs.line`), so the lure rides snug under the tip and barely swings, and it lets back out to 3 px…
213. **Checks (41.4):** `dbg.sail(dir, s)` steers as a held key would (through `sailing.sailMove`), and `dbg.fisher()` gains `helm`, `helmT`, `clips`, `cord`, `steer`, `stows`, `tiller`.
214. **The woof (42.1):** synthesised into the kit at unlock (`buildKit`, three takes, 0.24 s each): a pulse train falling from 330 Hz to about 215 Hz over 0.12 s through two resonators (550 and 1400 Hz, the second also fed a puff of…
215. **When the dog speaks (42.2):** `dog.voice(d, dt, ctx, rng)` returns a woof to play (0 or 1) per step and is stepped by `sailing.update` (after `dog.step`) and by the shop.
216. **The legendary cue is heard (42.2):** `cues()` now also asks for a `cue` bout (2 woofs), which skips the 90 s rule; with barks off it plays no woof and the silent `bark` pose shows as before (10.3).
217. **The setting (42.3):** `save.settings.dogBark` (default true).
218. **Checks (42):** `dbg.bark(why)` asks for a bout (no argument: the next idle bout in 1 s) and returns `{bouts, said, since, next, last, want, on}`.
219. **Rods are a rack (43.1, 43.5):** `save.gear.rods` lists the rod indices owned and `save.gear.rod` is the one in hand; save v5's migration owns every rod up the ladder to the one in hand (each was bought on the way).
220. **Small fish and the rod (43.4):** `fight.start` multiplies the hook hold by the rod's `smallHook` when the fish's mass is under `rodSmall.frac` (0.15) × the rod's `maxMass`: Cane 1, Fibreglass 0.95, Graphite 0.9, Lacquered 0.82…
221. **Lures (43.2):** five in `gear.lures` (Brass Spinner, Minnow Plug, Soft Grub, Cup Popper, Feather Jig) with `attract`, `rareBoost`, a price per lure and a pack size, and how they fish: `swim` ('mid', 'dive', 'bed', 'top'…
222. **Lost and run out (43.5, the user's answer):** a lure is not used up by a cast; `economy.loseLure` takes one when the line **snaps** in active play (`underwater.catchStep`), the HUD says so for 4 s ("Lost the Brass Spinner. 1…
223. **Who takes what (43.3):** each species has `lures: {id: 1 | 2}`: 2 loves it, 1 takes it, a lure not listed is ignored.
224. **Where a lure fishes (43.6, the scene and the models):** in `underwater.lureStep` a lure sinks at `sink` × the bait speed down to `maxDepthM` (spinner 7 m, the grub and the jig to the bottom, the jig 1.8× as fast); the popper…
225. **Lure art (43.6):** each lure is a shape in `underwater.BAITS` on the 12 px lure grid with its two phases: the spinner's blade face-on and edge-on (turning faster as it moves), the plug's flank flash on a tight wobble and its…
226. **The shop (43.5):** the rack lists all six rods (OWNED / ON, or a price; Space buys one or takes an owned one in hand) with the reel and line; the rack shows the rods not yet his in five slots in their blanks' colours.
227. **Balance (43.7):** `--tackle` fishes each hook for an hour at each water with that stage's rod (4 seeds) and counts net coins (baits per cast, lures when they snap).
228. **What did not move:** the pacing model fishes worms and buys rods up the ladder, and its rods' `smallHook` changes its holds only for small fish; `--replay 12345` is still `82118876` (no thrown hook in those 20 minutes changed)…
229. **Small fish (44.1):** ten species appended after the 36 (so every index stays): Fogbound the Dim Fry, the Reed Stickleback and the Wick Minnow (at night); the creek the Gravel Darter and the Penny Dace; the Pines the Napkin…
230. **The size curve (44.2):** `economy.sizeQ(u, data)` = u^`economy.sizeCurve` (1.6) from the same single `rng.next()` as before, in `underwater.hook`, `passive.plan` and the pacing model; `economy.size(sp, q, out)` gives the length…
231. **Small swimmers (44.3):** `fishgen.small(i)` sends a small species to `paintTiny`, a plain painter: a spindle body (back, flank and belly rows, deeper for perch, carp, koi and catfish), an eye, a dorsal pixel on the deep ones, a…
232. **The rod feels the fish (44.3):** `rod.fishLoad(kg, maxMass)` = (kg / (0.15 × maxMass))^0.6, at least 0.08, 1 for anything heavier: it scales the fight's load, the hook-set's surge, the landing's weight and a head shake's kick…
233. **Balance (44.4):** small fish's base prices 4–6 (the Thimble 6 × 2.5): at 2–4 the creek's median was 59 min.
234. **What did not move:** the rods, `rodSmall`, the lures, their prices and losses, `passive.incomeMult` (0.63; passive 64.4% of active, in its band) and the fight constants.
235. **The panel (46.1):** `G.ui.panel` draws, in the 640×360 view's pixels and palette keys only: `frame(ctx, x, y, w, h, title, aside, asideKey)`, a rectangle in `night_ink` with a one-pixel `paper` rim and 1 px cut corners, a title…
236. **The catch card (46.2):** 232 × 82 at the top centre (204, 8), sliding down from above in 0.25 s; nothing is dimmed.
237. **Pause (46.3):** a 176 × 136 list at the right edge (456, 112), titled PAUSED: Resume, Volume (ten ticks), Sound, Dog barks, Export save, Import save, a message from export or import wrapped to two lines, and the W/S and A/D…
238. **The tape (46.3):** a 240 × 140 panel at the top centre: the tab "PLAY > AWAY" (or PASSIVE), the water's name on the aside tab, seven rows (was twelve over the whole screen), the SP counter and the totals, and the keys (SPACE…
239. **The map (46.3):** the chart stays as it was (a full-screen paper chart, not a small menu); its place strip became a 240 × 74 panel at the bottom left (8, 278), clear of every stop and label: the stop's name on the tab, its text…
240. **The shop's item window (46.3):** two 240-wide panels at the top right instead of the cream list, box and coins: the list (140 px, six 16 px rows with the item's icon at 14 px, the name, its price or OWNED/BEST, ON or the count…
241. **The `setup` action (45.1):** `G.core.input` gains `setup`.
242. **Petting by a tap (45.1):** `sailing.dogTap(gx, gy)` is true on the dog's sprite (12 × 10 world px, 2 px of slack round it), worked out from the boat's state the way `boat.draw` places him, only when he can be petted (the boat…
243. **The panel (45.2):** `G.ui.setup`, a 240 × 132 panel at the top centre (200, 8), titled TACKLE: ROD and HOOK headers (the active one in `bone`), six rows a column.
244. **Live while open (45.2):** not an overlay: the scene runs (the clock, drift, fish, the dog), but while it is open the panel has the keys: the boat does not sail, nothing is cast, the fisher's idle director waits (mode null), and…
245. **Touch (45.2):** an on-screen S button (528–564 × 332) next to M; TAB, J and M moved 32 px left to make room (the mouse shows the buttons from x 420).
246. **On the boat (45.3):** the drawn rod is `save.gear.rod` and the hanging lure `gearFx.bait`, as before, so both match the save in the frame after a pick.
247. **What did not move:** `js/sim` and `data` are untouched; the replay hash, pacing, passive, fight, rod and tackle numbers are unchanged.
248. **Look records (47.1):** `data/looks.js` (`G.data.looks`), loaded after `data/anomalies.js`.
249. **The fisher's painter (47.2):** `fisher.js` paints the body, collar, three head tilts and both arms from the look's ramps (the coat with `ink` below it; the far arm a step darker, as before).
250. **The dog's painter (47.2):** `dog.js` sets the breed around each painting (`img`, cached per breed): `ear()` and `tail()` draw each shape on the existing poses (a husky's ear stands even when calm and does not stream in the…
251. **The shop room's sprites (47.2):** `paintFisher` and `paintDog` take the look (trousers, coat, skin, the hat from above in four shapes, a beard facing down or to the side, the checks; the dog's ears, tail, pale legs, blaze or…
252. **The picker (47.3):** `G.ui.look`, an overlay (the world waits behind it, like pause) in the small panel, 232 × 124, titled FISHER & DOG: two cells, FISHER and DOG, each a 56 px preview (him at 4×, hands on his knees, and the…
253. **`save.look` (47.3):** `{ fisher, dog }` ids, default `{ fisher: 'red_cap', dog: 'golden' }`.
254. **Gallery and what did not move:** three gallery pages: `fishers` (every look in every pose, its head and item as the acts have them, both facings, at 1×), `dogs` (every breed in every pose and frame at 2×, the wind on the alert…
255. **Where the life lives (48.1–48.3):** a new `js/scene/life.js` (loaded after `underwater.js`), presentation only: `G.vrng`, typed arrays sized once, stepped from `underwater.viewStep` on every step (also while sailing, so the bed…
256. **Bed life (48.1):** crayfish (5 view px tall, two leg frames) walk at 2 px/s, rest 2–6 s, turn; a splash within 36 + 30 × power px across makes each back off after 0.08 + d/400 s (at most 0.28 s; measured 0.083–0.200 s for 0–42…
257. **Fry, tadpoles, visitors (48.2):** clouds of 14 fry by the weed strands (spread along the water, at 0.5–0.9 of a strand's height) and of 6 tadpoles near the two shores 5–13 px under the surface (there are no shallows in the…
258. **Silt (48.1, 48.3):** a pool of 64 motes in `S.shift(silt, 1)`, puffed up by a walking crayfish (one every 0.8 s), a backing one (5), the eel (one every 0.5 s), the lure on the bed moving (2 every 0.2 s: dragged, drifting or…
259. **More plants (48.3):** in the three weed frames, from their own stream (seed × 31 + 204; the bed's things use + 203, so the older layout is unchanged): ribbon weed (clumps of 2–4 blades 16–46 px tall, one pixel wide and two…
260. **Left for Phase 49:** the diving duck's feet and body and the heron's beak through the surface (2.9's food-chain beat) need the birds above, so they are a `TODO(P49.1)` in `life.js`.
261. **dbg and the overlay:** `dbg.life()` (crayfish with mode and pending reaction, snails, clouds with `off` (the furthest member from its place), `calm` (s since anything came near) and `overlaps`, the visitors, silt, the last…
262. **Where the life above lives (49.1–49.4):** the second half of `js/scene/life.js`, presentation only (`G.vrng`, a few small arrays, stepped first thing in `life.step`, every step, also while sailing; at dusk with six creatures…
263. **Water birds (49.1):** *Ducks* (Fogbound, the creek, the Pines): a hen (mottled brown, an eye stripe, a teal wing patch; a hen, not a drake, leads young) and 3–4 young following in a line, paddling at 2 px/s to points in their…
264. **Small life and the shore (49.2):** *Dragonflies* in two zones near the shores by day, darting at 40 px/s between hovers of 0.4–2 s, 3–14 px above the water, never within 24 px of the boat.
265. **Background objects (49.3):** `paint.js` has three more silhouettes (a spruce spire, a dead tree with a broken top, a poplar column; a kind without its own keys borrows pine's or round's), now in the mixes of Fogbound's two…
266. **The liminal touches (49.4):** from unease 0.6 (`LA.limU`) a weight comes in at 0.25/s (0 to 1 in 4 s) and goes the same way.
267. **What else changed:** `life.WATERS` is gone (`life.table(id)` reads `loc.life.under`); `underwater.prepare` records the lilies (`set.lilies`, world x and pad width, from the plants of 48.3); 48's `TODO(P49.1)` is done (the…
268. **dbg and the overlay:** `dbg.lifeAbove()` (each creature of the water's table: alpha, place, px from the boat on screen, what it is doing; the touches and the liminal weight; how many strikes, takes, dives, plops, calls and…
269. **Gallery pages (50.1):** six pages after `looks top`.
270. **Posing life for the gallery:** the code-drawn creatures read their live record, so the painters take one: `drawHeron(c, camPx, wyS, under, H)` and `heronNeck(camPx, wyS, H)` (H defaults to the heron),
271. **`dbg.tackle(rod, hook)` and `dbg.look(f, d)` (50.1):** `dbg.tackle(rod, hook)` puts an owned rod (index or id) in hand and a hook you have on (a bait or lure id), as the setup panel would: `gearFx` is worked out at once, the…
272. **The night frame (50.2):** headless Chromium at 1280×720, Fogbound at 21:30 (drizzle 0.78 at unease 1), the liminal heron standing still, the loon, the frog and the beaver out, an anomaly on in 720–721 of 722 frames (forced…
273. **What did not move:** `js/sim` and `data` are untouched; the replay hash, pacing, passive, fight, saves, rod and tackle numbers are as in 8.5.
274. **RELEASE on the card (51.1):** the card has three keys, SELL, KEEP and RELEASE (A/D move, Space or a tap picks; `G.ui.card.keys().release`).
275. **The toss (51.2):** `sailing.js` `releaseStart/releaseStep/drawRelease` and `fisher.toss` (s into the swing, -1 otherwise).
276. **Checks (Phase 51):** headless Chromium, `?debug&seed=7`, Fogbound at 12:00: `dbg.give('gloam_perch', true)`, → → Space on the card: `choice` 'release', the far hand at (0.21, −6.13) at 0.32 s, (6.39, −10.07) at 0.52 s with the…
277. **What went (52.1):** the TAB action, its key and its on-screen button (`input.js`); `sailing.js` passiveOn/Off/Step, the float, the passive rod pose, the passive lift (`plift`), `setPassive` and the overlay line; the HUD's "TAB…
278. **What stayed (52.2):** the save keeps `lastSeen` and `tapes` (old saves carry them; nothing writes tapes now), and journal pages marked `phantom` by an old tape still read as before.
279. **Checks (Phase 52):** `--passive` is three PASS lines: no passive sim and no `passive.incomeMult`; no TAB key, button or time-away call at boot; a save away for hours loads with the coins and journal it was saved with.
280. **The data (53.1):** `gear.lineTypes`: monofilament (free; every factor 1, so every number tuned before Phase 53 is its), fluorocarbon (140c: strength ×0.95, tension rise ×1.06, slack-shake hold loss ×1.08, +0.03 hook-set hold…
281. **The fight (53.2):** `fight.start` reads `lineRise`, `lineShake`, `lineHold`: the pulling fish's tension rise and a jump's spike are × rise, the hold lost in a slack shake or jump × shake, and the hook-set's hold + hold (at most…
282. **Line-shy fish (53.3):** `fish.lineShy` on the ash trout (creek, rare), the neon koi (Pines, uncommon) and the lamp koi (Red Room, uncommon).
283. **Feel and look (53.4):** a nibble's and a bite's nods of the rod tip × `lineFeel` (braid shows every touch); the line drawn in the type's key and alpha (mono fog_light 0.6, fluorocarbon fog_light 0.28, braid moss_hi 0.8…
284. **The model (53):** `tools/balance.js` buys fluorocarbon after the creek (PLAN gains 'fluoro'); `--tackle` compares lures with the line left out (`unseen`: line-shy fish bite, the fight is mono's), which reproduces its pre-53…
285. **Checks (Phase 53):** `--validate` (and `--strict`) OK; `--replay 12345` still 1966984761 (20 minutes never reach a line-shy fish); `--pacing` all PASS, medians 6.0 catches, creek 45.1 min, Red Room 345.6 min; `--fight` seven…
286. **The journal (54.1):** two panels side by side (`LP` 8,8 300×344 and `RP` 316,8 316×344) replace Phase 17's open book (its bake, `journal:book640`, is gone).
287. **The map (54.2):** the chart is a panel, THE WATERS on its tab and the coins beside it, over the world (no dim; the travel fades stay).
288. **The shop and the cabin (54.3):** Rusty's text box is a panel with RUSTY on its tab, his words in bone (a reversed line in neon_red), the more-to-read arrow in amber; Buy/Talk/Leave is a small panel list with the chosen row on…
289. **Checks (Phase 54):** headless Chromium (`?debug&seed=7`): the journal with 12 species recorded, the map, Rusty's box (walked with `dbg.shopWalk('UUURR')`), the item window and the cabin, each screenshotted and looked at; no…
290. **When and how strong (55.1):** `stormK()` in `sailing.js`: an hour is stormy when `hash(loc.seed, hour × 31 + 7) % 11 === 0` (Fogbound 3 hours of 24, the creek 3, the Pines 1, never the Red Room, whose sky has no clouds), rising…
291. **Lightning (55.2):** every 6–18 s divided by k (G.vrng) a flash: fog_light over the sky at up to 0.4 and over the water at up to 0.18, a flicker (0.7 for 0.06 s, 0.2, then 1 for 0.08 s, then fading at e^−6t), dimmer the further…
292. **Thunder (55.3):** `G.audio.engine` cue 'thunder' (a = distance 0..1), fired 1–4 s after its flash (1 + 3 × dist): looped noise through a low-pass at 170 − 80 × dist Hz whose cutoff wobbles (an LFO of 1.3–2.3 Hz, ±50 − 20 × dist…
293. **Checks (Phase 55):** `dbg.storm(k)`, `dbg.storm(null)`, `dbg.storm()`, `dbg.flash()`, an overlay line (storm k, flashes, next).
294. **The ask (Phase 56, 2026-10-31):** "Improve tackle shop and cabin.
295. **Interior palette (56.1):** 52 keys added to `sprites.js`: 70s panelling (`panel_*`), mustard, burnt orange, olive, dusty pink, lavender (4 each), a CRT's blue (`crt_*`), chrome (4), brick (3), plant greens (`leaf_deep` ……
296. **`G.gfx.pix` (56.1):** a grid of palette keys to paint small things on before they reach a canvas: shaded ellipses (`ell`), capsules (`cap`), polygons with a shading function (`poly`), slabs, lines, patterns over what is painted…
297. **The people (56.2, `js/ui/room.js`):** the fisher 32×48 (was 32×32), feet at y 46: a figure in proportion (head ~1/4, shoulders, a tapering jacket with collar, lapels, zip, chest pockets and folds, sleeves with cuffs and hands…
298. **The kit (56.3, `js/ui/room_kit.js`):** planked floors (boards in staggered lengths, each its own tone, grain strokes, knots, nail heads, light read per board), a 70s panelled wall (beam, tall boards with grooves and water…
299. **The shop (56.4):** the same 12×8 map, objects and walk as Phase 36–43 (every shelf, Rusty and the door where they were), with the back wall now 44 px taller above row 0 (the room is drawn at (128, 8), 384×300).
300. **The cabin (56.5):** a room you walk into, like the shop: 12×8 tiles, the door at (4,7), log walls.
301. **Sound and checks (Phase 56):** three cues in `G.audio.engine`: 'strum' (a chord of Cmaj7, Am7, Fmaj7 or G6 plucked low to high, 35 ms apart, a little out of tune), 'keys' (the chord together, a slow attack), 'record' (the…
302. **The ask and the plan (Phase 57, 2026-11-01):** the user asked for the game to be playable from a PC as now or from a phone, planned before anything else is added. [PLAN_MOBILE.md](PLAN_MOBILE.md) has four phases: 57 the page on…
303. **Touch mode and the fit (57.1):** `G.core.device` (new, `js/core/device.js`, loaded after `input.js`) owns the canvas's size and place; `index.html`'s `fit()` is gone and the canvas is placed by `left`/`top` instead of a CSS…
304. **The page (57.2):** `user-scalable=no`, `touch-action: none` and `overscroll-behavior: none` on the page (the canvas had it already, the black margins did not), no selection, callout or tap highlight.
305. **Portrait (57.3):** the game is landscape only (PLAN_MOBILE.md §3).
306. **Touch fixes (57.4):** "Fishing in another tab" (12.5) was cleared only by `mousedown` or a key, and `input.js` cancels a touch's mouse events, so a phone could not take its save back: `touchend` on the canvas reclaims too, and…
307. **dbg and checks (57.5):** `dbg.device()` (touch, coarse, portrait, fullscreen, standalone, viewport, dpr, insets, scale, whole, css size and place, fill, fsAsked and its result, the lock, fits, the audio's state) and an overlay…
308. **The touch layout (58.1, `input.js`):** in touch mode (`G.core.device.touch()`) `hit()` reads a second layout, `input.layout()`, filled into preallocated records each call (`TB` buttons, `PAD`, `ACT`, `LAY`); with a mouse only…
309. **Drawing (58.2, `hud.drawTouch`):** keys and pad keys as the old buttons (ink at 0.7, a 1 px `fog_dark` rim, amber while held), arrows as rows of pixels, the round button baked for its size (up: `fog_mid` rim on ink; held…
310. **The word (58.3):** `sailing.actionWord()` from the state only: the card's choice (SELL, KEEP, RELEASE), PICK with the setup panel, CAST stopped or charging (nothing while the boat moves, when a press does nothing), REEL…
311. **The rooms (58.4):** the pad becomes a cross of four (up, left, right, down) at the bottom left; at 844×390 it ends at x 131, 3 px over the shop's outer wall (the room starts at x 128), never over its floor.
312. **What did not move:** `js/sim` and `data/` are untouched (every Node check as in 8.5); a PC with a mouse sees no touch layout (`showButtons()` false until the mouse comes near, `hit(600, 340)` still the old ESC, nothing at the…
313. **The key table (59.1):** PLAN_MOBILE.md §2b lists every key each scene and overlay reads (from the code) with its touch.
314. **The row rule (59.2):** in touch mode `input.zone()` asks the open overlay (`G.ui.menu.tap`, which hands it to the overlay's `tap(gx, gy)`), or the shop's or cabin's box (`shop.tap`, `cabin.tap`, while `busy()`), after the…
315. **Each overlay (59.2):** pause: the rows; on the selected Volume row a tap on the ticks left of the level is `left`, at or right of it `right`.
316. **The still picture by touch (59.3):** a touch on P in touch mode is held back until it lifts: shorter than 0.6 s (`LONG`) it is P (pressed and let go in one step), longer it presses `still` (H) while the finger is still down, by…
317. **Full screen in the pause list (59.3):** a 'Full screen on/off' row after Dog barks, only where `device.canFullscreen()` (touch mode, an element full screen, not from the home screen: so not on an iPhone's Safari); the panel…
318. **What did not move:** `js/sim` and `data/` are untouched; the save's version is 6 as before; every Node check as in 8.5. Phase 57's and 58's browser scripts re-run on the final code: 22 and 17 PASS.
319. **A phone's frame (60.1):** measured in headless Chromium on an 844×390 phone (3×) with the CPU throttled (CDP `Emulation.setCPUThrottlingRate`), the debug text hidden: at 1× every frame holds 60 fps (lake at night with an…
320. **The phone budget (60.1):** `G.core.device` checks the frame rate once a second; in touch mode, two seconds running under 50 fps (`SLOW_FPS`) raise the level by one, to 2 (`MAX_LEVEL`), never back within a visit (so it cannot…
321. **The gallery (60.2):** two pages at the end: `touch` (the J M S P ESC keys, the four pad arrows, the round button with each of its 17 words and with none, one of each held, at the sizes for the screen it is on, with those sizes…
322. **The icon (60.2):** `device.paintIcon(px)` paints a 32×32 grid of palette keys scaled up whole (a dusk sky to `dusk_amber`, a `dusk_high` moon so nothing passes the dusk ceiling, pines, the water with the moon's path, the boat…
323. **How to play on a phone (60.3)** is step 7 of HANDOFF.md's "How to continue": `--bind 0.0.0.0`, the computer's address, holding it sideways, adding it to the home screen, the controls, saves (over plain `http://` the clipboard…
324. **The ask (Phase 61, 2026-11-01):** "solve the known issues please", after the four open items of 8.4 the phone plan left (#34–#37). #34 (play it on a real phone) needs a phone and is left to the user; the other three are done…
325. **The hints on a phone (#36):** `G.ui.panel.hint`/`hintW` show a label through `shown()`: in touch mode SPACE is TAP, W/S and A/D are left out (rows are tapped), 'W/S A/D' (the journal) is TAP, and J, M and S as "close" are ESC…
326. **The icon files (#37):** `node tools/icon.js` paints `G.core.device.ICON` (the 32×32 grid of palette keys, now exported; the gallery's notice page still paints it in the browser) with the palette of `sprites.js`, loaded as the…
327. **`--rod`'s cost (#35):** the check's 0.05 ms limit was not the machine: `rod.js` ran in an empty `vm` context, where every global (`Math`, `G`) is looked up through Node's sandbox, and a solve cost 0.052 ms there against 0.036…
328. **The ESC key over open panels (#38, found while checking #36):** in Phase 58 ESC alone went to the top-right corner whatever was open, and covered the shop's item window's coins (and the top-right corner of the map's and the…
329. **The ask (Phase 62, 2026-11-01):** "find issues that are not solved and solve them please".
330. **Head shakes and the rod's load (#28):** `rod.kick(amount)` now scales the impulse by the load the blank holds, `min(1, st.load / K.kickLoad)` with `kickLoad` 0.5: a shake reaches the rod through the line, so on a slack or…
331. **The journal's first opening (#24):** since Phase 54 the book is gone and the opening cost 37–51 ms in headless Chromium (the grid's portraits; 8.4 said ~90 ms for the book).
332. **The old sprites (#25):** the `owl`, `moon` and `hud_coin` sprite definitions (Phase 10, replaced by painted art in Phase 18) are removed from `sailing.js` and `hud.js`; nothing drew them but the gallery's sprite list.
333. **The ask (Phases 63–67, 2026-11-01):** the dog in the shop smaller, in real proportion; the cabin and the shop alive (a lava lamp, a late-90s game console, more details, reflections); lures that move as real ones on the retrieve, more…
334. **The dog to scale (Phase 63):** the rooms' dog was 40×32 beside a 32×48 fisher, two thirds of his height.
335. **What makes a room lived in (Phase 64):** the user named a lava lamp, a late-90s game console, more details and reflections.
336. **The cabin's new tiles:** the fan (5,1), the fridge (9,1), the side table (6,4) and the console (7,3) block at every stage (a crate, a dead fridge, a crate or a box of cables stand there before the stage that brings them), so…
337. **Reflections:** `K.reflect` lays a stretched, stepped streak (2 px rows, fading as the square of the distance, narrowing to 45%) on the boards under a lit thing, before the standing things are drawn, so they cover it; the lamps'…
338. **The retrieve (Phase 65.1):** reeling used to move the lure across at 30 px/s and up at 22 px/s whatever its depth.
339. **The bobber and the spoon (65.2):** `swim: 'float'` with `carries: 'worm'`: the float lies on the surface and the worm sinks to maxDepthM under it; the line ends at the float (`lurePos`), a dotted leader runs down to the worm…
340. **The cast (65.3):** the flight's horizontal path is eased by 1 − e^(−1.7u) (normalised to land on x1, the drag scaled down for short casts) while the height stays a parabola in time, so the lure leaves fast, tops out early and…
341. **The replay:** the Node session only reads a lure's depth (min of the water's and maxDepthM) and fish.lures, so the hash stays `1966984761`; `--tackle` gains the bobber and spoon rows.
342. **The chart's detail (Phase 66.1):** baked once in `paintChart` with the rest: hachures under every peak, a dotted contour 9 px outside each lake and a depth contour at 42% of its radii, the deepest sounding in metres (maxDepth ×…
343. **Navigation (66.2):** the arrows used to step through the list in order (up and left back, down and right on).
344. **Where the pier is (Phase 67.1):** `data/loc_fog.js`: the pier landmark from x 300 to 96 (it paints ±34 world px, so 62–130, by the west edge), a new `sign` landmark at 50 (a post with two boards painted in the fine font; the…
345. **Docking (67.2):** `G.ui.dock` (js/ui/dock.js) steps from the sailing scene after the setup panel: with the boat within reach of `dock.x`, stopped, the line in, it opens THE PIER panel once per arrival (`armed` is set when the…
346. **The map's trips:** choosing the Bait Shop or the Cabin on the map now loads Fogbound if needed and ties the boat up at the pier (x 126, the panel disarmed) before the scene changes, so coming back out you are at the pier, where…
**Phase 68, the species (2026-11-02, PLAN_SPECIES.md).** The user asked for every fish to be one of the reference list's species and every lure one of its lures, redrawn at its resolution; they answered the plan's questions: our…
347. **The roster (68.1):** `data/fish.js` holds 59 species: the reference's 68 entries are 58 open-water species, 9 "(Ice)" entries of the same fish, and Tiger Muskie, which the list has only as an ice entry.
348. **Where they live (68.1):** Fogbound (a cold glacial lake) 12: perch, walleye, rock and smallmouth bass, pike, lake trout, Arctic char, cisco, lake whitefish, two suckers, burbot.
349. **Who bites (68.2):** `fish_ai.weightOf` starts every species of the water at 1 and multiplies by what is on the hook (`TAKE_W` 0 / 1 / 2: a live bait in `baitLikes` is 2; a lure by `lureTypes[lure.type]`, and only when the…
350. **Size classes (68.1–68.2):** `G.data.SIZE_CLASSES` S (under 0.45 kg), M (to 2.3), L (to 9.1), XL (to 27), XXL, the reference's bands; `G.data.sizeClass(kg)`.
351. **Prices (68.4):** one rule, written in `data/fish.js`'s header: `price = round(V × mass^0.75)`, at least 3, with V 12 for species buyers value low (suckers, carp, minnows, shad, mooneyes, the small whitefish, bullheads), 20…
352. **What went with the rarities (68.2):** the legendary spots are ordinary spots with `attract` 1.3 (`cold_hole`, `black_pool`, `lane_deep`, `floor_drain`); hidden spots keep `attract` 1.6 and lose `rare`; the Red Room's lamp…
353. **The journal (68.2):** the rarity filter is a family filter (`all` and every family with a species in some water); species with no water are left out of the list and its count.
354. **Save v7 (68.3):** the v6 → v7 migration empties the journal, the fish kept for the wall and the tapes, and resets `flags.heavy` and `flags.lateAt`; coins, gear, baits, lures, waters opened, the cabin, settings and looks stay.
355. **Costs (68.4, tuned with `--pacing`):** the 8 lb line 40 → 120 (Fogbound's catches are worth about 30 coins from the first cast; with 40 the first upgrade came after 2 catches), the Red Room 5500 → 4800. Every other cost is as…
356. **Real takes added while balancing (68.4, each true of the fish):** northern pike take nightcrawlers (often caught on a worm under a float) and hybrid striped bass too; white bass love spinners (`spinner: 2` beside crankbaits)…
357. **The pacing model fishes minnows in the Pines and the Red Room (68.4):** `P.baitAt` (worms at Fogbound and the creek, minnows in the Pines and the Red Room), bought ten at a time with the model's own coins when it runs out.
358. **Checks moved with the roster:** `--validate` drops the hint and roster-by-rarity checks and the small-fish count (two small species now, the dace and the threadfin shad, whichever real species are that small) and adds: every…
**Phase 69, the tackle (2026-11-02, PLAN_SPECIES.md).**
359. **The 23 lures (69.1):** `data/gear.js` lures are the reference's, with its names, types and size classes: Bobber (S–M) and Deep Bobber (S–L) carrying a worm at 1.5 and 5 m; Crankbait (S–M), Big (L–XL) and Deep Crankbait (XL–XXL)…
360. **The new actions (69.1):** `swim: 'dropshot'` holds the hook `dropM` (0.5) m over its weight on the bed: it sinks there, is dragged slowly along the bed while reeled (its hook kept at that height), and is drawn with the weight…
361. **Size cover (69.1):** a lure made for some size classes draws only the share of each species that is that size: `fish_ai` weights the species by its cover (the share of its catches, by the size curve, inside the lure's classes)…
362. **`--tackle` on new terms (69.1):** with 23 lures, many made only for big fish, no lure can fish every water on each stage's rod (a Deep Crankbait has no taker in the creek).
363. **Real takes added while balancing (69.1):** rainbow trout and Dolly Varden take a dropshot (`dropshot: 1`): drop-shotting for rainbows is common, and both feed along the bottom.
364. **The shop and the setup panel (69.2):** the lure case (`SHELVES[3]` and the case's shelf items) is filled from `data/gear.js` at load.
365. **Save v8 (69.2):** v7 → v8 moves each old lure's count to its new lure by `G.data.gear.oldLures` (spinner → Spinnerbait, plug → Crankbait, grub → Wacky Worm, popper → Topwater, jig → Jighead, spoon → Small Spoonbait; the Bobber…
366. **Placeholder art (69.3):** each lure has `look: {base, swap}`: the old lure (or the minnow, for swimbaits) it is drawn as and palette keys swapped to tell the sizes apart (teal deep crankbaits, chrome heavy spoons, flesh…
367. **The real-fish painter (70.1):** `fishgen.paintSpec(id, spec, maxW, maxH, frame, swim)` paints a species from its anatomy spec in `data/fishlooks.js` (`G.data.fishLooks[id]`, format at the top of the painter) into a key grid…
368. **Palette (70.1):** 67 `fish_` keys in `sprites.js`: a six-key body ramp per species, back to belly (the three temperate basses share `fish_silver`), the bluegill's breast (4), three shared four-key fin ramps (olive, grey…
369. **How a fish is shaded and drawn (70.1, 8.3 #84):** the body is flat bands of its ramp that follow the profile (depth v from back to belly, stops per species), a sheen band one key lighter on the upper flank, an inner rim one key…
370. **Sizes (70.1):** a spec's `px` is its native length; the ten measure 64–99 × 41–59 px.
371. **Swimmers (70.1):** a painted species swims as painted from its spec, in every frame, in a box of `swimLen` px: 26 + 0.4 × its mean length in cm, from 30 to 60 (a perch 35, a striped bass 58), instead of its body plan's box.
372. **The `fish` gallery pages (70.3):** `fish:0/20/40` now show every species' portrait at its native size on the plate's colour, 20 a page, with its name and size (placeholders marked); the old swimmer pages became…
373. **`--validate` (70):** every spec belongs to a species; `px` 40–104; the body's points rise in x with top above bottom; a ramp of 4–6 keys with one stop fewer; head, tail, fin ramp and fins present; every key the spec names and…
374. **The reference icons (70):** fetched for comparison into the session's scratchpad (not committed; they face left, ours face right as the game's fish do).
375. **Timing (70):** in headless Chromium, the first bake of a painted portrait costs about what a placeholder's does: a journal tile 0.8 ms median (max 4.2, the first while the code warms), its silhouette 0.6, the plate 2.0 (max…
376. **What the painter gained (71.1):** in `js/gfx/fishgen.js`, data-driven like the rest.
377. **Palette (71.1):** 160 more `fish_` keys (227 in all).
378. **The salmonids (71.2):** shared helpers in `data/fishlooks.js`.
379. **Sizes (71.2):** native 79–96 × 35–49 px (the reference 82–100 × 40–54, their fins drawn larger).
380. **The gallery (71.3):** the `fish:20` and `fish:40` pages show them with the rest (data order).
381. **Timing (71):** headless Chromium, first bakes of the 22: the plate (104×60) 2.5 ms median (max 4.2), the card (96×56) 2.1 (max 4.7), a swimmer frame 0.6 (max 2.2, 154 frames).
382. **What the painter gained (72.1):** in `js/gfx/fishgen.js`, data-driven as before (the format at the top of the painter).
383. **Palette (72.1):** 190 more `fish_` keys (417 in all): 27 six-key body ramps (pike, musk, tigm, carp, chub, dace, pea, pkm, wsuck, lsuck, redh, lgsuck, bull, chan, burbot, sturg, moon, gold, tshad, herring, amshad, eul, cap…
384. **The 27 (72.2):** pikes long (depth about 0.29 of the length) with the dorsal and anal far back over each other, a long toothed mouth, a pike's bean spots, a muskie's ragged bars, a tiger muskie's vermiculation; the carp deep…
385. **The old painter deleted (72.3, 8.4 #39, #42):** `BASES`, `BASE_NAMES`, `PALETTES`, `PARTS`, `generate`, the parts' painters, `SHAPES`, `paintLook`, `SWIM`, `baseSwimmer`, `partSwimmer`, `frameCount`, `swimFrames` and…
386. **Silhouettes (72.3):** `fishgen.shadow(id, len, frame, flip)` paints a species' silhouette from its spec in a `len` px box: the far shoals are a yellow perch (34), a rainbow trout (40) and a common carp (38), the old perch…
387. **The swimmers checked (72):** every species paints frames 0, 1, 3–7 inside its `swimLen` box (`--validate`); a scratchpad sheet of the 27 shows each one's rest, tail-away, turn and roll frames and its journal tile.
388. **Timing (72):** headless Chromium, first bakes of the 27 after a warm-up: the plate (104×60) 2.6 ms median (max 8.4), the card (96×56) 2.0 (max 6.9), a swimmer frame 0.5 (max 7.9, 189 frames), a shoal or heavy-shadow silhouette…
389. **The lure painter (73.1):** `js/gfx/luregen.js`, pure and deterministic like `fishgen.js` (grids of palette keys; only `iconImg` and `spriteImg` bake canvases, lazily).
390. **The looks (73.1):** `data/lurelooks.js`, one per lure id: `kind`, `len` (the icon's px end to end; a float's is its height) and `uw` (the sprite's view px end to end), and the kind's own ramps and numbers.
391. **Under water (73.2):** `underwater.lureImg` hands a lure to `luregen.spriteImg` (its own square box, at most 40 px, centred on the lure; the dropshot's centre is its hook) and keeps the four baits' shapes.
392. **Icons in the UI (73.2):** the shop's case lists each lure with its icon painted to fit 16×14 (`LURE_ROW`), and the item panel shows the chosen lure at its native size at the right, its text wrapped beside it.
393. **Palette (73.1):** one ramp, `lure_chart_0..3` (chartreuse, muted to sit with the palette), the one lure colour nothing had.
394. **The placeholders deleted (73.3, 8.4 #43):** `look: {base, swap}` on every lure in `data/gear.js` (and its comment), `paint.swap` and its pen, the shop's seven old lure icons (spinner, plug, grub, popper, jig, bobber, spoon) and…
395. **The checks (73):** `--validate` (`validateLureArt`) errors on a lure with no look or a look for no lure, an unknown kind, `len` outside 24–48 or `uw` outside 8–20, an icon outside 20–48 × at most 40 (a float 12–20 × 30–44) or…
396. **Timing (73):** headless Chromium (software rendering), baking all of it at once: the 23 icons at three sizes and all 1,088 sprites (16 headings × each frame) took 743 ms, about 0.7 ms a sprite.
397. **The new waters' data (74.1, PLAN_WATERS.md 2):** six files, `loc_copper.js` (10 m, 1400 px, 800c), `loc_harts.js` (32 m, 1400, 2400c), `loc_stone.js` (8 m, 1300, 3400c), `loc_russet.js` (24 m, 1300, 4800c), `loc_sound.js` (40…
398. **Painted with what exists (74.1):** the rivers and lakes use the old layer kinds (mountains, fog, forest, trunks, bank) and landmarks (pier, snag, marker, wreck) with their own seeds, keys and mixes: Copperbend's maples and…
399. **Rivers share one current (74.1):** `G.data.riverDrift(L, seed, t, depth, onBottom)` in `loc_creek.js` is Blackwater's drift as it was, moved out so Copperbend (3.4 px/s) and Stonehorn (4.6) use it with their own `current`…
400. **Species by water (74.1, PLAN_WATERS.md 3):** `locations` holds every water a species has a home in, from the plan's tables; no species is left without one (the journal and the map's `stocked()` now see all 59).
401. **The Red Room retired (74.2, PLAN_WATERS.md 4.4):** `data/loc_red.js` is deleted with its scenery module (`scenery.red`: the moving furniture, curtains, zigzag floor, `ROOM_THINGS`), its map stop, its reverb (`IRS.red`) and its…
402. **The audio per water (74.2):** reverbs for the six new waters (`IRS`: tight in the rivers, 0.35–0.6 s; long and dull at sea, 2.2–2.4 s; the lakes like Fogbound and The Pines) and the stream's level per river (`STREAM`…
403. **The chart (74.3, PLAN_WATERS.md 4.6):** nine water stops plus the shop and the cabin.
404. **Pacing and tackle with the new waters (74.3):** the pacing model's route is unchanged except that **Russetwood** takes the Red Room's step (same cost, 4800; `PLAN` and `TARGETS` key `russet`, "location 4 (russet)" with the same…
405. **Homes (75.1, PLAN_WATERS.md 4.1):** `data/fish.js` replaces each species' `locations`, `habitat` and `timeLikes` with `homes`, `[{loc, reaches, depth: [min, max], bed, hours}]`, written from the plan's §3 (a species that lives…
406. **Who bites where (75.1):** fish_ai's weight uses the species' home at the reach the lure is in (`ctx.reach`, set every step from the lure's x in `stepSchool`); a species with no home there does not come.
407. **The reach's name (75.1, PLAN_WATERS.md 4.2):** the HUD shows the name of the reach the boat is in, quietly (bone, 0.9 at most, fading in and out) at the top centre for 3.5 s, whenever the boat crosses into another reach or…
408. **The journal (75.2):** a caught species' page gives one line per home from its first catch: "Hartsmere Lake, The Old Bench: 20 to 32 m, at dawn." (with "on the bottom" for a bed home, "at any hour" for none).
409. **`dbg.who()` (75.2)** works out the reach the lure is in (or the boat, with no line out), weighs the species of that reach, and names it (`reach`).
410. **The checks (75):** `validateFish` errors on a species with `habitat` or `timeLikes` (replaced), with no home, on a home with an unknown water or reach, a depth outside the water, `bed` other than true, or an hour name not in…
411. **The sea fish's fights (75):** with the sea's species in waters, `--fight`'s pool gained the strongest fish in the game and failed (8.4 #47).
412. **Burbot in Copperbend (75.1, 8.4 #50):** with depths per water it lives in Hollow Reach at 6–10 m on the bottom, at night.
413. **Live baits (75):** the six salmon that took worms (Atlantic, Coho, Sockeye, Pink, Chum, Masu) take minnows only, and so does Northern Pike: in rivers salmon take roe and at sea herring, and pike are taken on minnows, not worms…
414. **`--tackle` by reach (75):** the model fished one place (x 600) at one depth per water, which with reaches is one reach, often one where the hook's fish do not live.
415. **The pier's rows per water (76.1, PLAN_WATERS.md 4.3, 8.4 #49):** `G.ui.dock` keeps two fixed menus, with The Cabin (Bait Shop, The Cabin, Stay on the water) and without it (Bait Shop, Stay on the water), and picks one when the…
416. **A signpost at every pier (76.1):** each water has one `sign` landmark beside its pier's shore end: x 50 for the piers at 96 (Blackwater, Copperbend, Hartsmere, Stonehorn, Russetwood, as at Fogbound), 284 for The Pines' (330)…
417. **The checks (76):** `--validate` errors on a water with a dock but not exactly one signpost, a signpost more than 80 px from the dock, a signpost whose CABIN board disagrees with `dock.cabin`, and on `dock.cabin` anywhere but…
418. **A current per reach (77.1–77.2, PLAN_WATERS.md 4.5):** `loc.drift` takes a sixth argument, the lure's world x (`underwater.js` passes `cast.x1` in all four places).
419. **The `surface` and `things` scenery parts (77.1):** the river's live water draws after the waterline and the pier's posts (`scen.surface(c, run, loc)`), since the layers' `afterLayer` is drawn before the water and anything at…
420. **Copperbend's scenery (77.1):** landmarks (parallax 1, baked with the landmarks layer): the bridge (four trestle bents braced in X, stone abutments, stringer, plank deck and rail, its deck 23 px over the water) over The Split…
421. **Stonehorn's scenery (77.2):** four granite boulders (r 8–14 px, a lower second lobe, cracks, lichen, wet at the foot) at 236, 352, 452 and 612 with `foam`; the white water over 170–700 (70 streaks at 22 px/s, 12 standing waves).
422. **The osprey and the eagle (77.3):** two new creatures in `life.js` (`ABOVE_KINDS` gains them).
423. **What each reach has (77):** `dbg.shore().reaches` names, per reach, the landmarks standing in it and the scenery's live parts; `dbg.life().reaches` and `dbg.lifeAbove().reaches` name the creatures whose range reaches into it (a…
424. **The checks (77):** `--validate` checks `current.reach` (rivers only, known reach ids, flow in (0, 3], sink in (0, 1]) and drives `drift` at four x across the water as well as without x.
425. **Bed shapes (78.1–78.2):** `underwater.shape`, `[[x, depth px], ...]` from x 0 to the width, draws a water's bed through those points (smoothstepped between them) roughened by a small walk from its own stream (seed × 31 + 207)…
426. **Hartsmere's scenery (78.1):** landmarks: two stands of white birches (a near birch of its own: a 3 px pale trunk with black marks, an open drooping crown of small clumps, an eighth of them gold) at 300 and 1070; Birch Point (a…
427. **Russetwood's scenery (78.2):** landmarks: reed beds standing in the water at 205 and 612 (stems and cattails, tallest in the middle), eight drowned stumps (silvered, broken-topped, some with a stub of branch) over 410–550, the…
428. **The otter (78.3):** `otter: {n, x, log, hours}` in `life.js` (`ABOVE_KINDS`), up to three: they swim with their heads up and a V behind (6 px/s), arch and dive (1.5–3.5 s under at 11 px/s, a ring where they go and come up), and…
429. **What each reach has (78):** the lakes' `things` add 'weed beds' and 'dam far off' (seen from Mink Cove) to `dbg.shore().reaches`; the scenery's debug line names the reach and the bed's depth under the boat.
430. **The checks (78):** `--validate` checks a bed shape (from 0 to the width, in order, 4 px to maxDepth) and that each reach's bed is deep enough for every home there (its deepest point at least a metre past the home's shallowest…
431. **`?tour` (2026-11-03, asked for by the user: "give me access so I can see all the maps"; not a phase):** with `?tour` in the URL the map treats every water as open (`map.verdict` → travel, its card says "Open for the tour…
432. **No depth scale (78b.1):** the depth finder's ticks and labels down the left edge (`hud.drawBands`) are gone.
433. **The cross-section reaches the view's bottom (78b.2):** `underwater.prepare` bakes it at least `VIEW_H - waterY + 8` px deep (76 px), not only `maxDepth + 24`, so a water shallower than about 13 m (Stonehorn 56 px, Copperbend…
434. **No lantern light (78b.3):** the halo round the boat's lantern (boat.js `bakeHalo`) and its cone of light into the water (underwater.js `drawCone`, which shone from the bow while the lantern hangs at the stern) are deleted.
435. **Bites by species (78b.4):** `G.data.biteStyle(f)` (data/fish.js: a species' `bite`, else `BITE_OWN`, else its family's in `BITE_BY_FAMILY`) gives tap (18 species: perch, sunfish, small minnows, whitefish, herring, smelt…
436. **A lure must be worked (78b.5):** `lure.work` (0..1) reaches fish_ai from the scene: underwater.js `workStep` scores the retrieve by the lure's style (`STYLE`, from its `swim`): steady (dive, mid, glide) by the share of the time…
437. **Not every fish is feeding (78b.5):** a quarter of the fish that come (`W.passBy` 0.25, drawn at spawn) only pass by, whatever is on the hook, and swim on after `A.passT` 8 s so they do not hold the school's places; arrivals are…
438. **Reeling the lure up out of the water (78b.6):** a lure that comes out of the water on the retrieve hangs on all the line between the tip and where it broke the surface (up to 70 px), swinging (`dg.up`); holding the action key…
439. **Tying on only on a change (78b.7):** the fisher no longer prepares the lure as an idle between casts (`fisher.choose` gives a drink there); he ties one on only when the setup panel changed the hook or the rod (the 'tie', 'swap'…
440. **Piers from the shore, no signposts (78b.8):** every pier landmark has `from: 'left' | 'right'` and runs from that edge of the world out to 68 layer px past its x, the rail at its shore end and the lamp post at its water end…
441. **The storm is heard (78b.9):** thunder (engine.js `thunder`, `rumble`) is a deep low-passed rumble and a low-mid band small speakers can play, in two or three rolls each softer, peaking at 0.16 + 0.07 near (a big splash is 0.17…
442. **The seas' scenery module (79.1, PLAN_WATERS.md 4.5):** `js/scene/seas.js` is one module for both seas (`loc.scenery` 'sound' and 'wreck'), beside the rivers' and the lakes'.
443. **The tide (79.1):** `loc.sea.tide {amp, high}`: amp × (0.5 + 0.5 cos(2π (h − high) / 12.42)) world px, presentation only.
444. **The swell, whitecaps and surge (79.1):** `swell.clamp` (view px) lets a water's surface stand past the lakes' ±3 (surface.js `clampH` per water; the seas 5). sailing.js multiplies the storm's roughening by `loc.sea.storm` (1.8…
445. **The lights (79.1):** at night (from night 0.08) the lighthouse's lamp is lit and its beam turns once every 12 s: seen from the side it swings out to one side to 150 px, shortens as it turns toward us (a flash at the lamp) and…
446. **The bed (79.1–79.2):** `underwater.rockBed [[from, to]]`: bare rock in the water's rock keys for 14 px down where the others have sand, and more and bigger boulders from their own stream (× 31 + 209), added to `set.rocks` (the…
447. **Coldharbor and Wreckhollow (79.2):** Coldharbor: Lamplight Head (x 170, half 190, 46 px high; lighthouse at 236, tower 30 px; its lamp 72.8 px over the water), the bell buoy at 430, the skerries at 646 (hs 8, 12, 10, 5) and 848…
448. **Sea life (79.3):** `life.under` takes `crab` (the walkers are crabs: the crayfish's arrays and behaviour, a crab's sprite), `star` (the climbers are starfish, 0.1 px/s, never pulling in at a splash), `anemone` (baked) and…
449. **`dbg.sea()` (79):** at sea
450. **The checks (79):** `--validate` checks a sea's `sea` block (only at sea and required there; tide amp 0–4, high 0–24; storm 1–3; caps 0–0.6; kelpTop inside the world), `swell.clamp` 3–6, `kelp` and `rockBed` in order inside the…
451. **No lantern, no finder (79b.1, the user's word):** `data/gear.js` loses `lantern` and `depthFinder` (it keeps `nightDepth`, 56 px: fish deeper than 14 m are silhouettes at night, for everyone now); `economy.effects` gives…
452. **Save v10 (79b.1):** the migration from v9 adds 250 coins for a save with the lantern and 180 with the finder (the numbers written in save.js, as the Red Room's refund: their data is gone) and deletes both fields.
453. **Blackwater's price (79b.2):** the pacing model bought the lantern and the finder (430 coins) before Blackwater, so without them it reached Blackwater in 29.0 min, under V8's 30–50. Blackwater costs 550 (was 300): 36.3 min at…
454. **Tamarack Lake (80.1):** `data/loc_tamarack.js`, 1400 px wide, 28 m (maxDepth 112), cost 0 with `need: {seaSeen: true, text}` (the one condition left since Phase 68; `--validate` allows it only on an ice water).
455. **Snow and ice keys (80.1):** `snow_deep..snow_lit` and `ice_deep..ice_lit` in the palette, all under the dusk ceiling (the sky-and-water check now covers them); `shift()` never picks them.
456. **The (Ice) species (80.2):** `ice_<summer id>`, built at load from the summer species (body, fight, sizes, live baits), `of` naming it; `price` = round(summer × `ICE_PRICE` 1.25); `lureTypes` kept to `ICE_TYPES` (float, spoon…
457. **Winter looks (80.2):** sprites.js makes two cold copies of every `fish_` key: `fish_w_` (desaturated 40%, mixed 28% toward a blue-grey) and `fish_d_` (desaturated 35%, 30% toward a deep blue).
458. **The ice's gear (80.3):** `gear.snow` {Snow Machine, 2000, rod 6}; rods 6 (Ice Rod: free with it, `grant: 'snow'`, 5 kg, sizes S–L) and 7 (Hardwater Rod: 1000, `need: 'iceAll'`, 16 kg, sizes XL–XXL, attract 1.15, small mouths…
459. **Save v11 (80.3):** the migration from v10 adds `gear.snow` false, `gear.iceRod` -1 and `flags.seaSeen` from `unlocks.sound || unlocks.wreck`; `sailing.load` sets `seaSeen` on arriving at a sea (not on a tour).
460. **`--homes` (80.2):** reads PLAN_WINTER.md §3 with PLAN_WATERS.md §3, matching a species by its exact name first (so "Yellow Perch (Ice)" is not the summer perch): 125 rows, 69 species.
461. **Pacing past Russetwood (80.3):** the model's plan goes on after Russetwood to Coldharbor Sound, the Snow Machine and Tamarack Lake; the 20 seeds still stop at Russetwood (medians unchanged), and `pacingIce` plays seed 11 on…
462. **`--fight` and the ice (80.3):** the (Ice) species are fought on the two ice rods (rows ice6 and ice7, with the best reel and line, as after the seas), not on the ladder's tiers (the Muskie (Ice) at 5 kg would otherwise join…
463. **The ice mode (81, PLAN_WINTER.md 5's risk):** no copy of the cast, the rope, the dangle, the fight or the camera.
464. **The Snow Machine (81.1):** `boat.create(x, ice)`; `boat.step` on the ice: top speed × 1.5 (63 px/s), acceleration × 1.3, no idle drift, braking drag × 1.6. `boat.draw` draws `drawSled`: the machine (painted 64×18 view px: track…
465. **Drilling and the drop (81.2):** the hole is cut `K.holeDX` 16 px ahead of the boat's centre along its facing (under the rod tip).
466. **Under the ice (81.2–81.3):** `drawUnder`: over the cross-section's top, `ice.thick` (6 px) of ice (ice, a lit top row, a darker lower face) cut 4 px wide at each hole still open; by day a soft fog_mid shaft below each hole…
467. **Jigging (81.2):** on the ice every lure's work style is `jig`: `work = (changes between moving and still per s) / goFull × (1 − max(0, moving share − 0.55) × 2.5)`, a fall counting 0.9, live bait and float rigs 1. Reeling lifts…
468. **The fight through a hole (81.3):** at the hook-set the hole (`h.hx`) and the side the fish took it from (`h.side`) are kept; the fish's x is the hole's plus `side × min(D/D0 × dist, 120)` (dist from the hole), its depth eases…
469. **The holes skinning over (81.3):** a hole he is not at (the drill point more than 12 px off, or riding) and not fishing gains `left` at a game hour per real minute; at `loc.ice.freeze` (3 game minutes) it is gone (`frozen`++)…
470. **`--tackle` on the ice (81):** `TACKLE_WATERS.tamarack` is the Ice Rod (6) with the best reel and line; only the hooks that go down a hole are fished there (the open-water lures are `-`).
471. **Tamarack's scenery (82.1):** `js/scene/winter.js`, loaded after seas.js.
472. **The ice from above (82.2):** ice.js's baked sheet: drifts as irregular lit crests with a lee of snow and snow_dark, only along some 70 px stretches (no stripes), scoured patches, glints; its night grade 0.72 of night_deep.
473. **Snow and the blizzard (82.2):** a scenery with `winter` makes `rainK` 0 and draws `drawSnow` instead of the rain: `snowK` = a fall in one game hour in three (hash of the hour and the place, 0.7, faded over the hour's edges) or…
474. **Winter life (82.3):** `life.above.hare {n 1-3, layer, x, hours}`: snowshoe hares (white, dark ear tips) sit at the woods' edge, hop a few lengths now and then (14 px/s), and bound off into the trees (30 px/s, fading) when the…
475. **The checks (82):** `--validate`: hares and ravens only on the ice (and a white fox), their fields, a fox's layer has a base, nothing of open water (ducks, herons, loons, frogs, otters, seals, ...) above the ice, and nothing of…
476. **`dbg.winter()` (82):** on the ice {snow, blizzard, flakes (drawn last frame), flashes, thunder}, null elsewhere; the scenery's overlay line shows the reach, the bed, the snow, the blizzard and the flakes.
477. **The Back Pond (83.1):** `data/loc_pond.js`, id `pond`, 400 px wide (the view is 320, so the camera moves 80 px; a quarter of Fogbound's 1200 would not fill it), maxDepth 24 (6 m), cost 0, no condition,
478. **The back door (83.1):** the cabin's map has a `b` tile at (11, 3) and an object `backdoor` there (WORD OUT, hint "the pond"); `room.walker(map, objects, mat, doors)` takes more ways out ([{c, r, dir, id}]): walking right off…
479. **THE PIER at the pond (83.1):** `dock.menuOf` gives a water with `pond` its own rows, The Cabin and Stay on the water ("Up the steps to the back door."); no Bait Shop (the shop is at Fogbound's pier, round the front).
480. **The pond's scenery (83.1):** `js/scene/pond.js` (module `pond`, loaded after winter.js): `backwall` (log courses with chinking and log ends, a shingled eave, two four-pane windows with sills, the back door with three steps down…
481. **The moose (83.2):** `life.above.moose {layer, x, hours}` (`--validate`: only at the pond, on a layer with a base).
482. **The pond's life (83.2):** ducks (with three young), the heron at dawn only (04:30–09:00), dragonflies, the frog on six lilies, striders, three fry and three tadpole clouds, snails, caddis cases and algae on the bed, no crayfish…
483. **The trash (84.1, `data/pond.js`):** `G.data.pond` {streamCost 750, rodKg 7, clearHours 1, shyHours (Phase 85), kinds, pieces}.
484. **The pond's rules (84, `js/sim/pond.js`, pure):** `save.pond` {got: a bit per piece fished out, stream, clear 0..1, stock (Phase 85)}; `left(p, data, kind)`, `parts` (21 + the stream = 22), `done`, `full`, `clean` (full and…
485. **Hooking trash (84.1):** underwater.js `trashTouch` in the waiting and interest states at a water with `pond` (before the bite step): the lure on a piece hooks it (waiting → interest → hooked, the FSM's way) with `hook.trash`…
486. **`fight.js` steady (84.1):** `fish.steady`: mode `tired` from the start with no end (modeT, shakeT 1e9), so no runs, shakes or jumps, and no draw from the RNG at the start; reeling shortens D by reel / √mass while the tension…
487. **The trash's card (84.1):** `card.buildTrash(i)` {trash, kind, name, lines}: the tab is the piece's name, the piece painted at 3× in the portrait box, its line ("An old boot. Into the bin with it.") wrapped beside it, one key…
488. **The stream (84.2):** dock.js has a second stop at a water with `pond`: within 50 px of `pond.stream` while the jam is in it, THE STREAM panel (Clear the jam, Leave it; "750c. You have N.", or "Not enough coins."), opened as the…
489. **The meter and the clearing (84.2):** hud.js at the pond: "Cleanup" and a bar of 22 segments (teal_hi done, teal_lit once full, fog_dark to do) under the hook's name, fading with the corner; once clean, "Pond n / 12" (Phase 85).…
490. **Save v12 (84.2):** the migration from v11 adds `pond` {got 0, stream false, clear 0, stock []}; the defaults have it.
491. **Sizes caught (85.1):** `economy.recordCatch` adds the catch's size class id (S, M, L, XL, XXL by its weight) to `journal[id].sizes` and counts `sized`; no migration (absent is none).
492. **Stocking (85.1, `js/sim/pond.js`):** `freshwater(sp)`: not an (Ice) species and living in some water that is not a sea or the ice.
493. **The STOCK row (85.1, journal.js):** shown on a caught species' page while he is at the pond: a key `STOCK <class>` (lit when it can be stocked) and its line ("Space: one goes in, free. Pond n / 12.", "Catch it in every size…
494. **The pond's fish (85.2):** sailing.js `pondFish` sets `school.ctx.pondN` at the pond to the stocked fish free to bite by species id (not shy, less those already in the school; all zero until the pond is clean); fish_ai's…
495. **The card at the pond (85.2):** a card with `pondK` has no SELL key (KEEP first, RELEASE chosen; left stops at KEEP), and says "Yours, from the pond" where the price would be; `commit` turns any sell into a release, records the…
496. **Trophies (85.2):** `pond.trophyKg(sp)`: the species' own `trophyKg` (the Tiger Muskie (Ice)) or the weight one catch in ten reaches.
497. **Pond Cam (85.3):** Space on the TV (from the rug-and-lamp stage) steps off → the game → Pond Cam → off (`tvMode`); Pond Cam draws on the CRT's screen: a teal gradient, seven weed strands swaying from the bottom, the stocked…
498. **His seat on the ice (86.1):** on the ice `boat.bob(b)` is the seat line's height over the ice, not the heave: `ICE.ride` 7 px on the machine, `ICE.sit` 4 on the bucket, eased by `b.sit` (stepped in `motion()`, smoothstep).
499. **Legs (86.1):** `fisher.drawLegs(ctx, sx, y, f, ax, ay)`: the hip at local (0.5, -2.5), thigh 5.5 and shin 5 px, the knee the IK solution that comes up; the ankle on the running board (1.5, 1.5) or before the bucket on the ice…
500. **The handlebar (86.1):** the director's ctx gains `bars` (sailing: on the ice).
501. **The dog's body (86.2):** `dog.js` `sitting()` paints the far foreleg, the haunch, the back as a limb from the rump to the withers, the chest, a neck to the head, the pale chest, the hind paw forward and the near foreleg with…
502. **The Snow Machine's art (86.3):** `sled` 84×32 view px drawn at (mx − 19, wy − 16); `box` 36×16 at (mx − 40, wy − 8), drawn after the dog; `bucket` 12×12. Facing left mirrors every place.
503. **The lure under the tip (86b.1):** a line pulls but never pushes, so `dangleStep`'s pendulum (sailing.js) is clamped after each step: θ within `DG.thMax` (1.25 rad) of straight down, bouncing off it at `DG.bounce` (0.25), ω…
504. **Depth tint (87.1):** `underwater.js` `depthTint(ctx, w, h, q)` lays `water_dark` over what is painted only (`source-atop`) in bands of `TINT_STEP` 8 px (2 m), `TINT_PER` 0.035 more each band, to `TINT_MAX` 0.5; run at the end…
505. **The bed behind (87.2):** `backBed()`: for each of its columns x (0 .. width × 0.85 + 324) the near bed's x is `(x − 160) / 0.85 + 160` (they line up at the view's centre), its depth the near bed's mean over 101 px less a lift…
506. **Far motes (87.2):** 28 more specks at parallax 0.5, alpha 0.3, drifting by time alone (0.6 px/s across, 0.8 down); placed by `sprites.hash`, not `G.vrng`, so no other visual's stream moves.
507. **The structures (87.3):** `structures()` (stream `seed × 31 + 211`) runs in the bed's bake right after the strata, before the boulders, so the older layout is unchanged and boulders lie in front; `rowboat()` (stream `+ 213`)…
508. **dbg (87):** `dbg.bed()` returns the counts of each structure at the current water, the rowboat's world x, the bed behind's width, parallax and haze, and the tint's step (m), share per step and most.
509. **The UI layer (90.1):** `G.ui.panel.configure()` (from `device.fit`) turns the layer on in touch mode or with `settings.textSize === 'large'` (never `?compact` or the gallery).
510. **Where panels sit (90.1):** `place()` anchors on the picture (on the screen when wider than it).
511. **Thumb sizes (90.2):** `rowH()` is max(12, 28 CSS px) and `btnH()` max(11, 44 CSS px) on a touch layer, else 12 and 11. The pause list, the setup panel, the pier's panel and the shop's list use `rowH()`; the card's keys and the…
512. **Controls in the margins (90.3):** in touch mode `device.fit` puts the picture at 60% of the spare width (on whole device px); `input.layout()` works in UI px: the keys (Journal, Chart, Tackle, Menu; the short word when the long…
513. **Touch leftovers (90.4):** the first touch of a load wakes only (`input.woke()`): it presses nothing.
514. **The shared pieces (90.5):** `panel.button(ctx, label, x, y, w, h, state)` (idle, chosen, pressed 1 px down, disabled), `buttonW`; `row()` draws a 2 px lit edge so a choice never shows by colour alone; `fadeIn(t0)` from the UI…
515. **Settings (90):** `settings.textSize` ('normal' | 'large') and `settings.tips` (Phase 88) are read with defaults (no version bump), and the pause list gains Text size, Tips and Controls.
516. **Tips (88.1):** `G.ui.tips` steps from `hud.update` and draws from `hud.draw` (hidden under any panel, the card, the setup and the pier's panel).
517. **The fight in words (88.3, 89.3):** for the first three fish landed, HOOK while a fish is on the bite, then REEL in `tired` and EASE in `pull`, as a lit key cap with a few words, on the PC and the phone alike.
518. **Working a lure (88.4):** the retrieve by `swim` (steady: dive, mid, glide; stop-and-go: lift, flutter; top; slow: dropshot, wacky; jig on the ice), said in the shop's item text and the setup panel's line; on the water…
519. **Why it got away (88.2):** the fight's end says on the HUD (4 s): the line snapped (and the lure's loss, as before), it threw the hook on a slack line (`fight.thrown`), or it ran off.
520. **Controls and the hook-set (88.5):** the Controls page is an overlay (`menu.open('controls')`, from the pause list's row; back returns to the list).
521. **Side runs (89.1):** `underwater.js` RUN {flip 0.7, w0 26, wMass 34, massRef 4 kg, speedK 1.3, inK 2.6, outK 1.4, vcap 16 px/s, reach 150}.
522. **Seen and heard (89.2):** a new run puffs silt off the bed within 14 px (`life.silt`, now exported) and 3 bubbles; while pulling, bubbles at 7 a second × (0.4 + 0.6 × stamina), doubled in a head shake (pooled fx).
523. **Measured, not 30 fights:** the plan asked for 30; 12 a side were run (each fight is real time).
524. **Offline (91.1):** `sw.js` keeps one cache (`softstatic-v1`).
525. **Keep the save (91.2):** `device.askPersist()` on the first touchend, mousedown or keydown; `persisted()` is true, false or null (no API, or not answered).
526. **Vibration (91.3):** `device.buzz(kind)`: bite 18 ms, hook [30, 40, 30], slip [12, 30, 12, 30, 12]; only in touch mode with `settings.vibration` on; each call counted in `info.buzz` whether `navigator.vibrate` exists (an iPhone…
527. **The pause list is built (91):** `menu.js` ALL holds every row in order and `buildItems()` keeps those that apply (Full screen where `canFullscreen()`, Vibration in touch mode), replacing the two fixed lists; `menu.items()`…
528. **Resting (93.1):** `G.ui.cabin` owns it (PARTS dawn, day, dusk, night from `G.data.HOURS`; `partStart`, `partNow`, `restUntil`, `restStep`, `restAlpha`): a 0.45 s fade out, then `save.clock` = the part's first hour…
529. **The bed's box (93.1):** `open = 'rest'`: one line by the cabin's stage and four `panel.button`s in a row (at least 56 UI px wide, `btnH()` tall, so 44 CSS px on a phone); A/D choose, Space rests, Esc closes; a tap on a button…
530. **The pier's WAIT (93.1):** WITH, PLAIN and POND gain *Wait on the pier* before *Stay on the water* (dest `wait`); WAIT's rows go `rest:<part>` and Back (back to the pier's rows on the Wait row).
531. **When (93.2):** `economy.partOf(hour)` (pure, from `G.data.HOURS`); `recordCatch` sets `j.bestAt` with every new best length, from `save.clock` at the moment it is recorded.
532. **Volumes (92.1):** `settings.music`, `world`, `effects` (0..1, default 1, read with defaults).
533. **Reduce flashes (92.2):** `sailing.flashF()` with `settings.reduceFlashes`: 0.25 × sin(π t / flashLen) × the distance's dimming, no flicker steps; the sky and water overlays use `dusk_high` instead of `fog_light`, so a sky pixel…
534. **Reduce motion (92.2):** `panel.fadeIn()` returns 1 at once (every panel that fades and slides: pause, setup, the pier, the journal), and `camStep` eases at half `CAM.k`.
535. **Reel by toggle (92.2):** `input.reelToggle(active)` runs each fight step from `underwater.js` (active while the fsm is `fighting` and `settings.reel` is 'toggle'); a press flips a latch (off at the fight's start) and…
536. **Prices (96.1, 96.2):** exactly the plan's proposal; each water's old cost is noted in its file.
537. **The pacing model (96):** with the old order (line, reel, rod, then the creek) the creek waited on 490c and came at 24.5 min, and Russetwood at 159.9 min behind the third tier of gear (cutting the third tier to 650/350/300 still…
538. **The ice against the sea (96):** with the Snow Machine at 1250 the model is at sea only about 17 minutes before buying it, too short a sample (the sea's rate read 4919 against the ice's 5083, then 6494 against 4013 on another…
539. **Buy 5 (96.3):** the shop's lists get a row under every lure (a shelf of its own, `FIVE_ROW`, never on a room's shelf) that buys five packs in one action (`buyBait` with 5 × pack) and puts the lure on the hook; it has no icon…
540. **The first taker (96.4):** `fish_ai` ctx.first (set by the sailing scene and the balance model from `economy.anyCaught(save)`): `firstTaker()` sends, FIRST.delay 1 s after the lure goes in, one fish of a species picked as usual…
541. **`--first` (96.4):** the pacing's 20 seeds, each from a fresh save until a fish is landed (the card done): 18.8–42.5 s, median 23.4 s; PASS under 60. Before the bias: 37–100 s (median 55.6).
542. **Milestones (94.1):** each is `{id, name, test, arg, reward, icon}`; the waters' rows are made from `G.data.locations` (all but the pond) by `G.data.milestoneWaters`.
543. **When they are judged (94.1):** in the page, `G.ui.milestones.step(dt)` from the boot loop's update (every scene but the gallery): twice a second, and at once after the card writes a catch; a payment autosaves (`milestone`).
544. **Save v13 (94.1):** migration 12 adds `milestones: {}` and `flags.msSeed`; the first `check()` on such a save marks every milestone it already meets as reached and pays nothing, then clears the seed.
545. **The page and the line (94.1, 94.4):** `menu.open('milestones', from)`: from the pause list (back to its Milestones row) or the journal (M; back to the journal; the journal's foot shows *M milestones* on a PC).
546. **The first-catch bonus (94.2):** `gear.firstCatch {min: 10}`; `economy.firstBonus(sp)` = max(min, round(sp.price)); `recordCatch` pays it on a species' first catch whatever the choice and returns it.
547. **The badge (94.3):** `G.ui.badge.show(info, journal entry before the catch)` from `card.open`: a new class (not in `j.sizes`, or no entry) shows *NEW SIZE: X*, else a heavier fish than `bestW` (the card's RECORD) shows *NEW…
548. **Pacing with the rewards (94):** with milestones and bonuses the first upgrade comes after 2 catches and the creek in 7.7 min (median), under Phase 96's proposed 3–6 and 10–20; TARGETS now read 2–6 catches and 5–20 min…
549. **A water's own sky and light (98):** new optional location fields read by `sailing.js`, each falling back to what every water had: `sky.keys` (keyframes in SKY_KEYS's shape; the ceiling check in `refreshSky` still throws on…
550. **Fogbound's scenery module (98):** `js/scene/fogbound.js` (`G.scene.scenery.fogbound`, `loc.scenery: 'fogbound'`): painters `fbhills` (domes as (1 - u²)^0.55, a tip every 3 px along the crest, a lit edge on the slopes falling…
551. **The larch (98):** `paint.js` TREES.larch: a thin dark trunk through a cone of gold tufts (half-width 0.25–0.3 of the height, rising as r^0.8), lit on the left, a ragged edge and a few gaps; keys {dark, mid, lit, trunk}.
552. **The palette (98):** 41 keys from the reference, measured from it by region: the sky's `dusk_mauve_dk`, `dusk_mauve`, `dusk_cerise`, `dusk_coral`, `dusk_sun` (#d48278, 146.8 against the ceiling's 147.9: the reference's sun…
553. **Fogbound's layers (98):** peaks (fbhills, 0.05, a big dome filling the west), fog_high, ridge (fbhills, 0.14, the mast at layer x 232, 22 px), fog_far, trees (forest, 0.3), fog_near (all fog in `fog_lav`, alphas 0.22–0.4)…
554. **The Pines' painters (99):** `js/scene/pines.js` adds to the Pines' module (`G.scene.scenery.pines`, loaded after `fogbound.js`): `butte` (features [{x, w, h}], w and h in world px: a crest of a forested shoulder, a plateau…
555. **Two optional painter fields (99):** the bank's `reedKeys` [dark, mid, hi] (default `reed_dark`, `reed`, `reed_hi`: the Pines' gold reeds) and the far shore's `tree` key for its far pines (default `night_blue`); the diner's…
556. **The palette (99):** 46 keys from the reference, measured from it by region: the sky's `dusk_wine_dk`, `dusk_wine`, `dusk_crimson`, `dusk_crimson_hi`, `dusk_rosepink`, `dusk_orchid`, `fog_mauve_dk`, `fog_mauve`, `fog_mauve_hi`…
557. **The Pines' layers (99):** peaks (mountains, 0.05, rose rims as their `snow`), fog_high, ridge (fbhills, 0.11, a big dome at layer x 30), butte (0.16, x 118, 150 × 60), fog_far, autumn (forest, 0.25, spruce/pine with 12% gold…
558. **Blackwater's scenery module (100):** `js/scene/creek.js` (`G.scene.scenery.creek`, `loc.scenery: 'creek'`), painters only, no live parts: `oldpines` (L: base, height, gap, mix {old, spruce, pine}, features [{kind: 'nest', x}]…
559. **More snow (100):** `paint.mountains` reads two optional fields, `cap` (a factor on the snow cap's depth, default 1) and `capFrom` (the share of `amp` a peak must pass to carry snow, default 0.68).
560. **The palette and layers (100):** 30 keys: the sky's `dusk_blush_dk`, `dusk_blush`, `dusk_blush_hi`, `dusk_blush_lt`; the ranges `mtnc*`, the snow `snowp_*`, the slopes `hillc_*`, the conifers `pinec_*`, the granite `grn_*`…
561. **The turn (101):** `fish_ai` A.holdR [30, 44], holdMax 2, patience [7, 13] s, turnGap 0.6 s, keepR 30 px, circleW 1.7 rad/s (the slowest circle), turnArrive 1 (a knob on the arrivals, left at 1); inspect circles 1-2 (were 1-3).
562. **`--bite` (101):** 20 seeds x 10 min at Fogbound (worm), the creek (worm) and the Pines (minnow) on the Graphite Rod: at every bite exactly one fish within 24 px; 2+ within 24 px under 2% of the steps; the bites a minute within…
563. **The strike (102):** `fish_ai` M.strike by style {off px, t s, lunge s}: tap {5, 0.2, 0.1}, thump {8, 0.4, 0.14}, slam {14, 0.25, 0.12}, mouth {6, 0.55, 0.3}; lungeK 4 (hover's speed cap x4 during the lunge, k = 3/lunge).
564. **The strike drawn (102):** `underwater.js`: each body's `moff` eases (7/s) to -dir x 0.42 x its length in `nibble`, `set` and `bite`; `lureTaken(run)` (the biting fish past its lunge) stops `sailing.drawLure`; `strike` {n, t…
565. **The strike's sound (102):** `engine.js` STRIKE_SND by style {thump Hz f0 to f1 over dur, gain; knock x3 of FEEL's; twang; splash size; clicks}: tap {120 to 60, 0.14 s, 0.12; twang 0.03; 1; 2}, thump {95 to 42, 0.22, 0.2; 0.05…
566. **Letting out line (103):** `underwater.lureStep`, in waiting/interest: `c.free` = down held, not reeling, no bite, not on the ice.
567. **The movement profiles (104):** `underwater.js MOVE` by action (a lure's vary, else its swim; a live bait's id): {fall x its sink speed, sway px, swayHz, floats, swim px/s, tire s, nose (+ head first, - nose up), bed 'puff' |…
568. **The motion a fish reads (104):** `motionStep` each step in sinking and waiting: `cast.m` {speed px/s through the water (eased), vy, falling (vy > 1, not reeling), onBed (within 1.5 px; a dropshot's weight), still s, runT s…
569. **Feeding and appeal (105):** `G.data.feedOf(sp)` (fish.feed, else FEED_OWN[id], else FEED_BY_FAMILY[family], else FEED_ANY).
570. **Following (105):** a follower (feed.follows) in `approach` within 30 px of a lure moving faster than 6 px/s goes to `follow`: it swims on the lure's tail (12 px behind it, against its motion, up to 1.3x its speed) and goes to…
571. **The journal's ways (105) and the model (105):** `underwater.howTaken` at the hook-set: the hook's name, how it moved (as it fell, when it stopped after a run, lying still, shaken in place, barely moving, hopped along the bed…
572. **The bot's hooks into the game (106):** `G.core.loop.setScale(k)` (0.25-12) and `setOnStep(fn)` (called before each fixed step with dt), both only with `?debug`.
573. **Fixes from the bot (106):** a popper's pop sets `cast.m.popT` (0 at a pop): within 0.6 s it thumps (0.6) and the 'top' trigger fires.
574. **Fun and pull (107):** `underwater.js`: `clean` {t, x, y, n}: a hook-set with `bite.t` < CLEAN (0.4 s) shows `drawClean` (the fine font in the view's pixels, `signal_amber`, rising 6 px over 0.9 s from 18 px above the hook)…
575. **The journal and chart tips (108):** `G.ui.menu.open(name)` calls `G.ui.tips.opened(name)` before the page opens: 'journal' marks the tip `journal`, 'map' the tip `chart`, and the tip showing is dropped at once.
576. **Finer structures (108):** the cabins, the pier and the lamps are still painted in layer px (the view's own pixels, `HI` 2 per world px); "more resolution" is more detail at that grain, not a finer canvas (a layer baked above HI…
577. **Round glows (108):** `fogbound.halo(c, X, Y, r, a, key)`: three nested discs (r, 0.7r, 0.4r) in half-pixel rows at alphas 0.14, 0.18, 0.3 times a, no allocation; about 4r fill calls a disc.
578. **A lift lure's fall on the retrieve (109):** in `waiting`/`interest` while reeling, swim 'lift': up share upK (0.2 rattle, else 0.3) at vUp = vy - v x (1.7 rattle, else 1.3); the rest at min(sinkV x sink x 0.7, -vUp x upK / (1 -…
579. **A held reel brings every hook in (110):** swim 'lift': the fall between lifts is min(sinkV x sink x 0.7, the 109 cap, (`RV.climb` x vy - upK x vUp) / (1 - upK)), so a hop's mean rise is at least climb (0.6) x the line's pull vy…
580. **Fish illustration style (111):** `data/fishlooks.js` paired-fin helpers shorten and sweep the pelvic and pectoral fins.
581. **Fish detail and realism (112):** The original six pigment colours are interpolated into half-tone material ramps (`sprites.fishBlend`, memoized; `fishgen.materialRamp`, cached by array identity) at bake time.
582. **Pumped retrieves (113):** `RV.climb` 1, `RV.drag` 0.6. `c.held` += dt while reeling, -= dt while let go (floor 0), set to 0 in `sinking`; the dropshot drags while `c.held < RV.drag`: the angler bot's 0.15 s / 1.6 s and…
583. **The lodge sign (114):** `scenery.js` `SIGN` {words, lift 54, lineH 9}; `signLayout()` measures the rows in the fine font once (x, w, per-letter off).
584. **The shop's warm look (115):** `shop_room.js` `TOP` 84 and `OY` = ((360 - RH) >> 1) + TOP (the room from y 10 to 350); the map, objects, door, mat and Rusty's tile are unchanged, so the walk and every talk work as before.
585. **Mini people (116):** `room.js` `Mini(g)`: y' = 1 + (y < 17 ? 0.78y : 13.26 + 0.58(y - 17)), x' = 12 + (x - 16) × (0.78 above the neck, else 0.58); ellipses and capsules are rasterised at the new size (their radii by the scale…
586. **The reference's layout (117):** `shop_room.js` MAP rows 0-1 'w' (the built-ins are the wall's lower half; their talk ids, rack/jar/lures/gear/guitar, are reached from row 2 facing up); OBJECTS worms (1,2), crickets (1,3), tank…
587. **The shop's colour and Rusty's bust (118):** the cedar keys: deep #2e120a, dark #4e1e10, #6e2c14, mid #8e3a18, hi #a84a1e, lit #c4642a, glow #dc8a40. `softMask(w, h, pools, clear)` (local to the shop): alpha = round(clamp((d -…
588. **The boat's people in the rooms (119):** `room.js` `boatFisher(c, dir, fr, L)`, `boatDog(c, dir, fr, B)`, `boatRusty(c, dir, fr)` paint with `G.gfx.paint` (blob, limb, box, px) on bake layers, as the boat does; `sprite()` bakes…
589. **Overworld sprites (120):** `room.js` `trainer(g, dir, fr, L, rusty)` and `puppy(g, dir, fr, B)` paint on `X.grid` and outline it; `doubled(w, h, paint)` bakes the grid at 2× with smoothing off.
590. **The shop at half size (121):** `shop_room.js` art px: AW 192, AH 170, AT 42, tiles 16, side walls 8, FY 74. `draw()` paints base, live glass, stock, reflections, the sorted props and people, and the light into `view` (a 192×170…
591. **The cabin at half size (122):** `cabin.js` HW 192, HH 150, HT 16, HTOP 22. `halve(src, edge, warm)` reads the canvas once (getImageData, at bake time only), caches the result on the source (`src._half[tag]`); `warm` maps wood_*…
592. **Fine detail (123):** 590 and 591 no longer apply: both rooms draw at full size.
593. **The user's own art (124):** `G.gfx.peopleArt[kind][dir]` rows (a character per pixel, '.' clear) with `keys`, and for the fisher and the dog `roles`/`levels`; the first look and the golden use the keys as they are.
594. **The walk (125):** `room.js` `sprite()` paints the art into a grid 4 wider and 2 taller (a 2 px margin; `anchor` + 2), the legs (rows from 0.8 of the height) and the body in two passes for a stride; `dogTrot(keys, rows, fr)`…
595. **Looks, breeds, the living shop (126):** `room.js` margins TOPM 6, SIDEM 4 (`anchor` = drawing's foot + margins; the trotting dog (22, 34) side, (18, 36) front/back).
596. **The second sheet (127):** `G.gfx.peopleArt.looks[id]` for `knit_hat`, `rain_hat`, `headlamp`, `husky`, `saint`, `poodle`: `keys` (their own palettes `pk*`, `py*`, `ph*`, `pu*`, `pb*`, `pc*`: 24, 24, 24, 14, 16, 16 keys…
597. **The cabin as drawn (128):** `G.gfx.cabinArt` {keys (64 `pv*`), cuts [{id, x, y, w, h, foot, spans}], rows (528 chars × 352)}; a cut's spans give per row the first and one-past-last pixel that is not floor or rug (the floor and…
598. **The VCR skin (131):** `panel.frame` draws the title through `osd()` (bold, with `neon_red` and `neon_teal` ghosts a pixel to each side at 0.55 of the alpha) after a 4×7 `play()` mark; the title tab is 6 px wider for it. `scan()` darkens every other body row with `ink` at 0.22. `row(…, cursor)` adds a blinking 3×5 mark (steady under Reduce motion) where the text starts 6 px inside the bar.
599. **The roll-in (131):** `panel.kick()` (called by `menu.open`, the pier, the card and the setup panel) starts a 0.18 s tracking band that runs down the body in `fog_light` at ≤0.35 alpha; none under Reduce motion. Presentation only.
600. **Menu pages (132):** `menu.js` `PAGES` {menu, settings, save}; '#' rows are headings (never chosen: `stepSel` skips them, taps ignore them). `pause.open(at)` opens the page that holds `at`, so the picker, controls and milestones still return to their row. Back on a sub-page returns to MENU at the row that led there; P or Back on MENU closes. Journal opens the journal; Chart opens the chart when `mapAllowed()`, else says 'Reel in first.'. The export reminder (91.2) opens SAVE TAPE.
601. **The status line (132):** with no message, the foot reads `▶ PLAY  HH:MM  WATER`, rebuilt only when the minute or the water changes (no allocation per frame).
602. **Rusty's shelves (133):** `shop.js` `TABS` lists every one of the 41 items once (rods 0–5 and the ice rods; the reel, the line and the three line types; the 23 lures with their Buy 5 rows; the four baits; the Snow Machine). `showTab(d)` turns the shelf; the tab is kept for the visit. A/D and the foot's halves turn the shelf at Rusty's and still page a facing shelf's list. The position counter is left out for shelves.
603. **Small fixes (133):** `badge.draw(ctx, x, y, w, tabX)` sets the settled medallion just left of the card's top-right tab. The card's PC hint is `hint('SPACE', 'choose')`. The pier panel keeps two wrapped lines for its word, rewrapped only when the word changes. Chart names get a `night_ink` plate at 0.8.
604. **The tape's menu (134):** `title.js` ROWS; W/S move, any other key does the chosen row (Back or P play). SETTINGS opens the pause panel with '@settings' (`solo`: Back closes it instead of going to MENU); CONTROLS opens with 'title' and closes itself. `menu.update` reopens the title (`open('title', 'back')`, already settled) when an overlay the title opened closes; `hush` ignores keys until released. An overlay that opens another from its `update` is kept (`cur === was`).
605. **The first touch on the tape (134):** `input.js` lets the page's first touch through when the title is open, so a tap on SETTINGS works first time; elsewhere it still only wakes the page (90.4). The title's `tap` plays on any tap off its rows.
606. **The next goal (135):** `milestones.next(loc)` picks the water's milestone when its fish are not all caught, else the unfinished milestone nearest done by share (the sitting's pats, the hole and the pond's left out); worked out on a call (the card's first 0.15 s, the pause's open), never per frame. The card counts the catch on display (it is written to the journal only on Sell, Keep or Release): +1 for 'caught', and for 'species' or the water's when it is the species' first.
607. **Here now (135):** `journal.hereNow(sp)`: a home at the boat's water whose hours hold the present part of the day (or any hour); drawn as *now* in `teal_lit` on a tile not caught yet.
608. **The export reminder's week (135, fixes 91.2):** with neither `exportAt` nor `remindAt` set, the first check sets `remindAt` to now and does not remind, so a fresh save's first pause opens on MENU.
609. **The HUD's plate (136):** `hud.say()` notes draw through `plate()` (`night_ink` at 0.72, a `neon_teal` play mark, `bone` words) at the picture's top centre, Y + 38, fading in over 0.25 s; the width is measured once per message. `tips.draw` returns while `hud.note()` is set. The milestone line moved to Y + 58 with the same plate height.
610. **The fast-forward (137):** `map.ff(ctx, a, arriving)` draws over `M.dim` in both halves of the travel fade (FADE 0.35 s each way, unchanged): seven 1–2 px `fog_mid` lines placed by `S.hash` of the UI clock at 24 Hz, two play marks and FF, an SP counter at 9× the UI clock; on the way in, the channel card at the picture's centre (a water's number is its place in `G.data.locations`; the shop and the cabin are AV), its text built once per destination. Nothing under Reduce motion.
611. **The tape (138):** `card.tape()` {fish, coins, best, ver}, counted in `commit()`: each fish settled adds one, the coins it brought (sale and first-catch bonus; a milestone's pay is not counted) and its length if the longest. Never saved. The MENU's foot is three lines now (`fixed` takes 3 rows); TAPE shows once a fish is in, its text rebuilt when `ver` changes.
612. **The goal row (138):** `milestones.open` scrolls so the goal from `next(loc)` is the third row shown and lights it with `panel.row` (no cursor: the icon sits where it would).
613. **Tape sounds (139):** `engine` `deck` (click at 0.55 rate and 0.02 gain, a 130→70 Hz sine thunk at 0.016, a 3.2→2.4 kHz band of hiss at 0.005) is played by `panel.kick()`; `ff` (a 1.4→3.6 kHz band of hiss over 0.7 s at 0.007, a 55→75 Hz triangle at 0.006) by the chart's `go`. Both at or under the UI clicks' levels.
614. **The Tape look (140):** `save.settings.tapeLook` (false by default; read with defaults, no version bump). `panel.screen(ctx)` draws after the scene and before the overlays: one baked 640×360 layer (`ink` scanlines at 0.14, a 14-step vignette of nested 3 px frames up to 0.045) and, unless Reduce motion, a 2 px `fog_light` line at 0.05 drifting down at 14 px/s. It only darkens, so the sky stays under `dusk_high`. Measured: 16.47 → 16.52 ms a frame (vsync-bound) on PC and phone.
615. **The fight's word (141):** `tips.js` shows EASE from tension 0.6 until it falls under 0.42 (`EASE_ON`, `EASE_OFF`, hysteresis), REEL otherwise, whatever the fish's mode: a scripted new player obeying it landed 2 of 2, while obeying the old run-based word lost 3 of 3 to thrown hooks. The phone's button still reads REEL (it is what the button does).
616. **The depth tip (142):** `tips.js` 'depth' shows while sinking once a fish is caught (not on the ice) and is done when a press moves the lure from sinking to waiting that step (`last.fsm === 'sinking' && f === 'waiting' && pressed('action')`: the scene has already moved on when the tips step).
617. **The home-screen note's moment (143):** `tips.homeStep` also waits for `caught(save) >= 1`; it took the cast tip's place on a fresh save's first screen. Checked by a scripted phone session with CDP touch events (title tap, CAST hold, HOOK tap, REEL hold, SELL tap): 2 of 2 landed, the cast tip first.
618. **Tips take turns (144):** `tips.js` `SHOW_MAX` 25 s: the time a non-basic tip has been the one to show (no overlay, card or HUD note up) is counted in memory (`seen`); past it the tip is marked done in `save.tipsDone` and the next one speaks. The basics (`BASICS`) stay until done.
### 8.4 Known bugs and pending issues

No crashes or failing checks are known. Open items, roughly by importance:

| # | Issue | Where | Owner |
|---|---|---|---|
| 5 | Fixed (8.3 #67) | `js/scene/sailing.js` | Closed |
| 6 | Pacing margins: **since Phase 75 creek median 49.5 min (band 30–50), close to its edge, and Russetwood 341.4 (150–360), first upgrade 7.0 catches (4–8)**: pike no longer take the worms the model fishes at Fogbound (8.3 #413); a change that slows Fogbound by… | `data/fish.js`, `tools/balance.js` | Watch when tuning |
| 7 | Hollow pike lands only ~51% at skill 0.8 with the starter line, by design (strength 1.6 > line 1.0) | `data/fish.js` | Review in 14.5 |
| 9 | Anomaly cooldowns live in run state, so a reload resets them. | `js/sim/unease.js` | Leave unless it matters |
| 10 | The per-phase Node and browser checks were not committed. | — | Optional: a `tools/` browser check |
| 11 | Testing note: many `getImageData` reads on the game canvas make Chrome move it off the GPU, and the page drops to 16–40 fps until reloaded. | — | Keep pixel tests short, or reload after them |
| 17 | Fixed: the perched owl calls (8.3 #67) | `js/scene/sailing.js` | Closed |
| 18 | Passive income swings a lot from seed to seed (0.36–0.84 of active over 60 min): a single Hollow Pike is worth ~150 coins. | `data/fish.js` | 14.5 |
| 20 | Time away moves the game clock (8.3 #44). | `js/sim/passive.js` | Watch in play; `P.awayMin` is the knob |
| 21 | Live passive shows only the float and the bending rod; there is no underwater view or fish on screen, and no sound | `js/scene/sailing.js` | 13.3 for sound; visuals optional |
| 24 | Solved in Phase 62 (8.3 #331): its grid pictures are baked one a frame from boot; the first opening costs 6–14 ms | `js/ui/journal.js`, `index.html` | Closed |
| 26 | The reflection pass measures 2.1 ms (calm) to 2.4 ms (boat moving, Phase 20's broken mirror) in headless Chromium, against 3.4's 2 ms budget; 2.7 ms (median) at night with drizzle and an anomaly in Phase 50, the same as on the code before Phase 48 (8.3 #272). | `js/gfx/water.js` | Watch
| 28 | Solved in Phase 62 (8.3 #330): the kick scales with the blank's load. | `js/gfx/rod.js` | Closed |
| 22 | Testing note: headless Brave runs no animation frames in background tabs, so a tab must be brought to the front (`Page.bringToFront`) before its loop can be checked | — | — |
| 29 | The looks' names (Red cap, Knit hat, Rain hat, Headlamp; Golden, Husky, St. Bernard, Poodle) are placeholders for the user to choose (PLAN_TACKLE.md 2.8), as are their colours (8.3 #248) | `data/looks.js` | The user |
| 30 | The setup panel is 320 px wide with its LINE column (Phase 53), past the small panel's 240 px (`G.ui.panel.MAX_W`, Phase 46); the journal's two panels and the map's are full-screen overlays, also past it (Phase 54). | `js/ui/setup.js`, `js/ui/journal.js`, `js/ui/map.js` | Accepted |
| 31 | The pacing model buys fluorocarbon after the creek; a player who never buys it never lands the three line-shy species (the journal says why). | `tools/balance.js`, `data/fish.js` | Watch when tuning |
| 36 | Solved in Phase 61 (8.3 #325). | `js/ui/*` | Closed |
| 37 | Solved in Phase 61 (8.3 #326): `tools/icon.js` writes the files; Chromium finds it installable. | `manifest.webmanifest`, `js/core/device.js` | Closed |
| 35 | Solved in Phase 61 (8.3 #327): it measured Node's sandbox, not the solve. | `tools/balance.js` | Closed |
| 32 | The rooms' people and props are painted by code (`G.gfx.pix`), not drawn by hand; the side-view sitting dog and Rusty's profile are the roughest. | `js/ui/room.js`, `js/ui/cabin.js` | Polish if wanted |
| 38 | Solved in Phase 61 (8.3 #328) | `js/core/input.js` | Closed |
| 44 | `--tackle` is noisy for lures only big fish take (a Red Room lure lands about 15 sturgeon an hour, so 4 seeds swing it ±10%); the highest is 183% of the best bait, margin enough, but watch it when tuning | `tools/balance.js` | Watch when tuning |
| 45 | The 59 painted fish (Phase 70's ten, Phase 71's 22, Phase 72's 27) wait for the user's check against the reference icons (the gallery's `fish` pages); every shape, fin, marking and colour is a number in `data/fishlooks.js` or a `fish_` key, so changes are data | `data/fishlooks.js`, `js/gfx/sprites.js` | The user |
| 46 | The 23 lures' art (Phase 73) waits for the user's check against the reference icons (the gallery's `lures` and `lure swim` pages); every shape, size and colour is a number or a key in `data/lurelooks.js`, so changes are data. | `data/lurelooks.js`, `js/gfx/luregen.js` | The user |
| 53 | A phone's frame at sea (Phase 79's check) is 14–21 fps on the 4× throttle in headless Chromium, as every water is (Fogbound 15–17, Phase 60's 12–17): the software raster, not the sea (8.3 #319). | `data/loc_sound.js`, `js/gfx/water.js` | Play it on a phone |
| 54 | The seas' looks wait for the user's check (two contact sheets: each reach at dawn, noon, dusk, midnight and in a storm) | `js/scene/seas.js`, `data/loc_sound.js`, `data/loc_wreck.js` | The user's check |
| 55 | The ice's looks (Tamarack at each reach and hour, the blizzard, the Snow Machine and his sitting at a hole as repainted in Phase 86, the holes, the winter fish) wait for the user's check; the shapes are numbers in `js/scene/winter.js`, `js/scene/ice.js` and… | `js/scene/winter.js`, `js/scene/ice.js` | The user's check |
| 56 | The ice pays well: worms at Tamarack 3798 coins an hour against 3006 at Coldharbor (minnows 5227 against 5543), so it is the best worm water; `--pacing` keeps it under the sea it follows (4569 against 4940 an hour), close enough to watch when tuning | `data/fish.js` (ICE_PRICE), `tools/balance.js` | Watch when tuning |
The remaining `TODO(Px.y)` markers in the code are listed in [HANDOFF.md](HANDOFF.md#pending-work).
| 57 | Pond Cam plays on the cabin's small CRT (about 18×12 room px), so its fish are 2–5 px tall: it reads as a glimpse, not a viewer; a full-screen view would be a new task | `js/ui/cabin.js` | User |
| 58 | Size classes count only from Phase 85 on (8.3 #491): a long-time save must catch every size of a species again before stocking it; the journal page says why | `js/sim/economy.js` | By design (PLAN_WINTER.md 5) |
| 59 | On the UI layer the map's chart and its stop names stay at the picture's scale (the place card is bigger): on a phone the names are about 6.6 CSS px, the stops tappable at about 19 CSS px | `js/ui/map.js` | Watch; a bigger chart is a new task |
| 60 | The walk-in rooms stay top-anchored in the picture (the audit's D7): the space under the room is the text box's. | `js/ui/room.js` | By design |
| 61 | The UI layer is measured in headless Chromium with emulated phones (iPhone 13, Pixel 5, iPhone SE); a real phone (#34) is still the user's to try | `js/ui/panel.js`, `js/core/device.js` | Play it on a phone |
| 62 | The offline cache is checked in headless Chromium (`?sw`, `context.setOffline`); a real phone's install and update (#34) is still the user's to try, and iOS can still drop a site's storage if it is not on the Home Screen, whatever `persist()` said | `sw.js`, `js/core/device.js` | Play it on a phone |
| 63 | A best catch made before Phase 93 has no part of the day until it is beaten | `js/sim/economy.js` | By design |
| 64 | Reel by toggle starts each fight not reeling: the first tap after the hook-set starts the reel | `js/core/input.js` | By design (a run at the start wants slack) |
| 65 | Phase 96's pacing bands (first upgrade 3–6 catches, creek 10–20 min, Russetwood 60–150, a sea 150–300) are the plan's proposal, used without the user's confirmation; the prices are the plan's too. | `tools/balance.js` | The user's word |
| 66 | With Phase 94's rewards the early game is quicker than Phase 96's proposed bands (first upgrade 2 catches, the creek 7.7 min); the bands were opened to 2–6 catches and 5–20 min instead of cutting the plan's rewards. | `tools/balance.js`, `data/milestones.js`, `data/gear.js` | The user's word |
| 67 | `--tackle` fails since the economy and feeding changes of Phases 94–107: blades, big spinnerbaits and big cranks earn 200–314% of the best live bait, deep jigheads, the bobber and the dropshot 15–46% of worms at some waters (2026-11-17 run). Its model still scores lures by the old rules, so retune the model before the lures | `tools/balance.js`, `data/gear.js` | Open |
| 68 | Fogbound's new look waits for the user's check against the reference (screens at 06:00, 12:00, 19:12 and 00:30 at three points of the lake); its shapes and keys are numbers in `data/loc_fog.js`, `js/scene/fogbound.js` and the palette | `js/scene/fogbound.js`, `data/loc_fog.js` | The user's check |
| 69 | The Pines' new look waits for the user's check against the second reference (screens at 06:15, 12:00, 19:12 and 00:30 at two points of the lake); its shapes and keys are numbers in `data/loc_pines.js`, `js/scene/pines.js` and the palette. | `js/scene/pines.js`, `data/loc_pines.js` | The user's check |
| 70 | Blackwater Creek's new look waits for the user's check against the third reference (screens at 06:15, 12:00, 19:12 and 00:30 at x 160, 560 and 900); its shapes and keys are numbers in `data/loc_creek.js`, `js/scene/creek.js` and the palette. | `js/scene/creek.js`, `data/loc_creek.js` | The user's check |
| 71 | Since Phase 105 the model reaches a sea in 282 min (median, after Phase 107; it was 230-249), in the 150-300 band; Russetwood 110.3 (was 97.4): the model now fishes each hook as it should be and species weigh how it moves. | `js/sim/fish_ai.js`, `tools/balance.js` | Phase 107 |
| 72 | PLAN_FISHING.md's look and feel wait for the user's check: the strike's sound (3x the old knock, under the limiter), the clean-set word, the follows, the journal's feeding notes, and the LINE key on a phone. | as listed | The user's check |
| 73 | Phase 108's cabins, pier and lamps wait for the user's check (screens at Fogbound 15:00 and 22:00, the Pines 15:00, 21:00 and 22:00, Blackwater 15:00 and 21:00); the Sound's keeper's cottage, Tamarack's shanties and the pond's back wall were not repainted | `js/scene/fogbound.js`, `js/scene/pines.js`, `js/scene/sailing.js` | Waiting on the user |
| 74 | Phase 111 was too subtle per user feedback; Phase 112 adds body volume, anatomical detail and distinct profiles. | `data/fishlooks.js`, `js/gfx/fishgen.js` | The user's check |
| 75 | The lodge sign (Phase 114) waits for the user's look: the letters' size and colour, the halo's strength, how often the letters falter, and that its halo is drawn over the boat when the two meet on screen (low alpha, rare). | `js/scene/scenery.js` | Check screens at 06:00, 12:00, 19:00 and 22:00 |
| 76 | The shop's new look (Phases 115-121: the reference's layout and colour, the whole room and its people at 2× in one sprite style) waits for the user's check against the reference (screens at 12:00, 19:00, 21:00 and 23:00). | `js/ui/shop_room.js` | Open |
| 77 | The cabin's 2× look (Phase 122) was replaced by Phase 123 (full detail, warm boards); the rooms' look (Phases 115-123) waits for the user's check | `js/ui/cabin.js` | Open |
| 78 | Since Phase 124 the shop is the user's picture: the rods for sale do not leave the rack when bought, and the minnows and crickets left are not shown (the tank's minnows swim always). | `js/ui/shop_room.js` | Open |
| 79 | The other looks and breeds (Phase 127) are the user's second sheet sampled to size; they wait for the user's check. | `js/gfx/people_art.js`, `js/ui/room.js`, `data/looks.js` | Open |
| 80 | The cabin (Phase 128) is the user's picture at 528×352; it waits for the user's check. | `js/ui/cabin.js`, `js/gfx/cabin_art.js` | Open |

### 8.5 Baselines

Run these after any change. A different result means something changed. Recorded 2026-11-17 after Phase 130.

| Command | Expected |
|---|---|
| `node tools/balance.js --validate` | `validate: OK (0 warning(s))`; info lines: species by water fog 12, creek 16, pines 10, copper 14, harts 15, stone 11, russet 9, sound 13, wreck 6, tamarack 10, pond 0; `fish looks: 69 painted`; lures by water fog 21, creek 14, pines 23, copper 14, harts 21, stone 16, russet 17, sound 20, wreck 18, tamarack 13, pond 0 (of 23) |
| `node tools/balance.js --replay 12345` | `hash 2848910695 / 2848910695, 18 catches, 21 casts`, `PASS: identical` |
| `node tools/balance.js --pacing` | All PASS over 20 seeds: first upgrade median 2.0 catches (2–6), creek 7.4 min (5–20), Russetwood 110.3 min (60–150), a sea 282.4 min (150–300); the snowmobile and ice come after the sea and pay no more an hour than it |
| `node tools/balance.js --passive` | Three PASS lines: no passive sim or multiplier; no TAB key, button or time-away call; a save away for hours loads unchanged |
| `node tools/balance.js --saves` | 17 PASS lines; every milestone save (v6 to v12) loads as v13; a damaged string is refused |
| `node tools/balance.js --fight` | Seven PASS: skill 0.85 lands 95.8%; skill 0.5 66.9% (68.4% of losses thrown hooks); tapping 55.5%; never reeling loses every fish in 6.2 s; every line type 61.0% / 95.1%; braid throws 32.3% vs mono 19.5%, snaps 6.7% vs 9.2% |
| `node tools/balance.js --rod` | 16 PASS lines (equal power 0.14 px per tier; tip within 16.1° / 6.8° of a tight line; the Ultralight Wand bends 3.6× the Long Rod under 0.05 kg; one curve while springing; settles in 0.28–0.33 s; the cast trails, whips and rebounds; no NaN, a step in 0.0375 ms) |
| `node tools/balance.js --tackle` | **FAIL, known (8.4 #67):** 32 lure/water pairs out of the 50–200% band (lowest 15% of worms: `deep_jighead` at the Pines; highest 314% of the best bait: `heavy_blade` at Tamarack); exit 1. Takes several minutes |
| `node tools/balance.js --homes` | `125 plan rows, 125 data rows, 69 species, every one placed`; `PASS the data matches PLAN_WATERS.md §3 and PLAN_WINTER.md §3 (0 difference(s))` |
| `node tools/balance.js --first` | PASS: every fresh save lands a fish inside 60 s (median 28.8 s, slowest 45.0 s); the first-taker bias is off once a fish is landed |
| `node tools/balance.js --milestones` | Four PASS: every milestone (24) met by its fixture and paid once; old saves get none paid; a fresh first perch pays 17 (7 + 10 bonus), the second 7; a released first fish still pays the bonus |
| `node tools/balance.js --bite` | PASS at fog, creek and pines: 0 bites with another fish within 24 px; about 1.15–1.22 bites a minute |
| `node tools/balance.js --feed` | Seven PASS: every species takes some way well; a dead lure in open water is turned down by fish that want it moving; every way of fishing is in some species' top three; worked beats left dead at fog, pines, creek and harts |
| `node tools/icon.js --check` | `PASS icon-192.png matches the grid`, `PASS icon-512.png matches the grid` |
| `node tools/lures.js`, `node tools/angler.js 4`, `node tools/reel.js` | Browser checks against the served game (see CLAUDE.md); all PASS when last run |

The replay hash changes legitimately whenever sim code or data changes (fish, gear, fight, AI). When that is intended, record the new hash here.

### 8.6 Next task
Phase 144 is done (UX round 6, PLAN_UX.md §11). Next: the round-7 audit.

---

# Appendix V: Game Vision Spec

> The original design spec, with the approved decisions (D1–D9) applied. Tasks cite these sections as V1, V4, and so on.

## V1. Vision
A calm, collectable, side-view fishing game. The skeleton follows the cozy-fishing genre: small boat, cast, underwater cross-section, line-tension fight, field journal, bait shop, active and passive (idle) modes, a dog companion, several fishing spots, dozens of fish. The skin is liminal and uncanny: survival-horror fog and rust, small-town TV-mystery Americana (diner neon, owls, blinking yellow traffic lights, red curtains, zigzag floors), surreal dream logic, body-horror-wrong fish.

Tone rule: **calm surface, wrong depths.** Wrongness over shock. No jumpscares, no chases, no punishment. The game must stay chill. The liminal elements ARE the fishing gameplay (§2); the cozy loop is the foundation (§1).
Everything is original (names, characters, art). All art is procedural (sprite strings plus generators). All audio is Web Audio.

## V2. Locked Decisions
- Side view. Internal canvas 320×180, scaled with `image-rendering: pixelated`, aspect preserved.
- Plain `<script>` tags, one global namespace `G`, no libraries, no build step, no external assets. Served with Live Server.
- Controls: A/D or arrows move the boat. Mouse or SPACE: hold to charge, release to cast. Hold = reel, release = ease. P pause, J journal, M map, TAB toggle passive. Basic touch maps to the same actions.
- Permanent dusk or night. A 24-hour in-game clock (1 real minute = 1 game hour) drives gameplay, events and ambience, never a bright daytime (D2, §0.8).
- No fail states. A snapped line or escaped fish costs only time.
- Never draw inside update code. Never change state inside draw code.

## V3. Core Loop
States: `sailing > charging > casting > sinking > waiting > interest > hooked > fighting > landing > card > sailing`.
1. **Sailing:** boat accelerates and decelerates smoothly, bobs, leaves a wake, drifts a little. The world is about 1200 px wide; the camera follows. Landmarks help the player remember spots. Casting is allowed whenever the boat is nearly stopped.
2. **Cast:** hold to charge (forgiving; a mediocre cast still works); a faint landing marker shows where the lure will land. The rod bends, the lure flies on a parabola from the rod tip and lands exactly on the waterline with a splash and flat elliptical ripples.
3. **Underwater view:** after landing, the lower part of the screen becomes an underwater cross-section: gradient darkening with depth, light shafts, particles, rocky bottom, weeds. The boat stays visible above the surface line. The line drops vertically from the rod tip as a dotted line. The lure sinks, then sways. Depth is shown in metres (1 px = 0.25 m). The camera follows the lure down to the location's `maxDepth` (D6).
4. **Fish AI** (`sim/fish_ai.js`): fish swim independently at their preferred depth. States: wander, notice (lure within awareness radius and bait matches), approach, inspect (circle 1–3 times), nibble (tiny line twitches), bite or lose interest (caution roll). Background fish drift as silhouettes. At most 8 fish alive. Fish over the rod's mass capacity never enter the bite pool; they appear only as hints in the world (D4).
5. **Bite and hook:** on a bite the line dips and the rod tip bobs. Subtle cue, no big prompt. Active mode: starting to reel (hold) within a generous window (about 2 s) hooks the fish. If missed, the fish may return once. Passive mode: auto-hook.
6. **Fight:** see V4. Tension model, no catch bar, no mashing.
7. **Landing:** the line rises, the fish is lifted beside the boat, and a compact catch card shows: sprite, name, length, weight, rarity, price, a short cryptic line (carrying real hints), a NEW tag on first discovery, a record tag if best. Buttons: SELL or KEEP (keep goes to the cabin collection).
8. **Dog:** sits in the bow. It raises its head and points when a fish with high interest is near (a hint, not a requirement). Never harmed, never threatened.

## V4. Sim vs Presentation
`js/sim/*` are pure functions with no DOM, no canvas, no `Math.random` (use `G.rng`). They run in Node (`tools/balance.js`) and are reused by passive mode. Scenes only READ sim state and draw it.

Fight model (defaults, all tunable in `data/gear.js`):
- State: tension T 0..1, distance D 0..1 (1 far, 0 at boat), stamina S 0..1, mode `pull`|`tired`, modeT.
- `pull` lasts rand(1.2, 3) × (0.5 + S) s. If reeling, T rises at `(fish.strength / line.strength) × 0.5` per s and D does not shrink. If not reeling, T falls at 0.7× that rate and D grows by `fish.speed × 0.03` per s. S falls by `fish.fatigue` per s.
- `tired` lasts rand(1, 2.5) × (1.5 − S) s. Reeling shrinks D at `reel.speed / sqrt(fish.mass)` per s and T rises only +0.06 per s; releasing drops T by 0.45 per s. S recovers 0.03 per s.
- Forgiveness: the first time T reaches 1 in a fight is a "slip" (T resets to 0.6, D +0.1, soft sound). The second time, the line snaps.
- Win at D ≤ 0. Gentle escape if D stays at 1 for 3 s.
- Readability (presenter): pull = fish thrashes, rod bends hard, line straight and shaking, amber then red tension tint. Tired = fish drifts, line sags, rod relaxes.

## V5. Fish Data Schema (`data/fish.js`)
One object per species:
`id, name, rarity, locations[], habitat{depthMin,depthMax}, speed, strength, fatigue, mass, lengthCm[min,max], weightKg[min,max], awareness, caution, baitLikes[], timeLikes[hours], windows[], uneaseMin, price, desc, hintRefs[], look{base, wrongness, parts[], palette, seed}`.
(`windows[]` and `hintRefs[]` were added for D1 and §2.)

Rarity weights: common 62, uncommon 26, rare 10, legendary 2, then modified by bait, depth, hour, clock window and unease.
Roster target: 36 species = 4 locations × (4 common, 3 uncommon, 1 rare, 1 legendary). Commons are mostly ordinary fish with one tiny wrong detail ("it had a human tooth. The others were normal.").

### Fish Wrongness Generator (`js/gfx/fishgen.js`)
Species look = a familiar base body (perch, pike, carp, trout, eel, catfish, gar, koi) + `wrongness` 0..3 + parts from a catalog, drawn from a seed into a baked 2–3 frame sprite at load (not per frame).
Wrongness 0 is ordinary; 1 is one wrong part; 2 is two wrong parts plus asymmetry; 3 is impossible anatomy and glitch shimmer.
Parts catalog: extra human eyes, owl eyes, human mouth and teeth, zipper seam, exposed muscle, metal vertebrae with typewriter keys, wood grain, VHS tape ribbon trailing from the mouth, mannequin joint seams, second tail, face on the tail, black coffee-like drip, static shimmer, fused twins, pulsing growths.
Movement is slightly wrong too: twitching, uneven fin beats, reversing swim.

## V6. Locations
Each location = one data file `data/loc_<id>.js` (layers, landmarks, spots, `maxDepth`, species pool, ambience) plus an optional scenery module. Layers are generated once into wide offscreen canvases (baked), then drawn with parallax: rendering is just `drawImage`.
1. **Fogbound Lake** (`loc_fog`, start): vast mist, derelict pier, distant silhouettes, rusted channel markers. Cost 0.
2. **Blackwater Creek** (`loc_creek`): winding forest river, decaying cabins, submerged branches, slow current (the lure drifts). Cost about 300.
3. **The Pines** (`loc_pines`): autumn woodland lake, abandoned road, a blinking yellow traffic light over the water, an owl on a branch, a diner glowing across the lake. Cost about 1500.
4. **Red Room Reservoir** (`loc_red`): impossible water, crimson reflections, zigzag-tiled shore, curtains instead of mist, structures that change place between casts. Unlock: catch a specific fish during a specific clock window, plus a cost of about 6000.

Mirror water: the waterline reflection is the baked layers flipped, alpha about 0.35, darker with depth, rows shifted by a small sine (1–2 px).

## V7. Passive Mode
- Toggle with TAB or a labelled button; same save, same journal, same currency.
- Same sim: wait time = base / (bait × rod), fish chosen by the same `fish_ai` weights, fight run with an auto-player (reels when tired, eases when pulling, 80% skill).
- Passive earns about 60% of active income, controlled by the single `passive.incomeMult` (D5), so active play stays better but progress is real.
- Offline: on load, elapsed time (cap 8 h) is converted into up to 200 simulated cycles using a seeded RNG.
- `?compact` URL flag: small 160×90 view, no HUD, for a second monitor.
- Return screen = "the tape" (V10.3).

## V8. Economy and Gear
Coins. Sell price = base × rarityMult(1, 2.5, 8, 40) × sizeFactor(0.7..1.5).
Gear tiers (5 each for rod, reel, line), every tier with a mechanical effect: rod = cast distance + max fish mass; reel = reel speed; line = strength. Baits (consumable) change `baitLikes` attraction and the rarity roll. Equipment: lantern (night visibility of deep fish), depth finder (shows depth bands).
Pacing targets: first upgrade after about 6 catches, location 2 after about 40 minutes, location 4 after several hours. Verify with `tools/balance.js`, not by playing.

## V9. Journal, Shop, Cabin
- **Journal:** baked illustration per species, silhouette if unknown, caught count, best length and weight, bait and hour hints that appear as discovered, NEW marker. Filters by location and rarity. Heavy-fish margin notes (D4).
- **Shop:** illustrated shop scene (baked), shopkeeper, shelves, grid inventory. Item descriptions state the practical effect.
- **Cabin** (`ui/cabin.js`): a worn lakeside cabin restored with coins. Kept fish are mounted as trophies.

## V10. Liminal / Dream Layer (the signature: see §2 for each element's fishing job)
- **V10.1 Unease** (hidden, 0..1 per location, `sim/unease.js`): rises with night hours and time spent stationary; falls during grey hours and at the shop. Effects: rarer and stranger fish enter the pool, anomalies become more likely, music detunes, reflection deltas appear. It never punishes: it is the reward axis for patient play.
- **V10.2 Reflection deltas:** the mirror water sometimes shows what the shore does not have (a figure, a lit window, an extra pier). In rare cases the reflection shows the boat with no fisher. Casting at a delta boosts that cast's rare weight.
- **V10.3 The tape** (`ui/tape.js`): the passive return screen is a VHS-style recording with timestamps. Sometimes there are gaps ("03:12–03:40 recording missing"), sometimes a catch is listed as `???`, and sometimes the journal gains an entry the player never caught, in the player's own handwriting (a `phantom` entry that becomes real once caught).
- **V10.4 The dog** stares at the shore at nothing, once per location (at a real hidden spot). It barks toward spots that hold a legendary.
- **V10.5 Clock events:** at 2:47 and 3:33 an owl cry plays, and certain fish bite only during the surrounding forgiving windows (§0.8). The Red Room unlock uses this.
- **V10.6 Liminal set pieces:** yellow traffic light blinking over water, a diner with neon across the lake, an empty parking lot, fluorescent hum, the same pier appearing in two lakes.
- **V10.7 Shopkeeper:** cheerful small talk with occasional non sequiturs, one line spoken twice, one line reversed. One shelf item has no label and a strange price; it works as a real rare bait.
- **V10.8 Journal handwriting** degrades with unease, and pages gain text after the player leaves them.
- **V10.9 Trophies** in the cabin face the door when the player re-enters, never while watched.

Anomalies are data in `data/anomalies.js`: `{id, locations, uneaseMin, hours, cooldown, kind, params, effect?}`. At most one active anomaly at a time. Never block input, never take control.

## V11. Audio (Web Audio only, starts after first interaction)
Layers: drone with slow filter motion; wind and water from filtered noise; distant clanks and foghorn; splash and reel clicks; reel tension tone that rises with T; a soft sting on rare catches; owl cry; slow, dreamy noir jazz chords in The Pines that detune with unease; radio static on location change. Master limiter always on. Mute and volume in settings.

## V12. Technical Architecture
See §3 for the file tree.
- Sprite DSL: sprites as arrays of strings plus a palette map, baked once to offscreen canvases.
- Fixed timestep (1/60) with an accumulator. Seeded RNG: `G.rng` (sim) and `G.vrng` (visuals), mulberry32, with `?seed=N`.
- Save: `localStorage['softstatic_save_v1']`, versioned, autosave on catch, purchase and location change, export/import as a string.
- Performance: no per-frame allocations in hot paths, baked layers, cap of 8 fish, 60 fps target on a laptop.
- Debug (`?debug`): FPS and state overlay; `window.onerror` prints errors on screen in red; `dbg` console API: `dbg.state(name)`, `dbg.give(fishId)`, `dbg.money(n)`, `dbg.hour(h)`, `dbg.unease(v)`, `dbg.tp(x)`, `dbg.caught(n)`. Every phase is verified with these, never by fishing for minutes.

## V13. Out of Scope
Co-op, ocean levels, combat, any story cutscene, anything that needs external assets.
