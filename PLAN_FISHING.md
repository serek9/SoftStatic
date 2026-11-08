# PLAN_FISHING.md: The bite, the lures and the fun (Phases 101–107, proposed)

> Asked for by the user on 2026-11-08: "the fish's bite should be clear: if a fish is going to
> bite there can't be a tangle of fish on top of it where you can't see it bite; only the fish that
> can bite comes close and bites, and the moment is clearly visible, together with a strong bite
> sound. Check every kind of hook so that when it falls and is dragged (or more line is let out,
> ADD THIS) it behaves as in reality and does or doesn't draw a fish depending on the species. Do
> more tests fishing with every hook and check that they all work and that the game is FUN AND
> ADDICTIVE." Proposed phases; work starts on the user's OK. PLAN.md §0 holds throughout.

## 1. What the audit found (verified in the code and in the running game)

### 1.1 The bite is lost in a crowd
- `js/sim/fish_ai.js`: up to 8 fish; any fish that notices the lure goes notice → approach →
  inspect (circling at 10 px) → nibble → bite, **each on its own**. Nothing stops five fish from
  circling and nibbling at once. `js/sim/bite.js` only makes sure one fish is in `bite`: the
  others carry on circling and nibbling around it.
- Measured (headless Chromium, Fogbound, worm at noon, 150 s of fishing,
  `scratchpad/audit/crowd.js`): at **every** bite there were **4 or 5 fish within 24 px** of the
  lure (states like `bite, nibble, inspect, inspect, approach`); over the whole session 3 or more
  fish sat within 24 px of the lure **60%** of the time. That is the tangle the user sees.
- The bite itself is quiet. The biting fish just holds 4 px off the lure (`hover`, `M.holdK`): no
  lunge, no visible take. The sound is a soft knock: gain 0.025–0.075 by style (`FEEL` in
  `sailing.js`; `engine.js` "the bite"), next to splashes at 0.1+. On a float the dip is shown;
  under water there is nothing to see.
- The four bite styles by species (tap, thump, slam, mouth) already exist and are good: they set
  the rod's load, the float's dip and the knock. They are kept and made louder and visible.

### 1.2 The lures: one score for everything, and no way to give line
- One button: while sinking a tap stops the lure; while waiting, holding reels. **There is no way
  to let line out.** You can't drop a lure back to the bottom, let it fall on a slack line, drift it
  downstream in a river, or let a float ride away.
- `underwater.js lureStep` gives every lure its own retrieve (the crank dives, the jig hops, the
  spoon wobbles, the glide S-glides, the dropshot drags on the bed: Phases 65 and 69). But:
  - **The fall** is the same for almost all of them: a straight drop at `sink` × a speed, ×0.55 for
    a spoon. A spinnerbait doesn't helicopter, a spoon doesn't flutter from side to side, a jig
    doesn't dive head first, a wacky worm doesn't fall flat and slow, a swimbait doesn't hang nose
    up.
  - **On the bottom** nothing happens. A jig or a crank touching the bed raises no silt and doesn't
    deflect; a dragged dropshot or a worm leaves no trail.
  - **Live baits:** the worm just sinks. A cricket sinks like a stone (a real one floats and
    kicks). A minnow doesn't swim on the hook.
- **What draws a fish** is one number, `cast.work` 0..1: how well the lure's style is kept
  (steady, stop-and-go, popper, slow). It is the same for every species: a pike and a carp judge a
  jig the same way. Which species comes at all depends on `fish.lureTypes` (the lure's type), the
  depth and the hour, not on how the lure moves. **So the way a lure falls or is dragged doesn't
  change which fish it draws.** That is exactly what the user wants to change.
- The balance model (`tools/balance.js session`) works every lure perfectly (`work: 1`): no check
  ever fishes a lure the way the game does. `--tackle` took over 300 s and was stopped.

### 1.3 Fun
- The loop is sound: cast, wait, signs, bite, fight, card, milestones (Phases 88–96). What's
  missing is **readable anticipation**: you can't see one fish come, hesitate and decide (the
  crowd hides it), and the reward of the hook-set is the same whether it is sharp or late.
