# SoftStatic: The Ice and the Pond, Phases 80–85 (built)

Adds phases after the approved spec; decisions are in PLAN.md §8.3. `--homes` reads §3 below: keep its table form and headings.

**The user's rules:** the pond is **behind our cabin** (a back door; nothing bought on the chart). Stocking: catch every size class a species comes in, then stock it from the journal, free, up to a capacity; a pond fish caught and released stays. The ice fish are **separate entries** ("(Ice)", 69 species in all). The ice plays as **drill and jig**: no boat, a snowmobile bought at the shop, a hole drilled where you stop, jigging straight down. The ice opens after a sea has been visited. (Phase 128 later made the cabin as the user drew it: no repairs, a green door to the Back Pond.)

## 2. Decisions

### 2.1 What we take, and what we leave
- **In:** the ice water opening free after a sea visit; a snowmobile to cross the ice, with a free ice rod; a heavy ice rod once every ice fish is found; drilling a hole and fishing it until you leave; the ten "(Ice)" species; the pond's trash fished out with a cleanup meter; the stream blockage paid in coins; stocking species caught in every size class, up to a capacity; catch and release in the pond; a fish viewer; frozen waterfalls, hares and snow foxes.
- **Out:** stamina (drilling takes time instead); co-op; extra cabin rooms; achievements as such (each becomes a `dbg` counter and, where it reads well, a quiet journal line).
- **No liminal layer** on the ice or the pond. As with the six new waters, the fog, owl, anomalies and unease stay with Fogbound, Blackwater and The Pines.

### 2.2 The ice water: Tamarack Lake (`tamarack`)
A frozen lake in the boreal north: spruce and tamarack on low shores, a frozen waterfall over a granite step, a pressure ridge across the ice, other people's fishing shanties far off, snow on everything. It is always frozen: it is a winter water, not a season.

| Reach | What it is | Depth | Its fish |
|---|---|---|---|
| **The Flats** | shallow weedy flats near the landing | 1–5 m | Yellow Perch (Ice), Northern Pike (Ice), Largemouth Bass (Ice) |
| **Pressure Ridge** | a rocky hump under the ice ridge, a drop on each side | 4–12 m | Walleye (Ice), Smallmouth Bass (Ice), Muskie (Ice), Tiger Muskie (Ice) |
| **The Deep Hole** | the lake's basin under the frozen falls | 12–28 m | Lake Trout (Ice), Arctic Char (Ice), Channel Catfish (Ice) |

Depths and hours for each species follow real winter habits (perch and pike by day in the weed, walleye at dusk and dawn, lake trout and char deep by day, catfish on the bottom at night). They go in §3 of this file at Phase 80, in the same table form as PLAN_WATERS.md §3, so `--homes` can check them.

- **Opens:** free on the chart once either sea has been visited (`save.flags.seaSeen`). Getting onto the ice needs the snowmobile.
- **The snowmobile** ("Snow Machine") is sold at Rusty's, priced by `--pacing`. Buying it gives the **Ice Rod** (free, light: S–L sizes, holds 5 kg, short). The **Hardwater Rod** is sold once all ten ice species are in the journal (XL–XXL, holds 16 kg). Both rods only work on the ice, and the other rods do not work there.
- **Arriving without the snowmobile:** the chart's card says "You'll need something to cross the ice." and does not travel (as a locked water's card does).
- **The ten (Ice) species:** each is a new entry in `data/fish.js` (`ice_yellow_perch`, …), its own species with its own journal page, swimmer and portrait. Its look is the summer fish's spec with a winter palette (paler, colder colours, the deep ones darker) in `data/fishlooks.js`, which passes `--validate`'s look checks.
  - **How often it turns up:** Common ×1, rare ×0.45, epic ×0.2 of the reach's spawn weight. Our game otherwise has no rarity (8.3, Phase 68). This is the one place it appears, and only as how often a species turns up.
  - **Price:** by Phase 68's weight rule, ×1.25 for the cold. Then tuned by `--pacing` so the ice is not a shortcut.
  - **The legend:** the Tiger Muskie (Ice) at trophy weight gets a journal line ("The ice monster"), the one named trophy.
- **What works through a hole:** only what fishes straight down. That is the jigging spoons (small, heavy, huge), jigheads, blade baits, dropshots, the wacky rig, the bobbers (as a tip-up float on the hole), and live baits. Cranks, spinnerbaits, topwaters, glides and swimbaits need a cast and a retrieve, so the setup panel greys them out on the ice ("Needs open water"). Each (Ice) species takes the lure types its summer self takes, kept to these.

