# SoftStatic: New Waters, Phases 74–79

**Date:** 2026-11-02. **Repo state:** Phases 1–73 done (PLAN.md §8.1).
**Status:** Asked for by the user on 2026-11-02. **Phases 74–79 done** (PLAN.md 8.3 #397–450). Each phase starts only when the user says so.

> keeping the same style of locations we have made, create all the locations in this list (dont give the same names, create new ones, but the aspect should be real like the ones in the list) then associate each species to the location, depth and time of the day you can find them — https://castnchill.unpack.wiki/docs/locations/

The user's answers to the questions asked before planning:
1. **Structure:** each of the reference's areas becomes **one water** (new name, real look), and its 2–3 named spots become **reaches** along it, each with its own fish. Like Fogbound or Blackwater today.
2. **Old waters:** keep **Fogbound Lake, Blackwater Creek and The Pines**; **retire the Red Room Reservoir**. **Every water has a pier with the bait shop reachable from it.** Keep the ecosystem animals and the changing weather and time of day.
3. **Species:** placed by **real habitat, with the reference as a guide**. Each species gets its depth and hours **per water**, and all 59 get at least one home (the 16 now waiting get theirs).
4. **Ice fishing and the cabin valley's pond:** **not now.**

**Read with:** PLAN.md §0 (conventions, required) and §8 (status). Like the other plan files, this one adds phases after the approved spec and does not edit §0–§7 or Appendix V. Where a phase changes something the spec describes (V6's four locations, V8's pacing step for location 4), the decision goes in §8.3 and the spec text stays as it is.

---

## 1. The reference, as read on 2026-11-02

Eight areas, sixteen spots. The pages give each spot's water type, its unlock and five species (with rarities, which we don't use). They have no descriptions, depths or hours, so those are ours. The scraped pages stay in the session scratchpad and are **not committed**.

| Area | Type | Spots and their five species |
|---|---|---|
| Goldenfork River | river | **The Fork:** Bluegill, Brown Trout, Smallmouth Bass, Threadfin Shad, Walleye · **Beaver Dam:** Brown Trout, Bullhead, Crappie, Largemouth Bass, Longnose Sucker · **The Mistwood:** Burbot, Creek Chub, Rock Bass, Shorthead Redhorse, Steelhead |
| Grizzlyridge River | river | **The Rapids:** Brook Trout, Chum, Coho, Mountain Whitefish, Muskie · **Eagles Nest:** Arctic Grayling, Cutthroat, Longnose Dace, Masu, Sockeye |
| Fawnmirror Lake | lake | **Underwater Meadow:** Cisco, Northern Pike, Rainbow Trout, Tiger Trout, Yellow Perch · **Picnic Point:** Bluegill, Lake Trout, Lake Whitefish, Mooneye, Tiger Trout · **Fisherman's Rest:** Arctic Char, Common Carp, Goldeye, Round Whitefish, White Sucker |
| Autumnwood Lake | lake | **Shallows Edge:** Channel Catfish, Hybrid Striped Bass, Northern Pikeminnow, Peamouth, White Bass · **Otter Cove:** Humpback Whitefish, Largescale Sucker, Northern Pikeminnow, Peamouth, White Sturgeon |
| Icewater Sea | ocean | **Watchers Point:** American Shad, Atlantic Salmon, Lingcod, Pacific Herring, Yelloweye Rockfish · **Craggy Reef:** King, Coho, Lingcod, Masu, Pacific Herring · **Safety Cove:** American Shad, Atlantic Salmon, King, Pink, Steelhead |
| Old Wreck Bay | ocean | **Divers Drop:** Dolly Varden, Eulachon, Pacific Halibut, Sockeye, Striped Bass · **Seals Rest:** Capelin, Chum, Dolly Varden, Greenland Halibut, Striped Bass |
| Lake Hunkerdown | ice | Frostbite Flats (the ten "(Ice)" entries). **Not in this plan** (answer 4). |
| Old Moose Valley | cabin | Old Moose Cabin, a private pond to clean and stock. **Not in this plan** (answer 4). |

