var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Wreckhollow Bay (Phase 74, PLAN_WATERS.md 2; the reference's Old Wreck Bay): a north Atlantic
// bay with a schooner's wreck on its side, a shelf dropping into deep water, and low rocks where
// seals haul out. Two reaches: The Shelf (the wreck and the drop beyond it) and Haul-out Rocks
// (low rocks, kelp and sand), where the pier is. Phase 74 paints it with the lake painters in
// sea colours; the wreck, the seals and the sea's own scenery are Phase 79.
G.data = G.data || {};
G.data.locations = G.data.locations || {};
G.data.locations.wreck = {
  id: 'wreck',
  name: 'Wreckhollow Bay',
  cost: 9500,
  width: 1400,
  waterY: 112,
  maxDepth: 160,
  seed: 4871,
  start: 1230, // just past the pier's reach
  dock: { x: 1304, reach: 60 },
  water: 'sea',
  reaches: [
    { id: 'the_shelf', name: 'The Shelf', x: [0, 700] },
    { id: 'haul_out_rocks', name: 'Haul-out Rocks', x: [700, 1400] }
  ],
  // A long, slow ocean swell (view px; see loc_fog.js).
  swell: { amp: 2.6, mirror: 1.2, waves: [[200, 12, 0.5], [64, -8, 0.3], [28, 6, 0.2]] },
  current: { lake: true, speed: 0.35, wind: 0.18, sway: 0.25, ramp: 4, period: 170, slack: 0.7, bottom: 0.15 },
  drift: function (seed, t, depth, onBottom, wind) { return G.data.lakeDrift(this, seed, t, depth, onBottom, wind); },

  layers: [
    { id: 'heads', kind: 'mountains', parallax: 0.06, base: 102, amp: 30, color: 'rock_dark', lit: 'rock', dark: 'night_deep', haze: 'mount_haze', snow: 'rock', snowDark: 'rock_dark' },
    { id: 'sea_fog', kind: 'fog', parallax: 0.14, y: 92, h: 20, color: 'fog_mid', alpha: 0.26, drift: 1.4 },
    { id: 'downs', kind: 'mountains', parallax: 0.22, base: 108, amp: 14, color: 'moss_dark', lit: 'moss', dark: 'night_deep', snow: 'moss', snowDark: 'moss_dark' },
    { id: 'fog_near', kind: 'fog', parallax: 0.45, y: 102, h: 10, color: 'fog_light', alpha: 0.15, drift: 3.2 },
    { id: 'shore', kind: 'bank', parallax: 0.6, height: 5, reeds: 0.1, rockEvery: 10, reedH: 8, place: 4889, ground: 'rock_dark',
      features: [{ kind: 'posts', x: 120, n: 4 }, { kind: 'moored', x: 760 }] },
    { id: 'marks', kind: 'landmarks', parallax: 1 }
  ],

  sky: { moonX: 140, glowX: 300 },
  mist: { h: 8, alpha: 0.15, drift: 4 },
  life: {
    under: { cray: 0, snail: 4, fry: 6, tad: 0, turtle: false, eel: false, mussel: 12, caddis: false, litter: ['bottle', 'tyre', 'lure'], roots: 0, tree: 0, ribbon: 0.04, fern: 0, lily: 0, algae: 0.6 },
    above: {
      ducks: { p: 0.9, x: [700, 1200], young: 0, hours: [[5, 20]] },
      heron: { x: [900, 1100], hours: [[5, 10], [16, 21]] },
      gulls: { n: 3, perches: [{ x: 1276, y: 13 }, { x: 1287, y: 13 }, { x: 1297, y: 13 }, { x: 1330, y: 26 }], hours: [[5.5, 20]] }
    }
  },

  landmarks: [
    { id: 'wreck', kind: 'wreck', x: 380 },
    { id: 'buoy_a', kind: 'marker', x: 640 },
    { id: 'pier', kind: 'pier', x: 1304, seed: 4802 }
  ],

  underwater: {
    bottomAmp: 70, rock: 'stone_dark', silt: 'stone',
    weed: 'moss', weedDark: 'moss_dark', weedDensity: 0.05, shaftEvery: 170
  },

  spots: [
    { id: 'pier_shade', kind: 'open', x: 1304, r: 34 },
    { id: 'wreck_hull', kind: 'open', x: 380, r: 36, attract: 1.3 },
    { id: 'shelf_drop', kind: 'open', x: 600, r: 30 },
    { id: 'seal_gut', kind: 'hidden', x: 980, r: 22, attract: 1.6 }
  ]
};
