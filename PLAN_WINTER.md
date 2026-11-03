# SoftStatic: The Ice and the Pond, Phases 80–85

**Date:** 2026-11-03. **Repo state:** Phases 1–79 and 79b done (PLAN.md §8.1).
**Status:** Asked for by the user on 2026-11-03. Each phase starts only when the user says so.

> An ice-fishing water for the ten "(Ice)" species, and the cabin valley's pond … PLAN IT. In the cabin pond you can have the species in the pond you kept, just like in cast n chill. make a research in the whole wiki https://castnchill.unpack.wiki/ and take decisions based in how the dynamics of cast n chill work.

The user's answers to the questions asked before planning (2026-11-03):
1. **Where the pond is:** **behind our cabin.** The cabin at Fogbound's pier gets a back door onto a pond of its own. Nothing new is bought on the chart. As in Cast n Chill, cleaning the pond and unblocking its stream cost work and coins.
2. **Stocking:** **as Cast n Chill.** Catch every size class (S–XXL) a species comes in, then stock it from the journal, free, up to a capacity. A fish caught from the pond and released stays in the pond.
3. **The ice fish:** **separate entries.** Ten new journal entries, "(Ice)" like the reference, each with its own winter look, how often it turns up, and its price. That makes 69 species.
4. **How the ice plays:** **drill and jig.** No boat on the ice. You cross it on a snowmobile bought at the shop, drill a hole where you stop, and jig straight down through it with no cast. A hole stays open while you fish it. The water opens after you have been to a sea, as in Cast n Chill, and the snowmobile comes with an ice rod.

**Read with:** PLAN.md §0 (conventions, required) and §8 (status). Like the other plan files, this one adds phases after the approved spec and does not edit §0–§7 or Appendix V.

---

## 1. What the reference says, as read on 2026-11-03

The wiki gives names, costs and lists, and almost nothing about how play works. The pages read were: mechanics, areas (ice1, cabin1), locations (ice1-spot1, cabin1), fish (the ice variants), rods (rod09, rod10), boats, lures, time, achievements, patches v1.2.0 and v1.3.0, and dlc. Anything below that the wiki does not say is our decision, and is marked **(ours)**.

**Lake Hunkerdown (the ice area), patch v1.2.0 "Lake Hunkerdown Winter Update":**
- Area `ice1`, free. It unlocks once you have visited Craggy Reef or Seals Rest (a sea spot). It has one location, Frostbite Flats (type Ice, starting hour 06:00), described as "thick ice, frozen waterfalls, hares and snow foxes".
- **Snow Wolf XT1**, a snowmobile, 2000 coins, "a fast vehicle for crossing the ice". Buying it unlocks **The Frost Stick** (free): "Versatile rod to break the first ice and beyond". It is fluorocarbon, sizes S–L, holds 5.4 kg (to 10 kg upgraded), casts at speed 100–170.
- **Hardwater Howler**, 1000 coins: "Where the deep cold bites back, this rod holds firm". It unlocks once you have discovered every fish at Frostbite Flats. It is braid, sizes XL–XXL, holds 14.5 kg (to 23.6 kg).
- Stamina: breaking ice costs 50 of 100 (recovery 5/s). Walking drains 4/s, rowing 10/s.
- Achievements: **Ice Breaker** (drill a hole in the ice), **Hole Dozen** (catch 12 fish from the same hole; released fish count), **Legendary Ice Monster** (the trophy-weight Tiger Muskie (Ice)).
- The ten fish and their rarities: Smallmouth Bass (Ice) and Channel Catfish (Ice) common; Walleye, Northern Pike, Largemouth Bass, Lake Trout and Arctic Char (Ice) rare; Muskie, Tiger Muskie and Yellow Perch (Ice) epic. Yellow Perch (Ice), for example: speed 1, stamina 2, vision 3, hearing 2, prefers the wacky rig, sizes S and M, trophy from 1.4 kg.
- No lure is ice-only. The fish keep the ordinary lure list.

