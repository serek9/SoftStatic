# SoftStatic: Real Fish and Real Tackle, Phases 68–73 (built)

Adds phases after the approved spec; decisions are in PLAN.md §8.3 #347–396.

**The user's rules:** every fish is a real North American species and every lure a real lure type, painted as our own sprites with real detail (never traced). Plain and realistic: no rarities, no odd parts. Each species lives where it really lives (PLAN_WATERS.md §3). Old fish in saves were dropped.

## 1. Size classes
Weights fall in **size classes** S (under 0.45 kg), M (0.45–2.3), L (2.3–9.1), XL (9.1–27), XXL (over 27). Lures are sold in the same classes. A fish wants its lure **type** and a lure **size** that covers it. The card shows the class.

## 3. Design

### 3.1 Species data (V5 schema, as changed)
Each species keeps `id, name, locations, habitat {depthMin, depthMax}, speed, strength, fatigue, mass, lengthCm, weightKg, awareness, caution, timeLikes, price, look` and gains:
- `latin`: the scientific name, shown small on the journal page.
- `family`: perch, bass & sunfish, pike, trout & salmon, whitefish, sucker, minnow, catfish, herring & shad, smelt, mooneye, cod, sturgeon, flatfish, rockfish, greenling, temperate bass.
- `lureTypes`: `{ spoon: 2, crank: 1, … }`. 2 is its preferred type, 1 is other types real anglers catch it on. Types not listed are ignored.
- `sizes`: the weight range comes from **real biology**, not inflated game ranges. The size class S–XXL of each catch follows from its weight.

Removed: `rarity`, `wrongness`/`parts`, `windows`, `uneaseMin`, `desc` riddles, `hintRefs`, `baitLikes`. Live baits work through the lures that carry them (the bobber and the dropshot carry a worm). See 3.3.

**Who bites, with no rarity:** a species turns up only if it lives in this water, the lure is at a depth in its habitat, the hour suits it (`timeLikes`: walleye at dusk and dawn, burbot and catfish at night, bass and sunfish by day), the lure's type is in its `lureTypes`, and the lure's size classes cover the fish's size. Its weight is 1, ×2 for its preferred type, ×1.5 in its hours. No species is "rare". The big ones are hard because they need the right lure, the right depth and a rod that holds them.

**Prices:** a base per species set from its real table value and size, × the existing size factor. `economy.rarityMult` goes. The V8 pacing targets (spec) must still pass (`--pacing`).

### 3.2 Where each species lives
Settled in PLAN_WATERS.md §3 and PLAN_WINTER.md §3 (checked by `--homes`).

### 3.3 Tackle
- The 23 lures replace the 7. Each has a `type`, `sizes` (classes it fishes for), a cost (scaled to our economy so `--pacing` and `--tackle` pass), and a swim action:

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
- (The Red Room water was later retired, PLAN_WATERS.md 4.4.)

### 3.5 The fish painter (the art)
A new painter in `gfx/fishgen.js` replaces the body plans and wrong parts. Each species gets its own **anatomy spec** in `data/looks.js` or a new `data/fishlooks.js`:
- **Body:** a profile (back and belly curves as control points), head length, snout shape (pointed, blunt, duck-billed, underslung sucker mouth, sturgeon rostrum), mouth size and gape, jaw line.
- **Fins:** each fin's place, length, height, shape, ray count, spiny or soft, membrane translucency. Adipose fin, forked/square/rounded tail, the sturgeon's heterocercal tail, the halibut's long dorsal and anal fins.
- **Head:** eye size and colour with ring and highlight, the gill plate drawn as a curve, barbels (catfish, carp, sturgeon, burbot), teeth where they show (pike, lingcod).
- **Surface:** scale rows (size per species, drawn as deliberate strokes, not noise), the lateral line, scutes (sturgeon).
- **Colour:** per species ramps of 4–6 palette keys for back, flank, belly and fins, added to `sprites.js` under a `fish_` prefix (8.3 #84: no hex outside the palette, flat clusters, no dithering).
- **Markings** as layered strokes: vertical bars (perch, walleye's saddles), spots (trout: black, red with blue halo for brook, X marks for rainbow), worm-tracks (brook trout's back), the pink band (rainbow, steelhead), the red cutthroat slash, pike's bean spots, muskie's bars, tiger trout's vermiculation, the bluegill's ear flap, crappie's speckle, carp's scale net.
- **Resolution:** the portrait at its native size, **about 88×48 px for a typical fish**, with no scaling (one pixel size). The card's portrait box grows from 80×40 to 96×56 and the card widens to fit. The journal plate shows it at full size. Grid tiles show a smaller version painted at that size from the same spec, not scaled down. Swimmers under water are painted from the same spec at their length on screen, with the tail-beat frames as now (Phase 27).
- A `?gallery` page, `fish`, shows all 59 portraits side by side.

### 3.6 Lure art
Each of the 23 lures gets its own icon, **about 38 px wide**, painted in palette keys. Those are for the shop's case, the setup panel and the HUD's chip. A matching under-water sprite moves with its action: blades turning, the paddle tail beating, the glide's sway, the wacky worm's shimmy, the float riding the swell. The size variants (Big, Deep, Heavy, Huge) differ in size, lip length, weight and colourway.

## 4. Phases
- **68 The species:** `data/fish.js` rewritten with real data; rarity and the strange fish removed from sim and UI; save v7.
- **69 The tackle:** 23 lures with costs, sizes and actions (new `dropshot`, `wacky`, `glide`, `rattle`, `kick`); the shop and setup panel page through them; save v8.
- **70–72 The fish painter** and every species painted (perch and bass; trout, salmon, char and whitefish; the rest), with the `fish` gallery page.
- **73 Lure art:** 23 icons and under-water sprites.

Swimmers are capped in pixels; big fish past a rod's `maxMass` simply don't bite.
