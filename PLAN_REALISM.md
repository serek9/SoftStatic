# SoftStatic: Realism Phases 20–25 (line, sound, boat, current, fight, water)

**Date:** 2026-10-29. **Repo state:** Phases 1–19 done (PLAN.md §8.1), `main` at `4c37623`.
**Status:** R1–R5 approved by the user on 2026-10-29. Phases 20 and 21 done (PLAN.md §8.1); the others wait for the go-ahead, one phase at a time (CLAUDE.md "How we work").
**Read with:** PLAN.md §0 (conventions, required) and §8 (status). Like the improvement audit, this file adds phases after §4. It does not edit §0–§7 or Appendix V. Where a phase bends the approved spec, the **Spec deviations** table below names it, and the phase needs the user's approval before it starts.

The user asked for six things:

1. While the line is cast it should move like a real line, slack with no tension, until a fish bites.
2. The line and the reel should sound as real as possible, and so should a fish fighting, a fish biting the lure and the lure splashing into the water.
3. The boat should move and sound right when it speeds up and when it stops.
4. The current should move the lure under water.
5. A fish should sometimes get away if you don't fight it properly.
6. The waterline should be more detailed and more realistic.

---

## 1. What exists today (verified in the code)

| Request | What the code does now | Where |
|---|---|---|
| Line | During the cast the line is a straight 1 px line from the rod tip to the lure. While the lure sinks or waits, it is straight from the tip to the entry point and then a straight dotted line down to the lure. During a fight it is straight and shaking (pull), or a quadratic curve with a fixed sag (tired). Nothing simulates the line itself. | `js/scene/sailing.js` `drawCast`, `drawFightLine` |
| Sound | Everything is synthesised with Web Audio. Splash, `plip` (bite), `hook`, `run`, `slip`, `snap`, reel clicks (one click sample at 11/s reeling, 26/s paying out) and a triangle tone that rises with tension. Each is a single short tone or a noise sweep. Nothing depends on the bait, the reel tier or the depth, and nothing is muffled when the camera is under water. | `js/audio/engine.js` |
| Boat | Speed is simulated: acceleration, drag, drift, and a 1 px sine bob. Nothing pitches, squats or rocks. The outboard is a still sprite and has no sound. The only sound tied to the boat is a lapping noise whose gain follows speed. | `js/scene/boat.js`, `engine.js` `ambience` |
| Current | Only Blackwater Creek has one (`loc.drift`, 11.1). It moves the lure sideways and nothing else: the lure never tilts, flutters or lifts, and the line does not bow in the flow. The lakes have no water movement at all. | `data/loc_creek.js`, `js/scene/underwater.js` `drift` |
| Escapes | V4 has two ways to lose a fish: the line snaps the second time T reaches 1, and a fish escapes if D stays at 1 for 3 s. **Measured on 5,400 fights per strategy (starter gear, every fish under 3 kg):** reeling all the time snaps 88% of the time; never reeling escapes 100%; **pressing at random wins 100%**; auto-player skill 0.5 wins 76% and loses 24% to snaps, with only 1 escape. In practice an escape almost never happens, and a slack line costs nothing. | `js/sim/fight.js`, scratch script |
| Waterline | One 1 px foam row with dashes that scroll, a lit band under it, and mirror rows shifted by a fixed sine. Nothing pushes the surface: splashes, the boat and rising fish only draw ripple ellipses on top. | `js/gfx/water.js`, `sailing.js` `drawWaterline` |

## 2. Order and dependencies

```
20 Living water surface ──┬─> 21 The line as a rope ──> 22 Current and the lure
                          │                                     │
                          └─> 24 The boat under way             v
                                                      23 A fight you can lose (V4 change)
                                                                │
                              20–24 ───────────────────────────>25 The sounds of fishing
```

- **20 first**: the line, the lure on the surface, the boat's heave and the splashes all sit on one surface height field.
- **21 before 22**: the current pushes the line, and the line pulls the lure.
- **23 after 21**: the new fight rules (slack, head shakes, jumps) need a line that can show slack.
- **25 last**: its sounds are driven by state the earlier phases add: rope slack, motor rpm, jumps, head shakes, the bait type and current speed. Phase 24 makes its own motor and hull sounds, because they are part of how the boat feels.

