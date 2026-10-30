# SoftStatic: Fish Swimming Phases 27–30

**Date:** 2026-10-30. **Repo state:** Phases 1–26 done (PLAN.md §8.1), `main` at `d1baf85`.
**Status:** Asked for by the user on 2026-10-30 ("make a plan to improve fish swim realism and start with it"). Phase 27 is done (PLAN.md §8.1). Phases 28–30 wait for the user to say start.
**Read with:** PLAN.md §0 (conventions, required) and §8 (status). Like PLAN_REALISM.md, this file adds phases after the approved spec and does not edit §0–§7 or Appendix V.

The user asked for one thing: fish should swim more realistically.

---

## 1. What exists today (verified in the code)

| Part | What the code does now | Where |
|---|---|---|
| Tail beat | Two frames: rest, and the tail tip bent *down*. Seen from the side a real tail sweeps toward and away from the viewer, so it should foreshorten, not drop. The frames alternate at `2 + |vx| / 6` per second, so a fish beats even while gliding, and the beat has no link to its body length. | `js/gfx/fishgen.js` `paintLook` (`bend`), `js/scene/underwater.js` `drawFish` |
| Turning | A fish's facing is the sign of `vx` (±0.5 px/s), so it flips in one frame, often several times while it circles a lure or slows down. | `drawFish` |
| Pitch | None. A fish rising or diving moves diagonally while its body stays level. | `drawFish` |
| Movement | The sim sets velocities directly: a spring to the home depth (`vy = (home − y) × 0.5`), `ease` toward a target speed, and a circle around the lure drawn by a stiff spring (`(tx − x) × 6`). There is no heading, no turning circle, no burst and glide, and the current never touches a fish. | `js/sim/fish_ai.js` `stepFish` |
| Hooked fish | The swimmer jitters by ±1 px and flips its tail at 10 frames per second while pulling. It faces away from the boat while pulling and toward it while tired, flipping at once when the mode changes. | `underwater.js` `drawHooked`, `hookPos` |
| Background | Four far silhouettes cross at a fixed speed with the two-frame beat. | `underwater.js` `draw` |

## 2. Order and dependencies

```
27 The swimming body (presentation) ──> 28 Swimming that steers (sim) ──> 29 The hooked fish swims
                                                                   └───> 30 Shoals and reactions
```

- **27 first**: every later phase draws through the swimming body (beat, turn, pitch).
- **28 after 27**: once the drawn fish turns and glides, the sim's own motion (instant reversals, constant speed) shows; 28 makes it steer, burst and glide.
- **29 and 30** use both.

## 3. Baselines

- **27 is presentation only.** `fish_ai` is untouched and reads no new state, so `--replay`, `--pacing`, `--passive`, `--fight` and `--saves` must not move.
- **28 changes the sim** (`js/sim/fish_ai.js`), so the replay hash moves. Arrival times and bite rates must stay inside the V8 pacing targets and the passive share inside its band; the new baselines go in PLAN.md §8.5.
- **29 and 30** are presentation again; 28's baselines must not move.

---

## Phase 27: The swimming body

Presentation only. Every swimmer gets a body that the scene steps in `update()` and the draw only reads.

