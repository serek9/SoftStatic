# SoftStatic: The Bait Shop as a Room, Phases 36–40

**Date:** 2026-10-30. **Repo state:** Phases 1–35 done (PLAN.md §8.1).
**Status:** Asked for by the user on 2026-10-30: "make a plan to improve the bait shop changing the whole look and keeping the same vibe/look like when fishing in the lake, it could look smaller the area like when you enter a building in retro pokemon.. plan it and do all the phases. when finish a phase update handoff and commit". All five phases are to be built in turn. Phase 36 is done (PLAN.md 8.3 #188–192).
**Read with:** PLAN.md §0 (conventions, required) and §8 (status). Like PLAN_ROD.md, this file adds phases after the approved spec and does not edit §0–§7 or Appendix V.

---

## 1. What exists today (verified in the code)

| Part | What the code does now | Where |
|---|---|---|
| Look | A single painted picture at 640×360: the left 400 px are Rusty leaning on a counter in front of plank walls, pegboards and trophies (after a Cast n Chill reference shot); the right 240 px are a tabbed shop panel. Nothing moves but Rusty's blink and mouth, an ashtray's smoke and a lamp flicker. | `js/ui/shop.js` `paintRoom`, `draw` |
| Use | W/S pick a shelf tab, A/D an item, Space buys or puts a bait on the hook, Esc or M leaves. | `shop.update`, `act` |
| Talk | One line per visit (`pickLine`, data/dialogue.js) revealed in a speech card. | `pickLine`, `spoken` |
| Time | The clock runs and unease drains while inside. | `shop.update` |
| Mood | It does not share the lake's look: no windows, no hour, no fog, a menu more than a place. | |

## 2. What the user asked for

- **A different look**, but **the same vibe as fishing on the lake**: the lake's palette, its dusk and night light, its fog, its quiet, the same pixel-art rules (8.3 #84) and the 640×360 view.
- **A smaller place you walk into**, like a building in a retro Pokémon game: a little room seen from above at a three-quarter angle, floating in black, the fisher walking it tile by tile, people and shelves you face and talk to with one key, and a text box along the bottom.

## 3. The design

- **The room.** A 12 × 8 grid of 32 px tiles (384 × 256 px) in the middle of the screen, black around it, as a Pokémon interior is. Plank floor, log walls seen from above with their faces to the south, a door at the bottom with a mat. Painted natively in the lake's keys (`wood_*`, `stone_*`, `fog_*`, `night_*`, `dusk_*`, `lamp_glow`) under the pixel-art rules: 3–6 flat keys per material, no dithering, light that steps.
- **Windows onto the lake.** The north wall has two windows that show the water at the present hour: the sky from `sailing.skyColor`, the far shore, fog and drizzle when the lake has them. Inside, the light follows the hour too: a lamp's stepped pools at night, a flat grey in the grey hours.
- **The fisher walks it.** A top-down fisher (the red cap, the green jacket) in four directions with a two-frame walk; tile-to-tile steps (a tap turns, holding walks), blocked by walls, shelves and the counter. **The dog follows one tile behind**, as a Pokémon follower does, and sits when you stop.
- **Rusty behind the counter.** Top-down, his own small idle (a cup, a turned page, a blink). Facing him and pressing Space opens **a text box along the bottom**, the line typed out, then a small choice: *Buy*, *Talk*, *Leave*.
- **Shelves you face.** A rod rack, a reel and line case, an equipment shelf (lantern, depth finder), a worm box, a cricket crate, a minnow tank and the unlabelled jar on a low shelf. Facing one and pressing Space opens an item window over the box: what it is, what it does, what it costs; Space buys (or puts a bait on the hook), the same `economy` calls as now.
- **The quiet and the strange.** Dust in the lamp light, a fridge's hum, the boards' creak, rain on the glass; a wall clock with the game's hour. With unease, small wrong things, always quiet and optional (§0.14): the clock's hands running back for a moment, Rusty facing the wall when you come in, a figure in the window that is not on the dock.
- **Leaving.** Walk onto the mat and down, or Esc (or M) anywhere, as now.

Nothing in the simulation changes: buying, bait, the shopkeeper's lines (`pickLine`) and the save stay as they are, so `--replay`, `--pacing`, `--passive`, `--fight`, `--saves` and `--rod` must not move.

## 4. Order

```
36 The room and the walk ──> 37 Rusty and the text box ──> 38 Shelves you face
                                                       └──> 39 Light, life and the strange ──> 40 Fitting it in
```

---

## Phase 36: The room and the walk

| ID | Task | Files | Done when |
|---|---|---|---|
| 36.1 | **The tiles.** A tileset painted natively in the lake's keys: plank floor (three plank variants, seams), log wall tops and faces, corners, the door and its mat, a rug, two windows, the counter, shelf bases. Baked once per visit. | js/ui/shop_room.js (new) | Every tile is painted from palette keys only, with at most 6 keys per material; the room bakes in under 60 ms. |
| 36.2 | **The room.** The layout as data: a 12 × 8 map of tile codes and a list of objects (counter, shelves, tank, jar, clock, lamp) each with its tiles and whether it blocks. Drawn in the middle of the screen with black around it. | js/ui/shop_room.js | The room is centred at 640×360; `dbg.shop()` lists the blocking tiles; the door tile is in the bottom wall. |
| 36.3 | **The fisher on foot.** A top-down fisher: four directions, a standing frame and two walking frames each, painted natively. Tile steps of 0.2 s; a tap faces, a hold walks; walls and objects block. He comes in at the door facing up. | js/ui/shop_room.js, js/ui/shop.js | A walk across the room in `dbg` takes `0.2 s × tiles`; he never stands on a blocking tile; turning takes no step. |
| 36.4 | **The dog follows.** The dog top-down, a tile behind him, taking the tile he left; it sits when he stops. | js/ui/shop_room.js | The dog is always on the tile he last left (or beside him at the door), never on a blocking tile or his. |
| 36.5 | **The bridge.** Until Phase 37, facing the counter and pressing Space opens the old shop panel over the room (a `TODO(P37.2)`), so buying keeps working; Esc, M or the door mat leave. | js/ui/shop.js | A rod can be bought; walking onto the mat and down returns to the lake. |

## Phase 37: Rusty and the text box

| ID | Task | Files | Done when |
|---|---|---|---|
| 37.1 | **Rusty top-down** behind the counter, painted natively, with an idle (a blink, a sip from his cup, a page turned) on fixed rhythms; he turns to face you when you face him. | js/ui/shop_room.js | His frames change only on their rhythms or when spoken to. |
| 37.2 | **The text box.** Along the bottom of the screen: the line typed out (`pickLine`'s line of the visit, reversed or repeated as now), Space to finish it or go on, a small arrow when there is more; then *Buy / Talk / Leave*. *Talk* says the visit's line again; *Buy* opens the item window (37.3) for every shelf. The old panel goes. | js/ui/shop.js | The visit's line is shown in full by Space; the choice works with W/S and Space; Esc closes the box. |
| 37.3 | **The item window.** Over the box: the shelf's items as a list with their icons, the chosen one's name, effect and price, and the coins; Space buys or puts a bait on the hook; the messages as now. | js/ui/shop.js | Every purchase the old panel made can be made here; `dbg.shop()` reports the open window. |

## Phase 38: Shelves you face

| ID | Task | Files | Done when |
|---|---|---|---|
| 38.1 | **The shelves as objects.** The rod rack (rods, reels, lines), the equipment shelf (lantern, depth finder), the worm box, the cricket crate, the minnow tank and the low shelf with the unlabelled jar, each painted top-down. Facing one and pressing Space opens the item window for its items. | js/ui/shop_room.js, js/ui/shop.js | Each shelf opens its own items; Rusty's *Buy* still opens them all. |
| 38.2 | **They show what is left.** Rods on the rack go as you buy the better ones; the lantern and the finder leave the shelf when bought; the tank's minnows and the crate's crickets are drawn by how many are in stock. | js/ui/shop_room.js | After `dbg.buy('rod')` the rack shows one rod fewer; buying the lantern empties its place. |

## Phase 39: Light, life and the strange

| ID | Task | Files | Done when |
|---|---|---|---|
| 39.1 | **The hour in the windows** (the lake's sky, far shore and fog, drizzle with unease) **and in the room** (the lamp's stepped pools at night, flat grey by day). | js/ui/shop_room.js | The windows at 03:00, 07:00, 12:00 and 19:00 match the lake's sky keys; nothing brighter than `dusk_high`. |
| 39.2 | **Life:** dust in the lamp light, the tank's bubbles, the clock's hands at the game hour, Rusty's cup steaming. | js/ui/shop_room.js | The clock shows the game hour to the quarter. |
| 39.3 | **The strange**, with unease, quiet and optional: the clock running back for a breath, Rusty facing the wall as you come in, a figure in the window that is not on the dock. At most one at a time, never sudden. | js/ui/shop_room.js | None appear at unease 0; at unease 1 each appears in a 10-minute headless run, one at a time. |
| 39.4 | **Sounds:** footsteps on the boards, the door's bell, the fridge's hum, rain on the glass, the creaking third board by the door; synthesised (§0.2). | js/audio/engine.js | The cues are in the kit and play in the room only. |

## Phase 40: Fitting it in

| ID | Task | Files | Done when |
|---|---|---|---|
| 40.1 | **Touch:** the menu zones walk and face (left, right, up, down) and the centre talks, as they do now. | js/ui/shop.js | A walk to the counter and a purchase by touch in a headless check. |
| 40.2 | **Debug and the gallery:** `dbg.shop()` (position, facing, the dog, the open box or window, the object faced), `dbg.shopWalk(path)`; a gallery page with the tiles and the sprites. | js/core/debug.js | As described. |
| 40.3 | **Cleanup and cost:** the old painted room and panel code removed; the room and its sprites baked once; the frame under 2 ms. | js/ui/shop.js | No unused painters remain; frame time measured. |

---

## 5. Risks

| Risk | Mitigation |
|---|---|
| A top-down room loses the lake's mood. | The same keys and light: the windows show the lake at that hour; night light is lamp pools on dark planks; fog and drizzle outside; the quiet sounds. |
| Walking makes buying slower. | The counter is three steps from the door; Rusty's *Buy* opens every shelf. |
| Touch players cannot walk. | The menu zones already give up, down, left, right and action in the shop (input.js); they walk. |
| The strange becomes a jumpscare. | Quiet, short, optional; never moves toward the player; never blocks input (§0.14). |

## 6. After each phase

Run the §0.13 checks, update PLAN.md §8 and HANDOFF.md, commit `Phase N: <name> (tasks N.1-N.k)` and push to the branch.