Phases 20, 21, 24 and 25 change presentation only (`js/gfx`, `js/scene`, `js/audio`). The replay hash and the pacing baselines must not change. Phase 22 changes the lure's path in the live game, but the `--replay` and `--pacing` models do not simulate lure drift, so those baselines should not change either; the phase confirms this. **Phase 23 changes the sim** (`js/sim/fight.js`, `data/gear.js`), so every baseline is re-run and recorded again.

## 3. Spec deviations (need the user's approval)

| # | Deviation | Phase | Why |
|---|---|---|---|
| R1 | New files `js/gfx/surface.js` (the height field) and `js/gfx/rope.js` (the line), both in `G.gfx` and loaded after `water.js` in `index.html`. | 20, 21 | §0.1 lets a task touch only the files it lists, and new files need approval (D7 precedent). |
| R2 | V4's fight gains a **hook hold** H that drops while the line is slack during a head shake or a jump. At H = 0 the fish throws the hook, which counts as an escape. The slip on the first T = 1, the snap on the second, and the 3 s escape at D = 1 all stay. | 23 | Request 5. Today slack costs nothing. |
| R3 | V3.3 "the line drops vertically … as a dotted line" becomes a simulated line that can bow and sag (drawn dotted below the surface as now, so it stays readable). | 21 | Request 1. |
| R4 | Every water gets a gentle current, not only the creek: a wind drift on the lakes and a near-flat calm in the Red Room. The creek keeps its current. | 22 | Request 4. |
| R5 | Optional new fish data field `jumps` (0..1), checked by `--validate`. | 23 | Jumping species. |

Tone guardrails (§0.14) apply to every phase: no sudden loud sound (the limiter stays on, and every new sound is checked for peak level), a lost fish is quiet and gentle, never a fail screen, and the dog is never startled by the motor or a jump.

---

## Phase 20: Living water surface

A 1D height field across the world, in the 640×360 view's pixels. Everything that touches the water pushes it, and the waterline, the mirror and the things that float on it all read it.

| ID | Task | Files | Done when |
|---|---|---|---|
| 20.1 | `G.gfx.surface`: one `Float32Array` of heights per world column at HI = 2 (≤ 2,400 columns), plus a velocity array. Two layers: a **swell** made of 3–4 sines, set per water in its data (`loc.swell`: Fogbound low and slow, the creek short and choppy, the Pines medium, the Red Room almost dead flat, which is wrong on purpose), stronger in drizzle and the grey-hour wind. The second layer is a **damped wave equation** for impulses. `poke(x, strength, width)` is the only entry point. Visual only: `G.vrng`, stepped in `update`. | js/gfx/surface.js (new, R1), data/loc_*.js (`swell`), index.html | New `dbg.surface()` and `dbg.poke(x, s)`. `dbg.surface()` returns `{min, max, energy, ms}`. After `dbg.poke(x, 1)`, energy peaks and falls below 5% within 4 s, the crest moves outward at the set wave speed (±10% over 1 s), and the heights never pass ±3 view px and never go NaN over 10 minutes. Step under 0.2 ms. |
| 20.2 | Everything that touches the water pokes it: the lure's splash (scaled by cast distance, as `fx.splash` is), reeling the lure out, the boat's hull and wake (each wake puff), fish rises (P2-1), the hooked fish thrashing near the surface, the landing lift, and drizzle drops. Existing `fx.ripple` rings stay for the mirror band's perspective. | js/scene/sailing.js, js/scene/underwater.js, js/gfx/fx.js | Each source shows as a spike in `dbg.surface().energy` in a scripted run: `dbg.cast(0.5)`, `dbg.give(id)`, the boat moving, and drizzle (`dbg.hour(17.5)` with `dbg.unease(1)` on Fogbound, the audit P3-1 check). |
| 20.3 | **The waterline drawn from the height field**, one column per view pixel. A crest row in `water_foam` where the surface is high or steep, a lit face (`water_hi`) on slopes that face the light (the moon or the dusk glow, from `lightOnWater`), a 1 px darker meniscus under the crest, and a lit sub-surface band (`water_lit`) whose thickness follows the local height. It replaces the scrolling dashes in `drawWaterline`. | js/scene/sailing.js | Screenshots at 19:00, 23:00, 06:00 and 12:00 on every water. `dbg.sky` still `safe` for every hour (no water key above the `dusk_high` ceiling, §0.9). |
| 20.4 | **The mirror follows the real surface.** In `water.draw`, each mirror row's sideways shift comes from the local slope of the height field instead of a fixed sine, so a splash or the wake visibly breaks the reflection, and calm water mirrors cleanly. The glints and light path only appear on crests. | js/gfx/water.js | A poke under a reflected landmark shifts its rows by ≥ 2 view px for ≥ 0.5 s, and still water shifts them by ≤ 1 px. `water reflection` stays under 2 ms (3.4). |
| 20.5 | **The surface from below.** While the view is under water, the underside of the surface shows as a bright wavering ceiling with a thin band where the cross-section's top reflects back (total internal reflection). Soft caustic lines in the top ~6 m (from the height field's curvature) move over the light shafts and the shallow bottom. | js/scene/underwater.js | Visible in screenshots at 2 m and gone below 6 m. Frame time with 8 fish plus an anomaly plus the reflection still at 60 fps (14.7 check). |
| 20.6 | **Things that float sit on the surface.** The passive float, the lure while it rests on the surface after landing, and the pier piles: each pile gets a small foam collar and a dark wet band that rise and fall with the height there. | js/scene/sailing.js, js/scene/scenery.js | The float's y equals the surface height at its x (±0.5 view px) over 600 steps. |

