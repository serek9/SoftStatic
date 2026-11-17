# SoftStatic: Realism, Phases 20–26 (built)

Adds phases after the approved spec; decisions are in PLAN.md §8.3.

## Spec deviations (approved)
| # | Deviation | Phase |
|---|---|---|
| R1 | New files `js/gfx/surface.js` (height field) and `js/gfx/rope.js` (the line), in `G.gfx`. | 20, 21 |
| R2 | V4's fight gains a **hook hold** H that drops while the line is slack during a head shake or jump; at H = 0 the fish throws the hook (an escape). Slip, snap and the 3 s run-out stay. | 23 |
| R3 | The line is simulated and can bow and sag (still dotted under water). | 21 |
| R4 | Every water has a gentle current (wind drift on lakes); the creek keeps its own. | 22 |
| R5 | Optional fish field `jumps` (0..1), validated. | 23 |

Tone (§0.14): no sudden loud sound (limiter on, peaks checked), a lost fish is quiet, never a fail screen, the dog is never startled.

## Phases
- **20 Living water surface:** a height field per world column (per-water swell plus pokes from splashes, wake, rises, thrashing); the waterline drawn from it with crest, lit faces and foam; the mirror breaks where the surface does; the surface seen from below with caustics; floats and piles ride it.
- **21 The line as a rope:** a 48-point Verlet chain from rod tip to lure; rest length is line out. It trails on the cast, bellies while sinking, sags while waiting, straightens before reeling, vibrates under tension and sags when the fish tires. Solid above water, dotted below.
- **22 Current and the lure:** pure `flow(loc, seed, t, x, depth)`; the line's belly drags the lure; the lure tilts and flutters by bait; weeds, motes and streaks follow the same field; fish AI reads the drifted lure.
- **23 A fight you can lose:** H set by reaction speed at the hook-set (1.0 instant → 0.7 late); head shakes and jumps cost H on a slack line. **23.4:** `--fight` reports landings, snaps, thrown hooks and run-outs by strategy and gear. Signals are on the rope and rod, nothing new in the HUD.
- **24 The boat under way:** pitch and heave springs (bow lifts on throttle, rocks on stop); bow wave and stern wake; an eased throttle and rpm; a synthesised two-stroke outboard.
- **25 The sounds of fishing:** a synthesised kit (noise impacts, resonators, plucked-string line, bubble voices); layered splashes; rod whoosh, bail, line hiss, reel gears and drag; nibble ticks, bite knock, thrashing; underwater low-pass; a mix pass under the ambience.
- **26 Revisiting three choices:** the wake is simulated as long waves that catch the boat when it stops; the motor must run before the boat moves; every lake cast drifts (direction per cast by seed).
