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

  function create() { return { pose: 'idle', t: 0 }; }

  // Returns false for an unknown pose.
  function setPose(d, pose) {
    if (!SPRITE[pose]) return false;
    if (d.pose !== pose) { d.pose = pose; d.t = 0; }
    return true;
  }

  function step(d, dt) { d.t += dt; } // TODO(P7.6): choose poses from fish interest

  function draw(ctx, d, x, y, flip) { S.draw(ctx, SPRITE[d.pose], x, y, Math.floor(d.t * 5), flip); }

  return { POSES: POSES, create: create, setPose: setPose, step: step, draw: draw };
})();
