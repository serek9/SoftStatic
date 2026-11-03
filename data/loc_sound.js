var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Coldharbor Sound (Phase 74, PLAN_WATERS.md 2; the reference's Icewater Sea): a north Pacific
// coast of dark rock headlands, a lighthouse, kelp and a breakwater. Swell, not current. Three
// reaches: Lamplight Head (the lighthouse's headland, rock to the bottom), Skerry Reef (rocks
// awash, kelp forest) and Harbour Cove (behind the breakwater, calm, sand), where the pier is.
// Phase 74 paints it with the lake painters in sea colours; the sea's own scenery is Phase 79.
// The sea's real depths are pressed into 40 m: deep-water fish are fished on the bottom.
G.data = G.data || {};
G.data.locations = G.data.locations || {};
G.data.locations.sound = {
  id: 'sound',
  name: 'Coldharbor Sound',
  cost: 7000,
  width: 1500,
  waterY: 112,
  maxDepth: 160,
  seed: 5557,
  start: 1330, // just past the pier's reach
  dock: { x: 1404, reach: 60 },
  water: 'sea',
  reaches: [
    { id: 'lamplight_head', name: 'Lamplight Head', x: [0, 500] },
    { id: 'skerry_reef', name: 'Skerry Reef', x: [500, 1000] },
    { id: 'harbour_cove', name: 'Harbour Cove', x: [1000, 1500] }
  ],
  // A long, slow ocean swell (view px; see loc_fog.js), bigger than any lake's.
  swell: { amp: 2.8, mirror: 1.2, waves: [[180, 14, 0.5], [70, -9, 0.3], [26, 7, 0.2]] },
  // No current: the wind's drift, stronger than on a lake (G.data.lakeDrift in loc_fog.js).
  current: { lake: true, speed: 0.35, wind: 0.18, sway: 0.25, ramp: 4, period: 160, slack: 0.7, bottom: 0.15 },
  drift: function (seed, t, depth, onBottom, wind) { return G.data.lakeDrift(this, seed, t, depth, onBottom, wind); },

  layers: [
    { id: 'heads', kind: 'mountains', parallax: 0.06, base: 100, amp: 40, color: 'rock_dark', lit: 'rock', dark: 'night_deep', haze: 'mount_haze', snow: 'rock', snowDark: 'rock_dark' },
    { id: 'sea_fog', kind: 'fog', parallax: 0.14, y: 92, h: 18, color: 'fog_mid', alpha: 0.24, drift: 1.6 },
    { id: 'cliffs', kind: 'mountains', parallax: 0.22, base: 108, amp: 22, color: 'rock', lit: 'rock_lit', dark: 'rock_dark', snow: 'rock_lit', snowDark: 'rock' },
    { id: 'spruce', kind: 'forest', parallax: 0.32, base: 108, height: 14, gap: [6, 22], mix: { spruce: 0.7, pine: 0.3 },
      keys: { pine: { dark: 'pine_dark', mid: 'pine_mid', lit: 'pine_lit', trunk: 'pine_dark' } } },
    { id: 'fog_near', kind: 'fog', parallax: 0.45, y: 102, h: 10, color: 'fog_light', alpha: 0.14, drift: 3 },
    { id: 'shore', kind: 'bank', parallax: 0.6, height: 6, reeds: 0, rockEvery: 12, place: 5571, ground: 'rock_dark',
      features: [{ kind: 'moored', x: 820 }, { kind: 'moored', x: 870 }, { kind: 'posts', x: 760, n: 6 }] },
    { id: 'marks', kind: 'landmarks', parallax: 1 }
  ],

  sky: { moonX: 280, glowX: 120 },
  mist: { h: 8, alpha: 0.14, drift: 4 },
  life: {
    under: { cray: 0, snail: 4, fry: 7, tad: 0, turtle: false, eel: false, mussel: 14, caddis: false, litter: ['bottle', 'tyre'], roots: 0, tree: 0, ribbon: 0.045, fern: 0, lily: 0, algae: 0.7 },
    above: {
      ducks: { p: 0.9, x: [500, 1200], young: 0, hours: [[5, 20]] },
      heron: { x: [40, 200], hours: [[5, 10], [16, 21]] },
      gulls: { n: 3, perches: [{ x: 1376, y: 13 }, { x: 1387, y: 13 }, { x: 1397, y: 13 }, { x: 1430, y: 26 }], hours: [[5.5, 20]] }
    }
  },

  landmarks: [
    { id: 'pier', kind: 'pier', x: 1404, seed: 5502, from: 'right' },
    { id: 'buoy_a', kind: 'marker', x: 300 },
    { id: 'buoy_b', kind: 'marker', x: 760 }
  ],

  underwater: {
    bottomAmp: 50, rock: 'stone_dark', silt: 'stone',
    weed: 'moss', weedDark: 'moss_dark', weedDensity: 0.06, shaftEvery: 170
  },

  spots: [
    { id: 'pier_shade', kind: 'open', x: 1404, r: 34 },
    { id: 'head_ledge', kind: 'open', x: 260, r: 34, attract: 1.3 },
    { id: 'reef_edge', kind: 'open', x: 760, r: 40 },
    { id: 'kelp_gap', kind: 'hidden', x: 620, r: 22, attract: 1.6 }
  ]
};
