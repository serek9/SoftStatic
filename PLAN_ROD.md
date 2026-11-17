# SoftStatic: The Rod and the Fisher, Phases 31–35 (built)

Adds phases after the approved spec; decisions are in PLAN.md §8.3 #153–187. All presentation only: `js/sim` and `data` are untouched.

## What a real rod does (the model)
- **A tapered beam:** stiffness ∝ diameter⁴, so a light load bends only the tip and a heavy one works down to the butt (progressive). The **action** is how fast it thins: fast rods bend in the top third.
- **The line pulls the tip toward the fish;** under heavy load the tip points almost along the line.
- **It springs:** overshoots and settles in damped swings; in a cast it loads back and whips forward.
- **Parts:** cork grip and butt, reel seat, reel under the blank, guides shrinking toward the tip, the line in straight chords between guides.

## Phases
- **31 The rod as a tapered blank** (`js/gfx/rod.js`): 12 segments, compliance ∝ 1/d⁴, equal power per tier, action from slow (0.5) to fast (0.25). `rodLoad` gives load and direction from the line; the rope starts at the bent tip. Drawn with its parts. `dbg.rodBody()`, `dbg.rodLoad(x)`. Checked by `--rod`. (31b: stable solver with inertia, line stretch, load only through a tight line.)
- **32 The rod in motion:** the cast loads and whips the tip; a bite nods the tip (the rod tilts ≤2°); the reel handle turns while reeling; the bail opens and closes.
- **33 The fisher's hands** (`js/scene/fisher.js`): a posable fisher with named hand poses and eased moves; a rod holder on the gunwale; the **idle director** starts an act only when nothing happens and ends it on any input or event on the same step (never blocks input). `dbg.fisher()`, `dbg.idle(name)`.
- **34 Preparing the lure:** between casts the lure hangs from the tip; he reels it up, checks it, re-baits, tugs the knot (6–8 s).
- **35 Opening a beer:** a cooler on the boat; while waiting he sets the rod in the holder, cracks a can, drinks, sets it on the gunwale; a bite is hookable at once. Beer at dusk and night, thermos in the grey hours. One can at a time, never during a fight.
