# SoftStatic: Master Development Plan

> **FOR THE CODING AGENT:** Read **§0 Shared Conventions** first, then ONLY the task or section named in your assignment. Implement nothing that is not named in the task.

**Status:** Plan final and approved. **Phases 1–9 are done (Milestone A reached).** The next task is **10.1 Anomaly scheduler**; each phase starts only after explicit authorization. Progress, architecture as built, decisions, known issues and the exact next task are in **§8 Project Status**, which is updated at the end of every phase.

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

**Last updated:** 2026-10-28, after Phase 9 (Interface). **Repository:** github.com/serek9/SoftStatic, branch `main`. Machine setup and how to move a save between computers: [HANDOFF.md](HANDOFF.md). Working rules for Claude Code: [CLAUDE.md](CLAUDE.md).

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
| 10 Anomalies | **Next** | | Milestone B. Start with task 10.1 (see 8.6) |
| 11 Locations 2–4 | Not started | | |
| 12 Passive and the tape | Not started | | |
| 13 Audio | Not started | | May run alongside any phase from 7 on |
| 14 Content and polish | Not started | | Milestone C |

Every task in Phases 1–9 met its "Done when" check from §4. Each check was run and its output reported in the conversation that built it.

### 8.2 Architecture as built

The files that exist so far. §3 is the target tree; this is what is in it now.

```
index.html          canvas, whole-pixel scaling, script tags in load order, boot (seed, save, scenes, loop)
js/core/  debug.js  ?debug overlay (page text), red error box, dbg.* API, ?gallery scene
          rng.js    mulberry32: G.rng (sim), G.vrng (visual), seedAll
          state.js  fishing state machine table, scene manager, G.state = {save, run}
          input.js  keys/mouse -> actions (left, right, action, pause, journal, map, passive, up, down, back)
          save.js   save v3, migrations, SS1.<base64>.<checksum> format, autosave
          loop.js   fixed 1/60 step, 0.1 s frame cap (setPaused is a debug freeze; P is the pause menu)
data/     loc_fog.js   Fogbound: layers, landmarks, underwater settings, spots, maxDepth 96 px (24 m)
          fish.js      clock windows, rarity weights, 4 species, validateFish()
          gear.js      rod/reel/line tiers, baits (with shop pack sizes), lantern, depth finder, fight
                       constants, economy constants, unlock costs and names, cabin stages,
                       passive.incomeMult (D5)
          dialogue.js  the shopkeeper: small talk and the special lines (hints, repeated, reversed)
js/sim/   clock.js     hour advance, grey/night, windows, per-cast latch
          unease.js    per location 0..1
          fish_ai.js   speciesWeights/pickSpecies, the school (max 8) and its states
          bite.js      2 s hook window, a missed fish may return once
          fight.js     the V4 tension model and autoPlayer(skill)
          economy.js   price, sizeFactor, gear effects, purchases, bait use, catches, unlocks, cabin restoration
js/gfx/   bake.js      offscreen canvases, layers, flipped copies, lazy cache
          sprites.js   palette (only hex in the code), sprite DSL, bitmap font, wrap, hash
          fx.js        particle pool (256) and ripple pool (32), splash
          water.js     mirror reflection with a slot for reflection deltas (P10.2)
          fishgen.js   8 bases × 15 parts, wrongness, asymmetry, shimmer; ?gallery combinations
js/scene/ boat.js      boat physics, rod geometry and bend
          dog.js       6 poses, interest thresholds
          underwater.js  cross-section, lure sink/stop/reel, fish drawing, bite -> hook -> fight -> landing,
                         heavy-fish shadow
          sailing.js   the scene in play: location loading, parallax, camera, sky, cast, the step order below
js/ui/    hud.js       clock, coins, bait in use; depth readout, tension tint, depth-finder bands
          card.js      catch card, sell/keep
          menu.js      overlay manager (pause, journal, map), pause menu with settings and export/import,
                       shared panel helpers
          journal.js   overlay: filters, species grid, entry page, discovered hints, unease handwriting,
                       heavy-fish margin note
          shop.js      scene: baked interior, shelf grid, purchases, the shopkeeper's line per visit
          map.js       overlay: baked chart, travel with a fade, unlocks, the way into the shop and cabin
          cabin.js     scene: restoration stages, mounted trophies, facing decided in enter()
tools/    balance.js   --validate [--strict], --replay <seed> [min], --pacing (Node; loads the scripts listed in index.html)
```

