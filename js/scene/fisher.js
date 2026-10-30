var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// The fisher (Phase 33, PLAN_ROD.md): a posable figure and the idle director.
// The body, the head (three tilts: ahead, down, back) and two arms are painted separately in
// the view's pixels (HI per world px), never rotated (8.3 #84). Each arm runs from its shoulder
// through an elbow found by two-bone IK to the hand, painted with paint.limb for that hand's
// place and cached per half view pixel, so no arm is painted twice. A pose is where the hands
// are; they ease between poses as springs, and the rod's base is the near hand, or the holder
// on the gunwale. The director plays acts (short scripts of poses) when nothing happens:
// between casts, or waiting for a bite with no fish about; any key, any change of state ends an
// act at once and the hands go back to the rod. It never blocks input: the scene reads keys as
// before, on the same step.
// Local frame: world px, x forward from the boat's centre along its facing, y down from the
// seat line (the waterline plus the boat's heave). Image px: ix = (lx + 6) × HI, iy = (ly + 15) × HI.
G.scene = G.scene || {};
G.scene.fisher = (function () {
  var A = G.gfx.paint, HI = 2;
  var COAT = ['ink', 'coat_dark', 'coat', 'coat_hi'], FAR = ['ink', 'ink', 'coat_dark', 'coat'];
  var SKIN = ['flesh_dark', 'skin_shadow', 'flesh', 'skin_hi'], SKIN_FAR = ['flesh_dark', 'flesh_dark', 'skin_shadow', 'flesh'];
  var CAP = ['rust_dark', 'cap', 'rust_hi'], STONES = ['ink', 'stone_dark', 'stone', 'stone_hi', 'stone_lit'];
  var SH_N = [12, 15], SH_F = [8, 15];        // shoulders, image px
  var UPPER = 5, FORE = 4.6;                  // the arm's two bones, image px
  var REST = [18.5, 18, 16, 19, 15, 19];      // the rod pose keeps Phase 18's painted arm: hand, upper arm's end, forearm's start
  var HOLDER = [3.5, -4.5], HOLDER_ANGLE = 38; // the rod holder on the gunwale before his knees, local; the rod's angle in it
  var K = { ease: 12, fast: 32, grab: 0.8 };  // the hands' springs (rad/s): moving, and going back to the rod; px to take the rod
  // Phase 41 (PLAN_TACKLE.md): under way the rod lies in two clips along the gunwale, its butt
  // by his hip and its tip past the bow, and his near hand is on the tiller's grip; the far
  // hand pulls the motor's cord on a pull-start. CLIPS: the butt's place, local; STOW_ANGLE:
  // the rod's angle there; TILLER: the grip; PIVOT: where the tiller and the cord leave the
  // motor's head (boat.js draws the motor at local x -21..-11, its head's front at -15); CORD: the far hand reaching
  // back for the cord's handle and where the pull ends. HELM: each stage's least time (s).
  var CLIPS = [-3.2, -5.1], STOW_ANGLE = 2, TILLER = [-4.3, -6], PIVOT = [-15, -5.4];
  var CORD = { reach: [-5.6, -5.4], pull: [-1, -9.6] }, HELM = { stow: 0.3, reach: 0.25, free: 0.25 };

  // Poses: the near hand (n) and the far hand (f), local world px.
  var POSES = {
    rod:    { n: [3.25, -6], f: [2.6, -6.4] },   // both hands on the rod
    knees:  { n: [2.2, -4.2], f: [1.2, -4.4] },  // resting on his knees
    holder: { n: [3.5, -4.5], f: [1.2, -4.4] },  // the near hand at the holder
    cup:    { n: [3.2, -7.2], f: [1.2, -4.4] },  // holding a cup before him
    mouth:  { n: [1.6, -9.4], f: [1.2, -4.4] },  // the cup at his mouth
    // Phase 34: the lure before his face, taken off the line hanging from the upright rod.
    lureTake: { n: [1.6, -10], f: [1.2, -4.4] },
    lureLook: { n: [3.0, -9.2], f: [2.6, -9.0] },
    baitA:  { n: [3.2, -9.3], f: [2.2, -9.6] },
    baitB:  { n: [3.0, -9.0], f: [3.0, -8.6] },
    tug:    { n: [4.8, -7.8], f: [2.6, -9.0] },   // pulled down and out a little, so the line bends the tip
    // Phase 35: into the cooler behind him; to the can's place on the gunwale by his hip.
    cooler: { n: [-4.2, -5.4], f: [1.2, -4.4] },
    canSpot: { n: [-2.2, -5.0], f: [1.2, -4.4] },
    // Phase 41: the near hand at the clips (laying the rod down, taking it up) and on the tiller.
    clips:  { n: [-3.2, -5.1], f: [1.2, -4.4] },
    tiller: { n: [-4.3, -6], f: [1.2, -4.4] }
  };
  var COOLER = [-5, -4], CAN = [-2.2, -4.2]; // the cooler (its middle, on the floor behind him) and the can's place, local

  // Acts: steps of {d: s, pose, rod: 'hand' | 'holder', head: 0 ahead, 1 down, 2 back, item, angle}.
  // The near hand carries the rod to the holder before it lets go, and comes back for it.
  // Phase 34: line (px of line the lure hangs on), reel (the handle's turns a second), bail
  // (open: the line runs out), held (the lure in the near hand), tug (he tugs the knot: the
  // line pulls the tip), cue (a sound at the step's start). An act may set its holder angle.
  // Phase 35: gun (true: the can is set on the gunwale; false: taken from it), sip (a drink
  // counted), bin (the empty goes back in the cooler). modes: the director's modes it plays in.
  var PLACE = [{ d: 0.5, pose: 'holder', rod: 'hand', angle: HOLDER_ANGLE }, { d: 0.35, pose: 'knees', rod: 'holder' }];
  var TAKE = [{ d: 0.45, pose: 'holder', rod: 'holder' }, { d: 0.4, pose: 'rod', rod: 'hand' }];
  var ACTS = {
    // P2-2's thermos, between casts.
    thermos: { modes: ['casts', 'wait'], steps: PLACE.concat([
      { d: 0.5, pose: 'cup', rod: 'holder', item: 'cup' },
      { d: 1.8, pose: 'mouth', rod: 'holder', item: 'cup', head: 2 },
      { d: 1.2, pose: 'cup', rod: 'holder', item: 'cup' },
      { d: 1.5, pose: 'mouth', rod: 'holder', item: 'cup', head: 2 },
      { d: 0.6, pose: 'knees', rod: 'holder' }
    ], TAKE) },
    // Waiting for a bite: the rod in the holder, his hands on his knees.
    rest: { modes: ['wait'], steps: PLACE.concat([{ d: 7, pose: 'knees', rod: 'holder' }], TAKE) },
    // Phase 34: preparing the lure. The rod stands upright in the holder; line runs out until
    // the lure hangs before his face; he takes it, looks it over, works fresh bait onto the hook,
    // tugs the knot, lets it swing, takes the rod back and reels the lure up under the tip.
    lure: { modes: ['casts'], holder: 96, steps: [
      { d: 0.5, pose: 'holder', rod: 'hand', angle: 96 },
      { d: 0.3, pose: 'knees', rod: 'holder' },
      { d: 1.3, pose: 'knees', rod: 'holder', line: 16.4, bail: true },
      { d: 0.5, pose: 'lureTake', rod: 'holder', line: 16.4 },
      { d: 1.4, pose: 'lureLook', rod: 'holder', held: true, head: 1 },
      { d: 0.3, pose: 'baitA', rod: 'holder', held: true, head: 1, cue: 'bait' },
      { d: 0.3, pose: 'baitB', rod: 'holder', held: true, head: 1 },
      { d: 0.3, pose: 'baitA', rod: 'holder', held: true, head: 1, cue: 'bait' },
      { d: 0.3, pose: 'baitB', rod: 'holder', held: true, head: 1, cue: 'hooked' },
      { d: 0.25, pose: 'tug', rod: 'holder', held: true, head: 1, tug: true },
      { d: 0.4, pose: 'lureLook', rod: 'holder', held: true },
      { d: 0.5, pose: 'knees', rod: 'holder' },
      { d: 0.45, pose: 'holder', rod: 'holder' },
      { d: 0.4, pose: 'rod', rod: 'hand' },
      { d: 1.6, pose: 'rod', rod: 'hand', line: 3, reel: 2.2 }
    ] },
    // Phase 35: a beer at dusk and at night, one can at a time. He takes it from the cooler,
    // cracks it, drinks and sets it on the gunwale by his hip; later sips come from it; after
    // three the empty goes back in the cooler, and a while passes before the next.
    beer: { modes: ['casts', 'wait'], steps: PLACE.concat([
      { d: 0.6, pose: 'cooler', rod: 'holder' },
      { d: 0.5, pose: 'cup', rod: 'holder', item: 'can' },
      { d: 0.5, pose: 'cup', rod: 'holder', item: 'can', cue: 'crack' },
      { d: 1.6, pose: 'mouth', rod: 'holder', item: 'can', head: 2, sip: true },
      { d: 0.6, pose: 'cup', rod: 'holder', item: 'can' },
      { d: 0.5, pose: 'canSpot', rod: 'holder', item: 'can' },
      { d: 0.4, pose: 'knees', rod: 'holder', gun: true, cue: 'candown' },
      { d: 2.5, pose: 'knees', rod: 'holder' }
    ], TAKE) },
    sip: { modes: ['casts', 'wait'], steps: PLACE.concat([
      { d: 0.5, pose: 'canSpot', rod: 'holder' },
      { d: 0.4, pose: 'cup', rod: 'holder', item: 'can', gun: false },
      { d: 1.5, pose: 'mouth', rod: 'holder', item: 'can', head: 2, sip: true },
      { d: 0.5, pose: 'cup', rod: 'holder', item: 'can' },
      { d: 0.5, pose: 'canSpot', rod: 'holder', item: 'can' },
      { d: 0.4, pose: 'knees', rod: 'holder', gun: true, cue: 'candown' },
      { d: 2, pose: 'knees', rod: 'holder' }
    ], TAKE) },
    empty: { modes: ['casts', 'wait'], steps: PLACE.concat([
      { d: 0.5, pose: 'canSpot', rod: 'holder' },
      { d: 0.4, pose: 'cup', rod: 'holder', item: 'can', gun: false },
      { d: 1.3, pose: 'mouth', rod: 'holder', item: 'can', head: 2, sip: true },
      { d: 0.6, pose: 'cooler', rod: 'holder', item: 'can' },
      { d: 0.4, pose: 'knees', rod: 'holder', bin: true }
    ], TAKE) }
  };
  // Phase 45: after the setup panel (PLAN_TACKLE.md 2.5). swap: the chosen rod lies in the
  // clips and he lifts it to his hands; tie: a short Phase 34 lure act, the rod upright in the
  // holder while he ties the new lure on (or baits the hook) and reels it up; swaptie: both.
  // modes: only between casts; a cast cuts them short like every act.
  var SWAP = [
    { d: 0.4, pose: 'clips', rod: 'clips', angle: STOW_ANGLE, line: 1 },
    { d: 0.2, pose: 'clips', rod: 'hand', angle: STOW_ANGLE, line: 1, cue: 'clip' },
    { d: 0.45, pose: 'rod', rod: 'hand' }
  ];
  var TIE = [
    { d: 0.4, pose: 'holder', rod: 'hand', angle: 96 },
    { d: 0.2, pose: 'knees', rod: 'holder' },
    { d: 0.8, pose: 'knees', rod: 'holder', line: 16.4, bail: true },
    { d: 0.4, pose: 'lureTake', rod: 'holder', line: 16.4 },
    { d: 0.6, pose: 'lureLook', rod: 'holder', held: true, head: 1 },
    { d: 0.25, pose: 'baitA', rod: 'holder', held: true, head: 1, cue: 'bait' },
    { d: 0.25, pose: 'baitB', rod: 'holder', held: true, head: 1, cue: 'hooked' },
    { d: 0.2, pose: 'tug', rod: 'holder', held: true, head: 1, tug: true },
    { d: 0.3, pose: 'knees', rod: 'holder' },
    { d: 0.35, pose: 'holder', rod: 'holder' },
    { d: 0.35, pose: 'rod', rod: 'hand' },
    { d: 1.0, pose: 'rod', rod: 'hand', line: 3, reel: 2.2 }
  ];
  ACTS.swap = { modes: ['casts'], steps: SWAP };
  ACTS.tie = { modes: ['casts'], holder: 96, steps: TIE };
  ACTS.swaptie = { modes: ['casts'], holder: 96, steps: SWAP.concat(TIE) };
  var BEER_SIPS = 3, BEER_REST = 90; // drinks from one can; s before the next can
  var WAIT = { casts: [6, 6], wait: [8, 7] }; // s of nothing happening before an act: least, plus up to

  var cur = null; // the fisher state the boat draws (one fisher)

  function create() {
    var p = POSES.rod;
    return cur = { nx: p.n[0], ny: p.n[1], nvx: 0, nvy: 0, fx: p.f[0], fy: p.f[1], fvx: 0, fvy: 0,
      pose: 'rod', head: 0, item: '', rodAt: 'hand', angle: null, holderA: HOLDER_ANGLE,
      line: null, reel: 0, bail: false, held: false, tug: false, cue: '',
      can: false, sips: 0, beerRest: 0,
      act: '', step: 0, t: 0, idleT: 0, wait: 0, ret: false, fast: false, acts: 0,
      helm: 0, helmT: 0, cord: -1, steer: 0, stows: 0 };
  }

  function spring(x, v, target, w, dt) {
    var nv = (v + dt * w * w * (target - x)) / (1 + 2 * w * dt + w * w * dt * dt);
    return nv;
  }

  function setStep(fs, st) {
    fs.pose = st.pose; fs.rodAt = st.rod; fs.head = st.head || 0; fs.item = st.item || '';
    fs.angle = st.rod === 'holder' ? fs.holderA : (st.angle === undefined ? null : st.angle);
    fs.line = st.line === undefined ? null : st.line; fs.reel = st.reel || 0; fs.bail = !!st.bail;
    fs.held = !!st.held; fs.tug = !!st.tug; fs.cue = st.cue || '';
    if (st.gun !== undefined) fs.can = st.gun;
    if (st.sip) fs.sips++;
    if (st.bin) { fs.sips = 0; fs.beerRest = BEER_REST; }
  }
  function clearStep(fs) { fs.line = null; fs.reel = 0; fs.bail = false; fs.held = false; fs.tug = false; fs.cue = ''; }

  function start(fs, name) {
    if (!ACTS[name]) return false;
    fs.act = name; fs.step = 0; fs.t = 0; fs.ret = false; fs.fast = false; fs.acts++; fs.idleT = 0;
    if (name === 'beer') fs.sips = 0;
    fs.holderA = ACTS[name].holder || HOLDER_ANGLE;
    setStep(fs, ACTS[name].steps[0]);
    return true;
  }

  // Ends the act at once: the item goes (a can is set down on the gunwale), the head comes up,
  // the near hand fetches the rod from the holder if it is there, quickly, and takes it back.
  function abort(fs) {
    if (!fs.act && !fs.ret) return;
    if (fs.item === 'can') { fs.can = true; fs.cue = 'candown'; }
    fs.act = ''; fs.item = ''; fs.head = 0; fs.fast = true; fs.ret = true;
    var cue = fs.cue; clearStep(fs); fs.cue = cue;
    if (fs.rodAt === 'holder') { fs.pose = 'holder'; fs.angle = fs.holderA; }
    else { fs.pose = 'rod'; fs.angle = null; }
  }

  // What he drinks (Phase 35): the thermos in the grey hours; at dusk and night a beer, a sip
  // from the can on the gunwale, or the empty back in the cooler; the thermos while the last
  // can is a while gone.
  function drink(fs, night) {
    if (!night) return 'thermos';
    if (fs.can) return fs.sips >= BEER_SIPS ? 'empty' : 'sip';
    return fs.beerRest > 0 ? 'thermos' : 'beer';
  }

  // The act for a mode: preparing the lure or a drink between casts; a rest or a drink while waiting.
  function choose(fs, mode, night, rng) {
    var d = drink(fs, night), other = mode === 'casts' ? 'lure' : 'rest';
    return rng.next() < (fs.can && night ? 0.65 : 0.5) ? d : other;
  }

  var quietCtx = { mode: null, input: false, night: false, helm: false, cord: -1, steer: 0 };
  function noActs(ctx) {
    quietCtx.input = ctx.input; quietCtx.night = ctx.night; quietCtx.helm = ctx.helm; quietCtx.cord = ctx.cord; quietCtx.steer = ctx.steer;
    return quietCtx;
  }

  // The tiller's grip, local: swung a little by steer (the turn and the throttle seen from the
  // side, foreshortened), and in his hand once he holds it.
  var gp = [0, 0];
  function grip(fs, out) {
    out[0] = TILLER[0] + 0.5 * fs.steer; out[1] = TILLER[1] - 0.3 * Math.abs(fs.steer);
    return out;
  }
  function holding(fs) { return fs.helm === 3 || ((fs.helm === 2 || fs.helm === 4) && fs.pose === 'tiller' && near(fs, TILLER)); }

  function near(fs, pt) { return Math.abs(fs.nx - pt[0]) + Math.abs(fs.ny - pt[1]) < K.grab; }

  // Phase 41: the helm. Stages: 1 the rod carried to the clips, 2 the hand reaching back to the
  // tiller, 3 steering; when the boat has stopped, 4 the hand back at the clips, 5 the rod
  // carried up to his hands. Each stage waits for the hand to arrive and its least time; a key
  // pressed while he takes the rod up (a cast) hurries the hands, so the cast is never held.
  // The rod lies in the clips from stage 1's end to stage 4's; the lure is reeled up snug under
  // the tip-top there (line 1) so it does not swing about under way.
  function helmStep(fs, dt, ctx) {
    fs.steer += ((ctx.helm ? ctx.steer || 0 : 0) - fs.steer) * Math.min(1, 6 * dt);
    if (!ctx.helm && !fs.helm) return;
    fs.helmT += dt;
    if (ctx.helm) {
      if (fs.act || fs.ret) { fs.act = ''; fs.ret = false; fs.item === 'can' && (fs.can = true); fs.item = ''; clearStep(fs); }
      if (!fs.helm || fs.helm === 5) { fs.helm = 1; fs.helmT = 0; fs.stows++; fs.fast = false; }
      else if (fs.helm === 4) { fs.helm = 2; fs.helmT = 0; fs.fast = false; }
    } else if (fs.helm === 1) { fs.helm = 5; fs.helmT = 0; }       // stopped before the rod was down: bring it back
    else if (fs.helm === 2 || fs.helm === 3) { fs.helm = 4; fs.helmT = 0; }
    if (!ctx.helm && ctx.input && fs.helm >= 4) fs.fast = true;
    fs.head = 0;
    switch (fs.helm) {
      case 1:
        if (fs.rodAt === 'holder') { // resting in the holder: the hand fetches it first
          fs.pose = 'holder'; fs.angle = fs.holderA; fs.line = 1;
          if (near(fs, HOLDER)) { fs.rodAt = 'hand'; fs.helmT = 0; }
          break;
        }
        fs.pose = 'clips'; fs.rodAt = 'hand'; fs.angle = STOW_ANGLE; fs.line = 1;
        if (near(fs, CLIPS) && fs.helmT >= HELM.stow) { fs.rodAt = 'clips'; fs.helm = 2; fs.helmT = 0; fs.cue = 'clip'; }
        break;
      case 2:
        fs.pose = 'tiller'; fs.rodAt = 'clips'; fs.angle = STOW_ANGLE; fs.line = 1;
        if (near(fs, grip(fs, gp)) && fs.helmT >= HELM.reach) { fs.helm = 3; fs.helmT = 0; }
        break;
      case 3:
        fs.pose = 'tiller'; fs.rodAt = 'clips'; fs.angle = STOW_ANGLE; fs.line = 1;
        break;
      case 4:
        fs.pose = 'clips'; fs.rodAt = 'clips'; fs.angle = STOW_ANGLE; fs.line = 1;
        if (near(fs, CLIPS) && (fs.helmT >= HELM.free || fs.fast)) { fs.rodAt = 'hand'; fs.helm = 5; fs.helmT = 0; fs.cue = 'clip'; }
        break;
      case 5:
        fs.pose = 'rod'; fs.rodAt = 'hand'; fs.angle = null; fs.line = null;
        if (Math.abs(fs.nx - POSES.rod.n[0]) + Math.abs(fs.ny - POSES.rod.n[1]) < 0.1) { fs.helm = 0; fs.helmT = 0; fs.fast = false; }
        break;
    }
  }

  // ctx: {mode: 'casts' | 'wait' | null (nothing to do but fish), input: a key held or pressed,
  // night: dusk or night (Phase 35); Phase 41: helm (the boat under way or starting), cord
  // (0..1 through a pull-start, or -1), steer (-1..1: the tiller pushed by the turn and the throttle)}.
  function step(fs, dt, ctx, rng) {
    if (fs.beerRest > 0) fs.beerRest -= dt;
    if (fs.helm || ctx.helm) ctx = noActs(ctx);
    if (fs.act) {
      var a = ACTS[fs.act];
      if (ctx.input || a.modes.indexOf(ctx.mode) < 0) abort(fs);
      else {
        fs.t += dt;
        while (fs.act && fs.t >= a.steps[fs.step].d) {
          fs.t -= a.steps[fs.step].d;
          if (++fs.step >= a.steps.length) { fs.act = ''; fs.pose = 'rod'; fs.rodAt = 'hand'; fs.angle = null; fs.item = ''; fs.head = 0; clearStep(fs); }
          else setStep(fs, a.steps[fs.step]);
        }
      }
    }
    if (!fs.act) {
      if (ctx.mode && !ctx.input && !fs.ret) {
        if (fs.wait <= 0) fs.wait = WAIT[ctx.mode][0] + WAIT[ctx.mode][1] * rng.next();
        fs.idleT += dt;
        if (fs.idleT >= fs.wait) { start(fs, choose(fs, ctx.mode, ctx.night, rng)); fs.idleT = 0; fs.wait = 0; }
      } else { fs.idleT = 0; fs.wait = 0; }
    }
    helmStep(fs, dt, ctx);
    // The hands. Phase 41: on a pull-start the far hand reaches back for the cord, then pulls.
    var p = POSES[fs.pose], w = fs.fast ? K.fast : K.ease, ftx = p.f[0], fty = p.f[1], fw = w, ntx = p.n[0], nty = p.n[1];
    if (fs.pose === 'tiller') { grip(fs, gp); ntx = gp[0]; nty = gp[1]; }
    fs.cord = fs.helm && ctx.cord >= 0 ? ctx.cord : -1;
    if (fs.cord >= 0) {
      var cp = fs.cord < 0.35 ? CORD.reach : CORD.pull;
      ftx = cp[0]; fty = cp[1]; fw = K.fast;
    }
    fs.nvx = spring(fs.nx, fs.nvx, ntx, w, dt); fs.nx += dt * fs.nvx;
    fs.nvy = spring(fs.ny, fs.nvy, nty, w, dt); fs.ny += dt * fs.nvy;
    fs.fvx = spring(fs.fx, fs.fvx, ftx, fw, dt); fs.fx += dt * fs.fvx;
    fs.fvy = spring(fs.fy, fs.fvy, fty, fw, dt); fs.fy += dt * fs.fvy;
    // Going back: the hand reaches the holder, takes the rod, and brings it to its place.
    if (fs.ret) {
      if (fs.rodAt === 'holder' && Math.abs(fs.nx - HOLDER[0]) + Math.abs(fs.ny - HOLDER[1]) < K.grab) { fs.rodAt = 'hand'; fs.pose = 'rod'; fs.angle = null; }
      else if (fs.rodAt === 'hand') {
        var r = POSES.rod.n;
        fs.angle = null;
        if (Math.abs(fs.nx - r[0]) + Math.abs(fs.ny - r[1]) < 0.1) { fs.ret = false; fs.fast = false; }
      }
    }
  }

  // The rod's base, local: the near hand, or the holder.
  function rodLocal(out) {
    if (!cur) { out[0] = 3; out[1] = -6; return out; }
    if (cur.rodAt === 'holder') { out[0] = HOLDER[0]; out[1] = HOLDER[1]; }
    else if (cur.rodAt === 'clips') { out[0] = CLIPS[0]; out[1] = CLIPS[1]; }
    else { out[0] = cur.nx; out[1] = cur.ny; }
    return out;
  }

  // ---- Drawing --------------------------------------------------------------------------

  function paintBody(c) {
    A.blob(c, 9, 19, 8, 8, COAT, { bias: 0.05 });
    A.box(c, 'coat_dark', 3, 20, 2, 6);
  }
  // The collar and the shoulder's light, over the near arm's shoulder (as painted before 33).
  function paintCollar(c) {
    A.box(c, 'coat_hi', 5, 14, 6, 1);
    A.box(c, 'coat_dark', 6, 13, 8, 2);
  }

  // tilt 0 ahead, 1 down (the face lower, the brim over it), 2 back (chin up, the brim raised).
  function paintHead(c, tilt) {
    var dy = tilt === 1 ? 1 : (tilt === 2 ? -1 : 0);
    A.blob(c, 10, 9, 4.5, 4.8, SKIN, { bias: 0.1 });
    if (tilt === 2) { A.box(c, 'skin_shadow', 11, 12, 3, 1); A.px(c, 'skin_hi', 14, 10); }
    else { A.box(c, 'skin_shadow', 10, 12 + Math.max(0, dy), 4, 1); A.px(c, 'skin_shadow', 13, 11 + dy); }
    A.px(c, 'ink', 12, 8 + dy); A.px(c, 'skin_hi', 13, 9 + dy); A.px(c, 'flesh_dark', 7, 9);
    A.blob(c, 9, 4.5, 5, 3.5, CAP, { bias: 0.1 }); A.box(c, 'rust_dark', 4, 6, 10, 1);
    A.box(c, 'cap', 12, 5 + dy, 5, 2); A.box(c, 'rust_dark', 12, 6 + dy, 5, 1);       // the brim
    A.box(c, 'stone_dark', 5, 7, 2, 4);                                              // hair at the back
  }

  // An arm from shoulder (sx, sy) to hand (hx, hy), image px, in a 40×40 canvas offset by 10.
  function paintArm(c, sx, sy, hx, hy, far) {
    var dx = hx - sx, dy = hy - sy, d = Math.sqrt(dx * dx + dy * dy) || 0.01;
    var dc = Math.max(Math.abs(UPPER - FORE) + 0.5, Math.min(UPPER + FORE - 0.05, d));
    var a = Math.atan2(dy, dx), b = Math.acos(Math.max(-1, Math.min(1, (UPPER * UPPER + dc * dc - FORE * FORE) / (2 * UPPER * dc))));
    var e1x = sx + Math.cos(a + b) * UPPER, e1y = sy + Math.sin(a + b) * UPPER;
    var e2x = sx + Math.cos(a - b) * UPPER, e2y = sy + Math.sin(a - b) * UPPER;
    var ex = e1y > e2y ? e1x : e2x, ey = e1y > e2y ? e1y : e2y;                    // the elbow hangs low
    var o = 10, keys = far ? FAR : COAT, fx0 = ex, fy0 = ey;
    if (!far && hx === REST[0] && hy === REST[1]) { ex = REST[2]; ey = REST[3]; fx0 = REST[4]; fy0 = REST[5]; }
    A.limb(c, sx + o, sy + o, ex + o, ey + o, 2.6, keys, 0.1);
    A.limb(c, fx0 + o, fy0 + o, hx + o, hy + o, 2.2, keys, 0.1);
    A.blob(c, hx + o, hy + o, 1.8, 1.6, far ? SKIN_FAR : SKIN, { bias: 0.1 });
  }

  var art = {};
  function img(key, flip, paint) {
    var k = key + (flip ? '<' : '');
    if (art[k]) return art[k];
    if (flip) return (art[k] = G.gfx.bake.flipped(img(key, false, paint), 'x'));
    return (art[k] = paint());
  }
  function layer(w, h, fn) { return G.gfx.bake.layer(w, h, function (c) { A.reset(); fn(c); A.reset(); }); }
  function bodyImg(flip) { return img('body', flip, function () { return layer(20, 26, paintBody); }); }
  function collarImg(flip) { return img('collar', flip, function () { return layer(20, 26, paintCollar); }); }
  function headImg(tilt, flip) { return img('head' + tilt, flip, function () { return layer(20, 26, function (c) { paintHead(c, tilt); }); }); }
  function armImg(far, ix, iy, flip) {
    var s = far ? SH_F : SH_N;
    return img((far ? 'af' : 'an') + ix + ',' + iy, flip, function () { return layer(40, 40, function (c) { paintArm(c, s[0], s[1], ix, iy, far); }); });
  }
  // Items held in the near hand, painted small: the thermos cup.
  // Each is drawn centred on the hand, standing on it.
  var ITEMS = {
    cup: { w: 3, h: 4, paint: function (c) { A.slab(c, 0, 0, 3, 4, STONES); } },
    can: { w: 2, h: 4, paint: paintCan }                                            // Phase 35
  };
  // A beer can, 2×4 view px: a lit rim, a rust body with a pale band.
  function paintCan(c) {
    A.box(c, 'stone_lit', 0, 0, 2, 1); A.box(c, 'rust_hi', 0, 1, 1, 3); A.box(c, 'rust', 1, 1, 1, 3); A.box(c, 'cream', 0, 2, 2, 1);
  }
  // The cooler, 12×9 view px: a pale lid with a handle, a teal body lit on its left; its foot is
  // hidden by the hull.
  function paintCooler(c) {
    A.box(c, 'ink', 0, 1, 12, 8);
    A.box(c, 'teal_hi', 1, 3, 10, 6); A.box(c, 'teal', 4, 3, 7, 6); A.box(c, 'teal_dark', 10, 3, 1, 6);
    A.box(c, 'paper', 1, 1, 10, 2); A.box(c, 'paper_dark', 1, 2, 10, 1);
    A.box(c, 'ink', 4, 0, 4, 1); A.px(c, 'stone', 4, 1); A.px(c, 'stone', 7, 1);
  }
  function itemImg(name, flip) { var it = ITEMS[name]; return img('item' + name, flip, function () { return layer(it.w, it.h, it.paint); }); }
  function coolerImg(flip) { return img('cooler', flip, function () { return layer(12, 9, paintCooler); }); }

  // Phase 35: the cooler on the floor behind him, drawn before him and the hull (the gunwale
  // hides its foot); the can on the gunwale, drawn after the hull.
  function drawCooler(ctx, sx, y, f, dy) {
    var cv = coolerImg(f < 0), x = sx + f * COOLER[0] - cv.width / HI / 2;
    put(ctx, cv, Math.round(x * HI) / HI, Math.round((y + COOLER[1] - 3 + dy) * HI) / HI);
  }
  function drawCan(ctx, fs, sx, y, f, lean, dy) {
    if (!fs.can) return;
    var cv = itemImg('can', f < 0), x = sx + f * CAN[0] - f * lean - cv.width / HI / 2;
    put(ctx, cv, Math.round(x * HI) / HI, Math.round((y + CAN[1] - cv.height / HI + dy) * HI) / HI);
  }

  function put(ctx, cv, x, y) { ctx.drawImage(cv, x, y, cv.width / HI, cv.height / HI); }

  // Draws the fisher for a boat at screen x sx, seat line y (with heave), facing f, leaning
  // back by lean, at shear dy (the hull's pitch at his seat). t: the boat's time, for the steam.
  function draw(ctx, fs, sx, y, f, lean, dy, t, dyP) {
    var flip = f < 0, L = sx - (flip ? 4 : 6) - f * lean, top = y - 15 + dy, P = G.gfx.sprites.PALETTE;
    var nix = Math.round((fs.nx + 6) * HI * 2) / 2, niy = Math.round((fs.ny + 15) * HI * 2) / 2; // half view px: the rod hand sits at 18.5
    var fix = Math.round((fs.fx + 6) * HI * 2) / 2, fiy = Math.round((fs.fy + 15) * HI * 2) / 2;
    var up = fs.ny < -8.5, near = armImg(false, nix, niy, flip);                  // a hand at his mouth goes over his face
    drawCord(ctx, fs, sx, y, f, lean, dy, dyP || 0);
    put(ctx, armImg(true, fix, fiy, flip), L - 5, top - 5);
    put(ctx, bodyImg(flip), L, top);
    if (!up) put(ctx, near, L - 5, top - 5);
    put(ctx, collarImg(flip), L, top);
    put(ctx, headImg(fs.head, flip), L, top);
    if (up) put(ctx, near, L - 5, top - 5);
    if (fs.item) {
      var it = ITEMS[fs.item], hx = sx + f * fs.nx - f * lean, hy = y + fs.ny + dy;
      put(ctx, itemImg(fs.item, flip), Math.round((hx - it.w / HI / 2) * HI) / HI, Math.round((hy - it.h / HI + 0.5) * HI) / HI);
      if (fs.item === 'cup') { // steam from the cup, rising and thinning
        ctx.fillStyle = P.fog_light;
        for (var k = 0; k < 4; k++) {
          var u = (t * 0.8 + k / 4) % 1;
          ctx.globalAlpha = 0.5 * (1 - u);
          ctx.fillRect(Math.round((hx + Math.sin(u * 6 + k)) * HI) / HI, Math.round((hy - 3 - u * 6) * HI) / HI, 1 / HI, 1 / HI);
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  // A 1-view-px line between world points (whole view pixels).
  function vline(ctx, x0, y0, x1, y1) {
    x0 = Math.round(x0 * HI); y0 = Math.round(y0 * HI); x1 = Math.round(x1 * HI); y1 = Math.round(y1 * HI);
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy, q = 1 / HI;
    for (;;) {
      ctx.fillRect(x0 * q, y0 * q, q, q);
      if (x0 === x1 && y0 === y1) break;
      var e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  // Phase 41: the pull-start's cord, from the motor's head to his far hand, drawn before him
  // (it runs to his far side; the motor, drawn after him, covers its root). dyP: the shear at the pivot.
  function drawCord(ctx, fs, sx, y, f, lean, dy, dyP) {
    if (fs.cord < 0) return;
    var P = G.gfx.sprites.PALETTE;
    ctx.fillStyle = P.cream;
    vline(ctx, sx + f * PIVOT[0], y + PIVOT[1] - 0.5 + dyP, sx + f * fs.fx - f * lean, y + fs.fy + dy);
  }

  // Phase 41: the tiller, from the motor's head forward to its grip, and the rod's two clips on
  // the gunwale, drawn over the hull. The grip is in his near hand while he steers (leaning
  // with him), else it rests where it was left; twist (0..1, the throttle) turns the grip's mark.
  function drawHelm(ctx, fs, sx, y, f, lean, dy, dyP, twist) {
    var P = G.gfx.sprites.PALETTE, hold = holding(fs);
    grip(fs, gp);
    var gx = sx + f * (hold ? fs.nx : gp[0]) - (hold ? f * lean : 0), gy = y + (hold ? fs.ny : gp[1]) + dy + 0.5;
    var px = sx + f * PIVOT[0], py = y + PIVOT[1] + dyP;
    ctx.fillStyle = P.ink; vline(ctx, px, py + 0.5, gx - f * 1.5, gy + 0.5);
    ctx.fillStyle = P.stone; vline(ctx, px, py, gx - f * 1.5, gy);
    // The grip: rubber, 2 px long, a lit mark that rolls round as the throttle opens.
    var x0 = Math.round((gx - (f > 0 ? 2 : 0)) * HI) / HI, y0 = Math.round((gy - 0.5) * HI) / HI;
    ctx.fillStyle = P.ink; ctx.fillRect(x0, y0, 2, 1);
    ctx.fillStyle = P.stone_dark; ctx.fillRect(x0, y0, 2, 1 / HI);
    var m = Math.floor((twist || 0) * 3.99);
    ctx.fillStyle = P.stone_hi; ctx.fillRect(x0 + (f > 0 ? m : 3 - m) / HI, y0, 1 / HI, 1 / HI);
    // The clips: two short posts from the gunwale up to where the rod lies.
    var ca = Math.cos(STOW_ANGLE * Math.PI / 180), ta = Math.tan(STOW_ANGLE * Math.PI / 180);
    for (var i = 0; i < 2; i++) {
      var d = i ? 10 : 2, cx = Math.round((sx + f * (CLIPS[0] + d * ca) - f * lean) * HI) / HI, top = Math.round((y + CLIPS[1] - d * ta + 0.5 + dy) * HI) / HI;
      ctx.fillStyle = P.ink; ctx.fillRect(cx - 0.5, top, 1, Math.max(0.5, y - 4.5 + dy - top));
      ctx.fillStyle = P.stone_hi; ctx.fillRect(f > 0 ? cx - 0.5 : cx, top, 1 / HI, 1 / HI);
    }
  }

  // The rod holder: a short tube on the gunwale at the holder, drawn over the hull.
  function drawHolder(ctx, sx, y, f, lean, dy) {
    var P = G.gfx.sprites.PALETTE, x = Math.round((sx + f * HOLDER[0] - f * lean) * HI) / HI, yy = Math.round((y + HOLDER[1] + dy) * HI) / HI;
    ctx.fillStyle = P.stone_dark; ctx.fillRect(x - 0.5, yy, 1, 2);
    ctx.fillStyle = P.stone_hi; ctx.fillRect(f > 0 ? x : x - 0.5, yy, 1 / HI, 2);
  }

  // dbg.fisher(): the pose, the hands (local px), where the rod is, the act and its time.
  function info(fs) {
    return { pose: fs.pose, hands: [+fs.nx.toFixed(2), +fs.ny.toFixed(2), +fs.fx.toFixed(2), +fs.fy.toFixed(2)], holder: fs.rodAt === 'holder',
      act: fs.act, step: fs.step, helm: fs.helm, helmT: +fs.helmT.toFixed(2), clips: fs.rodAt === 'clips', cord: +fs.cord.toFixed(2), steer: +fs.steer.toFixed(2), stows: fs.stows, tiller: holding(fs), actT: +fs.t.toFixed(2), idleT: +fs.idleT.toFixed(2), wait: +fs.wait.toFixed(2), returning: fs.ret, head: fs.head, item: fs.item, line: fs.line, held: fs.held, reel: fs.reel,
      can: fs.can, sips: fs.sips, beerRest: +Math.max(0, fs.beerRest).toFixed(1) };
  }

  return { K: K, POSES: POSES, ACTS: ACTS, HOLDER: HOLDER, HOLDER_ANGLE: HOLDER_ANGLE, create: create, step: step, start: start, abort: abort,
    CLIPS: CLIPS, STOW_ANGLE: STOW_ANGLE, TILLER: TILLER, HELM: HELM,
    rodLocal: rodLocal, draw: draw, drawHolder: drawHolder, drawHelm: drawHelm, drawCooler: drawCooler, drawCan: drawCan, drink: drink, choose: choose, info: info, armCount: function () { var n = 0; for (var k in art) if (k[0] === 'a' && k[k.length - 1] !== '<') n++; return n; } };
})();
