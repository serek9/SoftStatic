var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The fish's anatomy specs (Phase 70, PLAN_SPECIES.md 3.5), painted by js/gfx/fishgen.js
// (paintSpec; the format is described there). One entry per species id in data/fish.js; a
// species with none keeps the placeholder painter until Phases 71-72. Body lengths run from the
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
  function pelvic(x, len, r) { return { k: 'pelvic', x: x, v: 0.9, ang: 124, len: len * 1.4, spread: 46, prof: [0.7, 1, 0.9, 0.6], rays: 6, ramp: r }; }
  function pectoral(x, v, len, r) { return { k: 'pectoral', x: x + 0.01, v: v, ang: 172, len: len * 1.6, spread: 64, prof: [0.4, 0.75, 0.95, 1, 0.8], rays: 8, front: true, clear: true, ramp: r }; }

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
    }
  };
})();
