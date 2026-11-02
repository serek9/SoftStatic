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
  cost: 1500,
  width: 1300,
  waterY: 112,
  maxDepth: 112,
  seed: 6271,
  start: 200,
  dock: { x: 330, reach: 60 }, // Phase 74: its pier, the same pier as Fogbound's (js/ui/dock.js)
  // Phase 20: the surface's swell (view px; see loc_fog.js): a medium chop.
  swell: { amp: 1.6, mirror: 0.9, waves: [[80, 11, 0.5], [37, -8, 0.3], [19, 6, 0.2]] },
  // Phase 22: a slow wind drift (G.data.lakeDrift in loc_fog.js).
  current: { lake: true, speed: 0.26, wind: 0.08, sway: 0.2, ramp: 4, period: 200, slack: 0.75, bottom: 0.2 },
  drift: function (seed, t, depth, onBottom, wind) { return G.data.lakeDrift(this, seed, t, depth, onBottom, wind); },
  scenery: 'pines',

  layers: [
    { id: 'ridge', kind: 'mountains', parallax: 0.08, base: 96, amp: 40, color: 'mount_far', lit: 'mount_lit', dark: 'night_deep', haze: 'mount_haze' },
    { id: 'fog_far', kind: 'fog', parallax: 0.18, y: 90, h: 12, color: 'fog_mid', alpha: 0.18, drift: 1 },
    { id: 'autumn', kind: 'forest', parallax: 0.25, base: 104, height: 22, gap: [2, 6], mix: { round: 0.55, pine: 0.3, poplar: 0.15 },
      keys: { pine: { dark: 'pine_dark', mid: 'pine_mid', lit: 'pine_lit', trunk: 'pine_dark' }, round: { dark: 'leaf_dim', mid: 'leaf_rust', lit: 'leaf_gold', trunk: 'wood_dark' } } },
    // The far shore: the diner (neon sign) and its parking lot (fluorescent lamps).
    { id: 'farshore', kind: 'farshore', parallax: 0.35, color: 'night_deep', base: 106,
      features: [{ kind: 'diner', x: 250 }, { kind: 'lot', x: 296, lamps: 3 }] },
    { id: 'fog_near', kind: 'fog', parallax: 0.45, y: 102, h: 9, color: 'fog_light', alpha: 0.12, drift: 2 },
    { id: 'woods', kind: 'forest', parallax: 0.5, base: 110, height: 32, gap: [24, 70], mix: { round: 0.5, pine: 0.25, poplar: 0.15, dead: 0.1 }, place: 6603,
      keys: { pine: { dark: 'pine_dark', mid: 'pine_mid', lit: 'pine_lit', trunk: 'pine_dark' }, round: { dark: 'leaf_dim', mid: 'leaf_rust', lit: 'leaf_gold', trunk: 'wood_dark' } } },
    // Phase 49: the shore's things (see loc_fog.js): a rowboat tied up by the diner's side, a duck box.
    { id: 'shore', kind: 'bank', parallax: 0.6, height: 3, reeds: 0.7, rockEvery: 44, place: 9182, pads: 5, trunks: 1, cattails: 3,
      features: [{ kind: 'moored', x: 420 }, { kind: 'duckbox', x: 610 }, { kind: 'posts', x: 380, n: 3 }] },
    { id: 'marks', kind: 'landmarks', parallax: 1 }
  ],

  // Presentation only (see loc_fog.js).
  sky: { moonX: 200, glowX: 40 },
  mist: { h: 5, alpha: 0.07, drift: 2.5 },

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
      gulls: { n: 3, perches: [{ x: 302, y: 13 }, { x: 313, y: 13 }, { x: 323, y: 13 }, { x: 361, y: 26 }], hours: [[6, 19.5]] },
      fox: { layer: 'farshore', x: [270, 360], hours: [[21, 4.5]] }
    }
  },

  // The pier has the same seed as Fogbound's, so it is the same pier, plank for plank (11.4).
  // signal: blinks every `period` s; within `lead` game hours of a clock window it speeds up
  // toward `fast`, and inside a window it blinks at `fast`.
  landmarks: [
    { id: 'pier', kind: 'pier', x: 330, seed: 3301 },
    { id: 'sign', kind: 'sign', x: 284 }, // Phase 76: the signpost at the pier's shore end
    { id: 'signal', kind: 'signal', x: 640, period: 1.4, fast: 0.45, lead: 1 },
    { id: 'road', kind: 'road', x: 900 },
    { id: 'owl_branch', kind: 'owl_branch', x: 1170 }
  ],

  underwater: {
    bottomAmp: 40, rock: 'stone_dark', silt: 'rust_dark',
    weed: 'moss', weedDark: 'moss_dark', weedDensity: 0.04, shaftEvery: 160
  },

  spots: [
    { id: 'pier_shade', kind: 'open', x: 330, r: 36 },
    { id: 'under_light', kind: 'open', x: 640, r: 30 },
    { id: 'lane_deep', kind: 'open', x: 770, r: 22, attract: 1.3 },
    { id: 'drowned_road', kind: 'open', x: 900, r: 34 },
    { id: 'culvert', kind: 'hidden', x: 1030, r: 22, attract: 1.6 }
  ],
  // Phase 74 (PLAN_WATERS.md): what kind of water it is, and its stretches by world x.
  water: 'lake',
  reaches: [{ id: 'the_pines', name: 'The Pines', x: [0, 1300] }]
};
