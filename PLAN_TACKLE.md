# SoftStatic: Tackle, Company and a Living Lake, Phases 41–50 (built)

Adds phases after the approved spec; decisions are in PLAN.md §8.3. Every fisher, dog, lure, panel and creature is our own design in our palette keys (8.3 #84).

## 2. The design

### 2.1 Stowing the rod and taking the tiller (Phase 41)
A or D starts the boat at once (input never blocked) and the fisher catches up: reel in, lay the rod in two clips along the gunwale, turn and take the tiller (his far hand pulls the start cord). The tiller arm swings with direction and throttle. On stopping he lifts the rod back; a cast key cuts the act short (≤0.4 s). Everything is in the boat's local frame, so it flips with it.

### 2.2 The dog barks, sometimes (Phase 42)
A synthesised bark with a pitch per dog. Rare, soft ambient barks (at birds, a jump, a big catch, the shop bell, the far shore at night): at most one bout every 3–8 min, never during a bite or hook-set. Pause → *Dog barks: On/Off* (`save.settings.dogBark`). The legendary-spot cue stays a silent pose.

### 2.3 Rods you choose and lures you choose (Phase 43)
Rods are a rack you own, each with power and action: Cane (light/slow, 3 kg), Ultralight Wand (best for tiny fish), Fibreglass, Graphite, Lacquered, The Long Rod (heavy, longest cast, small fish come off). New sim number `smallHook`. `save.gear.rods` lists owned ids, `save.gear.rod` is the one in use. Lures (spinner, crankbait, soft plastic, popper, jig, later more) sit beside the live baits; the hook carries one (`save.gear.tackle`).

**User's answers:** lures are sold in small counts and are lost to a snap or a thrown hook (never to a snag); with none left the hook falls back to unlimited worms. Fishers and dogs are all unlocked from the start.

### 2.4 Not every fish wants it (Phase 43)
`fish.takes` maps tackle to interest: 2 loves, 1 takes, 0 ignores (never notices), with optional night/depth modifiers. The journal shows "Takes: …" as catches prove it. A loved lure is noticed from farther (awareness × 1.3).

### 2.5 The setup panel on S (Phase 45)
On the boat with the line in: S opens a small panel with **Rod** and **Hook** columns (W/S move, A/D column, Space picks, S/Esc close). Petting the dog moves to ↓ and a click/tap on it. Touch gets a Tackle button.

### 2.6 Smaller fish (Phase 44)
About ten small species (3–10 cm); sizes inside a species skewed so small ones are common; the Ultralight Wand is their rod.

### 2.7 Small menus (Phase 46)
One shared panel style (`G.ui.panel`): a small rounded rectangle in `night_ink` with a one-pixel `paper` rim, a title tab, the fine font, at most ~240×140, anchored to a corner or the top, the world **not** dimmed. The catch card is compact at the top centre (portrait, name, size, value, "new!", Keep/Sell keys). The pause menu is a narrow list on the right. The journal and the shop's text box keep their own looks.

### 2.8 Choosing the fisher and the dog (Phase 47)
The fisher is the same figure in different colours and hats; the dogs are a golden retriever, a husky, a Saint Bernard and a poodle, each with its own coat, ears, tail and bark pitch. Pause → *Fisher & dog* opens a picker with a preview. Cosmetic only, saved in `save.look`. (Phases 126–127 later replaced these with the user's drawn sheets.)

### 2.9 A lake that is an ecosystem (Phases 48–49)
Presentation only (`G.vrng`), under the dusk ceiling; creatures react to the boat and splashes and vary by water and hour. **Under water:** crayfish, snails, mussels, litter, fry clouds that part, tadpoles, a turtle, an eel at night, a diving duck, more weeds, silt puffs. **Above:** ducks and ducklings, a heron, a kingfisher, a loon, dragonflies, frogs, water striders, a deer at dawn and dusk, a beaver, a fox, gulls; reeds, pads, trunks, a lodge, rocks, varied tree silhouettes. With unease some turn quietly wrong (a heron that never moves, a deer with no reflection). Never startling, never harms the dog.

### 2.10 What changes in the simulation
Only Phases 43 and 44 (rods, lures, `takes`, new species, the size curve). All checks were re-baselined.

## 3. Phases
41 stow and tiller · 42 the dog's voice · 43 rods and lures · 44 small fish · 46 small menus · 45 the setup panel · 47 fisher and dog · 48 life under water · 49 life above water and a richer background · 50 fitting it in (performance, debug, gallery).