**Scenes and overlays:** the scene manager holds `sailing`, `shop`, `cabin` and `gallery`. Each boot-loop step first calls `G.ui.menu.update(dt)`; while an overlay (pause, journal, map) is open it takes the step and the scene does not update, and `G.ui.menu.draw` draws it over the scene.

**One update step** (`sailing.update`): gear effects → clock → unease → cast steps (charge, flight, or the lure under water) → fish school → `underwater.catchStep` (bite, hook, fight, landing, card) → card input → boat → dog → camera → underwater view (fade, vertical camera) → particles.

**Drawing order** (`sailing.draw`): sky and layers → mirror (only when the camera is at the surface) or the cross-section → waterline glints → particles → boat and dog → hooked fish → line and lure → HUD → card; then any overlay.

**Run state** (`G.state.run`, never saved): `fsm`, `loc`, `boat`, `dog`, `cam {x, y}`, `uw {alpha}`, `cast` (charge, landing x, lure position, seed, `latched` windows, bait), `school`, `lureIn`, `bite`, `fight`, `hook`, `heavy`, `gearFx`, `dogIn`, `uneaseIn`.

**Save** (`G.state.save`, version 3): `coins`, `gear {rod, reel, line, lantern, depthFinder, bait}`, `baits {id: count}`, `journal {id: {caught, bestLen, bestW, hints, seen, phantom, read}}` (`read` is set when the entry is looked at; absent means NEW), `kept [{id, len, w}]`, `cabinLevel`, `unlocks {fog: true}`, `loc` (where the game resumes), `unease {loc: 0..1}`, `clock` (a new game starts at 19:00), `flags {windowCatch {windowId: true}, lines {lineId: visit said on}, shopVisits, heavy {loc: true}}`, `settings {volume, mute}`, `lastSeen`, `rng`, plus `tapes` (P12). Migrations v1 → v2 → v3 exist.

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
14. **Unlock costs** are in `data/gear.js` `unlocks` until each location file carries its own (11.1). The Red Room's condition is any landed catch whose cast was latched in a window (`flags.windowCatch`); 11.3 may narrow it to a specific fish.
15. **Pacing model** (`tools/balance.js`): an active player at depth 8 m, hooking 90% of bites, fight skill 0.85, buying in the order `PLAN` (line, reel, rod, lantern, depth finder, creek, …). It fishes the Fogbound roster for the whole run, because no other location has fish yet.
16. **Run state is built by `sailing.load()`**, not by `state.newRun()` (which only creates `fsm`, `fsmPrev` and `fsmT`).
17. **Overlays and scenes (9.2):** pause, journal and map are overlays over the current scene; shop and cabin are scenes. While an overlay is open the world waits (no clock, fish or fight). P pauses anywhere, and Esc pauses on the water; J opens the journal anywhere; M opens the map only from the boat with no line out. In the shop and cabin, Esc or M leaves.
18. **New input actions:** `up` (W, ↑), `down` (S, ↓) and `back` (Esc) for menus; Enter also counts as `action`. Menus are keyboard-only until touch (14.6).
19. **The map is the hub (9.5):** it lists the four waters plus the Bait Shop and the Cabin (both on the Fogbound shore). Choosing one fades out, switches at full black, then fades in. `sailing.load` bakes everything a location draws, its underwater cross-section included, and sets `save.loc`; travel autosaves. Paying to open a location autosaves as a purchase. Locations without data show their name (from `gear.unlocks`) and "Not charted yet".
20. **Export and import (9.2):** export saves first, then copies the `SS1` string to the clipboard, falling back to the browser's own prompt to show it. Import reads it with the browser's prompt, a DOM dialog like the debug text (decision 1). Import works only between casts, then rebuilds the run at the save's `loc`. A damaged string is refused and changes nothing. Settings changes autosave when the pause menu closes.
21. **Journal (9.3):** hints are discovered by catching: the species' `hintRefs` on the first catch, the baits it takes on the second, its depth and hours on the third. Headings and filters are printed; entries are handwritten with jitter equal to the current location's unease. The handwriting is stable frame to frame (hashed, never random). The D4 margin note shows when `flags.heavy[loc]` is set (sailing sets it while a too-heavy fish is near) and some species there is still heavier than the rod holds.
22. **Shopkeeper (9.4):** one line per visit, chosen without RNG. A special line is said once per save, no sooner than its `after` visit, at least `gap` (2) visits after the last special, and `night` lines only outside the grey hours. `flags.lines[id]` stores the visit it was said on. Kind `repeat` is said twice; kind `reverse` is shown with its characters reversed. Otherwise small talk rotates.
23. **Shop purchases:** gear and equipment buy the next tier. Baits sell in `pack`s (`data/gear.js`). Choosing a bait you have in stock but are not using equips it first; choosing it again buys a pack. Buying a bait also equips it, and Nightcrawlers simply equip. The shop runs the clock and drains the current location's unease (`atShop`).
24. **Cabin (9.6):** stages and plaque counts live in `data/gear.js` `cabin`, and `economy.restoreCabin` pays for the next stage. Kept fish are mounted heaviest first, and those without a plaque are counted as "in the icebox". In `enter()` only, `round(unease × mounted)` trophies are turned to face the door. Unease is the run's location's; which trophies turn is picked with `G.vrng`. A restoration bought inside adds empty plaques, which are filled on the next entry, so the wall never changes while visible. The cabin runs the clock but leaves unease alone.
25. **HUD (9.1):** clock, coins and bait (with count, except worms) in the top-left over the sky, with a 1 px ink shadow; depth stays in the top-right while underwater. Hidden while the card is open. Strings are rebuilt only when their value changes.

