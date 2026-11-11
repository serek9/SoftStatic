var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The fish's anatomy specs (Phase 70, PLAN_SPECIES.md 3.5), painted by js/gfx/fishgen.js
// (paintSpec; the format is described there). One entry per species id in data/fish.js: since
// Phase 72 every species has one (--validate fails on a species without). Body lengths run from the
// tail's root (x 0) to the snout (x 1), y down from the middle line; depths v run 0 (back) to 1
// (belly). Colours are palette keys (js/gfx/sprites.js, the fish_ ramps). Painted from the real
// fish and the reference icons for size and detail: our own drawing, facing right as the game's
// fish do.
G.data = G.data || {};

(function () {
  var FIN_OL = ['fish_finol_0', 'fish_finol_1', 'fish_finol_2', 'fish_finol_3'];
  var FIN_GR = ['fish_fingr_0', 'fish_fingr_1', 'fish_fingr_2', 'fish_fingr_3'];
  var FIN_OR = ['fish_orange_0', 'fish_orange_1', 'fish_orange_2', 'fish_orange_3'];
  function ramp(n) { return ['fish_' + n + '_0', 'fish_' + n + '_1', 'fish_' + n + '_2', 'fish_' + n + '_3', 'fish_' + n + '_4', 'fish_' + n + '_5']; }
  // The fins most of these share: a pelvic hanging back under the pectoral, a pectoral over the flank.
  // Compact, swept fins like the reference plates; the flank stays the main silhouette.
  function pelvic(x, len, r) { return { k: 'pelvic', x: x, v: 0.9, ang: 136, len: len * 1.1, spread: 38, prof: [0.7, 1, 0.9, 0.6], rays: 5, ramp: r }; }
  function pectoral(x, v, len, r) { return { k: 'pectoral', x: x + 0.01, v: v, ang: 162, len: len * 1.2, spread: 40, prof: [0.4, 0.75, 0.95, 1, 0.8], rays: 5, front: true, clear: true, ramp: r }; }

  // Phase 71: the salmonids' fins: a soft dorsal tallest in front, the adipose behind it, the anal,
  // the pelvics under the dorsal (far back, as in every trout), the pectoral low behind the gill.
  function ext(o, more) { var out = {}, k; for (k in o) out[k] = o[k]; for (k in more) out[k] = more[k]; return out; }
  function sfins(o) {
    var lo = o.lo || o.fin;
    return [
      ext({ k: 'dorsal', a: o.d[0], b: o.d[1], h: o.d[2], prof: o.dprof || [0.85, 1, 0.94, 0.8, 0.66, 0.54, 0.46], rays: o.drays || 11, lean: o.dlean || 0.6 }, o.dmore || {}),
      ext({ k: 'adipose', a: o.ad[0], b: o.ad[1], h: o.ad[2], prof: [0.35, 0.85, 1, 0.8, 0.4], ramp: o.adr || o.fin }, {}),
      ext({ k: 'anal', a: o.an[0], b: o.an[1], h: o.an[2], prof: [0.85, 1, 0.88, 0.7, 0.55, 0.48], rays: 9, lean: 0.75, ramp: lo }, o.lmore || {}),
      ext(ext(pelvic(o.pel[0], o.pel[1], lo), { ang: 140, spread: 58, prof: [0.75, 1, 0.95, 0.75] }), o.lmore || {}),
      ext(pectoral(o.pec[0], o.pec[1], o.pec[2], lo), o.pmore || {})
    ];
  }
  var TROUT_BODY = [[0, -0.068, 0.061], [0.15, -0.115, 0.105], [0.4, -0.159, 0.143], [0.6, -0.165, 0.143], [0.78, -0.146, 0.127], [0.92, -0.099, 0.084], [1, -0.048, 0.045]];
  var WHITE_LEAD = ['fish_white', 'fish_spot'];

  G.data.fishLooks = {
    // ---- perches ----
    yellow_perch: {
      px: 86,
      body: [[0, -0.056, 0.05], [0.12, -0.101, 0.09], [0.3, -0.162, 0.134], [0.5, -0.196, 0.151], [0.66, -0.19, 0.146], [0.8, -0.158, 0.127], [0.92, -0.09, 0.077], [1, -0.031, 0.034]],
      ramp: ramp('perch'), stops: [0.1, 0.22, 0.4, 0.62, 0.8], sheen: [0.26, 0.38],
      head: { gill: 0.74, bulge: 0.053, pre: 0.8, eye: [0.885, -0.055, 0.043], iris: 'fish_eye_gold', rim: 'fish_perch_0', mouth: [0.012, 0.11, 0.008, 1], lip: true, cheek: 1 },
      lateral: { v: 0.24, arch: 0.05, d: 1 }, scales: { size: 3, v0: 0.14, v1: 0.92, d: -1 },
      tail: { len: 0.2, spread: 0.176, fork: 0.4, rays: 15 }, fin: FIN_OL,
      fins: [
        { k: 'dorsal', a: 0.45, b: 0.72, h: 0.221, prof: [0.55, 0.95, 1, 0.92, 0.8, 0.62, 0.42, 0.25], rays: 13, spiny: true, lean: 0.35 },
        { k: 'dorsal', a: 0.2, b: 0.43, h: 0.143, prof: [0.7, 1, 0.95, 0.85, 0.65, 0.4], rays: 12, lean: 0.3 },
        { k: 'anal', a: 0.17, b: 0.31, h: 0.13, prof: [0.8, 1, 0.85, 0.6, 0.35], rays: 8, lean: 0.3, ramp: FIN_OR },
        pelvic(0.66, 0.13, FIN_OR), pectoral(0.7, 0.55, 0.13)
      ],
      marks: [{ k: 'bars', xs: [0.1, 0.22, 0.34, 0.46, 0.57, 0.67], w: 0.055, v0: 0, v1: 0.74, taper: 0.55, slant: -0.02, d: -2 }]
    },
    walleye: {
      px: 100,
      body: [[0, -0.054, 0.048], [0.15, -0.096, 0.084], [0.4, -0.138, 0.12], [0.6, -0.144, 0.12], [0.78, -0.13, 0.11], [0.92, -0.076, 0.062], [1, -0.032, 0.031]],
      ramp: ramp('walleye'), stops: [0.1, 0.24, 0.42, 0.66, 0.84], sheen: [0.28, 0.4],
      head: { gill: 0.75, bulge: 0.045, pre: 0.81, eye: [0.89, -0.04, 0.046], iris: 'fish_eye_glass', rim: 'fish_walleye_0', mouth: [0.008, 0.15, 0.01, 0], lip: true, cheek: 1 },
      lateral: { v: 0.3, arch: 0.05, d: 1 }, scales: { size: 3, v0: 0.12, v1: 0.9, d: -1 },
      tail: { len: 0.19, spread: 0.162, fork: 0.42, rays: 15, tip: 'fish_walleye_5' }, fin: FIN_OL,
      fins: [
        { k: 'dorsal', a: 0.46, b: 0.7, h: 0.143, prof: [0.6, 1, 0.95, 0.85, 0.72, 0.55, 0.4], rays: 13, spiny: true, lean: 0.3, spot: [0.72, 1, 0, 0.55, 'fish_walleye_0'] },
        { k: 'dorsal', a: 0.18, b: 0.4, h: 0.124, prof: [0.8, 1, 0.92, 0.8, 0.6, 0.4], rays: 14, lean: 0.3 },
        { k: 'anal', a: 0.16, b: 0.3, h: 0.111, prof: [0.8, 1, 0.85, 0.55, 0.35], rays: 10, lean: 0.3, spot: [0, 0.3, 0.55, 1, 'fish_walleye_5'] },
        pelvic(0.67, 0.11), pectoral(0.71, 0.58, 0.11)
      ],
      marks: [{ k: 'saddles', xs: [0.14, 0.29, 0.44, 0.57, 0.69], w: 0.085, v0: 0, v1: 0.46, taper: 0.35, d: -2 }]
    },
    // ---- sunfish & bass ----
    rock_bass: {
      px: 80,
      body: [[0, -0.069, 0.063], [0.15, -0.149, 0.127], [0.4, -0.23, 0.19], [0.6, -0.236, 0.19], [0.8, -0.186, 0.156], [0.93, -0.099, 0.079], [1, -0.035, 0.035]],
      ramp: ramp('rock'), stops: [0.1, 0.24, 0.42, 0.64, 0.84], sheen: [0.24, 0.36],
      head: { gill: 0.73, bulge: 0.060, pre: 0.79, eye: [0.87, -0.06, 0.061], iris: 'fish_eye_red', rim: 'fish_rock_0', mouth: [0.008, 0.14, 0.012, 2], lip: true, cheek: 1 },
      lateral: { v: 0.24, arch: 0.05, d: 1 }, scales: { size: 3, v0: 0.12, v1: 0.92, d: -1 },
      tail: { len: 0.18, spread: 0.189, fork: 0.22, rays: 15 }, fin: FIN_OL,
      fins: [
        { k: 'dorsal', a: 0.46, b: 0.74, h: 0.143, prof: [0.5, 0.9, 1, 0.95, 0.9, 0.85, 0.85], rays: 11, spiny: true, lean: 0.3 },
        { k: 'dorsal', a: 0.18, b: 0.46, h: 0.182, prof: [0.8, 1, 1, 0.9, 0.7, 0.45], rays: 11, lean: 0.3 },
        { k: 'anal', a: 0.15, b: 0.4, h: 0.182, prof: [0.4, 0.8, 1, 0.95, 0.75, 0.45], rays: 12, lean: 0.3 },
        pelvic(0.66, 0.12), pectoral(0.7, 0.55, 0.14)
      ],
      marks: [
        { k: 'stripes', vs: [0.32, 0.42, 0.52, 0.62, 0.72, 0.82], w: 1, dots: 3, broken: 0.3, x0: 0.04, x1: 0.71, d: -2 },
        { k: 'blotch', x: 0.735, v: 0.32, rx: 0.014, ry: 0.07, key: 'fish_rock_0' }
      ]
    },
    smallmouth_bass: {
      px: 90,
      body: [[0, -0.063, 0.057], [0.15, -0.115, 0.103], [0.4, -0.172, 0.149], [0.6, -0.178, 0.149], [0.8, -0.149, 0.124], [0.93, -0.086, 0.079], [1, -0.035, 0.037]],
      ramp: ramp('smb'), stops: [0.1, 0.24, 0.44, 0.66, 0.84], sheen: [0.25, 0.38],
      head: { gill: 0.74, bulge: 0.053, pre: 0.8, eye: [0.885, -0.05, 0.046], iris: 'fish_eye_red', rim: 'fish_smb_0', mouth: [0.012, 0.14, 0.012, 2], lip: true, cheek: 1 },
      lateral: { v: 0.3, arch: 0.05, d: 1 }, scales: { size: 3, v0: 0.12, v1: 0.92, d: -1 },
      tail: { len: 0.19, spread: 0.176, fork: 0.28, rays: 15, ramp: ['fish_smb_2', 'fish_smb_3', 'fish_orange_1', 'fish_orange_2'] }, fin: FIN_OL,
      fins: [
        { k: 'dorsal', a: 0.44, b: 0.68, h: 0.13, prof: [0.5, 0.9, 1, 0.95, 0.85, 0.7, 0.6], rays: 10, spiny: true, lean: 0.3 },
        { k: 'dorsal', a: 0.2, b: 0.44, h: 0.156, prof: [0.75, 0.95, 1, 0.9, 0.7, 0.45], rays: 13, lean: 0.3 },
        { k: 'anal', a: 0.17, b: 0.33, h: 0.13, prof: [0.85, 1, 0.85, 0.6, 0.35], rays: 10, lean: 0.3 },
        pelvic(0.66, 0.11), pectoral(0.7, 0.6, 0.12)
      ],
      marks: [
        { k: 'bars', xs: [0.08, 0.18, 0.28, 0.38, 0.48, 0.58, 0.67], w: 0.05, v0: 0.04, v1: 0.8, taper: 0.4, d: -2 },
        { k: 'stripes', vs: [0.42, 0.58], w: 1, x0: 0.76, x1: 0.86, d: -2 }
      ]
    },
    largemouth_bass: {
      px: 96,
      body: [[0, -0.066, 0.06], [0.15, -0.12, 0.108], [0.4, -0.186, 0.162], [0.6, -0.192, 0.162], [0.8, -0.168, 0.143], [0.93, -0.097, 0.09], [1, -0.042, 0.048]],
      ramp: ramp('lmb'), stops: [0.1, 0.24, 0.42, 0.64, 0.82], sheen: [0.22, 0.34],
      head: { gill: 0.73, bulge: 0.060, pre: 0.79, eye: [0.875, -0.05, 0.041], iris: 'fish_eye_gold', rim: 'fish_lmb_0', mouth: [0.016, 0.22, 0.02, 3], lip: true, cheek: 1 },
      lateral: { v: 0.36, arch: 0.04, d: 1 }, scales: { size: 3, v0: 0.12, v1: 0.92, d: -1 },
      tail: { len: 0.19, spread: 0.176, fork: 0.25, rays: 15 }, fin: FIN_OL,
      fins: [
        { k: 'dorsal', a: 0.48, b: 0.7, h: 0.143, prof: [0.5, 0.95, 1, 0.9, 0.75, 0.5, 0.3], rays: 10, spiny: true, lean: 0.3 },
        { k: 'dorsal', a: 0.2, b: 0.44, h: 0.169, prof: [0.6, 0.95, 1, 0.9, 0.7, 0.45], rays: 13, lean: 0.3 },
        { k: 'anal', a: 0.17, b: 0.33, h: 0.143, prof: [0.85, 1, 0.85, 0.6, 0.35], rays: 11, lean: 0.3 },
        pelvic(0.66, 0.12), pectoral(0.7, 0.58, 0.13)
      ],
      marks: [{ k: 'band', v0: 0.38, v1: 0.54, x0: 0.02, x1: 0.73, jag: 0.12, d: -2 }]
    },
    bluegill: {
      px: 68,
      body: [[0, -0.07, 0.065], [0.12, -0.16, 0.15], [0.32, -0.26, 0.235], [0.52, -0.275, 0.245], [0.72, -0.22, 0.2], [0.88, -0.13, 0.11], [1, -0.043, 0.037]],
      ramp: ramp('blue'), stops: [0.1, 0.22, 0.38, 0.56, 0.74], sheen: [0.22, 0.34],
      zones: [{ x0: 0.4, x1: 0.92, v0: 0.5, v1: 1, ramp: ['fish_blue_2', 'fish_blue_3', 'fish_blue_4', 'fish_breast_0', 'fish_breast_2', 'fish_breast_3'] }],
      head: { gill: 0.74, bulge: 0.068, pre: 0.8, eye: [0.88, -0.07, 0.054], iris: 'fish_eye_gold', rim: 'fish_blue_0', mouth: [0.008, 0.05, 0, 0] },
      lateral: { v: 0.2, arch: 0.05, d: 1 }, scales: { size: 3, v0: 0.12, v1: 0.92, d: -1, n: 0.35 },
      tail: { len: 0.17, spread: 0.203, fork: 0.2, rays: 14 }, fin: FIN_OL,
      fins: [
        { k: 'dorsal', a: 0.46, b: 0.74, h: 0.156, prof: [0.5, 0.9, 1, 0.95, 0.85, 0.8], rays: 10, spiny: true, lean: 0.3 },
        { k: 'dorsal', a: 0.16, b: 0.46, h: 0.195, prof: [0.8, 1, 1, 0.9, 0.7, 0.4], rays: 12, lean: 0.3, spot: [0.72, 1, 0, 0.45, 'fish_blue_0'] },
        { k: 'anal', a: 0.14, b: 0.4, h: 0.169, prof: [0.5, 0.9, 1, 0.9, 0.7, 0.4], rays: 11, lean: 0.3 },
        pelvic(0.64, 0.13),
        { k: 'pectoral', x: 0.7, v: 0.5, ang: 160, len: 0.18, spread: 40, prof: [0.5, 0.8, 1, 0.85, 0.5], rays: 9, front: true }
      ],
      marks: [
        { k: 'saddles', xs: [0.14, 0.26, 0.38, 0.5, 0.62], w: 0.06, v0: 0.05, v1: 0.72, taper: 0.2, d: -1 },
        { k: 'blotch', x: 0.725, v: 0.32, rx: 0.025, ry: 0.1, key: 'fish_blue_0' }
      ]
    },
    crappie: {
      px: 84,
      body: [[0, -0.068, 0.063], [0.15, -0.158, 0.147], [0.38, -0.236, 0.226], [0.58, -0.236, 0.215], [0.78, -0.181, 0.159], [0.92, -0.097, 0.061], [1, -0.055, 0.012]],
      ramp: ramp('crap'), stops: [0.1, 0.24, 0.42, 0.62, 0.82], sheen: [0.24, 0.36],
      head: { gill: 0.74, bulge: 0.068, pre: 0.8, eye: [0.88, -0.065, 0.054], iris: 'fish_eye_gold', rim: 'fish_crap_0', mouth: [-0.015, 0.13, 0.035, 0], lip: true, cheek: 1 },
      lateral: { v: 0.24, arch: 0.05, d: 1 }, scales: { size: 3, v0: 0.12, v1: 0.92, d: -1 },
      tail: { len: 0.18, spread: 0.203, fork: 0.25, rays: 15 }, fin: FIN_OL,
      fins: [
        { k: 'dorsal', a: 0.38, b: 0.56, h: 0.143, prof: [0.4, 0.8, 1, 0.95, 0.9], rays: 7, spiny: true, lean: 0.3, mottle: 'fish_crap_1' },
        { k: 'dorsal', a: 0.14, b: 0.38, h: 0.221, prof: [0.85, 1, 0.95, 0.8, 0.6, 0.35], rays: 15, lean: 0.3, mottle: 'fish_crap_1' },
        { k: 'anal', a: 0.13, b: 0.42, h: 0.221, prof: [0.35, 0.7, 0.95, 1, 0.85, 0.6, 0.35], rays: 17, lean: 0.3, mottle: 'fish_crap_1' },
        pelvic(0.64, 0.12), pectoral(0.7, 0.55, 0.13)
      ],
      marks: [
        { k: 'spots', n: 70, x0: 0.03, x1: 0.74, v0: 0.04, v1: 0.9, r: 1.2, seed: 7001, d: -2 },
        { k: 'spots', n: 40, x0: 0.05, x1: 0.85, v0: 0.02, v1: 0.6, r: 0.8, seed: 7002, d: -1 }
      ]
    },
    // ---- trout, salmon and char (Phase 71) ----
    rainbow_trout: {
      px: 88,
      body: [[0, -0.07, 0.062], [0.15, -0.121, 0.111], [0.4, -0.176, 0.155], [0.6, -0.181, 0.155], [0.78, -0.159, 0.135], [0.92, -0.105, 0.087], [1, -0.053, 0.045]],
      ramp: ramp('rainbow'), stops: [0.1, 0.24, 0.42, 0.62, 0.8], sheen: [0.26, 0.36],
      zones: [{ x0: 0.02, x1: 0.88, v0: 0.4, v1: 0.6, ramp: ['fish_rainbow_1', 'fish_rainbow_2', 'fish_pinkband_0', 'fish_pinkband_1', 'fish_pinkband_2', 'fish_pinkband_3'] }],
      head: { gill: 0.73, bulge: 0.058, pre: 0.79, eye: [0.885, -0.047, 0.048], iris: 'fish_eye_gold', rim: 'fish_rainbow_0', mouth: [0.022, 0.149, 0.012, 0], lip: true, cheek: 1 },
      lateral: { v: 0.48, arch: 0.03, d: 1 }, scales: { size: 2, v0: 0.12, v1: 0.9, d: -1, n: 0.3 },
      tail: { len: 0.19, spread: 0.195, fork: 0.18, rays: 14, ramp: ['fish_finrose_0', 'fish_finrose_1', 'fish_finrose_2', 'fish_finrose_3'], speck: { key: 'fish_spot', cell: 3, n: 0.55, seed: 11 } },
      fin: ['fish_finrose_0', 'fish_finrose_1', 'fish_finrose_2', 'fish_finrose_3'],
      fins: sfins({ d: [0.44, 0.62, 0.141], ad: [0.15, 0.2, 0.038], an: [0.14, 0.28, 0.126], pel: [0.46, 0.135], pec: [0.72, 0.7, 0.122], fin: ['fish_finrose_0', 'fish_finrose_1', 'fish_finrose_2', 'fish_finrose_3'], dmore: { speck: { key: 'fish_spot', cell: 3, n: 0.5, seed: 12 } }, adr: ['fish_rainbow_2', 'fish_rainbow_2', 'fish_rainbow_2', 'fish_rainbow_3'] }),
      marks: [
        { k: 'spots', n: 70, x0: 0.02, x1: 0.82, v0: 0.02, v1: 0.55, r: 0.8, seed: 7101, d: -3 },
        { k: 'spots', n: 18, x0: 0.02, x1: 0.4, v0: 0.5, v1: 0.8, r: 0.7, seed: 7102, d: -3 }
      ]
    },
    steelhead: {
      px: 92,
      body: [[0, -0.068, 0.059], [0.15, -0.116, 0.105], [0.4, -0.167, 0.149], [0.6, -0.173, 0.149], [0.78, -0.151, 0.13], [0.92, -0.103, 0.084], [1, -0.053, 0.045]],
      ramp: ramp('steel'), stops: [0.1, 0.24, 0.42, 0.62, 0.8], sheen: [0.24, 0.36],
      zones: [{ x0: 0.55, x1: 0.88, v0: 0.42, v1: 0.75, ramp: ['fish_steel_1', 'fish_steel_2', 'fish_steel_3', 'fish_pinkband_2', 'fish_pinkband_3', 'fish_steel_5'] }],
      head: { gill: 0.73, bulge: 0.058, pre: 0.79, eye: [0.885, -0.047, 0.046], iris: 'fish_eye_silver', rim: 'fish_steel_0', mouth: [0.022, 0.149, 0.012, 0], lip: true, cheek: 1 },
      lateral: { v: 0.46, arch: 0.03, d: 1 }, scales: { size: 2, v0: 0.12, v1: 0.9, d: -1, n: 0.3 },
      tail: { len: 0.19, spread: 0.195, fork: 0.2, rays: 14, ramp: ['fish_finblue_0', 'fish_finblue_1', 'fish_finblue_2', 'fish_finblue_3'], speck: { key: 'fish_spot', cell: 3, n: 0.45, seed: 13 } },
      fin: ['fish_finrose_0', 'fish_finrose_1', 'fish_finrose_2', 'fish_finrose_3'],
      fins: sfins({ d: [0.44, 0.62, 0.135], ad: [0.15, 0.2, 0.038], an: [0.14, 0.28, 0.12], pel: [0.46, 0.135], pec: [0.72, 0.7, 0.111], fin: ['fish_finrose_0', 'fish_finrose_1', 'fish_finrose_2', 'fish_finrose_3'], dmore: { ramp: ['fish_finblue_0', 'fish_finblue_1', 'fish_finblue_2', 'fish_finblue_3'], speck: { key: 'fish_spot', cell: 3, n: 0.4, seed: 14 } }, adr: ['fish_steel_2', 'fish_steel_2', 'fish_steel_2', 'fish_steel_3'] }),
      marks: [{ k: 'spots', n: 55, x0: 0.02, x1: 0.78, v0: 0.02, v1: 0.42, r: 0.8, seed: 7103, d: -3 }]
    },
    brown_trout: {
      px: 88,
      body: [[0, -0.073, 0.065], [0.15, -0.121, 0.113], [0.4, -0.17, 0.157], [0.6, -0.176, 0.157], [0.78, -0.157, 0.138], [0.92, -0.108, 0.093], [1, -0.057, 0.048]],
      ramp: ramp('brown'), stops: [0.1, 0.24, 0.42, 0.62, 0.8], sheen: [0.26, 0.36],
      head: { gill: 0.73, bulge: 0.058, pre: 0.79, eye: [0.885, -0.047, 0.05], iris: 'fish_eye_red', rim: 'fish_brown_0', mouth: [0.024, 0.172, 0.012, 0], lip: true, cheek: 1 },
      lateral: { v: 0.46, arch: 0.03, d: 1 }, scales: { size: 2, v0: 0.12, v1: 0.9, d: -1, n: 0.3 },
      tail: { len: 0.18, spread: 0.195, fork: 0.06, rays: 14, ramp: ['fish_fingold_0', 'fish_fingold_1', 'fish_fingold_2', 'fish_fingold_3'] },
      fin: ['fish_fingold_0', 'fish_fingold_1', 'fish_fingold_2', 'fish_fingold_3'],
      fins: sfins({ d: [0.44, 0.62, 0.141], ad: [0.15, 0.2, 0.04], an: [0.14, 0.28, 0.126], pel: [0.46, 0.135], pec: [0.72, 0.7, 0.122], fin: ['fish_fingold_0', 'fish_fingold_1', 'fish_fingold_2', 'fish_fingold_3'], dmore: { speck: { key: 'fish_brown_0', cell: 3, n: 0.45, seed: 15 } }, adr: ['fish_red', 'fish_red', 'fish_red', 'fish_brown_2'] }),
      marks: [
        { k: 'spots', n: 60, x0: 0.04, x1: 0.88, v0: 0.04, v1: 0.6, r: 1.1, seed: 7104, d: -3 },
        { k: 'spots', n: 14, x0: 0.06, x1: 0.7, v0: 0.42, v1: 0.72, r: 1.1, seed: 7105, key: 'fish_red' }
      ]
    },
    brook_trout: {
      px: 86,
      body: [[0, -0.073, 0.065], [0.15, -0.124, 0.116], [0.4, -0.173, 0.162], [0.6, -0.178, 0.162], [0.78, -0.159, 0.14], [0.92, -0.108, 0.093], [1, -0.057, 0.048]],
      ramp: ramp('brook'), stops: [0.1, 0.24, 0.42, 0.62, 0.8], sheen: [0.28, 0.38],
      zones: [{ x0: 0.06, x1: 0.78, v0: 0.72, v1: 1, ramp: ['fish_brook_2', 'fish_brook_3', 'fish_orange_0', 'fish_orange_1', 'fish_orange_2', 'fish_orange_3'] }],
      head: { gill: 0.73, bulge: 0.058, pre: 0.79, eye: [0.885, -0.047, 0.05], iris: 'fish_eye_gold', rim: 'fish_brook_0', mouth: [0.024, 0.172, 0.012, 0], lip: true, cheek: 1 },
      lateral: { v: 0.5, arch: 0.03, d: 1 }, scales: { size: 2, v0: 0.12, v1: 0.9, d: -1, n: 0.25 },
      tail: { len: 0.18, spread: 0.195, fork: 0.05, rays: 14, ramp: FIN_OR, speck: { key: 'fish_brook_0', cell: 3, n: 0.35, seed: 16 } },
      fin: FIN_OR,
      fins: sfins({ d: [0.44, 0.62, 0.141], ad: [0.15, 0.2, 0.038], an: [0.14, 0.28, 0.126], pel: [0.46, 0.135], pec: [0.72, 0.7, 0.122], fin: FIN_OR, lmore: { lead: WHITE_LEAD },
        dmore: { ramp: ['fish_brook_1', 'fish_brook_2', 'fish_brook_3', 'fish_brook_4'], speck: { key: 'fish_spot', cell: 3, n: 0.6, seed: 17 } }, adr: ['fish_brook_2', 'fish_brook_2', 'fish_brook_2', 'fish_brook_3'] }),
      marks: [
        { k: 'worms', x0: 0.02, x1: 0.8, v0: 0, v1: 0.36, sc: 2.6, w: 0.5, d: 2 },
        { k: 'spots', n: 30, x0: 0.04, x1: 0.74, v0: 0.36, v1: 0.7, r: 0.8, seed: 7106, key: 'fish_yellow' },
        { k: 'spots', n: 10, x0: 0.06, x1: 0.7, v0: 0.42, v1: 0.68, r: 0.7, seed: 7107, key: 'fish_red', halo: 'fish_halo' }
      ]
    },
    tiger_trout: {
      px: 86,
      body: [[0, -0.073, 0.065], [0.15, -0.124, 0.116], [0.4, -0.176, 0.162], [0.6, -0.181, 0.162], [0.78, -0.159, 0.14], [0.92, -0.108, 0.093], [1, -0.057, 0.048]],
      ramp: ramp('tiger'), stops: [0.1, 0.24, 0.42, 0.62, 0.8], sheen: [0.28, 0.38],
      head: { gill: 0.73, bulge: 0.058, pre: 0.79, eye: [0.885, -0.047, 0.05], iris: 'fish_eye_gold', rim: 'fish_tiger_0', mouth: [0.024, 0.172, 0.012, 0], lip: true, cheek: 1 },
      lateral: { v: 0.5, arch: 0.03, d: 1 }, scales: { size: 2, v0: 0.12, v1: 0.9, d: -1, n: 0.2 },
      tail: { len: 0.18, spread: 0.195, fork: 0.08, rays: 14, ramp: ['fish_tiger_1', 'fish_tiger_2', 'fish_tiger_3', 'fish_tiger_4'] },
      fin: ['fish_tiger_1', 'fish_tiger_2', 'fish_tiger_3', 'fish_tiger_4'],
      fins: sfins({ d: [0.44, 0.62, 0.141], ad: [0.15, 0.2, 0.038], an: [0.14, 0.28, 0.126], pel: [0.46, 0.135], pec: [0.72, 0.7, 0.122], fin: FIN_OR, lmore: { lead: ['fish_white'] },
        dmore: { ramp: ['fish_tiger_1', 'fish_tiger_2', 'fish_tiger_3', 'fish_tiger_4'], speck: { key: 'fish_tiger_0', cell: 3, n: 0.5, seed: 18 } }, adr: ['fish_tiger_2', 'fish_tiger_2', 'fish_tiger_2', 'fish_tiger_3'] }),
      marks: [{ k: 'worms', x0: 0.0, x1: 0.84, v0: 0, v1: 0.86, sc: 1.9, w: 0.42, d: -2 }]
    },
    cutthroat_trout: {
      px: 88,
      body: TROUT_BODY,
      ramp: ramp('cutt'), stops: [0.1, 0.24, 0.42, 0.62, 0.8], sheen: [0.26, 0.36],
      zones: [{ x0: 0.02, x1: 0.86, v0: 0.48, v1: 0.8, ramp: ['fish_cutt_1', 'fish_cutt_2', 'fish_cutt_3', 'fish_pinkband_1', 'fish_pinkband_2', 'fish_cutt_5'] }],
      head: { gill: 0.73, bulge: 0.058, pre: 0.79, eye: [0.885, -0.047, 0.048], iris: 'fish_eye_gold', rim: 'fish_cutt_0', mouth: [0.022, 0.172, 0.012, 0], lip: true, cheek: 1 },
      lateral: { v: 0.46, arch: 0.03, d: 1 }, scales: { size: 2, v0: 0.12, v1: 0.9, d: -1, n: 0.3 },
      tail: { len: 0.19, spread: 0.195, fork: 0.16, rays: 14, ramp: ['fish_finol_0', 'fish_finol_1', 'fish_finol_2', 'fish_finol_3'], speck: { key: 'fish_spot', cell: 3, n: 0.6, seed: 19 } },
      fin: FIN_OL,
      fins: sfins({ d: [0.44, 0.62, 0.135], ad: [0.15, 0.2, 0.038], an: [0.14, 0.28, 0.12], pel: [0.46, 0.135], pec: [0.72, 0.7, 0.111], fin: ['fish_finrose_0', 'fish_finrose_1', 'fish_finrose_2', 'fish_finrose_3'],
        dmore: { ramp: FIN_OL, speck: { key: 'fish_spot', cell: 3, n: 0.55, seed: 20 } }, adr: ['fish_cutt_2', 'fish_cutt_2', 'fish_cutt_2', 'fish_cutt_3'] }),
      marks: [
        { k: 'spots', n: 70, x0: 0.0, x1: 0.5, v0: 0.02, v1: 0.75, r: 0.9, seed: 7108, d: -3 },
        { k: 'spots', n: 26, x0: 0.5, x1: 0.85, v0: 0.02, v1: 0.4, r: 0.8, seed: 7109, d: -3 },
        { k: 'blotch', x: 0.86, v: 0.97, rx: 0.07, ry: 0.06, key: 'fish_red' }
      ]
    },
    lake_trout: {
      px: 92,
      body: [[0, -0.062, 0.054], [0.15, -0.108, 0.1], [0.4, -0.154, 0.14], [0.6, -0.159, 0.14], [0.78, -0.143, 0.124], [0.92, -0.099, 0.084], [1, -0.053, 0.045]],
      ramp: ramp('laket'), stops: [0.1, 0.24, 0.42, 0.62, 0.8], sheen: [0.26, 0.36],
      head: { gill: 0.72, bulge: 0.058, pre: 0.78, eye: [0.88, -0.047, 0.046], iris: 'fish_eye_gold', rim: 'fish_laket_0', mouth: [0.022, 0.184, 0.012, 0], lip: true, cheek: 1 },
      lateral: { v: 0.46, arch: 0.03, d: 1 }, scales: { size: 2, v0: 0.12, v1: 0.9, d: -1, n: 0.25 },
      tail: { len: 0.21, spread: 0.221, fork: 0.6, rays: 15, ramp: ['fish_laket_1', 'fish_laket_2', 'fish_laket_3', 'fish_laket_4'], speck: { key: 'fish_cream', cell: 3, n: 0.35, seed: 21 } },
      fin: ['fish_laket_1', 'fish_laket_2', 'fish_laket_3', 'fish_laket_4'],
      fins: sfins({ d: [0.44, 0.62, 0.13], ad: [0.15, 0.2, 0.036], an: [0.14, 0.28, 0.12], pel: [0.46, 0.135], pec: [0.72, 0.7, 0.111], fin: ['fish_fingold_0', 'fish_fingold_1', 'fish_fingold_2', 'fish_fingold_3'], lmore: { lead: ['fish_white'] },
        dmore: { speck: { key: 'fish_cream', cell: 3, n: 0.45, seed: 22 } }, adr: ['fish_laket_2', 'fish_laket_2', 'fish_laket_2', 'fish_laket_3'] }),
      marks: [{ k: 'spots', n: 85, x0: 0.02, x1: 0.86, v0: 0.02, v1: 0.72, r: 0.9, seed: 7110, key: 'fish_cream' }]
    },
    arctic_char: {
      px: 88,
      body: [[0, -0.073, 0.065], [0.15, -0.121, 0.116], [0.4, -0.17, 0.165], [0.6, -0.176, 0.165], [0.78, -0.157, 0.143], [0.92, -0.108, 0.093], [1, -0.057, 0.048]],
      ramp: ramp('char'), stops: [0.1, 0.24, 0.42, 0.6, 0.78], sheen: [0.26, 0.36],
      zones: [{ x0: 0.04, x1: 0.8, v0: 0.62, v1: 1, ramp: ['fish_char_2', 'fish_char_3', 'fish_charbelly_0', 'fish_charbelly_1', 'fish_charbelly_2', 'fish_charbelly_3'] }],
      head: { gill: 0.73, bulge: 0.058, pre: 0.79, eye: [0.885, -0.047, 0.048], iris: 'fish_eye_gold', rim: 'fish_char_0', mouth: [0.024, 0.172, 0.014, 0], lip: true, cheek: 1 },
      lateral: { v: 0.48, arch: 0.03, d: 1 }, scales: { size: 2, v0: 0.12, v1: 0.9, d: -1, n: 0.25 },
      tail: { len: 0.19, spread: 0.202, fork: 0.22, rays: 14, ramp: ['fish_char_1', 'fish_char_2', 'fish_char_3', 'fish_char_4'] },
      fin: ['fish_char_1', 'fish_char_2', 'fish_char_3', 'fish_char_4'],
      fins: sfins({ d: [0.44, 0.62, 0.135], ad: [0.15, 0.2, 0.038], an: [0.14, 0.28, 0.126], pel: [0.46, 0.135], pec: [0.72, 0.7, 0.122], fin: ['fish_finred_0', 'fish_finred_1', 'fish_finred_2', 'fish_finred_3'], lmore: { lead: WHITE_LEAD },
        adr: ['fish_char_2', 'fish_char_2', 'fish_char_2', 'fish_char_3'] }),
      marks: [{ k: 'spots', n: 34, x0: 0.04, x1: 0.8, v0: 0.12, v1: 0.66, r: 0.9, seed: 7111, key: 'fish_charbelly_3' }]
    },
    dolly_varden: {
      px: 92,
      body: [[0, -0.068, 0.059], [0.15, -0.116, 0.108], [0.4, -0.162, 0.151], [0.6, -0.167, 0.151], [0.78, -0.149, 0.132], [0.92, -0.103, 0.087], [1, -0.053, 0.045]],
      ramp: ramp('dolly'), stops: [0.1, 0.24, 0.42, 0.62, 0.8], sheen: [0.26, 0.36],
      head: { gill: 0.73, bulge: 0.058, pre: 0.79, eye: [0.885, -0.047, 0.048], iris: 'fish_eye_red', rim: 'fish_dolly_0', mouth: [0.024, 0.172, 0.014, 0], lip: true, cheek: 1 },
      lateral: { v: 0.48, arch: 0.03, d: 1 }, scales: { size: 2, v0: 0.12, v1: 0.9, d: -1, n: 0.25 },
      tail: { len: 0.19, spread: 0.202, fork: 0.18, rays: 14, ramp: ['fish_dolly_1', 'fish_dolly_2', 'fish_dolly_3', 'fish_finred_2'] },
      fin: ['fish_dolly_1', 'fish_dolly_2', 'fish_dolly_3', 'fish_dolly_4'],
      fins: sfins({ d: [0.44, 0.62, 0.135], ad: [0.15, 0.2, 0.038], an: [0.14, 0.28, 0.126], pel: [0.46, 0.135], pec: [0.72, 0.7, 0.122], fin: ['fish_finred_0', 'fish_finred_1', 'fish_finred_2', 'fish_finred_3'], lmore: { lead: WHITE_LEAD },
        adr: ['fish_dolly_2', 'fish_dolly_2', 'fish_dolly_2', 'fish_dolly_3'] }),
      marks: [
        { k: 'spots', n: 30, x0: 0.04, x1: 0.82, v0: 0.06, v1: 0.42, r: 0.8, seed: 7112, key: 'fish_cream' },
        { k: 'spots', n: 30, x0: 0.04, x1: 0.8, v0: 0.36, v1: 0.74, r: 0.9, seed: 7113, key: 'fish_charbelly_2' }
      ]
    },
    arctic_grayling: {
      px: 88,
      body: [[0, -0.062, 0.054], [0.15, -0.108, 0.097], [0.4, -0.151, 0.135], [0.6, -0.157, 0.135], [0.78, -0.135, 0.116], [0.92, -0.091, 0.073], [1, -0.045, 0.033]],
      ramp: ramp('gray'), stops: [0.1, 0.24, 0.42, 0.62, 0.8], sheen: [0.26, 0.36],
      zones: [{ x0: 0.08, x1: 0.74, v0: 0.4, v1: 0.52, ramp: ['fish_gray_1', 'fish_gray_2', 'fish_gray_3', 'fish_pinkband_1', 'fish_gray_4', 'fish_gray_5'] }],
      head: { gill: 0.75, bulge: 0.052, pre: 0.8, eye: [0.895, -0.041, 0.053], iris: 'fish_eye_gold', rim: 'fish_gray_0', mouth: [0.016, 0.092, 0.004, 0], lip: true, cheek: 1 },
      lateral: { v: 0.36, arch: 0.03, d: 1 }, scales: { size: 3, v0: 0.12, v1: 0.92, d: -1 },
      tail: { len: 0.2, spread: 0.202, fork: 0.42, rays: 15, ramp: ['fish_finblue_0', 'fish_finblue_1', 'fish_finblue_2', 'fish_finblue_3'] },
      fin: FIN_GR,
      fins: sfins({ d: [0.38, 0.76, 0.18], dprof: [0.55, 0.75, 0.88, 0.96, 1, 1, 0.98, 0.92, 0.82], drays: 18, dlean: 0.3, ad: [0.12, 0.17, 0.033], an: [0.13, 0.26, 0.108], pel: [0.5, 0.149], pec: [0.73, 0.7, 0.111], fin: FIN_OL,
        dmore: { ramp: ['fish_sail_0', 'fish_sail_1', 'fish_sail_2', 'fish_sail_3'], speck: { key: 'fish_halo', cell: 4, n: 0.6, seed: 23 } }, adr: ['fish_gray_2', 'fish_gray_2', 'fish_gray_2', 'fish_gray_3'] }),
      marks: [{ k: 'spots', n: 12, x0: 0.62, x1: 0.8, v0: 0.1, v1: 0.55, r: 0.8, seed: 7114, d: -3 }]
    },
    atlantic_salmon: {
      px: 96,
      body: [[0, -0.059, 0.051], [0.15, -0.108, 0.1], [0.4, -0.162, 0.146], [0.6, -0.167, 0.146], [0.78, -0.146, 0.127], [0.92, -0.096, 0.082], [1, -0.045, 0.036]],
      ramp: ramp('atl'), stops: [0.1, 0.24, 0.42, 0.62, 0.8], sheen: [0.24, 0.34],
      head: { gill: 0.74, bulge: 0.058, pre: 0.8, eye: [0.895, -0.041, 0.043], iris: 'fish_eye_silver', rim: 'fish_atl_0', mouth: [0.019, 0.138, 0.01, 0], lip: true, cheek: 1 },
      lateral: { v: 0.42, arch: 0.03, d: 1 }, scales: { size: 2, v0: 0.12, v1: 0.92, d: -1, n: 0.4 },
      tail: { len: 0.19, spread: 0.208, fork: 0.15, rays: 15, ramp: ['fish_finblue_0', 'fish_finblue_1', 'fish_finblue_2', 'fish_finblue_3'] },
      fin: ['fish_finblue_0', 'fish_finblue_1', 'fish_finblue_2', 'fish_finblue_3'],
      fins: sfins({ d: [0.44, 0.62, 0.13], ad: [0.14, 0.19, 0.034], an: [0.13, 0.27, 0.12], pel: [0.46, 0.135], pec: [0.73, 0.7, 0.111], fin: FIN_GR, adr: ['fish_atl_1', 'fish_atl_1', 'fish_atl_1', 'fish_atl_2'] }),
      marks: [{ k: 'spots', n: 34, x0: 0.24, x1: 0.88, v0: 0.04, v1: 0.42, r: 0.9, seed: 7115, d: -3 }]
    },
    king_salmon: {
      px: 100,
      body: [[0, -0.068, 0.059], [0.15, -0.121, 0.113], [0.4, -0.186, 0.167], [0.6, -0.194, 0.167], [0.78, -0.167, 0.14], [0.9, -0.098, 0.096], [1, -0.012, 0.052]],
      ramp: ramp('king'), stops: [0.1, 0.24, 0.42, 0.62, 0.8], sheen: [0.26, 0.36],
      zones: [{ x0: 0.04, x1: 0.8, v0: 0.5, v1: 0.9, ramp: ['fish_king_2', 'fish_king_3', 'fish_sock_0', 'fish_sock_1', 'fish_sock_2', 'fish_king_5'] }],
      head: { gill: 0.73, bulge: 0.058, pre: 0.79, eye: [0.87, -0.054, 0.041], iris: 'fish_eye_gold', rim: 'fish_king_0', mouth: [0.03, 0.172, 0.012, 5], teeth: 'fish_cream', lip: true, cheek: 1 },
      lateral: { v: 0.46, arch: 0.03, d: 1 }, scales: { size: 2, v0: 0.12, v1: 0.92, d: -1, n: 0.3 },
      tail: { len: 0.19, spread: 0.215, fork: 0.15, rays: 15, ramp: ['fish_findark_0', 'fish_findark_1', 'fish_findark_2', 'fish_findark_3'], speck: { key: 'fish_spot', cell: 3, n: 0.6, seed: 24 } },
      fin: ['fish_findark_0', 'fish_findark_1', 'fish_findark_2', 'fish_findark_3'],
      fins: sfins({ d: [0.44, 0.62, 0.135], ad: [0.14, 0.19, 0.038], an: [0.13, 0.28, 0.126], pel: [0.46, 0.135], pec: [0.73, 0.7, 0.111], fin: ['fish_findark_0', 'fish_findark_1', 'fish_findark_2', 'fish_findark_3'], adr: ['fish_king_1', 'fish_king_1', 'fish_king_1', 'fish_king_2'] }),
      marks: [{ k: 'spots', n: 60, x0: 0.0, x1: 0.84, v0: 0.02, v1: 0.45, r: 0.9, seed: 7116, d: -3 }]
    },
    coho_salmon: {
      px: 98,
      body: [[0, -0.065, 0.057], [0.15, -0.116, 0.108], [0.4, -0.176, 0.157], [0.6, -0.181, 0.157], [0.78, -0.157, 0.135], [0.92, -0.103, 0.087], [1, -0.048, 0.041]],
      ramp: ramp('coho'), stops: [0.1, 0.24, 0.42, 0.62, 0.8], sheen: [0.24, 0.34],
      head: { gill: 0.74, bulge: 0.058, pre: 0.8, eye: [0.89, -0.041, 0.043], iris: 'fish_eye_silver', rim: 'fish_coho_0', mouth: [0.022, 0.149, 0.01, 0], lip: true, cheek: 1 },
      lateral: { v: 0.44, arch: 0.03, d: 1 }, scales: { size: 2, v0: 0.12, v1: 0.92, d: -1, n: 0.4 },
      tail: { len: 0.19, spread: 0.215, fork: 0.25, rays: 15, ramp: FIN_GR, speck: { key: 'fish_spot', cell: 3, n: 0.5, seed: 25 } },
      fin: FIN_GR,
      fins: sfins({ d: [0.44, 0.62, 0.13], ad: [0.14, 0.19, 0.034], an: [0.13, 0.28, 0.12], pel: [0.46, 0.135], pec: [0.73, 0.7, 0.111], fin: FIN_GR, adr: ['fish_coho_1', 'fish_coho_1', 'fish_coho_1', 'fish_coho_2'] }),
      marks: [{ k: 'spots', n: 26, x0: 0.04, x1: 0.7, v0: 0.02, v1: 0.24, r: 0.8, seed: 7117, d: -3 }]
    },
    sockeye_salmon: {
      px: 92,
      body: [[0, -0.068, 0.059], [0.15, -0.127, 0.108], [0.4, -0.213, 0.159], [0.6, -0.224, 0.159], [0.78, -0.17, 0.135], [0.9, -0.092, 0.096], [1, -0.008, 0.058]],
      ramp: ramp('sock'), stops: [0.1, 0.24, 0.42, 0.62, 0.8], sheen: [0.26, 0.36],
      zones: [{ x0: 0.79, x1: 1.01, v0: 0, v1: 1, ramp: ramp('sockhead') }],
      head: { gill: 0.76, bulge: 0.058, pre: 0.82, eye: [0.87, -0.061, 0.041], iris: 'fish_eye_gold', rim: 'fish_sockhead_0', mouth: [0.041, 0.172, 0.012, 5], teeth: 'fish_cream', lip: true, cheek: 1 },
      lateral: { v: 0.44, arch: 0.03, d: 1 }, scales: { size: 2, v0: 0.12, v1: 0.92, d: -1, n: 0.25 },
      tail: { len: 0.18, spread: 0.208, fork: 0.14, rays: 15, ramp: ['fish_sock_1', 'fish_sock_2', 'fish_sock_3', 'fish_sock_5'] },
      fin: ['fish_sock_1', 'fish_sock_2', 'fish_sock_3', 'fish_sock_5'],
      fins: sfins({ d: [0.42, 0.6, 0.13], ad: [0.14, 0.19, 0.034], an: [0.13, 0.28, 0.12], pel: [0.46, 0.135], pec: [0.76, 0.72, 0.111], fin: ['fish_sock_1', 'fish_sock_2', 'fish_sock_3', 'fish_sock_5'],
        pmore: { ramp: ['fish_sockhead_1', 'fish_sockhead_2', 'fish_sockhead_3', 'fish_sockhead_4'] }, adr: ['fish_sock_1', 'fish_sock_1', 'fish_sock_1', 'fish_sock_2'] }),
      marks: []
    },
    pink_salmon: {
      px: 92,
      body: [[0, -0.065, 0.054], [0.15, -0.121, 0.103], [0.38, -0.23, 0.149], [0.56, -0.285, 0.151], [0.7, -0.25, 0.138], [0.82, -0.16, 0.119], [0.92, -0.09, 0.09], [1, -0.01, 0.054]],
      ramp: ramp('pink'), stops: [0.1, 0.24, 0.42, 0.6, 0.78], sheen: [0.24, 0.34],
      head: { gill: 0.77, bulge: 0.058, pre: 0.82, eye: [0.885, -0.054, 0.041], iris: 'fish_eye_silver', rim: 'fish_pink_0', mouth: [0.035, 0.161, 0.012, 5], teeth: 'fish_cream', lip: true, cheek: 1 },
      lateral: { v: 0.5, arch: 0.03, d: 1 }, scales: { size: 2, v0: 0.12, v1: 0.92, d: -1, n: 0.3 },
      tail: { len: 0.18, spread: 0.202, fork: 0.2, rays: 15, ramp: FIN_GR, speck: { key: 'fish_spot', cell: 4, n: 0.7, seed: 26 } },
      fin: FIN_GR,
      fins: sfins({ d: [0.42, 0.6, 0.119], ad: [0.14, 0.19, 0.034], an: [0.13, 0.28, 0.12], pel: [0.46, 0.135], pec: [0.76, 0.72, 0.111], fin: FIN_GR, adr: ['fish_pink_1', 'fish_pink_1', 'fish_pink_1', 'fish_pink_2'] }),
      marks: [
        { k: 'band', v0: 0.5, v1: 0.6, x0: 0.03, x1: 0.78, jag: 0.06, key: 'fish_red' },
        { k: 'spots', n: 22, x0: 0.04, x1: 0.78, v0: 0.04, v1: 0.3, r: 1.4, seed: 7118, d: -3 }
      ]
    },
    chum_salmon: {
      px: 98,
      body: [[0, -0.068, 0.059], [0.15, -0.121, 0.113], [0.4, -0.186, 0.167], [0.6, -0.194, 0.167], [0.78, -0.167, 0.143], [0.9, -0.098, 0.098], [1, -0.012, 0.056]],
      ramp: ramp('chum'), stops: [0.1, 0.24, 0.42, 0.62, 0.8], sheen: [0.26, 0.36],
      head: { gill: 0.74, bulge: 0.058, pre: 0.8, eye: [0.875, -0.054, 0.038], iris: 'fish_eye_gold', rim: 'fish_chum_0', mouth: [0.035, 0.172, 0.012, 6], teeth: 'fish_cream', lip: true, cheek: 1 },
      lateral: { v: 0.42, arch: 0.03, d: 1 }, scales: { size: 2, v0: 0.12, v1: 0.92, d: -1, n: 0.3 },
      tail: { len: 0.19, spread: 0.215, fork: 0.18, rays: 15, ramp: ['fish_findark_1', 'fish_findark_2', 'fish_findark_3', 'fish_chum_4'] },
      fin: ['fish_findark_1', 'fish_findark_2', 'fish_findark_3', 'fish_chum_4'],
      fins: sfins({ d: [0.44, 0.62, 0.13], ad: [0.14, 0.19, 0.036], an: [0.13, 0.28, 0.126], pel: [0.46, 0.135], pec: [0.74, 0.72, 0.111], fin: ['fish_findark_1', 'fish_findark_2', 'fish_findark_3', 'fish_chum_4'], lmore: { lead: ['fish_white'] }, adr: ['fish_chum_2', 'fish_chum_2', 'fish_chum_2', 'fish_chum_3'] }),
      marks: [
        { k: 'saddles', xs: [0.2, 0.3, 0.4, 0.5, 0.6, 0.7], w: 0.05, v0: 0.3, v1: 0.92, taper: 0.1, slant: 0.03, key: 'fish_calico' },
        { k: 'saddles', xs: [0.25, 0.35, 0.45, 0.55, 0.65], w: 0.03, v0: 0.34, v1: 0.86, taper: 0.1, slant: 0.03, key: 'fish_chum_4' }
      ]
    },
    masu_salmon: {
      px: 88,
      body: [[0, -0.07, 0.062], [0.15, -0.121, 0.113], [0.4, -0.178, 0.162], [0.6, -0.184, 0.162], [0.78, -0.159, 0.14], [0.92, -0.108, 0.093], [1, -0.053, 0.053]],
      ramp: ramp('masu'), stops: [0.1, 0.24, 0.42, 0.62, 0.8], sheen: [0.26, 0.36],
      zones: [{ x0: 0.06, x1: 0.76, v0: 0.4, v1: 0.72, ramp: ['fish_masu_1', 'fish_masu_2', 'fish_pinkband_0', 'fish_pinkband_1', 'fish_pinkband_2', 'fish_masu_5'] }],
      head: { gill: 0.74, bulge: 0.058, pre: 0.8, eye: [0.88, -0.054, 0.043], iris: 'fish_eye_gold', rim: 'fish_masu_0', mouth: [0.027, 0.161, 0.012, 3], lip: true, cheek: 1 },
      lateral: { v: 0.46, arch: 0.03, d: 1 }, scales: { size: 2, v0: 0.12, v1: 0.92, d: -1, n: 0.3 },
      tail: { len: 0.19, spread: 0.202, fork: 0.15, rays: 14, ramp: ['fish_masu_1', 'fish_masu_2', 'fish_masu_3', 'fish_masu_4'] },
      fin: ['fish_masu_1', 'fish_masu_2', 'fish_masu_3', 'fish_masu_4'],
      fins: sfins({ d: [0.44, 0.62, 0.13], ad: [0.14, 0.19, 0.034], an: [0.13, 0.28, 0.12], pel: [0.46, 0.135], pec: [0.74, 0.72, 0.111], fin: ['fish_masu_1', 'fish_masu_2', 'fish_masu_3', 'fish_masu_4'], adr: ['fish_masu_2', 'fish_masu_2', 'fish_masu_2', 'fish_masu_3'] }),
      marks: [{ k: 'saddles', xs: [0.12, 0.22, 0.32, 0.42, 0.52, 0.62, 0.71], w: 0.045, v0: 0.36, v1: 0.78, taper: 0.2, key: 'fish_calico' }]
    },
    // ---- whitefish (Phase 71): small heads, small mouths, big silver scales, forked tails ----
    cisco: {
      px: 86,
      body: [[0, -0.062, 0.054], [0.15, -0.108, 0.097], [0.4, -0.154, 0.135], [0.6, -0.159, 0.135], [0.8, -0.132, 0.113], [0.93, -0.084, 0.07], [1, -0.041, 0.024]],
      ramp: ramp('wf'), stops: [0.1, 0.22, 0.38, 0.58, 0.78], sheen: [0.24, 0.34],
      head: { gill: 0.77, bulge: 0.052, pre: 0.82, eye: [0.9, -0.027, 0.06], iris: 'fish_eye_silver', rim: 'fish_wf_0', mouth: [-0.005, 0.069, 0.012, 0], lip: true, cheek: 1 },
      lateral: { v: 0.4, arch: 0.03, d: -1 }, scales: { size: 3, v0: 0.1, v1: 0.92, d: -1 },
      tail: { len: 0.2, spread: 0.208, fork: 0.55, rays: 15 }, fin: FIN_GR,
      fins: sfins({ d: [0.44, 0.6, 0.141], ad: [0.13, 0.18, 0.034], an: [0.13, 0.27, 0.108], pel: [0.5, 0.135], pec: [0.76, 0.74, 0.111], fin: FIN_GR, adr: ['fish_wf_2', 'fish_wf_2', 'fish_wf_2', 'fish_wf_3'] }),
      marks: []
    },
    lake_whitefish: {
      px: 84,
      body: [[0, -0.068, 0.059], [0.15, -0.13, 0.116], [0.4, -0.203, 0.167], [0.6, -0.211, 0.167], [0.76, -0.176, 0.14], [0.9, -0.108, 0.087], [1, -0.048, 0.033]],
      ramp: ramp('wf'), stops: [0.08, 0.2, 0.36, 0.56, 0.76], sheen: [0.22, 0.32],
      head: { gill: 0.77, bulge: 0.052, pre: 0.82, eye: [0.895, -0.041, 0.058], iris: 'fish_eye_silver', rim: 'fish_wf_0', mouth: [0.014, 0.052, 0.006, 0], lip: true, cheek: 1 },
      lateral: { v: 0.4, arch: 0.03, d: -1 }, scales: { size: 3, v0: 0.1, v1: 0.92, d: -1 },
      tail: { len: 0.2, spread: 0.221, fork: 0.55, rays: 15 }, fin: FIN_GR,
      fins: sfins({ d: [0.44, 0.6, 0.151], ad: [0.13, 0.18, 0.038], an: [0.13, 0.27, 0.114], pel: [0.5, 0.135], pec: [0.76, 0.74, 0.111], fin: FIN_GR, adr: ['fish_wf_2', 'fish_wf_2', 'fish_wf_2', 'fish_wf_3'] }),
      marks: []
    },
    round_whitefish: {
      px: 84,
      body: [[0, -0.059, 0.051], [0.15, -0.103, 0.092], [0.4, -0.14, 0.127], [0.6, -0.143, 0.127], [0.8, -0.119, 0.108], [0.93, -0.076, 0.067], [1, -0.036, 0.024]],
      ramp: ramp('wfblue'), stops: [0.1, 0.22, 0.38, 0.58, 0.78], sheen: [0.24, 0.34],
      head: { gill: 0.78, bulge: 0.049, pre: 0.83, eye: [0.905, -0.027, 0.055], iris: 'fish_eye_silver', rim: 'fish_wfblue_0', mouth: [0.022, 0.046, 0.004, 0], lip: true, cheek: 1 },
      lateral: { v: 0.42, arch: 0.02, d: -1 }, scales: { size: 3, v0: 0.1, v1: 0.92, d: -1 },
      tail: { len: 0.19, spread: 0.195, fork: 0.45, rays: 15, ramp: ['fish_fingr_0', 'fish_fingr_1', 'fish_fingr_2', 'fish_fingr_3'] }, fin: FIN_GR,
      fins: sfins({ d: [0.44, 0.6, 0.13], ad: [0.13, 0.18, 0.032], an: [0.13, 0.27, 0.102], pel: [0.5, 0.135], pec: [0.77, 0.74, 0.111], fin: ['fish_fingold_0', 'fish_fingold_1', 'fish_fingold_2', 'fish_fingold_3'], adr: ['fish_wfblue_2', 'fish_wfblue_2', 'fish_wfblue_2', 'fish_wfblue_3'] }),
      marks: []
    },
    mountain_whitefish: {
      px: 84,
      body: [[0, -0.059, 0.051], [0.15, -0.105, 0.095], [0.4, -0.149, 0.132], [0.6, -0.151, 0.132], [0.8, -0.124, 0.111], [0.93, -0.079, 0.067], [1, -0.041, 0.021]],
      ramp: ramp('wf'), stops: [0.1, 0.22, 0.38, 0.58, 0.78], sheen: [0.24, 0.34],
      head: { gill: 0.78, bulge: 0.049, pre: 0.83, eye: [0.9, -0.027, 0.058], iris: 'fish_eye_silver', rim: 'fish_wf_0', mouth: [0.024, 0.052, 0.004, 0], lip: true, cheek: 1 },
      lateral: { v: 0.42, arch: 0.02, d: -1 }, scales: { size: 3, v0: 0.1, v1: 0.92, d: -1 },
      tail: { len: 0.2, spread: 0.208, fork: 0.55, rays: 15, ramp: ['fish_finol_0', 'fish_finol_1', 'fish_finol_2', 'fish_finol_3'] }, fin: FIN_OL,
      fins: sfins({ d: [0.44, 0.6, 0.141], ad: [0.13, 0.18, 0.034], an: [0.13, 0.27, 0.108], pel: [0.5, 0.135], pec: [0.77, 0.74, 0.111], fin: FIN_OL, adr: ['fish_wf_2', 'fish_wf_2', 'fish_wf_2', 'fish_wf_3'] }),
      marks: []
    },
    humpback_whitefish: {
      px: 88,
      body: [[0, -0.065, 0.057], [0.15, -0.13, 0.116], [0.38, -0.213, 0.176], [0.58, -0.238, 0.176], [0.72, -0.216, 0.151], [0.84, -0.149, 0.108], [0.93, -0.087, 0.073], [1, -0.048, 0.028]],
      ramp: ramp('wfblue'), stops: [0.08, 0.2, 0.36, 0.56, 0.76], sheen: [0.22, 0.32],
      head: { gill: 0.79, bulge: 0.049, pre: 0.84, eye: [0.905, -0.034, 0.053], iris: 'fish_eye_silver', rim: 'fish_wfblue_0', mouth: [0.016, 0.052, 0.006, 0], lip: true, cheek: 1 },
      lateral: { v: 0.4, arch: 0.03, d: -1 }, scales: { size: 3, v0: 0.1, v1: 0.92, d: -1 },
      tail: { len: 0.2, spread: 0.221, fork: 0.55, rays: 15, ramp: ['fish_finblue_0', 'fish_finblue_1', 'fish_finblue_2', 'fish_finblue_3'] }, fin: FIN_GR,
      fins: sfins({ d: [0.44, 0.6, 0.151], ad: [0.13, 0.18, 0.038], an: [0.13, 0.27, 0.114], pel: [0.5, 0.135], pec: [0.78, 0.74, 0.111], fin: FIN_GR, adr: ['fish_wfblue_2', 'fish_wfblue_2', 'fish_wfblue_2', 'fish_wfblue_3'] }),
      marks: []
    },
    // ---- temperate bass ----
    white_bass: {
      px: 86,
      body: [[0, -0.061, 0.055], [0.15, -0.121, 0.105], [0.38, -0.209, 0.165], [0.58, -0.22, 0.165], [0.78, -0.173, 0.137], [0.92, -0.095, 0.07], [1, -0.035, 0.034]],
      ramp: ramp('silver'), stops: [0.08, 0.2, 0.38, 0.6, 0.8], sheen: [0.22, 0.34],
      head: { gill: 0.74, bulge: 0.060, pre: 0.8, eye: [0.885, -0.055, 0.054], iris: 'fish_eye_gold', rim: 'fish_silver_0', mouth: [0.008, 0.12, 0.012, 0], lip: true, cheek: 1 },
      lateral: { v: 0.28, arch: 0.05, d: 1 }, scales: { size: 3, v0: 0.12, v1: 0.92, d: -1 },
      tail: { len: 0.2, spread: 0.203, fork: 0.45, rays: 16 }, fin: FIN_GR,
      fins: [
        { k: 'dorsal', a: 0.46, b: 0.68, h: 0.208, prof: [0.5, 0.95, 1, 0.9, 0.7, 0.45, 0.25], rays: 9, spiny: true, lean: 0.3 },
        { k: 'dorsal', a: 0.2, b: 0.4, h: 0.156, prof: [0.7, 1, 0.9, 0.75, 0.55, 0.4], rays: 13, lean: 0.3 },
        { k: 'anal', a: 0.16, b: 0.32, h: 0.156, prof: [0.8, 1, 0.85, 0.6, 0.35], rays: 12, lean: 0.3 },
        pelvic(0.66, 0.12), pectoral(0.7, 0.58, 0.13)
      ],
      marks: [{ k: 'stripes', vs: [0.18, 0.3, 0.42, 0.54, 0.66], w: 1, x0: 0.03, x1: 0.72, broken: 0.25, d: -2 }]
    },
    hybrid_striped_bass: {
      px: 96,
      body: [[0, -0.056, 0.05], [0.15, -0.112, 0.101], [0.38, -0.185, 0.157], [0.58, -0.19, 0.157], [0.78, -0.158, 0.127], [0.92, -0.087, 0.064], [1, -0.034, 0.034]],
      ramp: ramp('silver'), stops: [0.08, 0.2, 0.38, 0.6, 0.8], sheen: [0.22, 0.34],
      head: { gill: 0.74, bulge: 0.060, pre: 0.8, eye: [0.885, -0.05, 0.049], iris: 'fish_eye_gold', rim: 'fish_silver_0', mouth: [0.008, 0.13, 0.012, 0], lip: true, cheek: 1 },
      lateral: { v: 0.26, arch: 0.05, d: 1 }, scales: { size: 3, v0: 0.12, v1: 0.92, d: -1 },
      tail: { len: 0.2, spread: 0.189, fork: 0.45, rays: 16 }, fin: FIN_GR,
      fins: [
        { k: 'dorsal', a: 0.46, b: 0.68, h: 0.195, prof: [0.5, 0.95, 1, 0.9, 0.7, 0.45, 0.25], rays: 9, spiny: true, lean: 0.3 },
        { k: 'dorsal', a: 0.2, b: 0.4, h: 0.15, prof: [0.7, 1, 0.9, 0.75, 0.55, 0.4], rays: 13, lean: 0.3 },
        { k: 'anal', a: 0.16, b: 0.32, h: 0.143, prof: [0.8, 1, 0.85, 0.6, 0.35], rays: 12, lean: 0.3 },
        pelvic(0.66, 0.12), pectoral(0.7, 0.58, 0.12)
      ],
      marks: [{ k: 'stripes', vs: [0.16, 0.27, 0.38, 0.49, 0.6, 0.71], w: 1, x0: 0.03, x1: 0.72, broken: 0.45, d: -2 }]
    },
    striped_bass: {
      px: 104,
      body: [[0, -0.052, 0.048], [0.15, -0.098, 0.092], [0.38, -0.155, 0.132], [0.58, -0.161, 0.132], [0.78, -0.137, 0.111], [0.92, -0.079, 0.06], [1, -0.032, 0.03]],
      ramp: ramp('silver'), stops: [0.08, 0.2, 0.38, 0.6, 0.8], sheen: [0.2, 0.32],
      head: { gill: 0.75, bulge: 0.053, pre: 0.81, eye: [0.89, -0.045, 0.041], iris: 'fish_eye_gold', rim: 'fish_silver_0', mouth: [0.006, 0.13, 0.012, 0], lip: true, cheek: 1 },
      lateral: { v: 0.4, arch: 0.04, d: 1 }, scales: { size: 3, v0: 0.12, v1: 0.92, d: -1 },
      tail: { len: 0.2, spread: 0.176, fork: 0.42, rays: 16 }, fin: FIN_GR,
      fins: [
        { k: 'dorsal', a: 0.47, b: 0.68, h: 0.169, prof: [0.5, 0.95, 1, 0.9, 0.7, 0.45, 0.25], rays: 9, spiny: true, lean: 0.3 },
        { k: 'dorsal', a: 0.2, b: 0.4, h: 0.137, prof: [0.7, 1, 0.9, 0.75, 0.55, 0.4], rays: 13, lean: 0.3 },
        { k: 'anal', a: 0.16, b: 0.31, h: 0.13, prof: [0.8, 1, 0.85, 0.6, 0.35], rays: 12, lean: 0.3 },
        pelvic(0.66, 0.11), pectoral(0.7, 0.58, 0.11)
      ],
      marks: [{ k: 'stripes', vs: [0.14, 0.24, 0.34, 0.44, 0.54, 0.64, 0.74], w: 1.2, x0: 0.02, x1: 0.73, d: -3 }]
    },
    // ---- pikes (Phase 72): long bodies, the dorsal and anal far back over each other, a flat
    // duck-bill snout, a long toothed mouth ----
    northern_pike: {
      px: 90,
      body: [[0, -0.0696, 0.0638], [0.15, -0.116, 0.1073], [0.4, -0.1479, 0.1363], [0.6, -0.1508, 0.1392], [0.76, -0.1363, 0.1276], [0.88, -0.1015, 0.087], [0.95, -0.0638, 0.0522], [1, -0.029, 0.0261]],
      ramp: ramp('pike'), stops: [0.1, 0.24, 0.42, 0.66, 0.82], sheen: [0.24, 0.36],
      head: { gill: 0.72, bulge: 0.04, pre: 0.78, eye: [0.85, -0.0667, 0.03], iris: 'fish_eye_gold', rim: 'fish_pike_0', mouth: [0.0174, 0.2, 0.012, 3], teeth: 'fish_cream', lip: true, cheek: 1 },
      lateral: { v: 0.44, arch: 0.02, d: 1 }, scales: { size: 2, v0: 0.12, v1: 0.92, d: -1, n: 0.3 },
      tail: { len: 0.17, spread: 0.1885, fork: 0.38, rays: 15, ramp: ['fish_finpike_0', 'fish_finpike_1', 'fish_finpike_2', 'fish_finpike_3'], speck: { key: 'fish_pike_1', cell: 4, n: 0.5, seed: 31 } },
      fin: ['fish_finpike_0', 'fish_finpike_1', 'fish_finpike_2', 'fish_finpike_3'],
      fins: [
        { k: 'dorsal', a: 0.07, b: 0.24, h: 0.154, prof: [0.6, 0.95, 1, 0.92, 0.8, 0.7], rays: 12, lean: 0.4, speck: { key: 'fish_pike_1', cell: 4, n: 0.5, seed: 32 } },
        { k: 'anal', a: 0.06, b: 0.21, h: 0.14, prof: [0.6, 0.95, 1, 0.9, 0.75, 0.65], rays: 11, lean: 0.4, speck: { key: 'fish_pike_1', cell: 4, n: 0.5, seed: 33 } },
        pelvic(0.45, 0.126), pectoral(0.71, 0.74, 0.126)
      ],
      marks: [{ k: 'spots', n: 52, x0: 0.04, x1: 0.7, v0: 0.12, v1: 0.74, r: 0.95, sx: 1.9, seed: 7201, key: 'fish_bean' }]
    },
    muskie: {
      px: 94,
      body: [[0, -0.0667, 0.0609], [0.15, -0.1131, 0.1044], [0.4, -0.1421, 0.1305], [0.6, -0.145, 0.1334], [0.76, -0.1305, 0.1218], [0.88, -0.0957, 0.0841], [0.95, -0.0609, 0.0493], [1, -0.0261, 0.0232]],
      ramp: ramp('musk'), stops: [0.1, 0.24, 0.42, 0.66, 0.82], sheen: [0.24, 0.36],
      head: { gill: 0.72, bulge: 0.04, pre: 0.78, eye: [0.85, -0.0638, 0.028], iris: 'fish_eye_gold', rim: 'fish_musk_0', mouth: [0.0174, 0.21, 0.012, 3], teeth: 'fish_cream', lip: true, cheek: 1 },
      lateral: { v: 0.44, arch: 0.02, d: 1 }, scales: { size: 2, v0: 0.12, v1: 0.92, d: -1, n: 0.3 },
      tail: { len: 0.17, spread: 0.1885, fork: 0.3, rays: 15, ramp: ['fish_finmusk_0', 'fish_finmusk_1', 'fish_finmusk_2', 'fish_finmusk_3'], speck: { key: 'fish_musk_0', cell: 4, n: 0.5, seed: 34 } },
      fin: ['fish_finmusk_0', 'fish_finmusk_1', 'fish_finmusk_2', 'fish_finmusk_3'],
      fins: [
        { k: 'dorsal', a: 0.07, b: 0.23, h: 0.154, prof: [0.6, 0.95, 1, 0.92, 0.8, 0.7], rays: 12, lean: 0.4, speck: { key: 'fish_musk_0', cell: 4, n: 0.5, seed: 35 } },
        { k: 'anal', a: 0.06, b: 0.2, h: 0.14, prof: [0.6, 0.95, 1, 0.9, 0.75, 0.65], rays: 11, lean: 0.4, speck: { key: 'fish_musk_0', cell: 4, n: 0.5, seed: 36 } },
        pelvic(0.45, 0.126), pectoral(0.71, 0.74, 0.126)
      ],
      marks: [
        { k: 'saddles', xs: [0.08, 0.15, 0.22, 0.29, 0.36, 0.43, 0.5, 0.57, 0.64], w: 0.032, v0: 0.06, v1: 0.78, taper: 0.3, slant: -0.03, d: -2 },
        { k: 'spots', n: 18, x0: 0.06, x1: 0.68, v0: 0.2, v1: 0.6, r: 0.8, seed: 7202, d: -2 }
      ]
    },
    tiger_muskie: {
      px: 94,
      body: [[0, -0.0696, 0.0638], [0.15, -0.1189, 0.1102], [0.4, -0.1508, 0.1392], [0.6, -0.1537, 0.1421], [0.76, -0.1363, 0.1276], [0.88, -0.0986, 0.087], [0.95, -0.0623, 0.0508], [1, -0.0275, 0.0247]],
      ramp: ramp('tigm'), stops: [0.1, 0.24, 0.42, 0.66, 0.82], sheen: [0.24, 0.36],
      head: { gill: 0.72, bulge: 0.04, pre: 0.78, eye: [0.85, -0.0667, 0.029], iris: 'fish_eye_gold', rim: 'fish_tigm_0', mouth: [0.0174, 0.21, 0.012, 3], teeth: 'fish_cream', lip: true, cheek: 1 },
      lateral: { v: 0.44, arch: 0.02, d: 1 }, scales: { size: 2, v0: 0.12, v1: 0.92, d: -1, n: 0.3 },
      tail: { len: 0.17, spread: 0.1958, fork: 0.25, rays: 15, ramp: ['fish_finmusk_0', 'fish_finmusk_1', 'fish_finmusk_2', 'fish_finmusk_3'] },
      fin: ['fish_finmusk_0', 'fish_finmusk_1', 'fish_finmusk_2', 'fish_finmusk_3'],
      fins: [
        { k: 'dorsal', a: 0.07, b: 0.23, h: 0.161, prof: [0.6, 0.95, 1, 0.92, 0.8, 0.7], rays: 12, lean: 0.4, ramp: ['fish_tigm_1', 'fish_tigm_2', 'fish_tigm_3', 'fish_tigm_4'] },
        { k: 'anal', a: 0.06, b: 0.2, h: 0.14, prof: [0.6, 0.95, 1, 0.9, 0.75, 0.65], rays: 11, lean: 0.4 },
        pelvic(0.45, 0.126), pectoral(0.71, 0.74, 0.126)
      ],
      marks: [{ k: 'worms', x0: 0.03, x1: 0.71, v0: 0.04, v1: 0.84, sc: 2.6, w: 0.5, ph: 0.7, d: -2 }]
    },
    // ---- carp & minnows (Phase 72) ----
    common_carp: {
      px: 90,
      body: [[0, -0.0714, 0.063], [0.15, -0.1449, 0.1218], [0.38, -0.2478, 0.1806], [0.56, -0.2646, 0.1869], [0.72, -0.2331, 0.168], [0.84, -0.1701, 0.1302], [0.94, -0.0945, 0.0735], [1, -0.0315, 0.0315]],
      ramp: ramp('carp'), stops: [0.08, 0.2, 0.38, 0.6, 0.8], sheen: [0.2, 0.32],
      head: { gill: 0.76, bulge: 0.05, pre: 0.82, eye: [0.88, -0.0525, 0.04], iris: 'fish_eye_gold', rim: 'fish_carp_0', mouth: [0.0294, 0.05, 0.008, 0, 0.004], lip: true, cheek: 1,
        barbels: [{ x: 0.985, y: 0.0357, len: 0.045, ang: 100, curl: 30, key: 'fish_carp_1' }, { x: 0.955, y: 0.0462, len: 0.03, ang: 100, curl: 20, key: 'fish_carp_1' }] },
      lateral: { v: 0.46, arch: 0.03, d: 1 }, scales: { size: 5, v0: 0.06, v1: 0.96, d: -1, n: 0.95 },
      tail: { len: 0.19, spread: 0.189, fork: 0.36, rays: 16, ramp: ['fish_carp_2', 'fish_carp_3', 'fish_carp_4', 'fish_orange_2'], tip: 'fish_orange_1' },
      fin: ['fish_carp_2', 'fish_carp_3', 'fish_carp_4', 'fish_carp_5'],
      fins: [
        { k: 'dorsal', a: 0.2, b: 0.6, h: 0.143, prof: [1, 0.95, 0.75, 0.6, 0.55, 0.5, 0.5, 0.48, 0.45, 0.4], rays: 16, lean: 0.4, lead: ['fish_carp_1'] },
        { k: 'anal', a: 0.13, b: 0.23, h: 0.143, prof: [1, 0.95, 0.75, 0.55, 0.45], rays: 7, lean: 0.4, ramp: FIN_OR },
        ext(pelvic(0.5, 0.121, FIN_OR), { ang: 132 }), pectoral(0.74, 0.76, 0.121)
      ],
      marks: []
    },
    creek_chub: {
      px: 84,
      body: [[0, -0.078, 0.0676], [0.15, -0.1274, 0.1144], [0.4, -0.1768, 0.1586], [0.6, -0.182, 0.1612], [0.78, -0.1664, 0.1456], [0.92, -0.1118, 0.0962], [1, -0.0468, 0.039]],
      ramp: ramp('chub'), stops: [0.1, 0.24, 0.42, 0.6, 0.8], sheen: [0.24, 0.36],
      head: { gill: 0.74, bulge: 0.05, pre: 0.8, eye: [0.885, -0.0546, 0.045], iris: 'fish_eye_gold', rim: 'fish_chub_0', mouth: [0.0156, 0.12, 0.012, 0], lip: true, cheek: 1 },
      lateral: { v: 0.46, arch: 0.06, d: 1 }, scales: { size: 2, v0: 0.12, v1: 0.92, d: -1, n: 0.45 },
      tail: { len: 0.2, spread: 0.247, fork: 0.42, rays: 15, ramp: ['fish_fingold_0', 'fish_fingold_1', 'fish_fingold_2', 'fish_fingold_3'] },
      fin: ['fish_fingold_0', 'fish_fingold_1', 'fish_fingold_2', 'fish_fingold_3'],
      fins: [
        { k: 'dorsal', a: 0.42, b: 0.56, h: 0.2, prof: [0.9, 1, 0.9, 0.75, 0.6, 0.5], rays: 8, lean: 0.4, spot: [0.65, 1, 0, 0.4, 'fish_spot'] },
        { k: 'anal', a: 0.16, b: 0.27, h: 0.15, prof: [0.9, 1, 0.85, 0.65, 0.5], rays: 8, lean: 0.4, ramp: FIN_OR },
        pelvic(0.48, 0.125, FIN_OR), pectoral(0.73, 0.76, 0.125)
      ],
      marks: [{ k: 'stripes', vs: [0.48], w: 2, x0: 0.02, x1: 0.74, broken: 0.15, d: -1 }]
    },
    longnose_dace: {
      px: 80,
      body: [[0, -0.0728, 0.065], [0.15, -0.117, 0.1092], [0.4, -0.156, 0.1456], [0.6, -0.1586, 0.1456], [0.78, -0.143, 0.13], [0.9, -0.104, 0.091], [0.97, -0.065, 0.039], [1, -0.0312, 0.0104]],
      ramp: ramp('dace'), stops: [0.1, 0.24, 0.42, 0.62, 0.8], sheen: [0.24, 0.36],
      head: { gill: 0.75, bulge: 0.05, pre: 0.81, eye: [0.88, -0.052, 0.042], iris: 'fish_eye_gold', rim: 'fish_dace_0', mouth: [0.039, 0.05, 0.004, 0, 0.022], lip: true, cheek: 1 },
      lateral: { v: 0.42, arch: 0.04, d: 1 }, scales: { size: 2, v0: 0.12, v1: 0.92, d: -1, n: 0.4 },
      tail: { len: 0.2, spread: 0.234, fork: 0.35, rays: 14, ramp: FIN_OR },
      fin: FIN_OR,
      fins: [
        { k: 'dorsal', a: 0.42, b: 0.56, h: 0.1875, prof: [0.9, 1, 0.9, 0.75, 0.6, 0.5], rays: 8, lean: 0.4 },
        { k: 'anal', a: 0.16, b: 0.26, h: 0.1375, prof: [0.9, 1, 0.85, 0.65, 0.5], rays: 7, lean: 0.4 },
        pelvic(0.46, 0.125), pectoral(0.73, 0.78, 0.1375)
      ],
      marks: [
        { k: 'stripes', vs: [0.44], w: 2, x0: 0.02, x1: 1, broken: 0.1, d: -2 },
        { k: 'mottle', x0: 0.02, x1: 0.75, v0: 0.02, v1: 0.36, sc: 2.2, t: 1.1, d: -1 }
      ]
    },
    peamouth: {
      px: 84,
      body: [[0, -0.0729, 0.0648], [0.15, -0.1269, 0.1161], [0.4, -0.1755, 0.162], [0.6, -0.1809, 0.1647], [0.78, -0.1593, 0.1431], [0.92, -0.1053, 0.0891], [1, -0.0405, 0.0351]],
      ramp: ramp('pea'), stops: [0.1, 0.24, 0.42, 0.62, 0.8], sheen: [0.24, 0.36],
      head: { gill: 0.75, bulge: 0.05, pre: 0.81, eye: [0.885, -0.0486, 0.045], iris: 'fish_eye_silver', rim: 'fish_pea_0', mouth: [0.0243, 0.06, 0.006, 0, 0.004], lip: true, cheek: 1 },
      lateral: { v: 0.4, arch: 0.08, d: 1 }, scales: { size: 2, v0: 0.12, v1: 0.92, d: -1, n: 0.4 },
      tail: { len: 0.2, spread: 0.2565, fork: 0.5, rays: 15, ramp: ['fish_findark_0', 'fish_findark_1', 'fish_findark_2', 'fish_findark_3'] },
      fin: FIN_GR,
      fins: [
        { k: 'dorsal', a: 0.42, b: 0.56, h: 0.208, prof: [0.9, 1, 0.9, 0.75, 0.6, 0.5], rays: 8, lean: 0.4, ramp: ['fish_findark_0', 'fish_findark_1', 'fish_findark_2', 'fish_findark_3'] },
        { k: 'anal', a: 0.15, b: 0.28, h: 0.156, prof: [0.9, 1, 0.85, 0.65, 0.5], rays: 9, lean: 0.4, ramp: FIN_OL },
        pelvic(0.48, 0.13, FIN_OL), pectoral(0.73, 0.78, 0.13)
      ],
      marks: [
        { k: 'stripes', vs: [0.34], w: 1.5, x0: 0.04, x1: 0.74, broken: 0.2, d: -2 },
        { k: 'band', v0: 0.58, v1: 0.68, x0: 0.06, x1: 0.82, jag: 0.06, key: 'fish_pinkband_1' }
      ]
    },
    northern_pikeminnow: {
      px: 88,
      body: [[0, -0.06, 0.0528], [0.15, -0.1056, 0.096], [0.4, -0.1488, 0.1344], [0.6, -0.1536, 0.1368], [0.78, -0.1392, 0.1248], [0.92, -0.096, 0.0792], [1, -0.0384, 0.0264]],
      ramp: ramp('pkm'), stops: [0.12, 0.26, 0.42, 0.6, 0.8], sheen: [0.26, 0.38],
      head: { gill: 0.72, bulge: 0.05, pre: 0.78, eye: [0.875, -0.0528, 0.036], iris: 'fish_eye_silver', rim: 'fish_pkm_0', mouth: [0.012, 0.15, 0.016, 2], lip: true, cheek: 1 },
      lateral: { v: 0.44, arch: 0.06, d: 1 }, scales: { size: 2, v0: 0.12, v1: 0.92, d: -1, n: 0.45 },
      tail: { len: 0.2, spread: 0.216, fork: 0.55, rays: 15 },
      fin: FIN_GR,
      fins: [
        { k: 'dorsal', a: 0.4, b: 0.54, h: 0.18, prof: [0.9, 1, 0.9, 0.75, 0.6, 0.5], rays: 8, lean: 0.45 },
        { k: 'anal', a: 0.14, b: 0.26, h: 0.132, prof: [0.9, 1, 0.85, 0.65, 0.5], rays: 8, lean: 0.45 },
        pelvic(0.46, 0.12, FIN_OL), pectoral(0.71, 0.78, 0.12)
      ],
      marks: []
    },
    // ---- suckers (Phase 72): the mouth underneath behind a blunt snout, a high dorsal ----
    white_sucker: {
      px: 86,
      body: [[0, -0.0783, 0.0702], [0.15, -0.1404, 0.1269], [0.4, -0.1998, 0.1836], [0.6, -0.2025, 0.1863], [0.78, -0.1755, 0.162], [0.9, -0.1215, 0.1134], [1, -0.0513, 0.0459]],
      ramp: ramp('wsuck'), stops: [0.1, 0.24, 0.42, 0.62, 0.8], sheen: [0.24, 0.36],
      head: { gill: 0.76, bulge: 0.05, pre: 0.82, eye: [0.88, -0.0648, 0.034], iris: 'fish_eye_gold', rim: 'fish_wsuck_0', mouth: [0.0864, 0.04, 0.004, 0, 0.034], lip: true, cheek: 1 },
      lateral: { v: 0.46, arch: 0.02, d: 1 }, scales: { size: 3, v0: 0.1, v1: 0.92, d: -1, n: 0.7 },
      tail: { len: 0.19, spread: 0.243, fork: 0.42, rays: 15, ramp: FIN_OL },
      fin: FIN_OL,
      fins: [
        { k: 'dorsal', a: 0.44, b: 0.62, h: 0.208, prof: [0.9, 1, 0.85, 0.7, 0.55, 0.45], rays: 10, lean: 0.4 },
        { k: 'anal', a: 0.13, b: 0.21, h: 0.182, prof: [0.9, 1, 0.8, 0.55], rays: 6, lean: 0.4, ramp: FIN_OR },
        pelvic(0.42, 0.13, FIN_OR), pectoral(0.75, 0.82, 0.13)
      ],
      marks: []
    },
    longnose_sucker: {
      px: 86,
      body: [[0, -0.0702, 0.0624], [0.15, -0.1248, 0.1144], [0.4, -0.1768, 0.1638], [0.6, -0.1794, 0.1664], [0.78, -0.156, 0.1456], [0.9, -0.1118, 0.1014], [0.97, -0.0702, 0.0546], [1, -0.039, 0.026]],
      ramp: ramp('lsuck'), stops: [0.1, 0.24, 0.42, 0.62, 0.8], sheen: [0.24, 0.36],
      head: { gill: 0.75, bulge: 0.05, pre: 0.81, eye: [0.865, -0.065, 0.03], iris: 'fish_eye_gold', rim: 'fish_lsuck_0', mouth: [0.0702, 0.04, 0.004, 0, 0.04], lip: true, cheek: 1 },
      lateral: { v: 0.46, arch: 0.02, d: 1 }, scales: { size: 2, v0: 0.1, v1: 0.92, d: -1, n: 0.5 },
      tail: { len: 0.19, spread: 0.234, fork: 0.42, rays: 15, ramp: ['fish_lsuck_1', 'fish_lsuck_2', 'fish_lsuck_3', 'fish_lsuck_4'] },
      fin: ['fish_lsuck_1', 'fish_lsuck_2', 'fish_lsuck_3', 'fish_lsuck_4'],
      fins: [
        { k: 'dorsal', a: 0.44, b: 0.62, h: 0.208, prof: [0.9, 1, 0.85, 0.7, 0.55, 0.45], rays: 10, lean: 0.4 },
        { k: 'anal', a: 0.13, b: 0.21, h: 0.182, prof: [0.9, 1, 0.8, 0.55], rays: 6, lean: 0.4, ramp: FIN_OR },
        pelvic(0.42, 0.13, FIN_OR), pectoral(0.75, 0.82, 0.13)
      ],
      marks: [{ k: 'band', v0: 0.38, v1: 0.5, x0: 0.04, x1: 0.74, jag: 0.08, d: -1 }]
    },
    shorthead_redhorse: {
      px: 84,
      body: [[0, -0.0775, 0.07], [0.15, -0.1475, 0.13], [0.4, -0.22, 0.19], [0.6, -0.225, 0.19], [0.78, -0.19, 0.1625], [0.9, -0.125, 0.1125], [1, -0.05, 0.045]],
      ramp: ramp('redh'), stops: [0.1, 0.24, 0.42, 0.62, 0.8], sheen: [0.22, 0.34],
      head: { gill: 0.77, bulge: 0.05, pre: 0.83, eye: [0.885, -0.0625, 0.036], iris: 'fish_eye_gold', rim: 'fish_redh_0', mouth: [0.075, 0.04, 0.004, 0, 0.026], lip: true, cheek: 1 },
      lateral: { v: 0.44, arch: 0.02, d: 1 }, scales: { size: 4, v0: 0.08, v1: 0.94, d: -1, n: 0.9 },
      tail: { len: 0.19, spread: 0.25, fork: 0.42, rays: 15, ramp: ['fish_finred_0', 'fish_finred_1', 'fish_finred_2', 'fish_finred_3'] },
      fin: ['fish_finred_0', 'fish_finred_1', 'fish_finred_2', 'fish_finred_3'],
      fins: [
        { k: 'dorsal', a: 0.44, b: 0.64, h: 0.24, prof: [0.9, 1, 0.85, 0.65, 0.5, 0.4], rays: 11, lean: 0.4 },
        { k: 'anal', a: 0.13, b: 0.22, h: 0.18, prof: [0.9, 1, 0.8, 0.55], rays: 6, lean: 0.4 },
        pelvic(0.42, 0.132), pectoral(0.76, 0.82, 0.132)
      ],
      marks: []
    },
    largescale_sucker: {
      px: 88,
      body: [[0, -0.0728, 0.065], [0.15, -0.13, 0.117], [0.4, -0.1846, 0.169], [0.6, -0.1898, 0.1716], [0.78, -0.1638, 0.1508], [0.9, -0.1144, 0.1066], [1, -0.0468, 0.0416]],
      ramp: ramp('lgsuck'), stops: [0.1, 0.24, 0.42, 0.62, 0.8], sheen: [0.24, 0.36],
      zones: [{ x0: 0.04, x1: 0.8, v0: 0.62, v1: 1, ramp: ['fish_lgsuck_2', 'fish_lgsuck_3', 'fish_finsuck_1', 'fish_finsuck_2', 'fish_finsuck_3', 'fish_lgsuck_5'] }],
      head: { gill: 0.76, bulge: 0.05, pre: 0.82, eye: [0.875, -0.065, 0.032], iris: 'fish_eye_gold', rim: 'fish_lgsuck_0', mouth: [0.078, 0.042, 0.004, 0, 0.034], lip: true, cheek: 1 },
      lateral: { v: 0.46, arch: 0.02, d: 1 }, scales: { size: 3, v0: 0.1, v1: 0.92, d: -1, n: 0.75 },
      tail: { len: 0.19, spread: 0.234, fork: 0.42, rays: 15, ramp: ['fish_finmusk_0', 'fish_finmusk_1', 'fish_finmusk_2', 'fish_finmusk_3'] },
      fin: FIN_GR,
      fins: [
        { k: 'dorsal', a: 0.44, b: 0.62, h: 0.208, prof: [0.9, 1, 0.85, 0.7, 0.55, 0.45], rays: 11, lean: 0.4 },
        { k: 'anal', a: 0.13, b: 0.21, h: 0.182, prof: [0.9, 1, 0.8, 0.55], rays: 6, lean: 0.4, ramp: ['fish_finmusk_0', 'fish_finmusk_1', 'fish_finmusk_2', 'fish_finmusk_3'] },
        pelvic(0.42, 0.13, ['fish_finmusk_0', 'fish_finmusk_1', 'fish_finmusk_2', 'fish_finmusk_3']), pectoral(0.75, 0.82, 0.13)
      ],
      marks: [{ k: 'band', v0: 0.36, v1: 0.5, x0: 0.04, x1: 0.76, jag: 0.06, d: -1 }]
    },
    // ---- catfish (Phase 72): no scales, a broad flat head with barbels, a short spined dorsal,
    // the adipose, a long anal ----
    bullhead_catfish: {
      px: 84,
      body: [[0, -0.075, 0.0625], [0.15, -0.115, 0.1075], [0.4, -0.1625, 0.1625], [0.6, -0.1725, 0.17], [0.78, -0.15, 0.15], [0.9, -0.1, 0.1125], [1, -0.0375, 0.0625]],
      ramp: ramp('bull'), stops: [0.12, 0.28, 0.46, 0.64, 0.8], sheen: [0.28, 0.42],
      head: { gill: 0.75, bulge: 0.04, eye: [0.895, -0.045, 0.03], iris: 'fish_eye_gold', rim: 'fish_bull_0', mouth: [0.0375, 0.08, 0.004, 0], lip: true,
        barbels: [
          { x: 0.975, y: 0.03, len: 0.2, ang: 112, curl: 25, key: 'fish_barbel', tip: 'fish_chan_3' },
          { x: 0.985, y: -0.035, len: 0.07, ang: -60, curl: -40, key: 'fish_barbel', tip: 'fish_chan_3' },
          { x: 0.97, y: 0.0625, len: 0.1, ang: 100, curl: 40, key: 'fish_barbel', tip: 'fish_chan_3' },
          { x: 0.94, y: 0.0875, len: 0.09, ang: 96, curl: 30, key: 'fish_barbel', tip: 'fish_chan_3' }
        ] },
      lateral: { v: 0.46, arch: 0.02, d: 1 },
      tail: { len: 0.17, spread: 0.1875, fork: 0, round: 0.25, rays: 14, ramp: ['fish_finbull_0', 'fish_finbull_1', 'fish_finbull_2', 'fish_finbull_3'] },
      fin: ['fish_finbull_0', 'fish_finbull_1', 'fish_finbull_2', 'fish_finbull_3'],
      fins: [
        { k: 'dorsal', a: 0.58, b: 0.68, h: 0.24, prof: [1, 0.95, 0.85, 0.7, 0.55], rays: 6, lean: 0.35, lead: ['fish_bull_0'] },
        { k: 'adipose', a: 0.12, b: 0.22, h: 0.06, prof: [0.35, 0.85, 1, 0.8, 0.4], ramp: ['fish_bull_2', 'fish_bull_2', 'fish_bull_2', 'fish_bull_3'] },
        { k: 'anal', a: 0.07, b: 0.3, h: 0.132, prof: [0.9, 1, 0.95, 0.85, 0.7, 0.55], rays: 14, lean: 0.35 },
        pelvic(0.44, 0.12), ext(pectoral(0.74, 0.84, 0.12), { ramp: ['fish_bull_2', 'fish_bull_3', 'fish_bull_4', 'fish_bull_5'] })
      ],
      marks: [{ k: 'mottle', x0: 0.02, x1: 0.95, v0: 0.04, v1: 0.6, sc: 3, t: 0.9, d: -1 }]
    },
    channel_catfish: {
      px: 92,
      body: [[0, -0.065, 0.0546], [0.15, -0.1066, 0.0962], [0.4, -0.1534, 0.1456], [0.6, -0.1612, 0.1534], [0.78, -0.1456, 0.1378], [0.9, -0.0988, 0.104], [1, -0.039, 0.0572]],
      ramp: ramp('chan'), stops: [0.12, 0.28, 0.46, 0.64, 0.8], sheen: [0.26, 0.4],
      head: { gill: 0.75, bulge: 0.04, eye: [0.895, -0.0442, 0.03], iris: 'fish_eye_gold', rim: 'fish_chan_0', mouth: [0.0338, 0.08, 0.004, 0], lip: true,
        barbels: [
          { x: 0.975, y: 0.026, len: 0.26, ang: 116, curl: 30, key: 'fish_barbel', tip: 'fish_chan_3' },
          { x: 0.985, y: -0.0338, len: 0.08, ang: -64, curl: -50, key: 'fish_barbel', tip: 'fish_chan_3' },
          { x: 0.97, y: 0.0598, len: 0.11, ang: 100, curl: 40, key: 'fish_barbel', tip: 'fish_chan_3' },
          { x: 0.94, y: 0.0806, len: 0.1, ang: 96, curl: 30, key: 'fish_barbel', tip: 'fish_chan_3' }
        ] },
      lateral: { v: 0.46, arch: 0.02, d: 1 },
      tail: { len: 0.2, spread: 0.221, fork: 0.6, rays: 15, ramp: ['fish_finchan_0', 'fish_finchan_1', 'fish_finchan_2', 'fish_finchan_3'] },
      fin: ['fish_finchan_0', 'fish_finchan_1', 'fish_finchan_2', 'fish_finchan_3'],
      fins: [
        { k: 'dorsal', a: 0.58, b: 0.68, h: 0.2375, prof: [1, 0.95, 0.85, 0.7, 0.55], rays: 6, lean: 0.35, lead: ['fish_chan_0'] },
        { k: 'adipose', a: 0.13, b: 0.21, h: 0.0562, prof: [0.35, 0.85, 1, 0.8, 0.4], ramp: ['fish_chan_2', 'fish_chan_2', 'fish_chan_2', 'fish_chan_3'] },
        { k: 'anal', a: 0.07, b: 0.27, h: 0.125, prof: [0.9, 1, 0.95, 0.85, 0.7, 0.55], rays: 14, lean: 0.35 },
        pelvic(0.44, 0.125), ext(pectoral(0.74, 0.84, 0.125), { ramp: ['fish_chan_2', 'fish_chan_3', 'fish_chan_4', 'fish_chan_5'] })
      ],
      marks: [{ k: 'spots', n: 24, x0: 0.06, x1: 0.7, v0: 0.12, v1: 0.6, r: 0.75, seed: 7203, key: 'fish_spot' }]
    },
    // ---- burbot (Phase 72): an eel-like cod, a chin barbel, long low fins, a rounded tail, marbled ----
    burbot: {
      px: 90,
      body: [[0, -0.051, 0.045], [0.15, -0.093, 0.087], [0.4, -0.138, 0.135], [0.6, -0.159, 0.156], [0.78, -0.159, 0.15], [0.9, -0.12, 0.111], [1, -0.048, 0.051]],
      ramp: ramp('burbot'), stops: [0.12, 0.28, 0.46, 0.64, 0.82], sheen: [0.26, 0.4],
      head: { gill: 0.78, bulge: 0.04, eye: [0.905, -0.069, 0.03], iris: 'fish_eye_gold', rim: 'fish_burbot_0', mouth: [0.024, 0.08, 0.008, 0], lip: true,
        barbels: [{ x: 0.97, y: 0.105, len: 0.06, ang: 104, curl: 20, key: 'fish_burbot_1' }, { x: 0.99, y: -0.036, len: 0.03, ang: -70, key: 'fish_burbot_1' }] },
      lateral: { v: 0.44, arch: 0.02, d: 1 }, scales: { size: 2, v0: 0.12, v1: 0.92, d: -1, n: 0.2 },
      tail: { len: 0.13, spread: 0.15, fork: 0, round: 0.7, rays: 14 },
      fin: FIN_OL,
      fins: [
        { k: 'dorsal', a: 0.6, b: 0.68, h: 0.084, prof: [0.7, 1, 0.9, 0.6], rays: 5, lean: 0.3 },
        { k: 'dorsal', a: 0.03, b: 0.58, h: 0.105, prof: [0.6, 0.85, 1, 1, 1, 0.95, 0.85, 0.6], rays: 22, lean: 0.3 },
        { k: 'anal', a: 0.03, b: 0.5, h: 0.098, prof: [0.6, 0.85, 1, 1, 0.95, 0.8, 0.55], rays: 20, lean: 0.3 },
        ext(pelvic(0.8, 0.112), { ang: 110 }), pectoral(0.76, 0.6, 0.126)
      ],
      marks: [{ k: 'mottle', x0: 0, x1: 0.95, v0: 0.02, v1: 0.8, sc: 2.8, t: 0.6, d: -2 }]
    },
    // ---- sturgeon (Phase 72): the rostrum, the mouth and its four barbels underneath, rows of
    // scutes, the heterocercal tail ----
    white_sturgeon: {
      px: 104,
      body: [[0, -0.04, 0.034], [0.15, -0.088, 0.078], [0.4, -0.138, 0.128], [0.6, -0.146, 0.132], [0.74, -0.13, 0.118], [0.84, -0.096, 0.084], [0.92, -0.06, 0.048], [0.97, -0.03, 0.018], [1, -0.01, 0.004]],
      ramp: ramp('sturg'), stops: [0.18, 0.36, 0.56, 0.74, 0.88], sheen: [0.26, 0.4],
      head: { gill: 0.72, bulge: 0.04, eye: [0.85, -0.06, 0.024], iris: 'fish_eye_gold', rim: 'fish_sturg_0', mouth: [0.09, 0.03, 0, 0, 0.13], lip: true,
        barbels: [
          { x: 0.925, y: 0.08, len: 0.065, ang: 96, curl: 30, key: 'fish_sturg_4' }, { x: 0.915, y: 0.08, len: 0.065, ang: 100, curl: 30, key: 'fish_sturg_4' },
          { x: 0.905, y: 0.08, len: 0.065, ang: 104, curl: 30, key: 'fish_sturg_4' }, { x: 0.895, y: 0.08, len: 0.065, ang: 108, curl: 30, key: 'fish_sturg_4' }
        ] },
      lateral: { v: 0.5, arch: 0.02, d: 1 },
      tail: { len: 0.22, spread: 0.105, up: 2, down: 1.1, tilt: 0.7, low: 0.55, fork: 0.3, rays: 15, ramp: ['fish_sturg_1', 'fish_sturg_2', 'fish_sturg_3', 'fish_sturg_4'] },
      fin: ['fish_sturg_1', 'fish_sturg_2', 'fish_sturg_3', 'fish_sturg_4'],
      fins: [
        { k: 'dorsal', a: 0.04, b: 0.15, h: 0.112, prof: [0.9, 1, 0.85, 0.65, 0.5], rays: 8, lean: 0.5 },
        { k: 'anal', a: 0.04, b: 0.12, h: 0.098, prof: [0.9, 1, 0.85, 0.65, 0.5], rays: 6, lean: 0.5 },
        ext(pelvic(0.24, 0.098), { ang: 140 }), ext(pectoral(0.74, 0.86, 0.14), { ang: 150 })
      ],
      marks: [
        { k: 'scutes', vs: [0.02], x0: 0.2, x1: 0.72, n: 10, r: 2.2, key: 'fish_scute', rim: 'fish_sturg_1' },
        { k: 'scutes', vs: [0.4], x0: 0.06, x1: 0.74, n: 22, r: 1.8, key: 'fish_scute', rim: 'fish_sturg_1' },
        { k: 'scutes', vs: [0.86], x0: 0.3, x1: 0.68, n: 7, r: 1.6, key: 'fish_scute', rim: 'fish_sturg_2' }
      ]
    },
    // ---- mooneyes (Phase 72): deep and thin, a huge eye, the dorsal set back over a long anal ----
    mooneye: {
      px: 80,
      body: [[0, -0.0728, 0.065], [0.15, -0.1274, 0.156], [0.4, -0.182, 0.234], [0.6, -0.1898, 0.2314], [0.78, -0.1664, 0.1846], [0.9, -0.1118, 0.1092], [1, -0.039, 0.0338]],
      ramp: ramp('moon'), stops: [0.08, 0.18, 0.32, 0.52, 0.74], sheen: [0.18, 0.28],
      head: { gill: 0.78, bulge: 0.05, pre: 0.84, eye: [0.9, -0.039, 0.058], iris: 'fish_eye_silver', rim: 'fish_moon_0', mouth: [-0.0052, 0.07, 0.016, 0], lip: true, cheek: 1 },
      lateral: { v: 0.34, arch: 0.06, d: -1 }, scales: { size: 3, v0: 0.08, v1: 0.94, d: -1, n: 0.6 },
      tail: { len: 0.19, spread: 0.234, fork: 0.6, rays: 15, ramp: FIN_GR },
      fin: FIN_GR,
      fins: [
        { k: 'dorsal', a: 0.22, b: 0.34, h: 0.1875, prof: [0.9, 1, 0.85, 0.65, 0.5], rays: 9, lean: 0.45 },
        { k: 'anal', a: 0.1, b: 0.4, h: 0.125, prof: [0.6, 0.8, 1, 0.95, 0.85, 0.7, 0.55], rays: 16, lean: 0.4 },
        pelvic(0.5, 0.1125), pectoral(0.76, 0.8, 0.125)
      ],
      marks: []
    },
    goldeye: {
      px: 78,
      body: [[0, -0.0675, 0.06], [0.15, -0.1175, 0.145], [0.4, -0.1675, 0.2125], [0.6, -0.175, 0.2125], [0.78, -0.1525, 0.17], [0.9, -0.1025, 0.1], [1, -0.0375, 0.03]],
      ramp: ramp('gold'), stops: [0.08, 0.18, 0.32, 0.52, 0.74], sheen: [0.18, 0.28],
      head: { gill: 0.78, bulge: 0.05, pre: 0.84, eye: [0.9, -0.035, 0.056], iris: 'fish_eye_gold', rim: 'fish_gold_0', mouth: [-0.005, 0.07, 0.016, 0], lip: true, cheek: 1 },
      lateral: { v: 0.34, arch: 0.06, d: -1 }, scales: { size: 3, v0: 0.08, v1: 0.94, d: -1, n: 0.6 },
      tail: { len: 0.19, spread: 0.225, fork: 0.6, rays: 15, ramp: ['fish_finblue_0', 'fish_finblue_1', 'fish_finblue_2', 'fish_finblue_3'] },
      fin: ['fish_finblue_0', 'fish_finblue_1', 'fish_finblue_2', 'fish_finblue_3'],
      fins: [
        { k: 'dorsal', a: 0.2, b: 0.31, h: 0.175, prof: [0.9, 1, 0.85, 0.65, 0.5], rays: 9, lean: 0.45 },
        { k: 'anal', a: 0.1, b: 0.4, h: 0.125, prof: [0.6, 0.8, 1, 0.95, 0.85, 0.7, 0.55], rays: 16, lean: 0.4 },
        pelvic(0.5, 0.1125), pectoral(0.76, 0.8, 0.125)
      ],
      marks: []
    },
    // ---- herring & shad (Phase 72): silver, a keeled belly, one small dorsal mid-back, deep forks ----
    threadfin_shad: {
      px: 58,
      body: [[0, -0.066, 0.0594], [0.15, -0.132, 0.132], [0.4, -0.198, 0.22], [0.6, -0.2046, 0.2156], [0.78, -0.1716, 0.165], [0.9, -0.11, 0.0924], [1, -0.033, 0.0264]],
      ramp: ramp('tshad'), stops: [0.08, 0.18, 0.32, 0.52, 0.74], sheen: [0.18, 0.28],
      head: { gill: 0.78, bulge: 0.05, pre: 0.84, eye: [0.9, -0.033, 0.062], iris: 'fish_eye_silver', rim: 'fish_tshad_0', mouth: [0.011, 0.05, 0.008, 0], lip: true, cheek: 1 },
      scales: { size: 2, v0: 0.08, v1: 0.94, d: -1, n: 0.4 },
      tail: { len: 0.2, spread: 0.22, fork: 0.62, rays: 12, ramp: ['fish_finyel_0', 'fish_finyel_1', 'fish_finyel_2', 'fish_finyel_3'] },
      fin: ['fish_finyel_0', 'fish_finyel_1', 'fish_finyel_2', 'fish_finyel_3'],
      fins: [
        { k: 'dorsal', a: 0.36, b: 0.52, h: 0.176, prof: [0.9, 1, 0.8, 0.6, 0.6, 1.5], rays: 7, lean: 0.9 },
        { k: 'anal', a: 0.08, b: 0.3, h: 0.077, prof: [0.6, 0.9, 1, 0.9, 0.7], rays: 10, lean: 0.4 },
        pelvic(0.5, 0.088), pectoral(0.76, 0.84, 0.099)
      ],
      marks: [{ k: 'blotch', x: 0.73, v: 0.24, rx: 0.025, ry: 0.1, d: -3 }]
    },
    pacific_herring: {
      px: 80,
      body: [[0, -0.065, 0.0572], [0.15, -0.1144, 0.1144], [0.4, -0.1586, 0.169], [0.6, -0.1638, 0.169], [0.78, -0.1456, 0.143], [0.9, -0.1014, 0.091], [1, -0.039, 0.0286]],
      ramp: ramp('herring'), stops: [0.1, 0.22, 0.34, 0.52, 0.74], sheen: [0.22, 0.3],
      head: { gill: 0.78, bulge: 0.05, pre: 0.84, eye: [0.905, -0.0338, 0.05], iris: 'fish_eye_silver', rim: 'fish_herring_0', mouth: [-0.013, 0.06, 0.018, 0], lip: true, cheek: 1 },
      scales: { size: 3, v0: 0.1, v1: 0.94, d: -1, n: 0.6 },
      tail: { len: 0.2, spread: 0.247, fork: 0.65, rays: 14, ramp: FIN_GR },
      fin: FIN_GR,
      fins: [
        { k: 'dorsal', a: 0.42, b: 0.56, h: 0.182, prof: [0.9, 1, 0.85, 0.65, 0.45], rays: 8, lean: 0.4 },
        { k: 'anal', a: 0.12, b: 0.26, h: 0.091, prof: [0.6, 0.9, 1, 0.85, 0.6], rays: 9, lean: 0.4 },
        pelvic(0.46, 0.104), pectoral(0.76, 0.82, 0.117)
      ],
      marks: []
    },
    american_shad: {
      px: 84,
      body: [[0, -0.0728, 0.065], [0.15, -0.143, 0.143], [0.4, -0.2132, 0.2236], [0.6, -0.221, 0.221], [0.78, -0.1924, 0.182], [0.9, -0.13, 0.117], [1, -0.052, 0.0468]],
      ramp: ramp('amshad'), stops: [0.08, 0.18, 0.32, 0.52, 0.74], sheen: [0.18, 0.28],
      head: { gill: 0.76, bulge: 0.055, pre: 0.82, eye: [0.885, -0.052, 0.046], iris: 'fish_eye_gold', rim: 'fish_amshad_0', mouth: [0.0052, 0.12, 0.024, 1], lip: true, cheek: 1 },
      scales: { size: 3, v0: 0.08, v1: 0.94, d: -1, n: 0.6 },
      tail: { len: 0.2, spread: 0.26, fork: 0.62, rays: 15, ramp: FIN_OL },
      fin: FIN_OL,
      fins: [
        { k: 'dorsal', a: 0.42, b: 0.56, h: 0.1875, prof: [0.9, 1, 0.85, 0.65, 0.45], rays: 8, lean: 0.4 },
        { k: 'anal', a: 0.1, b: 0.28, h: 0.0875, prof: [0.6, 0.9, 1, 0.85, 0.6], rays: 11, lean: 0.4 },
        pelvic(0.48, 0.1125), pectoral(0.74, 0.82, 0.125)
      ],
      marks: [
        { k: 'blotch', x: 0.72, v: 0.22, rx: 0.02, ry: 0.08, d: -3 },
        { k: 'stripes', vs: [0.24], w: 2, x0: 0.36, x1: 0.68, dots: 6, d: -3 }
      ]
    },
    // ---- smelt (Phase 72): slim, an adipose fin ----
    eulachon: {
      px: 84,
      body: [[0, -0.0567, 0.0486], [0.15, -0.0945, 0.0891], [0.4, -0.1269, 0.1242], [0.6, -0.1296, 0.1269], [0.78, -0.1188, 0.1134], [0.9, -0.0864, 0.0783], [1, -0.0324, 0.027]],
      ramp: ramp('eul'), stops: [0.12, 0.26, 0.42, 0.6, 0.8], sheen: [0.24, 0.36],
      head: { gill: 0.76, bulge: 0.04, pre: 0.82, eye: [0.89, -0.0405, 0.04], iris: 'fish_eye_silver', rim: 'fish_eul_0', mouth: [0.0054, 0.1, 0.012, 0], lip: true, cheek: 1 },
      lateral: { v: 0.46, arch: 0.02, d: 1 }, scales: { size: 2, v0: 0.12, v1: 0.92, d: -1, n: 0.3 },
      tail: { len: 0.19, spread: 0.2025, fork: 0.55, rays: 14, ramp: FIN_GR },
      fin: FIN_GR,
      fins: sfins({ d: [0.42, 0.56, 0.156], drays: 9, ad: [0.12, 0.17, 0.039], an: [0.12, 0.3, 0.104], pel: [0.46, 0.104], pec: [0.75, 0.84, 0.104], fin: FIN_GR, adr: ['fish_eul_2', 'fish_eul_2', 'fish_eul_2', 'fish_eul_3'] }),
      marks: [{ k: 'spots', n: 40, x0: 0.04, x1: 0.8, v0: 0.04, v1: 0.3, r: 0.6, seed: 7204, d: -2 }]
    },
    capelin: {
      px: 84,
      body: [[0, -0.054, 0.0459], [0.15, -0.0891, 0.0837], [0.4, -0.1215, 0.1188], [0.6, -0.1269, 0.1215], [0.78, -0.1134, 0.108], [0.9, -0.0783, 0.0756], [1, -0.0405, 0.0405]],
      ramp: ramp('cap'), stops: [0.12, 0.26, 0.42, 0.6, 0.8], sheen: [0.24, 0.36],
      head: { gill: 0.77, bulge: 0.04, pre: 0.83, eye: [0.89, -0.0351, 0.04], iris: 'fish_eye_silver', rim: 'fish_cap_0', mouth: [-0.0162, 0.1, 0.03, 1], lip: true, cheek: 1 },
      lateral: { v: 0.48, arch: 0.02, d: -1 }, scales: { size: 2, v0: 0.12, v1: 0.92, d: -1, n: 0.3 },
      tail: { len: 0.19, spread: 0.2025, fork: 0.5, rays: 14, ramp: FIN_OL },
      fin: FIN_OL,
      fins: sfins({ d: [0.42, 0.56, 0.156], drays: 9, ad: [0.12, 0.17, 0.039], an: [0.12, 0.3, 0.104], pel: [0.46, 0.117], pec: [0.75, 0.84, 0.117], fin: FIN_OL, adr: ['fish_cap_2', 'fish_cap_2', 'fish_cap_2', 'fish_cap_3'] }),
      marks: [{ k: 'stripes', vs: [0.5], w: 1, x0: 0.04, x1: 0.76, d: 1 }]
    },
    // ---- lingcod (Phase 72): a big head and a toothed mouth, a long notched dorsal, marbled ----
    lingcod: {
      px: 100,
      body: [[0, -0.0594, 0.0513], [0.15, -0.1053, 0.0945], [0.4, -0.1512, 0.1404], [0.6, -0.1674, 0.1512], [0.78, -0.1728, 0.1485], [0.9, -0.135, 0.1134], [1, -0.054, 0.0405]],
      ramp: ramp('ling'), stops: [0.12, 0.28, 0.46, 0.64, 0.82], sheen: [0.26, 0.4],
      head: { gill: 0.74, bulge: 0.05, pre: 0.8, eye: [0.89, -0.0945, 0.034], iris: 'fish_eye_gold', rim: 'fish_ling_0', mouth: [0.0081, 0.19, 0.03, 5], teeth: 'fish_cream', lip: true, cheek: 1 },
      lateral: { v: 0.36, arch: 0.04, d: 1 }, scales: { size: 2, v0: 0.12, v1: 0.92, d: -1, n: 0.2 },
      tail: { len: 0.15, spread: 0.162, fork: 0, round: 0.35, rays: 14 },
      fin: FIN_GR,
      fins: [
        { k: 'dorsal', a: 0.46, b: 0.72, h: 0.1625, prof: [0.6, 0.9, 1, 0.92, 0.8, 0.6, 0.4], rays: 14, spiny: true, lean: 0.3 },
        { k: 'dorsal', a: 0.05, b: 0.46, h: 0.15, prof: [0.5, 0.8, 0.95, 1, 1, 0.95, 0.85, 0.6], rays: 18, lean: 0.3 },
        { k: 'anal', a: 0.05, b: 0.4, h: 0.125, prof: [0.5, 0.8, 0.95, 1, 0.95, 0.8, 0.6], rays: 16, lean: 0.3 },
        ext(pelvic(0.74, 0.1), { ang: 110 }), pectoral(0.72, 0.6, 0.1875)
      ],
      marks: [{ k: 'mottle', x0: 0, x1: 0.92, v0: 0.02, v1: 0.82, sc: 2.6, t: 0.7, d: -2 }]
    },
    // ---- rockfish (Phase 72): a perch-like body, a spiny notched dorsal, the yellow eye ----
    yelloweye_rockfish: {
      px: 90,
      body: [[0, -0.0735, 0.063], [0.15, -0.1428, 0.1239], [0.4, -0.21, 0.1785], [0.6, -0.2163, 0.1806], [0.78, -0.189, 0.1575], [0.9, -0.126, 0.105], [1, -0.042, 0.0483]],
      ramp: ramp('yeye'), stops: [0.1, 0.24, 0.42, 0.62, 0.8], sheen: [0.22, 0.34],
      head: { gill: 0.72, bulge: 0.06, pre: 0.78, eye: [0.86, -0.0735, 0.066], iris: 'fish_eye_yellow', rim: 'fish_yeye_0', mouth: [0.0315, 0.15, 0.03, 3], lip: true, cheek: 1 },
      lateral: { v: 0.26, arch: 0.04, d: 1 }, scales: { size: 3, v0: 0.12, v1: 0.92, d: -1, n: 0.6 },
      tail: { len: 0.17, spread: 0.189, fork: 0.12, rays: 14, ramp: ['fish_finred_0', 'fish_finred_1', 'fish_finred_2', 'fish_finred_3'] },
      fin: ['fish_finred_0', 'fish_finred_1', 'fish_finred_2', 'fish_finred_3'],
      fins: [
        { k: 'dorsal', a: 0.4, b: 0.7, h: 0.1785, prof: [0.4, 0.8, 1, 0.95, 0.85, 0.7, 0.55, 0.45], rays: 13, spiny: true, lean: 0.3 },
        { k: 'dorsal', a: 0.17, b: 0.4, h: 0.1575, prof: [0.6, 0.9, 1, 0.95, 0.8, 0.5], rays: 12, lean: 0.3 },
        { k: 'anal', a: 0.15, b: 0.3, h: 0.1575, prof: [0.6, 0.95, 1, 0.85, 0.6], rays: 8, lean: 0.3 },
        pelvic(0.62, 0.126), pectoral(0.7, 0.6, 0.147)
      ],
      marks: [{ k: 'stripes', vs: [0.3], w: 1.5, x0: 0.06, x1: 0.68, broken: 0.3, key: 'fish_yeye_5' }]
    },
    // ---- halibut (Phase 72): the eyed side, both eyes over the head, the long dorsal and anal
    // fins round the edges ----
    greenland_halibut: {
      px: 104,
      body: [[0, -0.0638, 0.058], [0.12, -0.1363, 0.1305], [0.32, -0.2349, 0.2262], [0.52, -0.261, 0.2494], [0.7, -0.2378, 0.2262], [0.84, -0.174, 0.1624], [0.94, -0.1044, 0.0986], [1, -0.0435, 0.0435]],
      ramp: ramp('ghal'), stops: [0.12, 0.28, 0.46, 0.64, 0.82], sheen: [0.22, 0.36],
      head: { gill: 0.8, bulge: 0.05, pre: 0.86, eye: [0.91, -0.0435, 0.03], eye2: [0.88, -0.1595, 0.028], iris: 'fish_eye_gold', rim: 'fish_ghal_0', mouth: [0.0435, 0.12, 0.024, 2], lip: true, cheek: 1 },
      lateral: { v: 0.5, arch: 0, d: 1 }, scales: { size: 2, v0: 0.1, v1: 0.92, d: 1, n: 0.15 },
      tail: { len: 0.14, spread: 0.1885, fork: 0.25, rays: 14, ramp: ['fish_ghal_1', 'fish_ghal_2', 'fish_ghal_3', 'fish_ghal_4'] },
      fin: ['fish_ghal_1', 'fish_ghal_2', 'fish_ghal_3', 'fish_ghal_4'],
      fins: [
        { k: 'dorsal', a: 0.03, b: 0.8, h: 0.084, prof: [0.5, 0.8, 0.95, 1, 1, 1, 0.95, 0.8, 0.5], rays: 40, lean: 0.25 },
        { k: 'anal', a: 0.03, b: 0.7, h: 0.084, prof: [0.5, 0.8, 0.95, 1, 1, 0.95, 0.8, 0.5], rays: 36, lean: 0.25 },
        ext(pelvic(0.76, 0.098), { ang: 120 }), pectoral(0.78, 0.55, 0.112)
      ],
      marks: []
    },
    pacific_halibut: {
      px: 104,
      body: [[0, -0.056, 0.0507], [0.12, -0.1281, 0.1227], [0.32, -0.2268, 0.2188], [0.52, -0.2535, 0.2401], [0.7, -0.2268, 0.2134], [0.84, -0.1601, 0.1494], [0.94, -0.0934, 0.088], [1, -0.04, 0.0374]],
      ramp: ramp('phal'), stops: [0.12, 0.28, 0.46, 0.64, 0.82], sheen: [0.22, 0.36],
      head: { gill: 0.8, bulge: 0.05, pre: 0.86, eye: [0.915, -0.058, 0.03], eye2: [0.885, -0.1232, 0.03], iris: 'fish_eye_gold', rim: 'fish_phal_0', mouth: [0.0435, 0.1, 0.02, 1], lip: true, cheek: 1 },
      lateral: { v: 0.52, arch: 0.22, d: 2 }, scales: { size: 2, v0: 0.1, v1: 0.92, d: 1, n: 0.15 },
      tail: { len: 0.14, spread: 0.2175, fork: 0.32, rays: 15, ramp: ['fish_phal_1', 'fish_phal_2', 'fish_phal_3', 'fish_phal_4'] },
      fin: ['fish_phal_1', 'fish_phal_2', 'fish_phal_3', 'fish_phal_4'],
      fins: [
        { k: 'dorsal', a: 0.03, b: 0.82, h: 0.091, prof: [0.5, 0.8, 0.95, 1, 1, 1, 0.95, 0.8, 0.5], rays: 40, lean: 0.25 },
        { k: 'anal', a: 0.03, b: 0.7, h: 0.091, prof: [0.5, 0.8, 0.95, 1, 1, 0.95, 0.8, 0.5], rays: 36, lean: 0.25 },
        ext(pelvic(0.76, 0.098), { ang: 120 }), pectoral(0.78, 0.55, 0.126)
      ],
      marks: [{ k: 'mottle', x0: 0, x1: 0.98, v0: 0.02, v1: 0.98, sc: 3.2, t: 0.75, d: -1 }]
    }
  };
})();

// Phase 80 (PLAN_WINTER.md 2.2): the (Ice) species' winter looks. Each is its summer self's spec
// with a winter palette: every fish_ key in it swapped for its cold copy (js/gfx/sprites.js):
// fish_w_ (paler, colder) for the shallow and middle fish, fish_d_ (darker, colder) for the
// three of the Deep Hole.
(function () {
  var DEEP = { ice_lake_trout: 1, ice_arctic_char: 1, ice_channel_catfish: 1 };
  function cold(v, pre) {
    if (typeof v === 'string') return v.indexOf('fish_') === 0 ? pre + v.slice(5) : v;
    if (Array.isArray(v)) return v.map(function (x) { return cold(x, pre); });
    if (v && typeof v === 'object') { var o = {}; for (var k in v) o[k] = cold(v[k], pre); return o; }
    return v;
  }
  var L = G.data.fishLooks;
  (G.data.fish || []).forEach(function (f) {
    if (f.ice && L[f.of] && !L[f.id]) L[f.id] = cold(L[f.of], DEEP[f.id] ? 'fish_d_' : 'fish_w_');
  });
})();
