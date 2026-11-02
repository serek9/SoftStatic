var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The dog in the bow (V3.8): points at interested fish, looks down when a too-heavy fish
// is about (7.6) and stares once per location at a real hidden spot (10.3; Phase 68: the
// bark toward a legendary's spot went with the legendary fish). Never harmed, never threatened.
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
  // Phase 47: the breed being painted (data/looks.js): its coat, ear and muzzle ramps, the
  // pale chest, the shapes of its ears and tail, and its bulk. Set by img() around a painting.
  var L = null, DOG = null, EAR = null;

  // The ear while the head faces ahead (o.earUp: pricked by the alert). A golden's drops, a
  // husky's always stands, a St. Bernard's hangs heavy, a poodle's is a long fluffy fall.
  function ear(c, hx, hy, up) {
    var e = L.ears;
    if (e === 'prick') { A.limb(c, hx - 1, hy - 2, hx - 0.5, hy - (up ? 6.5 : 6), 1.4, EAR, 0.1); return; }
    if (up) { A.limb(c, hx - 1, hy - 2, hx - 1.5, hy - 5.5, 1.3, EAR, 0); return; }
    if (e === 'heavy') A.limb(c, hx - 2, hy - 2, hx - 3.2, hy + 2.8, 1.9, EAR, 0);
    else if (e === 'pom') A.blob(c, hx - 2.6, hy + 1.4, 1.9, 3.1, EAR, { bias: 0.15 });
    else A.limb(c, hx - 2, hy - 2, hx - 3, hy + 2, 1.4, EAR, 0);
  }
  // The tail from t0 toward t1: a golden's feather, a husky's curl over its back, a St.
  // Bernard's low hang, a poodle's short tail with its pompom.
  function tail(c, t0, t1) {
    var t = L.tail;
    if (t === 'curl') { A.limb(c, t0[0], t0[1], t0[0] - 1, t0[1] - 5, 1.4, DOG, 0.1); A.limb(c, t0[0] - 1, t0[1] - 5, t0[0] + 2, t0[1] - 6, 1.3, DOG, 0.2); }
    else if (t === 'low') A.limb(c, t0[0], t0[1], t0[0] - 2, t0[1] + 4, 1.7, DOG, 0);
    else if (t === 'pom') { A.limb(c, t0[0], t0[1], (t0[0] + t1[0]) / 2, (t0[1] + t1[1]) / 2, 0.9, DOG, 0.1); A.blob(c, (t0[0] + t1[0]) / 2, (t0[1] + t1[1]) / 2 - 0.5, 1.9, 1.8, DOG, { bias: 0.15 }); }
    else A.limb(c, t0[0], t0[1], t1[0], t1[1], 1.3, DOG, 0.1);
  }

  function head(c, hx, hy, o) {
    if (o.earUp && L.ears !== 'prick') ear(c, hx, hy, true);
    if (L.ears === 'pom' && !o.away) A.blob(c, hx - 0.5, hy - 3.2, 2.6, 1.8, DOG, { bias: 0.2 }); // the poodle's topknot
    A.blob(c, hx, hy, 4, 3.6, DOG, { bias: 0.1 });
    if (!o.away) {
      A.blob(c, hx + 3.6, hy + 1.4, 2.6, 1.7, L.muzzle, { bias: 0.25 });
      if (L.face === 'mask') { A.box(c, L.chest, Math.round(hx), Math.round(hy), 3, 1); A.px(c, L.chest, Math.round(hx + 2), Math.round(hy - 2)); } // pale under the eye, a pale brow
      if (L.face === 'blaze') { A.box(c, L.chest, Math.round(hx + 2), Math.round(hy - 3), 1, 3); A.box(c, L.coat[0], Math.round(hx), Math.round(hy - 1), 3, 1); }
      A.px(c, 'ink', Math.round(hx + 6), Math.round(hy + 0.6));
      if (o.shut) A.box(c, 'ink', Math.round(hx), Math.round(hy - 1), 2, 1); else A.px(c, 'ink', Math.round(hx + 1), Math.round(hy - 1));
      if (o.mouth) { A.box(c, 'blood', Math.round(hx + 3), Math.round(hy + 3), 3, 1); A.px(c, L.coat[0], Math.round(hx + 5), Math.round(hy + 4)); }
      if (!o.earUp || L.ears === 'prick') ear(c, hx, hy, o.earUp);
    } else {
      if (L.ears === 'prick' || L.ears === 'drop') { A.limb(c, hx - 2, hy - 2, hx - 2.5, hy - 5, 1.2, EAR, 0); A.limb(c, hx + 2, hy - 2, hx + 2.5, hy - 5, 1.2, EAR, 0); }
      else { A.blob(c, hx - 3.4, hy + 0.5, 1.6, 2.6, EAR, { bias: 0.1 }); A.blob(c, hx + 3.4, hy + 0.5, 1.6, 2.6, EAR, { bias: 0.1 }); } // heavy ears hang either side
      A.box(c, L.coat[0], Math.round(hx - 1), Math.round(hy + 1), 3, 1);
    }
  }
  // A curled coat: the shadow key in small rings over the haunch, the back and the chest.
  var CURLS = [[4, 12], [7, 11], [10, 12], [5, 15], [8, 14], [11, 15], [3, 14], [9, 10], [-1, -2], [1, 1], [-2, 2], [0, 4]];
  function curls(c, cx, cy) {
    for (var i = 0; i < CURLS.length; i++) {
      var x = i < 8 ? CURLS[i][0] : cx + CURLS[i][0], y = i < 8 ? CURLS[i][1] : cy + CURLS[i][1];
      A.px(c, L.coat[0], x, y); A.px(c, L.coat[2], x - 1, y - 1);
    }
  }
  function sitting(c, o) {
    var b = L.bulk;
    tail(c, o.t0, o.t1);                                                                     // the tail
    A.blob(c, 8, 13, 6.5 * b, 4.5 * b, DOG, { bias: -0.05 });
    A.blob(c, 6, 14.5, 4.5 * b, 3.5 * b, DOG, { bias: 0.05 });
    A.blob(c, o.cx || 16, o.cy || 11, 4.5 * b, 5.5 * b, DOG, { bias: 0.15 });
    A.box(c, L.chest, (o.cx || 16) + 1, (o.cy || 11) - 1, b > 1 ? 3 : 2, b > 1 ? 5 : 4);       // the pale chest
    if (L.curly) curls(c, o.cx || 16, o.cy || 11);
    var LEG = L.paleLegs ? L.muzzle : DOG;
    if (o.leg) A.limb(c, o.leg[0], o.leg[1], o.leg[2], o.leg[3], 1.4, LEG, 0.1);
    else A.limb(c, 17, 13, 17, 18, 1.4, LEG, 0.1);
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
      if (L.tail === 'feather') A.limb(c, 3, 16, 1, 13, 1.3, DOG, 0.1); else tail(c, [3, 16], [1, 13]);
      A.blob(c, 11, 16 + (f ? 0.5 : 0), 9.5 * L.bulk, (3.5 - (f ? 0.5 : 0)) * L.bulk, DOG, { bias: 0.05 });
      A.blob(c, 19, 15, 3.6, 2.8, DOG, { bias: 0.15 }); A.blob(c, 22, 16, 2, 1.4, L.muzzle, { bias: 0.25 });
      A.px(c, 'ink', 23, 15); A.box(c, 'ink', 19, 14, 2, 1);
      if (L.ears === 'prick') A.limb(c, 18, 13, 17, 10.5, 1.2, EAR, 0.1);
      else if (L.ears === 'pom' || L.ears === 'heavy') A.blob(c, 16.5, 15, 1.7, 2.6, EAR, { bias: 0.1 });
      else A.limb(c, 17, 13, 16, 16, 1.3, EAR, 0);
    }
  };
  // Paintings per breed (arts[look id]), each pose and frame on first use.
  var arts = {};
  function breed(lk) { return typeof lk === 'object' && lk ? lk : G.data.lookOf(G.data.looks.dogs, lk || (G.state.save && G.state.save.look ? G.state.save.look.dog : '')); }
  function img(pose, f, flip, B) {
    var art = arts[B.id] || (arts[B.id] = {}), key = pose + f + (flip ? '<' : '');
    if (art[key]) return art[key];
    if (flip) return (art[key] = G.gfx.bake.flipped(img(pose, f, false, B), 'x'));
    return (art[key] = G.gfx.bake.layer(W, H, function (c) { L = B; DOG = B.coat; EAR = B.ear; A.reset(); PAINTERS[pose](c, f); A.reset(); }));
  }
  // Phase 47: paints every pose and frame of a breed, both ways. Returns the ms it took.
  function prebake(lk) {
    var t0 = typeof performance !== 'undefined' ? performance.now() : 0, B = breed(lk);
    for (var i = 0; i < POSES.length; i++) for (var f = 0; f < (FRAMES[POSES[i]] || 1); f++) { img(POSES[i], f, false, B); img(POSES[i], f, true, B); }
    return typeof performance !== 'undefined' ? performance.now() - t0 : 0;
  }

  var T = { alert: 0.5, point: 0.7 }, HOLD = 0.6;

  // 10.3: px from the boat at which the dog notices its hidden spot, and how long it stares (s).
  var CUE = { stareR: 110, stare: 4 };

  function create() { return { pose: 'idle', t: 0, hold: 0, manual: 0, cue: '', petT: 0,
    voiceT: 0, since: 999, woofs: 0, woofT: 0, want: '', wantT: 0, bouts: 0, said: 0, last: '' }; }

  // Phase 42 (PLAN_TACKLE.md): the dog's voice. Now and then, by itself, a bout of 1-3 soft
  // woofs (VOICE.gap0..gap1 s apart); and as a reaction to something (request(): a fish
  // jumping near the boat, a big catch landed, the shop's bell; birds in Phase 49), but not
  // within VOICE.react s of the last bout. Never while a fish bites or is being hooked (the
  // scene says when: ctx.block), never while it sleeps or is being petted, and not at all
  // with settings.dogBark off (ctx.on false).
  // G.vrng only: the voice is presentation.
  var VOICE = { gap0: 180, gap1: 480, react: 90, delay: 0.4, woof0: 0.35, woof1: 0.55, retry: 45 };
  var REACT = { jump: 1, catch: 1, bell: 1, bird: 1, cue: 1 };

  // Asks for a bout: why (a REACT key). The cue's bark always answers; the rest only after a quiet spell.
  function request(d, why) {
    if (!REACT[why] || d.woofs > 0 || d.want) return false;
    if (why !== 'cue' && d.since < VOICE.react) return false;
    d.want = why; d.wantT = VOICE.delay;
    return true;
  }

  function startBout(d, n, why, rng, pose) {
    d.woofs = n; d.woofT = 0; d.since = 0; d.bouts++; d.last = why;
    if (pose && !(d.manual > 0 && (d.pose === 'stare' || d.pose === 'pet'))) setPose(d, 'bark', n * VOICE.woof1 + 0.4);
  }

  // Steps the voice; returns how many woofs to play this step (0 or 1).
  // ctx: {on: the setting, block: a bite or the hook-set under way}.
  function voice(d, dt, ctx, rng) {
    d.since += dt;
    if (d.voiceT <= 0) d.voiceT = VOICE.gap0 + (VOICE.gap1 - VOICE.gap0) * rng.next();
    var quiet = !ctx.on || ctx.block || d.pose === 'sleep' || d.pose === 'pet';
    if (d.want) {
      d.wantT -= dt;
      if (quiet && d.want !== 'cue') d.want = '';
      else if (d.wantT <= 0) {
        if (ctx.on && !ctx.block) startBout(d, d.want === 'cue' ? 2 : 1 + Math.floor(rng.next() * 2), d.want, rng, d.want !== 'cue');
        d.want = '';
      }
    }
    if (d.woofs === 0) {
      d.voiceT -= dt;
      if (d.voiceT <= 0) {
        if (quiet) d.voiceT = VOICE.retry;                  // not now: try again in a while
        else if (d.since < VOICE.react) d.voiceT = VOICE.react - d.since; // a bout just now: not on its heels
        else { startBout(d, 1 + Math.floor(rng.next() * 3), 'idle', rng, true); d.voiceT = 0; }
      }
      return 0;
    }
    if (ctx.block || !ctx.on) { d.woofs = 0; return 0; }  // a bite cuts a bout short
    d.woofT -= dt;
    if (d.woofT > 0) return 0;
    d.woofs--; d.said++;
    d.woofT = VOICE.woof0 + (VOICE.woof1 - VOICE.woof0) * rng.next();
    return 1;
  }

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

  // 10.3: the stare (once per location, saved in flags.dogStare). Returns the spot id that
  // set off a cue this step, or ''. Phase 68: the bark at a legendary spot went with the
  // legendary fish; the dog still barks now and then on its own (Phase 42).
  function cues(d, save, loc, boatX, data) {
    var spots = loc.spots || [], i, s;
    for (i = 0; i < spots.length; i++) {
      s = spots[i];
      var dist = Math.abs(boatX - s.x);
      if (s.kind === 'hidden' && !save.flags.dogStare[loc.id] && dist <= CUE.stareR) {
        save.flags.dogStare[loc.id] = true;
        setPose(d, 'stare', CUE.stare); d.cue = s.id;
        return s.id;
      }
    }
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

  // Phase 24: where each sitting pose's head is (view px in the painting), for the ears that
  // stream back in the wind of a moving boat; the sleeping dog keeps its ears down.
  var HEAD = { idle: [18, 5], alert: [18, 4], point: [20, 8], look_down: [18, 9], stare: [17, 5], bark: [18, 5], pet: [18, 4] };

  // wind 0..1 (optional): how fast the boat moves; above 0.3 an ear flutters back (a husky's
  // stands). lk (optional, Phase 47): a breed's id or record instead of save.look's.
  function draw(ctx, d, x, y, flip, wind, lk) {
    var B = breed(lk), n = FRAMES[d.pose] || 1, f = Math.floor(d.t * (d.pose === 'pet' ? 7 : (d.pose === 'sleep' ? 0.7 : 5))) % n;
    ctx.drawImage(img(d.pose, f, flip, B), x, y, W / HI, H / HI);
    var h = HEAD[d.pose];
    if (!h || !(wind > 0.3) || B.ears === 'prick') return;
    var P = G.gfx.sprites.PALETTE, len = 2 + Math.round(2 * Math.min(1, wind)), flap = Math.round(Math.sin(d.t * 22)), q = 1 / HI;
    for (var i = 0; i < len; i++) {
      var ex = h[0] - 4 - i, ey = h[1] - 1 + (i > 0 ? flap : 0);
      ctx.fillStyle = P[i === len - 1 ? B.ear[2] : B.ear[1]];
      ctx.fillRect(x + (flip ? W - 1 - ex : ex) * q, y + ey * q, q, q);
    }
  }

  // Phase 47: the woof's playback rate for the breed on the boat.
  function barkPitch(lk) { return breed(lk).bark; }

  return { POSES: POSES, FRAMES: FRAMES, prebake: prebake, barkPitch: barkPitch, breed: breed, T: T, CUE: CUE, PET: PET, VOICE: VOICE, request: request, voice: voice, create: create, setPose: setPose, pet: pet, want: want, cues: cues, step: step, draw: draw };
})();
