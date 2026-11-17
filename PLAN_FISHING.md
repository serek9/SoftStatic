# SoftStatic: The Bite, the Lures and the Fun, Phases 101–107 (built)

Adds phases after the approved spec; decisions are in PLAN.md §8.3. Goal: a clear, single bite you see and hear; every hook behaving as it really does; each species judging it its own way; fun and pull.

## Phases

### Phase 101: One fish at a time (simulation)
One **suitor** per lure may inspect, nibble and bite. Others that notice go to **`hold`** (30–45 px off, facing the lure), take the next turn when the suitor leaves, or give up after 4–8 s. At most two holders. A put-off suitor swims clear (≥0.6 s gap). Bite rate retuned to stay as before. Check: `--bite`; `dbg.school()`.

### Phase 102: The strike you see and hear (presentation)
The suitor stops a body length off for a beat, then strikes by style (tap: quick pecks; thump: one lunge and hold; slam: fast from farther; mouth: slow suck-in); the lure vanishes into its mouth. The line snaps straight, the tip is yanked, the float goes under. A layered bite sound (thump, gulp, twang, ratchet), about 3× the old knock but under the limiter: firm, never startling. The HOOK prompt pulses and the phone buzzes. `dbg.strike()`.

### Phase 103: Letting out line (input)
With the lure in the water and no fish on, **hold Down (S/↓)** (touch: LINE button) to open the bail: sinking lures free-fall, floating ones and live baits drift with wind or current. Release to close. Line out is capped at the rod's cast + 40 px and is state (`cast.line`). `dbg.line()`.

### Phase 104: Every lure moves as it really does
Each hook's fall, bed and drag behaviour, and retrieve; the lure exposes a motion state (speed, falling, on the bed, paused time, flash, thump) for Phase 105. Checked in the real game by `node tools/lures.js`.

| Hook | Falls | On the bed / dragged | Retrieve (as now, checked) |
|---|---|---|---|
| Worm (live) | slowly, wriggling | wriggles; dragged it rolls and leaves a silt trail | crawls |
| Cricket (live) | **floats**, kicking; sinks only when pulled under | – | skitters |
| Minnow (live) | swims down and around on the hook, tiring | swims just over the bed | swims against the pull |
| Bobber / Deep Bobber | the bait settles to its depth under the float | the float rides the wind and current | the float skates in |
| Crank (×3) | floats up when paused | **bumps the bed**: a silt puff and a deflection | dives to its depth with speed |
| Spinnerbait (×2) | **helicopters** down (the blade turns, the fall slows) | – | rises with speed |
| Spoon (×3) | **flutters** side to side as it falls, flashing | – | wobbles, flashes |
| Dropshot (×2) | the weight drops, the worm on top | the weight on the bed, the worm quivering above it; dragged it puffs silt | shaken in place |
| Wacky worm | falls **level and slow**, both ends shimmying | lies still; a twitch lifts it, and it falls again | twitch and drop |
| Jighead (×2) | falls **head first**, fast | **hops**, a puff of silt at each touch | lift and drop |
| Topwater | floats | – | pops, walks |
| Bladebait (×3) | falls fast, flat | – | short sharp lifts that vibrate |
| Glidebait (×2) | sinks slowly, level | – | wide S-glides |
| Swimbait (×2) | sinks slowly nose up | – | the paddle tail beats with speed |

### Phase 105: Every species takes it its own way (simulation, data)
A **feeding profile** per species in `data/fish.js`: zone (bed…surface), pace (still…fast), triggers (fall, pause, flash, vibration, bed contact, scent, surface), and whether it **follows** a moving lure (a shadow behind it) and strikes on the pause. The lure's motion is scored against the species. A lure fished wrong draws nothing. The journal notes how each fish was taken. Check: `--feed`.

### Phase 106: Fishing every hook (the angler bot)
`tools/angler.js` fishes every hook in the real game with its proper technique at its best water and hour, reacting in 0.25–0.5 s. Targets (realism first, "not always"): a fish within 3 min, ≥70% hooked, dry spells under 90 s, never two fish at a bite.

### Phase 107: Fun and pull
A set inside 0.4 s is a **clean set** (sharper sound, the rod snaps up, "Clean set" for a beat, firmer hold). Near misses pull you back: a big shadow follows and turns away; a missed bite says how the fish took it ("A tap: strike sooner"). The journal shows each species' profile as you discover it.
