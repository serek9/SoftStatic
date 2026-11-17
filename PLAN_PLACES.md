# SoftStatic: Places, Lures and the Pier, Phases 63–67 (built)

Adds phases after the approved spec; decisions are in PLAN.md §8.3.

## Phase 63: The dog to scale
The rooms' dog is painted at its breed's real height (`data/looks.js` `size`, 0.55–0.85; golden 0.70) through `G.gfx.pix.scaled`, so outlines stay whole. Checked by `--validate`.

## Phase 64: Rooms that are lived in
Cabin: lava lamp, a grey late-90s console under the CRT, a box fan, a humming mini fridge. Shop: lava lamp, lit drinks cooler, ceiling-fan shadow, a cat clock at night, flies round the bulb. Varnished floors reflect lit things; window glass and the CRT glare. `dbg.roomLife()` lists the live things.

## Phase 65: Lures that move like lures
The retrieve follows the line toward the rod tip with inertia; a paused sinking lure swings back on a tight line. Each lure keeps its action (spinner lifts, plug dives to a running depth, jig hops, grub swims level). Adds the red-and-white bobber rig (fishes as a worm) and a casting spoon. The cast flies a ballistic arc with drag, the line settles from the tip. `dbg.lureBody()`.

## Phase 66: The chart
The map has relief, rivers, a road and bridge, the shop and cabin, soundings, a legend, a scale bar and a paper border. Arrows move to the nearest stop in that direction (`dbg.mapNav()`).

## Phase 67: The pier at the edge
Fogbound's pier is at its west end (x 96). Stopping beside it opens **Bait Shop / The Cabin / Stay on the water**; leaving either returns to the boat at the pier. `dbg.dock()`.
