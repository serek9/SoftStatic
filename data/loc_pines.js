var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The Pines (V6.3): an autumn woodland lake. An abandoned road runs into the water, a
// yellow traffic light blinks over it (faster as a clock window nears, fastest inside one),
// an owl sits on a dead branch, and a diner and its empty parking lot glow across the lake
// under a fluorescent lamp. The moving parts are drawn by the 'pines' scenery module
// (js/scene/scenery.js); everything here is data.
G.data = G.data || {};
G.data.locations = G.data.locations || {};
G.data.locations.pines = {
  id: 'pines',
  name: 'The Pines',
  cost: 600, // Phase 96.1 (was 1500)
  width: 1300,
  waterY: 112,
  maxDepth: 112,
  seed: 6271,
  start: 200,
  dock: { x: 96, reach: 60 }, // Phase 74: its pier, the same pier as Fogbound's (js/ui/dock.js); since the user's fixes (2026-11-03) at the west shore
  // Phase 20: the surface's swell (view px; see loc_fog.js): a medium chop.
  swell: { amp: 1.6, mirror: 0.9, waves: [[80, 11, 0.5], [37, -8, 0.3], [19, 6, 0.2]] },
  // Phase 22: a slow wind drift (G.data.lakeDrift in loc_fog.js).
  current: { lake: true, speed: 0.26, wind: 0.08, sway: 0.2, ramp: 4, period: 200, slack: 0.75, bottom: 0.2 },
  drift: function (seed, t, depth, onBottom, wind) { return G.data.lakeDrift(this, seed, t, depth, onBottom, wind); },
  // 2026-11-06 (the user's second reference: a crimson dusk): plum ranges with rose-lit crests,
  // a rounded forested hill filling the west, a flat-topped butte with a rose cliff across its
  // face, mauve mist between every distance, spruces and gold birches, the diner across the lake,
  // a plank cabin on stilts with its deck and lantern, gold reeds on a violet shore. Painters:
  // js/scene/scenery.js and js/scene/pines.js (butte, stiltcabin; fbhills from fogbound.js) and
  // js/gfx/paint.js (mountains, forest, bank).
  scenery: 'pines',

  layers: [
    { id: 'peaks', kind: 'mountains', parallax: 0.05, base: 92, amp: 52, color: 'mtnp_mid', lit: 'mtnp_lit', dark: 'mtnp_dark', haze: 'mtnp_haze', snow: 'mtnp_rim', snowDark: 'mtnp_mid' },
    { id: 'fog_high', kind: 'fog', parallax: 0.08, y: 70, h: 24, color: 'fog_mauve', alpha: 0.24, drift: 0.7 },
    { id: 'ridge', kind: 'fbhills', parallax: 0.11, base: 102, amp: 44, domes: 3, big: [30, 90], trees: 1.6,
      keys: { mid: 'hillp_mid', lit: 'hillp_lit', dark: 'hillp_dark', haze: 'hillp_haze', tree: 'hillp_dark' } },
    { id: 'butte', kind: 'butte', parallax: 0.16, base: 104, haze: 'hillp_haze', place: 5813, features: [{ x: 118, w: 150, h: 60 }] },
    { id: 'fog_far', kind: 'fog', parallax: 0.2, y: 90, h: 18, color: 'fog_mauve', alpha: 0.5, drift: 1 },
    { id: 'autumn', kind: 'forest', parallax: 0.25, base: 104, height: 22, gap: [2, 6], mix: { spruce: 0.6, pine: 0.28, round: 0.12 },
      keys: { pine: { dark: 'pinev_dark', mid: 'pinev_mid', lit: 'pinev_lit', trunk: 'pinev_dark' }, round: { dark: 'gold_dk', mid: 'gold', lit: 'gold_lit', trunk: 'wood_dark' } } },
    // The far shore: the diner (neon sign) and its parking lot (fluorescent lamps).
    { id: 'farshore', kind: 'farshore', parallax: 0.35, color: 'hillp_dark', tree: 'hillp_mid', base: 106,
      features: [{ kind: 'diner', x: 250 }, { kind: 'lot', x: 296, lamps: 3 }] },
    { id: 'fog_near', kind: 'fog', parallax: 0.45, y: 101, h: 10, color: 'fog_mauve', alpha: 0.32, drift: 2 },
    { id: 'woods', kind: 'forest', parallax: 0.5, base: 110, height: 36, gap: [14, 50], mix: { spruce: 0.52, pine: 0.22, round: 0.14, dead: 0.08, poplar: 0.04 }, place: 6603,
      keys: { pine: { dark: 'pinev_dark', mid: 'pinev_mid', lit: 'pinev_lit', trunk: 'pinev_dark' }, round: { dark: 'gold_dk', mid: 'gold', lit: 'gold_lit', trunk: 'wood_dark' } } },
    // The cabin on stilts at the water's edge, its deck reaching out over the lake.
    { id: 'cabin', kind: 'stiltcabin', parallax: 0.56, place: 7319, features: [{ x: 360 }] },
    // Phase 49: the shore's things (see loc_fog.js): a rowboat tied up by the diner's side, a duck box.
    { id: 'shore', kind: 'bank', parallax: 0.6, height: 3, reeds: 0.55, reedH: 15, rockEvery: 44, place: 9182, pads: 5, trunks: 1, cattails: 3,
      rock: { dark: 'rockv_dark', mid: 'rockv', lit: 'rockv_mid' }, ground: 'rockv_dark', reedKeys: ['reed_gold_dk', 'reed_gold', 'reed_gold_hi'],
      features: [{ kind: 'moored', x: 420 }, { kind: 'duckbox', x: 610 }, { kind: 'posts', x: 380, n: 3 }] },
    { id: 'marks', kind: 'landmarks', parallax: 1 }
  ],

  // Presentation only (see loc_fog.js). 2026-11-06: the Pines' own sky: dusk crimson over wine
  // with an orchid band at the ranges, dawn rose over lilac, the grey hours a dusty mauve haze,
  // the night wine-dark; long banded clouds lit rose underneath. grade: the layers go wine at
  // night and mauve in the grey hours; the water plum under a clearer mirror.
  sky: {
    moonX: 236, glowX: 160, glowKey: 'dusk_crimson_hi',
    keys: [
      [0, ['night_wine_ink', 'night_wine', 'night_berry', 'night_orchid']],
      [3, ['night_wine_ink', 'night_wine_ink', 'night_wine', 'night_berry']],
      [5, ['night_wine_ink', 'night_wine', 'night_berry', 'night_orchid']],
      [6.25, ['dusk_lilac_dk', 'dusk_wine', 'dusk_crimson', 'dusk_peach']],
      [7.5, ['dusk_lilac_dk', 'fog_mauve_dk', 'fog_mauve', 'dusk_peach']],
      [9, ['fog_mauve_dk', 'fog_mauve', 'fog_mauve', 'fog_mauve_hi']],
      [12.5, ['fog_mauve_dk', 'fog_mauve', 'fog_mauve_hi', 'fog_mauve_hi']],
      [16, ['fog_mauve_dk', 'fog_mauve', 'fog_mauve', 'fog_mauve_hi']],
      [17.5, ['dusk_wine_dk', 'dusk_wine', 'dusk_crimson', 'dusk_orchid']],
      [19, ['dusk_wine', 'dusk_crimson', 'dusk_crimson_hi', 'dusk_orchid']],
      [20.5, ['night_berry', 'dusk_wine_dk', 'dusk_wine', 'dusk_crimson']],
      [22, ['night_wine_ink', 'night_wine', 'night_berry', 'night_orchid']],
      [24, ['night_wine_ink', 'night_wine', 'night_berry', 'night_orchid']]
    ],
    cloudKeys: [['night_wine', 'night_berry', 'night_orchid'], ['fog_mauve_dk', 'fog_mauve', 'fog_mauve_hi'], ['dusk_wine', 'dusk_crimson_hi', 'dusk_rosepink'], [null, null, 'dusk_rosepink']]
  },
  grade: { night: ['night_wine', 0.6], grey: ['fog_mauve_dk', 0.3] },
  waterBase: 'water_plum',
  reflect: 1.45,
  mist: { h: 6, alpha: 0.12, drift: 2.5, color: 'fog_mauve' },

  // Life (see loc_fog.js). The gulls stand on the pier's rail; the fox crosses the diner's lot.
  life: {
    under: { cray: 5, snail: 5, fry: 3, tad: 0, turtle: true, eel: true, mussel: 4, caddis: false, litter: ['tyre', 'bottle', 'lure', 'tyre'], roots: 1, tree: 1, ribbon: 0.012, fern: 0.02, lily: 3, algae: 0.3 },
    above: {
      ducks: { p: 0.9, x: [500, 1050], young: 3, hours: [[5, 20.5]] },
      heron: { x: [1080, 1180], hours: [[5, 10], [16.5, 21.5]] },
      kingfisher: { perches: [{ x: 1180, y: 27 }, { x: 646, y: 30 }], hours: [[6.5, 18]] },
      loon: { p: 0.85, x: [600, 1100], hours: [[0, 24]], call: [[4.5, 6.5], [18, 22]] },
      dragonflies: { n: 4, x: [[20, 220], [1100, 1280]], hours: [[9, 17]] },
      frog: { hours: [[8, 1]] },
      striders: { n: 5, x: [[20, 200], [1100, 1280]], hours: [[8, 18]] },
      gulls: { n: 3, perches: [{ x: 8, y: 13 }, { x: 18, y: 13 }, { x: 28, y: 13 }, { x: 126, y: 26 }], hours: [[6, 19.5]] }, // on the pier's rail and its lamp (the user's fixes, 2026-11-03)
      fox: { layer: 'farshore', x: [270, 360], hours: [[21, 4.5]] }
    }
  },

  // The pier has the same seed as Fogbound's, so it is the same pier, plank for plank (11.4).
  // signal: blinks every `period` s; within `lead` game hours of a clock window it speeds up
  // toward `fast`, and inside a window it blinks at `fast`.
  landmarks: [
    { id: 'pier', kind: 'pier', x: 96, seed: 3301, from: 'left' },
    { id: 'signal', kind: 'signal', x: 640, period: 1.4, fast: 0.45, lead: 1 },
    { id: 'road', kind: 'road', x: 900 },
    { id: 'owl_branch', kind: 'owl_branch', x: 1170 }
  ],

  underwater: {
    bottomAmp: 40, rock: 'stone_dark', silt: 'rust_dark',
    grad: ['water_slate_lit', 'water_slate_mid', 'water_slate_dark', 'water_slate_deep'], // 2026-11-06: the plum lake's water, slate under it
    weed: 'moss', weedDark: 'moss_dark', weedDensity: 0.04, shaftEvery: 160
  },

  spots: [
    { id: 'pier_shade', kind: 'open', x: 96, r: 36 },
    { id: 'under_light', kind: 'open', x: 640, r: 30 },
    { id: 'lane_deep', kind: 'open', x: 770, r: 22, attract: 1.3 },
    { id: 'drowned_road', kind: 'open', x: 900, r: 34 },
    { id: 'culvert', kind: 'hidden', x: 1030, r: 22, attract: 1.6 }
  ],
  // Phase 74 (PLAN_WATERS.md): what kind of water it is, and its stretches by world x.
  water: 'lake',
  reaches: [{ id: 'the_pines', name: 'The Pines', x: [0, 1300] }]
};
