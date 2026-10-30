# SoftStatic: The Rod and the Fisher, Phases 31–35

**Date:** 2026-10-30. **Repo state:** Phases 1–30 done (PLAN.md §8.1), `main` at `bef55c8`.
**Status:** Asked for by the user on 2026-10-30 ("make a plan to improve the realism on the rod bend (like an actual fishing rod) and make animations of preparing the lure and opening a beer when nothing happens or he is waiting. start with the first phase"). Phase 31 is done (PLAN.md §8.1, 8.3 #153–157), and 31b fixed it after the user saw it bend both ways under tension (8.3 #158–164): a stable solver with inertia (32.1 done there), the line's stretch, the load only through a tight line, the waiting line's belly and the bite's tugs, and `node tools/balance.js --rod`. Phase 32 is done (8.3 #165–171). Phases 33–35 wait for the user.
**Read with:** PLAN.md §0 (conventions, required) and §8 (status). Like PLAN_REALISM.md and PLAN_FISHSWIM.md, this file adds phases after the approved spec and does not edit §0–§7 or Appendix V.

The user asked for two things:

1. The rod should bend like a real fishing rod.
2. While nothing happens, or while he waits for a bite, the fisher should prepare his lure and open a beer.

Every phase here is presentation only: `js/sim/*` and `data/*` are not touched, so `--replay`, `--pacing`, `--passive`, `--fight` and `--saves` must not move.

---

## 1. What exists today (verified in the code)

| Part | What the code does now | Where |
|---|---|---|
| Rod shape | A 22 px quadratic curve from the hands. `bend` pushes its middle sideways, but the **tip never moves**: a rod under a 5 kg fish ends where an unloaded one does, and its curve is a symmetric arc instead of a curve that tightens toward the tip. | `js/scene/boat.js` `drawRod`, `rodTip` |
| Load | A scripted number per state in `rodPose` (`4 + 5·T` in a fight, `+6` on the hook-set, `+2` on a head shake, `±3` on the cast). It has no direction: the line pulling down toward a deep fish and toward a fish at the surface bend the rod alike. | `js/scene/sailing.js` `rodPose` |
| Rod look | A 1 px line, 2 px for its first quarter (always drawn 1×2, so it loses its thickness when the rod stands upright), and a 2×1.5 ink reel. No handle, no guides, no line along the rod. Tiers differ only in colour. | `drawRod` |
| Motion | None of its own. The tip goes exactly where the scripted angle puts it; a hook-set or a released line does not make it spring back and shiver. | `rodPose` |
| The bite cue | The whole rod tilts by up to 9°, as if the fisher lifted it, instead of the tip nodding. | `rodPose` `default` |
| The fisher | One baked image with its arms painted in (two variants: hands on the rod, and a thermos cup at the mouth). The rod stays in his hands while he drinks. | `boat.js` `ART.fisher` |
| Idle life | Every 34 s between casts, 3 s of sipping from a thermos (P2-2). Nothing while he waits for a bite. Between casts no lure hangs from the rod tip (the line is off). | `sailing.js` `drawBoat` |

## 2. What a real rod does

- **It is a tapered beam.** Its stiffness goes with the fourth power of its diameter, so a blank that thins from butt to tip is many times softer at the tip. Under a light load only the tip bends; as the load grows the bend works down into the middle and then the butt (a *progressive* curve). How fast it thins is its **action**: a fast rod bends mostly in its top third, a slow one through its length.
- **The line pulls the tip toward the fish.** The load has a direction: the tip bends toward where the line goes and, under a heavy load, ends up pointing almost along the line.
- **It springs.** Let go of a load and the tip overshoots and shivers back in a few damped swings; in a cast it loads backward as the rod is swung and unloads with a whip that throws the lure.
- **Its parts:** a cork grip with a butt behind the hands, a reel seat, a reel hanging under the blank, guides on the underside that shrink toward the tip, and the line running from the reel through the guides in straight chords that show when the rod bends.

## 3. Order and dependencies

```
31 The rod as a tapered blank ──> 32 The rod in motion
                              └─> 33 The fisher's hands ──> 34 Preparing the lure
                                                        └─> 35 Opening a beer
```

- **31 first:** a rod whose shape comes from a load with a direction, drawn with its parts. Everything later reads it.
- **32** gives that shape inertia: the hook-set, the cast's load and whip, a tip that nods on a bite.
- **33** lets the fisher's hands leave the rod (and the rod sit in a holder), which both idle acts need, and adds the scheduler that starts them only when nothing happens.
- **34 and 35** are the two acts the user asked for.

---

## Phase 31: The rod as a tapered blank

Presentation only. New file `js/gfx/rod.js` (G.gfx, after `rope.js`), like `rope.js` for the line (the same kind of deviation as R1 in PLAN_REALISM.md).

| ID | Task | Files | Done when |
|---|---|---|---|
| 31.1 | **The blank as a beam.** The rod is a chain of 12 segments from the hands, the first two rigid (the fore grip and reel seat). Each joint's compliance comes from the blank's diameter at that point (∝ 1/d⁴, the diameter thinning linearly from butt to tip), scaled so every tier has the same power. The tier sets the action: the cheapest rod is slow (tip/butt 0.5), the best fast (0.25). A tip force with a direction bends each joint by its compliance times the force's moment about it, solved by relaxation from the last shape each step (no allocation). | js/gfx/rod.js | In Node: unloaded, every joint lies within 0.5 world px of the straight rod. The tip's deflection grows with the load. For every tier the bend is progressive: from load 0.2 to 1 the top third's share of the bend falls and the lower half's grows, and at load 1 the lower half carries at least 25%. The fast tier puts at least 55% of the bend in its top third at load 0.2; the slow tier bends lower than the fast one. At load 1 pulling down-forward the tip segment points within 25° of the line. The tier changes the distribution but not the tip deflection under a small load (±10%). A solve costs under 0.05 ms on average; no NaN. |
| 31.2 | **The load from the line.** `rodPose` keeps only the angle the hands hold; a new `rodLoad` gives the load (0–1 of the rod's rating) by state (line weight while it sinks or waits, the bite's pull, the hook-set, tension in the fight, the landing, passive mode, a stand-in for the cast until 32.2) and its direction from the rod tip to the line's third point (the lure when there is no line). `rodStep` solves the rod in `update()` before `ropeStep`; the rope's point 0, the lure riding the tip during the flick and where the lure leaves all use the **bent** tip. | js/scene/sailing.js | In a fight the tip is lower and nearer the fish than the unloaded tip, more so as T rises. The rope's point 0 equals the drawn tip in every frame (0 px). |
| 31.3 | **The rod's parts.** A tapered blank (two view pixels thick for its lower half, across its length whatever its angle, lit on top and shaded below; one pixel above), a cork grip and butt behind the hands, a reel seat, a reel under the blank, five guides on the underside that shrink toward the tip with thread wraps, a tip-top, and the line from the reel through the guides to the tip in straight chords. Tier colours stay. | js/scene/boat.js | Screenshots unloaded, waiting, in a hard pull and on the hook-set: the curve tightens toward the tip and the line cuts chords between the guides under load. The mirror shows the same rod. |
| 31.4 | **Debug.** `dbg.rodBody()` returns `{load, dir, tip, bendDeg, top3, butt, tier, taper, ms}`; an overlay line; `dbg.rodLoad(x)` forces a load (null restores). | js/core/debug.js, js/gfx/rod.js | `dbg.rodBody()` returns those fields; `dbg.rodLoad(1)` bends the rod in the sailing state. |

## Phase 32: The rod in motion

Presentation only.

| ID | Task | Files | Done when |
|---|---|---|---|
| 32.1 | **Inertia.** *(Done in 31b: PLAN.md 8.3 #159.)* Each joint is a damped spring around the shape 31.1 solves, lighter toward the tip, so the rod overshoots and settles. The hook-set and head shakes become impulses on it instead of added bend. | js/gfx/rod.js, js/scene/sailing.js | After a load drops from 1 to 0 the tip overshoots, changes sign at least twice and is within 5% of rest in 0.4–0.8 s. |
| 32.2 | **The cast loads the rod.** The hands' angular acceleration is an inertial load on the blank: as the rod is swung back the tip lags, and on the flick it loads backward, then whips forward past the line and rebounds. The scripted ±3 bend goes. The lure leaves from the tip as it whips. | js/gfx/rod.js, js/scene/sailing.js | During the flick the tip trails the straight rod by at least 3 world px, then overshoots it; the lure's flight still starts at the drawn tip and lands on the marker. |
| 32.3 | **The bite through the tip.** A bite pulls the tip down in nods at the fish's rhythm (the whole rod tilts at most 2°); nibbles tick it. | js/scene/sailing.js | The tip moves at least 2 world px on a bite (the P1-4 cue), with the hands' angle changing by 2° at most. |
| 32.4 | **The reel.** The reel's handle turns while reeling, at the reel's speed; the bail opens on the cast and closes when the lure lands. | js/scene/boat.js | The handle's frame changes only while the action key is held with a line out. |

## Phase 33: The fisher's hands

Presentation only.

| ID | Task | Files | Done when |
|---|---|---|---|
| 33.1 | **A posable fisher.** The body, head and cap baked as now without the arms; the arms painted (`paint.limb`, natively, never rotated) from shoulder to elbow to hand for a hand position, cached per position on a coarse grid. Poses are named hand positions (both on the rod, rod raised, cranking, reaching down, hand at the mouth, holding something before the face) and the head can tilt down or back. | js/scene/boat.js | Each pose matches today's fisher in the rod pose within 4 px of painted difference; no arm canvas is painted twice. |
| 33.2 | **Moving between poses.** A pose change moves the hands along a short eased path (0.2–0.4 s), the rod base following the hand that holds it. | js/scene/boat.js, js/scene/sailing.js | The hands never jump more than 1 world px a frame. |
| 33.3 | **A rod holder.** A holder on the gunwale beside him; the rod can be set in it at a fixed angle and taken out, and it still bends with the line there. | js/scene/boat.js, js/scene/sailing.js | The rope's point 0 follows the tip in the holder; a bite bends the rod in the holder. |
| 33.4 | **The idle director.** A scene-side state that starts an act when nothing happens: between casts, stopped, no input for 6–12 s; or waiting for a bite with no fish interested for 8–15 s (`G.vrng` picks the act and the wait). Any key, a move, interest, a bite, a passive fish or an anomaly ends the act at once: the hands go back to the rod within 0.2 s and the input acts on the same step (never blocking input, §0.14). | js/scene/sailing.js | Pressing the action key during an act casts or reels on that step; a bite during an act is hookable as usual (`--fight`-style check in the browser). |
| 33.5 | **Debug.** `dbg.fisher()` returns `{pose, hands, holder, act, actT}`; `dbg.idle(name)` starts an act (null ends it). | js/core/debug.js | As described. |

## Phase 34: Preparing the lure

Presentation only.

| ID | Task | Files | Done when |
|---|---|---|---|
| 34.1 | **The lure hangs from the tip between casts.** In the sailing state a short line hangs from the rod tip with the bait's lure on it, swinging with the boat (the rope with a free end, as after a thrown fish). | js/scene/sailing.js | It swings when the boat starts and stops and settles under the tip. |
| 34.2 | **The act.** Between casts only: he raises the rod, reels the lure up near the tip (clicks), takes it in his hand, looks it over (head down), works the hook and puts on fresh bait (the sprite of the bait in use), tugs the knot (the tip nods), lets it go to swing, and lowers the rod. About 6–8 s. | js/scene/boat.js, js/scene/sailing.js | Started with `dbg.idle('lure')` it runs through every step; the action key at any moment starts a charge on that step. |
| 34.3 | **Sounds.** The reel's clicks from the kit, a small tick as the hook goes in. | js/audio/engine.js | Cues heard in order (`dbg.audio()` log). |

## Phase 35: Opening a beer

Presentation only. Tone: one can at a time, quiet, never while a fish is on.

| ID | Task | Files | Done when |
|---|---|---|---|
| 35.1 | **A cooler.** A small painted cooler on the boat's floor behind him. | js/scene/boat.js | Visible in screenshots on every water and in the mirror. |
| 35.2 | **The act.** While waiting with nothing interested (and between casts too): he sets the rod in the holder, takes a can from the cooler, cracks it (a small pooled puff of foam), drinks (head back), and sets it on the gunwale; later sips come from that can until it is empty, and the empty goes back into the cooler. On a bite or interest he puts the can down and takes the rod; the bite is hookable at once. | js/scene/boat.js, js/scene/sailing.js | `dbg.idle('beer')` runs through every step; a bite during it gives the same hook window as without it. |
| 35.3 | **The beer and the thermos.** The beer replaces the thermos at night and dusk; in the grey hours he still drinks from the thermos. | js/scene/sailing.js | The act picked at 12:00 is the thermos, at 22:00 the beer. |
| 35.4 | **Sounds.** The crack and hiss of the can, the can set down on wood, synthesised in the kit (§0.2: no sound files) and played through `cue()`. | js/audio/engine.js | The cues are in the kit and play in order. |

---

## 4. Risks

| Risk | Mitigation |
|---|---|
| The beam solve oscillates under a heavy load (soft tip, large moment). | Relaxation from the last shape with a factor under 1, a few iterations a step; check for NaN and for convergence in Node at every tier and load. |
| A bent tip moves where the line and the lure start, so the cast and the rope disagree. | One function gives the bent tip in world pixels; the rope, the flick and the draw all read it, and the check compares them every frame. |
| A curved, thick blank drawn pixel by pixel breaks the pixel-art rules (§8.3 #84). | Whole view pixels, two flat keys for the blank, no anti-aliasing; thickness across the curve, not a rotated image. |
| Idle acts take control from the player. | The director ends an act on any input or event, before input is read; the checks press keys mid-act. |
| The beer feels out of tone. | One can, quiet, short, never during a fight; the thermos keeps the grey hours. |

## 5. After each phase

Run the §0.13 checks, update PLAN.md §8 and HANDOFF.md, and commit `Phase N: <name> (tasks N.1-N.k)`. Push only when the user asks.