### 2.3 On the ice (how it plays)
- **Crossing:** the snowmobile replaces the boat on the ice. He sits astride it, with the dog in a box sled behind. It uses the boat's steering and speed curve, faster, with snow spray and its own engine sound. It is the same scene with a different vehicle, so the camera, map, HUD and dock rules all still work. The landing (where the shop's pier would be) is the ice water's dock: THE PIER panel opens there as at every water.
- **Drilling:** stopped, the action key drills (a hand auger, about 2 s: the bit turning, ice chips, then slush welling up). That opens a hole at his x. Then he gets off and sits on a bucket by it. A short wait, never a failure.
- **Jigging:** the cast becomes a drop. The lure goes straight down the hole (the line's angle is vertical). It sinks to the depth he stops it at or to the bed, and is worked with the action key (lifts and drops). Lure work (78b.5) scores ice jigging on its own style, `jig`: short lifts and pauses. The float rig sits in the hole as a tip-up flag that pops up on a bite.
- **The fish under the ice:** the cross-section shows the ice's underside (a pale ceiling 1.5 m thick with the light coming down only through the holes) instead of the surface. Fish spawn, come and bite by the same fish AI, as in any water. The current is none and the drift is nil.
- **Fighting through a hole:** the fight is the same sim, but the line pivots at the hole, so a fish can run sideways under the ice but is always led back to the hole. Landing lifts it out of the hole onto the ice beside the bucket. Nothing new can break: the same line, rod and drag rules apply.
- **The hole:** it stays open while he fishes it. Ride off and it skins over in 3 game minutes (drawn as a frosted ring that fades). Each hole counts its catches (released ones count); `dbg.ice()` reports it. At most 6 holes are open at once.
- **Weather on the ice:** snow falls instead of rain (flakes drifting in the wind). A storm is a blizzard: horizontal snow, the far shore lost in white, wind and no thunder. The day and night cycle and the grey hours are as everywhere. The shanties' windows are lit at night. Nothing gets brighter than `dusk_high` (§0.9): the snow is pale but under the ceiling.

### 2.4 The pond behind the cabin
- **The way there:** the cabin gets a back door in its east wall (the cabin room's map gains a door tile). It opens onto **the Back Pond** (`pond`), a small water, about a quarter of Fogbound's width and 6 m deep. It has a short dock under the cabin's back windows, reeds, lilies, a stream coming in over a rock lip at its west end, and a meadow and woods beyond. The boat is moored at the dock, so you can fish from the boat or stay at the dock. The map's Cabin stop is unchanged; the pond is reached only through the cabin.
- **At first** it is choked: the stream is blocked by a jam of branches and an old tyre (no inflow, the water brown and still, no ripples where the stream should be), and the water holds **trash** to fish out. There are 7 kinds: a bottle and a tin can, a boot, a tyre and a sunk crate, and a bicycle and a shopping cart. That is 21 pieces in all (5 of each small kind, 2 of each medium kind, 1 of each large kind).
  - Trash is hooked like a fish with any hook. It lies on the bed and bites the moment the lure touches it. The large pieces are heavy to reel (a slow, steady fight, no runs), and a large piece needs a rod that holds 7 kg. Each lands on a small card ("An old boot. Into the bin with it.") and is binned: no coins.
  - **The cleanup meter:** a quiet bar on the HUD at the pond, 21 pieces plus the stream. **Clearing the stream** is a coin payment made at the stream's lip with the action key. The jam is dragged out, the stream runs, and the water clears over a game hour.
  - When the meter is full the water is clear (the colour turns from murky to the clear teal of a spring-fed pond) and stocking opens.
- **Life at the pond:** frogs, dragonflies, lilies, a heron at dawn, ducks, and a moose that comes to drink at the far shore at dawn and dusk (a new creature, wading and eating weed, unbothered unless the boat comes within 40 px). It has its own fry and tadpoles. No crayfish until it is clean.
- **Weather and time** are as at Fogbound, without the liminal layer.

### 2.5 Stocking
- **Who can be stocked:** a freshwater species, not a sea or (Ice) species, for which the journal holds a catch in every size class the species comes in. A size class counts once caught, whether sold, kept or released. The journal tracks the size classes caught per species (`journal[id].sizes`). The save from before Phase 85 has no record of them, so a size counts from Phase 85 on. A note on the journal page says so.
- **How:** at the pond, the journal (J) shows a STOCK row on a stockable species' page. Space stocks one fish of that species, free, in a size class you have caught (the row steps through them). It swims out from the dock with a ring. Fish swim and bite by the same fish AI (each pond fish is a real swimmer with its stocked size and weight).
- **Capacity:** **12 fish** (12 fills a 6 m pond without crowding the eight fish slots). The HUD's line at the pond says "Pond 7 / 12". A full pond's STOCK row says "The pond is full."
- **Catching them:** what bites at the pond is one of the stocked fish, its own weight and length, so you catch your own fish. The card offers **Release** (it goes back, and the pond keeps it) or **Keep** (for the cabin's wall, as now; the pond loses it). There is **no Sell at the pond.** Stocking is free, so selling pond fish would make coins from nothing, which the economy (V8, Phase 52's "no income without fishing") does not allow. A released pond fish is shy for a while (it does not bite again for 10 game minutes).
- **The fish viewer:** the cabin's CRT gets a second channel. Space on the TV steps through its channels, including "Pond Cam", a slow view of the pond's fish swimming among the weed (a screensaver). `dbg.pond()` counts how long it has been watched.
- **Trophies:** the cabin's plaques stay as they are (kept fish, heaviest first). A trophy-weight fish kept gets a small brass "Trophy" tag on its plaque.

### 2.6 Saves
Save **v11** at Phase 80 (the snowmobile, the ice rods, `flags.seaSeen` worked out from `unlocks.sound || unlocks.wreck`, the holes not saved). It goes to **v12** at Phase 84 (the pond's trash and meter, the stream, its stocked fish as {species, size class, weight, length}) and gains `journal[id].sizes` at Phase 85. Every older milestone still loads (`--saves`).

## 3. Where each ice fish lives

Filled in at Phase 80 (depths in metres, the hours dawn, day, dusk and night as in PLAN_WATERS.md §3), for `--homes` to check. Every depth starts under the ice's 1.5 m. How often each turns up (2.2): common ×1, rare ×0.45, epic ×0.2.

### Tamarack Lake (28 m, frozen)
| Reach | Species | Depth | When |
|---|---|---|---|
| The Flats | Yellow Perch (Ice) | 1.5–5 m | day |
| | Northern Pike (Ice) | 1.5–5 m | day |
| | Largemouth Bass (Ice) | 2–5 m, bed | day |
| Pressure Ridge | Walleye (Ice) | 4–12 m | dawn, dusk |
| | Smallmouth Bass (Ice) | 6–12 m, bed | day |
| | Muskie (Ice) | 4–12 m | any |
| | Tiger Muskie (Ice) | 4–10 m | day |
| The Deep Hole | Lake Trout (Ice) | 12–28 m | dawn, day |
| | Arctic Char (Ice) | 14–28 m | day |
| | Channel Catfish (Ice) | 18–28 m, bed | night |

Rarity: Smallmouth Bass and Channel Catfish (Ice) common; Walleye, Northern Pike, Largemouth Bass, Lake Trout and Arctic Char (Ice) rare; Muskie, Tiger Muskie and Yellow Perch (Ice) epic.

---

## 4. Phases
- **80** The ice on the chart: `data/loc_tamarack.js`, the ten (Ice) species and winter looks, the snowmobile and ice rods, vertical-only hooks; save v11.
- **81** On the ice: the snowmobile and sled, drilling, the drop and jigging, the tip-up flag, the view under the ice, fights led back to the hole, holes skinning over. `dbg.ice()`.
- **82** Winter: Tamarack's scenery, snowfall and blizzards, winter life.
- **83** The Back Pond behind the cabin, the moose and pond life.
- **84** Cleaning the pond: 21 pieces of trash, the cleanup meter, the stream; save v12. `dbg.pond()`.
- **85** Stocking: size classes per species, the STOCK row, capacity 12, Release/Keep (no Sell), Pond Cam, trophy tags.

## 5. Risks
- Vertical fishing shares one code path with open water (an "ice" mode, not a copy).
- The ice must not become the fastest income; `--pacing` and `--tackle` decide, and the model keeps it off the V8 route.
- **No Sell at the pond:** stocking is free, so selling pond fish would make coins from nothing. The trash pays nothing.
- Snowfall and blizzards are many particles: measured on a throttled phone frame.
- Size classes before Phase 85 were never recorded, so old saves count them from then on (the journal says why).