**Old Moose Valley and Cabin, patch v1.3.0:**
- The valley costs 4000. Restoring it costs: cabin 7500, the waterfall blockage 750, cloakroom 500, kitchen 1500, dining room 1500, fireplace 2500, fish finder 3000, trophy wall 2500. The total is 23,750.
- **The pond:** "run-down… a trash-filled pond". There are 7 kinds of trash (3 small, 2 medium, 2 large), fished out from the end of the dock or from the boat. A cleanup meter tracks it. The waterfall blockage on the pond's left side must also be cleared. Only then can the pond be stocked.
- **Stocking:** "Catch all sizes of a freshwater species to stock the pond". You restock from the logbook on the boat. Released fish can be caught again. The capacity is not given ("Packed like Sardines: stock the pond to the max").
- **Fish Viewer:** the fish finder room doubles as a screensaver of the stocked fish ("Fishwatch": leave it on for 30 minutes). The **Trophy Wall** holds replica mounts of trophy catches. **Dock fishing:** fish from your own dock any time.
- Achievements: Muckbuster (all the rubbish out), Nailed it (the cabin restored), Fishwatch, Packed like Sardines, What Goes Around (catch your own stocked fish).

**General mechanics that apply:** fish behaviour comes from speed, stamina, vision and hearing. Each species has a trophy weight. Rarity scales value (common ×5, uncommon ×8, rare ×10, epic ×15) and how often a fish turns up. Each lure has bonus species. Fish respawn after 600 s.

---

## 2. Decisions

### 2.1 What we take, and what we leave
- **Taken:** the ice water opening free after a sea visit; the snowmobile as the way onto the ice, with the free ice rod it brings; the heavy ice rod unlocking once every ice fish is found; drilling a hole and fishing it until you leave; the ten "(Ice)" species with the reference's rarities; the pond's trash (7 kinds by size) fished out with the cleanup meter; the stream blockage paid for in coins; stocking species you have caught in every size, from the journal, up to a capacity; catch and release in the pond; the fish viewer; frozen waterfalls, hares and snow foxes.
- **Left:** stamina (we have none; drilling takes time instead); co-op; the cabin's six rooms (our cabin already has its own five restoration stages and its trophy plaques, Phase 56/64, and they stay); the reference's names (Lake Hunkerdown, Frostbite Flats, Snow Wolf XT1, Frost Stick, Hardwater Howler); its achievements as such (we have none: each becomes a `dbg` counter and, where it reads well, a quiet journal line). **(ours)**
- **No liminal layer** on the ice or the pond. As with the six new waters, the fog, owl, anomalies and unease stay with Fogbound, Blackwater and The Pines. **(ours)**

### 2.2 The ice water: Tamarack Lake (`tamarack`)
A frozen lake in the boreal north: spruce and tamarack on low shores, a frozen waterfall over a granite step, a pressure ridge across the ice, other people's fishing shanties far off, snow on everything. It is always frozen: it is a winter water, not a season. **(ours: name and look)**

| Reach | What it is | Depth | Its fish |
|---|---|---|---|
| **The Flats** | shallow weedy flats near the landing | 1–5 m | Yellow Perch (Ice), Northern Pike (Ice), Largemouth Bass (Ice) |
| **Pressure Ridge** | a rocky hump under the ice ridge, a drop on each side | 4–12 m | Walleye (Ice), Smallmouth Bass (Ice), Muskie (Ice), Tiger Muskie (Ice) |
| **The Deep Hole** | the lake's basin under the frozen falls | 12–28 m | Lake Trout (Ice), Arctic Char (Ice), Channel Catfish (Ice) |

Depths and hours for each species follow real winter habits (perch and pike by day in the weed, walleye at dusk and dawn, lake trout and char deep by day, catfish on the bottom at night). They go in §3 of this file at Phase 80, in the same table form as PLAN_WATERS.md §3, so `--homes` can check them.

