# SoftStatic: Improvement Audit (Cast n Chill comparison)

**Date:** 2026-10-28. **Repo state audited:** `main` at `3fd1832` (Phases 1–12 done, next planned task 13.1 Audio engine).
**Mode:** research and planning only. No source file was changed to produce this document.
**Read with:** `CLAUDE.md`, `PLAN.md` §0 (conventions) and §8 (status). PLAN.md §0–§7 and Appendix V are the approved spec. Nothing here overrides them. Where a suggestion bends a spec rule, it says so and needs the user's approval first.

Labels used in this document:
- **[V]**: verified. Seen in the code, in the running game (headless screenshots taken for this audit) or stated by a cited source.
- **[S]**: design suggestion or inference.
- **[U]**: unverified or uncertain.

---

## 1. Executive summary

**Cast n Chill** (Wombat Brawler, two-person Australian studio, PC June 2025, Switch/Switch 2 December 2025) is a side-view pixel-art fishing game with an idle mode. Critics average about 86–87 on OpenCritic, and its Steam reviews are "Overwhelmingly Positive". Reviewers praise its success for three things, much more than for mechanical depth:
1. **Atmosphere first.** Painterly skies, still-water reflections, and light that visibly changes over the day. Reviewers compare it to *Kingdom Two Crowns*.
2. **Sound carries the feel.** One reviewer calls sound design "the real triumph": water against the moving boat, silence broken by the reel, and a fish's run that you can hear.
3. **Low friction.** Two buttons, a forgiving reel, an excellent optional idle mode, upgrades that never feel like a grind, and a dog you can pet.

The common criticisms are thin late-game content, fishing that some players find simplistic, and fish or character sprites that are sometimes hard to read.