---

## 2. The six new waters

New names, real places. Each is built the way ours are: a `data/loc_<id>.js` (layers, landmarks, under water, spots, life, swell, current) and its scenery. **No new strange things:** the liminal layer (fog, owl, anomalies, unease) stays with Fogbound, Blackwater and The Pines. The new waters have the same day and night, weather, drizzle, storms and ecosystem as ours, with the animals that really live there.

Depths are in metres (px = m × 4). The sea's real depths (halibut and rockfish to 90 m and more) are pressed into 40 m: deep-water species are fished on the bottom of the deepest reach.

| Water (id) | From | What it is | Depth | Reaches (from the reference's spots) |
|---|---|---|---|---|
| **Copperbend River** (`copper`) | Goldenfork River | A slow lowland river running to the Great Lakes through farmland and hardwoods: gravel bars, a wooden bridge, a beaver dam, a misty wooded bend. Current like Blackwater's, a little faster over the riffle | 10 m | **The Split** (two channels meet over a gravel riffle) · **Lodge Pool** (still water above a beaver dam, a lodge of sticks) · **Hollow Reach** (a deep bend under leaning maples, morning mist) |
| **Stonehorn River** (`stone`) | Grizzlyridge River | A cold mountain river of the north Pacific slope: spruce and snowy peaks, boulders, white water, an osprey's nest on a bluff | 8 m | **Boulder Run** (rapids: a fast current, foam, standing waves) · **Osprey Bluff** (a deep green pool under a cliff with the nest on top) |
| **Hartsmere Lake** (`harts`) | Fawnmirror Lake | A clear, deep, cold lake in the northern woods: birches, a picnic table and a fire ring on the point, an old bench and a rowboat at the far end, weed beds you can see into | 32 m | **The Weedbed** (shallow flats of waving weed) · **Birch Point** (a point with a picnic table, dropping off steeply) · **The Old Bench** (the quiet far end, a soft bottom) |
| **Russetwood Lake** (`russet`) | Autumnwood Lake | A big-river reservoir among oaks and maples in autumn colour: reed flats, a concrete dam far off, an otter's cove of fallen trees | 24 m | **Reed Flats** (shallow edge with reeds and stumps) · **Mink Cove** (a cove over the old river channel, the deepest water) |
| **Coldharbor Sound** (`sound`) | Icewater Sea | A north Pacific coast: dark rock headlands, a white lighthouse, kelp, a breakwater and a few moored boats. Swell, not current | 40 m | **Lamplight Head** (the lighthouse's headland, rock to the bottom) · **Skerry Reef** (a reef of rocks awash, kelp forest) · **Harbour Cove** (behind the breakwater, calm, sand) |
| **Wreckhollow Bay** (`wreck`) | Old Wreck Bay | A north Atlantic bay: a schooner's wreck on its side half out of the water, a shelf dropping into deep water, rocks where seals haul out | 40 m | **The Shelf** (the wreck and the drop beyond it) · **Haul-out Rocks** (low rocks and seals, kelp and sand) |

**Where the reference strays from real life, and what we do:**
- Muskie in a mountain river: not real. Stonehorn's Boulder Run gets **Rainbow Trout** instead; Muskie stays in The Pines.
- Atlantic Salmon, American Shad, Striped Bass, Capelin and Greenland Halibut are north Atlantic fish; Lingcod, Yelloweye, Pacific Herring, Pacific Halibut, Eulachon and the Pacific salmon are north Pacific fish. The reference mixes them in both seas. We split them: **Coldharbor Sound is the Pacific** (the reference's Icewater Sea has most of the Pacific fish) and **Wreckhollow Bay is the Atlantic**.
- Masu Salmon lives on the Asian side of the Pacific. We keep it in Stonehorn and Coldharbor as the reference does; the journal calls it "a Pacific salmon, rarely seen this side of the ocean".
- Threadfin Shad doesn't reach the Great Lakes; it goes to Russetwood's reed flats (a reservoir is where it lives).
- Humpback Whitefish is a cold-water fish of the far north: it moves from The Pines (a warm woodland lake) to Hartsmere's deep water.

**Costs** (first guesses; Phase 74 tunes them until `--pacing` passes): Fogbound 0, Blackwater 300, **Copperbend 800**, The Pines 1500, **Hartsmere 2400**, **Stonehorn 3400**, **Russetwood 4800** (in the Red Room's place), **Coldharbor 7000**, **Wreckhollow 9500**. Every reach of a water opens with it (the reference's "catch X to open the next spot" is not copied).

---

## 3. Where each species lives

Each species gets a home **per water**: which reaches, how deep, and when. Hours: **dawn** 5–8, **day** 8–17, **dusk** 17–21, **night** 21–5. "Bed" means on or within a metre of the bottom. A species turns up only in its reaches; at other depths and hours it still bites, less often (fish_ai's depth falloff and `hourOther`, as now).

### Fogbound Lake (24 m, unchanged roster, now with hours and depths per water)
| Species | Depth | When |
|---|---|---|
| Yellow Perch | 1–10 m | day |
| Rock Bass | 1–8 m | dawn, dusk |
| Smallmouth Bass | 2–12 m | day |
| Northern Pike | 1–12 m | day |
| Walleye | 3–14 m | dusk, night, dawn |
| Cisco | 6–22 m | dawn, dusk |
| Lake Whitefish | 8–24 m | any |
| Lake Trout | 14–24 m | any |
| Burbot | 14–24 m, bed | night |
| White Sucker | 2–12 m, bed | any |
| Longnose Sucker | 6–20 m, bed | any |
| Arctic Char | 16–24 m | dawn, day |

### Blackwater Creek (16 m)
Brook Trout 0.5–5 dawn/dusk · Brown Trout 1–8 dusk/night/dawn · Rainbow Trout 1–8 any · Tiger Trout 1–8 dawn/dusk · Cutthroat 1–6 dawn/dusk · Steelhead 2–12 dawn/dusk · Dolly Varden 1–10 any · Arctic Grayling 0.5–4 day · Mountain Whitefish 1–6 any · Round Whitefish 2–10 day · Creek Chub 0.5–4 day · Longnose Dace 0.5–3 day · Shorthead Redhorse 1–8 bed, day · Northern Pikeminnow 1–10 dawn/dusk · Peamouth 1–6 day · Largescale Sucker 2–12 bed, any.

### The Pines (28 m)
Largemouth Bass 0.5–8 dawn/dusk · Bluegill 0.5–5 day · Crappie 1–8 dusk/night/dawn · Yellow Perch 1–10 day · Northern Pike 1–12 day · Muskie 2–14 any · Tiger Muskie 2–12 day · Bullhead 1–8 bed, night · Channel Catfish 3–20 bed, night · Common Carp 1–10 any. (Humpback Whitefish moves to Hartsmere.)

### Copperbend River (10 m)
| Reach | Species | Depth | When |
|---|---|---|---|
| The Split | Smallmouth Bass | 1–5 m | day |
| | Brown Trout | 1–4 m | dusk, night, dawn |
| | Walleye | 3–9 m | dusk, night, dawn |
| | Bluegill | 0.5–3 m (the slack edge) | day |
| | Yellow Perch | 1–6 m | day |
| Lodge Pool | Brown Trout | 1–5 m | dusk, night |
| | Bullhead Catfish | 2–7 m, bed | night |
| | Crappie | 1–5 m | dawn, dusk |
| | Largemouth Bass | 0.5–4 m | dawn, dusk |
| | Longnose Sucker | 3–9 m, bed | day |
| Hollow Reach | Burbot | 6–10 m, bed | night |
| | Creek Chub | 0.5–3 m | day |
| | Rock Bass | 1–5 m | dawn, dusk |
| | Shorthead Redhorse | 2–9 m, bed | day |
| | Steelhead | 2–8 m | dawn |

### Stonehorn River (8 m, fast)
| Reach | Species | Depth | When |
|---|---|---|---|
| Boulder Run | Brook Trout | 0.5–3 m | dawn, dusk |
| | Rainbow Trout | 0.5–4 m | dawn, dusk |
| | Mountain Whitefish | 1–5 m | day |
| | Coho Salmon | 1–5 m | dawn, dusk |
| | Chum Salmon | 2–7 m | dawn, dusk |
| Osprey Bluff | Arctic Grayling | 0.5–3 m | day |
| | Cutthroat Trout | 0.5–4 m | dawn, dusk |
| | Longnose Dace | 0.5–2 m | day |
| | Sockeye Salmon | 2–7 m | dawn, day |
| | Masu Salmon | 2–6 m | dawn |
| | Dolly Varden | 1–6 m | day |

### Hartsmere Lake (32 m)
| Reach | Species | Depth | When |
|---|---|---|---|
| The Weedbed | Northern Pike | 1–6 m | day |
| | Yellow Perch | 1–8 m | day |
| | Rainbow Trout | 1–8 m | dawn, dusk |
| | Tiger Trout | 1–6 m | dawn, dusk |
| | Cisco | 6–20 m | dawn, dusk |
| Birch Point | Bluegill | 0.5–4 m | day |
| | Tiger Trout | 2–8 m | dawn, dusk |
| | Mooneye | 1–6 m | dusk, night |
| | Lake Whitefish | 10–26 m | day |
| | Lake Trout | 16–32 m | dawn, day |
| The Old Bench | Common Carp | 1–5 m | day |
| | White Sucker | 2–10 m, bed | day |
| | Goldeye | 1–5 m | dusk, night |
| | Round Whitefish | 6–20 m | day |
| | Humpback Whitefish | 14–30 m | any |
| | Arctic Char | 20–32 m | dawn |

### Russetwood Lake (24 m)
| Reach | Species | Depth | When |
|---|---|---|---|
| Reed Flats | Threadfin Shad | 0.5–4 m | day |
| | White Bass | 1–6 m | day |
| | Hybrid Striped Bass | 1–8 m | dawn, dusk |
| | Peamouth | 1–5 m | day |
| | Channel Catfish | 2–8 m, bed | night |
| Mink Cove | Northern Pikeminnow | 1–8 m | dawn, dusk |
| | Peamouth | 1–6 m | day |
| | Walleye | 4–12 m | dusk, night, dawn |
| | Largescale Sucker | 2–12 m, bed | day |
| | White Sturgeon | 14–24 m, bed | night |

### Coldharbor Sound (40 m, Pacific)
| Reach | Species | Depth | When |
|---|---|---|---|
| Lamplight Head | Lingcod | 15–40 m, bed | dawn, day |
| | Yelloweye Rockfish | 25–40 m, bed | day |
| | Pacific Halibut | 28–40 m, bed | day |
| | Pacific Herring | 2–12 m | dawn, dusk |
| | Steelhead | 1–6 m | dawn |
| Skerry Reef | King Salmon | 6–25 m | dawn |
| | Coho Salmon | 1–10 m | dawn, day |
| | Sockeye Salmon | 2–12 m | dawn |
| | Masu Salmon | 2–12 m | dawn |
| | Lingcod | 12–30 m, bed | dawn, day |
| | Pacific Herring | 2–12 m | dawn, dusk |
| Harbour Cove | Pink Salmon | 1–8 m | day |
| | Chum Salmon | 2–10 m | dawn, dusk |
| | Dolly Varden | 1–6 m | day |
| | Eulachon | 5–20 m | night |
| | Steelhead | 1–6 m | dawn |

### Wreckhollow Bay (40 m, Atlantic)
| Reach | Species | Depth | When |
|---|---|---|---|
| The Shelf | Greenland Halibut | 30–40 m, bed | day |
| | Striped Bass | 4–14 m (round the wreck) | dusk, night |
| | Atlantic Salmon | 2–10 m | dawn |
| | Capelin | 3–15 m | day, night |
| Haul-out Rocks | American Shad | 1–8 m | day |
| | Striped Bass | 1–6 m | dusk, night |
| | Atlantic Salmon | 1–6 m | dawn, dusk |
| | Arctic Char (sea-run) | 1–8 m | day |
| | Capelin | 2–10 m | day |

Every one of the 59 species has a home; none waits. The Red Room's six that lived only there (White Bass, Hybrid Striped Bass, Threadfin Shad, White Sturgeon, Mooneye, Goldeye) move to Russetwood and Hartsmere.

---

## 4. Design

### 4.1 The species' homes (data)
`data/fish.js` replaces `locations`, `habitat` and `timeLikes` with **`homes`**: a list of `{ loc, reaches, depth: [min, max], bed, hours }`, one per water (`reaches` empty means the whole water; `hours` from the four names above, empty means any). `habitat` and `timeLikes` are worked out per cast from the home of the water the boat is in, so fish_ai's weights keep their shape. The journal page of a species says **where, how deep and when**, one line per home ("Hartsmere · The Old Bench · 20–32 m · dawn").

### 4.2 Reaches (data)
Each water gains `reaches: [{ id, name, x: [from, to] }]` covering its width. The boat's x picks the reach; the HUD names it when the boat crosses into one (a quiet line, like the map's place names). The small spots inside a reach (`spots`, with `attract`) stay as now. Fogbound, Blackwater and The Pines get one reach each (their whole water).

### 4.3 A pier in every water
Every water gets a `dock` (its pier, at one end, with a signpost). Stopping beside it opens THE PIER panel as at Fogbound: **Bait Shop** and **Stay on the water** (and **The Cabin** at Fogbound only). Leaving the shop brings him back to the boat **at the pier he came from**. The shop is the same shop (Rusty's); a trip there is a fade, as now. The map's Bait Shop stop still goes by Fogbound's pier.

### 4.4 The Red Room, retired
`loc_red.js`, its scenery (the moving furniture, the zigzag shore, the curtains), its map stop, its audio branch and its anomalies are deleted. A save that had it open gets its 4800 coins back; a save sitting in it wakes at Fogbound's pier. Its catches stay in the journal and the records. Save v9. `--pacing`'s step "location 4 (red)" becomes "location 4 (russet)" with the same window (a decision in 8.3; V8 itself isn't edited).

### 4.5 Rivers, lakes and seas
- **Rivers** keep Blackwater's current (`drift`), set per reach: Stonehorn's Boulder Run runs about twice as fast and the lure barely sinks in it; Lodge Pool barely moves.
- **Lakes** are still, like Fogbound and The Pines.
- **Seas** have no current but a bigger, slower swell (surface.js), a tide that raises and lowers the waterline a few px over the day (presentation only), salt-water colours, kelp, sand and rock under water, and a sea-floor life (crabs, starfish, anemones, flatfish shadows) in place of crayfish and snails.
- **New animals** where they really live: eagles and an osprey (Stonehorn), a beaver at Lodge Pool (the creek's beaver), otters at Mink Cove, loons on Hartsmere, gulls, cormorants and seals at sea, a heron on the reed flats. The ducks, herons, kingfishers, deer, dragonflies and fireflies go where they belong (no fireflies at sea).
- **Weather** as now everywhere: drizzle, the grey hour, storms (Phase 55) and day and night; at sea a storm also lifts the swell and whitecaps.

### 4.6 The chart
The map grows to hold nine waters: the inland waters and rivers on the left, the coast and the two seas on the right, the old Red Room's corner becoming Russetwood's dam. Each stop shows its reaches as small labels. The arrows' nearest-stop-that-way rule (Phase 66) stays and `dbg.mapNav()` checks it.

---

## 5. Phases

### Phase 74: Nine waters on the chart
**74.1** Six new `data/loc_<id>.js` files with their reaches, depths, costs, docks and currents, painted for now with the existing layer kinds (rivers like Blackwater, lakes like The Pines and Fogbound, seas with the lake painters in sea colours) so they can be sailed and fished.
**74.2** The Red Room retired (4.4); save v9.
**74.3** The map's nine stops (4.6) and the costs tuned until `--pacing` passes.
*Done when:* `--validate` (every water has reaches covering its width and a dock; no `red` left), `--saves` (every milestone loads into v9, a Red Room save is refunded and moved), `--pacing` PASS, `--replay` hash re-recorded, `dbg.mapNav()` ok, every water loads in headless Chromium at noon and midnight with no page errors.

### Phase 75: Where each fish lives
**75.1** `homes` (4.1) for all 59 species from §3; fish_ai picks by water, reach, depth and hour; the HUD names the reach.
**75.2** The journal shows each species' homes; `dbg.who()` names the reach.
*Done when:* `--validate` (every species has a home, every home's water and reaches exist, every depth fits the water's depth, every reach has a lure type that every one of its species takes), `--tackle` and `--fight` PASS, `--pacing` PASS, `--replay` re-recorded, a Node check that prints §3's tables from the data and matches them.

### Phase 76: A pier in every water
**76.1** THE PIER panel and signpost at each water's dock (4.3); the shop returns him to the pier he came from.
*Done when:* `dbg.dock()` at each of the nine waters reports its pier; going to the shop and back from each works in headless Chromium with no page errors.

### Phase 77: The rivers
**77.1** Copperbend River's scenery: the riffle and gravel bars, the bridge, the beaver dam and lodge, the misty bend; per-reach current.
**77.2** Stonehorn River's: snowy peaks, spruce, boulders and white water, the bluff and the osprey's nest; the fast current.
**77.3** Their animals (4.5).
*Done when:* both rivers render at dawn, noon, dusk, midnight and in a storm in headless Chromium with no page errors (screenshots for the user); `dbg.shore()` and `dbg.life()` list what each reach has; `dbg.lureBody()` reports the faster drift in Boulder Run.

### Phase 78: The lakes
**78.1** Hartsmere Lake: birches, the picnic point, the old bench and rowboat, clear water with visible weed beds and a steep drop.
**78.2** Russetwood Lake: autumn hardwoods, reed flats and stumps, the dam far off, the otters' cove.
**78.3** Their animals.
*Done when:* as Phase 77.

### Phase 79: The seas
**79.1** Sea painters: headlands and cliffs, the lighthouse (its beam at night), the breakwater and moored boats, the wreck, the seals' rocks, kelp, sand and rock bottoms; the swell, whitecaps and tide (4.5).
**79.2** Coldharbor Sound and Wreckhollow Bay built from them.
**79.3** Sea life above and below.
*Done when:* as Phase 77; plus `dbg.sea()` reports the swell, the tide's height and the lighthouse's beam; a phone's frame time measured at sea (Phase 60's check) stays above 50 fps on the 4× throttle.

---

## 6. Risks
- **Size of the map:** nine stops plus the shop and cabin on a 640×360 chart. If it crowds, the chart scrolls sideways (inland | coast) instead of shrinking the labels.
- **Pacing:** six more waters and the sea's big fish (king salmon, halibut, lingcod) could break V8's targets. Phase 74 tunes the costs and Phase 75 the prices, and `--pacing` decides.
- **Rods:** sturgeon and halibut reach 100 kg, past the strongest rod. As in PLAN_SPECIES.md, the biggest only bite on a rod that holds them. A heavier rod is a later choice for the user.
- **Boot time:** six more baked waters. They bake on arrival, as now, so boot doesn't grow; arrival is measured in Phase 74.
- **The sea's depth:** 40 m on screen (160 px) leaves the cross-section the same height as The Pines' 28 m plus 48 px; if it doesn't fit the view, the sea's px per metre drops to 3 for the cross-section only.