| ID | Task | Files | Done when |
|---|---|---|---|
| 27.1 | **A side-view tail beat.** Paint the tail swept away from the viewer (foreshortened, the far side in shadow) and toward it (foreshortened less, a little larger, lit) instead of the tail drooping. A beat runs rest → away → rest → near. The silhouettes and the far fish use the same frames. | js/gfx/fishgen.js | The gallery shows the four beat frames for every base. In the away and near frames the tail is shorter than at rest and its tip does not move down. Every frame of a fish keeps the same canvas size and mid row. |
| 27.2 | **Turning frames.** Paint each look narrowed across (the fish seen at an angle as it turns), at two widths, natively and not scaled. A reversal plays wide → narrow → narrow flipped → wide flipped over 0.2–0.4 s, longer for a longer fish. | js/gfx/fishgen.js | Each turn frame keeps the canvas's size, middle and mid row, with the body 0.6 and 0.3 of its full length. |
| 27.3 | **The swimming body.** A per-fish body state stepped in `update()`: the beat phase advances at a rate set by speed over body length (between about 0.7 Hz sculling and 6 Hz), the tail rests while the fish slows (a glide), facing changes only past a speed threshold and always through a turn, and the body pitches toward the direction of travel (column shear, as the boat does, up to about 24°). The wrongness effects (twitch, out-of-step beat, backward beat, shimmer) stay. | js/scene/underwater.js, js/scene/sailing.js | In a headless run of 60 s with a school: no fish changes facing without a turn; the beat rate rises with speed; the drawn pitch follows the direction of travel and is level when swimming flat; the fish draw stays under 1 ms. |
| 27.4 | **Every swimmer through it.** The hooked fish (its beat from the fight's pull, its reversals through turns, its mouth where the turned, pitched body puts it), the heavy shadow and the far silhouettes. | js/scene/underwater.js | During a fight the line meets the drawn mouth in every frame, through turns. The background and heavy shadow use the four-frame beat. |
| 27.5 | **Debug.** `dbg.fishBody(i)` (slot, or `'hook'`) returns the body; the overlay shows it for the first fish; the gallery pages show the beat and turn frames. | js/core/debug.js | `dbg.fishBody(0)` returns `{face, turn, beatHz, phase, glide, pitch, frame}`. |

## Phase 28: Swimming that steers (sim)

Changes `fish_ai` movement inside its existing states (V3.4's states and timings stay). Needs the user's go-ahead because the baselines move.

| ID | Task | Files | Done when |
|---|---|---|---|
| 28.1 | **Heading and speed.** Each fish has a heading and a speed instead of free velocities, with a top turn rate and acceleration set by its species' speed. Depth changes come from pitching the heading, so it rises and dives along a slope. | js/sim/fish_ai.js | No fish reverses in under 0.25 s; vertical speed never exceeds about 0.6 of total speed; the replay is identical for the same seed. |
| 28.2 | **Burst and glide.** Wandering and approaching fish swim in bursts of a few beats, then glide and slow; the scene's beat (27.3) follows the sim's speed. | js/sim/fish_ai.js | A wandering fish's speed varies in a burst–glide cycle of 1–3 s; the average approach time to the lure stays within 15% of today's. |
| 28.3 | **Current and holding station.** The current carries fish as it carries the lure; in the creek, a fish that is not moving faces into the current and swims to hold its place. | js/sim/fish_ai.js, js/scene/sailing.js | In the creek, wandering fish face upstream most of the time; in still water nothing changes. |
| 28.4 | **Circling and nibbling by steering.** The inspect circle is steered, not a spring; nibbles are short darts in and back. | js/sim/fish_ai.js | Circling takes the same time to within 15%; bite rates and the V8 pacing targets still pass over 20 seeds. |

## Phase 29: The hooked fish swims

Presentation, on top of the fight sim (V4 and Phase 23 rules unchanged).

| ID | Task | Files | Done when |
|---|---|---|---|
| 29.1 | **Runs and turns.** The hooked fish heads along its run (pitched down into a dive, up toward the surface), turns through the turn frames when the run changes, and its beat follows pull strength. The ±1 px jitter goes. | js/scene/underwater.js | Its heading follows its motion in pull mode; no instant reversals. |
| 29.2 | **Head shakes and tiring.** Head shakes (Phase 23) bend the head side to side; a tired fish beats slowly, then lists onto its side and flashes its belly (a painted roll frame). | js/gfx/fishgen.js, js/scene/underwater.js | The shake frames line up with `fight.shake`; the roll shows only when T is low and the fish is tired. |

## Phase 30: Shoals and reactions

Presentation only.

| ID | Task | Files | Done when |
|---|---|---|---|
| 30.1 | **Far shoals.** The far silhouettes become loose shoals of 3–7 with simple separation, alignment and cohesion. | js/scene/underwater.js | Shoals stay together and never overlap a member. |
| 30.2 | **Startle.** A splash or the boat passing overhead makes nearby far fish dart away in a fast burst and regroup. | js/scene/underwater.js | After a splash, far fish within reach speed up and turn away within 0.3 s. |

---

## 4. Risks

| Risk | Mitigation |
|---|---|
| More frames per species make the location's bake slow. | Bake on the travel fade as now and measure each water's first load. Phase 27 derives silhouettes from the colour frames so each is painted once: the Pines' load went from 264 to 301 ms, the creek's from 146 to 131 (PLAN.md §8.3 #140). |
| Shearing a 50 px fish column by column costs draw calls. | Strips as wide as the slope allows (1 px of drop per strip), no shear under a small slope. Measure the fish draw. |
| The turned, pitched mouth and the line disagree. | `mouth()` reads the same frame and shear that the draw uses. |
| 28 shifts pacing. | Measure arrival and bite times before and after, over 20 seeds, and retune only the new movement constants. |

## 5. After each phase

Run the §0.13 checks, update PLAN.md §8 and HANDOFF.md, commit `Phase N: <name> (tasks N.1-N.k)`, push, and merge by pull request.
