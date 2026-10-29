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

**Last updated:** 2026-10-28, after Phase 12 (Passive and the tape). **Repository:** github.com/serek9/SoftStatic, branch `main`. Machine setup and how to move a save between computers: [HANDOFF.md](HANDOFF.md). Working rules for Claude Code: [CLAUDE.md](CLAUDE.md).

### 8.1 Phases

| Phase | Status | Commit | Notes |
|---|---|---|---|
| 1 Foundation | Done | `2f90f2b` | |
| 2 Graphics core | Done | `c147075` | |
| 3 Sailing (Fogbound) | Done | `16901ad` | |
| 4 Cast | Done | `f04a040` | |
| 5 Underwater view | Done | `cd1aece` | |
| 6 Fish, clock, unease | Done | `87206cb` | 4 placeholder species; the full roster is task 14.1 |
| 7 Bite, fight, landing | Done | `1b6ab97` | **Milestone A reached** |
| 8 Economy, save, balance | Done | `855d35a`, `ead0edf` | `tools/balance.js` in place |
| 9 Interface | Done | `Phase 9: Interface` | HUD, pause menu, journal, shop, map, cabin; save v3 |
| 10 Anomalies | Done | `b041d97` | **Milestone B reached** (see 8.3 #33 for which §2 elements are live); save v4 |
| 11 Locations 2–4 | Done | `5c9b3c8` | Creek (current), Pines (set pieces), Red Room (moving structures, unlock), scenery hook, the shared pier. No fish there yet (14.2–14.4) |
| 12 Passive and the tape | Done | `Phase 12: Passive and the tape` | `sim/passive.js` (61.6% of active income), live mode on TAB, time away, the tape with phantoms, `?compact`, one tab owns the save |
| Audit batch 1: Atmosphere | Done | `Audit batch 1: Atmosphere` | From [SOFTSTATIC_IMPROVEMENT_AUDIT.md](SOFTSTATIC_IMPROVEMENT_AUDIT.md) (approved by the user 2026-10-29): sky, fog and mist, water light, visible gear, the map gate for unstocked waters, the creek canopy. Visual only (plus the map gate); replay and pacing unchanged |
| 13 Audio (audit batch 2) | Done | `Audit batch 2: Audio` | 13.1–13.4 in `js/audio/engine.js`, with the audit's P0-1 cues (bite, run, drag, reel, tension) |
| Audit batch 3: Feel | Done | `Audit batch 3: Feel` | P1-4 feedback, P1-6 petting the dog, P1-7 the HUD fades when idle |
| Audit batch 5: Life (P2) | Done | `Audit batch 5: Life` | P2-1 ambient life, P2-2 passive presentation, P2-3 underwater |
| Audit batch 6: Polish (P3) | Done | `Audit batch 6: Polish` | P3-1 drizzle, P3-2 still mode, P3-4 the 8.4 minors. P3-3 (a committed screenshot script) left out: it needs Playwright, a dependency the project does not have |
| 14 Content and polish | Done | `Phase 14: Content and polish` | **Milestone C reached.** 36 species, final balance, touch, performance, save migrations |
| 15 Visual detail | Done | `Phase 15: Visual detail` | Asked for by the user on 2026-10-29 (not in §4), against reference shots of Cast n Chill: tasks 15.1–15.6 in 8.3 #74–80 |


Every task in Phases 1–12 met its "Done when" check from §4. Each check was run and its output reported in the conversation that built it.

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
          loc_red.js   Red Room: curtains, zigzag floor, movers and place(seed, xs), crimson reflect, the
                       unlock condition (need.windowCatch), maxDepth 80 px (20 m), cost 6000
          fish.js      clock windows, rarity weights, 4 species, validateFish()
          gear.js      rod/reel/line tiers, baits (with shop pack sizes), lantern, depth finder, fight
                       constants, economy constants, cabin stages,
                       passive.incomeMult (D5)
          dialogue.js  the shopkeeper: small talk and the special lines (hints, repeated, reversed)
          anomalies.js the anomaly list and scheduler constants, validateAnomalies()
js/sim/   clock.js     hour advance, grey/night, windows, per-cast latch, cue crossing (the owl)
          unease.js    per location 0..1; anomaly scheduler; castBoost (anomaly and spots); lateHint (10.5)
          fish_ai.js   speciesWeights/pickSpecies, the school (max 8) and its states
          bite.js      2 s hook window, a missed fish may return once
          fight.js     the V4 tension model and autoPlayer(skill)
          economy.js   price, sizeFactor, gear effects, purchases, bait use, catches, unlocks, cabin restoration
          passive.js   passive cycles (plan, apply, cycle), time away (offline, away), the tape (record, finish)
js/gfx/   bake.js      offscreen canvases, layers, flipped copies, lazy cache
          sprites.js   palette (only hex in the code), sprite DSL, bitmap font, wrap, hash
          fx.js        particle pool (256) and ripple pool (32), splash
          water.js     mirror reflection; reflection deltas (figure, lit window, second pier) drawn only there
          fishgen.js   8 bases × 15 parts, wrongness, asymmetry, shimmer; ?gallery combinations
js/scene/ boat.js      boat physics, rod geometry and bend
          dog.js       6 poses, interest thresholds, the stare and the bark (cues)
          underwater.js  cross-section (with submerged snags), lure sink/stop/reel and the current's drift,
                         fish drawing, bite -> hook -> fight -> landing, heavy-fish shadow
          scenery.js   scenery modules (11.4): 'pines' (blinking signal, neon, fluorescent lot lamps, the
                       perched owl) and 'red' (curtain and zigzag painters, moving structures, crimson wash)
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
          tape.js      overlay: the VHS tape of passive fishing (time away and live), and away(now) for boot
tools/    balance.js   --validate [--strict], --replay <seed> [min], --pacing (Node; loads the scripts listed in index.html)
```

**Scenes and overlays:** the scene manager holds `sailing`, `shop`, `cabin` and `gallery`. Each boot-loop step first calls `G.ui.menu.update(dt)`; while an overlay (pause, journal, map) is open it takes the step and the scene does not update, and `G.ui.menu.draw` draws it over the scene.

**One update step** (`sailing.update`): TAB (or, while passive, a move or the action key) toggles passive mode → gear effects → clock → unease → anomaly scheduler → owl → cast steps (charge, flight, or the lure under water, drifting where there is a current) → fish school → passive cycle → scenery module `update` → `underwater.catchStep` (bite, hook, fight, landing, card) → card input → boat → dog cues and dog → camera → underwater view (fade, vertical camera) → particles.

**Drawing order** (`sailing.draw`): sky and layers (the scenery module's `afterLayer` after each) → mirror (anomaly deltas, then the module's `reflect`) (only when the camera is at the surface) or the cross-section → waterline glints → particles → boat and dog → hooked fish → line and lure → HUD → card; then any overlay.

**Run state** (`G.state.run`, never saved): `fsm`, `loc`, `boat`, `dog`, `cam {x, y}`, `uw {alpha}`, `cast` (charge, landing x, lure position, seed, `tw` time in the water, `latched` windows, bait, `boost {attract, rare, legend}`), `school`, `lureIn`, `bite`, `fight`, `hook`, `heavy`, `gearFx`, `dogIn`, `uneaseIn`, `anom` (the active anomaly, gap, next roll, cooldowns), `anomIn`, `owl`, `spots` (the location's spots as they stand for the next cast), `scen` (the scenery module's own state, or null), `passive` (on, the cycle's sim state `ps` and its plan, time into the cycle, the float's x, the live tape, the HUD note; carried across travel).

**Save** (`G.state.save`, version 4): `coins`, `gear {rod, reel, line, lantern, depthFinder, bait}`, `baits {id: count}`, `journal {id: {caught, bestLen, bestW, hints, seen, phantom, read}}` (`read` is set when the entry is looked at; absent means NEW; `late {ref: true}` and `lateNew` mark hints written in later, 10.5, and such an entry can exist with `caught: 0`), `kept [{id, len, w}]`, `cabinLevel`, `unlocks {fog: true}`, `loc` (where the game resumes), `unease {loc: 0..1}`, `clock` (a new game starts at 19:00), `flags {windowCatch {windowId: true}, lines {lineId: visit said on}, shopVisits, heavy {loc: true}, anomalies {id: times seen}, dogStare {loc: true}, lateAt}`, `settings {volume, mute}`, `lastSeen`, `rng`, plus `tapes` (P12). Migrations v1 → v2 → v3 → v4 exist.

### 8.3 Technical decisions

These are interpretations and additions made while building, where the spec above was silent or ambiguous. Keep them unless a task says otherwise.

1. **Debug text is page text, not canvas text.** It stays readable at any scale and survives a crashed loop. Errors show in red even without `?debug`. Game text still uses only the bitmap font.
2. **State machine exits to `sailing`:** cancel a charge, reel in early, snap, escape. This is the "no fail states" rule.
3. **Save format:** `SS1.<base64 of JSON>.<FNV-1a checksum>`, used for both storage and export. A corrupt save is copied to `softstatic_save_v1_corrupt` and the game starts fresh. Migrations are `migrations[v]` in `save.js`; v1 → v2 exists.
4. **Autosave** happens on catch and purchase (and on travel from 9.5), and also when the tab is hidden or closed, so the clock and unease survive a reload. `?seed=N` overrides the saved RNG state.
5. **Reflection:** the scene above the water is redrawn mirrored into a buffer each frame, instead of storing flipped layers. The boat and dog reflect too. `water.setDeltas(fn)` draws reflection-only content (P10.2).
6. **Underwater:** the cross-section fades in with the camera at the surface. On the way back the camera returns to the surface before fading out, so the mirror is never drawn with the camera below it.
7. **Lure control:** the lure hangs below its entry point. Tap action while it sinks to stop it at a depth; hold to reel up and in (it is out at the surface). Above water the line runs to the entry point; below it drops dotted.
8. **Clock windows** latch only when the lure lands (D1); a window that is open right now always counts.
9. **Fish only notice baits listed in `baitLikes`** (or any bait if the list is empty). Fish near a lure drift toward it, and toward its depth when that depth is in their habitat (`fish_ai.A.scent`, `drift`).
10. **Species `speed` is in V4 fight units** (1.0–2.2). Swimming moves at `speed × 10` px/s.
11. **The fight starts at D = 0.6** (`gear.fight.d0`). On screen the hooked fish stays within 140 px of the boat, and the camera frames boat and fish together.
12. **Auto-player landing band** (7.3; the spec gives none): skill 0.8 with starter gear lands at least 90% of fish within the line's rating (strength ≤ line strength), and stronger fish less often but above 40%.
13. **Gear tiers are linear upgrades** (`save.gear.rod = 2` means tier 2 is owned and equipped). Bait: one per cast; worms are unlimited; with none of the equipped bait left, worms go on. `attract` shortens time between fish arrivals; `rareBoost` multiplies rare and legendary weights.
14. **Unlock costs** live in each location file (`cost`, and `need` for a condition) since 11.1; `data/gear.js` no longer has `unlocks`. The Red Room's condition is any landed catch whose cast was latched in a window (`flags.windowCatch`); see #34.
15. **Pacing model** (`tools/balance.js`): an active player at depth 8 m, hooking 90% of bites, fight skill 0.85, buying in the order `PLAN` (line, reel, rod, lantern, depth finder, creek, …). It fishes the Fogbound roster for the whole run, because no other location has fish yet.
16. **Run state is built by `sailing.load()`**, not by `state.newRun()` (which only creates `fsm`, `fsmPrev` and `fsmT`).
17. **Overlays and scenes (9.2):** pause, journal and map are overlays over the current scene; shop and cabin are scenes. While an overlay is open the world waits (no clock, fish or fight). P pauses anywhere, and Esc pauses on the water; J opens the journal anywhere; M opens the map only from the boat with no line out. In the shop and cabin, Esc or M leaves.
18. **New input actions:** `up` (W, ↑), `down` (S, ↓) and `back` (Esc) for menus; Enter also counts as `action`. Menus are keyboard-only until touch (14.6).
19. **The map is the hub (9.5):** it lists the four waters plus the Bait Shop and the Cabin (both on the Fogbound shore). Choosing one fades out, switches at full black, then fades in. `sailing.load` bakes everything a location draws, its underwater cross-section included, and sets `save.loc`; travel autosaves. Paying to open a location autosaves as a purchase. Locations without data show their name (from `gear.unlocks`) and "Not charted yet".
20. **Export and import (9.2):** export saves first, then copies the `SS1` string to the clipboard, falling back to the browser's own prompt to show it. Import reads it with the browser's prompt, a DOM dialog like the debug text (decision 1). Import works only between casts, then rebuilds the run at the save's `loc`. A damaged string is refused and changes nothing. Settings changes autosave when the pause menu closes.
21. **Journal (9.3):** hints are discovered by catching: the species' `hintRefs` on the first catch, the baits it takes on the second, its depth and hours on the third. Headings and filters are printed; entries are handwritten with jitter equal to the current location's unease. The handwriting is stable frame to frame (hashed, never random). The D4 margin note shows when `flags.heavy[loc]` is set (sailing sets it while a too-heavy fish is near) and some species there is still heavier than the rod holds.
22. **Shopkeeper (9.4):** one line per visit, chosen without RNG. A special line is said once per save, no sooner than its `after` visit, at least `gap` (2) visits after the last special, and `night` lines only outside the grey hours. `flags.lines[id]` stores the visit it was said on. Kind `repeat` is said twice; kind `reverse` is shown with its characters reversed. Otherwise small talk rotates.
23. **Shop purchases:** gear and equipment buy the next tier. Baits sell in `pack`s (`data/gear.js`). Choosing a bait you have in stock but are not using equips it first; choosing it again buys a pack. Buying a bait also equips it, and Nightcrawlers simply equip. The shop runs the clock and drains Fogbound's unease (`atShop`), because the shop stands on Fogbound's shore (settled in audit batch 6, 8.4 #15).
24. **Cabin (9.6):** stages and plaque counts live in `data/gear.js` `cabin`, and `economy.restoreCabin` pays for the next stage. Kept fish are mounted heaviest first, and those without a plaque are counted as "in the icebox". In `enter()` only, `round(unease × mounted)` trophies are turned to face the door. Unease is the run's location's; which trophies turn is picked with `G.vrng`. A restoration bought inside adds empty plaques, which are filled on the next entry, so the wall never changes while visible. The cabin runs the clock but leaves unease alone.
25. **HUD (9.1):** clock, coins and bait (with count, except worms) in the top-left over the sky, with a 1 px ink shadow; depth stays in the top-right while underwater. Hidden while the card is open. Strings are rebuilt only when their value changes.
26. **The anomaly scheduler is separate from unease's own step (10.1):** `unease.anomalyStep(run.anom, input, dt, rng, data)` runs only in the game (sailing), so the headless pacing and replay sessions are unchanged by anomalies (the replay hash did not move). It rolls every `check` (4) s while none is active, with chance `chance × unease` (0.12 × unease), never within `gap` (45) s of the last one ending, and each anomaly has its own cooldown. All of this lives in run state and resets on reload. What is saved: `flags.anomalies[id]` counts. Anomalies run only while the sailing scene updates, so they wait under overlays and inside the shop or cabin. Measured over 3 simulated hours: about one every 3 min at unease 1, one every 15 min at 0.35, none at 0.
27. **Anomaly placement:** `place: 'near'` puts it 40 px to the rod's reach from the boat, on either side (the other side if it would leave the world), so a cast can reach it. `place: 'boat'` is the boat itself. Every anomaly fades in and out over 2 s, and its length is `params.dur`, at most 60 s by validation.
28. **Cast boosts (10.1, 10.3):** `unease.castBoost` runs when the lure lands and is kept in `cast.boost` until the next cast starts. An active `spotBoost` anomaly within `params.r` multiplies rare (and legendary) weights. Location spots add `attract`, `rare` and `legend` (legendary only; fish_ai's new `ctx.legendBoost`). Fogbound's hidden `reed_gap` gives attract 1.6 and rare 2; the new `cold_hole` (x 880) is a legendary spot giving legend 4. `dbg.cast` now goes through the same per-cast reset as a real cast (it used to keep the previous cast's latched windows).
29. **Reflection deltas (10.2):** drawn by `water.drawDelta` through the existing `setDeltas` slot, so only into the mirror buffer. Figure: pale, at the water's edge. Window: a cabin silhouette with a window lit at `dusk_high`, the ceiling. Pier: a second pier. The boat with no fisher is the mirror pass drawing the boat with `withFisher` false. The check compares two renders with the anomaly on and off and ignores differences of 4 or less per channel: the renderer dithers by ±1 depending on what was drawn before, everywhere on screen.
30. **Dog cues (10.3):** the stare happens when the boat comes within 110 px of the location's `hidden` spot, once per location (`flags.dogStare`), for 4 s. The bark happens within 80 px of a `legendary` spot, but only while a legendary species lists that location. Afterwards it re-arms once the boat is more than 160 px from every legendary spot. Fogbound has no legendary yet (14.1), so the dog does not bark there today. The check used an injected test species.
31. **The owl (10.4):** `clock.cueCrossed` reports when a step passes a window's `cue`. An owl then shows on a snag on the shore (screen x 250 of the view at that moment) for 7 s, calls at 1.5 s as two spreading rings, and the dog looks up (alert, 2 s). It is drawn with the backdrop, so it reflects too. No sound until 13.3.
32. **Late journal hints (10.5):** `unease.lateHint` runs when the journal closes. It needs this location's unease ≥ 0.4 and at least one catch since the last late hint (`flags.lateAt` holds the catch total then). It writes the first hint not yet known, uncaught species first, in data order. Candidates are the species' `hintRefs`, then `bait`, then `depth`; bait and depth are skipped if catching has already shown them. No RNG is involved: the same save gives the same line. Late notes are drawn in `night_blue`, the cell gets a `*` until the page is viewed, and an uncaught species' page shows them under "Not caught yet." The `empty_boat` anomaly's `revealHint` uses the same function, forced past the gates.
33. **Milestone B, as built:** of §2's elements, these are live on Fogbound: unease, clock windows with the owl, heavy-fish hints, catch-card lines, the dog (point, look down, stare; the bark is ready and waits for a legendary species, 14.1), reflection deltas, the shopkeeper, journal handwriting and late pages, and cabin trophies. Still to come by plan: moving structures (Red Room, 11.3), set pieces (11.2/11.4) and the tape (12).
34. **The Red Room's unlock stays "any window catch" (11.3):** `need: {windowCatch: 'any'}` in `data/loc_red.js`; `economy.canUnlock` also accepts a window id there. V6 asks for a specific fish in a specific window, but the pacing model fishes at 8 m and never catches the window-only `owl_eel` (12–24 m), so narrowing it now would make `--pacing` report "red: never". Narrow it with the Red Room roster (14.4), and teach the pacing model to fish the window deep then.
35. **The creek's current (11.1):** `drift(seed, t, depth, onBottom)` in `data/loc_creek.js` is the whole rule: it ramps up over `ramp` s, sways by ±`sway` with a phase hashed from the cast's seed, slows with depth (half as fast at `maxDepth`) and only creeps on the bottom (×0.2). `underwater.lureStep` adds it to `cast.x1` each fixed step while sinking, waiting or nibbling, so the line's entry point follows the lure. At 3 px/s the lure goes about 70 px in 30 s at 6 m and 14 px on the bottom. Any location with a `drift` function gets a current.
36. **Scenery modules (11.4) are a new file, `js/scene/scenery.js`** (not in the §3 tree), registered as `G.scene.scenery[id]` and named by `loc.scenery`. The hook in `sailing.js` takes optional parts: `paint` and `landmarks` (extra painters, baked once), `load`, `update`, `landed`, `afterLayer` (draws over a given layer at its scroll, so near layers still cover it and the mirror reflects it), `reflect` (mirror pass only) and `debugLine`. Fogbound and the creek have no module. Generic painters stay in `sailing.js` (the creek's `trunks`, `cabin`, `snag`); a module's painter wins for its own kinds.
37. **The traffic light (11.2)** blinks every 1.4 s, at 0.45 s inside a clock window, and closes in on that over the game hour before a window opens (`scenery.pines.blinkPeriod(hour)`, pure). Its phase runs at the current period, so it follows `dbg.hour` straight away. The perched owl opens its eyes while a window is open. The neon and the stuttering fluorescent lamp use a hash of time, never RNG. The 10.4 window owl still appears on its own snag in the Pines too.
38. **Moving structures (11.3):** the lamp (rare ×2.5), the armchair (attract ×1.5) and the statue (attract ×1.2, rare ×1.5) each carry a spot. `place(seed, xs)` in `data/loc_red.js` lays them out (60 px from the ends, 140 px apart): from the location's seed on arrival, then, once a cast has landed and its boost is decided where things stood, from that cast's seed. They fade across over 2 s. `unease.castBoost` now takes the spots list (`run.spots`) instead of the location. The legendary and hidden spots stay put, and the dog's cues still read `loc.spots`. The layout is run state, so a reload starts again from the location's seed.
39. **The same pier (11.4):** a landmark with its own `seed` paints from that seed instead of the layer's shared stream. Fogbound's pier and the Pines' pier both have seed 3301 and are identical pixel for pixel. Giving Fogbound's pier a seed changed how Fogbound's other landmarks bake slightly (they no longer share a stream with it).
40. **Crimson reflection:** the Red Room's module washes the mirror buffer with `crimson` at 0.55 (`loc.reflect`), so `water.js` is unchanged. Through the water's 0.35 alpha and depth shade it reads as a dark red reflection.
41. **Anomalies by location:** the reflected figure and the empty boat can appear on all four waters, the lit window on Fogbound, the creek and the Pines, the second pier on Fogbound and the Pines.
42. **Passive cycles (12.1):** `passive.plan` decides a whole cycle as it starts: wait = `base` (48 s) / (rod × bait attract) × 0.6–1.4, the species from `pickSpecies` at the hour the wait ends (windows latched when it starts, D1), an automatic hook, and the fight stepped at 1/60 with `autoPlayer` at skill 0.8 (at most 120 s, then an escape). `apply` sells the catch for price × `incomeMult` through `economy.recordCatch`; passive never keeps fish. The lure sits at 8 m (above shallower bottoms) and uses one bait per cycle. `base` is tuned so a cycle earns what an active cast earns (before `incomeMult`: 1.03×), so `incomeMult` alone sets the share (D5): 61.6% over 10 seeds × 60 min. The boat is still in passive, so at night unease rises faster than in active play, which brings in the Hollow Pike; that is the V10.1 reward for patience, and it is part of the measured share.
43. **Live passive (12.2):** TAB turns it on from any state. A lure that is out (casting, sinking, waiting, interest) is reeled in. A fish already on (hooked, fighting, landing, card) is fought by the auto-player and sold after the card has shown for 1.2 s, then the cycles start. Each cycle is `plan`, run in real time while the scene's own clock and unease go on, then `apply`, so live and time-away income match (§5). TAB, a move or the action key turns it off (that key does nothing else that step, so input is never blocked or doubled), and the tape of that stretch opens. The float sits 60 px ahead of the boat, and its spot counts (`castBoost` on spots and an active anomaly), which time away cannot have. Passive carries on across travel. It waits under overlays and in the shop and cabin, like the rest of the world. The HUD shows "TAB passive" between casts and "PASSIVE TAB" with the last result while on; the clickable button is 14.6 (`TODO(P14.6)` in `hud.js`).
44. **Time away (12.3):** on boot, `G.ui.tape.away(Date.now())` hands `now` to `passive.away` (the sim reads no Date). From 60 s away, the time (capped at 8 h) is fished from its start in back-to-back cycles, at most 200, at the saved location; whatever is left passes with the boat still. **The game clock now moves with time away** (before Phase 12 it resumed where it was saved), and unease follows the hours that passed. A cycle that would overrun the remaining time is not fished, but its bait was already used. Time away has no anomalies and no spot boosts.
45. **The tape (12.4)** is decided in the sim, from the same rng: a catch is listed as `???` with chance unease × 0.1 × (1 + wrongness). One missing range of 15–40 game minutes is cut with chance unease × 0.6 (from unease 0.3, on a tape of at least one game hour). A phantom is added with chance unease × 0.5 (from 0.5) when this water has a species never caught or phantomed that the rod holds and the unease allows. Unease here is the highest while the tape recorded, because a long time away usually ends in the grey hours. The phantom is a handwritten tape line and a journal entry `{caught: 0, phantom: true}`. The journal shows its picture faintly with "My writing. I do not remember catching it.", and it never counts as caught; `recordCatch` clears the flag when you really catch it. Totals on the tape count only real catches, including the hidden and `???` ones. The newest three tapes are kept in `save.tapes`. It plays line by line: action shows the rest, then closes; Esc closes.
46. **`?compact` (12.5):** the game draws its normal 320×180 frame into an offscreen canvas, and `hooks.present` halves it onto a 160×90 page canvas with smoothing on (the one place smoothing is used, so 1 px lines survive the halving). The page canvas is then scaled up with whole pixels as usual. No HUD. It starts in passive mode, and its tape closes itself 6 s after it has played, since nobody may be watching.
47. **One tab owns the save (12.5):** each tab claims `softstatic_save_v1_owner` on boot. A tab that sees another claim (the `storage` event) stops stepping and stops saving (`persist` refuses, the `pagehide` autosave included), and shows "Fishing in another tab. Click to fish here." A click or key claims the save again and reloads the page, so it continues from what the other tab saved. This is how a `?compact` tab works next to a normal one without either overwriting the other.
48. **`tools/balance.js --passive`:** the active model with `shop: false` (both keep the starter gear) against passive cycles, from a new save on Fogbound at 19:00, 10 seeds × 60 min each, plus time away run twice from the same save and seed. Not part of `--pacing`.


**Audit batches.** On 2026-10-29 the user approved the improvement audit ([SOFTSTATIC_IMPROVEMENT_AUDIT.md](SOFTSTATIC_IMPROVEMENT_AUDIT.md)) and asked for it to be built batch by batch (its §7), one commit per batch. Its tasks (P0-x, P1-x, P2-x) are recorded here, not in §4.

49. **Sky (audit P1-1; the user approved this reading of §0.9 on 2026-10-29):** the sky blends palette keys from keyframes (`SKY_KEYS` in `sailing.js`, four keys from the top to the horizon), not only `night_ink` to `dusk_amber`. The intermediate keys are dusk and fog keys, all under the ceiling, and `S.skySafe` still throws on a brighter colour. Night is ink and blue with a faint violet horizon (darkest at 03:00); dawn (about 06:00) and dusk (about 19:00) run through violet, plum, rose and amber; **the grey hours are a flat overcast** (`fog_dark` to `fog_light` at 12:30), the "grey" of §0.8, instead of the warmest sunset. The sky is a full-width canvas of 14 bands with one dithered row at each boundary, rebaked every 0.05 game hours. `nightF`, `greyF` and `duskF` (0..1) are the presentation's light shares; `skyBrightness` is now 1 − night.
50. **Stars, moon, glow and clouds (P1-1):** baked once per location from their own seeded streams: two star fields (`fog_mid`, `fog_light`; one twinkles), a 7 px moon with a halo that rises at 19:30, is highest about 01:00 and sets by 06:30 (hidden in the grey hours), a dusk glow (`dusk_amber`, stepped alpha) on the horizon at dawn and dusk, and one wrapping cloud shape (640 px) baked in four colours (night, grey, dusk, the dusk underside) and cross-faded by the light shares, drifting at 1.6 px/s. All are drawn in `drawBackdrop`, so the mirror reflects them. `loc.sky` places the moon and the glow (`moonX`, `glowX`, sky pixels at parallax 0.03) and switches parts off; the Red Room has none (indoors).
51. **Fog (P1-2; closes 8.4 #1):** fog layers are baked 3× (`FOG_HEAD`) as dense as their data `alpha` and drawn at `fogMul / 3`, where `fogMul = 1.4 + 1.1 × grey + 0.6 × unease` (capped at 3). So at night with no unease fog is 1.4× its old look, and it thickens in the grey hours and with unease. Fog layers drift by their `drift` (px/s), wrapping. `loc.mist` is a low band on the water (parallax 1, drifting) drawn over the boat, in the main pass and in the mirror pass, at the same alpha.
52. **Water light (P1-3):** `water.draw` takes an optional `light {x, a, key, w}`: a broken path under the moon (`fog_mid`) or, when the dusk glow is stronger, under the glow (`dusk_rose`), narrow at the horizon and wider nearer, swaying with the mirrored rows; then 16 glints (`water_hi`) that drift and blink by hash. Both are drawn before the depth shade, so they darken with depth. No RNG, no per-frame allocation; the reflection pass measured 0.40 ms.
53. **Visible gear (P1-5):** `boat.draw` takes an optional `gear {rod, lantern, finder, night}`. The rod's colour follows its tier (`stone_hi`, `wood_hi`, `rust_hi`, `moss_hi`, `bone`; its length is unchanged so casts are not affected). The lantern hangs from a bow pole with a baked `dusk_high` halo at night (`lamp_glow` only in the 2 px flame). The depth finder blinks a `neon_teal` pixel at the stern. A contact shadow (`water_deep`) sits on the water under the hull.
54. **Map gate (audit P0-2):** a water no species lives in (`G.ui.map.stocked(id)`) cannot be bought; the map says "The water is still settling. Nothing lives here yet." A water already bought stays open. UI only: `economy.canUnlock` and the pacing model are unchanged. It lifts by itself when 14.2–14.4 add the rosters.
55. **The creek's canopy (P2-5, done early):** the `trunks` painter no longer draws loose crowns (they read as floating lollipops); trunks run off the top of the view and a ragged `moss_dark` canopy edge runs along the top.

56. **Audio (Phase 13 and audit P0-1), all in `js/audio/engine.js`:** the context is created on the first key, click or touch (a modifier key alone is not a user activation in Chrome, so the first real key starts it) and suspended while the tab is hidden. Buses: music 0.45, ambience 0.75, effects 0.9, into a master gain (`volume × 0.8`, 0 when muted or while another tab owns the save) and a `DynamicsCompressor` limiter (−6 dB, ratio 20, attack 3 ms). Every one-shot has an attack of at least 5 ms and a peak gain of 0.12 or less. `index.html` calls `G.audio.engine.step(dt)` after every fixed step; the engine **reads state only** and plays what changed since the last step. So nothing in the sim knows about audio, and the replay and pacing are unchanged.
57. **What plays (13.2–13.4):** ambience: wind (stronger in the grey hours), still water, lapping that grows with boat speed, a drone whose third tone goes out of tune with unease (+12 to +67 cents), the creek's stream, the Pines lot's 60 Hz hum (it drops out when the stuttering lamp does: `scenery.pines.lampLit(t)`, now shared by the drawing and the hum), night crickets at the creek and the Pines, a foghorn on Fogbound every 2–4 min and distant clanks on Fogbound and the creek (timing from `G.vrng`). Indoors (shop, cabin) the ambience goes through a 520 Hz low-pass. Effects: charge click, cast whoosh, landing splash, bite "plip" (panned to the line), hook-set, the run (a falling hiss when the fight turns from tired to pull), the slip, snap and escape, landing drips, card page, a soft sting for rare and legendary catches, the coin on a sale, the shop's purchase, menu pages, the heavy-fish line hum, the owl's two calls with an answer from the far shore, the traffic light's relay click, radio static on travel. Reel clicks while reeling (11/s) and the drag ratchet while a running fish takes line (26/s). The tension tone rises 160→420 Hz with T. The Pines play slow chords (Dm9, G13, Cmaj9, A7♭9), one every 4.5 s, each voice detuned and wobbling more as unease rises. The pause menu ducks the effects to 0.3.
58. **Allocation note:** Web Audio one-shots need new source nodes, so each sound allocates a few nodes when it plays. These are events, not per-frame work. The per-step path only calls `setTargetAtTime` on existing nodes.

59. **Feedback (audit P1-4):** a bite opens a ring where the line goes in (on the step the bite starts) and the rod tip dips about 2 px (angle −9° at most, was −5°). The hook-set splashes at the surface (power 0.25) and snaps the rod (+6 bend, gone over the 0.3 s hooked beat). Landing sheds two droplets per twelfth of the lift while the fish is out of the water. The catch card slides up 70 px and its dim fades in over 0.25 s (ease-out), timed by `card.tick(dt)`, which sailing calls every step while the card shows (passive included). The 0.4 s input guard is unchanged. No hitstop and no shake (§0.14).
60. **Petting the dog (P1-6):** S or ↓ while the boat sits still between casts (not in passive) calls `dog.pet`: pose `pet` (eyes shut, ears back, the tail wagging at 7 frames/s) for 2 s, at most once every 3 s, and never over the stare or the bark. Run state only (`dog.petT`); nothing is saved and nothing is rewarded. The audio engine plays three soft pats and a small contented sound. A click on the dog is not used: the mouse button is the cast. `dbg.pet()`.
61. **Calm HUD (P1-7):** `hud.update(dt, run)` (from sailing's update) counts idle seconds; any mapped input (`input.any()`), a line out (any state but `sailing`), passive news, or a change of coins or bait resets it. After 6 s the clock, coins, bait and passive label fade out over 1 s. The depth readout (underwater) and passive news always show. "TAB passive" shows only until passive has been used once this session.

62. **Ambient life (audit P2-1):** every 2–6 s (`G.vrng`) the scene puts a ring, and sometimes a droplet, above one fish swimming shallower than 16 px (4 m). It reads the school only. Fish live only while a lure is fishing, so the rings show then. Two bats cross the lower night sky (night share above 0.5, not in the Red Room) in some 26–35 s stretches, by a hash of time. `loc.life.fireflies` (the creek: 16) blink along the bank at parallax 0.7 at night, 1 px `lamp_glow`. Two moths circle each lit lamp in the Pines lot (`paper`). Bats and fireflies are drawn in `drawBackdrop`, so the mirror shows them too.
63. **Passive presentation (P2-2):** while passive fishes and no fish is on, the dog sleeps (pose `sleep`, breathing at 0.7 frames/s; `dogIn.sleep`, the lowest priority in `dog.want`). A passive catch rises from the float to the boat over 0.9 s, shedding droplets. Between casts, with the boat still, the fisher sips from a thermos for 3 s of every 34 (`fisher_sip`, `stone` cup, `fog_light` steam), in active and passive play alike.
64. **Underwater (P2-3):** while the cross-section fades in or out it also opens downward from the surface (a clip of `1 − (1 − alpha)²` of its height), so the view seems to dip under. The camera itself is unchanged (8.3 #6 still holds). With the lantern, outside the grey hours, a faint `water_hi` cone falls from the bow. Fish drawn in colour get a 1 px outline: their silhouette (`water_deep`) drawn at four 1 px offsets at 0.7 alpha, then the sprite.

65. **Drizzle (audit P3-1):** from unease 0.45 (full at 0.8), in about one game hour in four (`hash(loc.seed, hour) & 3 === 0`), fading in and out over the first and last 15 game minutes of the hour. Up to 60 streaks (`fog_mid`, 1×2 px, slanting) fall in front of everything, about 6 rings a second open on the near water (`G.vrng`), the reflection's alpha drops by up to 35% (`light.mirror` in `water.draw`), and the ambience adds a high hiss. Never in the Red Room. Presentation only. `dbg.rain()`.
66. **Still mode (P3-2):** H (new input action `still`) hides the whole HUD until pressed again; the catch card still shows. For screenshots and for simply looking.
67. **The 8.4 minors (P3-4):** #5: sailing re-runs the pure `speciesWeights` when the rod's limit changes, so `tooHeavyNear` follows a rod upgrade at once (no RNG is used; the replay is unchanged). #17: in the Pines the perched owl calls (its rings rise from it) instead of a second owl appearing (`owl.perched`). #15: kept as built; see #23.

68. **The rosters (14.1–14.4):** 36 species, 9 per water (4 common, 3 uncommon, 1 rare, 1 legendary); the four placeholders keep their ids. Every hint is mechanically true and `--validate` now checks it. The hint kinds are `hour:grey` (timeLikes = the grey hours), `hour:night` (only night hours), `window:<id>`, `unease` (uneaseMin > 0), `bait:<id>` (in baitLikes), `depth:deep` (habitat reaches 60% of the water's depth), `depth:shallow` (8 m at most), `spot:<id>` (a legendary spot, which needs a `where` text) and `mover:<id>` (a rare-boosting mover; rare species only). The journal prints each kind. Each water's legendary lives at its legendary spot, so the dog's bark (10.3) is live everywhere. Each legendary needs a better rod (8–16 kg), and Fogbound's Wreck Catfish (3.6 kg) is heavier than the cane rod, so the heavy-fish hints (D4) show from the start. Commons get dearer from water to water (Fogbound 5–8, creek 8–12, Pines 20–27, Red Room 30–34).
69. **The Red Room's key (V6, closes 8.3 #34):** `need: {windowCatch: 'owl_333', fish: 'three_thirty_three', text}`: the Pines' rare fish, which bites only in the 03:33 window and lives 20–28 m down. `economy.canUnlock` checks `need.fish` against the journal (a real catch, never a phantom). The map shows `need.text`. The cost is now 5500 (V6 says "about 6000"; 14.5).
70. **Final balance (14.5):** the pacing model now moves to each water it opens (depth per water: Fogbound 8 m, creek 6, Pines 8) and, in the Pines, hunts the key: in or just before the 03:33 window it fishes at 24 m. Prices were set by that model. Passive's wait `base` went from 48 to 42 s, so that a cycle earns what a cast earns with the new rosters (1.044 before `incomeMult`, 62.6% after).
71. **Touch and buttons (14.6):** `input.js` maps touches to zones: in play, the left 64 px steer left, the right 64 px steer right and the middle is the action (hold to charge or reel); in a menu, the shop or the cabin, the top and bottom middle are also up and down. Five on-screen buttons (TAB, J, M, P, ESC) at the bottom right are hit-tested in `input.js` and drawn by `hud.drawButtons` over everything (index.html). They show once a touch has been seen, or while the mouse is near them, and a mouse click on a shown button presses it instead of casting. The canvas has `touch-action: none`. Petting the dog stays on S/↓ (no touch zone).
72. **Performance (14.7):** the loop measures update and draw time and the worst frame each second (overlay and `G.core.loop.stats`). In headless Chromium at 1280×720 every case ran at 60 fps: Fogbound surface at night, draw 1.07 ms, worst frame 4.7 ms; with an anomaly, drizzle and fog at unease 1, 0.97 / 4.9 ms; underwater with 8 fish and the lantern cone, 0.43 / 2.1 ms; the Pines with its signal, neon and lamps in the owl window, 1.21 / 6.6 ms. The reflection pass took 1.26 ms at most (3.4's budget is 2 ms). Nothing needed optimising.
73. **Save migrations (14.8):** `node tools/balance.js --saves` builds a save shaped as each milestone wrote it (the `defaults()` of Phases 1, 7, 8, 9, 10 and 12, from git history, with some play in them). Each goes through the real export string and import, then is checked against today's defaults (gear, flags, settings), the economy, the unlock checks, a passive plan and the journal's species. A damaged string is refused. No save field changed in Phase 14 or in the audit, so the version stays 4. The vm context now has `TextEncoder`, `TextDecoder`, `btoa` and `atob`, which the export string uses.

**Phase 15, visual detail (2026-10-29).** The user asked for a phase to lift the overall look to the level of detail of five Cast n Chill screenshots they supplied (painted mountains and forests, a split view with a bright waterline, clear reflections, a visible boat, fisher and dog, detailed underwater scenes). It is not in §4, so its tasks are defined here: 15.1 split view, 15.2 painted layers, 15.3 the light of the hour, 15.4 boat, fisher and dog, 15.5 landmarks, 15.6 underwater. All of it is presentation: no sim or save change.

74. **Split view (15.1):** the cross-section is always drawn. At the surface a band of mirror water (`loc.mirror`, default 34 px) covers its top; the band shrinks to nothing as `uw.alpha` rises, which replaces the opening wipe of 8.3 #64. A bright waterline (`water_foam`, with a slow small wave, and a lit row of `water_lit` under it) marks the cut. `water.draw` takes `band` and draws only those rows. The mirror is clearer (alpha 0.5, was 0.35) and broken by 26 drifting horizontal streaks. The invariant of 8.3 #6 holds: the mirror is only drawn with the camera at the surface.
75. **Painted layers (15.2), in a new file `js/gfx/paint.js`** (`G.gfx.paint`; the user's request for the phase covered it). All painters are baked once from the layer's seeded stream:
    - `mountains`: ridged noise in three octaves, faces lit by the slope averaged over 9 columns, a few soft gully shadows, a haze at the foot, and the old ridge's features (the tower, the mast).
    - `forest`: tiered, jagged pines lit on the left and speckled; round trees made of dithered leaf clumps; birches.
    - `shore` (layer kind `bank`): shaded boulders, reed clumps with cattails, grass.
    - Clouds: one level mask (shadow, body, lit) with streaks, baked in four colourings: night, grey, dusk, and the rim alone.

    Fogbound has far peaks and a ridge with the tower, a pine forest, tall pines by the water, and a reedy shore. The creek has hills and a mixed forest. The Pines have mountains, an autumn forest, and tall autumn trees and pines near the water. The Red Room keeps its curtains. Painters set `fillStyle` only when the key changes and fill runs of one key, so a water now bakes in 60–75 ms at the travel fade's full black (boot: 124 ms in all).
76. **The light of the hour (15.3):** every painted layer except fog is also baked graded: night (`night_deep` at 0.55, source-atop) and grey hours (`fog_dark` at 0.35). These are drawn over the layer at the night share × 0.9 and the grey share × 0.7, so the land darkens and cools through the night and flattens at midday. Lights drawn after a layer (neon, lamps, the owl) are not graded. `loc.grade: false` turns it off; the Red Room has it off.
77. **Boat, fisher and dog (15.4):** a 34×8 shaded rowboat with a rust stripe and an outboard motor at the stern; a 10×13 fisher in a red cap and a field jacket, hands on the rod; a 12×10 golden dog in the bow, with every pose redrawn (idle, alert, point, look down, stare, bark, pet, sleep). The rod is 22 px from the hands (`ROD {len 22, baseX 3, baseY -6}`). The lantern now hangs from a pole at the stern, the wake starts at the stern (19 px), and the hull's shadow is wider. 14 new palette keys (`mount_*`, `pine_*`, `leaf_*`, `birch`, `reed*`, `rock*`, `dog*`, `coat*`, `cap`, `water_lit`, `water_foam`); `water_*` keys stay under the ceiling.
78. **Landmarks (15.5):** the pier has lit, braced posts, a deck of planks with gaps, a rail and a lamp post. The channel markers are rusted buoys (float, lattice cage, bell, a dead lamp). The wreck shows its ribs. The water tower has bracing, seams and a lit side. The pier is still the same plank for plank in both waters (it paints from its own seed, 8.3 #39).
79. **Underwater (15.6):** the gradient runs from `water_lit` near the surface through blue-green to the deep (2 px steps). A far layer (parallax 0.6, wrapping every 640 px) holds broad rock formations with lit rims and kelp. The bed is lit along its top and speckled with sand, and the boulders are shaded (`u.sand` and `u.rocks` can override the colours).
80. **Sky (15.1):** 28 bands (was 14), each edge dithered over two rows.

### 8.4 Known bugs and pending issues

No crashes or failing checks are known. Open items, roughly by importance:

| # | Issue | Where | Owner |
|---|---|---|---|
| 1 | ~~"Fog thickens in grey hours" (§0.8) is not built~~ Done in audit batch 1 (8.3 #51) | `js/scene/sailing.js` | Closed |
| 2 | ~~No fish in the creek, the Pines and the Red Room~~ Done (8.3 #68); the map gate (8.3 #54) has lifted | `data/fish.js` | Closed |
| 3 | ~~Placeholder roster limits~~ Done: legendaries bark, heavy hints show, the hidden spots' rare boost pays outside the window (8.3 #68) | `data/fish.js` | Closed |
| 4 | ~~No audio yet~~ Done (8.3 #56) | `js/audio/engine.js` | Closed |
| 5 | ~~`tooHeavyNear` stale after a rod upgrade~~ Fixed (8.3 #67) | `js/scene/sailing.js` | Closed |
| 6 | Pacing margins are thin: creek median 46.1 min (band 30–50) and Red Room 338.5 (150–360). Cabin costs are still outside the model | `data/fish.js`, `tools/balance.js` | Watch when tuning |
| 7 | Hollow pike lands only ~51% at skill 0.8 with the starter line, by design (strength 1.6 > line 1.0) | `data/fish.js` | Review in 14.5 |
| 8 | ~~No sound for the slip, the line hum and the owl~~ Done (8.3 #57) | `js/audio/engine.js` | Closed |
| 9 | Anomaly cooldowns live in run state, so a reload resets them. Harmless, since anomalies only help, but noted | `js/sim/unease.js` | Leave unless it matters |
| 10 | The per-phase Node and browser checks were not committed. Phases 1, 6, 7 and 8 used Node scripts in a temporary folder. Phases 9 and 10 used a headless-Brave DevTools driver plus Node checks (shop lines, anomaly scheduler, spot value, late hints), in the session scratchpad. `tools/balance.js` covers validation, replay and pacing; the rest can be rebuilt from the §4 "Done when" column | — | Optional: a `tools/` browser check |
| 11 | Testing note: many `getImageData` reads on the game canvas make Chrome move it off the GPU, and the page drops to 16–40 fps until reloaded. This only affects pixel-reading tests; the game never reads pixels back. (The 9.3 check reads offscreen canvases from `journal.render()` instead.) | — | Keep pixel tests short, or reload after them |
| 12 | ~~Menus are keyboard-only~~ Done: touch zones and buttons (8.3 #71) | `js/core/input.js` | Closed |
| 13 | ~~The Red Room accepts any window catch~~ Done: Three-Thirty-Three in 03:33 (8.3 #69) | `data/loc_red.js` | Closed |
| 14 | ~~The pacing model fishes only Fogbound~~ Done: it moves and hunts the key (8.3 #70) | `tools/balance.js` | Closed |
| 15 | ~~The shop's unease location~~ Settled: Fogbound's, where the shop stands (8.3 #23) | `js/ui/shop.js` | Closed |
| 16 | ~~No hum or jazz in the Pines~~ Done (8.3 #57) | `js/audio/engine.js` | Closed |
| 17 | ~~Two owls in the Pines~~ Fixed: the perched owl calls (8.3 #67) | `js/scene/sailing.js` | Closed |
| 18 | Passive income swings a lot from seed to seed (0.36–0.84 of active over 60 min): a single Hollow Pike is worth ~150 coins. The mean is on target | `data/fish.js` | 14.5 |
| 19 | ~~Passive catches nothing off Fogbound~~ Done with the rosters | `data/fish.js` | Closed |
| 20 | Time away moves the game clock (8.3 #44). A player who closes the tab for a few minutes comes back hours later in game time, with a tape | `js/sim/passive.js` | Watch in play; `P.awayMin` is the knob |
| 21 | Live passive shows only the float and the bending rod; there is no underwater view or fish on screen, and no sound | `js/scene/sailing.js` | 13.3 for sound; visuals optional |
| 22 | Testing note: headless Brave runs no animation frames in background tabs, so a tab must be brought to the front (`Page.bringToFront`) before its loop can be checked | — | — |

The remaining `TODO(Px.y)` markers in the code are listed in [HANDOFF.md](HANDOFF.md#pending-work).

### 8.5 Baselines

Run these after any change. A different result means something changed.

| Command | Expected |
|---|---|
| `node tools/balance.js --validate` | `validate: OK (0 warning(s))` (also with `--strict`) |
| `node tools/balance.js --replay 12345` | `hash 2593400009 / 2593400009, 19 catches, 20 casts`, then `PASS: identical` |
| `node tools/balance.js --pacing` | All PASS. Medians: first upgrade 6.0 catches, creek 46.1 min, red 338.5 min |
| `node tools/balance.js --passive` | `PASS passive income 62.6% of active` (1.044 before `incomeMult`), time away 5 h: 191 caught, 9 lost, +2553 coins, and `PASS time away` |
| `node tools/balance.js --saves` | 6 PASS lines (Phases 1, 7, 8, 9, 10, 12 load as v4) and the damaged string refused |

The replay hash changes legitimately whenever sim code or data changes (fish, gear, fight, AI). When that is intended, record the new hash here. Phases 9–12 and the audit batches left them unchanged; Phase 14 (the rosters, prices and passive `base`) changed all of them, as recorded above. `--validate` also checks `data/anomalies.js` (schema, locations, durations of at most 60 s, effects) and, since Phase 11, every location file (fields, spots inside the world, at most one hidden spot, finite drift, `place` deterministic, in the world and spaced).

Phase 9 browser checks (headless, 320×180 at scale 1, `?debug&seed=N`): HUD strings match the save after `dbg.money`, `dbg.hour` and `dbg.buy('bait','minnow',5)`. P freezes the clock, and export then import through the menu restores coins, journal and clock. The journal at `dbg.unease(0)` vs `dbg.unease(1)` differs in 2510 px (1975 at 0.5; 0 between two renders at the same unease). Every special shop line is said exactly once in 200 visits (Node). Travel's switch at black takes 4 ms and its longest frame is 16.8 ms. Trophy facing is unchanged inside the cabin after `dbg.unease(1)` plus a restoration, and cabin level and kept fish persist across a reload.

Phase 10 checks: anomaly scheduler over 3 simulated hours (Node): at most 1 active, none past its max duration, gap and cooldowns kept, none below `uneaseMin`, deterministic per seed. Forced `dbg.anomaly(...)` ends by itself, a second one is refused, and the boat steers during it. Each delta changes 0 px above the waterline and 25–234 px below. A cast on a `lit_window` gets rare ×3. The dog's stare flag survives a reload with no repeat. At `dbg.hour(2.75)` the owl calls at 02:47, a Two-Forty-Seven bites by itself (hooked in 41 s), lands after the window has closed (latched), sets `flags.windowCatch.owl_247` and takes the Red Room from LOCKED to needing coins. Late hints are the same for identical saves and arrive one per new catch.

Phase 11 checks. Node: the creek's lure path over 1800 steps (stop at 6 m) is identical for the same seed and differs for another; it drifts 67.6 px in 30 s at 6 m and 14.4 px on the bottom. `place(9001)` gives [910, 474, 133] twice. Browser (headless Brave, `?debug&seed=7`, fresh save): travel by the map bakes the creek in 7.1 ms, the Pines in 3.6 ms, the Red Room in 3.5 ms, longest frame 16.8 ms each time. A creek cast at x 589 drifted to 597.9 over 9.5 s with the school empty. Pines blink period: 1.4 s at 23:00 and 01:00 (4 flips in 3 s), 0.874 at ~02:03, 0.45 at 02:45 and 03:30 (13 flips, owl eyes open), 1.4 at 05:00; it matches the pure `blinkPeriod`. Fogbound's and the Pines' piers: 0 of 9072 pixels differ. The Red Room says "It opens to someone who has fished while the owl calls" until a catch latched in `owl_247`, then takes 6000 and opens. A cast landing on the lamp got rare ×2.5, and afterwards the structures stood exactly where `place(castSeed)` puts them. A reload resumes in the Red Room with its module loaded. No page errors.

Phase 12 checks. Node: `--passive` as above. Browser (headless Brave, fresh save, cycle `base` shortened to 3 s in the page for speed): TAB from each of the ten states (sailing, charging, casting, sinking, waiting, interest, hooked, fighting, landing, card) turned passive on, came back to `sailing` with a cycle under way, completed a cycle and sold it (+3 to +98 coins), and TAB off opened the tape; no page errors. A fish taken over in `fighting` was finished by the auto-player and sold (+57). Time away of 10 min from 05:00 at unease 1, with an empty journal, gave a tape with "07:12 Two-Forty-Seven. I kept this one." and the journal entry `{caught: 0, phantom: true}` with the page "My writing. I do not remember catching it."; then catching that fish made it `{caught: 1, phantom: false}`. With four journal pages of which three are really caught, the journal says "3 of 4 caught". A `?compact` tab opened next to a normal one: the normal tab stopped (clock still, `persist` refused) and showed its message; the compact one has a 160×90 canvas, passive on, no HUD, ran 2 cycles (+4 coins) once in front. Clicking the normal tab took the save back (the compact one then stopped).

Audit batch 1 checks (headless Chromium via Playwright, `?debug&seed=7`, fresh save): `dbg.sky(h)` for h = 0..23.75 in 0.25 steps is always `safe` (brightest 124.9 at 12:00 against the ceiling 147.9). Horizon at 03:00 [29, 36, 64], 06:00 [130, 78, 97], 12:00 [119, 125, 141] (grey, overcast), 19:00 [176, 104, 62]. `dbg.fog().alpha` at unease 0: 0.467 at 22:00, 0.833 at 12:00; at unease 1: 0.667 and 1. At 01:00 the moon is up (alpha 1, screen y 20) and the light path is under it (`fog_mid`, a 0.55). Reflection pass 0.40 ms. After `dbg.buy('lantern')`, `dbg.buy('depthFinder')` and two rods, the boat shows the lantern, its halo (also in the mirror), the finder's light and a rust rod. On a fresh save the map refuses the creek, the Pines and the Red Room with the settling message. No page errors.

Audit batch 2 checks (headless Chromium, `?debug&seed=11`, fresh save): `dbg.audio()` reports "none (waiting for the first key or click)" until a key; after it the state is `running` with no console warnings. Master 0.64 at volume 0.8, 0 when muted, 0.4 at volume 0.5. Drone and wind at 03:00 0.05 and 0.012; at 12:00 0.025 and 0.037. The drone's out-of-tune voice is 12.2 cents off at unease 0 and 66 at unease 1. A forced catch logged `splash, plip, hook, slip, land, card`, then `coin` on the sale; `owl_eel` logged `sting`. At 02:47 the owl logged `owl`. In the Pines the log shows `relay` clicks and a `chord`. The pause menu ducks the effects bus to 0.27. Tension tone 243→409 Hz as T rose 0.37→0.87. Limiter −6 dB, ratio 20. Baselines unchanged.

Audit batch 3 checks (headless Chromium, `?debug&seed=11`): HUD alpha 1 at first and 0 after 7.3 s without input. ↓ while stopped sets the dog to `pet` for 1.94 s (measured from outside, ±0.1 s); petting again at once is refused, after 3.1 s accepted, and during a stare refused. On `dbg.give`, ripples went 1 → 2 on the bite step; the rod angle went 40° → 31.0° (tip 2.04 px lower). Hooked: bend 7.3 at 0.15 s. During the landing the particle count rose 1 → 11 (droplets); the card's `shownBy` went 0.35 → 1 over about 0.2 s. Baselines unchanged.

Audit batch 5 checks (headless Chromium, `?debug&seed=11`): with four perch held at 2 m, the ripple pool grew on 12 of 60 quarter-second samples over 15 s (rises plus the idle boat's own rings). `dbg.passive(true)` puts the dog to `sleep` within 1.5 s; a passive catch made `sailing.lift()` run (0.32 seen mid-arc). Screenshots: fireflies on the creek at 23:30, moths at the Pines lamps, a bat low over Fogbound at 01:00, the lantern cone and outlined fish at 10 m. No page errors. Baselines unchanged.

Audit batch 6 checks (headless Chromium, `?debug&seed=11`): at unease 1 the first drizzle hour on Fogbound is 17:00 (`dbg.rain()` 1 at 17:30), 0 at unease 0. H hides the HUD and H again shows it. With a lure out, `dbg.rod(0.01)` makes `tooHeavyNear` true on the next step and `dbg.rod(0)` clears it, without a spawn. In the Pines at 02:47 the owl state is `perched` at x 1176 and the audio log shows `owl`. Baselines unchanged.

Phase 14 checks: `--validate --strict` OK with 9 species per water and every hint true. On a fresh save (headless Chromium, `?debug&seed=11`), moving toward x 860 on Fogbound makes the dog bark at `cold_hole`. The map shows the Red Room's text "It opens to someone who has caught what rises at 03:33 in The Pines.", sells the creek, and travel works; a creek cast gave a Snag Trout card, and the journal printed "Stays near the surface." for `depth:shallow`. Touch on an emulated phone (844×390, landscape): holding the right edge moved the boat 180 → 208, holding the middle cast and then reeled in, the J button opened the journal and ESC closed it, M opened the map and the bottom zone moved its selection, TAB started passive. The performance figures are in 8.3 #72. No page errors.

Phase 15 checks: `--validate` OK, `--replay 12345` still `2593400009` (identical), `--pacing` and `--passive` unchanged, `--saves` all PASS. In headless Chromium every water was screenshotted at 19:00, 23:00, 06:00 and 12:00, and travel baked the creek in 61 ms, the Pines in 73 ms and the Red Room in 63 ms (the worst frame after each was under 4 ms). The scene ran at 60 fps with 1.7 ms of drawing and a 1.2–1.9 ms reflection pass. The audit batch 3 and 5 browser checks and the `?gallery`, `?compact` and plain boots all passed again with the new art. No page errors.

### 8.6 Next task

**Every phase in §4 is done (Milestone C), and so is Phase 15 (visual detail).** There is no next task in the plan. Ideas, each needing the user's go-ahead:
- Playtesting notes on feel and pacing (8.4 #6).
- Cabin costs in the pacing model.
- A touch zone for petting the dog.
- Painted detail for the Red Room's curtains and the shop and cabin interiors, to match Phase 15.
- More content (anomalies, shopkeeper lines, a fifth water).

---

# Appendix V: Game Vision Spec

> The original design spec, with the approved decisions (D1–D9) applied. Tasks cite these sections as V1, V4, and so on.

## V1. Vision
A calm, collectable, side-view fishing game. The skeleton follows the cozy-fishing genre: small boat, cast, underwater cross-section, line-tension fight, field journal, bait shop, active and passive (idle) modes, a dog companion, several fishing spots, dozens of fish. The skin is liminal and uncanny: Silent Hill fog and rust, Twin Peaks Americana (diner neon, owls, blinking yellow traffic lights, red curtains, zigzag floors), Lynch dream logic, Cronenberg-wrong fish.

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

## V10. Liminal / Lynch Layer (the signature: see §2 for each element's fishing job)
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
Layers: drone with slow filter motion; wind and water from filtered noise; distant clanks and foghorn; splash and reel clicks; reel tension tone that rises with T; a soft sting on rare catches; owl cry; slow Badalamenti-style jazz chords in The Pines that detune with unease; radio static on location change. Master limiter always on. Mute and volume in settings.

## V12. Technical Architecture
See §3 for the file tree.
- Sprite DSL: sprites as arrays of strings plus a palette map, baked once to offscreen canvases.
- Fixed timestep (1/60) with an accumulator. Seeded RNG: `G.rng` (sim) and `G.vrng` (visuals), mulberry32, with `?seed=N`.
- Save: `localStorage['softstatic_save_v1']`, versioned, autosave on catch, purchase and location change, export/import as a string.
- Performance: no per-frame allocations in hot paths, baked layers, cap of 8 fish, 60 fps target on a laptop.
- Debug (`?debug`): FPS and state overlay; `window.onerror` prints errors on screen in red; `dbg` console API: `dbg.state(name)`, `dbg.give(fishId)`, `dbg.money(n)`, `dbg.hour(h)`, `dbg.unease(v)`, `dbg.tp(x)`, `dbg.caught(n)`. Every phase is verified with these, never by fishing for minutes.

## V13. Out of Scope
Co-op, ocean levels, combat, any story cutscene, anything that needs external assets.
