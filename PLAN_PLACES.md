# SoftStatic: Places, Lures and the Pier, Phases 63–67

**Date:** 2026-11-01. **Repo state:** Phases 1–62 done (PLAN.md §8.1).
**Status:** Asked for by the user on 2026-11-01, as five improvements:

> · the dog besides the main character in the tackle shop looks big, make it smaller more proportion like real.
> · make the cabin and the shop feel alive like it is an actual place, maybe a lavalamp, a play station 1, more details, reflections...
> · when retriving the lures the phisics of the lure should be like in real live, add more type of lures like a buoy classic white and red floating with the hook and some bait underneath, more realiasm when throwing the line...
> · improve the details in the map and the navigation in it.
> · the pier should be in one side of the map and if you go to where the pier is you can go to your cabin or the tackle shop

**Read with:** PLAN.md §0 (conventions, required) and §8 (status). Like the other plan files, this one adds phases after the approved spec and does not edit §0–§7 or Appendix V. Decisions go in §8.3.

---

## Phase 63: The dog to scale

**63.1** The walk-in rooms' dog (js/ui/room.js) is painted at its breed's real height beside the fisher. The poses keep their 40×32 box; a scaled view of a grid (`G.gfx.pix.scaled(g, s)`) rasterises every ellipse, capsule and polygon at the smaller size, so the outline, eyes and nose stay whole instead of being shrunk as pixels. `data/looks.js` gains `size` per dog (golden 0.70, husky 0.68, St. Bernard 0.80, poodle 0.66): a golden retriever's back comes to about a third of his height, as a real one's comes to a man's hip. The anchor and the shadow follow the size.
*Done when:* `--validate` checks every dog's size (0.55–0.85); the shop seen in headless Chromium shows the dog at the fisher's hip.

## Phase 64: Rooms that are lived in

**64.1** The cabin gains a lava lamp (wax blobs that rise, merge and fall, its glow in the dark), a grey PlayStation-like console under the CRT with its controller on a cable and a memory card, a game on the screen when the TV is on (a fishing game's title in the console's colours), a box fan turning, a mini fridge humming with magnets.
**64.2** The shop gains a lava lamp on the back counter, a humming drinks cooler with a lit front, a ceiling fan's turning shadow, a cat-shaped wall clock's eyes and tail (only at night, quietly), flies round the bulb.
**64.3** Reflections: the floors are varnished, so each lit thing (lamps, the stove's fire, the CRT, the lava lamp, the windows by day) lays a soft stretched reflection on the boards under it; the windows' glass reflects the room's lamps at night; the CRT's glass has a curved glare.
*Done when:* `dbg.roomLife()` lists the live things and their state in each room; both rooms render in headless Chromium with no page errors at day and at night.

## Phase 65: Lures that move like lures

**65.1** The retrieve: a reeled lure travels toward the rod tip along the line, not straight across and up at fixed speeds: its rise comes from the line's angle (deep and close it climbs steeply; far out it runs level), it speeds up and slows with inertia when the reel starts and stops, and a sinking lure on a paused retrieve falls back on a tight line in a pendulum toward the boat. Each lure keeps its own action on top: the spinner lifts with speed, the plug dives to a running depth set by speed and floats up when paused, the jig hops on each turn of the reel and drops, the grub swims level.
**65.2** New tackle: the **bobber rig** (a classic red-and-white float with a hook and a worm hanging under it at a set depth: the float lies on the surface and bobs, dips under on a bite and tilts on a nibble), and a **casting spoon** (sinks fast, flutters and flashes on the drop, wobbles on the retrieve). Both are sold at the lure case and chosen in the setup panel like the other lures. The bobber fishes as a worm does for the fish (`carries: 'worm'`); the spoon is in the species' `lures`.
**65.3** The cast: the lure flies a ballistic arc with air drag, the line pays off the spool in a curve behind it, the lure "feathers" down at the end of a long cast, it lands with a splash sized to its weight, and the line settles onto the water from the tip outward before it sinks.
*Done when:* `--validate` (the new lures and every water has something that takes them), `--tackle` PASS (every lure 50–200% of worms), `dbg.lureBody()` reports the retrieve's speed, rise and the pendulum; the replay hash re-recorded if it moves.

## Phase 66: The chart

**66.1** The map gains detail: shaded relief round the lakes, rivers between them, a road with a bridge, the shop and the cabin by the Fogbound pier as small buildings, labelled depth soundings, a legend and a scale bar, a paper border with tick marks.
**66.2** Navigation by direction: the arrows move to the nearest stop that way (not through a list), the boat mark slides along the route to the chosen stop, and the card shows how far it is.
*Done when:* `dbg.mapNav()` checks that every stop is reachable from every other by arrows and that each arrow press picks a stop in its direction.

## Phase 67: The pier at the edge

**67.1** Fogbound's pier stands at its west end (x 96), where the shore with the shop and the cabin is; the boat starts beside it. The spot under it moves with it.
**67.2** Docking: steer the boat to the pier and stop beside it (the line in): a small panel opens — **Bait Shop**, **The Cabin**, **Stay on the water** — and choosing one walks him up the pier to it (the same fade as the map). Leaving the shop or the cabin returns to the boat at the pier. A sign on the pier names them.
*Done when:* `dbg.dock()` reports whether the boat is at the pier; going to the shop and back by the pier works with no page errors; `--replay` and `--pacing` re-recorded if the spot's move changes them.
