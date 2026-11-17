# SoftStatic: New Waters, Phases 74–79 (built)

Adds phases after the approved spec; decisions are in PLAN.md §8.3 #397–450. `node tools/balance.js --homes` reads §3 below and checks it against `data/fish.js`: keep its tables and headings exactly in this form.

**The user's rules:** each new water has a new name and a real look, with 2–3 **reaches** along it, each with its own fish. Fogbound, Blackwater and The Pines stay; the Red Room was retired. Every water has a pier with the bait shop reachable from it. Species are placed by real habitat, with depth and hours per water.

## 2. The six new waters

Each is a `data/loc_<id>.js` (layers, landmarks, under water, spots, life, swell, current) and its scenery. **No new strange things:** the liminal layer (fog, owl, anomalies, unease) stays with Fogbound, Blackwater and The Pines; the new waters share day and night, weather, storms and the ecosystem. Depths in metres (px = m × 4); the sea's real depths are pressed into 40 m.

| Water (id) | What it is | Depth | Reaches |
|---|---|---|---|
| **Copperbend River** (`copper`) | A slow lowland river running to the Great Lakes through farmland and hardwoods: gravel bars, a wooden bridge, a beaver dam, a misty wooded bend. Current like Blackwater's, a little faster over the riffle | 10 m | **The Split** (two channels meet over a gravel riffle) · **Lodge Pool** (still water above a beaver dam, a lodge of sticks) · **Hollow Reach** (a deep bend under leaning maples, morning mist) |
| **Stonehorn River** (`stone`) | A cold mountain river of the north Pacific slope: spruce and snowy peaks, boulders, white water, an osprey's nest on a bluff | 8 m | **Boulder Run** (rapids: a fast current, foam, standing waves) · **Osprey Bluff** (a deep green pool under a cliff with the nest on top) |
| **Hartsmere Lake** (`harts`) | A clear, deep, cold lake in the northern woods: birches, a picnic table and a fire ring on the point, an old bench and a rowboat at the far end, weed beds you can see into | 32 m | **The Weedbed** (shallow flats of waving weed) · **Birch Point** (a point with a picnic table, dropping off steeply) · **The Old Bench** (the quiet far end, a soft bottom) |
| **Russetwood Lake** (`russet`) | A big-river reservoir among oaks and maples in autumn colour: reed flats, a concrete dam far off, an otter's cove of fallen trees | 24 m | **Reed Flats** (shallow edge with reeds and stumps) · **Mink Cove** (a cove over the old river channel, the deepest water) |
| **Coldharbor Sound** (`sound`) | A north Pacific coast: dark rock headlands, a white lighthouse, kelp, a breakwater and a few moored boats. Swell, not current | 40 m | **Lamplight Head** (the lighthouse's headland, rock to the bottom) · **Skerry Reef** (a reef of rocks awash, kelp forest) · **Harbour Cove** (behind the breakwater, calm, sand) |
| **Wreckhollow Bay** (`wreck`) | A north Atlantic bay: a schooner's wreck on its side half out of the water, a shelf dropping into deep water, rocks where seals haul out | 40 m | **The Shelf** (the wreck and the drop beyond it) · **Haul-out Rocks** (low rocks and seals, kelp and sand) |

**Real-life placements:** Muskie stays out of mountain rivers. **Coldharbor Sound is the Pacific** (lingcod, yelloweye, Pacific herring and halibut, eulachon, Pacific salmon) and **Wreckhollow Bay the Atlantic** (Atlantic salmon, American shad, striped bass, capelin, Greenland halibut). Masu Salmon is kept in Stonehorn and Coldharbor ("rarely seen this side of the ocean"). Threadfin Shad lives in Russetwood's reed flats; Humpback Whitefish in Hartsmere's deep water.

**Costs** (tuned by `--pacing`): Fogbound 0, Blackwater 300, Copperbend 800, The Pines 1500, Hartsmere 2400, Stonehorn 3400, Russetwood 4800, Coldharbor 7000, Wreckhollow 9500. Every reach opens with its water.

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

## 5. Phases
- **74** Nine waters on the chart; the Red Room retired (save v9); costs tuned.
- **75** `homes` for every species from §3; the HUD names the reach; the journal shows homes; `--homes` added.
- **76** A pier in every water.
- **77** The rivers' scenery and animals. **78** The lakes'. **79** The seas' (swell, whitecaps, tide, lighthouse; `dbg.sea()`).
