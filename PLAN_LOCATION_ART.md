# SoftStatic: locations with air and distance

Date: 2026-11-11. Status: Phase 110 complete (2026-11-11); Phases 111–117 proposed and not started. Follows completed Phase 109.

## 1. Direction

**Real fishing places remembered in the hour between daylight and night.**

Use the landscape craft of Cast n Chill's location art: convincing geology, asymmetric compositions, varied woodland silhouettes, atmospheric perspective, and reflections that connect land and water. Give SoftStatic more empty distance, restrained light, weathered human traces, and moments of stillness. Keep the physical world believable.

The target is a place you could visit, with an atmosphere you cannot quite place. Ethereal comes from light and distance; airy from open intervals; nostalgic from materials and signs of ordinary use; liminal from thresholds and absence.

## 2. Project understanding and evidence

Reviewed the shared conventions, current status through Phase 109, architecture, earlier art decisions, the water/species/winter/playability/fishing plans, and the code structure across core, data, simulation, graphics, scenes, UI, audio and verification tools. Read the location definitions and rendering contracts to ground this plan in the existing implementation.

SoftStatic is a plain-JavaScript Canvas game with no runtime libraries, build step or external art assets. It renders at **640×360**, with world coordinates generally drawn at ×2. It has **eleven waters**: ten chart waters and the cabin's Back Pond. Fishing, real species and habitat assignments, tackle behaviour, wildlife, weather, ice fishing, pond restoration, the walk-in shop and cabin, touch controls, accessibility settings and offline support already exist.

Important historical differences: the Red Room is retired; passive fishing is removed; real species replaced the old strange-fish roster. Some early architecture descriptions and comments still describe those retired systems. Use current code and the latest §8 decisions when implementing.

Fogbound, The Pines and Blackwater received specific art treatments in Phases 98–100. Phase 108 refined cabins, piers and lamps. Build on those choices rather than treating the project as an untouched landscape renderer.

### Observations versus work still needed

