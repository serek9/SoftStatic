var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Audio (Phase 13, V11; audit P0-1). Web Audio only, every sound synthesised, nothing loaded.
// The context is created on the first key, click or touch (never before, so the browser never
// blocks autoplay) and feeds three buses (music, ambience, effects) into a master gain and an
// always-on limiter (§0.14: no sudden loud sound). Volume and mute come from save.settings.
//
// The engine only reads the game: step(dt) runs after each fixed step, compares what it sees
// with what it saw last step, and plays what changed (a cast landing, a bite, a fish's run,
// the owl). It never writes to G.state, so the sim, replay and pacing are untouched.
// Randomness for when distant sounds happen comes from G.vrng (presentation only, §0.6).
G.audio = G.audio || {};
G.audio.engine = (function () {
  var BASE = 0.8;                               // master gain at volume 1
  var BUS = { music: 0.45, amb: 0.75, sfx: 0.9 };
  var ac = null, master = null, limiter = null, bus = {}, ambLP = null, uwLP = null, reverb = null, revSend = null, revLoc = '';
  var noiseBuf = null, clickBuf = null;
  var amb = {};                                  // the always-running ambience nodes
  var voices = 0, log = [], LOG_N = 24;
  var prev = { dog: '', fsm: '', bite: -1, mode: '', owlT: 0, heavy: 0, coins: -1, loc: '', cycles: 0, pl: false, menu: '', D: 0, ly: 0, sig: false, scene: '', shake: false, dragT: -9, creakT: 0, lx: 0, cly: 0 };
  var dragAcc = 0, reelInfo = { tier: 0, turns: 0, clickRate: 0, whirHz: 0, dragRate: 0, load: 0 };
  var clickAcc = 0, hornT = 120, clankT = 30, chordT = 0, chordI = 0, t = 0;

  // ---- Start-up ------------------------------------------------------------------------

  function unlock() {
    // 57.4: iOS leaves the context 'interrupted' after a call or the lock screen; any state but
    // running (and closed) is resumed by the next gesture while the page is shown.
    if (ac) { if (ac.state !== 'running' && ac.state !== 'closed' && !document.hidden) ac.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    build();
    ac.resume();
    note('start');
  }

  function attach() {
    // 57.4: touchend, pointerup and click too: iOS Safari counts those as a user gesture, not touchstart.
    var evs = ['keydown', 'mousedown', 'pointerdown', 'touchstart', 'touchend', 'pointerup', 'click'];
    for (var i = 0; i < evs.length; i++) window.addEventListener(evs[i], unlock, true);
    document.addEventListener('visibilitychange', function () {
      if (!ac) return;
      if (document.hidden) ac.suspend(); else ac.resume();
    });
  }

  function noise(secs) { return noiseFor(ac, secs); }
  // White noise from a fixed xorshift seed, for any audio context (the live one, or an offline one in checks).
  function noiseFor(ctx, secs) {
    var n = Math.floor(ctx.sampleRate * secs), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), s = 0x2545F491;
    for (var i = 0; i < n; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; d[i] = ((s >>> 0) / 4294967296) * 2 - 1; }
    return b;
  }

  // ---- Phase 24: the outboard ------------------------------------------------------------------
  // A small two-stroke: a train of narrow pulses at the firing rate (rpm / 60, one stroke a
  // turn), its timing wandering a little from stroke to stroke, through the cowling's and the
  // exhaust's resonances, with a low bubbling where the exhaust leaves under water. A low-pass
  // muffles it at idle and opens with the throttle. Built for any context (the live one, or an
  // OfflineAudioContext in the level check); update() sets it from the boat at time `when`.
  var MOTOR = { idleGain: 0.012, fullGain: 0.04, crankGain: 0.006, jitter: 45 };
  function makeMotor(ctx, nbuf, dest) {
    var re = new Float32Array(31), im = new Float32Array(31);
    for (var h = 1; h < 31; h++) im[h] = 1 / Math.sqrt(h);                       // a narrow, bright pulse
    var o = ctx.createOscillator(); o.setPeriodicWave(ctx.createPeriodicWave(re, im)); o.frequency.value = 15;
    var n = ctx.createBufferSource(); n.buffer = nbuf; n.loop = true;
    var nlp = ctx.createBiquadFilter(); nlp.type = 'lowpass'; nlp.frequency.value = 14;
    var nj = ctx.createGain(); nj.gain.value = MOTOR.jitter * 40;                  // cents of wander
    n.connect(nlp); nlp.connect(nj); nj.connect(o.detune);
    var out = ctx.createGain(); out.gain.value = 0;
    var muff = ctx.createBiquadFilter(); muff.type = 'lowpass'; muff.frequency.value = 700; muff.Q.value = 0.7;
    muff.connect(out); out.connect(dest);
    function band(type, f, q, g) { var b = ctx.createBiquadFilter(), e = ctx.createGain(); b.type = type; b.frequency.value = f; b.Q.value = q; e.gain.value = g; o.connect(b); b.connect(e); e.connect(muff); return b; }
    band('bandpass', 430, 2.5, 1.0);       // the cowling
    band('bandpass', 1150, 4, 0.45);       // the exhaust
    band('lowpass', 170, 1.2, 1.4);        // bubbling out under the water
    o.start(); n.start();
    return {
      out: out,
      // rpm, throttle 0..1, running (or cranking: starting true)
      update: function (rpm, throttle, running, starting, when) {
        var g = running ? MOTOR.idleGain + (MOTOR.fullGain - MOTOR.idleGain) * throttle : (starting ? MOTOR.crankGain : 0);
        o.frequency.setTargetAtTime(Math.max(4, rpm / 60), when, 0.05);
        out.gain.setTargetAtTime(g, when, running || starting ? 0.08 : 0.25);
        muff.frequency.setTargetAtTime(600 + 2600 * throttle, when, 0.15);
      }
    };
  }

  // The pull-start: the rope's zip, then a few strokes catching. For any context, at time `when`.
  function pullStart(ctx, nbuf, dest, when) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), e = ctx.createGain();
    s.buffer = nbuf; f.type = 'bandpass'; f.Q.value = 2;
    f.frequency.setValueAtTime(700, when); f.frequency.exponentialRampToValueAtTime(2600, when + 0.3);
    e.gain.setValueAtTime(0, when); e.gain.linearRampToValueAtTime(0.03, when + 0.04); e.gain.exponentialRampToValueAtTime(0.0001, when + 0.32);
    s.connect(f); f.connect(e); e.connect(dest); s.start(when, 0.3); s.stop(when + 0.4);
    for (var i = 0; i < 3; i++) {
      var o = ctx.createOscillator(), g = ctx.createGain(), t0 = when + 0.3 + i * 0.11;
      o.type = 'sine'; o.frequency.setValueAtTime(70, t0); o.frequency.exponentialRampToValueAtTime(42, t0 + 0.08);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.035 - i * 0.008, t0 + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
      o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + 0.12);
    }
  }

  function build() {
    limiter = ac.createDynamicsCompressor();
    limiter.threshold.value = -6; limiter.knee.value = 0; limiter.ratio.value = 20;
    limiter.attack.value = 0.003; limiter.release.value = 0.25;
    limiter.connect(ac.destination);
    master = ac.createGain(); master.gain.value = 0; master.connect(limiter);
    for (var k in BUS) { bus[k] = ac.createGain(); bus[k].gain.value = BUS[k]; }
    ambLP = ac.createBiquadFilter(); ambLP.type = 'lowpass'; ambLP.frequency.value = 18000;
    bus.amb.connect(ambLP); ambLP.connect(master);
    bus.music.connect(master); bus.sfx.connect(master);
    // Phase 25: the water bus (splashes, rises, drips): low-passed while the view is under water,
    // into the effects bus and a reverb for the water you are on.
    bus.water = ac.createGain(); bus.water.gain.value = 1;
    uwLP = ac.createBiquadFilter(); uwLP.type = 'lowpass'; uwLP.frequency.value = 18000;
    bus.water.connect(uwLP); uwLP.connect(bus.sfx);
    noiseBuf = noise(2);
    KIT = buildKit();
    reverb = ac.createConvolver(); reverb.buffer = KIT.ir.fog; revLoc = 'fog';
    revSend = ac.createGain(); revSend.gain.value = 0.25;
    uwLP.connect(revSend); revSend.connect(reverb); reverb.connect(bus.sfx);
    clickBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.006), ac.sampleRate);
    var cd = clickBuf.getChannelData(0);
    for (var i = 0; i < cd.length; i++) cd[i] = (i & 1 ? -1 : 1) * Math.pow(1 - i / cd.length, 3);
    buildAmbience();
  }

  // ---- Phase 25: the sound kit ----------------------------------------------------------------
  // Built once at unlock, straight into AudioBuffers by plain sample arithmetic (the same result
  // as an offline render, without waiting for one), from fixed seeds, in a few variants each so
  // nothing repeats exactly:
  //   splash: five sizes × 4: an impact (low-passed noise, a few ms), Minnaert bubbles (sines that
  //           rise in pitch as they close, 3.26 kHz / radius in mm), droplets (small high plinks
  //           over 60–400 ms) and a fizz; rise (a fish taking a fly: a slurp), drip, pop (a shallow bite)
  //   click: each reel's body (its own resonances, the Tin Reel's double rattle), 3 each
  //   twang: the line as a Karplus-Strong string, 4 pitches × 2 dampings
  //   tick: a nibble felt through the rod; knock: a bite
  //   ir: a reverb per water (a damped lake echo, tight in the creek, too long in the Red Room)
  var KIT = null, kitMs = 0, VOICE_MAX = 28;
  var TIER = [ // modes [Hz, decay s, amp]; rattle s; whir [Hz, Q, gain]; click gain
    { modes: [[3200, 0.012, 1], [4700, 0.008, 0.6], [1900, 0.02, 0.45]], rattle: 0.004, whir: [1800, 1.2, 0.010], gain: 0.05 },
    { modes: [[2400, 0.010, 1], [5200, 0.004, 0.3]], rattle: 0, whir: [2200, 2, 0.008], gain: 0.05 },
    { modes: [[1650, 0.060, 1], [3900, 0.030, 0.5], [6100, 0.015, 0.2]], rattle: 0, whir: [1200, 6, 0.008], gain: 0.04 },
    { modes: [[900, 0.006, 1]], rattle: 0, whir: [700, 1, 0.003], gain: 0.012 },
    { modes: [[1300, 0.020, 0.6], [2600, 0.010, 0.3]], rattle: 0, whir: [220, 8, 0.016], gain: 0.025 }
  ];
  var IRS = { fog: [1.6, 2600], pines: [1.2, 3000], creek: [0.45, 4200], red: [4.5, 1700] }; // decay s, damping Hz
  var SPLASH_SIZES = [0.12, 0.3, 0.5, 0.75, 1];

  function rngK(seed) { var s = seed | 0 || 1; return function () { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }
  function mkBuf(secs, fill) {
    var n = Math.max(1, Math.floor(ac.sampleRate * secs)), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0), m = 0, i;
    fill(d, ac.sampleRate);
    for (i = 0; i < n; i++) if (Math.abs(d[i]) > m) m = Math.abs(d[i]);
    if (m > 0) for (i = 0; i < n; i++) d[i] *= 0.9 / m;
    return b;
  }
  function sineDecay(d, sr, at, f, tau, amp, rise) { // a damped sine from sample at, its pitch rising by rise per s
    for (var i = at, p = 0; i < d.length; i++) {
      var t = (i - at) / sr;
      if (t > tau * 7) break;
      p += 2 * Math.PI * f * (1 + rise * t) / sr;
      d[i] += Math.sin(p) * Math.exp(-t / tau) * amp * (t < 0.0015 ? t / 0.0015 : 1);
    }
  }
  function splashSynth(d, sr, size, R) {
    var i, k, lp = 0, tau = 0.003 + 0.012 * size, a = 0.12 + 0.5 * (1 - size);
    for (i = 0; i < d.length; i++) { var t = i / sr; if (t > tau * 8) break; lp += ((R() * 2 - 1) * Math.exp(-t / tau) - lp) * a; d[i] += lp * (0.5 + 0.5 * size); }
    var nb = 1 + Math.round((1 + 3 * size) * R());
    for (k = 0; k < nb; k++) { var r = 1 + (0.5 + 5 * size) * R(); sineDecay(d, sr, Math.floor(sr * R() * (0.01 + 0.05 * size)), 3260 / r, 0.008 + 0.005 * r, 0.35 + 0.3 * R(), 18); }
    var nd = 3 + Math.round(12 * size * (0.5 + R()));
    for (k = 0; k < nd; k++) sineDecay(d, sr, Math.floor(sr * (0.06 + R() * (0.12 + 0.3 * size))), 1600 + 2600 * R(), 0.004 + 0.01 * R(), 0.05 + 0.13 * R(), 25);
    var hp = 0, px = 0;
    for (i = 0; i < d.length; i++) { var x = R() * 2 - 1; hp = 0.9 * (hp + x - px); px = x; d[i] += hp * 0.05 * size * Math.exp(-(i / sr) / 0.12); }
  }
  function bodySynth(d, sr, modes, rattle, jit, R) {
    for (var r = 0; r < (rattle ? 2 : 1); r++) {
      var at = Math.floor(r * rattle * sr), amp = r ? 0.6 : 1;
      for (var i = 0; i < 40 && at + i < d.length; i++) d[at + i] += (R() * 2 - 1) * (1 - i / 40) * 0.5 * amp;
      for (var m = 0; m < modes.length; m++) sineDecay(d, sr, at, modes[m][0] * jit, modes[m][1], modes[m][2] * amp, 0);
    }
  }
  function ksSynth(d, sr, f, rho, R) {
    var N = Math.max(2, Math.round(sr / f)), q = new Float32Array(N), i, idx = 0;
    for (i = 0; i < N; i++) q[i] = R() * 2 - 1;
    for (i = 0; i < d.length; i++) { var cur = q[idx]; q[idx] = 0.5 * (cur + q[(idx + 1) % N]) * rho; d[i] = cur; idx = (idx + 1) % N; }
  }
  function reson(f, bw, sr) { var r = Math.exp(-Math.PI * bw / sr); return [1 - r, 2 * r * Math.cos(2 * Math.PI * f / sr), r * r]; }
  function barkSynth(d, sr, jit, R) {
    var c1 = reson(550 * jit, 160, sr), c2 = reson(1400 * jit, 260, sr), y1 = 0, y2 = 0, z1 = 0, z2 = 0, ph = 0, hx = 0, hy = 0;
    for (var i = 0; i < d.length; i++) {
      var t = i / sr, f0 = 330 * jit * (1 - 0.35 * Math.min(1, t / 0.12));
      ph += f0 / sr; if (ph >= 1) ph -= 1;
      var env = Math.min(1, t / 0.006) * (t < 0.05 ? 1 : Math.exp(-(t - 0.05) / 0.045));
      var src = (ph < 0.12 ? 1 - ph / 0.12 : 0) * env, br = (R() * 2 - 1) * env * Math.exp(-t / 0.03) * 0.6;
      var a = c1[0] * src + c1[1] * y1 - c1[2] * y2; y2 = y1; y1 = a;
      var b = c2[0] * (src + br) + c2[1] * z1 - c2[2] * z2; z2 = z1; z1 = b;
      var o = a + 0.7 * b; hy = o - hx + 0.995 * hy; hx = o; d[i] = hy; // the pulses' DC taken out
    }
  }
  function irSynth(d, sr, decay, damp, R) {
    var lp = 0, a = 1 - Math.exp(-2 * Math.PI * damp / sr);
    for (var i = 0; i < d.length; i++) { var t = i / sr; lp += ((R() * 2 - 1) - lp) * a; d[i] = lp * Math.exp(-t * 6.9 / decay) * (t < 0.012 ? 0 : 1); }
    for (var k = 0; k < 5; k++) { var at = Math.floor(sr * (0.015 + 0.02 * k + 0.01 * R())); if (at < d.length) d[at] += 0.6 / (k + 1); } // early reflections off the shore
  }

  function buildKit() {
    var t0 = performance.now(), R = rngK(0x5eed1), k = { splash: [], rise: [], drip: [], pop: [], click: [], twang: [], tick: [], knock: [], ir: {} }, i, v;
    for (i = 0; i < SPLASH_SIZES.length; i++) {
      var row = [], size = SPLASH_SIZES[i];
      for (v = 0; v < 4; v++) row.push(mkBuf(0.25 + 0.55 * size, function (d, sr) { splashSynth(d, sr, size, R); }));
      k.splash.push(row);
    }
    for (v = 0; v < 3; v++) k.rise.push(mkBuf(0.3, function (d, sr) { sineDecay(d, sr, 0, 520 + 160 * R(), 0.03, 1, 14); splashSynth(d, sr, 0.15, R); }));
    for (v = 0; v < 4; v++) k.drip.push(mkBuf(0.1, function (d, sr) { sineDecay(d, sr, 0, 1900 + 1800 * R(), 0.009, 1, 30); }));
    for (v = 0; v < 2; v++) k.pop.push(mkBuf(0.15, function (d, sr) { sineDecay(d, sr, 0, 880 + 120 * R(), 0.02, 1, 22); }));
    for (i = 0; i < TIER.length; i++) {
      var cr = [];
      for (v = 0; v < 3; v++) cr.push(mkBuf(0.06 + TIER[i].modes[0][1] * 5, function (d, sr) { bodySynth(d, sr, TIER[i].modes, TIER[i].rattle, 0.97 + 0.06 * R(), R); }));
      k.click.push(cr);
    }
    var TW = [330, 440, 587, 784];
    for (i = 0; i < TW.length; i++) for (v = 0; v < 2; v++) k.twang.push(mkBuf(0.6, function (d, sr) { ksSynth(d, sr, TW[i], v ? 0.985 : 0.996, R); }));
    for (v = 0; v < 3; v++) k.tick.push(mkBuf(0.05, function (d, sr) { bodySynth(d, sr, [[1100, 0.008, 1], [2700, 0.005, 0.6]], 0, 0.95 + 0.1 * R(), R); }));
    for (v = 0; v < 3; v++) k.knock.push(mkBuf(0.2, function (d, sr) { bodySynth(d, sr, [[180, 0.035, 1], [620, 0.012, 0.5], [2100, 0.003, 0.3]], 0, 0.95 + 0.1 * R(), R); }));
    for (var w in IRS) k.ir[w] = mkBuf(IRS[w][0] * 1.1, function (d, sr) { irSynth(d, sr, IRS[w][0], IRS[w][1], R); });
    // Phase 35: a can's hiss: noise with its lows taken out (the difference of two samples),
    // in at once and fading over about a third of a second.
    k.hiss = mkBuf(0.4, function (d, sr) {
      var prev = 0;
      for (var j = 0; j < d.length; j++) { var t = j / sr, n = R() * 2 - 1; d[j] = (n - prev) * 0.5 * Math.exp(-t * 9) * (1 - Math.exp(-t * 300)); prev = n; }
    });
    // Phase 42: the dog's woof. A pulse train whose pitch falls (330 Hz to about 215 over its
    // first 0.12 s) through two formants (a chest at 550 Hz and a mouth at 1400), a puff of
    // breath through the mouth formant at its start, a 6 ms rise and a quick fall. Three takes.
    k.bark = [];
    for (v = 0; v < 3; v++) k.bark.push(mkBuf(0.24, function (d, sr) { barkSynth(d, sr, 0.94 + 0.12 * R(), R); }));
    kitMs = performance.now() - t0;
    return k;
  }

  // Plays a buffer: gain, pan, playback rate, a destination bus, a delay (s). Within the voice cap.
  function playBuf(b, g, pan, rate, dest, at) {
    if (!b || voices >= VOICE_MAX || g <= 0) return;
    var s = ac.createBufferSource(), e = ac.createGain();
    s.buffer = b; s.playbackRate.value = rate || 1; e.gain.value = g;
    s.connect(e); e.connect(out(pan, dest));
    voices++; s.onended = done; s.start(ac.currentTime + (at || 0));
  }
  function pick(arr) { return arr[Math.floor(G.vrng.next() * arr.length) % arr.length]; }

  // Where a sound on the water is, from the boat: panned by the camera, quieter with distance.
  var spot = { pan: 0, att: 1 };
  function spotAt(worldX) {
    var run = G.state.run, dx = run.boat ? worldX - run.boat.x : 0;
    spot.pan = panAt(worldX); spot.att = 1 / (1 + Math.abs(dx) / 150);
    return spot;
  }

  // A splash on the water, size 0..1, at world x: on the water bus (muffled under water, into the reverb).
  var lastCue = { name: '', gain: 0, pan: 0, size: 0 };
  function waterSplash(size, x, name) {
    size = Math.max(0, Math.min(1, size));
    var row = KIT.splash[Math.min(4, Math.round(size * 4))], s = spotAt(x), g = (0.02 + 0.07 * size) * s.att;
    playBuf(pick(row), g, s.pan, 0.94 + 0.12 * G.vrng.next(), bus.water);
    lastCue.name = name || 'splash'; lastCue.gain = g; lastCue.pan = s.pan; lastCue.size = size;
    note(name || 'splash');
  }

  // How much a bait weighs in a splash (the worm is a soft plip, the minnow a fuller plop).
  var BAIT_W = { worm: 0.5, cricket: 0.75, minnow: 1, unlabelled: 1.1, spinner: 0.7, plug: 0.9, grub: 0.6, popper: 0.85, jig: 0.8 }; // Phase 69: a lure by its look's base (scene/underwater.js lureBase)

  // Cues from the scenes for what the engine cannot see by reading state (rises, jumps, a lure
  // lifted out, a nibble, a fish thrashing at the surface). a: a size or strength 0..1.
  function cue(name, x, a) {
    if (!ac || ac.state !== 'running' || !KIT) return;
    var run = G.state.run, s;
    switch (name) {
      case 'rise': s = spotAt(x); playBuf(pick(KIT.rise), 0.03 * s.att, s.pan, 0.9 + 0.2 * G.vrng.next(), bus.water); note('rise'); break;
      case 'jump': waterSplash(a ? 1 : 0.6, x, a ? 'jumpin' : 'jumpout'); break; // a: back in (the biggest)
      case 'thrash': waterSplash(0.15 + 0.3 * (a || 0), x, 'thrash'); break;
      case 'liftout':
        waterSplash(0.05, x, 'liftout');
        for (var i = 0; i < 4; i++) playBuf(pick(KIT.drip), 0.012, panAt(run.boat.x), 0.9 + 0.3 * G.vrng.next(), bus.water, 0.3 + i * 0.22 + 0.1 * G.vrng.next());
        break;
      case 'nibble': playBuf(pick(KIT.tick), 0.018, panAt(run.boat.x), 0.9 + 0.2 * G.vrng.next()); note('nibble'); break;
      // Phase 34: preparing the lure: fresh bait worked onto the hook, and the hook set in it.
      case 'bait': playBuf(pick(KIT.tick), 0.012, panAt(run.boat.x), 1.4 + 0.2 * G.vrng.next()); note('bait'); break;
      case 'hooked': playBuf(pick(KIT.tick), 0.02, panAt(run.boat.x), 1.7); playBuf(pick(KIT.pop), 0.008, panAt(run.boat.x), 2.2, null, 0.05); note('hooked'); break;
      // Phase 35: a can cracked open (a snap, then the hiss), and a can set down on the gunwale.
      case 'crack': playBuf(pick(KIT.tick), 0.016, panAt(run.boat.x), 2.4); playBuf(KIT.hiss, 0.01, panAt(run.boat.x), 1, null, 0.02); note('crack'); break;
      case 'candown': playBuf(pick(KIT.knock), 0.012, panAt(run.boat.x), 2.6); note('candown'); break;
      // Phase 41: the rod's butt laid in the gunwale's clips, or lifted out of them.
      // Phase 42: a woof; a: the dog's pitch (1 for the golden dog). Over the water: its reverb, muffled below.
      case 'bark': playBuf(pick(KIT.bark), 0.05, panAt(run.boat.x), (a || 1) * (0.96 + 0.08 * G.vrng.next()), bus.water); note('bark'); break;
      case 'clip': playBuf(pick(KIT.knock), 0.01, panAt(run.boat.x), 1.9 + 0.2 * G.vrng.next()); note('clip'); break;
      // Phase 39: the bait shop: a footstep on the boards; the third board from the door hums.
      case 'step': playBuf(pick(KIT.knock), 0.007, 0, 1.5 + 0.2 * G.vrng.next()); note('step'); break;
      case 'creak': tone('sine', 96, 88, 0.7, 0.02, 0); tone('sine', 192, 180, 0.5, 0.008, 0, 0.05); note('creak'); break;
      // Phase 56: the rooms' instruments, soft and short, a: which chord (0..3) of a lofi
      // progression in major sevenths. A guitar strummed (plucked triangles, low to high, a
      // little out of tune), the synth's keys (sine and triangle, a slow attack, a wobble), and
      // the record: the needle's crackle, then the four chords once over eight seconds.
      case 'strum': roomChord(a || 0, 'strum', 0); note('strum'); break;
      case 'keys': roomChord(a || 0, 'keys', 0); note('keys'); break;
      case 'record':
        hiss('highpass', 3000, 2500, 0.7, 1.2, 0.006, 0);
        for (var ch = 0; ch < 4; ch++) roomChord(ch, 'keys', 0.6 + ch * 2);
        note('record'); break;
      // Phase 49: the life above the water. Small splashes: a heron's strike, a bird going
      // under, a frog plopping in, a beaver's tail slap (the loudest, still under a lure's).
      // Phase 55: thunder, a: how far off (0 near .. 1 far): a low rumble that rises slowly.
      case 'thunder': thunder(a || 0); note('thunder'); break;
      case 'strike': waterSplash(0.12, x, 'strike'); break;
      case 'dive': waterSplash(0.08, x, 'dive'); break;
      case 'plop': waterSplash(0.05, x, 'plop'); break;
      case 'slap': waterSplash(0.2, x, 'slap'); break;
      // The loon's wail across the water: a slow rise, a long held note and a fall, every part
      // with a soft attack, and the far shore giving it back fainter two seconds later.
      case 'loon':
        s = spotAt(x);
        for (var e = 0; e < 2; e++) {
          var g = (e ? 0.3 : 1) * 0.024 * (0.4 + 0.6 * s.att), pn = e ? -s.pan * 0.6 : s.pan, at = e * 2.2;
          tone('sine', 520, 770, 0.8, g, pn, at, bus.water, 0.25);
          tone('sine', 770, 790, 1.4, g, pn, at + 0.65, bus.water, 0.2);
          tone('sine', 790, 590, 1.0, g * 0.8, pn, at + 1.9, bus.water, 0.2);
          tone('sine', 1540, 1580, 1.4, g * 0.12, pn, at + 0.65, bus.water, 0.3);
        }
        note('loon');
        break;
    }
  }

  // Phase 25.6: a meter on the master, before and after the limiter (debug: dbg.audio('meter')).
  var meter = { on: false, pre: null, post: null, buf: null, peakPre: 0, peakPost: 0, rms: new Float32Array(8000), n: 0, acc: 0 };
  function meterStep(dt) {
    if (!meter.on) return;
    var b = meter.buf, i, m, s;
    meter.pre.getFloatTimeDomainData(b);
    for (i = 0, m = 0, s = 0; i < b.length; i++) { var v = Math.abs(b[i]); if (v > m) m = v; s += v * v; }
    if (m > meter.peakPre) meter.peakPre = m;
    meter.acc += dt;
    if (meter.acc >= 0.05 && meter.n < meter.rms.length) { meter.acc = 0; meter.rms[meter.n++] = Math.sqrt(s / b.length); }
    meter.post.getFloatTimeDomainData(b);
    for (i = 0, m = 0; i < b.length; i++) if (Math.abs(b[i]) > m) m = Math.abs(b[i]);
    if (m > meter.peakPost) meter.peakPost = m;
  }
  function db(v) { return +(20 * Math.log10(v + 1e-9)).toFixed(1); }
  function meterCmd(cmd) {
    if (cmd === 'start') {
      if (!meter.pre) { meter.pre = ac.createAnalyser(); meter.pre.fftSize = 2048; master.connect(meter.pre); meter.post = ac.createAnalyser(); meter.post.fftSize = 2048; limiter.connect(meter.post); meter.buf = new Float32Array(2048); }
      meter.on = true; meter.peakPre = meter.peakPost = 0; meter.n = 0; meter.acc = 0;
      return 'metering';
    }
    var r = Array.prototype.slice.call(meter.rms, 0, meter.n).sort(function (a, b) { return a - b; });
    if (cmd === 'stop') meter.on = false;
    return { windows: meter.n, peakPreDb: db(meter.peakPre), peakPostDb: db(meter.peakPost), rmsMedianDb: r.length ? db(r[r.length >> 1]) : null,
      rmsP99Db: r.length ? db(r[Math.floor(r.length * 0.99)]) : null, rmsMaxDb: r.length ? db(r[r.length - 1]) : null };
  }

  function osc(type, f) { var o = ac.createOscillator(); o.type = type; o.frequency.value = f; o.start(); return o; }
  function gain(v, to) { var g = ac.createGain(); g.gain.value = v; if (to) g.connect(to); return g; }
  function filter(type, f, q, to) { var b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q || 0.7; if (to) b.connect(to); return b; }
  function lfo(rate, depth, param) { var o = osc('sine', rate), g = gain(depth); o.connect(g); g.connect(param); return o; }

  // ---- 13.2 Ambience: drone, wind, water, the creek's stream, the lot's hum, crickets --------

  function buildAmbience() {
    var src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true; src.start();
    amb.wind = gain(0, bus.amb);
    var wbp = filter('bandpass', 380, 0.8, amb.wind); lfo(0.07, 160, wbp.frequency); src.connect(wbp);
    amb.water = gain(0, bus.amb); src.connect(filter('lowpass', 520, 0.7, amb.water));
    amb.lap = gain(0, bus.amb); src.connect(filter('bandpass', 720, 1.3, amb.lap));
    amb.stream = gain(0, bus.amb); src.connect(filter('bandpass', 1900, 0.6, amb.stream));
    amb.rain = gain(0, bus.amb); src.connect(filter('highpass', 3200, 0.5, amb.rain)); // the drizzle (P3-1)
    amb.stat = gain(0, bus.sfx);
    amb.statBP = filter('bandpass', 2600, 0.5, amb.stat); src.connect(amb.statBP);
    // The drone: two low tones and a third that drifts out of tune as unease rises (V10.1).
    amb.drone = gain(0, bus.amb);
    var dlp = filter('lowpass', 260, 0.9, amb.drone); lfo(0.05, 80, dlp.frequency);
    osc('triangle', 55).connect(dlp); osc('sine', 82.41).connect(dlp);
    amb.sour = osc('sawtooth', 110); amb.sour.connect(gain(0.35, dlp));
    // The Pines lot: fluorescent hum (60 Hz and its buzz).
    amb.hum = gain(0, bus.amb);
    osc('sawtooth', 60).connect(filter('bandpass', 180, 2, amb.hum));
    // Crickets: a high tone pulsed 28 times a second, in short trains.
    amb.crick = gain(0, bus.amb);
    var am = gain(0.5, amb.crick), cr = osc('sine', 4300); cr.connect(am); lfo(28, 0.5, am.gain);
    // The fight's tension tone (13.3): rises with T.
    // Phase 25: the tension is a thin singing line (a sine with a slight waver) whose pitch follows T.
    amb.tens = gain(0, bus.sfx); amb.tensO = osc('sine', 260); amb.tensO.connect(filter('lowpass', 1400, 0.7, amb.tens)); lfo(5.5, 5, amb.tensO.frequency);
    // The line hissing off the spool on a cast, the reel's gear whir, the drag's buzz on a hard
    // run, and a low bubbling bed heard while the view is under water.
    amb.spool = gain(0, bus.sfx); amb.spoolBP = filter('bandpass', 1200, 1.5, amb.spool); src.connect(amb.spoolBP);
    amb.whir = gain(0, bus.sfx); amb.whirBP = filter('bandpass', 1800, 1.2, amb.whir); amb.whirO = osc('sawtooth', 40); amb.whirO.connect(amb.whirBP);
    amb.buzz = gain(0, bus.sfx); amb.buzzO = osc('square', 40); amb.buzzO.connect(filter('bandpass', 2600, 2, amb.buzz));
    amb.uwBed = gain(0, bus.amb); src.connect(filter('lowpass', 260, 1.2, amb.uwBed));
    amb.motor = makeMotor(ac, noiseBuf, bus.amb); // Phase 24 (on the ambience bus: muffled indoors with the rest)
    amb.fridge = gain(0, bus.sfx); var fo = osc('sine', 60), fo2 = osc('sine', 120); fo.connect(amb.fridge); fo2.connect(gain(0.4, amb.fridge)); // Phase 39
  }

  function set(param, v, tc) { param.setTargetAtTime(v, ac.currentTime, tc || 0.25); }

  // ---- One-shots ---------------------------------------------------------------------------

  function done() { voices--; }
  function out(pan, to) {
    var dst = to || bus.sfx;
    if (pan && ac.createStereoPanner) { var p = ac.createStereoPanner(); p.pan.value = Math.max(-0.6, Math.min(0.6, pan)); p.connect(dst); return p; }
    return dst;
  }

  // Phase 55: thunder. Low-passed noise that swells over a quarter to three quarters of a
  // second and rolls away over 3-5 s, with a slow wobble in its filter; nearer, a little
  // louder and with a soft crack of higher noise on top. On the ambience bus (muffled indoors),
  // under the master limiter, and never louder than a big splash (no sudden loud sound, §0.14).
  var lastThunder = { dist: -1, g: 0 };
  function thunder(dist) {
    if (voices >= VOICE_MAX) return;
    var t0 = ac.currentTime, up = 0.25 + 0.5 * dist, dur = 3 + 2 * dist, g = 0.06 * (1 - 0.6 * dist);
    var s = ac.createBufferSource(), f = ac.createBiquadFilter(), e = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = 'lowpass'; f.Q.value = 0.9; f.frequency.value = 170 - 80 * dist;
    lfo.frequency.value = 1.3 + G.vrng.next(); lg.gain.value = 50 - 20 * dist; lfo.connect(lg); lg.connect(f.frequency);
    e.gain.setValueAtTime(0, t0); e.gain.linearRampToValueAtTime(g, t0 + up);
    e.gain.setTargetAtTime(0, t0 + up, dur / 4);
    s.connect(f); f.connect(e); e.connect(out(0, bus.amb));
    voices++; s.onended = done; s.start(t0, G.vrng.next() * 1.5); s.stop(t0 + up + dur + 0.1); lfo.start(t0); lfo.stop(t0 + up + dur + 0.1);
    if (dist < 0.35) hiss('bandpass', 900, 300, 0.8, 0.9, 0.01 * (1 - dist), 0, 0.02);
    lastThunder.dist = dist; lastThunder.g = g;
  }

  // A tone from f0 to f1 over dur seconds with a soft attack (never under 5 ms).
  function tone(type, f0, f1, dur, g, pan, at, to, attack) {
    var t0 = ac.currentTime + (at || 0), o = ac.createOscillator(), e = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    e.gain.setValueAtTime(0, t0); e.gain.linearRampToValueAtTime(g, t0 + (attack || 0.008));
    e.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(e); e.connect(out(pan, to));
    voices++; o.onended = done; o.start(t0); o.stop(t0 + dur + 0.05);
    return o;
  }

  // Phase 56: one chord of the rooms' progression (Cmaj7, Am7, Fmaj7, G6, low to high) on
  // the guitar ('strum': plucked, 35 ms apart, slightly out of tune) or the keys (together,
  // a slow attack, a gentle wobble), starting at s seconds from now. Quiet: under the dog.
  var ROOM_CHORDS = [[48, 52, 55, 59, 64], [45, 52, 55, 60, 64], [41, 48, 52, 57, 64], [43, 47, 52, 55, 59]];
  function roomChord(n, kind, at) {
    var c = ROOM_CHORDS[((n | 0) % 4 + 4) % 4];
    for (var i = 0; i < c.length; i++) {
      var f = 440 * Math.pow(2, (c[i] - 69) / 12);
      if (kind === 'strum') { var d = f * (1 + (i % 2 ? 0.004 : -0.003)); tone('triangle', d, d * 0.998, 1.8 - i * 0.15, 0.011, (i - 2) * 0.1, at + i * 0.035); tone('sine', d * 2, d * 2, 0.4, 0.003, 0, at + i * 0.035); }
      else { tone('sine', f, f * 1.002, 2.2, 0.008, (i - 2) * 0.15, at, null, 0.06); tone('triangle', f * 1.003, f, 1.6, 0.003, 0, at, null, 0.08); }
    }
  }

  // Filtered noise from f0 to f1 over dur seconds.
  function hiss(type, f0, f1, q, dur, g, pan, at) {
    var t0 = ac.currentTime + (at || 0), s = ac.createBufferSource(), f = ac.createBiquadFilter(), e = ac.createGain();
    s.buffer = noiseBuf; f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    e.gain.setValueAtTime(0, t0); e.gain.linearRampToValueAtTime(g, t0 + 0.01);
    e.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(e); e.connect(out(pan));
    voices++; s.onended = done; s.start(t0, (t * 0.37) % 1.5); s.stop(t0 + dur + 0.05);
  }

  function click(rate, g, pan) {
    var s = ac.createBufferSource(), e = gain(g);
    s.buffer = clickBuf; s.playbackRate.value = rate; s.connect(e); e.connect(out(pan));
    voices++; s.onended = done; s.start();
  }

  function splash(power, pan) {
    hiss('lowpass', 2200, 380, 0.7, 0.25 + 0.3 * power, 0.05 + 0.12 * power, pan);
    tone('sine', 190, 85, 0.14, 0.05 + 0.06 * power, pan);
  }

  var SOUNDS = {
    plip: function (pan) { tone('sine', 920, 480, 0.07, 0.05, pan); tone('sine', 1300, 900, 0.05, 0.02, pan, 0.09); },
    hook: function (pan) { tone('triangle', 650, 1500, 0.05, 0.06, pan); splash(0.25, pan); },
    run: function (pan) { hiss('bandpass', 2600, 800, 3, 0.4, 0.05, pan); tone('sine', 1250, 880, 0.35, 0.015, pan); },
    slip: function (pan) { hiss('bandpass', 3200, 1400, 2, 0.16, 0.04, pan); },
    snap: function (pan) { tone('sine', 2400, 2200, 0.25, 0.04, pan); splash(0.3, pan); },
    lost: function (pan) { splash(0.3, pan); },
    land: function (pan) {
      splash(0.4, pan);
      for (var i = 0; i < 4; i++) tone('sine', 1400 - i * 120, 900, 0.04, 0.015, pan, 0.18 + i * 0.13);
    },
    card: function () { hiss('lowpass', 1200, 500, 0.7, 0.09, 0.03, 0); },
    sting: function () { // Phase 68: a big catch (size class XL or XXL), whatever the species
      var notes = [261.6, 329.6, 392];
      for (var i = 0; i < notes.length; i++) tone('sine', notes[i], notes[i] * 0.995, 2.4, 0.03, (i - 1) * 0.2, i * 0.12, bus.music, 0.25);
    },
    bell: function () { tone('sine', 1568, 1562, 0.9, 0.025, 0); tone('sine', 2093, 2088, 0.7, 0.015, 0, 0.11); }, // Phase 39: the shop door's bell
    coin: function () { tone('sine', 1318.5, 1318.5, 0.12, 0.025, 0.1); tone('sine', 1760, 1760, 0.22, 0.02, 0.1, 0.07); },
    buy: function () { click(0.6, 0.06, 0); tone('sine', 140, 90, 0.12, 0.05, 0, 0.02); SOUNDS.coin(); },
    page: function () { hiss('lowpass', 1500, 600, 0.7, 0.08, 0.02, 0); },
    hum: function (pan) { tone('sine', 98, 97, 1.4, 0.05, pan, 0, null, 0.2); tone('sine', 147, 146.2, 1.4, 0.03, pan, 0, null, 0.2); },
    owl: function (pan) {
      for (var i = 0; i < 2; i++) {
        tone('sine', 400, 330, 0.42, 0.07, pan, i * 0.55, null, 0.06);
        tone('sine', 800, 660, 0.42, 0.012, pan, i * 0.55, null, 0.06);
        tone('sine', 400, 330, 0.42, 0.02, -pan, 0.9 + i * 0.55, null, 0.06); // the far shore answers
      }
    },
    horn: function () {
      tone('sawtooth', 69, 68, 4.5, 0.03, -0.3, 0, bus.amb, 1.2);
      tone('sawtooth', 103.5, 102.5, 4.5, 0.02, -0.3, 0, bus.amb, 1.2);
    },
    clank: function (pan) {
      var f = 330 + G.vrng.next() * 160, k = [1, 2.57, 4.03];
      for (var i = 0; i < 3; i++) tone('sine', f * k[i], f * k[i] * 0.998, 1.6 - i * 0.4, 0.012 / (i + 1), pan, 0, bus.amb, 0.005);
    },
    relay: function (pan) { click(1.6, 0.025, pan); },
    pat: function (pan) {
      for (var i = 0; i < 3; i++) hiss('lowpass', 500, 260, 0.7, 0.07, 0.03, pan, i * 0.22);
      tone('sine', 520, 610, 0.18, 0.015, pan, 0.5, null, 0.04); // a small contented sound
    },
    // Phase 24: the hull. A slap of water on the planks (power 0..1), and a faint wooden creak.
    slap: function (a) { hiss('lowpass', 1100, 280, 0.8, 0.07 + 0.06 * a.power, 0.012 + 0.025 * a.power, a.pan); },
    creak: function (pan) { tone('triangle', 230, 182, 0.22, 0.007, pan, 0, null, 0.04); tone('triangle', 352, 270, 0.17, 0.003, pan, 0.03, null, 0.04); },
    pullstart: function (pan) { pullStart(ac, noiseBuf, out(pan), ac.currentTime); },
    statik: function () {
      var t0 = ac.currentTime;
      amb.stat.gain.cancelScheduledValues(t0);
      amb.stat.gain.setValueAtTime(0, t0); amb.stat.gain.linearRampToValueAtTime(0.07, t0 + 0.05);
      amb.stat.gain.setTargetAtTime(0, t0 + 0.5, 0.15);
      amb.statBP.frequency.cancelScheduledValues(t0);
      amb.statBP.frequency.setValueAtTime(3800, t0); amb.statBP.frequency.exponentialRampToValueAtTime(900, t0 + 0.8);
    }
  };

  var noted = 0; // events ever logged (dbg.audio().noted), so a check can read every one
  function note(ev) { log.push(ev); noted++; if (log.length > LOG_N) log.shift(); }
  function play(ev, a) { if (!ac || ac.state !== 'running') return; SOUNDS[ev](a); note(ev); }

  // ---- 13.4 The Pines: slow chords that drift out of tune with unease --------------------------

  var CHORDS = [[50, 53, 57, 60, 64], [43, 53, 59, 64], [48, 52, 59, 62], [45, 55, 58, 61]];

  function chord(unease) {
    var c = CHORDS[chordI % CHORDS.length], t0 = ac.currentTime, lp = filter('lowpass', 1300, 0.6, bus.music);
    chordI++;
    for (var i = 0; i < c.length; i++) {
      var f = 440 * Math.pow(2, (c[i] - 69) / 12), o = ac.createOscillator(), e = ac.createGain();
      o.type = i === 0 ? 'triangle' : 'sine';
      o.frequency.value = f;
      // Each voice goes its own way out of tune, and wobbles, more as unease rises.
      o.detune.value = ((G.gfx.sprites.hash(chordI, i) & 1) ? 1 : -1) * unease * (18 + i * 7);
      lfo(0.3 + i * 0.07, unease * 9, o.detune).stop(t0 + 5.2);
      e.gain.setValueAtTime(0, t0); e.gain.linearRampToValueAtTime(0.022, t0 + 0.5);
      e.gain.setTargetAtTime(0.012, t0 + 0.6, 0.8); e.gain.setTargetAtTime(0, t0 + 3.8, 0.35);
      o.connect(e); e.connect(lp);
      voices++; o.onended = done; o.start(t0); o.stop(t0 + 5.2);
    }
    note('chord');
  }

  // ---- Reading the game ------------------------------------------------------------------------

  function panAt(worldX) {
    var run = G.state.run;
    return run.cam ? ((worldX - run.cam.x) / 320) * 1.2 - 0.6 : 0;
  }

  function lightShares(h) {
    var L = G.scene.sailing.light ? G.scene.sailing.light(h) : { night: 1, grey: 0 };
    return L;
  }

  // Called after every fixed step (index.html), whether or not the world moved.
  function step(dt) {
    if (!ac) return;
    t += dt;
    meterStep(dt);
    var save = G.state.save, st = save.settings, run = G.state.run;
    var scene = G.core.state.sceneName(), menu = G.ui.menu.current() || '';
    var lost = G.core.save.lost();
    set(master.gain, st.mute || lost ? 0 : st.volume * BASE, 0.08);
    // Under the pause menu the effects duck; indoors the ambience is heard through the walls.
    set(bus.sfx.gain, BUS.sfx * (menu === 'pause' ? 0.3 : 1), 0.1);
    set(ambLP.frequency, scene === 'sailing' ? 18000 : 520, 0.3);

    if (menu !== prev.menu) { if (menu) play('page'); prev.menu = menu; }
    if (scene !== prev.scene) { if (prev.scene) play(scene === 'shop' || prev.scene === 'shop' ? 'bell' : 'page'); prev.scene = scene; prev.coins = save.coins; }
    set(amb.fridge.gain, scene === 'shop' ? 0.01 : 0, 0.5);                            // Phase 39: the tank's pump hums in the shop
    if (scene === 'shop' && save.coins < prev.coins) play('buy');
    if (scene !== 'sailing' || !run.boat) { prev.coins = save.coins; ambience(save, run, dt, false); return; }

    var loc = run.loc, h = G.sim.clock.wrap(save.clock || 0);
    if (loc !== prev.loc) { if (prev.loc) play('statik'); prev.loc = loc; prev.fsm = run.fsm; }
    ambience(save, run, dt, true);
    if (menu) { prev.coins = save.coins; return; } // the world waits under an overlay (9.2)

    var fsm = run.fsm, c = run.cast, F = run.fight, pan = panAt(c.x1);
    var tier = Math.min(TIER.length - 1, save.gear.reel || 0), TR = TIER[tier], boatPan = panAt(run.boat.x);
    // Phase 25.5: under water the surface's sounds are muffled and a low bed comes up; the reverb is this water's.
    var uwA = run.uw ? run.uw.alpha : 0;
    set(uwLP.frequency, 18000 * Math.pow(600 / 18000, uwA), 0.08);
    set(amb.uwBed.gain, 0.02 * uwA, 0.3);
    if (loc !== revLoc && KIT.ir[loc]) { reverb.buffer = KIT.ir[loc]; revLoc = loc; }
    if (fsm !== prev.fsm) {
      var was = prev.fsm;
      prev.D = F.D;
      if (was === 'casting' && fsm === 'sinking') {
        // The lure goes in (its size from the cast and the bait), and the bail closes.
        waterSplash((0.08 + 0.35 * Math.min(1, c.dist / 120)) * (BAIT_W[G.scene.underwater.lureBase(c.bait || run.gearFx.bait)] || 0.6), c.x1, 'lurein');
        playBuf(pick(KIT.click[tier]), 0.045, boatPan, 0.55); note('bail');
      } else if (fsm === 'charging') { playBuf(pick(KIT.click[tier]), 0.03, boatPan, 0.7); note('bailopen'); }
      else if (was === 'charging' && fsm === 'casting') {             // the rod's whoosh, keener with the charge
        hiss('bandpass', 500, 1400 + 1800 * c.charge, 1.4, 0.2, 0.015 + 0.02 * c.charge, boatPan); note('whoosh');
      } else if (fsm === 'hooked') {                                    // the hook-set: the line twangs, the rod sweeps
        playBuf(pick(KIT.twang), 0.045, pan, 0.95 + 0.1 * G.vrng.next()); hiss('bandpass', 700, 2200, 1.4, 0.15, 0.015, boatPan); note('hook');
      } else if (was === 'fighting' && fsm === 'sailing') {
        if (F.result === G.sim.fight.SNAP) { playBuf(KIT.twang[7], 0.04, pan, 2.1); note('snap'); }  // sharp, soft, then nothing
        else {
          waterSplash(0.15, run.hook.x, F.thrown ? 'thrown' : 'lost');
          for (var lt = 0; lt < 4; lt++) playBuf(pick(KIT.tick), 0.012, boatPan, 1.1, null, 0.4 + lt * 0.3);       // the empty lure ticking back
        }
      } else if (fsm === 'card') {
        waterSplash(0.45, run.hook.x, 'land');
        for (var dr = 0; dr < 5; dr++) playBuf(pick(KIT.drip), 0.014, boatPan, 0.9 + 0.3 * G.vrng.next(), bus.water, 0.25 + dr * 0.18);
        if (G.data.sizeClass(run.hook.w) >= 3) play('sting'); else play('card');
      } else if (was === 'card' && fsm === 'sailing' && save.coins > prev.coins) play('coin');
      prev.fsm = fsm;
    }
    if (run.bite.slot >= 0 && prev.bite < 0) {
      // The bite: a firm knock up the line and the rod tip ticking; near the surface, a pop.
      playBuf(pick(KIT.knock), 0.05, boatPan); playBuf(pick(KIT.tick), 0.02, boatPan, 1, null, 0.12); playBuf(pick(KIT.tick), 0.015, boatPan, 1.1, null, 0.22);
      if (c.ly - G.scene.sailing.loc().waterY < 8) { var bs = spotAt(c.x1); playBuf(pick(KIT.pop), 0.03 * bs.att, bs.pan, 1, bus.water); }
      note('bite');
    }
    prev.bite = run.bite.slot;
    if (fsm === 'fighting') {
      if (F.mode === 'pull' && prev.mode === 'tired') play('run', pan);
      if (F.slipped) { for (var sl = 0; sl < 10; sl++) playBuf(pick(KIT.click[tier]), TR.gain * 0.7, boatPan, 1.7, null, sl * 0.025); note('slip'); } // a quick ratchet run
      var shaking = F.shake > 0;
      if (shaking && !prev.shake) { for (var sh = 0; sh < 3; sh++) playBuf(pick(KIT.twang), 0.022, pan, 1.1 + 0.25 * G.vrng.next(), null, sh * 0.13); note('shake'); }
      prev.shake = shaking;
      prev.creakT -= dt;
      if (F.T > 0.75 && prev.creakT <= 0) { tone('triangle', 150, 118, 0.35, 0.008, boatPan, 0, null, 0.05); note('rodcreak'); prev.creakT = 2.5; } // the rod under load
    } else prev.shake = false;
    prev.mode = F.mode;
    if (run.dog.pose === 'pet' && prev.dog !== 'pet') play('pat', panAt(run.boat.x));
    hullStep(run.boat, dt);
    prev.dog = run.dog.pose;
    if (run.heavy.state === 1 && prev.heavy !== 1) play('hum', pan);
    prev.heavy = run.heavy.state;
    if (run.owl.on && prev.owlT < 1.5 && run.owl.t >= 1.5) play('owl', panAt(run.owl.x));
    prev.owlT = run.owl.on ? run.owl.t : 0;

    // Phase 25.3: the reel. Its handle turns (turns/s) while reeling: the gear whir (a buzz at
    // the teeth's rate through the reel's own band) and the anti-reverse clicks (6 a turn), in
    // the reel's voice, lighter on slack line. The drag: when the fish takes line (D rising),
    // its clicks run faster and higher with the speed, up to a buzz on a hard run.
    var turns = 0, load = 0, dD = 0;
    if (fsm === 'fighting' || fsm === 'hooked') {
      dD = (F.D - prev.D) / dt;
      var held = G.core.input.held('action');
      if (held) { turns = F.mode === 'tired' ? 2.2 : 0.7; load = Math.min(1, 0.4 + F.T); }
    } else if (fsm === 'sinking' || fsm === 'waiting' || fsm === 'interest') {
      if (c.ly < prev.ly - 0.01) { turns = 2.2; load = 0.3 + 0.7 * G.gfx.rope.st.taut; }
    } else if (run.fisher && run.fisher.reel > 0) { turns = run.fisher.reel; load = 0.15; } // Phase 34: reeling the hanging lure up
    prev.D = F.D; prev.ly = c.ly;
    set(amb.whirO.frequency, Math.max(20, turns * 26), 0.05);
    set(amb.whirBP.frequency, TR.whir[0], 0.05); amb.whirBP.Q.value = TR.whir[1];
    set(amb.whir.gain, turns > 0 ? TR.whir[2] * (0.5 + 0.5 * load) : 0, 0.04);
    clickAcc += dt * turns * 6;
    while (clickAcc >= 1) { clickAcc -= 1; playBuf(pick(KIT.click[tier]), TR.gain * (0.5 + 0.5 * load), boatPan, 0.95 + 0.1 * G.vrng.next()); }
    if (turns === 0) clickAcc = 0;
    var dragRate = dD > 0 ? Math.min(90, 500 * dD) : 0;
    dragAcc += dt * dragRate;
    while (dragAcc >= 1) { dragAcc -= 1; playBuf(pick(KIT.click[tier]), TR.gain * 0.8, boatPan, 1.3 + Math.min(1, dD * 8)); }
    if (dragRate === 0) dragAcc = 0;
    set(amb.buzzO.frequency, Math.max(30, dragRate), 0.05);
    set(amb.buzz.gain, dragRate > 45 ? 0.01 * (dragRate - 45) / 45 : 0, 0.05);
    if (dragRate > 0 && t - prev.dragT > 1) { note('drag'); prev.dragT = t; }
    reelInfo.tier = tier; reelInfo.turns = turns; reelInfo.clickRate = turns * 6; reelInfo.whirHz = turns * 26; reelInfo.dragRate = +dragRate.toFixed(1); reelInfo.load = +load.toFixed(2);

    // The line hissing off the spool behind the flying lure: louder and higher while it is fast.
    var fly = fsm === 'casting' && c.flying, spd = fly ? Math.sqrt((c.lx - prev.lx) * (c.lx - prev.lx) + (c.ly - prev.cly) * (c.ly - prev.cly)) / dt : 0;
    set(amb.spool.gain, fly ? Math.min(0.025, spd * 0.00025) : 0, 0.03);
    set(amb.spoolBP.frequency, 700 + Math.min(2500, spd * 9), 0.03);
    prev.lx = c.lx; prev.cly = c.ly;

    // The Pines' traffic light: its relay clicks as it changes.
    if (loc === 'pines' && run.scen) { if (run.scen.on !== prev.sig) play('relay', panAt(G.data.locations.pines.landmarks[1].x)); prev.sig = run.scen.on; }

    // Distant sounds: a foghorn on Fogbound, clanks across the water.
    hornT -= dt; clankT -= dt;
    if (hornT <= 0) { hornT = 120 + G.vrng.next() * 140; if (loc === 'fog') play('horn'); }
    if (clankT <= 0) { clankT = 25 + G.vrng.next() * 50; if (loc === 'fog' || loc === 'creek') play('clank', G.vrng.next() * 1.2 - 0.6); }
    prev.coins = save.coins;
  }

  // Phase 24: the hull's sounds, read from the boat's motion: a pull-start when the motor is
  // cranked; a slap when the pitch swings back hard or the boat's own wake arrives; now and
  // then a creak as it rocks.
  var hull = { pv: 0, starts: 0, slapT: 0, creakT: 0 };
  var slapA = { power: 0, pan: 0 };
  function hullStep(b, dt) {
    var pan = panAt(b.x);
    hull.slapT -= dt; hull.creakT -= dt;
    if (b.starts !== hull.starts) { if (b.starts > hull.starts) play('pullstart', pan); hull.starts = b.starts; }
    var turned = (b.pv > 0) !== (hull.pv > 0) && Math.abs(b.pitch) > 0.6;
    if ((turned || b.wakeHit) && hull.slapT <= 0) {
      slapA.power = b.wakeHit ? Math.min(1, 0.4 + 0.6 * b.wakeA) : Math.min(1, Math.abs(b.pitch) / 3); slapA.pan = pan;
      play('slap', slapA); hull.slapT = 0.3;
    }
    if (turned && Math.abs(b.pitch) > 1.2 && hull.creakT <= 0 && (G.gfx.sprites.hash(Math.floor(t * 4), 31) & 1)) { play('creak', pan); hull.creakT = 4; }
    hull.pv = b.pv;
  }


  // The continuous layers follow the hour, the place, unease and the boat.
  function ambience(save, run, dt, outside) {
    var loc = run.loc || 'fog', h = G.sim.clock.wrap(save.clock || 0), L = lightShares(h);
    var u = G.sim.unease.get(save, loc), red = loc === 'red', vx = run.boat ? Math.abs(run.boat.vx) : 0;
    set(amb.wind.gain, red ? 0.004 : 0.012 + 0.025 * L.grey);
    set(amb.water.gain, red ? 0.01 : 0.03 + 0.01 * Math.sin(t * 0.8));
    set(amb.lap.gain, outside ? 0.004 + Math.min(1, vx / 42) * 0.06 : 0, 0.15);
    var b = run.boat;
    if (b) amb.motor.update(b.rpm, b.throttle, outside && b.motor, outside && b.startT >= 0, ac.currentTime);
    set(amb.stream.gain, loc === 'creek' ? 0.018 : 0);
    set(amb.rain.gain, G.scene.sailing.rain ? (outside ? 0.035 : (G.core.state.sceneName() === 'shop' ? 0.03 : 0)) * G.scene.sailing.rain() : 0, 0.8); // Phase 39: on the shop's glass, muffled
    set(amb.drone.gain, (red ? 0.06 : 0.025 + 0.025 * L.night) * (loc === 'pines' ? 0.6 : 1));
    set(amb.sour.detune, 12 + u * 55, 1.5);
    var lamp = loc === 'pines' && run.scen && G.scene.scenery.pines.lampLit ? G.scene.scenery.pines.lampLit(run.scen.t) : true;
    set(amb.hum.gain, loc === 'pines' ? (lamp ? 0.012 : 0.002) : 0, 0.02);
    var chirp = (loc === 'creek' || loc === 'pines') && (G.gfx.sprites.hash(5, Math.floor(t * 2.5)) & 3) === 0;
    set(amb.crick.gain, chirp ? 0.006 * L.night : 0, 0.03);
    var F = run.fight, fighting = outside && F && run.fsm === 'fighting';
    // Phase 25.4: the singing line, silent when slack (T under 0.12).
    set(amb.tens.gain, fighting && F.T > 0.12 ? 0.004 + 0.028 * F.T * F.T * (F.mode === 'pull' ? 1 : 0.4) : 0, 0.08);
    set(amb.tensO.frequency, 260 + 520 * (F ? F.T : 0), 0.1);
    if (!outside) { set(amb.whir.gain, 0); set(amb.buzz.gain, 0); set(amb.spool.gain, 0); set(amb.uwBed.gain, 0); }
    // 13.4: the chords play only in the Pines, one every 4.5 s.
    if (loc === 'pines' && outside && ac.state === 'running') {
      chordT -= dt;
      if (chordT <= 0) { chordT = 4.5; chord(u); }
    } else chordT = 0.5;
  }

  attach();

  return {
    step: step, unlock: unlock, BASE: BASE,
    // 57.5: the context's state for dbg.device(): 'none' before the first gesture.
    state: function () { return ac ? ac.state : 'none'; },
    // dbg.audio(): the context, the gains and the limiter, and the last events played.
    info: function () {
      if (!ac) return { state: 'none (waiting for the first key or click)' };
      return {
        state: ac.state, master: +master.gain.value.toFixed(3),
        buses: { music: +bus.music.gain.value.toFixed(2), amb: +bus.amb.gain.value.toFixed(2), sfx: +bus.sfx.gain.value.toFixed(2) },
        limiter: { threshold: limiter.threshold.value, knee: limiter.knee.value, ratio: limiter.ratio.value, attack: limiter.attack.value, release: limiter.release.value, reduction: +limiter.reduction.toFixed(2) },
        tension: +amb.tensO.frequency.value.toFixed(1), detune: +amb.sour.detune.value.toFixed(1), drone: +amb.drone.gain.value.toFixed(3), wind: +amb.wind.gain.value.toFixed(3),
        voices: voices, events: log.slice(), noted: noted,
        motor: { gain: +amb.motor.out.gain.value.toFixed(4), rpm: G.state.run.boat ? Math.round(G.state.run.boat.rpm) : 0 },
        kit: { ms: +kitMs.toFixed(1), splash: KIT.splash.length + ' sizes x ' + KIT.splash[0].length, rise: KIT.rise.length, drip: KIT.drip.length, pop: KIT.pop.length,
          click: KIT.click.length + ' reels x ' + KIT.click[0].length, twang: KIT.twang.length, tick: KIT.tick.length, knock: KIT.knock.length, ir: Object.keys(KIT.ir).join(',') },
        reel: reelInfo, underwater: { lowpass: Math.round(uwLP.frequency.value), bed: +amb.uwBed.gain.value.toFixed(4) },
        reverb: { loc: revLoc, seconds: +(KIT.ir[revLoc].duration).toFixed(2) }, lastCue: lastCue, voiceMax: VOICE_MAX
      };
    },
    cue: cue, meter: meterCmd, TIER: TIER, KIT: function () { return KIT; },
    // Phase 24, for the level check: the motor and the pull-start built in any context.
    makeMotor: makeMotor, pullStart: pullStart, noiseFor: noiseFor, BUS: BUS,
    play: function (ev, a) { if (!SOUNDS[ev]) return Object.keys(SOUNDS); play(ev, a); return ev; }
  };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  var i = G.audio.engine.info();
  if (!i.master && i.master !== 0) return 'audio ' + i.state;
  return 'audio ' + i.state + '  master ' + i.master + '  voices ' + i.voices + '  limiter ' + i.limiter.reduction + ' dB  last ' + (i.events[i.events.length - 1] || '-');
});
