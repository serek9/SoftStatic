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
  var ac = null, master = null, limiter = null, bus = {}, ambLP = null;
  var noiseBuf = null, clickBuf = null;
  var amb = {};                                  // the always-running ambience nodes
  var voices = 0, log = [], LOG_N = 8;
  var prev = { dog: '', fsm: '', bite: -1, mode: '', owlT: 0, heavy: 0, coins: -1, loc: '', cycles: 0, pl: false, menu: '', D: 0, ly: 0, sig: false, scene: '' };
  var clickAcc = 0, hornT = 120, clankT = 30, chordT = 0, chordI = 0, t = 0;

  // ---- Start-up ------------------------------------------------------------------------

  function unlock() {
    if (ac) { if (ac.state === 'suspended' && !document.hidden) ac.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    build();
    ac.resume();
    note('start');
  }

  function attach() {
    var evs = ['keydown', 'mousedown', 'pointerdown', 'touchstart'];
    for (var i = 0; i < evs.length; i++) window.addEventListener(evs[i], unlock, true);
    document.addEventListener('visibilitychange', function () {
      if (!ac) return;
      if (document.hidden) ac.suspend(); else ac.resume();
    });
  }

  function noise(secs) {
    var n = Math.floor(ac.sampleRate * secs), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0), s = 0x2545F491;
    for (var i = 0; i < n; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; d[i] = ((s >>> 0) / 4294967296) * 2 - 1; }
    return b;
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
    noiseBuf = noise(2);
    clickBuf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.006), ac.sampleRate);
    var cd = clickBuf.getChannelData(0);
    for (var i = 0; i < cd.length; i++) cd[i] = (i & 1 ? -1 : 1) * Math.pow(1 - i / cd.length, 3);
    buildAmbience();
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
    amb.tens = gain(0, bus.sfx); amb.tensO = osc('triangle', 160); amb.tensO.connect(filter('lowpass', 900, 0.7, amb.tens));
  }

  function set(param, v, tc) { param.setTargetAtTime(v, ac.currentTime, tc || 0.25); }

  // ---- One-shots ---------------------------------------------------------------------------

  function done() { voices--; }
  function out(pan, to) {
    var dst = to || bus.sfx;
    if (pan && ac.createStereoPanner) { var p = ac.createStereoPanner(); p.pan.value = Math.max(-0.6, Math.min(0.6, pan)); p.connect(dst); return p; }
    return dst;
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
    sting: function (rare) {
      var notes = rare === 'legendary' ? [220, 277.2, 329.6, 415.3] : [261.6, 329.6, 392];
      for (var i = 0; i < notes.length; i++) tone('sine', notes[i], notes[i] * 0.995, 2.4, 0.03, (i - 1) * 0.2, i * 0.12, bus.music, 0.25);
    },
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
    statik: function () {
      var t0 = ac.currentTime;
      amb.stat.gain.cancelScheduledValues(t0);
      amb.stat.gain.setValueAtTime(0, t0); amb.stat.gain.linearRampToValueAtTime(0.07, t0 + 0.05);
      amb.stat.gain.setTargetAtTime(0, t0 + 0.5, 0.15);
      amb.statBP.frequency.cancelScheduledValues(t0);
      amb.statBP.frequency.setValueAtTime(3800, t0); amb.statBP.frequency.exponentialRampToValueAtTime(900, t0 + 0.8);
    }
  };

  function note(ev) { log.push(ev); if (log.length > LOG_N) log.shift(); }
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
    var save = G.state.save, st = save.settings, run = G.state.run;
    var scene = G.core.state.sceneName(), menu = G.ui.menu.current() || '';
    var lost = G.core.save.lost();
    set(master.gain, st.mute || lost ? 0 : st.volume * BASE, 0.08);
    // Under the pause menu the effects duck; indoors the ambience is heard through the walls.
    set(bus.sfx.gain, BUS.sfx * (menu === 'pause' ? 0.3 : 1), 0.1);
    set(ambLP.frequency, scene === 'sailing' ? 18000 : 520, 0.3);

    if (menu !== prev.menu) { if (menu && menu !== 'tape') play('page'); prev.menu = menu; }
    if (scene !== prev.scene) { if (prev.scene) play('page'); prev.scene = scene; prev.coins = save.coins; }
    if (scene === 'shop' && save.coins < prev.coins) play('buy');
    if (scene !== 'sailing' || !run.boat) { prev.coins = save.coins; ambience(save, run, dt, false); return; }

    var loc = run.loc, h = G.sim.clock.wrap(save.clock || 0);
    if (loc !== prev.loc) { if (prev.loc) play('statik'); prev.loc = loc; prev.fsm = run.fsm; }
    ambience(save, run, dt, true);
    if (menu) { prev.coins = save.coins; return; } // the world waits under an overlay (9.2)

    var fsm = run.fsm, c = run.cast, F = run.fight, pan = panAt(c.x1);
    if (fsm !== prev.fsm) {
      var was = prev.fsm;
      prev.D = F.D;
      if (was === 'casting' && fsm === 'sinking') splashOnce(Math.min(1, c.dist / 100), pan);
      else if (fsm === 'charging') click(0.8, 0.02, 0);
      else if (was === 'charging' && fsm === 'casting') hissOnce();
      else if (fsm === 'hooked') play('hook', pan);
      else if (was === 'fighting' && fsm === 'sailing') play(F.result === G.sim.fight.SNAP ? 'snap' : 'lost', pan);
      else if (fsm === 'card') {
        play('land', pan);
        var sp = G.data.fish[run.hook.sp];
        if (sp && (sp.rarity === 'rare' || sp.rarity === 'legendary')) play('sting', sp.rarity); else play('card');
      } else if (was === 'card' && fsm === 'sailing' && save.coins > prev.coins) play('coin');
      prev.fsm = fsm;
    }
    if (run.bite.slot >= 0 && prev.bite < 0) play('plip', pan);
    prev.bite = run.bite.slot;
    if (fsm === 'fighting') {
      if (F.mode === 'pull' && prev.mode === 'tired') play('run', pan);
      if (F.slipped) play('slip', pan);
    }
    prev.mode = F.mode;
    if (run.dog.pose === 'pet' && prev.dog !== 'pet') play('pat', panAt(run.boat.x));
    prev.dog = run.dog.pose;
    if (run.heavy.state === 1 && prev.heavy !== 1) play('hum', pan);
    prev.heavy = run.heavy.state;
    if (run.owl.on && prev.owlT < 1.5 && run.owl.t >= 1.5) play('owl', panAt(run.owl.x));
    prev.owlT = run.owl.on ? run.owl.t : 0;

    // Reel and drag: reeling in clicks steadily; line paid out to a running fish ratchets fast.
    var reeling = false, paying = false;
    if (fsm === 'fighting' || fsm === 'hooked') { reeling = F.D < prev.D - 1e-6 || (!run.passive.on && G.core.input.held('action')); paying = F.D > prev.D + 1e-6; }
    else if (fsm === 'sinking' || fsm === 'waiting' || fsm === 'interest') reeling = c.ly < prev.ly - 0.01;
    prev.D = F.D; prev.ly = c.ly;
    clickAcc += dt * (paying ? 26 : (reeling ? 11 : 0));
    if (clickAcc >= 1) { clickAcc -= Math.floor(clickAcc); click(paying ? 1.7 : 0.9, paying ? 0.02 : 0.035, panAt(run.boat.x)); }
    if (!reeling && !paying) clickAcc = 0;

    // Passive: the float going out and a catch coming in.
    var pv = run.passive;
    if (pv.on && pv.pl && !prev.pl) splashOnce(0.15, panAt(pv.x));
    if (pv.cycles > prev.cycles && pv.note.charAt(0) === '+') { splashOnce(0.45, panAt(pv.x)); play('coin'); }
    prev.pl = pv.on && pv.pl; prev.cycles = pv.cycles;

    // The Pines' traffic light: its relay clicks as it changes.
    if (loc === 'pines' && run.scen) { if (run.scen.on !== prev.sig) play('relay', panAt(G.data.locations.pines.landmarks[1].x)); prev.sig = run.scen.on; }

    // Distant sounds: a foghorn on Fogbound, clanks across the water.
    hornT -= dt; clankT -= dt;
    if (hornT <= 0) { hornT = 120 + G.vrng.next() * 140; if (loc === 'fog') play('horn'); }
    if (clankT <= 0) { clankT = 25 + G.vrng.next() * 50; if (loc === 'fog' || loc === 'creek') play('clank', G.vrng.next() * 1.2 - 0.6); }
    prev.coins = save.coins;
  }

  function splashOnce(p, pan) { if (ac.state === 'running') { splash(p, pan); note('splash'); } }
  function hissOnce() { if (ac.state === 'running') { hiss('bandpass', 900, 2600, 1.2, 0.18, 0.025, 0); note('whoosh'); } }

  // The continuous layers follow the hour, the place, unease and the boat.
  function ambience(save, run, dt, outside) {
    var loc = run.loc || 'fog', h = G.sim.clock.wrap(save.clock || 0), L = lightShares(h);
    var u = G.sim.unease.get(save, loc), red = loc === 'red', vx = run.boat ? Math.abs(run.boat.vx) : 0;
    set(amb.wind.gain, red ? 0.004 : 0.012 + 0.025 * L.grey);
    set(amb.water.gain, red ? 0.01 : 0.03 + 0.01 * Math.sin(t * 0.8));
    set(amb.lap.gain, outside ? 0.004 + Math.min(1, vx / 42) * 0.06 : 0, 0.15);
    set(amb.stream.gain, loc === 'creek' ? 0.018 : 0);
    set(amb.drone.gain, (red ? 0.06 : 0.025 + 0.025 * L.night) * (loc === 'pines' ? 0.6 : 1));
    set(amb.sour.detune, 12 + u * 55, 1.5);
    var lamp = loc === 'pines' && run.scen && G.scene.scenery.pines.lampLit ? G.scene.scenery.pines.lampLit(run.scen.t) : true;
    set(amb.hum.gain, loc === 'pines' ? (lamp ? 0.012 : 0.002) : 0, 0.02);
    var chirp = (loc === 'creek' || loc === 'pines') && (G.gfx.sprites.hash(5, Math.floor(t * 2.5)) & 3) === 0;
    set(amb.crick.gain, chirp ? 0.006 * L.night : 0, 0.03);
    var F = run.fight, fighting = outside && F && run.fsm === 'fighting';
    set(amb.tens.gain, fighting ? 0.01 + 0.035 * F.T * F.T * (F.mode === 'pull' ? 1 : 0.4) : 0, 0.08);
    set(amb.tensO.frequency, 160 + 260 * (F ? F.T : 0), 0.1);
    // 13.4: the chords play only in the Pines, one every 4.5 s.
    if (loc === 'pines' && outside && ac.state === 'running') {
      chordT -= dt;
      if (chordT <= 0) { chordT = 4.5; chord(u); }
    } else chordT = 0.5;
  }

  attach();

  return {
    step: step, unlock: unlock, BASE: BASE,
    // dbg.audio(): the context, the gains and the limiter, and the last events played.
    info: function () {
      if (!ac) return { state: 'none (waiting for the first key or click)' };
      return {
        state: ac.state, master: +master.gain.value.toFixed(3),
        buses: { music: +bus.music.gain.value.toFixed(2), amb: +bus.amb.gain.value.toFixed(2), sfx: +bus.sfx.gain.value.toFixed(2) },
        limiter: { threshold: limiter.threshold.value, knee: limiter.knee.value, ratio: limiter.ratio.value, attack: limiter.attack.value, release: limiter.release.value, reduction: +limiter.reduction.toFixed(2) },
        tension: +amb.tensO.frequency.value.toFixed(1), detune: +amb.sour.detune.value.toFixed(1), drone: +amb.drone.gain.value.toFixed(3), wind: +amb.wind.gain.value.toFixed(3),
        voices: voices, events: log.slice()
      };
    },
    play: function (ev, a) { if (!SOUNDS[ev]) return Object.keys(SOUNDS); play(ev, a); return ev; }
  };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  var i = G.audio.engine.info();
  if (!i.master && i.master !== 0) return 'audio ' + i.state;
  return 'audio ' + i.state + '  master ' + i.master + '  voices ' + i.voices + '  limiter ' + i.limiter.reduction + ' dB  last ' + (i.events[i.events.length - 1] || '-');
});