- There is no learning curve in the lures: since every species judges a lure the same way, there
  is nothing to discover ("pike strike on the pause", "trout want flash"). Discovery is the hook
  that keeps a fishing game going.

## 2. The phases

Each phase ends with its own `dbg.*` and Node checks (§0.13). Phases 101, 104 and 105 change the
simulation: the replay hash changes, and `--pacing` and `--first` are rerun and their targets kept.

### Phase 101: One fish at a time (simulation)
- **The turn.** `fish_ai`: one **suitor** per lure. Only the suitor may inspect, nibble and bite.
  Any other fish that notices the lure goes to a new state, **`hold`**: it waits at a distance
  (30–45 px, at its own depth, facing the lure, finning), and then either
  - takes the next turn when the suitor leaves (the nearest holder that is still keen), or
  - gives up after its patience (4–8 s by species) and swims off.
  At most two holders; others just swim past. Suitors are picked by who arrives first.
- A suitor that is put off (refuses, shies at the line, misses) swims off fast and clearly, out
  of the 45 px ring, before the next turn starts (≥ 0.6 s gap).
- The arrival rate is retuned so bites per minute stay as before (`--pacing`, `--first` and a new
  check give the numbers).
- **Check, `node tools/balance.js --bite`** (new): 20 seeds × 10 min at three waters. At every
  bite, exactly **one** fish within 24 px of the lure; fish within 24 px ≥ 2 in < 2% of steps;
  bites per minute within ±15% of today's. Plus `dbg.school()` (suitor, holders) and an overlay line.

### Phase 102: The strike you see and hear (presentation)
- **The approach reads:** the suitor comes in, stops a body length off (a beat, 0.3–0.6 s by
  style), and then **strikes**: a short lunge onto the lure, the lure vanishes into its mouth (drawn
  at the mouth from that frame), the body kicks round, and a puff of bubbles (silt on the bed). By
  style: a tap is a quick peck and back, repeated; a thump is one lunge and hold; a slam is a fast
  lunge from farther off that carries on; a mouth is a slow suck-in.
- **On the line:** the line snaps straight in 0.1 s, the rod tip is yanked down (by style and
  weight), the float goes under (as now, faster), and a ring and a dent where the line enters.
- **A strong bite sound:** a new layered sound in `engine.js`: a deep thump through the rod, a wet
  "gulp" (a splash and a chomp near the surface, a muffled one deep), the line's twang and a quick
  run of ratchet clicks. About 3× today's knock, compressed and on the effects bus so the master
  limiter keeps it from startling (§0.14: firm, not a jumpscare). With Reduce flashes the visual
  flash is softer; the sound stays.
- **HOOK cue:** the action prompt pulses with the strike, and the phone buzzes (as now).
- **Check:** `dbg.strike()` returns the last strike: style, lunge distance and duration, the
  lure-at-mouth frame, the sound's peak; a headless run screenshots a strike for each style, and
  measures the bite sound's peak against the knock's (≥ 2.5×) and under the limiter's ceiling.

### Phase 103: Letting out line (input, simulation of the lure)
- **New control:** while the lure is in the water and no fish is on, **hold Down (S / ↓)** (touch:
  a new LINE button over REEL) to **open the bail**: line pays out at a set rate, with a soft clicking
  spool sound and the line going slack.
  - A sinking lure **free-falls** straight down from where it is (each lure in its own way:
    Phase 104), and lands on the bed if you keep giving line.
  - A floating lure (popper, crank at rest, float) and a live bait **drift away**: with the wind on
    a lake, downstream in a river (trotting a float down a run).
  - In a current any lure is carried downstream as line is given.
  - Release Down to close the bail. Reeling still takes line back.
