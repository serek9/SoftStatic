var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// `?debug` overlay, on-screen errors and the `dbg` console API (V12).
// The overlay and errors are DOM text above the canvas, not game text, so they stay
// readable at any scale and keep working after the game loop has crashed.
// Errors are shown in red even without ?debug.
G.core = G.core || {};
G.core.debug = (function () {
  var on = /[?&]debug(=|&|$)/.test(location.search);
  var lines = [];   // functions returning one overlay line each
  var logs = [];    // last few log messages
  var errors = [];  // {msg, count}
  var overlayEl = null, errorEl = null;

  function el(css) {
    var e = document.createElement('pre');
    e.style.cssText = 'position:fixed;left:0;margin:0;padding:4px 6px;font:12px/1.35 monospace;' +
      'pointer-events:none;white-space:pre-wrap;z-index:10;' + css;
    document.body.appendChild(e);
    return e;
  }

  // Each feature registers its own overlay line (§0.13).
  function addLine(fn) { lines.push(fn); }

  function log(msg) {
    logs.push(msg);
    if (logs.length > 5) logs.shift();
    if (on) console.log('[dbg] ' + msg);
  }

  function error(msg) {
    for (var i = 0; i < errors.length; i++) {
      if (errors[i].msg === msg) { errors[i].count++; renderErrors(); return; }
    }
    errors.push({ msg: msg, count: 1 });
    if (errors.length > 8) errors.shift();
    renderErrors();
  }

  function renderErrors() {
    if (!document.body) return;
    if (!errorEl) errorEl = el('bottom:0;right:0;color:#ff4a4a;background:rgba(20,0,0,.85);');
    var s = '';
    for (var i = 0; i < errors.length; i++) {
      s += errors[i].msg + (errors[i].count > 1 ? '  (x' + errors[i].count + ')' : '') + '\n';
    }
    errorEl.textContent = s;
  }

  window.addEventListener('error', function (e) {
    var where = e.filename ? '  @ ' + e.filename.split('/').pop() + ':' + e.lineno : '';
    error((e.error && e.error.stack ? e.error.stack.split('\n')[0] : e.message) + where);
  });
  window.addEventListener('unhandledrejection', function (e) {
    error('unhandled rejection: ' + (e.reason && e.reason.message ? e.reason.message : e.reason));
  });
  window.addEventListener('DOMContentLoaded', function () {
    if (errors.length) renderErrors();
    if (!on) return;
    overlayEl = el('top:0;color:#cfe8e0;background:rgba(0,0,0,.6);');
    setInterval(renderOverlay, 100);
  });

  function renderOverlay() {
    var s = '';
    for (var i = 0; i < lines.length; i++) {
      try { s += lines[i]() + '\n'; } catch (e) { s += '(line error: ' + e.message + ')\n'; }
    }
    for (var j = 0; j < logs.length; j++) s += '> ' + logs[j] + '\n';
    overlayEl.textContent = s;
  }

  function todo(name, task) {
    return function () { console.warn('dbg.' + name + ' is not implemented yet (' + task + ')'); };
  }

  var dbg = {
    // dbg.state() returns the current fishing state; dbg.state(name) tries a transition.
    state: function (name) {
      var run = G.state.run;
      if (name === undefined) return run.fsm;
      var ok = G.core.state.go(run, name);
      console.log(ok ? 'fsm -> ' + name : 'refused: ' + run.fsm + ' -> ' + name);
      return ok;
    },
    // dbg.give(id) puts a fish of that species on the bite (the lure must be in the water).
    // dbg.give(id, true) also hooks it and lands it at once, straight to its card.
    give: function (id, quick) {
      var run = G.state.run, sp = -1;
      for (var i = 0; i < G.data.fish.length; i++) if (G.data.fish[i].id === id) sp = i;
      if (sp < 0) { console.log('species: ' + G.data.fish.map(function (f) { return f.id; }).join(', ')); return false; }
      if (!run.lureIn.active) { console.log('cast first: the lure must be in the water'); return false; }
      if (run.fsm === 'sinking') G.core.state.go(run, 'waiting');
      var f = G.sim.fish_ai.spawn(run.school, sp, run.lureIn.x - 5, run.lureIn.y, 1, G.rng, G.data);
      if (!f) return false;
      f.state = 'bite'; f.t = 0;
      if (run.fsm === 'waiting') G.core.state.go(run, 'interest');
      if (quick) {
        G.core.input.inject('action', true);
        setTimeout(function () { G.core.input.inject('action', false); }, 120);
        setTimeout(function () { dbg.land(); }, 600); // after the 0.3 s hooked beat
      }
      return true;
    },
    // dbg.land() wins the current fight on the next step.
    // (tired, so an un-reeled step cannot push D back up before the win check)
    land: function () { var F = G.state.run.fight; if (!F.active) return false; F.D = 0; F.mode = 'tired'; F.modeT = 9; return true; },
    // dbg.rod(kg) overrides the rod's mass limit (D4) for testing; dbg.rod(0) restores it.
    rod: function (kg) { return G.scene.sailing.setRodMax(kg); },
    // dbg.money(n) adds n coins (negative takes them); returns the balance.
    money: function (n) { G.state.save.coins = Math.max(0, G.state.save.coins + (n || 0)); return G.state.save.coins; },
    // dbg.buy(kind) buys the next 'rod' | 'reel' | 'line' | 'lantern' | 'depthFinder', or dbg.buy('bait', id, n).
    buy: function (kind, id, n) {
      var E = G.sim.economy, save = G.state.save;
      var r = kind === 'bait' || kind === 'lure' ? E.buyBait(save, id, n || 10, G.data) : (kind === 'rod' && id !== undefined ? E.buyRod(save, +id, G.data) : E.buy(save, kind, G.data));
      if (kind === 'lure') kind = 'bait'; // Phase 43: dbg.buy('lure', 'spinner', 3); dbg.buy('rod', 5) buys the wand
      if (r === E.OK) { if (kind === 'bait') save.gear.bait = id; G.core.save.autosave('purchase'); }
      return ['ok', 'maxed', 'not enough coins', 'locked', 'unknown'][r];
    },
    // dbg.save() saves now; dbg.wipe() deletes the save (reload for a new game).
    save: function () { return G.core.save.autosave('dbg'); },
    wipe: function () { localStorage.removeItem(G.core.save.KEY); return 'save deleted; reload'; },
    // dbg.hour(h) sets the game clock (0..24); dbg.hour() reads it.
    hour: function (h) {
      if (h === undefined) return G.state.save.clock;
      G.state.save.clock = ((h % 24) + 24) % 24;
      return G.state.save.clock;
    },
    // dbg.dog(pose) switches the dog's pose; returns false for an unknown pose.
    dog: function (pose) {
      var ok = G.scene.dog.setPose(G.state.run.dog, pose, 5);
      if (!ok) console.log('poses: ' + G.scene.dog.POSES.join(', '));
      return ok;
    },
    // dbg.pet() pets the dog (as S or the down arrow does while stopped); false if it is not ready.
    pet: function () { return G.scene.dog.pet(G.state.run.dog); },
    // dbg.useRod(i) takes an owned rod in hand (Phase 43); dbg.tackle() lists the rack and the hook.
    useRod: function (i) { var r = G.sim.economy.useRod(G.state.save, +i); return r === G.sim.economy.OK ? G.data.gear.rods[+i].name : 'not owned'; },
    tackle: function () { var s = G.state.save, fx = G.state.run.gearFx; return { rods: s.gear.rods.slice(), rod: s.gear.rod, bait: s.gear.bait, lure: fx.lure, swim: fx.swim, counts: JSON.parse(JSON.stringify(s.baits)), smallHook: fx.smallHook, smallBoost: fx.smallBoost }; },
    // dbg.bark(why) asks the dog for a bout (Phase 42: 'jump', 'catch', 'bell', 'bird', 'cue'; with
    // no argument the next idle bout comes in 1 s); returns its voice: bouts, woofs said, s since
    // the last bout, s to the next idle one, the last reason, and the setting.
    bark: function (why) {
      var d = G.state.run.dog;
      if (why) G.scene.dog.request(d, why); else d.voiceT = 1;
      return { bouts: d.bouts, said: d.said, since: +d.since.toFixed(1), next: +d.voiceT.toFixed(1), last: d.last, want: d.want, on: G.state.save.settings.dogBark !== false };
    },
    // dbg.unease(v) sets the current location's unease (0..1); dbg.unease() reads it.
    unease: function (v) {
      var loc = G.state.run.loc;
      if (v !== undefined) G.sim.unease.set(G.state.save, loc, v);
      return G.sim.unease.get(G.state.save, loc);
    },
    // dbg.spawn(id) puts a fish of that species beside the lure (lure must be in the water).
    spawn: function (id) {
      var run = G.state.run, sp = -1;
      for (var i = 0; i < G.data.fish.length; i++) if (G.data.fish[i].id === id) sp = i;
      if (sp < 0 || !run.lureIn.active) return false;
      var h = G.data.fish[sp].habitat;
      return !!G.sim.fish_ai.spawn(run.school, sp, run.lureIn.x - 60, (h.depthMin + h.depthMax) * 2, 1, G.rng, G.data);
    },
    // dbg.cast(charge) casts at once with charge 0..1 (default 0.3); returns the landing x.
    cast: function (charge) { return G.scene.sailing.forceCast(charge === undefined ? 0.3 : charge); },
    // dbg.lure(m, x) puts an underwater lure at m metres (clamped to the bottom), optionally at world x.
    lure: function (m, x) {
      var sc = G.scene.sailing;
      return G.scene.underwater.setLure(G.state.run, sc.loc(), m, x);
    },
    // dbg.tp(x) moves the boat to world x, stops it and snaps the camera.
    tp: function (x) { return G.scene.sailing.tp(x); },
    // dbg.caught(n) records one catch of each of the first n species in the journal (no coins).
    caught: function (n) {
      var save = G.state.save, list = G.data.fish;
      for (var i = 0; i < Math.min(n || list.length, list.length); i++) {
        var sp = list[i];
        G.sim.economy.recordCatch(save, { id: sp.id, len: sp.lengthCm[0], w: sp.weightKg[0], price: 0, hintRefs: sp.hintRefs, windowCatch: null }, 'sell');
      }
      return Object.keys(save.journal).length;
    },
    // dbg.ui(name) opens 'pause' | 'journal' | 'map' over the scene, or goes into 'shop' | 'cabin'
    // (from the boat, between casts); dbg.ui() closes nothing and returns what is open.
    ui: function (name) {
      if (name === 'shop' || name === 'cabin') {
        if (G.state.run.fsm !== 'sailing') return 'reel in first';
        G.core.state.change(name);
        return name;
      }
      if (name) G.ui.menu.open(name);
      return G.ui.menu.current() || G.core.state.sceneName();
    },
    // dbg.travel(id) travels to a location (or 'shop' / 'cabin') through the map, fade and all.
    travel: function (id) {
      if (!G.ui.menu.mapAllowed() && G.ui.menu.current() !== 'map') return 'only from the boat, between casts';
      if (G.ui.menu.current() !== 'map') G.ui.menu.open('map');
      return G.ui.map.travel(id) ? 'travelling' : G.ui.map.info().status;
    },
    // dbg.anomaly(id) forces that anomaly now, near the boat (refused while one is active);
    // dbg.anomaly() returns the active one, or null.
    anomaly: function (id) {
      var A = G.state.run.anom;
      if (id === undefined) return A.on ? { id: A.id, x: Math.round(A.x), t: +A.t.toFixed(2), dur: +A.dur.toFixed(2) } : null;
      if (A.on) return 'one is active already: ' + A.id;
      if (!G.scene.sailing.forceAnomaly(id)) return 'anomalies: ' + G.data.anomalies.list.map(function (a) { return a.id; }).join(', ');
      return dbg.anomaly();
    },
    // dbg.passive(true|false) turns passive mode on or off (as TAB does); dbg.passive() reads it.
    passive: function (on) { return on === undefined ? G.state.run.passive.on : G.scene.sailing.setPassive(on); },
    // dbg.away(seconds) plays out that much time away now (12.3), as a reload would, and opens the tape.
    away: function (secs) {
      var save = G.state.save, now = Date.now();
      if (G.state.run.fsm !== 'sailing') return 'reel in first';
      save.lastSeen = now - (secs || 0) * 1000;
      var tp = G.ui.tape.away(now);
      return tp ? { caught: tp.caught, lost: tp.lost, coins: tp.coins, lines: tp.entries.length, gap: tp.gap, phantom: tp.phantom } : 'under a minute: nothing to fish';
    },
    // dbg.tape(i) returns saved tape i (0 is the newest) as its shown lines.
    tape: function (i) {
      var tp = G.state.save.tapes[i || 0];
      if (!tp) return null;
      G.ui.tape.show(tp);
      return G.ui.tape.rows();
    },
    // dbg.restore() pays for the next cabin stage; returns the level.
    restore: function () { G.sim.economy.restoreCabin(G.state.save, G.data); G.core.save.autosave('purchase'); return G.state.save.cabinLevel; },
    // dbg.sprite(name) bakes a sprite and returns how many pixels differ from its definition (0 = exact).
    sprite: function (name) { return G.gfx.sprites.verify(name || 'test'); },
    // dbg.fx(kind, n, x, y) emits particles; they show wherever a scene draws fx (the gallery's fx page).
    fx: function (kind, n, x, y) { return G.gfx.fx.emit(kind || 'splash', x === undefined ? 160 : x, y === undefined ? 110 : y, n || 20); },
    // dbg.sky(h) checks the sky at hour h (default: now) from the top to the horizon: the
    // brightest luminance against the ceiling, and the night, grey and dusk light shares.
    sky: function (h) {
      var sc = G.scene.sailing, S = G.gfx.sprites, out = [0, 0, 0], max = 0;
      h = h === undefined ? sc.hourNow() : h;
      for (var i = 0; i <= 20; i++) {
        sc.skyColor(h, i / 20, out);
        max = Math.max(max, 0.2126 * out[0] + 0.7152 * out[1] + 0.0722 * out[2]);
      }
      var L = sc.light(G.sim.clock.wrap(h));
      return { hour: h, top: sc.skyColor(h, 0, [0, 0, 0]), horizon: sc.skyColor(h, 1, [0, 0, 0]), maxLum: +max.toFixed(1),
        ceiling: +S.CEILING.toFixed(1), safe: max <= S.CEILING + 0.001, night: +L.night.toFixed(2), grey: +L.grey.toFixed(2), dusk: +L.dusk.toFixed(2) };
    },
    // dbg.audio() returns the audio context's state, the gains, the limiter and the last events;
    // dbg.audio(ev) plays one sound by name (no name: the list).
    audio: function (ev) { return ev === undefined ? G.audio.engine.info() : G.audio.engine.play(ev); },
    // dbg.rain() returns the drizzle's strength now (0..1; audit P3-1).
    rain: function () { return +G.scene.sailing.rain().toFixed(3); },
    // dbg.fog() returns the alpha fog layers and the mist are drawn at now, the moon and the light on the water.
    fog: function () {
      var sc = G.scene.sailing, w = sc.waterLight();
      return { alpha: +sc.fogAlpha().toFixed(3), moon: sc.moon(), light: { x: w.x, a: +w.a.toFixed(2), key: w.key } };
    },
    // dbg.surface() returns the water surface's ripple energy, its lowest and highest ripple
    // (view px), the swell's height now and the step's cost (Phase 20).
    surface: function () {
      var s = G.gfx.surface.stats;
      return { energy: +s.energy.toFixed(4), min: +s.min.toFixed(3), max: +s.max.toFixed(3), swell: +G.gfx.surface.amp().toFixed(3), ms: +s.ms.toFixed(4) };
    },
    // dbg.rope() returns the line (Phase 21): points, line out, how straight (taut, 1 = straight),
    // the largest sag from the straight line between its ends (world px), how many points lie on
    // the surface, and the step's cost.
    rope: function () {
      var s = G.gfx.rope.st, w = G.gfx.rope.wet, on = 0;
      for (var i = 0; i < w.length; i++) if (w[i] > 0) on++;
      return { mode: ['off', 'pinned', 'loose'][s.mode], n: G.gfx.rope.N, onSurface: on, len: +s.rest.toFixed(2), span: +s.span.toFixed(2), taut: +s.taut.toFixed(3), sagMax: +s.sagMax.toFixed(2), ms: +s.ms.toFixed(4) };
    },
    // dbg.boat() returns the boat's motion (Phase 24): pitch (degrees, bow up positive: the
    // spring from speeding up and stopping, plus the waves' tilt), heave (world px, up), speed, throttle, rpm, whether the motor runs, and how many pull-starts.
    boat: function () {
      var b = G.state.run.boat;
      return { pitch: +b.show.toFixed(3), spring: +b.pitch.toFixed(3), wave: +b.wave.toFixed(3), heave: +b.heave.toFixed(3), vx: +b.vx.toFixed(2), throttle: +b.throttle.toFixed(3), rpm: Math.round(b.rpm), motor: b.motor, starts: b.starts, lean: +b.lean.toFixed(2) };
    },
    // dbg.fight() returns the fight now (Phase 23): tension, distance, stamina, mode, the hook
    // hold H, whether the fish shakes its head or jumps, the slips; null with no fish on.
    fight: function () {
      var F = G.state.run.fight;
      if (!F.active) return null;
      return { T: +F.T.toFixed(3), D: +F.D.toFixed(3), S: +F.S.toFixed(3), mode: F.mode, H: +F.H.toFixed(3), shake: F.shake > 0, jump: F.jump > 0, slips: F.slips };
    },
    // dbg.lureBody() returns the lure's heading (degrees: 0 right, 90 down, 180 left), its
    // flutter 0..1, its velocity (px/s) and the current at it (Phase 22).
    lureBody: function () { return G.scene.underwater.body(); },
    // dbg.fishBody(i) returns a swimmer's body (Phase 27): school slot i (0..7) or 'hook'.
    // face, turn (0 none, else 0..1 through it), beatHz, phase 0..1, glide, pitch (slope,
    // head down positive when swimming its way), frame (fishgen.FR), speed and vy (px/s),
    // len (world px); null when the slot is empty.
    fishBody: function (i) { return G.scene.underwater.fishBody(i === undefined ? 0 : i); },
    // dbg.rodBody() returns the rod (Phase 31): load 0..1, dir (the line's pull, local: x
    // forward, y up), tip (world px), bendDeg (butt to tip, negative bends forward and down),
    // top3 and butt (shares of the bend in the top third and the lower half), tier, taper, ms.
    rodBody: function () {
      var R = G.gfx.rod, s = R.st, b = G.state.run.boat, t = G.scene.boat.rodTip(b, b.x, G.scene.sailing.loc().waterY, [0, 0]);
      return { load: +s.load.toFixed(3), dir: [+s.fx.toFixed(3), +s.fy.toFixed(3)], tip: [+t[0].toFixed(2), +t[1].toFixed(2)], bendDeg: +s.bendDeg.toFixed(1),
        top3: +s.top3.toFixed(3), butt: +s.butt.toFixed(3), tier: s.tier, taper: s.taper, ms: +s.ms.toFixed(4) };
    },
    // dbg.rodLoad(x) forces the load on the rod's tip (0..1); dbg.rodLoad(null) gives it back to the scene.
    rodLoad: function (x) { G.gfx.rod.st.force = (x === null || x === undefined) ? null : +x; return G.gfx.rod.st.force; },
    // dbg.fisher() returns the fisher (Phase 33): pose, hands (near x, y, far x, y; local px),
    // holder (the rod in it), act, step, actT, idleT and wait (the director's timer), returning;
    // Phase 35: can (on the gunwale), sips, beerRest, night and drink (what he would drink now).
    fisher: function () {
      var fs = G.state.run.fisher, o = G.scene.fisher.info(fs), night = G.scene.sailing.night();
      o.night = night; o.drink = G.scene.fisher.drink(fs, night); // Phase 35: what he would drink now
      return o;
    },
    // dbg.setup() returns the setup panel (Phase 45): open, col, sel, top, the rods and hooks
    // listed, its rect and the line under the columns; plus the gear in the save, the act
    // queued for the fisher and the one playing.
    setup: function () {
      var o = G.ui.setup.info(), g = G.state.save.gear;
      o.rod = g.rod; o.bait = g.bait; o.queued = G.scene.sailing.tackleAct(); o.act = G.state.run.fisher ? G.state.run.fisher.act : '';
      return o;
    },
    // dbg.shop() returns the bait shop's walk (Phase 36): the tile (c, r), facing, moving, steps,
    // the dog (c, r, sitting), the mode ('room' or 'panel') and what he faces.
    shop: function () { return G.ui.shop.info(); },
    // dbg.shopWalk('RRRUU') walks him through the shop a tile per letter (U, D, L, R), by the walk's rules.
    shopWalk: function (path) { return G.core.state.sceneName() === 'shop' ? G.ui.shop.walkPath(path || '') : 'not in the shop'; },
    // dbg.dangle() returns the lure hanging from the tip between casts (Phase 34): on, th (rad from
    // straight down), om (rad/s), len (px of line), off (the lure from the tip, world px).
    dangle: function () { return G.scene.sailing.dangle(); },
    // dbg.sail(dir, s) steers left (-1) or right (1) for s seconds, as the keys would (Phase 41:
    // the fisher stows the rod and takes the tiller; dbg.fisher() shows helm, clips, tiller).
    sail: function (dir, s) { G.scene.sailing.sail(dir, s); return 'sailing ' + (dir < 0 ? 'left' : 'right') + ' for ' + (s === undefined ? 1 : s) + ' s'; },
    // dbg.idle(name) starts an idle act ('thermos', 'rest', ...); dbg.idle(null) ends the one playing.
    idle: function (name) {
      var fs = G.state.run.fisher;
      if (name === null || name === undefined) { G.scene.fisher.abort(fs); return true; }
      if (!G.scene.fisher.start(fs, name)) { console.log('acts: ' + Object.keys(G.scene.fisher.ACTS).join(', ')); return false; }
      return true;
    },
    // dbg.poke(x, s) disturbs the surface at world x (default: 40 px ahead of the boat) with strength s (default 1).
    poke: function (x, s) {
      var b = G.state.run.boat;
      if (x === undefined) x = b.x + b.facing * 40;
      G.gfx.surface.poke(x, s === undefined ? 1 : s);
      return x;
    }
  };
  if (on) window.dbg = dbg;

  // `?gallery`: pages of everything the gfx layer can draw. A/D or arrows change page.
  // Phase 19: native 640×360. The fish pages show the swimmers as the underwater view draws
  // them (the beat, the turn, shimmer, flipped, silhouette): every species, then every part on
  // every base, one base per page. Phase 27: the 'swim' page lays every base's frames side by side.
  var gallery = (function () {
    var pages = [], page = 0, t = 0, emitT = 0;
    var SAMPLE = 'The quick brown fox jumps over the lazy dog.';
    var SPECIES_PER = 20; // 4 columns × 5 rows of 160×64 cells

    function enter() {
      var FG = G.gfx.fishgen, i;
      pages = ['palette', 'font'];
      if (FG && G.data.fish) {
        for (i = 0; i < G.data.fish.length; i += SPECIES_PER) pages.push('fish:' + i);
        for (i = 0; i < FG.BASE_NAMES.length; i++) pages.push('parts:' + FG.BASE_NAMES[i]);
      }
      pages.push('small', 'swim', 'sprites', 'baits', 'lures', 'fx', 'shop', 'panel', 'fishers', 'dogs', 'looks top'); // small: Phase 44; panel: Phase 46; looks: Phase 47
      page = 0; t = 0;
    }

    function update(dt) {
      var inp = G.core.input;
      if (inp.pressed('right')) page = (page + 1) % pages.length;
      if (inp.pressed('left')) page = (page + pages.length - 1) % pages.length;
      t += dt;
      if (pages[page] === 'fx') {
        emitT -= dt;
        if (emitT <= 0) {
          emitT = 0.3;
          G.gfx.fx.emit('splash', 50, 110, 14);
          G.gfx.fx.emit('wake', 130, 110, 6);
          G.gfx.fx.emit('bubbles', 210, 168, 3);
          G.gfx.fx.emit('dust', 280, 60, 2);
        }
      }
      G.gfx.fx.update(dt);
    }

    // One swimmer cell: the frames in turn, the same flipped, and the silhouette. sp is a
    // species index, or a part on the base `base` ('' for the bare base).
    function art(sp, base, fr, sil, flip) { return base ? G.gfx.fishgen.partSwimmer(base, sp, fr, sil, flip) : G.gfx.fishgen.swimmer(sp, fr, sil, flip); }
    function swimCell(ctx, sp, base, frs, label, x0, y0, cw, ch) {
      var F = G.gfx.sprites.fine, fr = frs[Math.floor(t * 3) % frs.length], a = art(sp, base, fr, false, false), b = art(sp, base, fr, false, true), c = art(sp, base, fr, true, false);
      ctx.fillStyle = G.gfx.sprites.PALETTE.water_dark;
      ctx.fillRect(x0, y0, cw - 4, ch - 4);
      var yy = y0 + 4 + Math.max(0, (ch - 20 - a.height) >> 1);
      ctx.drawImage(a, x0 + 3, yy);
      ctx.drawImage(b, x0 + 6 + a.width, yy);
      if (9 + a.width * 2 + c.width < cw - 4) ctx.drawImage(c, x0 + 9 + a.width * 2, yy);
      else if (yy + a.height + c.height < y0 + ch - 18) ctx.drawImage(c, x0 + 3, yy + a.height);
      F.drawText(ctx, label, x0 + 3, y0 + ch - 16, 'fog_light');
    }

    function draw(ctx) {
      var S = G.gfx.sprites, F = S.fine, P = S.PALETTE, FG = G.gfx.fishgen, name = pages[page], arg = name.split(':')[1];
      ctx.fillStyle = P.night_ink;
      ctx.fillRect(0, 0, 640, 360);
      F.drawText(ctx, 'GALLERY  ' + name.split(':')[0] + (arg && isNaN(+arg) ? ' ' + arg : '') + '  ' + (page + 1) + '/' + pages.length + '   A/D: page', 8, 4, 'dusk_high');

      if (name === 'palette') {
        var keys = Object.keys(P);
        for (var i = 0; i < keys.length; i++) {
          var cx = 8 + Math.floor(i / 22) * 158, cy = 22 + (i % 22) * 15;
          ctx.fillStyle = P[keys[i]];
          ctx.fillRect(cx, cy, 12, 12);
          F.drawText(ctx, keys[i] + (S.SKY_WATER.test(keys[i]) ? '*' : ''), cx + 16, cy + 2, 'fog_light');
        }
        F.drawText(ctx, '* sky/water: never brighter than ' + S.CEILING_KEY, 8, 346, 'fog_mid');
      } else if (name === 'font') {
        for (var c = 32; c < 127; c++) {
          var k = c - 32;
          F.drawText(ctx, String.fromCharCode(c), 12 + (k % 32) * 19, 24 + Math.floor(k / 32) * 16, 'bone');
        }
        for (var j = 0; j < 4; j++) {
          F.drawText(ctx, 'jitter ' + (j / 3).toFixed(2), 8, 100 + j * 18, 'fog_mid');
          F.drawText(ctx, SAMPLE, 100, 100 + j * 18, 'paper', j / 3, 7);
        }
        F.drawText(ctx, 'width of sample: ' + F.measure(SAMPLE) + ' px', 8, 176, 'fog_mid');
        F.drawText(ctx, 'the 320x180 font (drawn at 1x):', 8, 200, 'fog_mid');
        S.drawText(ctx, SAMPLE, 8, 216, 'paper');
      } else if (name.indexOf('fish:') === 0) {
        var start = +arg, fish = G.data.fish;
        for (var s = start; s < Math.min(fish.length, start + SPECIES_PER); s++) {
          var cell = s - start;
          swimCell(ctx, s, '', FG.swimFrames(fish[s].look),
            fish[s].id + ' w' + fish[s].look.wrongness + ' ' + fish[s].look.base, 8 + (cell % 4) * 158, 20 + Math.floor(cell / 4) * 66, 158, 66);
        }
      } else if (name === 'small') {
        // Phase 44: the small fish as they swim (1x, then 4x), the beat and a turn playing, the
        // silhouette and the hooked frames (roll, shake), and the portrait with its parts.
        var sm = 0, SF = [0, 1, 0, 3, 0, 1, 0, 3, 4, 5], SEQ = SF[Math.floor(t * 4) % SF.length];
        ctx.imageSmoothingEnabled = false;
        for (var si = 0; si < G.data.fish.length; si++) {
          if (!G.data.isSmall(G.data.fish[si])) continue;
          var col = sm % 2, row = sm >> 1, sx = 8 + col * 316, sy = 20 + row * 66, sw = FG.swimmer(si, SEQ, false, false);
          ctx.fillStyle = P.water_dark; ctx.fillRect(sx, sy, 312, 62);
          ctx.drawImage(sw, sx + 4, sy + 6);
          ctx.drawImage(FG.swimmer(si, SEQ, true, true), sx + 4, sy + 22);
          ctx.drawImage(sw, sx + 22, sy + 4, sw.width * 4, sw.height * 4);
          ctx.drawImage(FG.swimmer(si, FG.FR.ROLL, false, false), sx + 80, sy + 4, sw.width * 4, sw.height * 4);
          ctx.drawImage(FG.swimmer(si, FG.FR.SHAKE, false, true), sx + 138, sy + 4, sw.width * 4, sw.height * 4);
          ctx.drawImage(FG.portrait(si, 100, 40, false), sx + 204, sy + 4);
          var f = G.data.fish[si];
          F.drawText(ctx, f.id + ' ' + f.lengthCm[0] + '-' + f.lengthCm[1] + ' cm ' + sw.width + 'px', sx + 4, sy + 46, 'fog_light');
          sm++;
        }
      } else if (name.indexOf('parts:') === 0) {
        var list = [''].concat(FG.PARTS);
        for (var q = 0; q < list.length; q++) {
          swimCell(ctx, list[q], arg, FG.swimFrames({ wrongness: 0, parts: [list[q]] }), list[q] || 'bare', 8 + (q % 4) * 158, 20 + Math.floor(q / 4) * 84, 158, 84);
        }
      } else if (name === 'sprites') {
        // Whatever is still a small sprite (drawn at 1×, its own size).
        var names = S.names;
        for (var m = 0; m < names.length; m++) {
          var d = S.get(names[m]), x0 = 8 + (m % 4) * 158, y0 = 22 + Math.floor(m / 4) * 40;
          S.draw(ctx, names[m], x0, y0, Math.floor(t * 3), false);
          S.draw(ctx, names[m], x0 + d.w + 4, y0, Math.floor(t * 3), true);
          F.drawText(ctx, names[m] + ' ' + d.w + 'x' + d.h + ' x' + d.n, x0, y0 + 22, 'fog_light');
        }
      } else if (name === 'swim') {
        // Phase 27: each base's swimming frames in a row: rest, tail away, tail near, the two
        // turn frames, then the beat and a full turn playing.
        var FRN = ['rest', 'away', 'near', 'turn1', 'turn2', 'roll', 'shake'], FRS = [0, 1, 3, 4, 5, 6, 7]; // roll, shake: Phase 29
        for (var bb = 0; bb < FG.BASE_NAMES.length; bb++) {
          var y1 = 20 + bb * 40, base = FG.BASE_NAMES[bb];
          F.drawText(ctx, base, 8, y1 + 14, 'fog_light');
          for (var fi = 0; fi < 7; fi++) ctx.drawImage(FG.partSwimmer(base, '', FRS[fi], false, false), 64 + fi * 64, y1);
          var cyc = Math.floor(t * 4) % 8, TURN = [4, 5, 5, 4]; // the beat four times, then a turn
          ctx.drawImage(cyc < 4 ? FG.partSwimmer(base, '', FG.BEAT[cyc], false, false) : FG.partSwimmer(base, '', TURN[cyc - 4], false, cyc >= 6), 528, y1);
          if (bb === 0) for (fi = 0; fi < 7; fi++) F.drawText(ctx, FRN[fi], 64 + fi * 64, 344, 'fog_mid');
        }
      } else if (name === 'shop') {
        // Phase 40: the bait shop's room as baked, and its sprites: the fisher and the dog in
        // each facing and frame, Rusty's frames (down, side, his back).
        var SR = G.ui.shopRoom, DS = ['down', 'up', 'right', 'left'];
        ctx.drawImage(SR.bake(), 8, 40);
        F.drawText(ctx, 'room (baked)', 8, 26, 'fog_mid');
        F.drawText(ctx, 'fisher', 404, 26, 'fog_mid'); F.drawText(ctx, 'dog', 516, 26, 'fog_mid');
        for (var di = 0; di < 4; di++) for (var fr2 = 0; fr2 < 3; fr2++) {
          ctx.drawImage(SR.sprite('fisher', DS[di], fr2), 404 + fr2 * 34, 40 + di * 34);
          ctx.drawImage(SR.sprite('dog', DS[di], [0, 1, 3][fr2]), 516 + fr2 * 34, 40 + di * 34);
        }
        F.drawText(ctx, 'rusty', 404, 186, 'fog_mid');
        for (fr2 = 0; fr2 < 4; fr2++) { ctx.drawImage(SR.sprite('rusty', 'down', fr2), 404 + fr2 * 34, 200); ctx.drawImage(SR.sprite('rusty', 'right', fr2), 404 + fr2 * 34, 236); }
        ctx.drawImage(SR.sprite('rusty', 'up', 0), 540, 200);
      } else if (name === 'panel') {
        // Phase 46: the small panel (G.ui.panel) at three sizes over a strip of sky and water,
        // as it sits over the world: a row chosen, key caps, key hints, an aside.
        var U = G.ui.panel, SZ = [[120, 60, 'SMALL', ''], [180, 100, 'MIDDLE', '12c'], [U.MAX_W, U.MAX_H, 'LARGEST', 'NEW!']], px0 = 8;
        ctx.fillStyle = P.dusk_violet; ctx.fillRect(0, 18, 640, 170);
        ctx.fillStyle = P.water_mid; ctx.fillRect(0, 188, 640, 172);
        for (var pz = 0; pz < SZ.length; pz++) {
          var pw0 = SZ[pz][0], ph0 = SZ[pz][1], py0 = 40;
          U.frame(ctx, px0, py0, pw0, ph0, SZ[pz][2], SZ[pz][3], pz === 2 ? 'neon_red' : 'bone');
          for (var pr = 0; pr * U.ROW + U.TAB + U.PAD + U.ROW <= ph0 - U.PAD - U.KEY_H - 4; pr++) {
            var ry0 = U.top(py0) + pr * U.ROW;
            if (pr === 1) U.row(ctx, px0 + 3, ry0, pw0 - 6);
            F.drawText(ctx, 'Row ' + (pr + 1), U.left(px0) + 3, ry0, pr === 1 ? 'signal_amber' : 'fog_light');
          }
          var kx = U.left(px0), ky = py0 + ph0 - U.PAD - U.KEY_H;
          kx += U.key(ctx, 'SELL', kx, ky, true) + 4;
          kx += U.key(ctx, 'KEEP', kx, ky, false) + 4;
          if (pz) U.hint(ctx, 'A/D', 'choose', kx, ky);
          F.drawText(ctx, pw0 + 'x' + ph0, px0, py0 + ph0 + 6, 'bone');
          px0 += pw0 + 24;
        }
        F.drawText(ctx, 'the largest is the limit: ' + U.MAX_W + 'x' + U.MAX_H + ' with the tab', 8, 344, 'fog_light');
      } else if (name === 'fishers') {
        // Phase 47: every fisher's look in every pose (the hands where each pose puts them, the
        // head and the item as the acts have them), facing right and left, at 1×.
        var FI = G.scene.fisher, LKS = G.data.looks.fishers, PN = Object.keys(FI.POSES);
        var HEADS = { mouth: 2, lureLook: 1, baitA: 1, baitB: 1, tug: 1 }, ITEMS0 = { cup: 'cup', mouth: 'can' };
        for (var pn = 0; pn < PN.length; pn++) F.drawText(ctx, PN[pn].slice(0, 7), 8 + pn * 40, 18, 'fog_mid');
        for (var lf = 0; lf < LKS.length; lf++) for (var fc = 0; fc < 2; fc++) {
          var rowY = 30 + (lf * 2 + fc) * 36;
          if (!fc) F.drawText(ctx, LKS[lf].name, 572, rowY + 4, 'fog_light');
          ctx.setTransform(2, 0, 0, 2, 0, 0);
          for (pn = 0; pn < PN.length; pn++) {
            var pp = FI.POSES[PN[pn]], fs0 = { nx: pp.n[0], ny: pp.n[1], fx: pp.f[0], fy: pp.f[1], head: HEADS[PN[pn]] || 0, item: ITEMS0[PN[pn]] || '', cord: -1 };
            FI.draw(ctx, fs0, (8 + pn * 40) / 2 + (fc ? 12 : 8), rowY / 2 + 17, fc ? -1 : 1, 0, 0, t, 0, LKS[lf]);
          }
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
      } else if (name === 'dogs') {
        // Phase 47: every breed in every pose and frame at 2×, and the wind on its ears.
        var DG = G.scene.dog, DLK = G.data.looks.dogs, cl = 0;
        for (var db = 0; db < DLK.length; db++) {
          F.drawText(ctx, DLK[db].name + '  bark x' + DLK[db].bark, 8, 20 + db * 84, 'fog_light');
          cl = 0;
          for (var dp = 0; dp < DG.POSES.length; dp++) for (var dfr = 0; dfr < (DG.FRAMES[DG.POSES[dp]] || 1); dfr++) {
            var dpose = DG.POSES[dp], dd = { pose: dpose, t: dfr / (dpose === 'pet' ? 7 : (dpose === 'sleep' ? 0.7 : 5)) + 0.001 };
            ctx.setTransform(4, 0, 0, 4, 0, 0);
            DG.draw(ctx, dd, (8 + cl * 52) / 4, (32 + db * 84) / 4, false, dpose === 'idle' && dfr === 0 ? 0 : (dpose === 'alert' ? 0.9 : 0), DLK[db]);
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            if (!db) F.drawText(ctx, dpose.slice(0, 8) + (DG.FRAMES[dpose] ? dfr : ''), 8 + cl * 52, 344, 'fog_mid');
            cl++;
          }
        }
        F.drawText(ctx, 'alert: with wind', 8, 332, 'fog_mid');
      } else if (name === 'looks top') {
        // Phase 47: the shop room's sprites for every look: each facing, standing and walking (the dog sitting too).
        var SRl = G.ui.shopRoom, DS2 = ['down', 'up', 'right', 'left'], KL = [['fisher', G.data.looks.fishers, [0, 1, 2]], ['dog', G.data.looks.dogs, [0, 1, 3]]];
        for (var kk = 0; kk < 2; kk++) for (var li2 = 0; li2 < 4; li2++) {
          var yy0 = 20 + (kk * 4 + li2) * 42, rec = KL[kk][1][li2];
          F.drawText(ctx, rec.name, 8, yy0 + 12, 'fog_light');
          for (var d2 = 0; d2 < 4; d2++) for (var f2 = 0; f2 < 3; f2++) ctx.drawImage(SRl.sprite(KL[kk][0], DS2[d2], KL[kk][2][f2], rec), 100 + (d2 * 3 + f2) * 36, yy0);
        }
      } else if (name === 'baits') {
        // Phase 22: each bait's body in every heading (both flutter phases), drawn ×3 on water.
        var UWm = G.scene.underwater, ids = ['worm', 'cricket', 'minnow', 'unlabelled'];
        ctx.fillStyle = P.water_mid; ctx.fillRect(0, 18, 640, 342);
        ctx.imageSmoothingEnabled = false;
        for (var bi = 0; bi < ids.length; bi++) {
          F.drawText(ctx, ids[bi], 8, 26 + bi * 82, 'bone');
          for (var dk = 0; dk < UWm.DIRS; dk++) for (var ph = 0; ph < 2; ph++) {
            ctx.drawImage(UWm.lureImg(ids[bi], dk, ph), 8 + dk * 39, 40 + bi * 82 + ph * 34, 33, 33);
          }
        }
      } else if (name === 'lures') {
        // Phase 43: each lure's body in eight headings and both phases, ×3 on water.
        var UWl = G.scene.underwater, lids = ['spinner', 'plug', 'grub', 'popper', 'jig'];
        ctx.fillStyle = P.water_mid; ctx.fillRect(0, 18, 640, 342);
        ctx.imageSmoothingEnabled = false;
        for (var li = 0; li < lids.length; li++) {
          F.drawText(ctx, lids[li], 8, 24 + li * 68, 'bone');
          for (var lk = 0; lk < 8; lk++) for (var lp = 0; lp < 2; lp++) ctx.drawImage(UWl.lureImg(lids[li], lk * 2, lp), 60 + (lk * 2 + lp) * 36, 30 + li * 68, 33, 33);
        }
      } else if (name === 'fx') {
        // The particles are drawn in world pixels, as the sailing scene draws them.
        ctx.setTransform(2, 0, 0, 2, 0, 0);
        ctx.fillStyle = P.water_dark;
        ctx.fillRect(0, 110, 320, 70);
        G.gfx.fx.draw(ctx, 0, 0);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        F.drawText(ctx, 'splash', 100 - (F.measure('splash') >> 1), 344, 'fog_mid');
        F.drawText(ctx, 'wake', 260 - (F.measure('wake') >> 1), 344, 'fog_mid');
        F.drawText(ctx, 'bubbles', 420 - (F.measure('bubbles') >> 1), 240, 'fog_mid');
        F.drawText(ctx, 'dust', 560 - (F.measure('dust') >> 1), 160, 'fog_mid');
        F.drawText(ctx, 'live ' + G.gfx.fx.count() + '/' + G.gfx.fx.MAX, 8, 24, 'fog_light');
      }
    }

    return { native: true, enter: enter, exit: function () { G.gfx.fx.clear(); }, update: update, draw: draw };
  })();

  return { on: on, addLine: addLine, log: log, error: error, dbg: dbg, gallery: gallery };
})();
