# SoftStatic: The Bait Shop as a Room, Phases 36–40 (built)

Adds phases after the approved spec; decisions are in PLAN.md §8.3 #188–208. (Phases 115–128 later replaced the room's art with the user's own picture; the rules below still hold.)

## Design
- **Same vibe as the lake:** its palette, dusk and night light, fog, quiet; the pixel-art rules (8.3 #84); the 640×360 view.
- **A small room you walk into**, like a building interior in a retro top-down handheld RPG: a 12×8 grid of 32 px tiles floating in black, walked tile by tile; things you face and use with one key; a text box along the bottom.
- **Windows onto the lake** show the present hour's sky, shore, fog and drizzle; inside, lamp pools at night, flat grey by day. Nothing brighter than `dusk_high`.
- **The dog follows one tile behind** and sits when you stop.
- **Rusty** (an original shopkeeper) behind the counter; Space while facing him opens the typed text box, then *Buy / Talk / Leave*.
- **Shelves you face:** rod rack, equipment shelf, worm box, cricket crate, minnow tank, the unlabelled jar. Each opens an item window (name, effect, price, coins); they show what is left in stock.
- **The strange**, with unease only, quiet, one at a time, never toward the player: the clock running back, Rusty facing the wall, a figure in the window.
- **Leaving:** the door mat and down, or Esc/M.
- The simulation, economy and save do not change.

## Phases
- **36** The tileset, the room as data, the fisher on foot (0.2 s steps; a tap turns, a hold walks), the dog follower.
- **37** Rusty top-down with his idle; the text box; the item window (replaced the old panel).
- **38** Shelves as objects that open their own items and show stock.
- **39** The hour in windows and room; life (dust, bubbles, clock, steam); the strange; sounds (steps, bell, hum, rain, a creaking board).
- **40** Touch walks and talks; `dbg.shop()`, `dbg.shopWalk(path)`; old painters removed.
