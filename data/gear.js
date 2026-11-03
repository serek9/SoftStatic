var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Gear and economy data (V8). Every item does something mechanical:
//   rod:   castMax (px a full cast reaches), maxMass (kg, D4: heavier fish never bite), attract;
//          Phase 43: rods are a rack you own (save.gear.rods), not a ladder. power (its name),
//          action 0 slow .. 4 extra fast (gfx/rod.js bends it so), smallHook (the hook hold a
//          fish under smallFrac of maxMass starts with: a stiff rod tears a small mouth),
//          smallBoost (× the weight of species of smallMass kg or less), look [palette keys of
//          the blank], ladder (false: not one of the upgrades the pacing model buys in turn)
//   reel:  speed (D shrink while reeling a tired fish, V4)
//   line:  strength (how fast tension builds against a pulling fish, V4); Phase 53: the tiers
//          are the line's test (6 lb up to 25 lb), and lineTypes the line itself (below)
//   bait:  attract (fish turn up sooner); as: the bait fish take it as (Phase 68)
// Costs are tuned with `node tools/balance.js --pacing` against the V8 targets.
G.data = G.data || {};
G.data.gear = {
  rods: [
    { id: 'rod_0', name: 'Cane Rod', cost: 0, castMax: 110, maxMass: 3, attract: 1.0, power: 'light', action: 0, smallHook: 1, smallBoost: 1, look: ['stone_hi', 'stone'] },
    { id: 'rod_1', name: 'Fibreglass Rod', cost: 90, castMax: 122, maxMass: 4.5, attract: 1.05, power: 'medium light', action: 1, smallHook: 0.95, smallBoost: 1, look: ['wood_hi', 'wood_mid'] },
    { id: 'rod_2', name: 'Graphite Rod', cost: 420, castMax: 134, maxMass: 7, attract: 1.1, power: 'medium', action: 2, smallHook: 0.9, smallBoost: 1, look: ['rust_hi', 'rust'] },
    { id: 'rod_3', name: 'Lacquered Rod', cost: 1400, castMax: 146, maxMass: 11, attract: 1.15, power: 'medium heavy', action: 3, smallHook: 0.82, smallBoost: 1, look: ['moss_hi', 'moss'] },
    { id: 'rod_4', name: 'The Long Rod', cost: 4200, castMax: 160, maxMass: 18, attract: 1.2, power: 'heavy', action: 4, smallHook: 0.75, smallBoost: 1, look: ['bone', 'stone_hi'] },
    // Phase 43: the small-fish rod, off the ladder (index 5 keeps older saves' indices).
    { id: 'rod_5', name: 'Ultralight Wand', cost: 60, castMax: 104, maxMass: 1.2, attract: 1.0, power: 'ultralight', action: 3, smallHook: 1, smallBoost: 1.6, look: ['teal_hi', 'teal'], ladder: false }
  ],
  rodSmall: { frac: 0.15, mass: 0.4 },
  topDepthM: 1, // Phase 43: m a surface lure counts as for which fish come (they rise to it) // smallHook below frac × maxMass; smallBoost for species of mass kg or less
  reels: [
    { id: 'reel_0', name: 'Tin Reel', cost: 0, speed: 0.12 },
    { id: 'reel_1', name: 'Click Reel', cost: 70, speed: 0.15 },
    { id: 'reel_2', name: 'Brass Reel', cost: 300, speed: 0.19 },
    { id: 'reel_3', name: 'Quiet Reel', cost: 1100, speed: 0.24 },
    { id: 'reel_4', name: 'Reel That Hums', cost: 3600, speed: 0.30 }
  ],
  lines: [
    { id: 'line_0', name: '6 lb Test', cost: 0, strength: 1.0 },
    { id: 'line_1', name: '8 lb Test', cost: 120, strength: 1.25 },
    { id: 'line_2', name: '12 lb Test', cost: 260, strength: 1.6 },
    { id: 'line_3', name: '17 lb Test', cost: 950, strength: 2.0 },
    { id: 'line_4', name: '25 lb Test', cost: 3200, strength: 2.6 }
  ],
  // Phase 53: what the line is made of, a spool bought once and then chosen (save.gear.lineType,
  // owned in save.gear.lineTypes), at any test. strength: × the test's strength. rise: × how
  // fast tension builds while the fish pulls and spikes in a jump (a line that does not
  // stretch takes every lunge). shake: × the hook hold lost in a slack head shake or jump
  // (nothing in the line cushions the hook). hold: added to the hook-set's hold (a firm set).
  // seen: line-shy fish (fish.lineShy) see it and turn away. feel: × how hard a nibble and a
  // bite nod the rod tip. Presentation: sinkG (px/s² under water: braid floats, fluorocarbon
  // sinks), belly (the slack a waiting line keeps), key and alpha (how the line is drawn).
  // Monofilament is the line every number before Phase 53 was tuned with: all ones.
  lineTypes: [
    { id: 'mono', name: 'Monofilament', cost: 0, strength: 1, rise: 1, shake: 1, hold: 0, seen: true, feel: 1, sinkG: 3, belly: 1.03, key: 'fog_light', alpha: 0.6 },
    { id: 'fluoro', name: 'Fluorocarbon', cost: 140, strength: 0.95, rise: 1.06, shake: 1.08, hold: 0.03, seen: false, feel: 1.25, sinkG: 6, belly: 1.025, key: 'fog_light', alpha: 0.28 },
    { id: 'braid', name: 'Braided Line', cost: 240, strength: 1.35, rise: 1.2, shake: 1.4, hold: 0.08, seen: true, feel: 1.8, sinkG: 1.5, belly: 1.012, key: 'moss_hi', alpha: 0.8 }
  ],
  // cost is per bait and the shop sells `pack` at a time; 0 with unlimited: true never runs
  // out. label false: the shelf item with no label and a strange price (V10.7). Phase 68: with
  // no rare fish left it is taken as a worm (as), and fish come to it a little sooner.
  baits: [
    { id: 'worm', name: 'Nightcrawlers', cost: 0, unlimited: true, attract: 1.0 },
    { id: 'cricket', name: 'Crickets', cost: 3, pack: 10, attract: 1.25 },
    { id: 'minnow', name: 'Minnows', cost: 6, pack: 10, attract: 1.4 },
    { id: 'unlabelled', name: '', label: false, cost: 47, pack: 1, attract: 1.1, as: 'worm' }
  ],
  // Phase 43: lures. Not used up by a cast: one is lost when the line snaps, and counted in save.baits like the baits. cost is per lure, sold `pack` at a time.
  // swim: where it fishes (the scene: sink × the bait's sink speed, down to maxDepthM m; 'top'
  // floats; 'dive' dives while reeled, to maxDepthM; Phase 65: 'float' hangs a bait under a
  // float at maxDepthM, 'flutter' falls fluttering). Fish take them by fish.lureTypes[type], or
  // (carries) as the bait they carry. Phase 68: type (G.data.LURE_TYPES) and sizes, the size
  // classes (S M L XL XXL, G.data.SIZE_CLASSES) of the fish it is made for.
  // Phase 69 (PLAN_SPECIES.md 3.3): the reference's 23 lures replace the seven. Three new
  // actions: 'dropshot' (the weight on the bed, the hook dropM m above it, twitched in place),
  // 'wacky' (a worm hooked in the middle: falls slowly and level, both ends shimmying), 'glide'
  // (wide slow S-glides at maxDepthM). vary: 'rattle' (a bladebait: short sharp lifts that
  // shiver, dropping on a slack line) or 'kick' (a swimbait's paddle tail, beating with speed).
  // Costs are the reference's order at about 0.45 of its numbers (the Bobber 6, not free).
  // Phase 73: each lure's art is its look in data/lurelooks.js (painted by js/gfx/luregen.js).
  lures: [
    { id: 'bobber', name: 'Bobber', type: 'float', sizes: ['S', 'M'], cost: 6, pack: 2, attract: 1.2, swim: 'float', sink: 1, maxDepthM: 1.5, carries: 'worm' },
    { id: 'deep_bobber', name: 'Deep Bobber', type: 'float', sizes: ['S', 'M', 'L'], cost: 14, pack: 2, attract: 1.2, swim: 'float', sink: 1, maxDepthM: 5, carries: 'worm' },
    { id: 'crankbait', name: 'Crankbait', type: 'crank', sizes: ['S', 'M'], cost: 7, pack: 2, attract: 1.35, swim: 'dive', sink: 0, maxDepthM: 1.5 },
    { id: 'big_crankbait', name: 'Big Crankbait', type: 'crank', sizes: ['L', 'XL'], cost: 22, pack: 1, attract: 1.35, swim: 'dive', sink: 0, maxDepthM: 3 },
    { id: 'deep_crankbait', name: 'Deep Crankbait', type: 'crank', sizes: ['XL', 'XXL'], cost: 68, pack: 1, attract: 1.35, swim: 'dive', sink: 0, maxDepthM: 6 },
    { id: 'spinnerbait', name: 'Spinnerbait', type: 'spinner', sizes: ['S', 'M', 'L'], cost: 14, pack: 2, attract: 1.3, swim: 'mid', sink: 0.6, maxDepthM: 7 },
    { id: 'big_spinnerbait', name: 'Big Spinnerbait', type: 'spinner', sizes: ['XL', 'XXL'], cost: 27, pack: 1, attract: 1.3, swim: 'mid', sink: 0.8, maxDepthM: 10 },
    { id: 'small_spoon', name: 'Small Spoonbait', type: 'spoon', sizes: ['S', 'M', 'L'], cost: 11, pack: 2, attract: 1.3, swim: 'flutter', sink: 1.4, maxDepthM: 99 },
    { id: 'heavy_spoon', name: 'Heavy Spoonbait', type: 'spoon', sizes: ['L', 'XL'], cost: 27, pack: 1, attract: 1.3, swim: 'flutter', sink: 1.8, maxDepthM: 99 },
    { id: 'huge_spoon', name: 'Huge Spoonbait', type: 'spoon', sizes: ['XL', 'XXL'], cost: 68, pack: 1, attract: 1.3, swim: 'flutter', sink: 2.2, maxDepthM: 99 },
    { id: 'dropshot', name: 'Dropshot', type: 'dropshot', sizes: ['S', 'M', 'L'], cost: 22, pack: 1, attract: 1.25, swim: 'dropshot', sink: 1.6, maxDepthM: 99, dropM: 0.5 },
    { id: 'heavy_dropshot', name: 'Heavy Dropshot', type: 'dropshot', sizes: ['XL', 'XXL'], cost: 45, pack: 1, attract: 1.25, swim: 'dropshot', sink: 2.2, maxDepthM: 99, dropM: 0.5 },
    { id: 'wacky_worm', name: 'Wacky Worm', type: 'wacky', sizes: ['S', 'M', 'L'], cost: 14, pack: 2, attract: 1.25, swim: 'wacky', sink: 0.45, maxDepthM: 99 },
    { id: 'jighead', name: 'Jighead', type: 'jighead', sizes: ['M', 'L', 'XL'], cost: 22, pack: 1, attract: 1.3, swim: 'lift', sink: 1.8, maxDepthM: 99 },
    { id: 'deep_jighead', name: 'Deep Jighead', type: 'jighead', sizes: ['XL', 'XXL'], cost: 45, pack: 1, attract: 1.3, swim: 'lift', sink: 2.6, maxDepthM: 99 },
    { id: 'topwater', name: 'Topwater', type: 'topwater', sizes: ['S', 'M', 'L'], cost: 27, pack: 1, attract: 1.25, swim: 'top', sink: 0, maxDepthM: 0 },
    { id: 'medium_blade', name: 'Medium Bladebait', type: 'blade', sizes: ['M', 'L'], cost: 14, pack: 2, attract: 1.3, swim: 'lift', vary: 'rattle', sink: 2, maxDepthM: 99 },
    { id: 'large_blade', name: 'Large Bladebait', type: 'blade', sizes: ['L', 'XL'], cost: 27, pack: 1, attract: 1.3, swim: 'lift', vary: 'rattle', sink: 2.3, maxDepthM: 99 },
    { id: 'heavy_blade', name: 'Heavy Bladebait', type: 'blade', sizes: ['XL', 'XXL'], cost: 68, pack: 1, attract: 1.3, swim: 'lift', vary: 'rattle', sink: 2.6, maxDepthM: 99 },
    { id: 'glidebait', name: 'Glidebait', type: 'glide', sizes: ['M', 'L'], cost: 45, pack: 1, attract: 1.3, swim: 'glide', sink: 0.8, maxDepthM: 5 },
    { id: 'deep_glidebait', name: 'Deep Glidebait', type: 'glide', sizes: ['XL', 'XXL'], cost: 90, pack: 1, attract: 1.3, swim: 'glide', sink: 1, maxDepthM: 9 },
    { id: 'minnow_swimbait', name: 'Minnow Swimbait', type: 'swim', sizes: ['S', 'M', 'L'], cost: 27, pack: 1, attract: 1.3, swim: 'mid', vary: 'kick', sink: 0.9, maxDepthM: 6 },
    { id: 'bluegill_swimbait', name: 'Bluegill Swimbait', type: 'swim', sizes: ['XL', 'XXL'], cost: 68, pack: 1, attract: 1.3, swim: 'mid', vary: 'kick', sink: 1.1, maxDepthM: 10 }
  ],
  // Phase 69: an old save's lure counts go to the nearest new lure (core/save.js v7 -> v8).
  oldLures: { spinner: 'spinnerbait', plug: 'crankbait', grub: 'wacky_worm', popper: 'topwater', jig: 'jighead', bobber: 'bobber', spoon: 'small_spoon' },
  // Phase 79b (the user's word, 2026-11-03): the Storm Lantern and the Depth Finder are no longer
  // sold, and are gone from the game; save v10 pays back their price.
  nightDepth: 56, // px (14 m): fish deeper than this show only as silhouettes at night

  // The fight model's constants (V4); sim/fight.js reads these.
  fight: {
    pull0: 1.2, pull1: 3, tired0: 1, tired1: 2.5,
    pullRise: 0.5, easeFall: 0.7, run: 0.03,
    tiredRise: 0.06, release: 0.45, recover: 0.03,
    slipT: 0.6, slipD: 0.1, escape: 3,
    d0: 0.6,
    // Phase 23 (R2): the hook hold and what works it loose. holdLate: H at a hook-set at the
    // bite window's end; slackT: below this T the line is slack; holdLoss and jumpLoss: H lost per s in
    // a shake or a jump on a slack line; shakes last shakeLen0..1 s, every shakeGap0..1 s
    // divided by the fish's speed; shakeRise: extra T per s reeling in one; jumps: chance per s
    // = fish.jumps × jumpRate when D < 0.5, jumpLen s long, a jump above jumpHigh adds jumpSpike T/s.
    holdLate: 0.7, slackT: 0.12, holdLoss: 0.7, jumpLoss: 0.6,
    shakeLen0: 0.4, shakeLen1: 1.0, shakeGap0: 1.2, shakeGap1: 3, shakeRise: 0.25,
    jumpRate: 0.25, jumpLen: 1, jumpHigh: 0.6, jumpSpike: 0.6
  },

  // Prices (V8; Phase 68: no rarity): base × sizeFactor, sizeFactor from sizeMin to sizeMax.
  // sizeCurve (Phase 44): the size quantile is u^sizeCurve, so most fish are on the small side;
  // sizeMin went 0.7 -> 0.85 with it, keeping the mean sizeFactor at 1.1.
  economy: { sizeMin: 0.85, sizeMax: 1.5, sizeCurve: 1.6 },

  // Cabin restoration (V9), one stage after another; cabinLevel is the index reached.
  // plaques: how many kept fish can be mounted at that stage.
  cabin: [
    { name: 'Derelict', cost: 0, plaques: 2 },
    { name: 'Patched Roof', cost: 150, plaques: 4 },
    { name: 'Stove Lit', cost: 400, plaques: 6 },
    { name: 'Rug and Lamp', cost: 900, plaques: 8 },
    { name: 'Restored', cost: 2000, plaques: 10 }
  ]
  // Phase 52: passive mode (and passive.incomeMult, D5) is gone: no income without fishing.
};
