var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Fogbound Lake (V6.1): the starting location.
// x values are world pixels, except layer `features`, which are in that layer's own pixels
// (a layer with parallax p is 320 + (width - 320) × p wide). Depths are pixels (metres = px × 0.25).
G.data = G.data || {};
G.data.locations = G.data.locations || {};
G.data.locations.fog = {
  id: 'fog',
  name: 'Fogbound Lake',
  cost: 0,
  width: 1200,
  waterY: 112,
  maxDepth: 96,
  seed: 4021,
  start: 180,

  // Back to front. Every layer is baked once and only drawn with drawImage.
  // Phase 15: painted layers (js/gfx/paint.js): far peaks, a nearer ridge with the tower and
  // the mast, a pine forest, tall pines and birches near the water, and a reedy, rocky shore.
  layers: [
    { id: 'peaks', kind: 'mountains', parallax: 0.05, base: 92, amp: 50, color: 'mount_far', lit: 'mount_lit', dark: 'night_deep', haze: 'mount_haze' },
    { id: 'fog_high', kind: 'fog', parallax: 0.08, y: 66, h: 22, color: 'fog_mid', alpha: 0.16, drift: 0.7 },
    { id: 'ridge', kind: 'mountains', parallax: 0.14, base: 102, amp: 24, color: 'mount_mid', lit: 'mount_lit', dark: 'night_deep', haze: 'fog_dark', featureKey: 'night_deep',
      features: [{ kind: 'tower', x: 120 }, { kind: 'mast', x: 330 }] },
    { id: 'fog_far', kind: 'fog', parallax: 0.2, y: 84, h: 20, color: 'fog_mid', alpha: 0.32, drift: 1.2 },
    { id: 'trees', kind: 'forest', parallax: 0.3, base: 106, height: 17, gap: [2, 6], mix: { pine: 1 },
      keys: { pine: { dark: 'pine_dark', mid: 'pine_mid', lit: 'pine_lit', trunk: 'pine_dark' } } },
    { id: 'fog_near', kind: 'fog', parallax: 0.42, y: 97, h: 12, color: 'fog_light', alpha: 0.16, drift: 2.4 },
    { id: 'woods', kind: 'forest', parallax: 0.5, base: 110, height: 36, gap: [8, 46], mix: { pine: 1 },
      keys: { pine: { dark: 'pine_dark', mid: 'pine_mid', lit: 'pine_lit', trunk: 'pine_dark' }, birch: { bark: 'birch', dark: 'moss_dark', mid: 'moss', lit: 'moss_hi', trunk: 'birch' } } },
    { id: 'shore', kind: 'bank', parallax: 0.6, height: 4, reeds: 0.8, rockEvery: 38 },
    { id: 'marks', kind: 'landmarks', parallax: 1 }
  ],

  // Presentation only. sky: where the moon and the dusk glow sit (sky px); mist: a low band on
  // the water that drifts over the boat (fog layers drift by their own `drift`, px/s).
  sky: { moonX: 92, glowX: 236 },
  mist: { h: 7, alpha: 0.13, drift: 3 },

  // On the water at the boat's distance (parallax 1): x is where the landmark is centred.
  landmarks: [
    { id: 'pier', kind: 'pier', x: 300, seed: 3301 }, // the same pier stands in The Pines (11.4)
    { id: 'marker_a', kind: 'marker', x: 560 },
    { id: 'wreck', kind: 'wreck', x: 770 },
    { id: 'marker_b', kind: 'marker', x: 985 }
  ],

  // The cross-section (V3.3). The bottom wanders between maxDepth - bottomAmp and maxDepth,
  // and touches maxDepth somewhere. shaftEvery is the spacing of light shafts in px.
  underwater: {
    bottomAmp: 24, rock: 'stone_dark', silt: 'wood_dark',
    weed: 'moss', weedDark: 'moss_dark', weedDensity: 0.07, shaftEvery: 150
  },

  // Where casts land matters (sim/unease.js castBoost): attract (fish turn up sooner), rare
  // (× rare and legendary weights) and legend (× legendary weights) for a lure landing
  // within r px. kind 'hidden': the dog stares at it once (10.3). kind 'legendary': the dog
  // barks toward it while a legendary species lives here.
  spots: [
    { id: 'pier_shade', kind: 'open', x: 300, r: 36 },
    { id: 'channel', kind: 'open', x: 560, r: 40 },
    { id: 'wreck_hollow', kind: 'open', x: 770, r: 30 },
    { id: 'cold_hole', kind: 'legendary', x: 880, r: 22, legend: 4, where: 'over the cold hole, past the wreck' },
    { id: 'reed_gap', kind: 'hidden', x: 1110, r: 24, attract: 1.6, rare: 2 }
  ]
};
