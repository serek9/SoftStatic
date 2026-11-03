var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Hartsmere Lake (Phase 74, PLAN_WATERS.md 2; the reference's Fawnmirror Lake): a clear, deep,
// cold lake in the northern woods. Three reaches: The Weedbed (shallow flats of waving weed),
// Birch Point (a point with a picnic table, dropping off steeply) and The Old Bench (the quiet
// far end, a soft bottom). Phase 74 painted it with the existing layer kinds; Phase 78 gives it
// its own scenery (js/scene/lakes.js): birches, the point with its picnic table and fire ring,
// the old bench and rowboat, weed beds seen through the clear water, and its bed's shape (the
// shallow flats, the point and the steep drop beyond it).
G.data = G.data || {};
G.data.locations = G.data.locations || {};
G.data.locations.harts = {
  id: 'harts',
  name: 'Hartsmere Lake',
  cost: 2400,
  width: 1400,
  waterY: 112,
  maxDepth: 128,
  seed: 9133,
  start: 170, // just past the pier's reach, so arriving does not open its panel
  dock: { x: 96, reach: 60 },
  water: 'lake',
  scenery: 'harts', // Phase 78 (js/scene/lakes.js)
  reaches: [
    { id: 'the_weedbed', name: 'The Weedbed', x: [0, 480] },
    { id: 'birch_point', name: 'Birch Point', x: [480, 960] },
    { id: 'the_old_bench', name: 'The Old Bench', x: [960, 1400] }
  ],
  // Calm and glassy (view px; see loc_fog.js).
  swell: { amp: 1.1, mirror: 0.7, waves: [[110, 8, 0.5], [46, -5, 0.3], [24, 4, 0.2]] },
  current: { lake: true, speed: 0.22, wind: 0.1, sway: 0.2, ramp: 4, period: 220, slack: 0.75, bottom: 0.2 },
  drift: function (seed, t, depth, onBottom, wind) { return G.data.lakeDrift(this, seed, t, depth, onBottom, wind); },

  layers: [
    { id: 'peaks', kind: 'mountains', parallax: 0.06, base: 94, amp: 36, color: 'mount_far', lit: 'mount_lit', dark: 'night_deep', haze: 'mount_haze' },
    { id: 'fog_far', kind: 'fog', parallax: 0.16, y: 88, h: 14, color: 'fog_mid', alpha: 0.18, drift: 0.9 },
    { id: 'far_woods', kind: 'forest', parallax: 0.26, base: 105, height: 20, gap: [2, 5], mix: { pine: 0.6, spruce: 0.25, birch: 0.15 },
      keys: { pine: { dark: 'pine_dark', mid: 'pine_mid', lit: 'pine_lit', trunk: 'pine_dark' }, birch: { bark: 'birch', dark: 'moss_dark', mid: 'moss', lit: 'moss_hi', trunk: 'birch' } } },
    { id: 'fog_near', kind: 'fog', parallax: 0.42, y: 100, h: 9, color: 'fog_light', alpha: 0.1, drift: 2 },
    { id: 'woods', kind: 'forest', parallax: 0.5, base: 110, height: 34, gap: [10, 42], mix: { birch: 0.4, pine: 0.35, spruce: 0.2, dead: 0.05 }, place: 9141,
      keys: { pine: { dark: 'pine_dark', mid: 'pine_mid', lit: 'pine_lit', trunk: 'pine_dark' }, birch: { bark: 'birch', dark: 'moss_dark', mid: 'moss', lit: 'moss_hi', trunk: 'birch' } } },
    { id: 'shore', kind: 'bank', parallax: 0.6, height: 4, reeds: 0.6, rockEvery: 34, place: 9157, pads: 6, trunks: 1, cattails: 2,
      features: [{ kind: 'posts', x: 70, n: 3 }, { kind: 'duckbox', x: 300 }] }, // Phase 78: the rowboat is at the old bench now
    { id: 'marks', kind: 'landmarks', parallax: 1 }
  ],

  sky: { moonX: 240, glowX: 80 },
  mist: { h: 6, alpha: 0.1, drift: 2.4 },
  life: {
    under: { cray: 6, snail: 8, fry: 6, tad: 2, turtle: false, eel: false, mussel: 8, caddis: true, litter: ['bottle', 'lure'], roots: 1, tree: 1, ribbon: 0.04, fern: 0.03, lily: 4, algae: 0.4 },
    above: {
      ducks: { p: 0.9, x: [300, 1200], young: 4, hours: [[5, 21]] },
      heron: { x: [40, 200], hours: [[4.5, 10], [16, 22]] },
      kingfisher: { perches: [{ x: 600, y: 27 }, { x: 1250, y: 25 }], hours: [[6, 18.5]] },
      loon: { p: 0.85, x: [400, 1150], hours: [[0, 24]], call: [[4.5, 6.5], [18, 21.5]] },
      dragonflies: { n: 5, x: [[20, 420]], hours: [[9, 17.5]] },
      frog: { hours: [[7, 2]] },
      striders: { n: 6, x: [[20, 420]], hours: [[8, 18.5]] },
      deer: { layer: 'shore', x: [500, 640], hours: [[4.75, 7.5], [17.5, 20.25]] }
    }
  },

  // Phase 78: birches along the Weedbed and the far shore, Birch Point (half its width and its
  // height, world px), the buoy off its drop, the old bench with the rowboat drawn up by it.
  landmarks: [
    { id: 'pier', kind: 'pier', x: 96, seed: 9102 },
    { id: 'sign', kind: 'sign', x: 50 }, // Phase 76: the signpost at the pier's shore end
    { id: 'birches_a', kind: 'birches', x: 300, n: 4, half: 34 },
    { id: 'point', kind: 'point', x: 690, half: 44, h: 6 },
    { id: 'marker_a', kind: 'marker', x: 880 },
    { id: 'birches_b', kind: 'birches', x: 1070, n: 3, half: 26 },
    { id: 'bench', kind: 'bench', x: 1290, half: 24, h: 4, boat: true }
  ],

  // Phase 78: the weed beds seen from above through the clear water (a: how plainly).
  lake: { weed: { x: [[50, 430]], a: 0.45 } },

  underwater: {
    bottomAmp: 64, rock: 'stone_dark', silt: 'wood_dark',
    weed: 'moss', weedDark: 'moss_dark', weedDensity: 0.09, shaftEvery: 140,
    // Phase 78: the bed ([x, depth px], 4 px a metre): the Weedbed's flats at 4-5 m sloping to
    // 22 m by its edge (the cisco), Birch Point rising to 2 m and dropping sheer to 31 m (the
    // lake trout), deep water along the far end, shoaling to a soft 7 m by the old bench.
    shape: [[0, 14], [300, 20], [400, 44], [480, 88], [600, 40], [670, 9], [715, 12], [760, 100], [800, 124], [960, 120], [1150, 112], [1300, 44], [1400, 28]],
    weedBeds: [[40, 440, 0.3]]
  },

  spots: [
    { id: 'pier_shade', kind: 'open', x: 96, r: 34 },
    { id: 'weed_edge', kind: 'open', x: 400, r: 36 },
    { id: 'point_drop', kind: 'open', x: 760, r: 26, attract: 1.3 },
    { id: 'bench_hole', kind: 'hidden', x: 1200, r: 24, attract: 1.6 }
  ]
};
