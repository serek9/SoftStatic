var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Russetwood Lake (Phase 74, PLAN_WATERS.md 2; the reference's Autumnwood Lake): a big-river
// reservoir among oaks and maples in autumn colour. Two reaches: Reed Flats (a shallow edge
// with reeds and stumps) and Mink Cove (a cove over the old river channel, the deepest water).
// It takes the Red Room's place in the order of the waters. Phase 74 paints it with the
// existing layer kinds; Phase 78 gives it its own scenery (js/scene/lakes.js): the reed beds
// and drowned stumps of Reed Flats, the deadfall of Mink Cove where the otters play, the dam
// far off, and its bed's shape (the flats and the old river channel).
G.data = G.data || {};
G.data.locations = G.data.locations || {};
G.data.locations.russet = {
  id: 'russet',
  name: 'Russetwood Lake',
  cost: 4800,
  width: 1300,
  waterY: 112,
  maxDepth: 96,
  seed: 6619,
  start: 170, // just past the pier's reach, so arriving does not open its panel
  dock: { x: 96, reach: 60 },
  water: 'lake',
  scenery: 'russet', // Phase 78 (js/scene/lakes.js)
  reaches: [
    { id: 'reed_flats', name: 'Reed Flats', x: [0, 650] },
    { id: 'mink_cove', name: 'Mink Cove', x: [650, 1300] }
  ],
  // A medium chop (view px; see loc_fog.js): open water with the wind on it.
  swell: { amp: 1.6, mirror: 0.9, waves: [[84, 11, 0.5], [38, -7, 0.3], [19, 6, 0.2]] },
  current: { lake: true, speed: 0.3, wind: 0.12, sway: 0.2, ramp: 4, period: 200, slack: 0.75, bottom: 0.2 },
  drift: function (seed, t, depth, onBottom, wind) { return G.data.lakeDrift(this, seed, t, depth, onBottom, wind); },

  layers: [
    { id: 'hills', kind: 'mountains', parallax: 0.08, base: 98, amp: 26, color: 'mount_mid', lit: 'mount_lit', dark: 'night_deep', haze: 'mount_haze', snow: 'mount_lit', snowDark: 'mount_mid' },
    { id: 'fog_far', kind: 'fog', parallax: 0.18, y: 92, h: 12, color: 'fog_mid', alpha: 0.18, drift: 1 },
    { id: 'autumn', kind: 'forest', parallax: 0.26, base: 105, height: 22, gap: [2, 6], mix: { round: 0.7, poplar: 0.2, pine: 0.1 },
      keys: { pine: { dark: 'pine_dark', mid: 'pine_mid', lit: 'pine_lit', trunk: 'pine_dark' }, round: { dark: 'leaf_dim', mid: 'leaf_rust', lit: 'leaf_gold', trunk: 'wood_dark' } } },
    // Phase 78: the dam far off, between the hills, seen from Mink Cove (x, w world px in the layer; h over the water)
    { id: 'dam', kind: 'dam', parallax: 0.3, x: 380, w: 110, h: 34 },
    { id: 'fog_near', kind: 'fog', parallax: 0.44, y: 101, h: 9, color: 'fog_light', alpha: 0.1, drift: 2 },
    { id: 'woods', kind: 'forest', parallax: 0.5, base: 110, height: 34, gap: [14, 50], mix: { round: 0.65, poplar: 0.2, dead: 0.1, pine: 0.05 }, place: 6631,
      keys: { pine: { dark: 'pine_dark', mid: 'pine_mid', lit: 'pine_lit', trunk: 'pine_dark' }, round: { dark: 'leaf_dim', mid: 'leaf_rust', lit: 'leaf_gold', trunk: 'wood_dark' } } },
    { id: 'shore', kind: 'bank', parallax: 0.6, height: 3, reeds: 1.1, rockEvery: 50, reedH: 22, place: 6647, pads: 3, trunks: 3, cattails: 7,
      features: [{ kind: 'posts', x: 70, n: 3 }, { kind: 'posts', x: 330, n: 6 }, { kind: 'duckbox', x: 240 }] },
    { id: 'marks', kind: 'landmarks', parallax: 1 }
  ],

  sky: { moonX: 60, glowX: 220 },
  mist: { h: 5, alpha: 0.08, drift: 2.6 },
  life: {
    under: { cray: 7, snail: 6, fry: 6, tad: 2, turtle: true, eel: false, mussel: 6, caddis: false, litter: ['tyre', 'bottle', 'lure'], roots: 3, tree: 2, ribbon: 0.015, fern: 0.02, lily: 3, algae: 0.4 },
    above: {
      ducks: { p: 0.9, x: [200, 1100], young: 4, hours: [[5, 20.5]] },
      heron: { x: [380, 560], hours: [[5, 10], [16.5, 21.5]] },
      kingfisher: { perches: [{ x: 520, y: 28 }, { x: 1186, y: 10 }], hours: [[6.5, 18]] }, // Phase 78: one perch on the deadfall's roots
      dragonflies: { n: 6, x: [[30, 600]], hours: [[9, 17]] },
      frog: { hours: [[8, 1]] },
      striders: { n: 5, x: [[30, 600]], hours: [[8, 18]] },
      deer: { layer: 'shore', x: [580, 700], hours: [[5, 7.75], [17.25, 20]] },
      // Phase 78: a family of otters in Mink Cove, hauling out on the deadfall (log: its landmark)
      otter: { n: 3, x: [1030, 1290], log: 'deadfall_a', hours: [[5, 11], [15.5, 21]] }
    }
  },

  // Phase 78: Reed Flats' reed beds and drowned stumps; the buoy over the old channel; Mink
  // Cove's deadfall (dir: which way it lies, len world px).
  landmarks: [
    { id: 'pier', kind: 'pier', x: 96, seed: 6602 },
    { id: 'sign', kind: 'sign', x: 50 }, // Phase 76: the signpost at the pier's shore end
    { id: 'reeds_a', kind: 'reeds', x: 205, half: 36 },
    { id: 'snag_a', kind: 'snag', x: 420 },
    { id: 'stumps', kind: 'stumps', x: 480, half: 70, n: 8 },
    { id: 'reeds_b', kind: 'reeds', x: 612, half: 24 },
    { id: 'marker_a', kind: 'marker', x: 980 },
    { id: 'deadfall_a', kind: 'deadfall', x: 1190, dir: -1, len: 52 },
    { id: 'deadfall_b', kind: 'deadfall', x: 1280, dir: -1, len: 30 }
  ],

  underwater: {
    bottomAmp: 44, rock: 'stone_dark', silt: 'rust_dark',
    weed: 'moss', weedDark: 'moss_dark', weedDensity: 0.05, shaftEvery: 160,
    snags: [{ x: 420, top: 0 }, { x: 520, top: 20 }],
    // Phase 78: the bed: Reed Flats at 4-8 m, the old river channel under Mink Cove down to 24 m
    // (the sturgeon), shoaling at the cove's back.
    shape: [[0, 16], [200, 26], [560, 32], [700, 60], [860, 92], [1080, 95], [1200, 60], [1300, 40]]
  },

  spots: [
    { id: 'pier_shade', kind: 'open', x: 96, r: 34 },
    { id: 'stump_field', kind: 'open', x: 460, r: 40 },
    { id: 'old_channel', kind: 'open', x: 980, r: 28, attract: 1.3 },
    { id: 'cove_back', kind: 'hidden', x: 1200, r: 22, attract: 1.6 }
  ]
};