### 8.4 Known bugs and pending issues

No crashes or failing checks are known. Open items, roughly by importance:

| # | Issue | Where | Owner |
|---|---|---|---|
| 1 | "Fog thickens in grey hours" (§0.8) is not built; only the sky follows the clock | `js/scene/sailing.js` | Not assigned to a task; suggest 14 |
| 2 | Only Fogbound has data. The map shows the other three as "Not charted yet". Travel was checked against a stand-in location injected in the browser | `js/ui/map.js` | 11.1 |
| 3 | The journal's heavy-fish margin note cannot appear with today's roster: no Fogbound fish is heavier than the starter rod's 3 kg. It was checked with a lowered rod limit | `data/fish.js` | 14.1 |
| 4 | Volume and mute are saved and shown in the pause menu, but there is no audio yet | `js/ui/menu.js` | 13.1 |
| 5 | `tooHeavyNear` is recomputed only when a fish spawns, so after a rod upgrade it can stay stale until the next spawn | `js/sim/fish_ai.js` | Minor; fix when touched (7.6/7.7 behaviour) |
| 6 | Pacing: location 2 median is 32 min, low in the 30–50 band. Hollow pike (an unease fish, about 150 coins each) make early income jumpy. Escapes are about 0% in fight sims. Cabin costs are not in the pacing model yet | `data/fish.js`, `data/gear.js` | 14.5 |
| 7 | Hollow pike lands only ~51% at skill 0.8 with the starter line, by design (strength 1.6 > line 1.0) | `data/fish.js` | Review in 14.5 |
| 8 | No sound: the slip sound and the heavy-fish line hum are marked | `js/scene/underwater.js` | 13.3 |
| 9 | Outdated comments: `js/core/state.js` lines 25–26 (run fields are built in `sailing.load`); `data/loc_fog.js` line 51 `species: []` with `TODO(P6.3)` (species list their locations in `data/fish.js`; the field is unused) | as listed | Delete when the file is next touched |
| 10 | The per-phase Node and browser checks were not committed. Phases 1, 6, 7 and 8 used Node scripts in a temporary folder. Phase 9 used a headless-Brave DevTools driver plus a Node check of the shop lines, in the session scratchpad. `tools/balance.js` covers validation, replay and pacing; the rest can be rebuilt from the §4 "Done when" column | — | Optional: a `tools/` browser check |
| 11 | Testing note: many `getImageData` reads on the game canvas make Chrome move it off the GPU, and the page drops to 16–40 fps until reloaded. This only affects pixel-reading tests; the game never reads pixels back. (The 9.3 check reads offscreen canvases from `journal.render()` instead.) | — | Keep pixel tests short, or reload after them |
| 12 | Menus are keyboard-only: the mouse only casts | `js/core/input.js` | 14.6 (touch and on-screen buttons) |