- Line out is capped (the rod's cast length + 40 px). The line drawn (rope) shows the slack and
  the belly, and tightens when you reel.
- The cast line's length becomes state (`cast.line`), so a fish taking a slack line takes a
  moment longer to show (realistic, and a reason to keep slack short).
- **Check:** `dbg.line()` (line out, bail open); a headless run holds Down for 3 s with each kind of
  hook and asserts the line got longer, a sinking lure got deeper, a float drifted with the wind
  or current, and nothing changes while a fish is on.

### Phase 104: Every lure moves as it really does (presentation + the lure's state)
For each hook, how it **falls** (slack line / tight line), how it **sits on the bed**, how it
**drags**, and how it **runs**. The lure exposes a small motion state for the fish (speed, falling,
on the bed, paused for t s, flash, thump) that Phase 105 reads.

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

- **Check:** `dbg.lureMotion()` and a headless sweep that drops, drags and retrieves every hook
  and records its path. A Node table asserts each hook's fall rate, side sway (spoon, spinner),
  bed contacts (jig, crank, dropshot) and float (cricket, crank, topwater) against the table.

### Phase 105: Every species takes it its own way (simulation, data)
- Each species gets a **feeding profile** in `data/fish.js`, from how the real fish feeds:
  - **zone:** bed, low, mid, high, surface;
  - **pace:** still, slow, steady, fast;
  - **triggers:** the fall, the pause after a run, flash, vibration, the bed contact, scent (live
    bait), the surface;
  - **follows:** a predator (pike, muskie, bass, trout) follows a moving lure and strikes on the
    pause or at the boat. You see it follow: a shadow behind the lure.
- The lure's motion (Phase 104) is scored **against the species** instead of one `work` number: a
  jig hopped on the bed draws a walleye and a perch, a fast spinner in mid-water a trout, a worm
  lying still a carp or a catfish, a popper at dawn a bass. A lure fished wrong for everything here
  draws nothing; fished right for one species it draws that species more often.
- The journal learns what you saw: when you catch a fish, its page notes the hook and how it was
  fished, e.g. *"Took a jighead hopped on the bed"*. The first time a species follows and turns
  away, Rusty's tip says what it wanted.
- **Check:** `--tackle` rewritten (and made fast: one process, fewer minutes) to fish every hook
  with its **right** and **wrong** handling. Every species' top three handlings match its profile;
  every hook has at least one species here that prefers it; the wrong handling takes ≥ 2× as long
  to a bite.

### Phase 106: Fishing every hook (the angler bot)
- A headless **angler bot** (`tools/angler.js`, Playwright, the real game) casts, sinks, lets out
  line, and retrieves each of the 26 hooks with its proper technique, at the water and hour it
  suits, for a set time, setting the hook as a player would (a reaction time of 0.25–0.5 s).
- Its report, per hook: time to the first fish, bites a minute, the share hooked, misses, the
  species caught, the longest wait with nothing near the lure, how often more than one fish was
  near at a bite, page errors.
- **Targets** (to confirm with the user): every hook lands a fish at its best water within 3 min;
  hooked ≥ 70% with a 0.4 s reaction; the longest dry spell < 90 s with the right hook; no bite with
  more than one fish within 24 px.
- Everything the bot finds broken is fixed in this phase.

### Phase 107: Fun and pull (tuning, small rewards)
- Tune from Phase 106's numbers: waits, the hesitation's length, the follow's frequency.
- **The hook-set feels good:** a set inside the first 0.4 s is a **clean set** (a sharper sound, the
  rod snapping up, a "Clean set" word for a beat) and a firmer hook hold (it already exists:
  `bite.hold`, now shown).
- **Near misses that pull you back:** a big fish's shadow follows and turns away; a missed bite
  says how the fish took it ("A tap: strike sooner").
- **The journal as a goal:** each species' page shows its profile as you discover it (zone, pace,
  triggers, best hook), filled in by what you have seen.
- **Check:** the bot's report again (Phase 106's targets), and `--pacing` and `--first` still PASS.

## 3. Order and what to confirm

101 → 102 (the bite is clear: the user's first point) → 103 → 104 (giving line and the lures'
motion) → 105 (the species) → 106 (testing every hook) → 107 (tuning and rewards). One commit per
phase; one push and one PR at the end (the user's word).

**To confirm with the user before starting:**
1. The new control: hold **Down (S / ↓)** to let out line, plus a LINE button on touch.
2. The bite sound about 3× today's knock, under the limiter (firm but never startling, §0.14).
3. Phase 106's targets (a first fish within 3 min with any hook at its best water, ≥ 70% hooked,
   dry spells under 90 s).
4. Phase 107's rewards: the "Clean set" word, the near misses, and the profile in the journal.
