var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Fogbound Lake (V6.1): the starting location.
// x values are world pixels, except layer `features`, which are in that layer's own pixels
// (a layer with parallax p is 320 + (width - 320) × p wide). Depths are pixels (metres = px × 0.25).
G.data = G.data || {};
G.data.locations = G.data.locations || {};

// Phase 22: the lakes' current, a slow wind drift. px/s the lure drifts at t s after landing,
// on the cast with this seed, at depth px (onBottom: it only creeps), with wind 0..1 (the
// grey hours). Phase 26: the seed sets which way the wind blows for the cast, and its strength
// sways by ±sway over `period` s, so every cast drifts (it used to turn through zero); with
// turns: true (the Red Room) it turns round instead, once in `period` s. It builds over `ramp`
// s and slows with depth (slack: the share lost at maxDepth). Pure, like the creek's drift
// (11.1): a cast's path is fixed by its seed, the clock and the fixed dt.
G.data.lakeDrift = function (L, seed, t, depth, onBottom, wind) {
  var c = L.current, hs = Math.imul(seed | 0, 0x9e3779b1) >>> 0, ph = hs / 4294967296 * 6.2832, dir;
  if (c.turns) dir = Math.tanh(3 * Math.cos(ph + t * 6.2832 / c.period));
  else dir = ((hs >>> 7) & 1 ? 1 : -1) * (1 + c.sway * Math.sin(ph + t * 6.2832 / c.period));
  var v = (c.speed + c.wind * (wind || 0)) * (1 - Math.exp(-t / c.ramp)) * dir;
  v *= 1 - c.slack * Math.min(1, Math.max(0, depth) / L.maxDepth);
  return v * (onBottom ? c.bottom : 1);
};
G.data.locations.fog = {
  id: 'fog',
  name: 'Fogbound Lake',
  cost: 0,
  width: 1200,
  waterY: 112,
  maxDepth: 96,
  seed: 4021,
  start: 150,
  // Phase 67: the pier at the west end, under the shore with the bait shop and the cabin. A
  // boat within reach px of x can tie up there (js/ui/dock.js).
  dock: { x: 96, reach: 60, cabin: true }, // Phase 76: the cabin is up this pier's path only
  // Phase 20: the surface's swell, in the 640×360 view's pixels: amp is the largest height,
  // waves are [wavelength px, speed px/s, share of amp]; mirror scales how much it shivers
  // the reflection. Fogbound is low and slow.
  swell: { amp: 1.3, mirror: 0.8, waves: [[96, 9, 0.5], [41, -6, 0.3], [23, 4, 0.2]] },
  // Phase 22: a slow wind drift (G.data.lakeDrift above); lake: true, no current streaks. Phase 26: one way per cast.
  current: { lake: true, speed: 0.25, wind: 0.1, sway: 0.2, ramp: 4, period: 240, slack: 0.75, bottom: 0.2 },
  drift: function (seed, t, depth, onBottom, wind) { return G.data.lakeDrift(this, seed, t, depth, onBottom, wind); },

  // Back to front. Every layer is baked once and only drawn with drawImage.
  // 2026-11-06 (the user's reference: "the hour between"): forested violet hills in haze, a
  // nearer line of them with the radio mast and its red light, mist between every distance,
  // violet pines with the larches gone gold, a dome of rock with a stepped waterfall, a cabin
  // lit across the lake, and the reedy shore in violet stone. Painters: js/scene/fogbound.js
  // (fbhills, falls, fbcabin) and js/gfx/paint.js (forest, bank, the larch).
  scenery: 'fogbound',
  layers: [
    { id: 'peaks', kind: 'fbhills', parallax: 0.05, base: 96, amp: 62, domes: 3, big: [70, 120], trees: 1.6,
      keys: { mid: 'hill_far', lit: 'hill_lit', dark: 'hill_mid', haze: 'hill_haze', tree: 'hill_mid' } },
    { id: 'fog_high', kind: 'fog', parallax: 0.08, y: 70, h: 24, color: 'fog_lav', alpha: 0.22, drift: 0.7 },
    { id: 'ridge', kind: 'fbhills', parallax: 0.14, base: 104, amp: 26, domes: 4, trees: 1.8, featureKey: 'night_violet',
      keys: { mid: 'hill_mid', lit: 'hill_far', dark: 'hill_dark', haze: 'hill_haze', tree: 'hill_dark' },
      features: [{ kind: 'mast', x: 232, h: 22 }] },
    { id: 'fog_far', kind: 'fog', parallax: 0.2, y: 86, h: 22, color: 'fog_lav', alpha: 0.4, drift: 1.2 },
    { id: 'trees', kind: 'forest', parallax: 0.3, base: 106, height: 20, gap: [2, 6], mix: { pine: 0.5, spruce: 0.35, larch: 0.15 },
      keys: { pine: { dark: 'pinev_dark', mid: 'pinev_mid', lit: 'pinev_lit', trunk: 'pinev_dark' }, larch: { dark: 'larch_dark', mid: 'larch_mid', lit: 'larch_lit', trunk: 'pinev_dark' } } },
    { id: 'fog_near', kind: 'fog', parallax: 0.42, y: 96, h: 14, color: 'fog_lav', alpha: 0.24, drift: 2.4 },
    { id: 'woods', kind: 'forest', parallax: 0.5, base: 110, height: 38, gap: [7, 40], mix: { spruce: 0.45, pine: 0.25, larch: 0.24, dead: 0.06 }, place: 4417,
      keys: { pine: { dark: 'pinev_dark', mid: 'pinev_mid', lit: 'pinev_lit', trunk: 'pinev_dark' }, larch: { dark: 'larch_dark', mid: 'larch_mid', lit: 'larch_lit', trunk: 'pinev_dark' } } },
    { id: 'cabin', kind: 'fbcabin', parallax: 0.5, base: 110, place: 5521, features: [{ x: 292 }] },
    { id: 'falls', kind: 'falls', parallax: 0.56, place: 6631, features: [{ x: 6, w: 84, h: 34, steps: 4 }] },
    // Phase 49: the shore's things, scattered from its own placement seed (place): pads on the
    // water, fallen trunks, cattail clumps; features stand where the data puts them (layer px).
    { id: 'shore', kind: 'bank', parallax: 0.6, height: 4, reeds: 0.9, rockEvery: 38, place: 7741, pads: 7, trunks: 2, cattails: 4,
      rock: { dark: 'rockv_dark', mid: 'rockv', lit: 'rockv_mid' }, ground: 'rockv_dark',
      features: [{ kind: 'posts', x: 180, n: 5 }, { kind: 'moored', x: 236 }, { kind: 'lodge', x: 560 }, { kind: 'duckbox', x: 700 }] },
    { id: 'marks', kind: 'landmarks', parallax: 1 }
  ],

  // Presentation only. sky: where the moon, the dusk glow and the low sun sit (sky px), and
  // 2026-11-06: Fogbound's own keyframes (each hour's four keys, top to horizon, as
  // sailing.js SKY_KEYS): dusk as the reference (mauve over cerise over coral), dawn in lilac
  // and peach, the grey hours a lavender haze, the night violet ink; the clouds in the same
  // keys, as long bands (fogbound.js cloudMask). grade: the layers go violet at night and
  // lavender in the grey hours. waterBase: the violet under the mirror; reflect: a clearer
  // mirror for the still water. mist: a low band on the water that drifts over the boat.
  sky: {
    moonX: 92, glowX: 248, glowKey: 'dusk_coral', sun: { x: 250, y: 46, r: 7 },
    keys: [
      [0, ['night_violet_ink', 'night_violet', 'night_plum', 'night_mauve']],
      [3, ['night_violet_ink', 'night_violet_ink', 'night_violet', 'night_plum']],
      [5, ['night_violet_ink', 'night_violet', 'night_plum', 'night_mauve']],
      [6.25, ['dusk_lilac_dk', 'dusk_lilac', 'dusk_peach', 'dusk_coral']],
      [7.5, ['dusk_lilac_dk', 'fog_lav_dk', 'fog_lav', 'dusk_peach']],
      [9, ['fog_lav_dk', 'fog_lav', 'fog_lav', 'fog_lav_hi']],
      [12.5, ['fog_lav_dk', 'fog_lav', 'fog_lav_hi', 'fog_lav_hi']],
      [16, ['fog_lav_dk', 'fog_lav', 'fog_lav', 'fog_lav_hi']],
      [17.5, ['dusk_mauve_dk', 'dusk_mauve', 'dusk_peach', 'dusk_coral']],
      [19, ['dusk_mauve_dk', 'dusk_mauve', 'dusk_cerise', 'dusk_coral']],
      [20.5, ['night_plum', 'dusk_mauve_dk', 'dusk_mauve', 'dusk_cerise']],
      [22, ['night_violet_ink', 'night_violet', 'night_plum', 'night_mauve']],
      [24, ['night_violet_ink', 'night_violet', 'night_plum', 'night_mauve']]
    ],
    cloudKeys: [['night_violet', 'night_plum', 'night_mauve'], ['fog_lav_dk', 'fog_lav', 'fog_lav_hi'], ['dusk_mauve', 'dusk_cerise', 'dusk_coral'], [null, null, 'dusk_sun']]
  },
  grade: { night: ['night_violet', 0.64], grey: ['fog_lav_dk', 0.3] },
  waterBase: 'water_violet',
  reflect: 1.45,
  mist: { h: 8, alpha: 0.16, drift: 3, color: 'fog_lav' },

  // Life (presentation only, js/scene/life.js). under (Phase 48): how many crayfish, snails,
  // fry clouds and tadpole clouds, whether a turtle and an eel live here, and what the bake
  // paints on the bed (mussels, caddis cases, litter, roots, a drowned tree, algae, ribbon and
  // fern weed per px, lily stems). above (Phase 49): who lives on the water, on the shore and
  // in the air, each with hours: [[from, to], ...] in game hours (wrapping past midnight), and
  // where: x [lo, hi] in its own layer's px (p: its parallax, 1 = the boat's distance),
  // perches {x, y: px above the waterline}, layer: the painted layer it walks on.
  life: {
    under: { cray: 7, snail: 8, fry: 5, tad: 2, turtle: true, eel: true, mussel: 10, caddis: false, litter: ['bottle', 'lure', 'bottle'], roots: 2, tree: 1, ribbon: 0.025, fern: 0.02, lily: 5, algae: 0.6 },
    above: {
      ducks: { p: 0.9, x: [330, 960], young: 4, hours: [[5, 21]] },
      heron: { x: [1060, 1170], hours: [[4.5, 10], [16, 22]] },
      kingfisher: { perches: [{ x: 985, y: 25 }, { x: 127, y: 26 }, { x: 560, y: 25 }], hours: [[6, 18.5]] },
      loon: { p: 0.85, x: [200, 880], hours: [[0, 24]], call: [[4.5, 6.5], [18, 21.5]] },
      dragonflies: { n: 5, x: [[20, 200], [1000, 1180]], hours: [[9, 17.5]] },
      frog: { hours: [[7, 2]] },
      striders: { n: 6, x: [[20, 180], [1020, 1180]], hours: [[8, 18.5]] },
      deer: { layer: 'shore', x: [300, 470], hours: [[4.75, 7.5], [17.5, 20.25]] },
      beaver: { layer: 'shore', hours: [[19, 5]] }
    }
  },

  // On the water at the boat's distance (parallax 1): x is where the landmark is centred.
  landmarks: [
    { id: 'pier', kind: 'pier', x: 96, seed: 3301, from: 'left' }, // the same pier stands in The Pines (11.4); Phase 67: at the west end
    { id: 'marker_a', kind: 'marker', x: 560 },
    { id: 'wreck', kind: 'wreck', x: 770 },
    { id: 'marker_b', kind: 'marker', x: 985 }
  ],

  // The cross-section (V3.3). The bottom wanders between maxDepth - bottomAmp and maxDepth,
  // and touches maxDepth somewhere. shaftEvery is the spacing of light shafts in px.
  underwater: {
    bottomAmp: 24, rock: 'stone_dark', silt: 'wood_dark',
    grad: ['water_slate_lit', 'water_slate_mid', 'water_slate_dark', 'water_slate_deep'], // 2026-11-06: the violet lake's water, a slate blue under it
    weed: 'moss', weedDark: 'moss_dark', weedDensity: 0.07, shaftEvery: 150
  },

  // Where casts land matters (sim/unease.js castBoost): attract (fish turn up sooner) for a
  // lure landing within r px. kind 'hidden': the dog stares at it once (10.3). Phase 68: the
  // legendary spots are ordinary places where fish gather (no rarity, no bark).
  spots: [
    { id: 'pier_shade', kind: 'open', x: 96, r: 36 },
    { id: 'channel', kind: 'open', x: 560, r: 40 },
    { id: 'wreck_hollow', kind: 'open', x: 770, r: 30 },
    { id: 'cold_hole', kind: 'open', x: 880, r: 22, attract: 1.3 },
    { id: 'reed_gap', kind: 'hidden', x: 1110, r: 24, attract: 1.6 }
  ],
  // Phase 74 (PLAN_WATERS.md): what kind of water it is, and its stretches by world x.
  water: 'lake',
  reaches: [{ id: 'fogbound', name: 'Fogbound Lake', x: [0, 1200] }]
};