- Visually inspected the running game's Fogbound, Hartsmere and Stonehorn surface views in a non-saving `?tour&seed=21` session, plus the chart. Other waters were reviewed through their definitions and scenery code; their full visual audit is the first planned task.
- Inspected the wiki artwork for [The Mistwood](https://castnchill.unpack.wiki/docs/locations/river1-spot3/), [Fisherman's Rest](https://castnchill.unpack.wiki/docs/locations/lake1-spot3/), [The Rapids](https://castnchill.unpack.wiki/docs/locations/river2-spot1/), [Watchers Point](https://castnchill.unpack.wiki/docs/locations/ocean1-spot1/) and [Frostbite Flats](https://castnchill.unpack.wiki/docs/locations/ice1-spot1/), reached from the supplied [locations index](https://castnchill.unpack.wiki/docs/locations/).
- The following reference analysis is an interpretation of those pictures, not a description supplied by the wiki. The individual pages provide little descriptive prose.
- No before/after implementation or performance improvement is claimed in this planning document.

### What the reference teaches

| Reference | Useful visual principle | SoftStatic adaptation |
|---|---|---|
| The Mistwood | Overlapping lavender distances; fog interrupted by trees and islands; calm reflective space | Separate planes and leave visible gaps through the mist; retain grounded foreground colours |
| Fisherman's Rest | Interlocking ridges, a recognisable cliff, a small cabin at one edge, broad water | Give the eye a route through the landscape and a quiet human anchor |
| The Rapids | Banks converge into a distant valley; rock shelves organise the current | Paint a convincing river corridor behind the side-view fishing plane |
| Watchers Point | Large sky and water; one small lighthouse; distant skerries | Make coastal scale come from open horizon and sparse landmarks |
| Frostbite Flats | Snow follows landforms and branches; warm sky over cool shadows | Treat snow as accumulated material, with compressed winter distance |

### Current visual constraints and opportunities

1. **Repetition competes with landscape structure.** In the inspected frames, repeated small conifers and regular mountain peaks read before the larger terrain. Replace uniform scatter with authored masses, clearings and local variation.
2. **Distance layers can look equally sharp.** Far terrain needs fewer internal edges, lower contrast and more atmospheric colour; near rocks, trunks and useful landmarks retain their definition.
3. **The shoreline often reads as a continuous strip.** Introduce openings, receding bays, low points and off-centre tree groups within the painted backdrop. Keep the playable water plane stable.
4. **The mirror repeats visual noise.** Current row distortion can give calm shores a strongly corrugated reflection. Review wavelength, displacement and breakup by water type, while preserving wakes and rough water.
5. **The surface/cross-section divide is conspicuous.** Improve colour continuity and the underside of the surface without sacrificing the readable lure, line and fish.
6. **The newer waters share generic sky and terrain machinery.** Give them their own restrained colour identities without spreading Fogbound's purple across every habitat.

## 3. Art rules

### Composition and scale

- Compose in three large masses before adding detail: sky, land, water. Each reach gets one main landmark, a supporting mass and an intentional quiet interval.
- Use asymmetric ridges, foothills, saddles, forest gaps and receding peninsulas. Avoid equally spaced peaks and trees that repeat at one apparent scale.
- As a starting composition target, leave roughly a quarter to a third of a normal surface frame low in detail. Judge it per reach; enclosed Blackwater should remain enclosed.
- Concentrate the sharpest accents around the boat, near shore and navigational landmarks. Far forest becomes connected foliage masses before individual trunks.
- Preserve the boat, fisher and dog scale. Suggest more space through the landscape, not by shrinking the player or changing fishing distances.

### Light and colour

- Keep the existing dusk brightness ceiling. Airiness comes from relative values and warmer/cooler separation within that ceiling.
- Establish distinct dawn, grey-hour, dusk and night studies for each water. Dawn is cooler and quieter; dusk carries the local warm accent; grey hours retain gentle colour separation; night retains legible silhouettes.
- Distant colours move toward the local atmospheric colour. Near material still reads as stone, bark, grass, rust or weathered wood.
- Use pearl-grey, slate-blue, muted sage, faded gold and dusty rose selectively. Preserve Fogbound's violet, The Pines' crimson/plum and Blackwater's blush/granite identities.
- Light must have a source: sun direction, moon, windows, lamps and reflected sky. Keep local warm light small and its reflection aligned.

### Atmosphere, nostalgia and realism

- Place haze in valleys, behind tree groups and along cold water; vary density with hour and weather. Keep openings through it. Never wash the entire picture with one pale overlay.
- Suggest age with existing benches, cabin windows, faded boards, moorings, the diner and the road. Add detail only when it reinforces a place, rather than filling an empty interval.
- Use ordinary absence: a bench facing open water, an unoccupied landing, a light across the lake. Keep new waters physically plausible; retain existing quiet anomaly scope in the original waters.
- Preserve flat pixel clusters, consistent pixel density and hard raster edges. No blur, bloom, VHS overlay, film-grain pass, random decorative speckle or imported reference assets.
- Trees follow habitat; snow gathers on supported surfaces; rocks have coherent planes; foam follows obstacles/current; clear lakes, tannin water, coastal water and ice retain different optical qualities.

## 4. Direction for every location

| Water | Palette and feeling | Composition and concrete changes |
|---|---|---|
| Fogbound Lake | Dusty lilac, slate-violet, faded larch gold; familiar but distant | Recompose the rounded hills into overlapping masses; reduce the regular miniature-tree pattern; open water between the falls, mast and opposite cabin; keep their established identities |
| Blackwater Creek | Blush haze, violet granite, deep green-black pine; enclosed passage | Use leaning old trees as uneven side framing; reveal narrow openings to distant snow; let snags and cabins emerge from shade rather than competing equally |
| The Pines | Muted wine, plum, tarnished gold; the last light after closing | Separate butte, wooded hill and near bank; give the drowned road a quiet approach; diner, signal and stilt cabin remain isolated points of remembered use |
| Copperbend River | Soft sage, river-grey, weathered ochre; late summer remembered | The Split: a readable gravel/channel opening and bridge. Lodge Pool: low wooded enclosure above the dam. Hollow Reach: deeper layered hardwoods, leaning maples and local dawn mist |
| Stonehorn River | Blue-grey, muted spruce, rose-grey snow; cold open distance | Boulder Run: converging rock banks and a distant valley instead of a wall of regular peaks. Osprey Bluff: one convincing cliff mass over a quieter green pool |
| Hartsmere Lake | Silver-blue, pale birch, restrained honey; spacious stillness | Weedbed: broad shallow transparency. Birch Point: asymmetric light trunks and the picnic clearing. Old Bench: a small weathered bench and rowboat against long water and receding ridges |
| Russetwood Lake | Faded copper, ochre, smoky mauve; autumn after the visitors leave | Reed Flats: broken reed groups around open water and submerged stumps. Mink Cove: overlapping hardwood banks and deadfall; the distant dam stays subdued |
| Coldharbor Sound | Pearl-grey, sea-slate, muted peach; vast sheltered edge | Lamplight Head: lighthouse as a small vertical against sky. Skerry Reef: low rock silhouettes and kelp. Harbour Cove: warm harbour pinpoints behind a convincing breakwater; keep open horizon |
| Wreckhollow Bay | Atlantic grey-blue, salt-faded timber, sparse rose; quiet exposure | Give the schooner's listing hull a readable silhouette and water around it; let the shelf recede into distance; isolate seal rocks against low fog without hiding the animals |
| Tamarack Lake | Blue-lilac snow shadows, muted rose horizon, warm shanty windows; winter suspension | Broad snow/ice intervals, irregular boreal shoreline and drifts; distinguish Flats, Pressure Ridge and frozen falls by forms rather than extra props; grounded shadows under machine, bucket and sled |
| The Back Pond | Tea-brown to clear muted teal, moss and old timber; a private place returning to life | Frame the cabin's rear steps and stream through modest reeds and open reflection; preserve the visible cleanup progression and readable trash; intimacy rather than a miniature mountain lake |

## 5. Implementation approach

Use the existing rendering architecture. `js/gfx/paint.js` supplies baked forms; location data controls layers; scenery modules own distinct landmarks and live effects; `sailing.js` assembles sky, parallax and the mirror; `water.js` handles reflected rows; `underwater.js` owns the cutaway.

Extend optional data controls only where the pilot proves a need:

- Per-layer atmospheric grading, with existing location-wide `grade` as the fallback. Define named palette keys in `sprites.js`; use the same grading in the reflected scene.
- Seeded groups/clearings and authored ridge profiles in the relevant painters, rather than increasing random detail counts.
- Per-water reflection appearance controls, separate from the existing physical swell/wake simulation. Calm lakes favour long coherent shapes; rivers break them along flow; exposed seas respond to swell.
- Reuse `sky.keys`, `mist`, `reflect`, `waterBase` and scenery hooks before adding parallel systems. Cache keys must account for any new baked variants; inspect cache growth when revisiting waters.

Do not change location/reach boundaries, spot coordinates, bed collision geometry, current, species, prices, clocks, lure/rod physics or save schema for an art task. Decorative distant terrain can change without changing the fishing habitat. Keep visual randomness private and deterministic; draw remains read-only; bake expensive work outside the frame loop.

## 6. Proposed phases

Numbers 110–117 are proposed continuations, not approvals or completed work. Each phase is separately reviewable. At completion follow the repository's phase reporting and §8 update conventions; leave §0–§7 and Appendix V intact.

### Phase 110 — Baseline and composition studies

Tasks: **110.1** capture inventory and baseline; **110.2** composition/value studies; **110.3** verification and recorded findings.

Files: a new `tools/locations.js` capture/verification tool, this plan, then the normal §8 status update.

Capture every reach at fixed seed, boat position, hour and weather in non-saving tour/test sessions. Include dawn, grey hours, dusk and night; calm/weather pairs; Tamarack snow; dirty/clean pond; surface and representative underwater views. Record screenshots at native resolution and representative desktop/phone sizes, console errors, frame cost, bake time and cache size.

Produce simple composition/value studies for Fogbound, Hartsmere and Coldharbor using existing game rendering or code-native studies. These test the warm violet lake, a natural cold lake and open coast. Record intended focal point, open interval and distance planes before detailed rendering work.

Done when: all eleven waters are inventoried, each reach has a reproducible camera, baseline captures are labelled, and the three studies clearly express the proposed direction. No production art rollout in this phase.

### Phase 111 — Shared landscape and atmosphere tools

Files: `js/gfx/paint.js`, `js/gfx/sprites.js`, `js/gfx/water.js`, `js/scene/sailing.js`, `js/core/debug.js`, `tools/locations.js`.

Add only the controls justified by Phase 110: grouped vegetation and irregular terrain forms, depth-aware grading, local reflection appearance. Existing locations keep defaults until deliberately migrated. Add a `dbg.locationArt()` report for active visual settings, cached layers and costs.

Done when: a controlled fixture demonstrates separated planes and calmer reflection while existing defaults compare unchanged; no sky-ceiling violation; no new per-frame allocation or simulation RNG use.

### Phase 112 — Fogbound pilot

Files: `data/loc_fog.js`, `js/scene/fogbound.js`, and the capture tool if needed. Shared-tool corrections must be explicitly included in phase scope before editing them.

Apply the composition, grouping, grading and reflection work to Fogbound. Keep the falls, cabin, mast, pier and native violet/rose treatment. Review dawn, grey hours, dusk, night, rain and the cutaway transition. Deliver fixed-view before/after pairs and a short motion comparison.

Done when: hills read as landforms before repeated trees; distant/near woodland separate; quiet open space is visible; fishing cues and existing landmarks remain readable. **Use this pilot as the art checkpoint before applying the treatment everywhere.**

### Phase 113 — River locations

Files: `data/loc_creek.js`, `data/loc_copper.js`, `data/loc_stone.js`, `js/scene/creek.js`, `js/scene/rivers.js`.

Apply the location table to Blackwater, Copperbend and Stonehorn, including every existing reach. Compose river corridors in backdrop space while retaining side-view fishing and physical currents.

Done when: the three rivers remain distinct at thumbnail size; still pools and rapids reflect differently; foam and flow retain their physical cues; all reach captures pass.

### Phase 114 — Lake locations

Files: `data/loc_pines.js`, `data/loc_harts.js`, `data/loc_russet.js`, `js/scene/pines.js`, `js/scene/scenery.js`, `js/scene/lakes.js`.

Recompose The Pines and all Hartsmere/Russetwood reaches. Retain the Pines' established crimson treatment and live diner/signal behaviour. Emphasise broad clear water, birch spacing, autumn masses and quiet human traces.

Done when: each lake has a distinct silhouette and atmosphere across four hours; near water remains readable; landmark lighting and reflections agree.

### Phase 115 — Coastal locations

Files: `data/loc_sound.js`, `data/loc_wreck.js`, `js/scene/seas.js`.

Open the horizons, compose headlands/skerries/wrecks asymmetrically, and bring sky and sea colours together. Retain the different Pacific and Atlantic identities, tide, swell, whitecaps, kelp, lighthouse motion and seals.

Done when: sheltered and exposed reaches read differently; the lighthouse and wreck anchor their scenes without crowding the water; weather looks coherent in direct and mirrored views.

### Phase 116 — Winter, pond and underwater continuity

Files: `data/loc_tamarack.js`, `data/loc_pond.js`, `js/scene/winter.js`, `js/scene/pond.js`, `js/scene/underwater.js`.

Apply winter snow/ice grouping and pond intimacy. Harmonise the cutaway's colour, distant bed and light attenuation with the surface treatment across all waters. Preserve existing Phase 87 bed structures and fishing geometry; avoid adding decorative underwater clutter.

Done when: dirty/clearing/clean pond states remain distinct; snow has form and supported accumulation; the lure, line, hook and fish remain readable at depth; cutaway entry has coherent colour without losing the physical waterline.

### Phase 117 — Integration and visual acceptance

Files: `tools/locations.js`, `js/core/debug.js`; `sw.js`/`index.html` only if the final asset set requires it; normal §8 status update. Any art fixes name their affected files before implementation.

Review the complete capture matrix and short motion samples. Check scrolling between reaches, cache reuse on return travel, room windows showing the lake, reflection-only anomalies, storms, blizzards, reduced motion/flashes, touch overlays, gallery views and offline reload. Room interiors retain their current art direction.

Done when: visual criteria below pass, no page errors, performance stays within the recorded budget, deterministic replay matches the pre-art baseline, and the final comparison set is ready for review.

## 7. Verification and acceptance

Art quality requires visual review; a numeric debug report cannot certify composition.

- **Depth:** near, middle and far masses separate at native size and as a greyscale thumbnail. Distant details never overpower the boat or useful landmarks.
- **Space:** every composed reach has an intentional quiet interval, appropriate to its habitat; dense places still contain depth openings.
- **Identity:** all eleven waters retain distinct geology, vegetation and local colour. Dawn, grey hours, dusk and night remain distinguishable within the ceiling.
- **Realism:** shoreline contact, shadows, material planes, light direction and reflected placement agree. Water type remains recognisable in motion.
- **Playability:** fishing cues remain legible against bright and dark backgrounds, during weather and under mobile controls. No decoration obscures docking, bites or the line.
- **Tone:** stillness and ordinary absence carry the liminal atmosphere. Existing calm guardrails and accessibility settings hold.
- **Performance:** record actual baseline and post-change frame/bake/cache measurements on the same device and view. Target the existing 60 fps budget; investigate a sustained frame-cost increase over 10%. Compare phone reflection budget levels too. No unbounded cache growth on repeated tours.

Run `node tools/balance.js --validate` and `node tools/balance.js --replay 12345` before the first runtime edit and after each implementation phase; report exact output and compare against the captured baseline. Run the visual capture checks for affected waters each phase, then the full matrix in Phase 117. Run `--homes` when location definitions change, and `--saves` for final integration. Broader fishing/economy suites are required only if a change unexpectedly crosses into those systems; investigate rather than re-recording a changed simulation hash as an art baseline.

## 8. Recommended start

Begin with Phase 110, then shared controls and the Fogbound pilot. Settle the landscape shapes, distance and reflection treatment on that one lake before proceeding through the river, lake, coast, winter and pond groups. This gives the rest of the work a concrete visual standard and catches performance or readability problems early.


## 9. Phase 110 results (2026-11-11)

Built `tools/locations.js`, a development-only capture tool. The live game files are unchanged. The tool starts its own loopback server and launches fresh browser pages in isolated contexts with `?debug&tour&seed=21&nosw`; it never opens a player's browser profile. A test-only RAF scheduler fixes the step count while preserving the real CPU timer. Test-only cache instrumentation is injected before boot, without editing production scripts.

The complete baseline has **11 waters, 22 reaches and 158 captures**:

- 136 native images: four hours, a storm and an underwater fixture at every reach midpoint, plus clearing/clean surface and underwater pond variants.
- 11 complete desktop viewports (1280×720), one representative reach per water.
- 11 landscape touch viewports (844×390 CSS pixels, DPR 3), including the actual touch overlay.
- Three original colour composition studies and their greyscale equivalents: Fogbound, Hartsmere and Coldharbor. These show large masses, focal points and intentional quiet intervals; they are not production art.
- Tamarack's dawn fixtures have light snow (63 flakes); storm fixtures show a blizzard (232 flakes, no lightning or thunder). Pond fixtures cover dirty, clearing and clean water.

Generated review artifacts are local, ignored by Git, and reproducible with the tool:

- [Review gallery](tmp/location-art-110/index.html)
- [All 22 reaches at dusk](tmp/location-art-110/all-reaches-dusk.png)
- [Composition/value study board](tmp/location-art-110/composition-studies.png)
- [Fixture manifest and measurements](tmp/location-art-110/manifest.json)

The manifest records location/reach identity, seed, exact hour, boat/camera coordinates, weather, cutaway depth, viewport, reflection budget, image dimensions, SHA-256, page errors, source-file hashes, bake timings and cache estimates. `--check` verifies fixture coverage, file hashes/dimensions, non-saving mode, cutaway completion, pond states and repeat-load cache entries.

### Findings from the completed overview

The three original art treatments have stronger identities than the newer generic skies and mountains. Copperbend's evenly repeated foliage and Hartsmere's/Stonehorn's regular triangular ranges need grouping and authored irregularity. Both seas currently inherit mountain-heavy horizons, which makes them feel more like lakes; Coldharbor's headland also reads as a continuous high wall at its midpoint camera. The Back Pond inherits distant mountain forms that work against its intended intimacy. Tamarack's snow and trees make a busy continuous strip. Across these cases the first fixes should be large forms and the intervals between them, followed by atmosphere and reflection coherence.

The baseline uses one midpoint per reach, not an exhaustive sweep of every shoreline landmark. The art phases should add fixed cameras at the particular falls, road, cabin, river opening or headland being changed. The complete review gallery preserves each current midpoint for comparisons.

### Measured baseline and checks

On Apple M1 Pro, macOS arm64, headless Chromium-family browser 156.0.8078.48: 240 frozen-render samples per measured view. Native median CPU draw cost ranged 0.1–3.5 ms, p95 0.7–4.4 ms; representative desktop medians 0.1–0.7 ms and phone-layout medians 0.1–0.6 ms. These are synchronous CPU submission timings of frozen scenes, **not GPU completion, live frame-rate measurements, CPU throttling or physical-phone performance claims**. Compare like fixtures with like fixtures; actual animated and device testing remains required in the implementation phases.

Fogbound's retained baked cache stayed at 47 entries and 53,161,224 estimated RGBA bytes before and after a same-water reload. Maximum per-page tracked cache across the run was 107.2 MiB; maximum reported cumulative bake timer was 461.9 ms (the existing timer includes nested cache work). Estimates exclude non-cache canvases and GPU overhead. The reload probe does not establish bounded memory across repeated multi-water travel; that remains an integration check.

Repeatability also passed: all eight Fogbound PNGs (six native, one desktop, one phone layout) matched byte for byte across separate browser runs. All captures use browser screenshots; native canvas readback was discarded after it showed one-channel perturbations in the installed browser.

Actual checks:

```text
validate: OK (0 warning(s))
replay seed 12345, 20 min: hash 2848910695 / 2848910695, 18 catches, 21 casts
PASS: identical
locations: PASS (11 waters, 22 reaches, 158 captures, 3 colour/value studies, 0 page errors)
```

Run locally (Playwright is a development tool, as in `tools/lures.js`; keep it outside the game):

```sh
npm install --prefix /tmp/softstatic-art-tools playwright
# Set PLAYWRIGHT_EXECUTABLE_PATH if using an installed Chromium-family browser.
NODE_PATH=/tmp/softstatic-art-tools/node_modules node tools/locations.js --out tmp/location-art-next
node tools/locations.js --check tmp/location-art-next
node tools/locations.js --list
```

Use a new output directory for each complete run; existing manifests are protected against accidental overwrite. `--only fog,harts,sound` creates a smaller, explicitly partial review. No production game dependencies or downloaded artwork are introduced.

Next: Phase 111, the shared landscape/atmosphere controls, followed by the Fogbound pilot in Phase 112.
