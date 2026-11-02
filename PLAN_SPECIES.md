# SoftStatic: Real Fish and Real Tackle, Phases 68–73

**Date:** 2026-11-02. **Repo state:** Phases 1–67 done (PLAN.md §8.1).
**Status:** Asked for by the user on 2026-11-02. **Phases 68–73 done** (PLAN.md 8.3 #347–396). Each phase starts only when the user says so. Where Phase 68 settled something this plan left open (prices, the placements in 3.2, the pacing model's bait, costs), PLAN.md 8.3 has the decision.

> Lets change all the lures and all the fish in the lakes, fish should be the 68 especies in this list: https://castnchill.unpack.wiki/docs/fish/ And the lures should be all of this list https://castnchill.unpack.wiki/docs/lures/ Take the reference icon and name of each fish and lure to remake it like that, with that resolution and detail. The fish we already made discard them. I want this list. (you can keep the other animals like snails, frogs, turtles, ducks of the ecosistem) Fish relate to lures so keep in mind.

The user's answers to the questions asked before planning:
1. **Art:** our own sprites, painted from the reference icons for size and detail ("make it look real and with a lot of detail"). We don't trace or copy their pixels.
2. **Plain and realistic, no rarities.** No odd parts, no common/uncommon/rare/legendary.
3. **Each species where it really lives.** More real lakes, rivers and the sea come later.
4. **Old fish in saves are dropped.**
5. **A plan in phases**, one at a time.

**Read with:** PLAN.md §0 (conventions, required) and §8 (status). Like the other plan files, this one adds phases after the approved spec and doesn't edit §0–§7 or Appendix V. Where a phase changes something the spec describes (V5's fish schema, rarity, V10's legendaries), the decision goes in §8.3 and the spec text stays as it is.

---

## 1. The reference, as read on 2026-11-02

**Fish.** The list has 68 entries. Ten of them are "(Ice)" entries: Walleye, Northern Pike, Muskie, Smallmouth Bass, Largemouth Bass, Yellow Perch, Lake Trout, Channel Catfish and Arctic Char each appear twice, as open-water and ice-fishing versions with near-identical icons, and **Tiger Muskie** appears only as an ice entry. That leaves **58 open-water entries plus Tiger Muskie: 59 distinct species.** We make one species per real fish, so **59 species**. The ice entries only add a second place to catch them (ice fishing), which can come with a frozen water later. Steelhead is a sea-run Rainbow Trout, but the list keeps them apart and so do we.

Each species page gives a preferred **lure type** and weight ranges in **size classes** S (under 0.45 kg), M (0.45–2.3), L (2.3–9.1), XL (9.1–27), XXL (over 27). Lures are sold in the same size classes. **That is how fish relate to lures here: the lure's type and its size.** A fish wants its kind of lure, sized for a fish its size.

**Icons.** Pixel art at 8× on the wiki, **natively about 88×48 px per fish** (58–104 wide, 33–58 tall), with 40–190 colours each. Lures are **38 px wide** (bobbers 14–19 wide by 33–38 tall). Detail in the fish icons: a lit back and a shaded belly in 4–6 steps, a lateral line, scale rows, fin rays with translucent membranes, an eye with a ring and a highlight, the gill plate drawn as a line, and real markings (bars, spots, parr marks, a red band). The reference images and the scraped table stay in the session scratchpad. They're **not committed**.

**Lures (23):**

| Lure | Type | Sizes | Reference cost | Bonus fish in the reference |
|---|---|---|---|---|
| Bobber | Float | S M | free | Threadfin Shad, Bluegill |
| Deep Bobber | Float | S M L | 30 | American Shad, Eulachon |
| Crankbait | Crankbait | S M | 15 | Smallmouth Bass, Brown Trout |
| Big Crankbait | Crankbait | L XL | 50 | Brown Trout |
| Deep Crankbait | Crankbait | XL XXL | 150 | Lake Trout, Striped Bass |
| Spinnerbait | Spinnerbait | S M L | 30 | Tiger Trout, Creek Chub, Dolly Varden |
| Big Spinnerbait | Spinnerbait | XL XXL | 60 | Lake Trout, Cutthroat, Dolly Varden |
| Small Spoonbait | Spoonbait | S M L | 25 | Walleye, Crappie |
| Heavy Spoonbait | Spoonbait | L XL | 60 | Walleye, Sockeye |
| Huge Spoonbait | Spoonbait | XL XXL | 150 | Muskie |
| Dropshot | Dropshot | S M L | 50 | Bullhead, Longnose Sucker, White Sucker |
| Heavy Dropshot | Dropshot | XL XXL | 100 | Channel Catfish |
| Wacky Worm | Wacky | S M L | 30 | Yellow Perch, Lake Whitefish |
| Jighead | Jighead | M L XL | 50 | Largemouth Bass, Coho, Chum |
| Deep Jighead | Jighead | XL XXL | 100 | Lingcod |
| Topwater | Topwater | S M L | 60 | Brook Trout |
| Medium Bladebait | Bladebait | M L | 30 | Rainbow Trout, Arctic Char |
| Large Bladebait | Bladebait | L XL | 60 | Rainbow Trout |
| Heavy Bladebait | Bladebait | XL XXL | 150 | Northern Pike, Greenland Halibut |
| Glidebait | Glidebait | M L | 100 | Pink Salmon |
| Deep Glidebait | Glidebait | XL XXL | 200 | King Salmon |
| Minnow Swimbait | Swimbait | S M L | 60 | Northern Pikeminnow |
| Bluegill Swimbait | Swimbait | XL XXL | 150 | White Sturgeon |

---

## 2. What exists today (verified in the code)

| Part | Now | Where |
|---|---|---|
| Fish | 46 invented species with `wrongness`, odd `parts`, hint text, `rarity`, owl windows, unease gates | `data/fish.js` |
| Rarity | species pick weights, the rare/legendary boosts of baits, spots, the lamp and anomalies, price ×1/2.5/8/40, the journal's rarity filter, the card's rarity line, the dog's legendary cue, the rare sting | `fish_ai.js` 68–72, `economy.js` 34, `gear.js` 105, `loc_*.js` spots, `journal.js`, `card.js`, `dog.js` 198–217, `engine.js` 495/628, `unease.js` |
| Red Room unlock | needs the Pines' Three-Thirty-Three caught in the 03:33 window | `loc_red.js` `need` |
| Lures | 7 (spinner, plug, grub, popper, jig, bobber, spoon); `fish.lures` maps lure id → 2 loves / 1 takes | `data/gear.js`, `data/fish.js` |
| Swim actions | `mid`, `dive`, `bed`, `top`, `lift`, `float`, `flutter` | `underwater.js`, `fish_ai.js` |
| Fish art | parametric painter over 7 body plans (perch, pike, carp, trout, eel, catfish, …) plus wrong parts; card portrait 80×40, journal plate and tiles, swimmers | `js/gfx/fishgen.js` |
| View | 640×360, one pixel size, shading in flat 3–6 key clusters, palette keys only (8.3 #84) | `core/loop.js`, `gfx/paint.js`, `gfx/sprites.js` |
| Waters | Fogbound Lake (24 m), Blackwater Creek (16 m, current), The Pines (28 m), Red Room Reservoir (20 m) | `data/loc_*.js` |
| Save | v6, autosave, `migrate()` chain | `core/save.js` |

The ecosystem animals (snails, frogs, turtles, ducks, herons, the far shoals) **stay as they are.**

---

## 3. Design

### 3.1 Species data (V5 schema, as changed)
Each species keeps `id, name, locations, habitat {depthMin, depthMax}, speed, strength, fatigue, mass, lengthCm, weightKg, awareness, caution, timeLikes, price, look` and gains:
- `latin`: the scientific name, shown small on the journal page.
- `family`: perch, bass & sunfish, pike, trout & salmon, whitefish, sucker, minnow, catfish, herring & shad, smelt, mooneye, cod, sturgeon, flatfish, rockfish, greenling, temperate bass.
- `lureTypes`: `{ spoon: 2, crank: 1, … }`. 2 is its preferred type (the reference's), 1 is other types real anglers catch it on. Types not listed are ignored.
- `sizes`: the weight range comes from **real biology**, not the reference's game ranges (those run large: a 13 kg pikeminnow, a 1.9 kg yellow perch). The size class S–XXL of each catch follows from its weight.

Removed: `rarity`, `wrongness`/`parts`, `windows`, `uneaseMin`, `desc` riddles, `hintRefs`, `baitLikes`. Live baits work through the lures that carry them (the bobber and the dropshot carry a worm). See 3.3.

**Who bites, with no rarity:** a species turns up only if it lives in this water, the lure is at a depth in its habitat, the hour suits it (`timeLikes`: walleye at dusk and dawn, burbot and catfish at night, bass and sunfish by day), the lure's type is in its `lureTypes`, and the lure's size classes cover the fish's size. Its weight is 1, ×2 for its preferred type, ×1.5 in its hours. No species is "rare". The big ones are hard because they need the right lure, the right depth and a rod that holds them.

**Prices:** a base per species set from its real table value and size, × the existing size factor. `economy.rarityMult` goes. The V8 pacing targets (spec) must still pass (`--pacing`).

### 3.2 Where each species lives (draft, settled in Phase 68)
Placed by real habitat. A species can live in more than one water. **Sea and sea-run species wait** for the sea and the big river (`locations: []`). The journal leaves them out until a water holds them.

| Water | What it is | Species |
|---|---|---|
| **Fogbound Lake** (start, 24 m, cold, clear) | a northern glacial lake | Yellow Perch, Rock Bass, Smallmouth Bass, Northern Pike, Walleye, Cisco, Lake Whitefish, Lake Trout (deep), Burbot (deep, night), White Sucker, Longnose Sucker, Arctic Char (deepest, coldest) |
| **Blackwater Creek** (16 m, current) | a forest river | Brook Trout, Brown Trout, Rainbow Trout, Tiger Trout, Cutthroat Trout, Steelhead, Dolly Varden, Arctic Grayling, Mountain Whitefish, Round Whitefish, Creek Chub, Longnose Dace, Shorthead Redhorse, Northern Pikeminnow, Peamouth, Largescale Sucker |
| **The Pines** (28 m, weedy shallows) | a warm woodland lake | Largemouth Bass, Bluegill, Crappie, Yellow Perch, Muskie, Tiger Muskie, Bullhead Catfish, Common Carp, Humpback Whitefish (deep), Northern Pike |
| **Red Room Reservoir** (20 m) | a big-river reservoir | Channel Catfish, Common Carp, White Bass, Hybrid Striped Bass, Threadfin Shad, White Sturgeon, Walleye, Crappie, Mooneye, Goldeye |
| *waiting for the sea / big river* | | Eulachon, Capelin, Pacific Herring, American Shad, Atlantic Salmon, King Salmon, Coho, Sockeye, Pink, Chum, Masu Salmon, Lingcod, Greenland Halibut, Pacific Halibut, Yelloweye Rockfish, Striped Bass |

That puts 43 species in today's waters (some in two) and 16 waiting.

### 3.3 Tackle
- The 23 lures replace the 7. Each has a `type`, `sizes` (classes it fishes for), a cost (the reference's order, scaled to our economy so `--pacing` and `--tackle` pass), and a swim action:

| Type | Action | Note |
|---|---|---|
| Float | `float` | the float on the surface, a worm under it. Bobber 1.5 m, Deep Bobber 5 m |
| Crankbait | `dive` | running depth by size: 1.5 / 3 / 6 m |
| Spinnerbait | `mid` | blades spin, lifts with speed |
| Spoonbait | `flutter` | |
| Jighead | `lift` | Deep Jighead heavier, fishes the bed of deep water |
| Topwater | `top` | |
| Bladebait | `lift` + `rattle` | short sharp lifts that shiver, drops on a slack line |
| Dropshot | **new `dropshot`** | the weight on the bed, a worm hovering 0.5 m above, twitched in place |
| Wacky | **new `wacky`** | a worm hooked in the middle, falls slowly and level, both ends shimmying |
| Glidebait | **new `glide`** | wide slow S-glides side to side at mid depth |
| Swimbait | `mid` + `kick` | a paddle tail that beats with speed |

- **Live baits** (worm, cricket, minnow) stay as baits: the float and dropshot carry the worm, and the shop sells them as now. **The unlabelled jar goes**: it only boosted rare fish.
- Old lures in a save become the nearest new one: spinner → Spinnerbait, plug → Crankbait, grub → Wacky Worm, popper → Topwater, jig → Jighead, bobber → Bobber, spoon → Small Spoonbait.
- The shop's lure case and the setup panel's lure list hold 23 items, so both page (keys and taps as now, 8.3 #313).

### 3.4 What goes with rarity and the strange fish
The liminal layer of **the places** stays: anomalies, the fog, the owl, the Red Room's moving furniture, unease. Only what tied it to fish goes.
- Legendary spots become plain **spots** (a drop-off, a snag, a pool) with `attract` only. The dog's bark cue at them goes. Its ambient barks stay.
- Hidden spots keep `attract` and lose `rare`. The lamp, the anomalies' cast boosts and the baits' `rareBoost` lose their fish effect.
- The card shows the **size class** (S–XXL) where it showed rarity. The journal filters by **family** where it filtered by rarity, and shows the Latin name. The card's sound is the same for every fish, with a little more of it for a fish's best size class (XL/XXL).
- The Red Room opens by its cost alone. Its window-catch need goes with the Three-Thirty-Three. The owl still cries at 2:47 and 3:33.

### 3.5 The fish painter (the art)
A new painter in `gfx/fishgen.js` replaces the body plans and wrong parts. Each species gets its own **anatomy spec** in `data/looks.js` or a new `data/fishlooks.js`:
- **Body:** a profile (back and belly curves as control points), head length, snout shape (pointed, blunt, duck-billed, underslung sucker mouth, sturgeon rostrum), mouth size and gape, jaw line.
- **Fins:** each fin's place, length, height, shape, ray count, spiny or soft, membrane translucency. Adipose fin, forked/square/rounded tail, the sturgeon's heterocercal tail, the halibut's long dorsal and anal fins.
- **Head:** eye size and colour with ring and highlight, the gill plate drawn as a curve, barbels (catfish, carp, sturgeon, burbot), teeth where they show (pike, lingcod).
- **Surface:** scale rows (size per species, drawn as deliberate strokes, not noise), the lateral line, scutes (sturgeon).
- **Colour:** per species ramps of 4–6 palette keys for back, flank, belly and fins, added to `sprites.js` under a `fish_` prefix (8.3 #84: no hex outside the palette, flat clusters, no dithering).
- **Markings** as layered strokes: vertical bars (perch, walleye's saddles), spots (trout: black, red with blue halo for brook, X marks for rainbow), worm-tracks (brook trout's back), the pink band (rainbow, steelhead), the red cutthroat slash, pike's bean spots, muskie's bars, tiger trout's vermiculation, the bluegill's ear flap, crappie's speckle, carp's scale net.
- **Resolution:** the portrait at its native size, **about 88×48 px for a typical fish** like the reference, with no scaling (one pixel size). The card's portrait box grows from 80×40 to 96×56 and the card widens to fit. The journal plate shows it at full size. Grid tiles show a smaller version painted at that size from the same spec, not scaled down. Swimmers under water are painted from the same spec at their length on screen, with the tail-beat frames as now (Phase 27).
- A `?gallery` page, `fish`, shows all 59 portraits side by side. A debug-only `?ref` view can put a local reference folder beside them; it's never committed and never loads in play.

### 3.6 Lure art
Each of the 23 lures gets its own icon, **about 38 px wide** like the reference, painted in palette keys. Those are for the shop's case, the setup panel and the HUD's chip. A matching under-water sprite moves with its action: blades turning, the paddle tail beating, the glide's sway, the wacky worm's shimmy, the float riding the swell. The size variants (Big, Deep, Heavy, Huge) differ in size, lip length, weight and colourway.

---

## 4. Phases

### Phase 68: The species
**68.1** `data/fish.js` rewritten: 59 species with real data (3.1), placed by 3.2, `lureTypes` keyed by lure type. The 7 current lures get a `type` and `sizes` so they fish the new roster until Phase 69.
**68.2** Rarity and the strange fish removed from the sim and the UI (3.4): `fish_ai` weights by water, depth, hour, lure type and lure size; prices without `rarityMult`; spots, lamp, anomalies, dog cue, card, journal, sound; the Red Room's unlock.
**68.3** Save v7: journal, keepnet, records and the Red Room flag's old fish dropped. Old lure counts are kept (they're still the 7 lures).
**68.4** Placeholder looks: each species drawn by the current painter with the nearest body plan and a plain palette, so the game runs until Phase 70.
*Done when:* `--validate` (every species placed or waiting, every lure type has takers in every water, no `rarity`, `windows` or `parts` left), `--pacing` PASS against V8, `--tackle` PASS, `--fight` (every species lands on some rod), `--saves` (every milestone save loads into v7), `--replay` hash re-recorded, `dbg.who()` lists who can bite for the current water, depth, hour and lure.

### Phase 69: The tackle
**69.1** The 23 lures (3.3) in `data/gear.js`, with costs, sizes and actions. The three new actions (`dropshot`, `wacky`, `glide`) and the `rattle` and `kick` variants in the sim and the scene.
**69.2** The shop's lure case and the setup panel page through 23 lures. Save v8 maps old lures to new ones.
**69.3** Placeholder lure sprites: the nearest current lure, recoloured, until Phase 73.
*Done when:* `--validate` (every lure has a species that takes it in some water, and every placed species has at least one lure that fits its type and size), `--tackle` PASS for all 23, `--pacing` PASS, `--saves`, `dbg.lureBody()` reports each new action.

### Phase 70: A painter for real fish, and the perch and bass families
**70.1** The anatomy spec and painter (3.5): body, fins with rays, head, scales, lateral line, markings, palette ramps. The card's and the journal's portrait boxes resized.
**70.2** Painted: Yellow Perch, Walleye, Smallmouth Bass, Largemouth Bass, Rock Bass, Bluegill, Crappie, White Bass, Hybrid Striped Bass, Striped Bass.
**70.3** The `fish` gallery page.
*Done when:* `--validate` (every spec paints, every key is in the palette, portraits fit 104×60), a gallery screenshot of the ten for the user to check against the reference, a timing check that baking every portrait at boot stays under the journal's budget (8.3 #330).

### Phase 71: Trout, salmon, char and whitefish
Rainbow, Steelhead, Brown, Brook, Tiger, Cutthroat, Lake Trout, Arctic Char, Dolly Varden, Arctic Grayling, Atlantic, King, Coho, Sockeye, Pink, Chum, Masu Salmon, Cisco, Lake, Round, Mountain and Humpback Whitefish (22).
*Done when:* as Phase 70, with a gallery screenshot of these 22.

### Phase 72: The rest of the fish, and the swimmers
Northern Pike, Muskie, Tiger Muskie, Common Carp, Creek Chub, Longnose Dace, Peamouth, Northern Pikeminnow, the four suckers and redhorse, Bullhead, Channel Catfish, Burbot, White Sturgeon, Mooneye, Goldeye, Threadfin Shad, American Shad, Pacific Herring, Eulachon, Capelin, Lingcod, Yelloweye Rockfish, Greenland and Pacific Halibut (27). The swimmers for all 59 are checked: tail beat, turn and silhouettes at night.
*Done when:* as Phase 70; `dbg.fishLooks()` reports all 59 painted by the new painter and none by a placeholder; the old body plans and wrong parts are deleted.

### Phase 73: Lure art
The 23 icons and their under-water sprites with each action (3.6). Placeholders deleted.
*Done when:* `--validate` (every lure has an icon and a sprite, palette keys only), a gallery `lures` page screenshot, `dbg.lureBody()` per action.

---

## 5. Risks
- **Size on screen:** an 88 px fish is 14% of the 640 px view. That's right for the card and the journal, but swimmers are drawn at their length, so a 2 m sturgeon would cross a third of the screen. Swimmers are capped in pixels, as now.
- **Palette growth:** 59 species × 4–6 keys per area could add a few hundred keys. They're grouped by `fish_<species>_<area><n>` and shared where species really share colours (the whitefish silvers, the trout olives).
- **Rods:** real weights reach 117 kg (sturgeon), past The Long Rod's 18 kg. Big sturgeon, carp and catfish simply don't bite on today's rods (`maxMass`, as now). A heavier rod is a later choice for the user, not part of this plan.
- **Economy:** a Red Room full of big fish could break the pacing targets. Phase 68 tunes base prices until `--pacing` passes.