- **Opens:** free on the chart once either sea has been visited (`save.flags.seaSeen`). Like the reference, it costs nothing to open. Getting onto the ice needs the snowmobile.
- **The snowmobile** ("Snow Machine", **(ours)** name) is sold at Rusty's, priced by `--pacing` (start at 2000, as the reference). Buying it gives the **Ice Rod** (free, light: S–L sizes, holds 5 kg, short). The **Hardwater Rod** (start at 1000) is sold once all ten ice species are in the journal (XL–XXL, holds 16 kg). Both rods only work on the ice, and the other rods do not work there. **(ours: names; the unlocks are the reference's)**
- **Arriving without the snowmobile:** the chart's card says "You'll need something to cross the ice." and does not travel (as a locked water's card does).
- **The ten (Ice) species:** each is a new entry in `data/fish.js` (`ice_yellow_perch`, …), its own species with its own journal page, swimmer and portrait. Its look is the summer fish's spec with a winter palette (paler, colder colours, the deep ones darker) in `data/fishlooks.js`, which passes `--validate`'s look checks.
  - **How often it turns up:** the reference's rarity. Common ×1, rare ×0.45, epic ×0.2 of the reach's spawn weight. Our game otherwise has no rarity (8.3, Phase 68). This is the one place it appears, and only as how often a species turns up.
  - **Price:** by Phase 68's weight rule, ×1.25 for the cold (the reference values its ice fish a little above the others). Then tuned by `--pacing` so the ice is not a shortcut.
  - **The legend:** the Tiger Muskie (Ice) at trophy weight gets a journal line ("The ice monster"), the one named trophy. **(ours)**
- **What works through a hole:** only what fishes straight down. That is the jigging spoons (small, heavy, huge), jigheads, blade baits, dropshots, the wacky rig, the bobbers (as a tip-up float on the hole), and live baits. Cranks, spinnerbaits, topwaters, glides and swimbaits need a cast and a retrieve, so the setup panel greys them out on the ice ("Needs open water"). Each (Ice) species takes the lure types its summer self takes, kept to these. **(ours: the reference keeps all lures)**

