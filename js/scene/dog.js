var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The dog in the bow (V3.8): points at interested fish, looks down when a too-heavy fish
// is about (7.6), stares once per location at a real hidden spot and barks toward a spot
// that holds a legendary (10.3, V10.4). Never harmed, never threatened.
G.scene = G.scene || {};
G.scene.dog = (function () {
  var S = G.gfx.sprites;
  var MAP = { f: 'wood_hi', d: 'wood', e: 'ink', m: 'blood' };
  var POSES = ['idle', 'alert', 'point', 'look_down', 'stare', 'bark', 'pet', 'sleep'];
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
    ], ALERT],
    // Audit P1-6: being petted. Eyes shut, ears back, the tail wagging.
    pet: [[
      '...........',
      '......dd...',
      '......fdffe',
      'd.....fff..',
      '.d...ff....',
      '..dffff....',
      '..fffff....',
      '..f.f.f....'
    ], [
      '...........',
      '......dd...',
      '......fdffe',
      '......fff..',
      'dd...ff....',
      '..dffff....',
      '..fffff....',
      '..f.f.f....'
    ]],
    // Audit P2-2: asleep in the bow while passive mode fishes. It breathes.
    sleep: [[
      '...........',
      '...........',
      '...........',
      '.......dd..',
      '......fdffe',
      'ddfffffff..',
      '.ffffffff..',
      '...........'
    ], [
      '...........',
      '...........',
      '...........',
      '...........',
      '.......ddd.',
      'ddffffffdfe',
      '.ffffffff..',
      '...........'
    ]]
  };

  for (var i = 0; i < POSES.length; i++) {
    SPRITE[POSES[i]] = 'dog_' + POSES[i];
    S.def(SPRITE[POSES[i]], MAP, FRAMES[POSES[i]]);
  }

  // 7.6: alert from 0.5 interest (a fish approaching), point from 0.7 (circling the lure or
  // closer), look down whenever a too-heavy fish is about (D4). A pose holds at least HOLD s.
  var T = { alert: 0.5, point: 0.7 }, HOLD = 0.6;

  // 10.3: px from the boat at which the dog notices its hidden spot or a legendary spot,
  // how long it stares or barks (s), and how far the boat must go before it barks again.
  var CUE = { stareR: 110, stare: 4, barkR: 80, bark: 2.5, rearm: 160 };

  function create() { return { pose: 'idle', t: 0, hold: 0, manual: 0, barkArmed: true, cue: '', petT: 0 }; }

  // Returns false for an unknown pose. manual (s) keeps the pose against step() (debug).
  function setPose(d, pose, manual) {
    if (!SPRITE[pose]) return false;
    if (d.pose !== pose) { d.pose = pose; d.t = 0; }
    if (manual) d.manual = manual;
    return true;
  }

  // Audit P1-6: petting holds the 'pet' pose for PET.hold s, at most once every PET.again s,
  // and never cuts into the stare or the bark. Returns true when the dog was petted.
  var PET = { hold: 2, again: 3 };
  function pet(d) {
    if (d.petT > 0 || (d.manual > 0 && (d.pose === 'stare' || d.pose === 'bark'))) return false;
    setPose(d, 'pet', PET.hold);
    d.petT = PET.again;
    return true;
  }

  // True when a legendary species lives at location id (the bark never points at nothing).
  function legendHere(id, fish) {
    for (var i = 0; i < fish.length; i++) if (fish[i].rarity === 'legendary' && fish[i].locations.indexOf(id) >= 0) return true;
    return false;
  }

  // 10.3: the stare (once per location, saved in flags.dogStare) and the bark (each time
  // the boat comes near a legendary spot, after it has been away). Returns the spot id
  // that set off a cue this step, or ''.
  function cues(d, save, loc, boatX, data) {
    var spots = loc.spots || [], far = true, i, s;
    for (i = 0; i < spots.length; i++) {
      s = spots[i];
      var dist = Math.abs(boatX - s.x);
      if (s.kind === 'hidden' && !save.flags.dogStare[loc.id] && dist <= CUE.stareR) {
        save.flags.dogStare[loc.id] = true;
        setPose(d, 'stare', CUE.stare); d.cue = s.id;
        return s.id;
      }
      if (s.kind === 'legendary') {
        if (dist <= CUE.rearm) far = false;
        if (d.barkArmed && dist <= CUE.barkR && legendHere(loc.id, data.fish)) {
          d.barkArmed = false;
          setPose(d, 'bark', CUE.bark); d.cue = s.id;
          return s.id;
        }
      }
    }
    if (far) d.barkArmed = true;
    return '';
  }

  // info: {interest 0..1, tooHeavyNear}.
  function want(info) {
    if (!info) return 'idle';
    if (info.tooHeavyNear) return 'look_down';
    if (info.interest >= T.point) return 'point';
    if (info.interest >= T.alert) return 'alert';
    return info.sleep ? 'sleep' : 'idle';
  }

  function step(d, dt, info) {
    d.t += dt;
    d.hold -= dt;
    if (d.petT > 0) d.petT -= dt;
    if (d.manual > 0) { d.manual -= dt; return; }
    var w = want(info);
    if (w !== d.pose && d.hold <= 0) { setPose(d, w); d.hold = HOLD; }
  }

  function draw(ctx, d, x, y, flip) { S.draw(ctx, SPRITE[d.pose], x, y, Math.floor(d.t * (d.pose === 'pet' ? 7 : (d.pose === 'sleep' ? 0.7 : 5))), flip); }

  return { POSES: POSES, T: T, CUE: CUE, PET: PET, create: create, setPose: setPose, pet: pet, want: want, cues: cues, legendHere: legendHere, step: step, draw: draw };
})();