**SoftStatic** is mechanically further along than its looks suggest. Every sim system named in the plan exists and passes its checks: tension fight, auto-player, clock windows, unease, anomalies, passive mode, the tape, save migrations, and deterministic replay. Its weakest areas are the ones Cast n Chill excels at:
- **There is no audio at all.** The volume and mute settings control nothing.
- **The sky is flat.** It is a two-colour linear ramp that comes out a muddy brown. There is no moon, stars or clouds, and the "grey hours" look like the most saturated sunset of the day.
- **"Fogbound Lake" has almost no visible fog**, and "fog thickens in grey hours" was never built (§8.4 #1).
- **Water and underwater views are correct but static.** They have no glints or light path, and the underwater fish are small.
- **Few small "juice" moments.** The bite cue is 1–2 px, the catch card pops in, and bought gear (the lantern) is invisible on the boat.
- **Three of the four waters can be bought but have no fish.** This is a real dead end for a player.

**The good news:** most of the high-impact fixes are presentation-only (`js/gfx`, `js/scene`, `js/ui`, the new `js/audio`). They leave `js/sim` and `data` alone, so the replay hash and the pacing baselines stay unchanged, which makes them safe to verify.

**Top recommendations (ranked):**
1. P0: the audio engine plus core feedback sounds (Phase 13, enriched with what Cast n Chill does).
2. P0: fix the "bought an empty lake" dead end. Use an interim map gate now, and the rosters (14.1–14.4) after that.
3. P1: sky rework. Use the palette's unused dusk keys, add a moon, stars and cloud bands, and make the grey hours read as overcast.
4. P1: living fog that drifts and thickens with the grey hours and unease.
5. P1: water light (a moon or sky-glow path and moving glints), plus ambient life such as fish-rise rings that hint where fish are, moths and bats.

---

## 2. Research findings: Cast n Chill

### 2.1 Method and limitations (read this first)
- Every external fact below comes from **web search result summaries**. A direct fetch of the Steam store page, Vice and Shacknews failed: the hosts are outside this cloud session's network allowlist.
- **I did not watch any trailer or gameplay video, and I did not view any Cast n Chill screenshot.** No claim below describes footage first-hand. Visual statements are what reviewers wrote.
- No developer interview text was found. A NostalPix headline mentions one, but its text was not reachable.
- Not found in any source, so treat as unknown: sonar or fish finders, weather or rain, fish jumping, and exact camera behaviour beyond "the camera drops below the surface after the cast".

### 2.2 Findings by topic

| # | Topic | Finding | Confidence |
|---|---|---|---|
| 1 | Core loop | Cast, reel, sell at Rusty's Bait & Tackle, then buy gear (rods, lures, line, boats, coolers) and **fishing licences** that open new waters with new species. About 13–16 spots and about 50 fish. The cooler fills up, which forces trips back to shore; bigger coolers are an upgrade. | [V] multiple reviews, Wikipedia |
| 2 | Fishing feel | Reeling is a tension rhythm: release when the fish pulls hard, reel when it tires. It is **forgiving**: "you can mess up several times without losing your catch." The line snaps when the gear is too weak, and some fish are nearly impossible without upgrades. Some fish only take certain lures. Rods set the reachable depth. | [V] GameIndustry, Twin Geeks, guides |
| 3 | Feedback | "You can tell when a fish is trying to make a run by the sound it makes." Sound is a primary fight cue. | [V] review quoted in search |
| 4 | Water and environment | Reviewers were "blown away by the water effect". They mention "reflections on the still water", sunsets, and scenes that "look like a painting, getting better the longer you look". Each spot has "its own critters swimmin' round" (store text). | [V] Vice, Good Game Lobby, store text via Nintendo Life |
| 5 | Lighting and time | "Pixel art landscapes that evolve based on the time of day", and "the quality of the light changed through the course of the day". The style is compared to Kingdom Two Crowns: "moody skies and painterly backgrounds". | [V] multiple reviews |
| 6 | Camera | After the cast, "the camera breaks below the surface, showing the fish". The view is split above and below the water and shifts with line depth, so you can see nearby fish and change bait or position. | [V] reviews; exact easing [U] |
| 7 | UI and UX | "Two buttons, that's it." The game does not overload you with systems or skill trees. The logbook is the collection goal, and its fish illustrations are praised. Criticism: the art is sometimes too soft to tell which fish is which underwater. | [V] Shacknews, WellPlayed, Good Game Lobby |
| 8 | Progression | Upgrades are paced so there is no forced grind. Licences gate new areas. The late game is thin once the logbook is complete. | [V] multiple reviews |
| 9 | Sound | "The real triumph": the sound of water as the boat moves, silence broken by the reel, the chug of the motor, wildlife ambience and gentle music. | [V] Vice, Cost.games, Gamebrain sample |
| 10 | Why it relaxes | It can be played as a second-monitor idle game that fishes, swaps gear and sells on its own; reviewers call it "a playable exhale". Failure costs little, there is no time pressure, and the dog is always there and can be petted. One reviewer suspected petting makes the dog bark at good fish, while hedging that they might be reading too much into it. | [V]; dog-bark link [U] |
| 11 | Small details with big effect | The dog, petting, reflections, light changing over the day, motor and reel sounds, the logbook art, and an idle mode that does everything. | [V] synthesis |

### 2.3 Transferable principles [S]
1. **Mood is carried by light and sound, not by systems.** A simple loop feels premium when every second of waiting is pleasant to look at and listen to.
2. **Every action has a sound, and the sound carries information.** A run, a bite or a tired fish are heard before they are read.
3. **Visible change over time.** The world must look different at different hours, or the clock is invisible.
4. **Forgiveness and low input.** SoftStatic already has this, with its slip rule, gentle escapes and no fail states.
5. **Small, affectionate details.** A dog you can pet, and gear that shows up on the boat.
6. **Idle mode as a real feature,** good to watch on a second monitor.
7. **Readable silhouettes** for the things the player needs to identify, such as fish. This is the one place Cast n Chill gets criticised.

### 2.4 Reference URLs
- Wikipedia: https://en.wikipedia.org/wiki/Cast_n_Chill
- Steam (not reachable from this session): https://store.steampowered.com/app/3483740/Cast_n_Chill/
- OpenCritic: https://opencritic.com/game/18729/cast-n-chill and https://opencritic.com/game/18729/view/reviews
- Shacknews review: https://www.shacknews.com/article/144913/cast-n-chill-review-score
- Vice review (sound, water, dog): https://www.vice.com/en/article/cast-n-chill-is-an-idle-and-active-fishing-game-that-has-become-my-new-go-to-when-i-want-to-relax-review/
- Good Game Lobby review: https://goodgamelobby.substack.com/p/cast-n-chill-review-cozy-pixel-art-idle-fishing-game-2025-wombat-brawler
- GameIndustry review (forgiving reel): https://www.gameindustry.com/reviews/game-review/cast-n-chill-delivers-a-perfectly-peaceful-fishing-adventure/
- The Twin Geeks (tension): https://thetwingeeks.com/2025/06/21/cast-chill-hook-line-and-sinker/
- QuestDaily (Kingdom Two Crowns comparison): https://questdaily.com.au/review/review-cast-n-chill-just-you-a-boat-and-vibes-pc/
- WellPlayed: https://www.well-played.com.au/cast-n-chill-review
- LadiesGamers: https://ladiesgamers.com/cast-n-chill-review/
- Hooked Gamers (7.1, "monotonous"): https://hookedgamers.com/pc/cast_n_chill/review/article-2652.html
- Upgrades list: https://cozygamingpanda.com/cast-n-chill-all-upgrades-for-your-rod-lures-and-boat/
- Cooler and licences: https://www.qualbert.com/reviews/cast-n-chill-review/ and https://aywren.com/2026/03/18/steam-gaming-cast-n-chill-semi-idle-cozy-fishing-game/
- Steam discussion on fishing criticism (title only, not read): https://steamcommunity.com/app/3483740/discussions/0/838346462692667074/
- Cost.games (ambience): https://cost.games/us/news/cast-n-chill-fishing-for-the-soul
- Nintendo Insider, Switch 2 review: https://www.nintendo-insider.com/cast-n-chill-switch-2-review-edition/

---

## 3. Current repository assessment

### 3.1 How this was checked
- I read PLAN.md §0–§4, §8 and Appendix V, and HANDOFF.md "Pending work". I targeted reads of `js/scene/sailing.js` (fog painter, camera, sky, draw order), `js/gfx/water.js`, `js/scene/underwater.js` (draw path), `js/gfx/fx.js`, `js/scene/boat.js`, the palette in `js/gfx/sprites.js`, `data/loc_fog.js` and `js/core/debug.js`.
- I ran the game headless with Playwright at `?debug&seed=7` and `?debug&seed=11`, with the debug DOM hidden, and captured about 30 screenshots: the lake at 19:00, 03:00 and 12:00, sailing, cast, underwater, fight (holding and easing), catch card, an anomaly, journal, map, creek, Pines, Red Room, shop, cabin and the tape. **There were no page errors.**
- Baselines run today [V]:
  - `--validate`: `OK (4 warning(s))`, the rosters.
  - `--replay 12345`: `hash 2265718513 / 2265718513 … PASS: identical`.
  - `--pacing`: all PASS (6.0 catches, creek 32.3 min, red 324.4 min).
- Size: about 6,100 lines of JS across 33 files. The overlay showed 59–60 fps in headless Chromium, a reflection pass of 0.4–0.6 ms, and 27 baked canvases taking about 130 ms in total.

### 3.2 Category table

**A. Implemented and working [V]**

| Area | Notes | Files |
|---|---|---|
| Fixed-step loop, RNG split, save v4 with migrations, export and import, one tab owning the save | Solid. Replay is deterministic. | `js/core/*` |
| Cast: charge, parabola, marker, splash, ripples | Works. Distance is √charge, which is forgiving. | `js/scene/sailing.js` (`CAST`, `landingX`, `flight`) |
| Fish AI, bite window, V4 tension fight, slip forgiveness, auto-player | Matches the spec. The fight line tints amber when tension is high (seen in the screenshots). | `js/sim/fish_ai.js`, `bite.js`, `fight.js`, `js/scene/underwater.js` |
| Mirror reflection with row sine shift, plus reflection deltas | Looks good and is cheap (under 1 ms). | `js/gfx/water.js` |
| Underwater cross-section | Gradient, bottom, weeds (4 frames), light shafts, background silhouettes, motes, vertical camera to `maxDepth`. | `js/scene/underwater.js` |
| Clock, unease, anomalies, owl, dog cues, late journal hints | All live. | `js/sim/clock.js`, `unease.js`, `js/scene/dog.js`, `data/anomalies.js` |
| Journal, shop, map, cabin, catch card, tape | Readable and charming. The shop and cabin interiors are the best-looking screens in the game. | `js/ui/*` |
| Passive (live and time away) and `?compact` | Works. Income share is 61.6%. | `js/sim/passive.js`, `js/ui/tape.js`, `js/core/loop.js` |
| Red Room | Strongest location identity: curtains, zigzag floor and a crimson reflection. | `data/loc_red.js`, `js/scene/scenery.js` |

**B. Implemented but needs improvement**

| Area | What I saw [V] | Files |
|---|---|---|
| Sky | `skyColor` blends only `night_ink` to `dusk_amber` linearly in 1 px bands, so it comes out muddy brown. Brightness peaks at **15:00**, so the grey hours (07–17) are the *most amber* time; 12:00 looks the same as 19:00. At 03:00 it is near-flat black. There is no moon, stars, clouds or horizon glow. The palette keys `dusk_violet`, `dusk_plum` and `dusk_rose` are never used in the sky. The upper half of the screen (y 0–110 of 180) is empty gradient. | `js/scene/sailing.js` (`skyBrightness`, `skyColor`, `refreshSky`, `drawBackdrop`); `js/gfx/sprites.js` |
| Fog | The `fog` painter bakes static horizontal dashes (`fog_far` α 0.32, `fog_near` α 0.16). It moves only with camera parallax, never drifts, and is barely visible in the screenshots. It does not change with hour or unease (§8.4 #1). | `js/scene/sailing.js` (`painters.fog`), `data/loc_*.js` layers |
| Water surface | The mirror is good, but the only surface highlight is one baked 1 px `glint` row. There is no light path under a light source, and no moving specular dashes. | `js/gfx/water.js`, `sailing.js` (`glint`) |
| Underwater | A flat teal field. Fish are about 12×5 px, so wrongness parts are unreadable at 1×. There is no depth colour grading beyond the gradient, and no lantern light cone at night. | `js/scene/underwater.js`, `js/gfx/fishgen.js` |
| Bite and hook feedback | Visual only: a line dip and rod bob of about 1 px. It is easy to miss without sound. | `js/scene/underwater.js` (`catchStep`), `sailing.js` (`rodPose`) |
| Catch moment | The card appears at once, large and centred. The landing "lift" lasts 0.9 s. There is no splash or droplet arc as the fish leaves the water, and no ease-in. | `js/ui/card.js`, `underwater.js` (`LAND_TIME`) |
| Purchased gear | The lantern is only in the debug line. Nothing changes on the boat. The rod looks the same at every tier. | `js/scene/boat.js` (`draw`, `drawRod`) |
| HUD | "TAB passive" and the bait name stay on screen all the time, which is permanent clutter in a calm scene. | `js/ui/hud.js` |
| Creek scenery | Tall trunks with crown blobs read as floating lollipops along the top of the view. | `sailing.js` (`painters.trunks`), `data/loc_creek.js` |
| Pines | Very dark and flat at night. The set pieces (signal, diner) are small and dim. | `data/loc_pines.js`, `js/scene/scenery.js` |
| Live passive | Shows only the float and the rod: no fish, no underwater view and no idle animation (§8.4 #21). This is weak for a second-monitor mode, which is Cast n Chill's star feature. | `js/scene/sailing.js` (`passiveStep`, `drawPassiveLine`) |

**C. Planned but not built**

| Item | Plan ref |
|---|---|
| Audio engine, ambience, effects, Pines jazz, radio static | Phase 13 (13.1–13.4); `TODO(P13.x)` markers in `index.html`, `menu.js`, `underwater.js`, `sailing.js`, `scenery.js` |
| Full rosters (36 species), legendaries (the dog's bark, the cold hole) | 14.1–14.4 |
| Final balance, touch controls, performance audit, migration tests | 14.5–14.8 |
| Fog thickening in grey hours | §0.8 (no task; §8.4 #1 suggests 14) |

**D. Missing or problematic**

| Item | Why it matters |
|---|---|
| **The creek, the Pines and the Red Room can be bought but hold no fish** (§8.4 #2, #19) | A real player pays 300 coins at about 32 min and finds an empty lake. Passive there logs "Nothing bit" forever. This is the single biggest *functional* experience bug. |
| **Silence** | The volume and mute settings do nothing (§8.4 #4). The plan expects the bite, the slip and the heavy-fish hum to be partly audio cues. |
| No dog interaction | The dog is a cue-giver only. You cannot pet it. |
| Grey hours vs §0.8 intent | §0.8 says grey hours mean "fog thickens". Visually they are the warmest sunset. |
| Minor issues already logged | Two owls in the Pines (§8.4 #17), stale `tooHeavyNear` (#5), the shop always drains Fogbound's unease (#15). |

### 3.3 Strongest and weakest areas
- **Strongest:** sim architecture and determinism; the liminal systems (tape, phantoms, late hints, trophies) that give a real late game, which is Cast n Chill's main weakness; the Red Room; the shop and cabin interiors; the tooling (`tools/balance.js`).
- **Weakest:** audio (none); sky and atmosphere on the starting lake; feedback "juice"; empty locations.

---

## 4. Cast n Chill vs SoftStatic: comparison

Each row lists: what Cast n Chill does well, what SoftStatic does now, what should change, why, complexity (S under 2 h, M half a day, L a day or more), impact, and the files involved.

| # | Area | Cast n Chill [V] | SoftStatic now [V] | Change [S] | Why | Cx | Impact | Files |
|---|---|---|---|---|---|---|---|---|
| C1 | Sound | Sound is the triumph: boat on water, reel, a fish run you can hear, wildlife, gentle music. | None. | Phase 13 as planned, plus: a water-lap loop scaled by boat `vx`; reel clicks whose rate follows reeling; a rising "zing" when the fight enters `pull`; a soft bite "plip" at the line's entry point; distinct ambience per location. | Turns waiting into pleasure, and makes the bite and run cues readable without staring. | M–L | Very high | `js/audio/engine.js` (new, approved in §3), `index.html` |
| C2 | Light and time | Light visibly changes across the day; painterly skies. | Two-key brown ramp; grey hours look like peak sunset; empty sky. | A multi-stop sky through the existing dusk keys; grey hours desaturated toward `fog_mid` (overcast); moon and stars at night; slow cloud bands; a horizon glow band. | The 24-minute day becomes legible and beautiful. The overcast grey hours are SoftStatic's own take: a liminal dead noon, not sunshine. | S–M | Very high | `sailing.js` sky, `sprites.js` |
| C3 | Fog | n/a (Cast n Chill is clear). | Barely visible, static. | Drifting fog layers whose alpha and height follow the grey hours and unease; a low mist hugging the waterline that also appears in the mirror. | The location is literally named for it, it is SoftStatic's main mood tool (Silent Hill), and it fixes §8.4 #1. | S–M | High | `sailing.js` (`drawBackdrop`, fog painter), `data/loc_*.js` |
| C4 | Water | Reviewers "blown away" by the water and reflections. | Good mirror, no highlights. | A vertical, broken light path under the moon or the brightest sky band; a few drifting 1–3 px glint dashes; a darker contact shadow under the hull. | Cheap, and it is where the eye rests most of the time. | S | High | `js/gfx/water.js` |
| C5 | Ambient life | "Critters" at each spot; wildlife ambience. | Only fish underwater, and motes. | Fish-rise rings on the surface above active fish (a real hint, which fits pillar 2); moths around lamps (Pines); bats at night; fireflies at the creek; a distant shore light that sometimes goes out. | The world feels alive, and the hints fit "the uncanny is the fishing". | S–M | High | `js/gfx/fx.js`, `sailing.js`, `scenery.js` |
| C6 | Underwater reveal | The camera "breaks below the surface" to show the fish; split view. | An alpha cross-fade, then a vertical follow (works). | Ease the waterline down as a short camera dip, or a 0.3 s wipe instead of a pure fade. Add a faint lantern cone at night if a lantern is owned. Grade deeper water darker. | Adds a sense of place and depth, and gives the lantern a visible effect. | M | Medium | `js/scene/underwater.js` (`viewStep`, `draw`) |
| C7 | Fish readability | Criticised for blurry fish. | Crisp, but tiny. | Keep 1×, but add a 1 px dark outline to underwater fish, a slightly larger base size for uncommon and above, and one exaggerated wrong part that shows at 1×. | Rare-fish reveals should land; wrongness is the identity. | M | Medium | `js/gfx/fishgen.js` |
| C8 | Bite, hook, land juice | A forgiving rhythm plus sound. | 1 px cues, card pops. | Bite: a small ring at the line entry and a visible rod-tip dip (2–3 px), plus sound. Hook set: a splash burst and a rod snap. Landing: the fish arcs out with droplets; the card slides up with easing and takes less of the screen. | Rewards the core action every cast. | S–M | High | `underwater.js`, `sailing.js` (`rodPose`), `card.js`, `fx.js` |
| C9 | Visible upgrades | Boats and gear are bought and seen. | The lantern is invisible. | Draw a lantern on the bow with a warm `lamp_glow` halo (reflected too); vary rod colour or length by tier; small depth-finder light. | Makes purchases feel tangible. | S | Medium–high | `js/scene/boat.js` |
| C10 | Dog | Always beside you; can be petted. | Cue poses only. | Pet the dog: a key or click on the dog while stopped plays a lean or tail-wag pose for about 2 s. No rewards, no meter. In passive the dog naps. | Affection is cheap and powerful, and the guardrail "never harm the dog" becomes "actively love the dog". | S–M | High | `js/scene/dog.js`, `js/core/input.js`, `sailing.js` |
| C11 | UI calm | "Two buttons, that's it"; minimal. | Always-on labels. | Fade the HUD to 0 after about 6 s without changes; show it again on change or input. Show "TAB passive" only until the player has used it once. | A cleaner frame helps both the mood and screenshots. | S | Medium | `js/ui/hud.js` |
| C12 | Idle mode | Fully automatic, a second-monitor favourite. | Only the float bobs. | Passive visuals: the fisher idles (sips from a thermos cup with steam; a Twin Peaks coffee nod that stays original), the dog sleeps, occasional fish-rise rings, the float dips and the rod bends on a passive bite, and the fish is lifted on a catch. | It is the mode people leave running, so it should be lovely to glance at. | M | High | `sailing.js` (`passiveStep`, draw), `boat.js`, `dog.js` |
| C13 | Progression | Licences open new waters with new fish; the late game is thin. | Unlocks work but three waters are empty; a strong late game exists (the tape, phantoms, Red Room). | Stock the waters (14.1–14.4). Until then, gate the unstocked waters on the map ("The water is still settling"). | It removes the dead end. SoftStatic's late game is its competitive advantage, but only if players reach it. | S (gate) / L (rosters) | Very high | `js/ui/map.js`, `data/fish.js` |
| C14 | Location identity | Distinct biomes. | The Red Room is strong; the creek has odd trunks; the Pines is too dark. | Creek: shorter trunks with crowns above the view, or canopy silhouettes. Pines: brighter neon and signal reflections (still under the ceiling) plus fog under the lamps. | Each new licence should feel like a reward. | M | Medium | `sailing.js` painters, `scenery.js`, `data/loc_*.js` |

---

## 5. Prioritized improvement backlog

Each ID is used again in §6 (how to build it) and §9 (acceptance). "Visual-only" means it touches no `js/sim` or `data` logic used by the sim, so the replay hash and pacing must stay identical.

### P0: critical problems affecting function
| ID | Task | Cx | Notes |
|---|---|---|---|
| P0-1 | **Audio engine plus core feedback sounds**: 13.1, then the subset of 13.3 that carries function (bite plip, reel clicks, the tension tone with the slip, the run "zing", splash), then 13.2 ambience. | M–L | Already the next planned phase. The settings UI is non-functional until it exists. |
| P0-2 | **No more empty lakes**: an interim map gate for waters with no species (UI only) **or** pull rosters 14.2–14.4 forward. | S / L | The gate is UI-only, so pacing is unchanged. The user decides which. |

### P1: high impact, low cost (mostly visual-only)
| ID | Task | Cx |
|---|---|---|
| P1-1 | Sky rework: multi-stop ramp, overcast grey hours, moon, stars, cloud bands, horizon glow | S–M |
| P1-2 | Living fog: drift, grey-hour and unease density, a waterline mist that also shows in the mirror | S–M |
| P1-3 | Water light: moon or glow path, moving glints, hull contact shadow | S |
| P1-4 | Feedback juice: bite ring and visible tip dip, hook burst, landing arc with droplets, eased card | S–M |
| P1-5 | Visible gear: lantern with halo, rod tier look | S |
| P1-6 | Pet the dog (and the dog naps in passive) | S–M |
| P1-7 | Calm HUD: auto-fade, one-time TAB hint | S |

### P2: important, moderate effort
| ID | Task | Cx |
|---|---|---|
| P2-1 | Ambient life: fish-rise rings tied to the school, moths, bats, fireflies, a shore light | M |
| P2-2 | Passive presentation: fisher idle with thermos, float dip, lifted catch, sleeping dog | M |
| P2-3 | Underwater: eased camera dip, depth grading, lantern cone, fish outline and readability | M |
| P2-4 | Rest of Phase 13 (13.2 ambience beds per location, 13.4 jazz and radio static) shaped by C1 | M |
| P2-5 | Location identity pass: creek trunks, Pines lighting and fog | M |
| P2-6 | Rosters 14.1–14.4 (if not done as P0-2) | L |

### P3: optional polish
| ID | Task |
|---|---|
| P3-1 | Unease-tied drizzle: rain rings on the water and a softer mirror, never bright |
| P3-2 | "Still" mode (a key hides all UI, for screenshots) |
| P3-3 | Commit a small headless screenshot check script for visual regressions (`tools/`). Optional; Playwright is a dev-only tool, not a game dependency. |
| P3-4 | §8.4 minors: two owls in the Pines, stale `tooHeavyNear`, the shop's unease location |
| P3-5 | Touch controls (14.6), performance audit (14.7), migration tests (14.8) as planned |

---

## 6. Technical implementation recommendations

General rules (from §0; breaking them is a bug):
- Presentation code uses `G.vrng` or `S.hash`, never `G.rng`.
- `draw()` never mutates. Any time-varying offset is computed from a time value read in draw (e.g. `run.boat.t`), or advanced in `update`.
- No allocations per frame: preallocate typed arrays as `fx.js` does.
- Colours by palette key only. Add any new keys to `js/gfx/sprites.js` and nowhere else.
- No `fillText`.
- Sky and water must pass `S.skySafe` (the `dusk_high` ceiling).
- Every feature adds `dbg.*` hooks and an overlay line.
- New files need approval. `js/audio/engine.js` is already approved; anything else, such as `js/audio/sfx.js`, must be asked about.

### P0-1 Audio (`js/audio/engine.js`, `index.html` audio slot)
- **Follow §8.6 exactly for 13.1:** context on first input, music, ambience and effects buses, a master gain, an always-on `DynamicsCompressor` limiter, and volume and mute from `save.settings`.
- **Driving model:** the engine reads `G.state.run` each frame (or each step) and maps state to parameters. It never writes state. Edge-triggered sounds compare against the previous values it keeps itself, e.g. `fsm` changing to `hooked`, `fight.mode` changing to `pull`, `fight.slipped`, `cast.flying` ending (splash).
- **Synthesis recipes** (Web Audio only, no assets):
  - Water lap: a looping noise buffer, then a band-pass around 400–800 Hz with gain about 0.05 + |vx|·k and slow LFO amplitude.
  - Reel click: a short noise burst (5 ms) through a high-pass, repeated at a rate proportional to reel input while `fight` or `sinking` reel-up is active.
  - Tension tone: a sine or triangle at 180→420 Hz mapped from `fight.T`, very low gain, with a 100 ms smoothing time constant.
  - Run zing: on `pull` start, filtered noise with a falling band-pass, 0.4 s.
  - Bite plip: a sine blip at 900→500 Hz in 60 ms with low gain, panned by the entry point's screen x.
  - Splash: a noise burst through a low-pass, gain scaled by the splash power.
  - Ambience (13.2): drone (two detuned oscillators with a slow filter), wind (noise with an LFO), plus a per-location bed (creek: brighter running water; Pines: the lot hum at 60 Hz with harmonics; Red Room: a near-silent room tone).
- **Pan:** `StereoPannerNode` by screen x, clamped to ±0.6.
- **Tone guard:** every one-shot gets an attack of at least 5 ms, and no sound peaks over −12 dBFS before the limiter.
- **Check hooks:** `dbg.audio()` returns the context state, bus gains, master gain, limiter settings, active voices and the last 5 triggered events.

### P0-2 Empty lakes
- Gate (UI-only): in `js/ui/map.js`, a water whose `G.data.fish` list has no species for it (the check `--validate` already performs) shows "The water is still settling" and is not purchasable.
- `economy.canUnlock` and the pacing model are untouched. **Note:** the pacing model buys the creek, so if the gate is in the sim, `--pacing` changes. Keep it in the UI.
- Alternative: run 14.2–14.4 first. This is content-heavy and changes the replay hash and pacing, which must then be recorded in §8.5.

### P1-1 Sky (`js/scene/sailing.js`: `skyBrightness`, `skyColor`, `refreshSky`, `drawBackdrop`)
- **Ramp.** Replace the two-key lerp with a small per-hour table of stops chosen **from existing palette keys**: `night_ink`, `night_deep`, `night_blue`, `dusk_violet`, `dusk_plum`, `dusk_rose`, `dusk_amber`, `fog_dark`, `fog_mid`. For example:
  - 03:00: ink → deep → blue at the horizon.
  - 05:30–07:00 and 17:00–20:00: ink → violet → plum → rose → amber at the horizon.
  - Grey hours: `fog_dark` → `fog_mid` (flat, overcast, still under the ceiling).
  - Blend between the tables by hour. Keep the existing `S.skySafe` throw.
- **Spec note:** §0.9 says "the sky ramps only between `dusk_amber` and `night_ink`". Intermediate keys darker than `dusk_high` respect the ceiling but stretch the letter of that rule. **Ask the user** before doing this, and record it in §8.3 as an interpretation. Also confirm that the grey-hour overcast is wanted; it follows D2 and §0.8's "fog thickens".
- **Dither.** Use 2-colour ordered dithering between bands (a 2×2 Bayer pattern into the 1 px strip, which then needs a 2 px wide strip) to avoid visible banding. Keep it baked; rebake only when the key changes (already the case, every 0.05 h).
- **Moon and stars.** Bake once per location: stars as 1 px `fog_light` or `bone` points, at most `dusk_high`, placed with a hash so they are stable. Draw stars with alpha = night factor and twinkle a few by hash of time. The moon is a small baked disk (`bone` with a `fog_light` rim) at parallax about 0.05, high in the sky at night and hidden in the grey hours. It also appears in the mirror for free, because `drawBackdrop` is mirrored.
- **Clouds.** One or two long baked cloud-band layers (the `fog` painter style with taller, softer bands) at parallax 0.08–0.15. Drift them by `t × speed` in draw (pure: the offset derives from a time value). Their colour follows the hour: `dusk_plum` or `dusk_rose` lit undersides at dusk, `night_blue` at night.
- **Liminal touch [S].** At high unease the moon sometimes appears in the reflection only, or is a few px off from its reflection. This would be a new anomaly kind in `data/anomalies.js`, which is a data change and changes no replay because anomalies don't run in balance sessions (§8.3 #26). Only with the user's approval.

### P1-2 Fog
- Give fog layers a drift (`drift: px/s` in the loc data) and draw them with `ox = round(camPx × p + t × drift) mod layerWidth`, wrapping by drawing twice.
- **Density:** `alphaMul = base × (1 + 0.8 × grey(hour) + 0.6 × unease)`, where `grey(hour)` is a smooth 0..1 from the clock.
- Add a `mist` layer: a band of 6–10 px at `waterY - 4`, drawn after the boat in the main pass, so it softly covers the hull bottom. Because it is drawn through `drawBackdrop`, it is reflected too.
- **Thickness check:** `dbg.fog()` returns the current per-layer alpha.
- Grey or unease dependence uses `save.clock` and `save.unease`, which are read-only in draw, so the sim is untouched.

### P1-3 Water light (`js/gfx/water.js`)
- After the mirror rows, draw a light column under the moon's screen x (or under the brightest horizon band at dusk): 1–3 px wide dashes every 2 rows, x jittered by the same sine as the rows, colour `water_hi` or `dusk_rose`, alpha falling with depth.
- Add about 12 glint dashes (preallocated arrays, positions from `vrng` at setup) that drift slowly and blink by hash.
- Contact shadow: a 1 px `water_deep` ellipse under the hull, in `boat.draw`'s water row.
- Budget: keep `water reflection` under 1 ms on the overlay.

### P1-4 Feedback juice
- Bite (`underwater.js` `catchStep`, the bite branch): `fx.ripple` at the line entry `(cast.x1, waterY)` with r 2→7 over 0.6 s. Make the `rodPose` tip dip 2–3 px for 0.25 s.
- Hook set: `fx.splash(hook.x, waterY, 0.25)` and a rod snap (bend overshoot for 0.15 s).
- Landing: during `LAND_TIME` emit `splash` droplets along the arc (2–3 per step, at most 20 in total).
- Card (`card.js`): slide in from the bottom with an eased offset over 0.25 s and a slight alpha fade. Consider 80% width. The card's offset is presentation state: keep it in the card module and advance it in `update`, not in draw.
- **No hitstop and no screen shake:** that would be "taking control" (§0.14).

### P1-5 Visible gear (`js/scene/boat.js` `draw`, `drawRod`)
- If `save.gear.lantern`, draw a 3×4 lantern sprite on the bow pole, plus a radial halo baked once: concentric `lamp_glow` rings at 0.08–0.2 alpha, kept under the ceiling (`lamp_glow` is brighter than `dusk_high`, so check whether the halo counts as "sky or water". Safest: use `dusk_high` for the halo and `lamp_glow` only for the 1–2 px flame).
- The mirror pass picks it up automatically.
- Rod tier: colour key per tier (`wood`, `wood_hi`, `stone_hi`, `rust_hi`, `bone`) and +1 px length per tier.

### P1-6 Pet the dog
- Input: when `fsm === 'sailing'`, the boat is stopped and the player presses `down` (S, ↓), or clicks within the dog's screen rect, call `dog.pet(d)`. `down` is unused while sailing; check `input.js` and the `menu.js` use first.
- The new pose `pet` is 2–3 frames (dog leans, tail wags), held 2 s, with a 3 s cooldown. It never interrupts a cue pose of higher priority (`stare`, `bark`).
- Purely presentational, so it touches no save.
- **Note:** `dog.js` is presentation (`js/scene`), so this is fine. Add `dbg.dog('pet')`.

### P1-7 Calm HUD (`js/ui/hud.js`)
- Keep `hudIdle` seconds in the HUD module (advanced in an update hook). Reset it on any change of the value strings (already detected, since strings are rebuilt on change) or on any input. Alpha = 1 until 6 s, then fade to 0 over 1 s.
- Depth and tension still show while underwater.
- Show "TAB passive" until `save.flags.usedPassive`. That is a new flag, so check whether the flags object tolerates unknown keys without a migration (§0.12). Otherwise keep it in run state: hint shown for the first 3 minutes of each session.

### P2 notes
- **P2-1 fish-rise rings:** in sailing `update` (presentation-side), every 2–6 s (from `vrng`) pick an active fish shallower than 4 m and call `fx.ripple(f.x, waterY + 1, 1, 6, 1.0)`. This reads the sim state only.
  - Moths and bats are a new `fx` kind or a tiny pool in `scenery.js` (Pines lamps). Fireflies are a creek-only `fx` kind.
- **P2-2 passive:** a fisher idle-frame table in `boat.js` (thermos sip every 20–40 s; steam is 2–3 `dust`-like particles using a new colour key, still under the ceiling). Add a dog `sleep` pose. Show the float dip on passive bites, then a lift arc and splash on a catch, using `run.passive` cycle timing.
- **P2-3 underwater dip:** in `viewStep`, replace the pure alpha fade with the camera easing `cam.y` from 0 to the target over 0.4 s while alpha rises over 0.15 s. Keep §8.3 #6's rule: return to the surface before the fade-out.
  - Lantern cone: a baked triangular gradient from the lure, drawn when night and lantern are both true.
  - Fish outline: bake an outlined variant in `fishgen` (one more cached canvas per species; no per-frame cost).
- **P2-5 creek:** clamp `top` in `painters.trunks` so crowns sit above y 0 (trunks only, no visible crowns), or replace the crowns with a dark canopy band at the top edge. This changes the baked creek look only.

---

## 7. Suggested implementation order

Each batch is a self-contained session that ends with all baselines passing, and gets one commit after user approval, per CLAUDE.md.

1. **Batch 0, decisions (5 minutes, with the user):**
   - Approve the sky interpretation (P1-1 spec note).
   - Choose the gate or the rosters for P0-2.
   - Decide how these audit tasks enter the plan. §0–§7 cannot be edited, so record them in §8.6 as "approved polish tasks", or as a new numbered list in §8.
2. **Batch 1, atmosphere (visual-only, about one session):** P1-1 sky, P1-2 fog, P1-3 water light, P1-5 visible gear. Expect replay and pacing to be identical. This gives the biggest visible jump for the least risk.
3. **Batch 2, Phase 13 audio:** 13.1 (P0-1, the §8.6 prompt), then 13.3 with the C1 additions, then 13.2, then 13.4.
4. **Batch 3, feel:** P1-4 juice, P1-6 pet the dog, P1-7 calm HUD.
5. **Batch 4, P0-2 content:** the gate (if chosen) can be done in Batch 1. Rosters 14.1–14.4 then 14.5 balance, recording the new replay hash.
6. **Batch 5, P2:** ambient life, passive presentation, underwater dip, location identity.
7. **Batch 6, P3** and the remaining Phase 14 tasks.

The rationale is that Batch 1 is risk-free and the most visible. Audio is the plan's next phase, so doing it second keeps the plan's order nearly intact.

---

## 8. Risks and dependencies

| Risk | Mitigation |
|---|---|
| Spec conflict: sky keys beyond `night_ink` and `dusk_amber` (§0.9); grey-hour overcast | Ask first; record in §8.3. The `skySafe` ceiling check stays and throws on violation. |
| Accidentally touching the sim, which changes the replay hash | Batches 1 and 3 must leave `--replay 12345` at `2265718513` and `--pacing` medians unchanged. Any change means a sim leak. |
| `G.rng` used for visuals | Code review: grep new code for `G.rng`. Visuals use `G.vrng` or `S.hash`. |
| Draw-time mutation (fog drift, card slide, HUD fade) | Derive offsets from time read in draw, or advance them in update hooks. |
| Per-frame allocations (new particles, strings) | Preallocated arrays; HUD strings rebuilt only on change (existing pattern). |
| Mirror cost grows (everything in `drawBackdrop` is drawn twice) | Watch the `water reflection` ms and fps on the overlay. The budget for the reflection pass is under 1 ms. |
| Audio autoplay and loudness | Create and resume only on the first input; limiter always on; −12 dBFS peak rule; check the mute path. |
| New files need approval (§0.1, D7) | `js/audio/engine.js` is approved. Ask before adding any other file. |
| Save changes (flags for hints) | Prefer run state. If a save field is added, bump the version with a migration and test old saves (14.8). |
| Pixel tests slow Chrome (§8.4 #11) | Read offscreen canvases or keep `getImageData` reads few; reload after them. |
| Headless background tabs don't animate (§8.4 #22) | Bring the page to the front before checking loop-driven visuals. |
| Tone drift into horror | Every new uncanny detail must be quiet, optional and informative (§1, §2, §0.14). No darkness spikes, no sudden sounds, nothing near the dog. |

**Dependencies:**
- P1-3's light path wants P1-1's moon position.
- P2-1's moths want the P0-1 or 13.2 hum.
- The P2-2 passive visuals want P1-6's dog poses.
- The rosters (P0-2 alternative) block the legendary bark and the cold hole payoff.

---

## 9. Acceptance criteria

Every task must also pass the standing baselines (PLAN.md §8.5):
- `node tools/balance.js --validate` reports `OK`.
- `--replay 12345` matches. Visual-only tasks must keep hash `2265718513`.
- `--pacing` is all PASS.
- `--passive` is PASS.
- No page errors at `?debug`.

| ID | Done when (a `dbg`, Node or headless check, never "I played for a while") |
|---|---|
| P0-1 | **13.1:** per §8.6, plus `dbg.audio()` returns `{state:'running'}` only after the first key, with no autoplay warning in the console; mute sets the master gain to 0; volume 0.5 sets the master gain to 0.5 × base. **13.3 subset:** `dbg.audio().events` logs `bite`, `hook`, `pull`, `slip`, `splash`, `reel` when forced with `dbg.cast` → `dbg.give(id)` → hold or release; the tension tone frequency changes monotonically with `fight.T`. **13.2:** `dbg.hour(3)` vs `dbg.hour(12)` changes the ambience bus parameters. Replay hash unchanged. |
| P0-2 (gate) | On a fresh save with `dbg.money(9999)`, the map refuses the creek, the Pines and the Red Room while they have 0 species, and shows the settling message. `--pacing` is unchanged. When a species is injected for `creek`, the gate opens. |
| P0-2 (rosters) | `--validate` shows 9 species per location and no roster warnings; `--pacing` PASS; the new replay hash is recorded in §8.5. |
| P1-1 | `dbg.sky(h)` (new) returns the stop keys and the max luminance. For h = 0..24 in 0.25 steps the max is ≤ `CEILING` (no throw). Headless screenshots at 03:00, 06:00, 12:00, 19:00 differ in mean hue: 12:00 has lower saturation than 19:00. Stars have alpha 0 at 12:00 and are visible at 03:00. Replay hash unchanged. |
| P1-2 | `dbg.fog()` reports per-layer alpha: `fog_near` at 12:00 is at least 1.6× its value at 22:00 (same unease), and at unease 1 it is above unease 0 (same hour). Two screenshots 5 s apart with a still camera differ in the fog band rows only. The mist is present in the mirror rows. Replay hash unchanged. |
| P1-3 | With a still boat, mirror pixels in the moon's column differ from neighbouring columns (a light path is present at night, absent in the grey hours). The overlay's `water reflection` stays under 1.0 ms. Replay unchanged. |
| P1-4 | After `dbg.give(id)`, the fx ripple count rises by at least 1 at the line entry on the bite frame. The rod tip y dips at least 2 px during the bite (expose it through `dbg`). The card's y offset goes from off-screen to rest in 0.2–0.3 s, then holds. No input is blocked: the action key at the card still sells. Replay unchanged. |
| P1-5 | `dbg.buy('lantern')` (or the equivalent) makes the boat draw differ in the bow rect, and the mirror shows it. Rod draws differ between tiers 1 and 3. Halo pixels are ≤ `dusk_high` luminance. |
| P1-6 | `dbg.dog('pet')` and the real input (`down` while stopped) both set pose `pet` for 2 ± 0.1 s. While a `stare` or `bark` cue is active, petting is refused. No save change (the save JSON is identical before and after). |
| P1-7 | After 7 s without input or value changes, HUD alpha is 0; any key or coin change brings it back to 1 within 1 frame. Underwater depth stays visible. |
| P2-1 | Over 60 s with fish shallower than 4 m, at least 3 rise ripples spawn within 6 px of those fish's x. With no shallow fish, there are 0. Uses `vrng` only (replay unchanged). |
| P2-2 | In live passive, the fisher's idle frame changes at least once per 40 s, the dog pose is `sleep`, and a passive catch triggers a lift arc. Replay and `--passive` unchanged. |
| P2-3 | Underwater entry: `cam.y` eases monotonically to its target in 0.35–0.45 s. With a lantern at night, cone pixels are present around the lure. No mirror is drawn while `cam.y > 0` (existing invariant). |
| P2-5 | The creek screenshot has no crown pixels in the top rows except a continuous canopy band. Bake time stays under 50 ms per layer. |
| P3-x | Per the item; the baselines hold. |

---

## 10. Ready-to-use prompt for tomorrow's session

Copy everything inside the block into a fresh Claude Code session started in the repo root.

```
You are continuing SoftStatic (plain-JS, no-build, side-view liminal fishing game).

Read, in this order, and only these:
1. CLAUDE.md (working rules).
2. PLAN.md §0 Shared Conventions, then §8 Project Status (8.3 decisions, 8.4 known issues,
   8.5 baselines, 8.6 next task).
3. SOFTSTATIC_IMPROVEMENT_AUDIT.md: sections 1, 5, 6, 7, 8, 9 (skip 2–4 unless needed).
   It is a research audit from 2026-10-28 comparing SoftStatic with Cast n Chill and ranks
   improvements P0–P3 with file paths and acceptance checks.

Then, BEFORE writing any code:
- Run the baselines and report their output: node tools/balance.js --validate;
  --replay 12345 (expect hash 2265718513); --pacing; --passive.
- Ask me the Batch 0 decisions from audit §7:
  (a) may the sky use the intermediate dusk palette keys (dusk_violet/plum/rose, fog_dark/mid)
      and show the grey hours as overcast? (§0.9 interpretation; ceiling unchanged)
  (b) P0-2: interim map gate for waters with no fish, or pull rosters 14.2–14.4 forward?
  (c) how to record the approved audit tasks in PLAN.md §8 (§0–§7 must not be edited).
  (d) which batch to start: Batch 1 "Atmosphere" (P1-1 sky, P1-2 fog, P1-3 water light,
      P1-5 visible gear: visual-only) or Batch 2 "Audio" (Phase 13.1 per §8.6, then the
      P0-1 sound subset).
Wait for my answers. Implement only the batch I approve.

Rules while implementing (PLAN.md §0, easy to break):
- One global G; namespaces as in §0.3. js/sim and data stay pure (no window/document/
  Math.random/Date/performance). Visuals use G.vrng or S.hash, never G.rng.
- update() never draws; draw() never mutates state; no per-frame allocations.
- Colours only as palette keys from js/gfx/sprites.js; bitmap font only; sky and water never
  brighter than dusk_high (S.skySafe must keep passing).
- No hitstop, screen shake, sudden sounds or anything that blocks input; never harm the dog.
- Ask before creating any file other than js/audio/engine.js.
- Every feature gets a dbg.* hook and an overlay line; "done" means the audit §9 check for
  that task passes, plus all four baselines. Visual-only batches must keep replay hash
  2265718513 and identical pacing medians; if they change, find the sim leak.
- Useful verification: python3 -m http.server 5517 --bind 127.0.0.1 and headless Chromium
  via require('playwright') at http://127.0.0.1:5517/?debug&seed=7. Hide the debug DOM
  (body > :not(canvas){display:none}) before canvas screenshots. dbg API: state, give, land,
  rod, money, buy, save, wipe, hour, dog, unease, spawn, cast, lure, tp, caught, ui, travel,
  anomaly, passive, away, tape, restore, sprite, fx.

Key files: js/scene/sailing.js (sky: skyBrightness/skyColor/refreshSky; fog painter;
drawBackdrop; camera camTarget/camStep; draw order), js/gfx/water.js (mirror), js/gfx/fx.js
(particle/ripple pools), js/scene/boat.js (boat, rod, fisher), js/scene/dog.js (poses, cues),
js/scene/underwater.js (cross-section, bite/hook/fight/landing, viewStep), js/ui/card.js,
js/ui/hud.js, js/ui/map.js, js/gfx/sprites.js (palette, ceiling), data/loc_*.js (layers,
spots), index.html (script order; audio slot has TODO(P13.1)).

When the batch is done: report the actual check output, update PLAN.md §8 (8.1 / 8.3 / 8.4 /
8.5 / 8.6), make ONE commit named after the batch with a body listing what was built, and
do not push until I say so. Then stop.
```

---

*End of audit. No gameplay, sim, data or UI source file was modified while producing it. The only artefact is this document; scratch screenshots stayed in the session scratchpad.*