### 2.3 On the ice (how it plays)
- **Crossing:** the snowmobile replaces the boat on the ice. He sits astride it, with the dog in a box sled behind. It uses the boat's steering and speed curve, faster (the reference's "fast vehicle"), with snow spray and its own engine sound. It is the same scene with a different vehicle, so the camera, map, HUD and dock rules all still work. The landing (where the shop's pier would be) is the ice water's dock: THE PIER panel opens there as at every water.
- **Drilling:** stopped, the action key drills (a hand auger, about 2 s: the bit turning, ice chips, then slush welling up). That opens a hole at his x. Then he gets off and sits on a bucket by it. This replaces the reference's 50 stamina: a short wait, never a failure. **(ours)**
- **Jigging:** the cast becomes a drop. The lure goes straight down the hole (the line's angle is vertical). It sinks to the depth he stops it at or to the bed, and is worked with the action key (lifts and drops). Lure work (78b.5) scores ice jigging on its own style, `jig`: short lifts and pauses. The float rig sits in the hole as a tip-up flag that pops up on a bite.
- **The fish under the ice:** the cross-section shows the ice's underside (a pale ceiling 1.5 m thick with the light coming down only through the holes) instead of the surface. Fish spawn, come and bite by the same fish AI, as in any water. The current is none and the drift is nil.
- **Fighting through a hole:** the fight is the same sim, but the line pivots at the hole, so a fish can run sideways under the ice but is always led back to the hole. Landing lifts it out of the hole onto the ice beside the bucket. Nothing new can break: the same line, rod and drag rules apply. **(ours)**
- **The hole:** it stays open while he fishes it. Ride off and it skins over in 3 game minutes (drawn as a frosted ring that fades). Each hole counts its catches (released ones count, as in Hole Dozen); `dbg.ice()` reports it. At most 6 holes are open at once.
- **Weather on the ice:** snow falls instead of rain (flakes drifting in the wind). A storm is a blizzard: horizontal snow, the far shore lost in white, wind and no thunder. The day and night cycle and the grey hours are as everywhere. The shanties' windows are lit at night. Nothing gets brighter than `dusk_high` (§0.9): the snow is pale but under the ceiling.

### 2.4 The pond behind the cabin
- **The way there:** the cabin gets a back door in its east wall (the cabin room's map gains a door tile). It opens onto **the Back Pond** (`pond`), a small water, about a quarter of Fogbound's width and 6 m deep. It has a short dock under the cabin's back windows, reeds, lilies, a stream coming in over a rock lip at its west end, and a meadow and woods beyond. The boat is moored at the dock, so you can fish from the boat or stay at the dock. The map's Cabin stop is unchanged; the pond is reached only through the cabin. **(ours: shape and name)**
- **At first** it is choked: the stream is blocked by a jam of branches and an old tyre (no inflow, the water brown and still, no ripples where the stream should be), and the water holds **trash** to fish out. There are 7 kinds, after the reference's 3 small, 2 medium and 2 large: a bottle and a tin can, a boot, a tyre and a sunk crate, and a bicycle and a shopping cart. That is 21 pieces in all (5 of each small kind, 2 of each medium kind, 1 of each large kind). **(ours: the kinds and counts)**
  - Trash is hooked like a fish with any hook. It lies on the bed and bites the moment the lure touches it. The large pieces are heavy to reel (a slow, steady fight, no runs), and a large piece needs a rod that holds 7 kg. Each lands on a small card ("An old boot. Into the bin with it.") and is binned: no coins.
  - **The cleanup meter:** a quiet bar on the HUD at the pond, 21 pieces plus the stream. **Clearing the stream** is a coin payment (start at 750, as the reference) made at the stream's lip with the action key. The jam is dragged out, the stream runs, and the water clears over a game hour.
  - When the meter is full the water is clear (the colour turns from murky to the clear teal of a spring-fed pond) and stocking opens.
- **Life at the pond:** frogs, dragonflies, lilies, a heron at dawn, ducks, and a moose that comes to drink at the far shore at dawn and dusk (the reference's Old Moose Valley; a new creature, wading and eating weed, unbothered unless the boat comes within 40 px). It has its own fry and tadpoles. No crayfish until it is clean.
- **Weather and time** are as at Fogbound, without the liminal layer.

### 2.5 Stocking
- **Who can be stocked:** a freshwater species, not a sea or (Ice) species, for which the journal holds a catch in every size class the species comes in. A size class counts once caught, whether sold, kept or released. The journal tracks the size classes caught per species (`journal[id].sizes`). The save from before Phase 85 has no record of them, so a size counts from Phase 85 on. A note on the journal page says so.
- **How:** at the pond, the journal (J) shows a STOCK row on a stockable species' page. Space stocks one fish of that species, free, in a size class you have caught (the row steps through them). It swims out from the dock with a ring. "Use the logbook to restock" is the reference's way; ours is the journal, the same thing. Fish swim and bite by the same fish AI (each pond fish is a real swimmer with its stocked size and weight).
- **Capacity:** **12 fish** (the reference's number is unknown; 12 fills a 6 m pond without crowding the eight fish slots). The HUD's line at the pond says "Pond 7 / 12". A full pond's STOCK row says "The pond is full." **(ours)**
- **Catching them:** what bites at the pond is one of the stocked fish, its own weight and length, so you catch your own fish ("What Goes Around"). The card offers **Release** (it goes back, and the pond keeps it) or **Keep** (for the cabin's wall, as now; the pond loses it). There is **no Sell at the pond.** Stocking is free, so selling pond fish would make coins from nothing, which the economy (V8, Phase 52's "no income without fishing") does not allow. **(ours)** A released pond fish is shy for a while (it does not bite again for 10 game minutes).
- **The fish viewer:** the cabin's CRT gets a second channel. Space on the TV steps through the game, then "Pond Cam", a slow view of the pond's fish swimming among the weed (a screensaver, as the reference's fish finder). `dbg.pond()` counts how long it has been watched (Fishwatch: 30 minutes).
- **Trophies:** the cabin's plaques stay as they are (kept fish, heaviest first). A trophy-weight fish kept gets a small brass "Trophy" tag on its plaque. That is the reference's trophy wall folded into ours. **(ours)**

### 2.6 Saves
Save **v11** at Phase 80 (the snowmobile, the ice rods, `flags.seaSeen` worked out from `unlocks.sound || unlocks.wreck`, the holes not saved). It goes to **v12** at Phase 84 (the pond's trash and meter, the stream, its stocked fish as {species, size class, weight, length}) and gains `journal[id].sizes` at Phase 85. Every older milestone still loads (`--saves`).

---

## 3. Where each ice fish lives

Filled in at Phase 80 (depths in metres, the hours dawn, day, dusk and night as in PLAN_WATERS.md §3), for `--homes` to check.

---

## 4. Phases

### Phase 80: The ice on the chart
**80.1** `data/loc_tamarack.js`: reaches, depths, dock (the landing), no current, painted for now with the existing layer kinds in snow colours. The chart stop (east of the coast's north end) opens after a sea visit.
**80.2** The ten (Ice) species in `data/fish.js` with homes (§3), how often each turns up (2.2), prices; their winter looks in `data/fishlooks.js`.
**80.3** The snowmobile and the two ice rods in the shop (the Hardwater Rod's unlock); which hooks work on the ice (2.2). Save v11.
*Done when:* `--validate` (the new species, the new looks, homes on the ice, only vertical hooks taken there), `--homes` (§3), `--saves` (v11), `--pacing` PASS (the snowmobile in the model's plan after the seas), `--fight` PASS with the ice fish, `--replay` hash unchanged (or re-recorded if the roster's order moves it), the chart reaching the ice in headless Chromium with no page errors.

### Phase 81: On the ice
**81.1** The snowmobile on the ice (it replaces the boat there): steering, the sled and the dog, its sound.
**81.2** Drilling a hole; the lure dropped straight down; jigging (the `jig` work style); the tip-up flag.
**81.3** The cross-section under the ice; the fight led back to the hole; landing on the ice; the hole skinning over; each hole's count.
*Done when:* `dbg.ice()` reports the holes (open, catches, freezing); in headless Chromium a hole drilled, a perch caught and landed through it, 12 catches counted in one hole, a hole left to skin over; `--tackle` judges the ice with its own hooks; `--fight` PASS; no page errors.

### Phase 82: Winter
**82.1** Tamarack Lake's scenery: snow-covered shores, spruce and tamarack, the frozen waterfall, the pressure ridge, the shanties (lit at night), the landing.
**82.2** Snowfall and the blizzard in place of rain and the thunderstorm; snow spray; the ice's surface (wind-scoured, snow drifts, old holes).
**82.3** Winter life: snowshoe hares, a snow fox, ravens; under the ice, burbot-free (the ice roster is the ten).
*Done when:* as Phase 77, plus a blizzard screenshot; `dbg.shore()` and `dbg.life()` per reach; a phone's frame measured as in Phase 79.

### Phase 83: The pond behind the cabin
**83.1** The cabin's back door; the Back Pond water (`data/loc_pond.js`) with its dock, stream, reeds and lilies; the boat moored there; back through the door to the cabin.
**83.2** The moose and the pond's life.
*Done when:* walking out of the cabin's back door and back works in headless Chromium; the pond renders at dawn, noon, dusk and midnight (murky); `dbg.dock()` at the pond.

### Phase 84: Cleaning the pond
**84.1** The 21 pieces of trash on the bed, hooked and reeled as 2.4 says, their cards and the bin; the cleanup meter.
**84.2** The stream's jam, paid to clear; the stream running; the water clearing. Save v12.
*Done when:* `dbg.pond()` reports the trash left by kind, the meter and the stream; in headless Chromium all 21 fished out and the stream cleared, the water clear; `--saves` (v12).

### Phase 85: Stocking
**85.1** The size classes caught per species in the journal; the STOCK row; stocking up to 12.
**85.2** The pond's fish (swimmers from the stock), Release and Keep at the pond (no Sell), the shy time after a release; the trophy tag on the plaques.
**85.3** Pond Cam on the cabin's TV.
*Done when:* a species with every size caught stocks and one without cannot; the 13th says the pond is full; a stocked fish caught and released is still in the pond (`dbg.pond()`); the card at the pond has no Sell; Pond Cam shows the stock; `--pacing` and `--replay` unchanged (the pond earns nothing).

---

## 5. Risks
- **The ice's code path:** vertical fishing touches the cast, the rope, the dangle, the fight and the camera, which all assume a boat on open water. Phase 81 keeps them as one path with an "ice" mode, not a copy, and is the phase most likely to need a follow-up.
- **Pacing:** ten more priced species and a cheap water could become the fastest income. `--pacing` and `--tackle` decide. The ice is outside V8's four-location route, so the model needs a rule for it (it must not shorten the route to Russetwood).
- **The pond as a coin source:** closed by "no Sell at the pond". The trash pays nothing.
- **Phone frame:** snowfall and the blizzard are many particles. Phase 82 measures them.
- **Size classes for old saves:** a long-time player has to catch every size again from Phase 85 on. The journal note says why.
