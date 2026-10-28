var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The dog in the bow (V3.8). Phase 3 only draws its poses; deciding when to point,
// look down, stare or bark comes later (P7.6, P10.3). Never harmed, never threatened.
G.scene = G.scene || {};
G.scene.dog = (function () {
  var S = G.gfx.sprites;
  var MAP = { f: 'wood_hi', d: 'wood', e: 'ink', m: 'blood' };
  var POSES = ['idle', 'alert', 'point', 'look_down', 'stare', 'bark'];
  var SPRITE = {};

  var ALERT = [
    '......d.d..',
    '......dff..',
    '......feffe',
    'd.....fff..',
    '.d...ff....',
    '..dffff....',
    '..fffff....',
    '..f.f.f....'
  ];

  var FRAMES = {
    idle: [[
      '.......d...',
      '......dff..',
      '......feffe',
      '......fff..',
      'd....ff....',
      '.dfffff....',
      '..fffff....',
      '..f.f.f....'
    ]],
    alert: [ALERT],
    // Standing, head low and forward, tail straight, front paw lifted.
    point: [[
      '...........',
      '.......d...',
      '......dff..',
      'ddd...feffe',
      '...ffffff..',
      '...ffffff..',
      '...f.f..f..',
      '...f.f.....'
    ]],
    look_down: [[
      '...........',
      '.......d...',
      '......dff..',
      '......ffff.',
      'd....fffef.',
      '.dfffff.fe.',
      '..fffff....',
      '..f.f.f....'
    ]],
    // Head turned away toward the shore: no eye shows.
    stare: [[
      '......d.d..',
      '......dfd..',
      '......fff..',
      '......fff..',
      'd....ff....',
      '.dfffff....',
      '..fffff....',
      '..f.f.f....'
    ]],
    bark: [[
      '......d.d..',
      '......dff..',
      '......feffe',
      'd.....ffmm.',
      '.d...ff....',
      '..dffff....',
      '..fffff....',
      '..f.f.f....'
    ], ALERT]
  };

  for (var i = 0; i < POSES.length; i++) {
    SPRITE[POSES[i]] = 'dog_' + POSES[i];
    S.def(SPRITE[POSES[i]], MAP, FRAMES[POSES[i]]);
  }

  // 7.6: alert from 0.5 interest (a fish approaching), point from 0.7 (circling the lure or
  // closer), look down whenever a too-heavy fish is about (D4). A pose holds at least HOLD s.
  var T = { alert: 0.5, point: 0.7 }, HOLD = 0.6;

  function create() { return { pose: 'idle', t: 0, hold: 0, manual: 0 }; }

  // Returns false for an unknown pose. manual (s) keeps the pose against step() (debug).
  function setPose(d, pose, manual) {
    if (!SPRITE[pose]) return false;
    if (d.pose !== pose) { d.pose = pose; d.t = 0; }
    if (manual) d.manual = manual;
    return true;
  }

  // info: {interest 0..1, tooHeavyNear}. TODO(P10.3): stare and bark.
  function want(info) {
    if (!info) return 'idle';
    if (info.tooHeavyNear) return 'look_down';
    if (info.interest >= T.point) return 'point';
    if (info.interest >= T.alert) return 'alert';
    return 'idle';
  }

  function step(d, dt, info) {
    d.t += dt;
    d.hold -= dt;
    if (d.manual > 0) { d.manual -= dt; return; }
    var w = want(info);
    if (w !== d.pose && d.hold <= 0) { setPose(d, w); d.hold = HOLD; }
  }

  function draw(ctx, d, x, y, flip) { S.draw(ctx, SPRITE[d.pose], x, y, Math.floor(d.t * 5), flip); }

  return { POSES: POSES, T: T, create: create, setPose: setPose, want: want, step: step, draw: draw };
})();