The remaining `TODO(Px.y)` markers in the code are listed in [HANDOFF.md](HANDOFF.md#pending-work).

### 8.5 Baselines

Run these after any change. A different result means something changed.

| Command | Expected |
|---|---|
| `node tools/balance.js --validate` | `validate: OK (4 warning(s))`: Fogbound roster 4/9, and creek, pines and red not in data yet |
| `node tools/balance.js --replay 12345` | `hash 2265718513 / 2265718513, 16 catches, 18 casts`, then `PASS: identical` |
| `node tools/balance.js --pacing` | All PASS. Medians: first upgrade 6.0 catches, creek 32.3 min, red 324.4 min |

The replay hash changes legitimately whenever sim code or data changes (fish, gear, fight, AI). When that is intended, record the new hash here. Phase 9 left all three unchanged.

Phase 9 browser checks (headless, 320×180 at scale 1, `?debug&seed=N`): HUD strings match the save after `dbg.money`, `dbg.hour` and `dbg.buy('bait','minnow',5)`. P freezes the clock, and export then import through the menu restores coins, journal and clock. The journal at `dbg.unease(0)` vs `dbg.unease(1)` differs in 2510 px (1975 at 0.5; 0 between two renders at the same unease). Every special shop line is said exactly once in 200 visits (Node). Travel's switch at black takes 4 ms and its longest frame is 16.8 ms. Trophy facing is unchanged inside the cabin after `dbg.unease(1)` plus a restoration, and cabin level and kept fish persist across a reload.

### 8.6 Next task

**Task 10.1 Anomaly scheduler**, in the §7 template:

```
Read: §0 Shared Conventions, then §4 Task 10.1 only, plus §2 (anomaly data and each element's
  fishing job) and V10. Also 8.3 and 8.4 above.
Files you may touch: js/sim/unease.js, data/anomalies.js (new; add it to index.html after
  data/dialogue.js), js/core/state.js and js/scene/sailing.js only to hold and step the active
  anomaly in run state (TODO(P10.1) markers are there), js/core/debug.js for dbg hooks.
Do: data/anomalies.js holds {id, locations, uneaseMin, hours, cooldown, kind, params, effect?}.
  In sim/unease.js (pure; G.rng only): which anomalies are eligible (location, unease, hours,
  cooldown), scheduling with at most one active, a duration after which it ends by itself,
  and effects: spotBoost (raises the rare weight for a cast at its spot) and revealHint
  (adds a true hint to the journal). Anomalies are quiet, short and optional; nothing
  blocks input or takes control (§0.14). Cooldowns that must survive a reload go in
  save.flags (add a v3 -> v4 migration if the save shape changes).
  Drawing anomalies is 10.2; leave TODO(P10.2) stubs where they would be drawn.
Done when: forced anomalies (a dbg hook) end on their own, at most one is ever active,
  input is never blocked while one runs, and node tools/balance.js --validate and --replay
  still pass (record the new replay hash if sim changes move it).
Report: what changed, the check output, any TODO stubs left; then update §8 (8.1, 8.4, 8.6).
```

After 10.1, the rest of Phase 10 follows §4 in order: 10.2 reflection deltas, 10.3 dog stare and bark, 10.4 owl cry and window bites, 10.5 journal pages that gain hints.

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