**Baselines:** all unchanged (presentation only). **Overlay line:** `surface energy E  min/max  ms`.

---

## Phase 21: The line as a rope

The line becomes a simulated chain of points. It is slack, sags and floats from the moment it leaves the rod until a fish takes the lure. Then it pulls tight, and its shape in the fight comes from tension.

| ID | Task | Files | Done when |
|---|---|---|---|
| 21.1 | `G.gfx.rope`: a Verlet chain of N = 48 points in preallocated `Float32Array`s (x, y, old x, old y). One end is pinned to the rod tip, the other to the lure (or the hooked fish's mouth). Its **rest length** is how much line is out: it grows while the line pays out and shrinks as it is reeled in. Each point feels gravity and air drag above the surface. Below the surface it gets strong water drag, a slow sink (nylon is near neutral) and the current (Phase 22 fills this in, zero until then). A point on the surface follows the Phase 20 height field. 6–8 constraint iterations, stepped in `update` at the fixed dt, with no allocation. | js/gfx/rope.js (new, R1), index.html | A new `dbg.rope()` returns `{n, len, sagMax, taut, ms}`. The ends stay within 0.5 view px of their anchors. Step under 0.15 ms. 10 minutes of casting allocate nothing (heap snapshot before and after). |
| 21.2 | **The cast.** On release the bail opens. The line pays out behind the lure as it flies, so the rest length is always a little longer than the tip-to-lure distance. It trails in a loose curve behind the lure, not a straight segment. When the lure lands, the line falls in a slack curve onto the water. The part on the surface lies on it, then sinks slowly from the lure end. The lure's own parabola (4.2, it lands exactly on the marker) does not change. | js/scene/sailing.js, js/gfx/rope.js | During the flight `taut` < 0.95 (rest length / span > 1.05). 1 s after landing at least 25% of the points sit on the surface. `--replay` identical (the lure's path is untouched). |
| 21.3 | **Sinking, waiting and reeling.** While the lure sinks the line follows it down in a belly. In `waiting` the line hangs slack from the tip with a visible sag. Holding action to reel first takes up the slack: the line straightens, and only then does the lure start to move (lure speed is unchanged, the delay is visual only). The bite cue (7.1) becomes the line itself: nibbles twitch the last segments, and a bite pulls the line tight toward the fish in a few frames, with the rod tip dipping (rodPose already does this). | js/scene/sailing.js, js/scene/underwater.js | `sagMax` ≥ 4 world px while waiting with no fish near. With `dbg.give` forcing a bite, `taut` rises above 0.98 within 0.25 s. |
| 21.4 | **The fight.** `drawFightLine` draws the rope. The rest length follows D, and the slack follows tension: at T > 0.5 in `pull` the line is straight and vibrates (a standing wave whose amplitude follows the fish's thrash), in `tired` it sags in proportion to 1 − T. On a slip the line goes briefly slack. On a snap the free end whips back to the rod and floats down. On an escape the line goes limp and the lure comes back empty. The tension tint (7.4) stays. | js/scene/sailing.js, js/gfx/rope.js | Scripted fight: `sagMax` < 1 px whenever mode is `pull` with T > 0.5, and > 3 px whenever mode is `tired` with T < 0.3. Both still readable at 1× (7.4 check). |
| 21.5 | **Drawing.** A 1 view-px polyline with the existing Bresenham `line()`. Solid above water and dotted below it (R3), with less alpha under the surface. A lit pixel on segments that face the light. In passive mode the float's line uses the same rope. | js/scene/sailing.js | Screenshots of each state: flight, landed, sinking, waiting, nibble, bite, pull, tired, slip, snap, passive. |

**Baselines:** all unchanged (presentation only; the lure's sim path is not touched). **Overlay line:** `rope len L  taut 0.xx  sag S px`.

---

## Phase 22: Current and the lure

The water moves everywhere, a little. The current carries the lure, bows the line, sways the weeds and gives the lure a body that tilts and flutters.

| ID | Task | Files | Done when |
|---|---|---|---|
| 22.1 | A shared current field: `flow(loc, seed, t, x, depth)` returns px/s (x and y), pure and deterministic. The creek's existing `drift` (11.1) becomes one case of it, with the same numbers, so its 11.1 check still passes. The lakes get a slow wind drift: about 0.4–0.8 px/s at the surface, weaker with depth, turning slowly by the cast's seed and stronger in the grey-hour wind. The Red Room gets a near-zero flow that sometimes runs the wrong way, upstream of nothing (R4, liminal, and harmless). The parameters live in each water's data. | data/loc_*.js, js/scene/underwater.js | Node: for every water, the same seed gives the same path over 1,800 steps and another seed gives a different one. The creek still drifts 67.6 px in 30 s at 6 m and 14.4 px on the bottom (11.1). `--validate` bounds every water's flow (it already does this for `drift`). |
| 22.2 | **The line drags the lure.** The submerged part of the rope (Phase 21) feels the flow, and its belly pulls the lure downstream and slightly up, the way a real line swings a lure in a current. The pull is computed in the scene from the same pure inputs (seed, time, depth, line out), so a cast's path is still fixed by its seed. In the creek a lure held in the current rises 1–2 m off the bottom, and reeling against the flow makes the lure swim upstream. | js/scene/underwater.js, js/gfx/rope.js | Creek, 6 m, 30 s: the line bows downstream (its middle point is ≥ 6 px downstream of the straight line from the entry point to the lure). The lake lure moves 3–10 px in 30 s. Same seed, same path, twice. |
| 22.3 | **The lure has a body.** An angle and a small swing, drawn from its velocity relative to the water: it tilts nose into the flow, flutters while sinking (each bait its own way: the worm undulates, the cricket kicks, the minnow wobbles and flashes a pale pixel), sways at rest, and swims nose-first when reeled. One small sprite per bait in the view's pixels, with 3–4 rotation frames baked once. | js/scene/sailing.js (`tinyArt`), js/scene/underwater.js | Gallery shows each bait's frames. A new `dbg.lureBody()` returns `{angle, flutter, vx, vy}`, and the angle tracks the flow direction within 20° in a steady current. |
| 22.4 | **The rest of the water moves with it.** The weeds' lean (the baked frames), the motes, the bubbles and the creek's current streaks all follow the same field, so the lure never drifts against everything around it. | js/scene/underwater.js, js/gfx/fx.js | Weeds lean the flow's way on every water. No new per-frame allocation. |
| 22.5 | **Fish notice the drifting lure.** fish_ai already reads the lure's position. Check that the AI's `lureX` follows the drifted position, and that a lure drifting into a spot's radius gains that spot's boost the same way (10.3). | js/sim/fish_ai.js (read only, unless a bug turns up), js/scene/sailing.js | `dbg` check: a lure drifting into `undercut` registers it. `--replay` and `--pacing` unchanged (their models do not drift the lure; confirm this and record it in 8.3). |

**Baselines:** expected unchanged. If anything moves, record why in 8.3. **Overlay line:** extends the `current` line with `flow x/y` and `lure angle`.

---

## Phase 23: A fight you can lose (V4 change, R2)

Real fish get off a slack line. This phase makes keeping the line tight matter, with clear signals and gentle losses, and without a fail state.

| ID | Task | Files | Done when |
|---|---|---|---|
| 23.1 | **Hook hold H (0..1).** It is set at the hook-set from how fast the player reacted in the bite window: an instant set gives 1.0, a set at the end of the 2 s window gives 0.7, and passive mode always gives 0.85. H does not recover. | js/sim/fight.js, js/sim/bite.js, data/gear.js (`fight.hold*`) | Node: the hook-set time maps to H as stated, at the window's ends and its middle. |
| 23.2 | **Head shakes and slack.** During `pull`, the fish shakes its head in short bursts. The rate comes from `fish.speed` and the count from a seeded `G.rng` draw. During a shake, if T is under a slack threshold (around 0.12), H falls at `holdLoss` per s. At H = 0 the fish throws the hook, and the fight returns ESCAPE. Reeling during a shake keeps the line tight but adds tension (so the old snap rule still punishes reeling the whole time). | js/sim/fight.js, data/gear.js | Node, one test per rule: H falls only in a shake with T < threshold; ESCAPE at H = 0; the slip, the snap and the 3 s D = 1 escape behave exactly as before. |
| 23.3 | **Jumps.** Species with `jumps` > 0 (R5: a few pike-like and legendary fish) sometimes leap during `pull` when D < 0.5. A jump is about 1 s long. If T is high, it adds a T spike that can slip. If the line is slack, it costs a large chunk of H. Easing a little (not fully) is the right answer, as with real fish. | js/sim/fight.js, data/fish.js, tools/balance.js (`--validate`) | Node: jump timing and effects; `--validate --strict` accepts the field and checks 0..1. |
| 23.4 | **Retune and measure.** A committed `--fight` mode in `tools/balance.js` prints landing, snap, slack-escape and run-out rates by strategy (always reel, never reel, random tapping, auto-player at skill 0.2, 0.5, 0.8 and 0.85) on each gear tier. It also partly answers 8.4 #10. The auto-player learns to keep a little tension during shakes. **Targets:** skill 0.85 lands ≥ 90%; skill 0.5 lands 65–80% with at least a third of its losses being slack escapes; random tapping drops from 100% to ≤ 70%; never reeling still loses the fish, now in 5–10 s instead of a slow run-out. Then retune the passive `incomeMult` or `skill` so passive stays at 60% ±5% (D5), and check `--pacing`. | tools/balance.js, data/gear.js, js/sim/fight.js | `node tools/balance.js --fight` meets every target. `--passive` PASS. `--pacing` all PASS. New `--replay 12345` hash recorded in 8.5 (the sim changed on purpose). `--saves` all PASS (fight state is run state, never saved). |
| 23.5 | **Readable, gentle signals.** Nothing new in the HUD. A slack line shows on the rope (Phase 21: it sags and drifts), a head shake shows as the line jerking and the rod tip knocking, a jump is the fish clearing the water with a splash (a Phase 20 poke). A thrown hook is quiet: the line goes limp, the lure floats up empty, and the fish swims off as now. The catch card is not shown, and no text appears. Debug only: the overlay shows H. | js/scene/underwater.js, js/scene/sailing.js | Screenshots of a shake, a jump and a thrown hook. A new `dbg.fight()` shows `T`, `D`, `mode`, `H` and `shake`. The tone check (§0.14): no prompt, no sting, no input blocked during or after the loss. |

**Baselines:** `--replay`, `--pacing` and `--passive` change and are recorded again. `--validate` and `--saves` unchanged.

---

## Phase 24: The boat under way

How the boat moves and sounds when it speeds up and slows down. Its speed physics (`boat.P`: accel, maxV, drag, stopV) stays the same, so casting still unlocks at the same moment. Everything here is on top of it.

| ID | Task | Files | Done when |
|---|---|---|---|
| 24.1 | **Pitch and heave as springs.** A damped spring for pitch, driven by acceleration: on throttle the bow lifts and the stern squats (up to about 3°). When the throttle is released the bow drops and the boat rocks forward a few times before it settles. Heave and wave pitch come from the surface height under the bow and the stern (Phase 20), which replaces the 1 px sine `bob`. The hull, the fisher, the dog, the motor, the lantern pole and the rod tip all rotate together around the hull's centre. The rod tip that `rodTip` returns includes the pitch, so the line stays attached. | js/scene/boat.js, js/scene/sailing.js | A new `dbg.boat()` returns `{pitch, heave, rpm, throttle}`. Holding right for 2 s gives a pitch peak of 2–4°. After release the swing changes sign at least twice and falls under 0.2° within 4 s. The rod tip and the rope's anchor agree to within 0.5 view px. |
| 24.2 | **The boat's own wake rocks it.** When the boat stops, the wake it pushed out behind it (20.2 pokes) catches up and rocks it a second time, as a real boat does. The wake emits from the stern, with a bow wave at speed: foam at the bow and a short spray of particles under the stern. | js/scene/sailing.js, js/gfx/fx.js | After a stop from full speed, `heave` shows a second bump 1–2 s after the first. The `fx` pool never overflows (`dropped` stays 0). |
| 24.3 | **The outboard.** A throttle level eased toward the input (spools up in about 0.6 s, back down in about 1.2 s) drives the rpm (idle around 900, full around 4,500). The motor sprite tilts a little with the thrust, a churn of foam and bubbles comes from the propeller under the stern, and a small puff of exhaust appears on a hard start. After about 8 s stopped the motor cuts to silence; moving again restarts it with a soft pull-start. The fisher leans back on throttle and forward on a stop. The dog's ears flutter at speed (the dog is never startled). | js/scene/boat.js, js/scene/dog.js | `dbg.boat().rpm` follows the throttle within the stated times. The motor is off after 8 s at rest and back on within 0.5 s of moving. |
| 24.4 | **Motor and hull sound.** A two-stroke outboard made in Web Audio. A pulse train at the firing rate (rpm/60) with jitter between strokes, through two formant band-passes (the cowling, the exhaust) and a low-passed bubbling exhaust under water. A muffled, quiet idle. A soft pull-start (a rope's zip, a few catching strokes). Hull sounds: water slapping the planks in time with the pitch swings and with the waves crossing the bow, a hiss along the hull at speed, and an occasional faint wooden creak as the boat rocks. Everything sits under the ambience and the limiter. | js/audio/engine.js | `dbg.audio()` shows the motor's gain and rpm following `dbg.boat()`. An `OfflineAudioContext` render of a full-throttle start and stop in headless Chromium peaks ≤ −12 dBFS before the limiter (no sudden loud sound, §0.14). The events `pullstart`, `slap` and `creak` appear in the log when expected. |

**Baselines:** all unchanged (presentation only; `boat.step` keeps its speed rules).

---

## Phase 25: The sounds of fishing

Every fishing sound becomes a layered, physically inspired synthesis that follows the state. No sample files (§0.2, V13). Complex one-shots are rendered once into `AudioBuffer`s when audio unlocks, in 4–6 variants each, and `G.vrng` picks a variant, so nothing sounds the same twice in a row.

| ID | Task | Files | Done when |
|---|---|---|---|
| 25.1 | **The sound kit.** A small bank at unlock: short noise impacts, tuned resonances (band-pass banks for the reel body, the rod and the boat), a **Karplus-Strong** string for the line, a **Minnaert bubble** voice (a sine whose pitch rises as the bubble closes, set by its size), and a synthetic reverb impulse per water (a short damped lake echo on Fogbound and the Pines, tight and close in the creek, strangely long in the Red Room). Pre-rendered with an `OfflineAudioContext` and kept within a voice cap. | js/audio/engine.js | Unlock render time is under 150 ms on the reference laptop. `dbg.audio()` lists the banks and the variant counts. |
| 25.2 | **Splashes and the lure going in.** A splash is three layers: the impact (low-passed noise, about 20 ms), the cavity (one or more Minnaert bubbles), and droplets (5–15 small high plinks scattered over 60–400 ms). The size comes from the energy: the lure's landing scales with cast distance and the bait's weight (the worm is a soft plip, the minnow a fuller plop), a fish rise is a small slurp with a bubble, and a jump's landing is the biggest. Lifting the lure out is a small drip, and drips fall from the lure at the rod tip. | js/audio/engine.js | Each event plays from a scripted run: `dbg.cast(0.3)`, `dbg.cast(1)`, a rise, a jump (Phase 23), a reel-out. RMS rises with the size, and every peak is ≤ −12 dBFS before the limiter. |
| 25.3 | **Line and reel.** On the cast: a rod whoosh (band-passed noise that sweeps with the flick's speed), the bail opening with a click, and the line hissing off the spool, with its rate and pitch falling as the lure slows. A bail-closing clack when the lure lands. Reeling: the handle's gear whir (a tonal buzz at the gear-tooth rate) and the anti-reverse clicks, both at a rate tied to the retrieve speed. Reeling in slack line (Phase 21) is lighter than reeling against a load. **Each reel tier sounds different:** the Tin Reel rattles, the Click Reel clicks clearly, the Brass Reel rings, the Quiet Reel is nearly silent, and the Reel That Hums hums. The drag: a ratchet whose click rate and pitch follow how fast the fish takes line (D rising), up to a buzz on a hard run. | js/audio/engine.js | Click and whir rates in `dbg.audio()` follow the reel speed and dD/dt (logged against `dbg.fight()` from 23.5). Five renders, one per reel tier, differ in their spectral centroid. |
| 25.4 | **A fish biting and fighting.** Nibbles are tiny dry ticks carried up the line (filtered clicks with a short rod-body resonance), timed with the 21.3 twitches. A bite is a firm knock and the rod tip ticking. A shallow bite adds a surface pop. The hook-set is a line twang (Karplus-Strong at the line's tension) and a rod whoosh. In the fight, the existing tension tone becomes a thin singing line (a string tone whose pitch follows T) and a low rod creak at high tension. A head shake (Phase 23) is a burst of line twangs. Near the surface the fish splashes and thrashes (small splashes panned to the fish, at a rate set by its speed). A slack line is quiet. A slip is a quick ratchet run. A snap is a sharp but soft twang and then silence. A thrown hook is a small splash and the lure ticking back. | js/audio/engine.js | A scripted fight with `dbg.give` produces the expected sequence in the event log (bite → hook → run/drag → shake → … → land). A 30 s fight render shows no clipping and peaks ≤ −12 dBFS. |
| 25.5 | **Space and the underwater mix.** While the view is under water (`uw.alpha`), surface sounds pass through a low-pass at about 600 Hz with a muffled bubbling bed, and the line and reel (which are at the boat, in the air) stay clear. Distance attenuation and panning by world x for everything on the water. Each water's reverb from 25.1 is on a send. | js/audio/engine.js | The low-pass frequency follows `uw.alpha` (logged). A splash at the far edge of the world is quieter than one under the boat. `dbg.audio()` reports the reverb per water. |
| 25.6 | **Mix pass.** All new layers sit under the ambience at the levels set in audit batch 2. The master limiter stays on. Mute and volume reach every new bus. | js/audio/engine.js | Mute gives 0 on every bus. A 5-minute scripted session render never goes above −1 dBFS after the limiter and has no event louder than 6 dB above the ambience median (§0.14). |

**Baselines:** all unchanged (presentation only).

---

## 4. Risks

| Risk | Mitigation |
|---|---|
| The rope looks rubbery or jittery at 640×360. | Fixed dt, 6–8 iterations, a little damping, and draw with whole-pixel rounding as `line()` does now. Tune with the 21.x screenshots before moving on. |
| The rope and the lure disagree about where the lure is. | The lure stays the sim's (`cast.x1`, `cast.ly`), and the rope is pinned to it. Only in 22.2 does the rope's pull feed back, through pure inputs, so it stays deterministic per seed. |
| Phase 23 makes the game feel punishing. | Measured targets (23.4) for a skilled and a careless player. Losses are quiet, and the slip still forgives the first overload. If a player test says it is too harsh, `holdLoss` and the slack threshold are data knobs in `data/gear.js`. |
| The fight change moves passive income or pacing. | Retune in the same phase. `--passive` and `--pacing` must PASS before the phase is done. |
| Procedural sound still sounds synthetic. | Layer, vary (4–6 pre-rendered variants), and tie every parameter to state. Real fishing sounds are mostly noise, resonance and bubbles, which synthesise well. A tonal source used alone is what makes a sound obviously fake. |
| Performance: the height field, the rope, the motor and the audio all add cost each frame. | A budget per phase (step times above) and the 14.7 check (8 fish plus an anomaly plus the reflection at 60 fps) re-run at the end of 20, 21 and 24. |

## 5. After each phase

As CLAUDE.md requires: report the check output, commit as `Phase N: <name> (tasks N.1-N.k)`, and update PLAN.md §8 (the phase table, decisions in 8.3, known issues in 8.4, baselines in 8.5, and the next task in 8.6). Don't push without asking.
