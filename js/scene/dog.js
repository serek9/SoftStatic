var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The dog in the bow (V3.8): points at interested fish, looks down when a too-heavy fish
// is about (7.6), stares once per location at a real hidden spot and barks toward a spot
// that holds a legendary (10.3, V10.4). Never harmed, never threatened.
G.scene = G.scene || {};
G.scene.dog = (function () {
  var S = G.gfx.sprites;
  // Phase 18: the golden dog, painted in the 640×360 view's pixels (24×20, HI per world
  // pixel) and drawn at 1/HI size in the old 12×10 world box, sitting in the bow facing the
  // way the boat does. One painting per pose and frame, made on first use.
  var A = G.gfx.paint, HI = 2, W = 24, H = 20;
  var POSES = ['idle', 'alert', 'point', 'look_down', 'stare', 'bark', 'pet', 'sleep'];
  var FRAMES = { bark: 2, pet: 2, sleep: 2 };
  var SPRITE = {};
  for (var i = 0; i < POSES.length; i++) SPRITE[POSES[i]] = 'dog_' + POSES[i];
  var DOG = ['dog_dark', 'dog', 'dog_hi'], EAR = ['ink', 'dog_dark', 'dog'];

  function head(c, hx, hy, o) {
    if (o.earUp) { A.limb(c, hx - 1, hy - 2, hx - 1.5, hy - 5.5, 1.3, EAR, 0); }
    A.blob(c, hx, hy, 4, 3.6, DOG, { bias: 0.1 });
    if (!o.away) {
      A.blob(c, hx + 3.6, hy + 1.4, 2.6, 1.7, DOG, { bias: 0.25 });
      A.px(c, 'ink', Math.round(hx + 6), Math.round(hy + 0.6));
      if (o.shut) A.box(c, 'ink', Math.round(hx), Math.round(hy - 1), 2, 1); else A.px(c, 'ink', Math.round(hx + 1), Math.round(hy - 1));
      if (o.mouth) { A.box(c, 'blood', Math.round(hx + 3), Math.round(hy + 3), 3, 1); A.px(c, 'dog_dark', Math.round(hx + 5), Math.round(hy + 4)); }
      if (!o.earUp) A.limb(c, hx - 2, hy - 2, hx - 3, hy + 2, 1.4, EAR, 0);
    } else {
      A.limb(c, hx - 2, hy - 2, hx - 2.5, hy - 5, 1.2, EAR, 0); A.limb(c, hx + 2, hy - 2, hx + 2.5, hy - 5, 1.2, EAR, 0);
      A.box(c, 'dog_dark', Math.round(hx - 1), Math.round(hy + 1), 3, 1);
    }
  }
  function sitting(c, o) {
    A.limb(c, o.t0[0], o.t0[1], o.t1[0], o.t1[1], 1.3, DOG, 0.1);                          // the tail
    A.blob(c, 8, 13, 6.5, 4.5, DOG, { bias: -0.05 });
    A.blob(c, 6, 14.5, 4.5, 3.5, DOG, { bias: 0.05 });
    A.blob(c, o.cx || 16, o.cy || 11, 4.5, 5.5, DOG, { bias: 0.15 });
    A.box(c, 'dog_hi', (o.cx || 16) + 1, (o.cy || 11) - 1, 2, 4);                            // the pale chest
    if (o.leg) A.limb(c, o.leg[0], o.leg[1], o.leg[2], o.leg[3], 1.4, DOG, 0.1);
    else A.limb(c, 17, 13, 17, 18, 1.4, DOG, 0.1);
    head(c, o.hx, o.hy, o);
  }
  var PAINTERS = {
    idle: function (c) { sitting(c, { t0: [3, 12], t1: [1, 8], hx: 18, hy: 5 }); },
    alert: function (c) { sitting(c, { t0: [3, 11], t1: [2, 5], hx: 18, hy: 4, earUp: true }); },
    point: function (c) { sitting(c, { t0: [4, 11], t1: [0, 10], hx: 20, hy: 8, cx: 17, cy: 12, leg: [18, 13, 21, 12] }); },
    look_down: function (c) {
      sitting(c, { t0: [3, 12], t1: [1, 8], hx: 18, hy: 9, away: false, cx: 16, cy: 12 });
      A.blob(c, 20, 12.5, 1.8, 2.4, DOG, { bias: 0.2 }); A.px(c, 'ink', 20, 15);
    },
    stare: function (c) { sitting(c, { t0: [3, 12], t1: [2, 9], hx: 17, hy: 5, away: true }); },
    bark: function (c, f) { if (f) PAINTERS.alert(c); else sitting(c, { t0: [3, 11], t1: [2, 6], hx: 18, hy: 5, mouth: true }); },
    pet: function (c, f) { sitting(c, { t0: [3, 11], t1: f ? [0, 12] : [2, 5], hx: 18, hy: 4, shut: true }); },
    sleep: function (c, f) {
      A.limb(c, 3, 16, 1, 13, 1.3, DOG, 0.1);
      A.blob(c, 11, 16 + (f ? 0.5 : 0), 9.5, 3.5 - (f ? 0.5 : 0), DOG, { bias: 0.05 });
      A.blob(c, 19, 15, 3.6, 2.8, DOG, { bias: 0.15 }); A.blob(c, 22, 16, 2, 1.4, DOG, { bias: 0.25 });
      A.px(c, 'ink', 23, 15); A.box(c, 'ink', 19, 14, 2, 1);
      A.limb(c, 17, 13, 16, 16, 1.3, EAR, 0);
    }
  };
  var art = {};
  function img(pose, f, flip) {
    var key = pose + f + (flip ? '<' : '');
    if (art[key]) return art[key];
    if (flip) return (art[key] = G.gfx.bake.flipped(img(pose, f, false), 'x'));
    return (art[key] = G.gfx.bake.layer(W, H, function (c) { A.reset(); PAINTERS[pose](c, f); A.reset(); }));
  }

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

  function draw(ctx, d, x, y, flip) {
    var n = FRAMES[d.pose] || 1, f = Math.floor(d.t * (d.pose === 'pet' ? 7 : (d.pose === 'sleep' ? 0.7 : 5))) % n;
    ctx.drawImage(img(d.pose, f, flip), x, y, W / HI, H / HI);
  }

  return { POSES: POSES, T: T, CUE: CUE, PET: PET, create: create, setPose: setPose, pet: pet, want: want, cues: cues, legendHere: legendHere, step: step, draw: draw };
})();
