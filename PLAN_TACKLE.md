# SoftStatic: Tackle, Company and a Living Lake, Phases 41–50

**Date:** 2026-10-30. **Repo state:** Phases 1–40 done (PLAN.md §8.1), `main` at `1460d47`.
**Status:** Asked for by the user on 2026-10-30 ("read the handoff.md and make a plan to improve: the animation of saving the rod when you are going to move the boat, and when the boat moves the main character grabs the motor or steering wheel; the dog barks sometimes (can be switched off in settings); you can select the fishing rod (low action for small catches, big action for big catches, ..) and the type of lure (spinners, minnows, soft plastics, ..) when the line is not in the water (like in Cast n Chill); before throwing the line you can prepare the setup (with a click on "S") choosing rod and lure; you can select different characters and dogs just like in Cast n Chill; more detail and variety of details and objects in the depths and in the background (add animals, make it look like an ecosystem); the menus of the catch and other types of menus should be small and with a similar style like in Cast n Chill; not every fish should be interested in the type of lure that you throw; make smaller fish as well"). The user answered §4 the same day (see §4) and asked to start: Phases 41–48 are done (PLAN.md 8.3 #209–261); Phase 49 is next, on the user's go-ahead.
**Read with:** PLAN.md §0 (conventions, required) and §8 (status). Like PLAN_ROD.md and PLAN_SHOP.md, this file adds phases after the approved spec and does not edit §0–§7 or Appendix V. Where a phase changes something the spec describes (V8's rod tiers, V5's fish schema), §8.3 records the decision; the spec text stays as it is.

Cast n Chill is a reference for **feel and scale** only (small menus, a tackle choice before the cast, a choice of fisher and dog). Every fisher, dog, lure, panel and creature here is our own design, painted in our palette keys under the pixel-art rules (8.3 #84), with our names. Nothing is copied from its art, names or layouts.

---

## 1. What exists today (verified in the code)

| Part | What the code does now | Where |
|---|---|---|
| Moving off | A/D move the boat at once; the outboard pull-starts on the first move (`boat.js` `M`, `startT`), the fisher leans back on throttle (`b.lean`). **He keeps the rod in his hands**, or it stays in the holder, while the boat runs; nobody touches the motor. | `js/scene/boat.js` 96–151, 350; `js/scene/fisher.js` |
| Rod holder | One holder on the gunwale before his knees (`HOLDER`, `HOLDER_ANGLE` 38°, 96° upright for the lure act); acts `PLACE`/`TAKE` carry the rod there and back. There is no stowed, lying-down place for the rod. | `js/scene/fisher.js` 24–82 |
| The dog's bark | Only a **cue**: a silent `bark` pose (2 frames) when the boat passes within 80 px of a spot where a legendary lives, re-armed after 160 px. No bark sound; no ambient barking; no setting. | `js/scene/dog.js` 73–124 |
| Settings | Pause menu: Volume and Sound (mute), saved in `save.settings`. | `js/ui/menu.js` 69–137 |
| Rods | Five **tiers** in a ladder (`gear.rods`, Cane → The Long Rod): `castMax`, `maxMass` (heavier fish never bite), `attract`. Owning one means `save.gear.rod = index`; buying the next replaces it. No choice between rods, no "small fish" rod. | `data/gear.js`, `js/sim/economy.js` 5–39 |
| Baits | Four **live baits** (worm, cricket, minnow, the unlabelled jar), counted and consumed; no artificial lures. Each has its own sprite and motion under water. | `data/gear.js`, `js/scene/underwater.js` 1038 |
| Preference | `fish.baitLikes`: a fish whose list does not hold the bait **never notices** it (`fish_ai.baitOk`), and `baitLiked` 2 / `baitOther` 0.6 weight the species pick. So "not every fish wants this" exists for baits, but there is nothing to choose among lures. | `data/fish.js`, `js/sim/fish_ai.js` 14, 68, 150, 241 |
| Choosing gear | Only in the shop (buying a rod, putting a bait on). Nothing on the boat. | `js/ui/shop.js` |
| The S key | `KeyS`/`ArrowDown` → `down`. On the boat, stopped and sailing, `down` **pets the dog**. | `js/core/input.js` 13, `js/scene/sailing.js` 1423 |
| Fisher and dog | One fisher (red cap, green jacket) in layers with IK arms, and one dog, each painted in code; top-down versions of both in the shop room. No choice. | `js/scene/fisher.js`, `js/scene/dog.js`, `js/ui/shop_room.js` |
| Smallest fish | 36 species; the smallest are 6–12 cm (0.05–0.15 kg). Nothing smaller, and size within a species is a single random `q`. | `data/fish.js` 127 |
| Catch card | A 400 × 248 paper card in the middle of the screen (portrait, name, size, ruled lines, Keep/Sell buttons), the world dimmed behind it. Pause and tape are also large panels. | `js/ui/card.js` 12, `js/ui/menu.js`, `js/ui/tape.js` |
| Life | Bats at night, fireflies on the creek, the far fish shoals (Phase 30), drizzle, the owl. Underwater: bed, boulders, snags, weed, light shafts. No birds on the water, no animals on the shore, nothing living on the bed. | `js/scene/sailing.js` 38–74, 1336–1351; `js/scene/underwater.js` |

## 2. What the user asked for, and the design

### 2.1 Stowing the rod and taking the tiller (Phase 41)
When A or D is pressed with the boat stopped, the boat starts as it does now (input is never blocked, §0.14), and **the fisher catches up**:
1. If a line is out, the reel-in that already happens on a move runs; the lure comes up under the tip.
2. **Stow:** he lays the rod down along the gunwale in two **rod clips** (a new stowed place, the rod near-horizontal, tip toward the bow), the lure hooked to the keeper ring so it no longer swings.
3. **Turn and take the tiller:** his torso and head turn toward the stern, his near hand reaches back and closes on the outboard's tiller handle. The pull-start is now *his* act: on the first move his far hand pulls the cord (the motor's existing `startT`), then joins the near hand or rests on his knee.
4. **Steering:** while under way the tiller arm swings with direction and throttle (a small angle per `b.ax`, the twist-grip turned by `throttle`), his body leans with `b.lean`, his head looks ahead, the dog's ears already blow (Phase 24).
5. **Stopping:** when the boat is `stopped`, he lets go of the tiller, turns back, lifts the rod out of the clips and is ready to cast. A key pressed for a cast during any of this cuts the act short (the same `abort` as the idle director), so a cast is never delayed by more than the 0.4 s it takes to pick the rod up.

The boat is drawn flipped when it faces the other way; the tiller, the clips and the arm targets are in the boat's local frame, so they flip with it.

### 2.2 The dog barks, sometimes (Phase 42)
- **A bark sound**, synthesised like the rest of the kit (Phase 25): a short formant burst, two pitches per dog (2.5 gives each dog its own), under the water bus's reverb.
- **Ambient barks**, rare and soft: at a heron or duck that comes close (Phase 49), at a fish that jumps near the boat, once when a big catch lands, at the shop's bell, now and then at nothing on the far shore at night. At most one bout every 3–8 minutes, 1–3 woofs, never during a bite or a fight's hook-set, never loud (§0.14: no jumpscares).
- **The setting:** Pause → *Dog barks: On / Off* (`save.settings.dogBark`, default On). Off silences every bark and drops the ambient ones; the legendary-spot **cue** (10.3) stays as the silent pose it is today, because it is a hint, not a noise.

### 2.3 Rods you choose and lures you choose (Phase 43)
**Rods become a rack you own, not a ladder.** Each rod has a **power** (what it lands) and an **action** (where it bends; `rod.js` already models action per tier):

| Rod (name to be painted) | Power / action | maxMass | Small fish | Notes |
|---|---|---|---|---|
| Cane Rod (have it) | light / slow | 3 kg | good | the starter, as now |
| Ultralight Wand (new, cheap) | ultralight / fast | 1.2 kg | **best**: tiny fish hook far more often, fights with small fish last longer and pay a small bonus | lets the new small fish (2.6) be fished on purpose |
| Fibreglass Rod | medium-light / moderate | 4.5 kg | good | |
| Graphite Rod | medium / fast | 7 kg | fair | |
| Lacquered Rod | medium-heavy / fast | 11 kg | poor | |
| The Long Rod | heavy / extra-fast | 18 kg | **poor**: small fish short-strike and come off | for the big ones, longest cast |

The simulation gains one number per rod, `smallHook` (how likely a fish well under the rod's comfortable range is to stay on), and keeps `castMax`, `maxMass`, `attract`. Buying a rod adds it to `save.gear.rods` (a list of owned ids) and `save.gear.rod` becomes the id in use. Prices stay where V8's pacing put them (the ladder's costs are kept), so progression still reads as upgrades, but an old rod is never wasted.

**Lures as a second kind of tackle**, bought once and kept (calm tone: a snapped line does not take the lure):

| Lure | Where it swims | How it moves (presentation) | Who wants it |
|---|---|---|---|
| Spinner | mid water, on the retrieve | a turning blade that flashes, a steady line | perch-like and pike-like hunters |
| Minnow plug (crankbait) | dives to a set depth while reeled | a tight wobble, sinks slowly at rest | predators; ignored by bottom feeders |
| Soft plastic (worm / grub) | sinks to the bed, hops on short reels | a wavy tail, puffs of silt on each hop | bottom fish, many species, the all-rounder |
| Popper | stays at the surface | a cupped face that spits a ripple on each twitch | surface feeders at dusk and night |
| Jig | sinks fast, lifts and falls | a skirt that flares | deep fish, the creek's current |

Live baits (worm, cricket, minnow, the jar) stay as they are; the hook carries **either** a bait **or** a lure. `save.gear.bait` becomes `save.gear.tackle` (`{ kind: 'bait' | 'lure', id }`), migrated from the old field.

### 2.4 Not every fish wants it (Phase 43, with 2.3)
`fish.baitLikes` grows into `fish.takes`: a map from tackle id to **interest** — `2` loves it, `1` takes it, `0` ignores it (never notices, as `baitOk` already does), and an optional `night` or `depth` modifier ("takes a popper only after dark"). Every species gets a full row; most take three to five things and ignore the rest, a few are fussy (one lure only), and the strange ones keep their strange tastes (the unlabelled jar). The journal's line "Bait: …" becomes "Takes: …" and reveals entries as they are proven by a catch, as the hints do now. A fish that ignores the lure swims past it (it already does for baits); a fish that *loves* it turns toward it from farther (`awareness × 1.3`).

### 2.5 The setup panel on S (Phase 45)
- **When:** on the boat, the line not in the water (sailing, stopped or moving, or between casts). With the line out, S does nothing new.
- **What:** a small panel (2.7's style) with two short columns: **Rod** (the owned rods with their power/action as two tiny bars and maxMass) and **Hook** (live baits with their counts, then lures). W/S or ↑/↓ move, A/D switch column, Space picks, S or Esc closes. Picking shows on the boat at once: the fisher lifts the chosen rod from the clips (2.1) and ties on the lure in a short version of the Phase 34 `lure` act, which can be cut short by casting.
- **The input:** S is now `down`, which pets the dog when stopped. Petting moves to **↓ alone and a click/tap on the dog**, and `KeyS` gets its own action `setup` (8.3 records it). Touch gets an on-screen *Tackle* button next to M.
- The shop keeps selling; it no longer is the only place to choose.

### 2.6 Smaller fish (Phase 44)
- **New small species**, two or three per water (about ten in all), 3–10 cm and 5–60 g: a fry-sized shiner, a darter on the bed, a stickleback in the weed, a creek dace, a tiny Pines bluegill, and one small strange one in the Red Room. Cheap to sell, quick fights, each with its own takes (mostly crickets, worms, soft plastics and the spinner's smallest size), the journal fills a little faster early.
- **Size spread inside a species:** the size draw is skewed so small individuals are common and big ones rare (a power curve on `q`, deterministic from `G.rng`), so a "perch" can be a palm-sized one.
- **Rod power matters:** with `smallHook` (2.3) the Ultralight Wand is the rod for them; on The Long Rod they mostly short-strike.
- **Drawing:** `fishgen.swimmer` already scales by length; Phase 44 checks the smallest bodies still read at 640×360 (a 3 cm fish is about 4–6 view pixels long) and gives the tiniest a simpler painter (no wrongness parts that need room).

### 2.7 Small menus (Phase 46)
One shared **panel style** (`G.ui.panel`): a small rounded rectangle in `night_ink` with a one-pixel `paper` rim, a title tab, the fine font, icons from the existing bakes, at most ~240 × 140 px, anchored to a corner or the top of the screen, the world **not** dimmed behind it.
- **Catch card:** a compact card at the top centre — the fish's portrait (smaller), name, length and weight, its value, a "new!" tag for a first catch, and *Keep / Sell* as two small keys. The long journal-style text moves to the journal; the card stays two or three lines.
- **Pause:** a narrow list at the right side (Resume, Volume, Sound, Dog barks, Fisher & dog, Export, Import).
- **Setup** (2.5), the **tape**'s summary, the **map**'s place card and the shop's item window adopt the same frame. The journal (a book) and the shop room's text box keep their looks.

### 2.8 Choosing the fisher and the dog (Phase 47)
- **Four fishers and four dogs**, all original: e.g. the current fisher; an older one with a white beard and a knit hat; a young one in a yellow rain jacket and a bucket hat; one in a check shirt and a headlamp. Dogs: the current one; a small wiry terrier; a big pale shepherd-like dog; a low long-bodied dog. Names are placeholders for the user to choose.
- **How:** Pause → *Fisher & dog* opens a small picker (2.7) with both side by side, A/D to turn through them, a preview standing in the boat; or the cabin's door has the same picker. All are available from the start (cosmetic only, nothing to buy), saved in `save.look = { fisher, dog }` (save v5 or the same migration as 2.3).
- **What it takes:** the painters become parameterised by a **look** record (body width, head shape, hat, hair, beard, jacket and trouser keys, skin key; for dogs body length, leg height, ear shape, tail, coat keys). Every pose of the side view (`fisher.js` layers and IK arms, the tiller of 2.1, the beer and lure acts) and the shop room's top-down sprites take the record. Each look is baked once when chosen. Each dog's bark (2.2) has its own pitch.

### 2.9 A lake that is an ecosystem (Phases 48–49)
Everything here is presentation (`G.vrng`, `js/gfx` and `js/scene`), never changes catches, and keeps under the dusk ceiling. Creatures react to the boat and to splashes through `fx.listen` (as the shoals do) and are different per water and per hour.

**Under water (48):**
- **On the bed:** crayfish that walk and back off when the lure lands near them, snails on boulders, freshwater mussels half buried, caddis-fly cases on snags in the creek, a sunken bottle, a lost lure on a snag, a tyre in the Pines, old roots.
- **In the water:** clouds of fry near weed that part around a predator and around the lure; tadpoles in the shallows (season-free, just near the shore); a turtle that crosses slowly at mid depth now and then; an eel along the bed at night; a diving duck's feet and its body passing down and up (paired with 49).
- **Plants:** more kinds of weed (ribbon, fern-like, lily stems reaching to pads at the surface), algae on boulders, a drowned tree's branches; each water its own mix.
- **Light and particles:** fine silt that rises where something touches the bed (crayfish, soft plastic hops, a fish nosing the bottom).
- **Food chain beats:** a predator fish darts at the fry and the cloud breaks; a heron's beak comes down through the surface (49) and takes a small fish; nothing ever harms the dog (§0.14).

**At the surface, on the shore and in the sky (49):**
- **Water birds:** a duck and ducklings paddling along the far water (they paddle away from the boat), a heron standing in the shallows that strikes now and then, a kingfisher on a branch that dives, a loon (call at dusk, dives and comes up elsewhere).
- **Insects and small life:** dragonflies over the reeds by day, a frog on a lily pad that plops in when the boat comes, water striders' tiny rings, a rising fish's ring.
- **Shore animals:** a deer drinking at the far shore at dawn and dusk (lifts its head and leaves when the boat comes close), a beaver swimming with a V-wake to its lodge, a fox along the Pines' parking lot at night, gulls on the Pines' pier posts.
- **More background objects, varied per water:** reeds and cattails in clumps, lily pads, fallen trunks reaching into the water, a beaver lodge, rocks along the shore, an old dock's posts, a duck box on a pole, a boat moored at the far shore with a light at night. The far forest gets a few kinds of tree silhouette instead of one, and the painted layers use a placement seed per water so the shore is not regular.
- **The liminal stays:** with unease, some of these turn subtly wrong and quiet (a heron that stands there all night without moving, a deer whose reflection is not there, ducks that all face the boat). Optional, never startling.

### 2.10 What changes in the simulation
Phases 41, 42, 45, 46, 47, 48 and 49 are presentation (and save fields for settings and the look). **Phases 43 and 44 change the simulation on purpose** (rod `smallHook`, lures, `takes`, new species, the size curve): the replay hash moves, and `--pacing` (20 seeds), `--passive`, `--fight` and `--saves` must all PASS within V8's bands after retuning, with `--validate --strict` clean. Passive mode uses the tackle on the hook and the rod in use, the same way.

## 3. Order

```
41 Stow and tiller ─┐
42 The dog's voice ─┼─> 46 Small menus ─> 45 The setup panel (S) ─> 47 Fisher & dog ─> 48 Life under water ─> 49 Life above ─> 50 Fitting it in
43 Rods & lures ────┤
44 Small fish ──────┘ (needs 43)
```
46 comes before 45 so the setup panel is built in the new style. 43 and 44 go before 45 so it has something to choose.

---

## Phase 41: Stowing the rod and taking the tiller

| ID | Task | Files | Done when |
|---|---|---|---|
| 41.1 | **Rod clips.** A stowed place on the gunwale: two clips painted on the hull, the rod's angle near horizontal, its butt and tip in the boat's local frame; `rod: 'clips'` beside `'hand'` and `'holder'`; the lure hooked to the keeper (no pendulum while stowed; as built, reeled snug under the tip-top, 8.3 #212). | js/scene/fisher.js, js/scene/boat.js | `dbg.fisher()` shows `rod: 'clips'`; the drawn rod lies in both clips, flipped or not; the dangle is still. |
| 41.2 | **The tiller.** The outboard gets a tiller arm with a twist grip, its angle from `b.ax` and the grip from `throttle`; new hand targets `tiller` (near hand) and `cord` (far hand for the pull-start, timed to `startT`). | js/scene/boat.js, js/scene/fisher.js | Under way the near hand is within 0.5 px of the grip every frame; the pull-start's cord stroke spans the motor's `M.start`. |
| 41.3 | **The acts `stow`, `steer`, `unstow`.** Started by the boat moving and stopping (not by the idle director); `stow` = reel-in finish → clips → turn → tiller; `unstow` = let go → turn → lift from clips. A cast key aborts into a quick lift. | js/scene/fisher.js, js/scene/sailing.js | From stopped to moving the hands reach the tiller in ≤ 1.0 s; stopping to rod-in-hand ≤ 1.2 s; a cast pressed mid-act starts within 0.4 s; input is never ignored. |
| 41.4 | **Checks.** A `dbg.sail(dir, s)` helper and a headless run: move, stop, move the other way, cast mid-stow. | js/core/debug.js | The run reports every target reached, no hand jump > 2 px a frame, no page errors; `--replay` unchanged. |

## Phase 42: The dog's voice

| ID | Task | Files | Done when |
|---|---|---|---|
| 42.1 | **The bark sound**, synthesised; `cue('bark', pitch)`; distance and the water bus as the other sounds. | js/audio/engine.js | The level meter shows each woof under the reel's peak; no clipping. |
| 42.2 | **Ambient barks:** a scheduler on `G.vrng` (one bout per 3–8 min, 1–3 woofs) and event barks (a near jump, a big landing, a bird close by from 49 later, the shop's bell); never during the bite window or the hook-set. The bark pose plays with the sound. | js/scene/dog.js, js/scene/sailing.js, js/ui/shop.js | In a 30-minute headless run: bouts within the limits, none inside a bite or hook-set, the legendary cue unchanged. |
| 42.3 | **The setting** *Dog barks* in the pause menu, `save.settings.dogBark` (default true, added on load if missing). Off: no sound, no ambient barks; the legendary cue stays silent and visible. | js/ui/menu.js, js/core/save.js | `--saves` PASS; with Off, a 30-minute run plays 0 barks and still shows the cue pose. |

## Phase 43: Rods you choose and lures you choose (simulation)

| ID | Task | Files | Done when |
|---|---|---|---|
| 43.1 | **Rod data:** power, action (feeding `rod.js`'s action instead of the tier index), `smallHook`; the new Ultralight Wand. | data/gear.js, js/gfx/rod.js | `--validate` checks every rod's fields; `--rod` PASS with action read from data. |
| 43.2 | **Lure data:** five lures with depth behaviour (`swim: 'mid' | 'dive' | 'bed' | 'top' | 'lift'`), `attract`, cost (bought once). | data/gear.js | `--validate` OK. |
| 43.3 | **`takes` for every species** (36 + those of 44), replacing `baitLikes` (kept as a read-only alias for old checks during the phase); journal hints rewritten from it. | data/fish.js, js/ui/journal.js | `--validate` fails a species with no row or an unknown tackle id; every water has a catchable fish for every tackle the player can own there. |
| 43.4 | **The sim reads them:** `fish_ai` notice/interest from `takes` (0 ignores, 2 widens awareness ×1.3), the species weight from interest, `smallHook` in `bite`/`fight` (a fish under 25% of the rod's maxMass may short-strike), the lure's depth band for where it rests and swims. Passive uses the same. | js/sim/fish_ai.js, js/sim/bite.js, js/sim/fight.js, js/sim/passive.js | `--replay 12345` deterministic twice (new hash recorded in 8.5). |
| 43.5 | **Owning and choosing:** save v5 (`gear.rods` list, `gear.rod` id, `gear.tackle`, `gear.lures`), migration from v4; `economy` buy/equip; the shop's rack sells rods you can keep and a lure shelf. | js/core/save.js, js/sim/economy.js, js/ui/shop.js, js/ui/shop_room.js | `--saves` loads every milestone save into v5 with the same rod in hand; buying a rod keeps the old one. |
| 43.6 | **Under water:** each lure's sprite and motion (blade flash, wobble and dive on the retrieve, tail wave and bed hops with silt, surface pops, the jig's flare). | js/scene/underwater.js, js/gfx/fishgen.js or a new js/gfx/lures.js | The gallery shows each lure's frames; the lure rests in its depth band in a headless run per lure. |
| 43.7 | **Balance:** retune `takes`, `smallHook` and prices. | data/* | `--pacing` (20 seeds), `--passive`, `--fight` PASS within V8's bands. |

## Phase 44: Smaller fish

| ID | Task | Files | Done when |
|---|---|---|---|
| 44.1 | **About ten small species** (3–10 cm) across the four waters with depths, hours, `takes`, descriptions and hints; portraits and swimmers. | data/fish.js | `--validate` OK; each water has 2–3. |
| 44.2 | **The size curve** inside a species (more small, fewer big), from `G.rng`; prices follow size as now. | js/sim/*, data/gear.js `economy` | Over 10,000 draws per species the median is under the range's midpoint and the top 5% reach the top tenth. |
| 44.3 | **Small fish on the screen:** the smallest swimmers read (a simpler painter under 8 cm), the fry-sized fight's camera and rod load look right (a small fish barely bends a heavy rod, bends the wand well). | js/gfx/fishgen.js, js/scene/underwater.js | Gallery page of the small species; `--rod`: a 0.05 kg fish's tip deflection on the wand ≥ 3× that on The Long Rod. |
| 44.4 | **Balance** with 43. | data/* | `--pacing`, `--passive`, `--fight`, `--saves` PASS. |

## Phase 46: Small menus

| ID | Task | Files | Done when |
|---|---|---|---|
| 46.1 | **`G.ui.panel`:** the shared frame (rim, tab, padding, key hints), drawn natively, palette keys only. | js/ui/panel.js (new), index.html | The gallery shows the frame at three sizes. |
| 46.2 | **The compact catch card** at the top centre; no dimming; Keep/Sell keys and taps. | js/ui/card.js | The card fits in 240 × 140; a landing to a sale is still one key; touch zones work. |
| 46.3 | **Pause, the tape's summary, the map's place card, the shop's item window** in the frame. | js/ui/menu.js, js/ui/tape.js, js/ui/map.js, js/ui/shop.js | Each overlay fits its bounds; every action reachable as before. |

## Phase 45: The setup panel (S)

| ID | Task | Files | Done when |
|---|---|---|---|
| 45.1 | **The `setup` action** on `KeyS` (and a touch button); petting moves to ↓ and a click/tap on the dog. | js/core/input.js, js/scene/sailing.js | S opens the panel only with the line out of the water; ↓ and a tap still pet the dog. |
| 45.2 | **The panel:** Rod and Hook columns (owned rods with power/action bars and maxMass; baits with counts; lures), live while open (the boat keeps drifting; the clock runs). | js/ui/setup.js (new) | Every owned item can be picked; the choice is saved and used by the next cast and by passive. |
| 45.3 | **On the boat:** the chosen rod in hand, a short tie-on act for a lure change, cut short by a cast. | js/scene/fisher.js, js/scene/boat.js | The drawn rod's tier and the hanging lure match `save.gear` in the frame after the panel closes. |

## Phase 47: Choosing the fisher and the dog

| ID | Task | Files | Done when |
|---|---|---|---|
| 47.1 | **Look records** in data (four fishers, four dogs: shapes and palette keys, a bark pitch). | data/looks.js (new) | `--validate` checks the keys exist in the palette. |
| 47.2 | **Parameterised painters** for the side-view fisher (every pose, the tiller, the acts) and dog (every pose), and the top-down shop sprites. | js/scene/fisher.js, js/scene/dog.js, js/ui/shop_room.js | The gallery shows every look in every pose; IK arm joints line up for every body width. |
| 47.3 | **The picker** in the pause menu and at the cabin door; `save.look`. | js/ui/look.js (new), js/ui/menu.js, js/ui/cabin.js, js/core/save.js | `--saves` PASS; a look change bakes in under 60 ms and shows at once. |

## Phase 48: Life under water

| ID | Task | Files | Done when |
|---|---|---|---|
| 48.1 | **Bed life:** crayfish (walk, back off from a near landing), snails, mussels, caddis cases, litter per water. | js/scene/underwater.js or js/scene/life.js (new) | Present per the water's table; react to `fx.listen` splashes within 0.3 s. |
| 48.2 | **Fry clouds** near weed that part around predators and the lure; tadpoles in the shallows; a turtle and a night eel on rare rhythms. | js/scene/life.js | No two fry overlap; the cloud re-forms in 2–4 s. |
| 48.3 | **More plants and silt:** new weed kinds, lily stems to the surface, algae, silt puffs. | js/scene/underwater.js | Each water has its own mix; under-water draw still ≤ 1 ms. |

## Phase 49: Life above the water and a richer background

| ID | Task | Files | Done when |
|---|---|---|---|
| 49.1 | **Water birds:** ducks with ducklings, the heron (its strike reaches under water in 48's view), the kingfisher, the loon (its call in the audio kit). | js/scene/life.js, js/audio/engine.js | They keep away from the boat; the heron's strike is seen on both sides of the surface. |
| 49.2 | **Small life and the shore:** dragonflies, a frog on a pad, striders, the deer at dawn/dusk, the beaver and its lodge, the Pines' fox and gulls. | js/scene/life.js, data/loc_*.js (`life` tables) | Each animal shows only at its waters and hours. |
| 49.3 | **Background objects:** reeds, cattails, pads, fallen trunks, rocks, dock posts, a moored boat, more tree silhouettes; per-water placement seeds. | js/gfx/paint.js, js/scene/scenery.js, data/loc_*.js | Every water's shore uses at least four kinds of object; bake times within 8.5's budget. |
| 49.4 | **The liminal touches** with unease (2.9), quiet and optional. | js/scene/life.js | Appear only above the unease threshold; never a sudden sound or motion. |

## Phase 50: Fitting it in

| ID | Task | Files | Done when |
|---|---|---|---|
| 50.1 | **Gallery pages** for tackle, looks and life; `dbg` helpers (`dbg.tackle(rod, hook)`, `dbg.look(f, d)`, `dbg.life()`). | js/core/debug.js, gallery | Every new sprite is on a page. |
| 50.2 | **Performance:** a full frame at night with life, drizzle and an anomaly. | — | 60 fps; frame cost within 8.5's budget. |
| 50.3 | **All checks** and the handoff. | PLAN.md §8, HANDOFF.md | `--validate --strict`, `--replay`, `--pacing`, `--passive`, `--fight`, `--saves`, `--rod` all PASS; numbers recorded. |

---

## 4. The user's answers (2026-10-30)

1. **The S key:** yes. S opens the setup panel; petting moves to ↓ and a click/tap on the dog.
2. **Rods as a rack:** yes. One rack, each rod its own power and action, today's prices kept, plus the cheap Ultralight Wand.
3. **Lures can be lost and run out.** This replaces 2.3's "bought once and kept": lures are sold in small counts like the live baits; a snapped line or a fish that throws the hook takes the lure on the line (a snag never does: it comes free). With none of a lure left it greys out in the setup panel and the hook falls back to worms (unlimited), as baits do now. Phase 43.2/43.5 store lure counts in `save.gear.lures` and 43.7 prices them so that losing one is felt but never stops play (§0.14: no fail states).
4. **Fishers and dogs, all unlocked from the start.** The fisher stays **the same figure** in different colours and hats (jacket, trousers, cap or hat, hair and beard keys): no new body shapes, so 47.2 is a recolour and a hat set, not new painters. The dogs imitate four breeds: a **golden retriever** (today's dog), a **husky**, a **Saint Bernard** and a **poodle**; each has its own coat, ears, tail and bark pitch, on the existing dog poses.
5. **Start with Phase 41.**
