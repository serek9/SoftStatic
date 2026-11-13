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
    // dbg.line(id) spools on line type id ('mono', 'fluoro', 'braid'), owning it if needed
    // (Phase 53); dbg.line() reads the line and what it does.
    line: function (id) {
      var save = G.state.save, E = G.sim.economy;
      if (id !== undefined) {
        if (E.lineTypeById(id, G.data).id !== id) return 'line types: ' + G.data.gear.lineTypes.map(function (t) { return t.id; }).join(', ');
        if (!E.ownsLineType(save, id)) save.gear.lineTypes.push(id);
        E.useLineType(save, id); G.core.save.autosave('line');
      }
      var fx = E.effects(save, G.data, {});
      return { type: fx.lineType, owned: save.gear.lineTypes.slice(), strength: fx.lineStrength, rise: fx.lineRise, shake: fx.lineShake, hold: fx.lineHold, seen: fx.lineSeen, feel: fx.lineFeel, sinkG: G.gfx.rope.K.waterG };
    },
    // dbg.storm(k) holds a storm at k (0..1), dbg.storm(null) gives it back to the clock, and
    // dbg.storm() reads it: k, flashes, thunders heard, the next flash, the flash now (Phase 55).
    // dbg.flash() flashes lightning now (its thunder follows).
    storm: function (k) { if (k !== undefined) G.scene.sailing.stormForce(k); return G.scene.sailing.storm(); },
    flash: function () { return G.scene.sailing.stormFlash(); },
    // dbg.release(): the last fish let go from the card (Phase 51): its swing's time, whether
    // it has left his hand, how long since it went in, where it is, and how many so far.
    release: function () { return G.scene.sailing.release(); },
    // dbg.land() wins the current fight on the next step.
    // (tired, so an un-reeled step cannot push D back up before the win check)
    land: function () { var F = G.state.run.fight; if (!F.active) return false; F.D = 0; F.mode = 'tired'; F.modeT = 9; return true; },
    // dbg.rod(kg) overrides the rod's mass limit (D4) for testing; dbg.rod(0) restores it.
    rod: function (kg) { return G.scene.sailing.setRodMax(kg); },
    // dbg.snow(true) buys the Snow Machine (Phase 80); dbg.snow() reads the ice's gear and whether
    // the chart opens the ice: {snow, iceRod, rods, seaSeen, iceAll, unlock (economy's verdict)}.
    snow: function (buy) {
      var E = G.sim.economy, s = G.state.save, r = buy ? E.buySnow(s, G.data) : -1;
      if (r === E.OK) G.core.save.autosave('purchase');
      return { bought: r, snow: !!s.gear.snow, iceRod: s.gear.iceRod, rods: s.gear.rods.slice(), seaSeen: !!s.flags.seaSeen, iceAll: E.iceAll(s, G.data), unlock: ['ok', 'open', 'poor', 'locked', 'unknown'][E.canUnlock(s, 'tamarack', G.data)] };
    },
    // dbg.ice() (Phase 81): on the ice, the holes {x, catches, freezing 0..1, n}, the one he is
    // at and the one he fishes, the drill (0..1, -1 idle), and drilled, frozen and catches; null elsewhere.
    ice: function () { return G.scene.sailing.ice(); },
    // dbg.winter() (Phase 82): on the ice, the snow's fall (0..1), the blizzard (the storm, 0..1),
    // the flakes drawn last frame, and the flashes and thunder (none on the ice); null elsewhere.
    winter: function () { return G.scene.sailing.winter(); },
    // dbg.money(n) adds n coins (negative takes them); returns the balance.
    money: function (n) { G.state.save.coins = Math.max(0, G.state.save.coins + (n || 0)); return G.state.save.coins; },
    // dbg.buy(kind) buys the next 'rod' | 'reel' | 'line', or dbg.buy('bait', id, n).
    buy: function (kind, id, n) {
      var E = G.sim.economy, save = G.state.save;
      var r = kind === 'bait' || kind === 'lure' ? E.buyBait(save, id, n || 10, G.data) : (kind === 'rod' && id !== undefined ? E.buyRod(save, +id, G.data) : E.buy(save, kind, G.data));
      if (kind === 'lure') kind = 'bait'; // Phase 43: dbg.buy('lure', 'spinnerbait', 3); dbg.buy('rod', 5) buys the wand
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
    // Phase 50.1: dbg.tackle(rod, hook) also puts an owned rod (index or id) in hand and a hook
    // you have (bait or lure id) on, as the setup panel would (null or undefined leaves one as
    // it is), saves, and lets the fisher play the act for it; refused gear is named in `refused`.
    useRod: function (i) { var r = G.sim.economy.useRod(G.state.save, +i, G.data); return r === G.sim.economy.OK ? G.data.gear.rods[+i].name : 'not owned'; },
    tackle: function (rod, hook) {
      var s = G.state.save, E = G.sim.economy, refused = [], g = s.gear, rod0 = g.rod, hook0 = g.bait;
      if (rod !== undefined && rod !== null) {
        var ri = typeof rod === 'string' ? G.data.gear.rods.map(function (r) { return r.id; }).indexOf(rod) : +rod;
        if (E.useRod(s, ri, G.data) !== E.OK) refused.push('rod ' + rod);
      }
      if (hook !== undefined && hook !== null) {
        var b = E.baitById(hook, G.data);
        if (!b || !(b.unlimited || s.baits[b.id] > 0)) refused.push('hook ' + hook); else g.bait = b.id;
      }
      if (g.rod !== rod0 || g.bait !== hook0) { E.effects(s, G.data, G.state.run.gearFx); G.scene.sailing.queueTackle(g.rod !== rod0, g.bait !== hook0); G.core.save.autosave('setup'); }
      var o = dbg.tackleNow();
      if (refused.length) o.refused = refused;
      return o;
    },
    // dbg.tackleNow(): the rack and the hook, without changing anything.
    tackleNow: function () { var s = G.state.save, fx = G.state.run.gearFx; return { rods: s.gear.rods.slice(), rod: s.gear.rod, bait: s.gear.bait, lure: fx.lure, swim: fx.swim, counts: JSON.parse(JSON.stringify(s.baits)), smallHook: fx.smallHook, smallBoost: fx.smallBoost }; },
    // dbg.bark(why) asks the dog for a bout (Phase 42: 'jump', 'catch', 'bell', 'bird', 'cue'; with
    // no argument the next idle bout comes in 1 s); returns its voice: bouts, woofs said, s since
    // the last bout, s to the next idle one, the last reason, and the setting.
    bark: function (why) {
      var d = G.state.run.dog;
      if (why) G.scene.dog.request(d, why); else d.voiceT = 1;
      return { bouts: d.bouts, said: d.said, since: +d.since.toFixed(1), next: +d.voiceT.toFixed(1), last: d.last, want: d.want, on: G.state.save.settings.dogBark !== false };
    },
    // dbg.look(f, d) sets the fisher's and the dog's looks by id (Phase 50.1; null leaves one
    // as it is), bakes them and saves; returns save.look and the ids it refused. dbg.look() lists the ids.
    look: function (f, d) {
      var LK = G.data.looks, ids = function (l) { return l.map(function (r) { return r.id; }); };
      var now = function () { return { fisher: G.ui.look.info().fisher, dog: G.ui.look.info().dog }; };
      if (f === undefined && d === undefined) return { look: now(), fishers: ids(LK.fishers), dogs: ids(LK.dogs) };
      var refused = [], changed = false, r;
      if (f !== undefined && f !== null) { r = G.ui.look.set('fisher', f); if (r < 0) refused.push('fisher ' + f); else if (r > 0) changed = true; }
      if (d !== undefined && d !== null) { r = G.ui.look.set('dog', d); if (r < 0) refused.push('dog ' + d); else if (r > 0) changed = true; }
      if (changed) G.core.save.autosave('look');
      var o = { look: now() };
      if (refused.length) o.refused = refused;
      return o;
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
      var hm = G.data.homeOf(G.data.fish[sp], run.school.ctx.loc, run.school.ctx.reach) || G.data.fish[sp].homes[0], h = hm.habitat; // Phase 75: its home here
      return !!G.sim.fish_ai.spawn(run.school, sp, run.lureIn.x - 60, (h.depthMin + h.depthMax) * 2, 1, G.rng, G.data);
    },
    // dbg.cast(charge) casts at once with charge 0..1 (default 0.3); returns the landing x.
    cast: function (charge) { return G.scene.sailing.forceCast(charge === undefined ? 0.3 : charge); },
    // dbg.lure(m, x) puts an underwater lure at m metres (clamped to the bottom), optionally at world x.
    lure: function (m, x) {
      var sc = G.scene.sailing;
      return G.scene.underwater.setLure(G.state.run, sc.loc(), m, x);
    },
    // dbg.bed() reads what the lake bed holds here (2026-11-04): counts of each structure, where
    // the sunken rowboat lies, the bed behind's width and parallax, and the depth tint's steps.
    bed: function () {
      var U = G.scene.underwater, set = U.prepare(G.scene.sailing.loc());
      return { counts: set.bedCount, boatAt: set.boatAt === undefined ? null : Math.round(set.boatAt), back: { w: set.backW, parallax: U.BED.BACK_P, alpha: U.BED.BACK_A }, tint: { stepM: U.BED.TINT_STEP * 0.25, per: U.BED.TINT_PER, max: U.BED.TINT_MAX } };
    },
    // dbg.tp(x) moves the boat to world x, stops it and snaps the camera.
    tp: function (x) { return G.scene.sailing.tp(x); },
    // dbg.caught(n) records one catch of each of the first n species in the journal (no coins).
    caught: function (n) {
      var save = G.state.save, list = G.data.fish;
      for (var i = 0; i < Math.min(n || list.length, list.length); i++) {
        var sp = list[i];
        G.sim.economy.recordCatch(save, { id: sp.id, len: sp.lengthCm[0], w: sp.weightKg[0], price: 0, windowCatch: null }, 'sell');
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
    // Phase 52: passive mode and time away are gone, and dbg.passive, dbg.away and dbg.tape with them.
    passive: function () { return 'passive mode was removed in Phase 52'; },
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
    // flutter 0..1, its velocity (px/s) and the current at it (Phase 22); Phase 69: action,
    // the lure's action (mid, dive, top, lift, float, flutter, dropshot, wacky, glide, or its
    // vary: rattle, kick), or 'bait' for a live bait.
    lureBody: function () { return G.scene.underwater.body(); },
    // dbg.fishLooks() (Phase 70): which species the real-fish painter paints (data/fishlooks.js)
    // and which still have a placeholder look, by id.
    fishLooks: function () { var r = G.gfx.fishgen.fishLooks(); r.counts = r.painted.length + ' painted, ' + r.placeholder.length + ' placeholder'; return r; },
    // dbg.who() (Phase 68): which species can bite here and now, from the same weights the
    // school spawns by (fish_ai.speciesWeights over the current cast's context): the water, the
    // lure's depth, the hour, what is on the hook and the rod. Each: {id, chance (share of the
    // total), weight}; with tooHeavy, the species the rod cannot hold. Phase 75: in the reach the
    // lure is in (or the boat, with no line out), which it names.
    // Phase 101 (PLAN_FISHING.md): the turn: the suitor (the one fish allowed at the lure), the
    // holders waiting their turn, and the fish within 24 px of the lure (never more than one).
    school: function () {
      var run = G.state.run, sc = run.school, L = run.lureIn, out = { suitor: null, holders: [], near: 0, gap: 0 };
      if (!sc) return out;
      out.gap = +sc.gapT.toFixed(2);
      sc.fish.forEach(function (f) {
        if (!f.active) return;
        var o = { id: G.data.fish[f.sp].id, state: f.state, dist: L && L.active ? +Math.hypot(f.x - L.x, f.y - L.y).toFixed(1) : null };
        if (f.uid === sc.suitor) out.suitor = o;
        if (f.state === 'hold') out.holders.push(o);
        if (o.dist !== null && o.dist < 24 && f.state !== 'leave') out.near++;
      });
      return out;
    },
    // Phase 102: the last strike: style, the lunge's start off the lure (px) and length (s), where
    // (x, depth m), the species, the lure in the mouth now, the burst's time left, and its sound.
    strike: function () {
      var st = G.scene.underwater.strike(), run = G.state.run, au = G.audio.engine.info();
      return { n: st.n, style: st.style, off: st.off, lunge: st.lunge, x: st.x, depthM: st.y, species: st.sp, inMouth: G.scene.underwater.lureTaken(run), burst: +st.t.toFixed(2), sound: au.strike || null };
    },
    // Phase 103: the bail: open (line paying out), line given this cast (px), the line now from
    // the rod tip to the lure (px), its cap (the rod's cast length + 40), the lure's depth (m).
    bail: function () {
      var run = G.state.run, c = run.cast, loc = G.scene.sailing.loc(), tip = [0, 0];
      G.scene.boat.rodTip(run.boat, run.boat.x, loc.waterY, tip);
      return { open: !!c.free, given: +(c.lineOut || 0).toFixed(1), line: +Math.hypot(c.x1 - tip[0], c.ly - tip[1]).toFixed(1), cap: run.gearFx.castMax + 40, x: +c.x1.toFixed(1), depthM: +((c.ly - loc.waterY) * 0.25).toFixed(2), fsm: run.fsm };
    },
    // Phase 104: how the hook in the water moves now (underwater.motionStep) and its profile (MOVE).
    lureMotion: function () {
      var run = G.state.run, m = run.cast.m, mv = G.scene.underwater.moveOf(run), o = { hook: run.cast.bait || run.gearFx.bait, profile: mv, fsm: run.fsm };
      if (m) { o.speed = +m.speed.toFixed(2); o.vy = +m.vy.toFixed(2); o.falling = m.falling; o.onBed = m.onBed; o.still = +m.still.toFixed(2); o.runT = +m.runT.toFixed(2); o.surface = m.surface; o.flash = m.flash; o.thump = m.thump; o.live = m.live; o.bedT = +m.bedT.toFixed(2); o.bedN = m.bedN || 0; }
      return o;
    },
    who: function () {
      var run = G.state.run, ctx = run.school && run.school.ctx;
      if (!ctx) return 'no school yet';
      var lc = ctx.loc || G.state.save.loc, L = G.data.locations[lc], rx = run.lureIn && run.lureIn.active ? run.lureIn.x : run.boat.x, rid = G.data.reachAt(L, rx);
      var rn = ''; (L.reaches || []).forEach(function (r) { if (r.id === rid) rn = r.name; });
      var c = { species: ctx.species, loc: lc, reach: rid, depthM: run.lureIn && run.lureIn.active ? run.lureIn.y * 0.25 : null,
        hour: G.state.save.clock, bait: run.gearFx.bait, lure: run.gearFx.lure, rodMaxMass: run.gearFx.maxMass,
        smallBoost: run.gearFx.smallBoost, smallMass: run.gearFx.smallMass, weights: null,
        motion: run.lureIn && run.lureIn.active && run.lureIn.m ? run.lureIn : null, school: run.school }; // Phase 105: weighed by how the hook moves now
      var total = G.sim.fish_ai.speciesWeights(c), out = [], heavy = [];
      for (var i = 0; i < c.species.length; i++) {
        var sp = c.species[i];
        if (c.weights[i] > 0) out.push({ id: sp.id, chance: +(c.weights[i] / total).toFixed(3), weight: +c.weights[i].toFixed(3), appeal: c.motion ? +G.sim.fish_ai.appeal(sp, c.motion, run.school).toFixed(2) : null });
        else if (G.data.homeOf(sp, c.loc, c.reach) && sp.mass > c.rodMaxMass && G.sim.fish_ai.weightOf(sp, c) > 0) heavy.push(sp.id);
      }
      out.sort(function (a, b) { return b.chance - a.chance; });
      return { loc: c.loc, reach: rn, hook: c.bait, depthM: c.depthM, hour: +c.hour.toFixed(2), species: out, tooHeavy: heavy };
    },
    // dbg.fishBody(i) returns a swimmer's body (Phase 27): school slot i (0..7) or 'hook'.
    // face, turn (0 none, else 0..1 through it), beatHz, phase 0..1, glide, pitch (slope,
    // head down positive when swimming its way), frame (fishgen.FR), speed and vy (px/s),
    // len (world px); null when the slot is empty.
    fishBody: function (i) { return G.scene.underwater.fishBody(i === undefined ? 0 : i); },
    // dbg.life() returns the life under water (Phase 48): crayfish (x, depth, walk/rest/back,
    // a pending reaction), snails, the clouds (how far the furthest member is from its place,
    // seconds since anything came near, overlapping pairs), the visitors, silt, timings.
    // dbg.lifeSpawn('turtle' | 'eel' | 'dart') brings a visitor now.
    life: function () { return G.scene.life.state(); },
    lifeSpawn: function (kind) { return G.scene.life.spawn(kind); },
    // dbg.lifeAbove() returns the life above the water (Phase 49): each creature of this water's
    // table with its alpha, place, px from the boat on screen and what it is doing; the liminal
    // touches (lim 0..1, ducks facing the boat, the heron standing still, the deer's missing
    // reflection) and how often each act has happened. dbg.lifeShowing() lists who is seen now.
    // dbg.lifeSpawn also takes 'ducks', 'heron', 'kingfisher', 'loon', 'frog', 'deer', 'beaver',
    // 'fox' (out now, in their hours) and 'strike', 'duckdive', 'loondive', 'kingdive', 'call' (the loon's).
    lifeAbove: function () { return G.scene.life.above(); },
    lifeShowing: function () { return G.scene.life.showing(); },
    // dbg.shore() returns, for each layer of this water, the kinds its painter painted (trees,
    // the shore's things) and the ms its first bake took (Phase 49).
    shore: function () { return G.scene.sailing.painted(); },
    // dbg.sea() (Phase 79): at sea, the swell (its height now, the water's own, the clamp, the
    // storm), the tide (px and m up the rocks, rising or falling, the next high water) and the
    // lighthouse's beam (lit, the lamp, its angle, which way it points, its length, the flash);
    // null on fresh water.
    sea: function () { return G.scene.seas ? G.scene.seas.sea() : null; },
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
    // dbg.dock(): Phase 67, the pier and the boat; dbg.dock(i) chooses row i of its open panel.
    // dbg.bite(): the user's fixes: how the fish at the lure takes it (style, the feel, the tip's load now), or null.
    bite: function () { return G.scene.sailing.biteFeel(); },
    dock: function (i) { if (i !== undefined) return G.ui.dock.choose(i); return G.ui.dock.info(); },
    // dbg.mapNav(): Phase 66, the map's arrows checked from every stop.
    mapNav: function () { return G.ui.map.nav(); },
    // dbg.roomLife(): Phase 64, the live things in the room you are in (the shop or the cabin).
    roomLife: function () { var n = G.core.state.sceneName(); return n === 'shop' ? G.ui.shopRoom.life() : (n === 'cabin' ? G.ui.cabin.life() : 'not in a room'); },
    // dbg.pond(): Phase 84, the Back Pond: the trash left by kind and in all, where each piece
    // still lies ([i, kind, x]), the meter [done, of], the stream, how far the water has cleared,
    // the murk, whether it is clean; Phase 85 adds the stock and Pond Cam. dbg.pond('stream')
    // pays to clear the stream (as the panel at its lip does). Phase 85: dbg.pond('stock', id, cls)
    // stocks one as the journal's STOCK row does (returns its verdict); dbg.pond('sizes', id)
    // reads what the journal holds of the species' sizes and what it comes in.
    pond: function (what) {
      var p = G.state.save.pond, Pd = G.sim.pond, D = G.data.pond, o, i;
      if (!p) return null;
      if (what === 'stock' || what === 'sizes') {
        var si = -1; for (i = 0; i < G.data.fish.length; i++) if (G.data.fish[i].id === arguments[1]) si = i;
        if (si < 0) return 'no species ' + arguments[1];
        if (what === 'sizes') return { caught: Pd.caughtSizes(G.state.save, G.data.fish[si], G.data), comesIn: Pd.wanted(G.data.fish[si], G.data), verdict: Pd.canStock(G.state.save, G.data.fish[si], G.data) };
        var rr = Pd.stock(G.state.save, si, arguments[2], G.data); if (rr === Pd.OK) G.core.save.autosave('stock'); return rr;
      }
      if (what === 'stream') { var r = Pd.clearStream(G.state.save, G.data); if (r === Pd.OK) G.core.save.autosave('purchase'); return r; }
      o = { trash: {}, left: Pd.left(p, G.data), pieces: [], meter: [Pd.done(p, G.data), Pd.parts(G.data)], stream: p.stream, clear: +p.clear.toFixed(3), murk: +Pd.murk(p, G.data).toFixed(3), clean: Pd.clean(p, G.data) };
      for (i = 0; i < D.kinds.length; i++) o.trash[D.kinds[i].id] = Pd.left(p, G.data, D.kinds[i].id);
      for (i = 0; i < D.pieces.length; i++) if (!Pd.has(p, i)) o.pieces.push([i, D.pieces[i][0], D.pieces[i][1]]);
      o.stock = p.stock.map(function (f) { return [f.id, f.cls, f.w, f.len, +f.shy.toFixed(3)]; }); o.cap = Pd.capOf(G.data); // Phase 85
      o.caughtOwn = p.caught || 0; o.watch = +(p.watch || 0).toFixed(1);
      return o;
    },
    // dbg.cabinWalk('UDLR'): Phase 83, walks him round the cabin a tile a step (R off the tile inside the back door goes out to the pond).
    cabinWalk: function (path) { return G.core.state.sceneName() === 'cabin' ? G.ui.cabin.walkPath(path || '') : 'not in the cabin'; },
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
    // dbg.device() (Phase 57): touch mode, the viewport, the fit and how much of the screen it
    // fills, the safe insets, portrait, full screen (asked once, its result) and the audio's state.
    device: function () { return G.core.device.report(); },
    fightRun: function (on) { return G.scene.underwater.fightRun(on); }, // Phase 89
    // Phase 94: the milestones (each done or its progress, this sitting's counts, the queue); the badge now.
    milestones: function () { return G.ui.milestones.info(); },
    badge: function () { return G.ui.badge.info(); },
    rest: function (part) { return part === undefined ? G.ui.cabin.restInfo() : G.ui.cabin.restUntil(part); }, // Phase 93.1: rest until 'dawn' | 'day' | 'dusk' | 'night'
    tips: function (reset) { return reset ? G.ui.tips.reset() : G.ui.tips.info(); }, // Phase 88
    controls: function () { return G.ui.controls.check(); }, // Phase 88.5: every action has a row
    // Phase 90 (PLAN_PLAYABILITY.md 90.1-90.2): the UI layer's sizes in CSS px against the
    // targets: capitals >= 9, thumb buttons and the touch controls >= 44, tappable rows >= 28.
    // Opens what it measures (the card is measured from its layout without a fish).
    uiCheck: function () {
      var U = G.ui.panel, c = U.css(), out = [], ok = true, L = G.core.input.layout(), i;
      function want(name, px, min) { var v = +(px * c).toFixed(1); out.push(name + ' ' + v + (v >= min ? ' >= ' : ' < ') + min); if (v < min) ok = false; }
      if (!G.core.device.touch()) return { touch: false, note: 'touch mode is off: a PC keeps the keyboard sizes' };
      want('capitals', 7, 9);
      for (i = 0; i < L.buttons.length; i++) if (L.buttons[i].on) want(L.buttons[i].act + ' key', Math.min(L.buttons[i].w, L.buttons[i].h), 44);
      for (i = 0; i < L.pad.length; i++) if (L.pad[i].on) want(L.pad[i].act + ' pad', Math.min(L.pad[i].w, L.pad[i].h), 44);
      if (L.act.on) want('action button', L.act.w, 44);
      want('card keys', U.btnH(), 44);
      want('list rows', U.rowH(), 28);
      return { touch: true, pass: ok, layout: L.mode, sizes: out };
    },
    // dbg.budget(n) holds the phone's frame budget at n (0 full, 1, 2; Phase 60.1), dbg.budget(null)
    // gives it back to the frame rate, dbg.budget() reads it.
    budget: function (n) { return G.core.device.budget(n); },
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
    var PORTRAITS_PER = 20, PCW = 126, PCH = 84; // Phase 70: 5 columns × 4 rows, each portrait at its native size (at most 104×60)

    function enter() {
      var FG = G.gfx.fishgen, i;
      pages = ['palette', 'font'];
      if (FG && G.data.fish) {
        for (i = 0; i < G.data.fish.length; i += PORTRAITS_PER) pages.push('fish:' + i); // Phase 70: the portraits
        for (i = 0; i < G.data.fish.length; i += SPECIES_PER) pages.push('swimmers:' + i);
      }
      pages.push('small', 'swim', 'sprites', 'baits', 'lures', 'lure swim:0', 'lure swim:12', 'fx', 'shop', 'panel', 'fishers', 'dogs', 'looks top'); // small: Phase 44; panel: Phase 46; looks: Phase 47
      pages.push('tackle', 'setup', 'life under', 'bed', 'life above', 'shore'); // Phase 50.1
      pages.push('touch', 'notice'); // Phase 60.2: the phone's controls; the portrait notice and the icon
      pages.push('ui'); // Phase 90.5: the shared button's states, the three text sizes, the icons, the rows
      pages.push('badge'); // Phase 94.3: the size badge in every size, a record, the trophy rim; the medallions; the milestones' marks
      page = 0; t = 0;
    }

    function update(dt) {
      var inp = G.core.input;
      if (inp.pressed('right')) page = (page + 1) % pages.length;
      if (inp.pressed('left')) page = (page + pages.length - 1) % pages.length;
      t += dt;
      // Phase 50.1: the setup page shows the real panel, opened over the page and shut off it.
      if ((pages[page] === 'setup') !== G.ui.setup.isOpen()) { if (G.ui.setup.isOpen()) G.ui.setup.close(); else G.ui.setup.open(); }
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
    // species index (Phase 72: the parts on bare bases went with the old painter).
    function art(sp, base, fr, sil, flip) { return G.gfx.fishgen.swimmer(sp, fr, sil, flip); }
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

    // Phase 50.1: the shore page, baked once: each of the shore's things on a strip of bank
    // and water, and every kind of tree in each forest's keys (Phase 74: the Red Room's floor things are gone).
    function shoreBake() {
      return G.gfx.bake.layer(640, 340, function (c) {
        var A = G.gfx.paint, P = G.gfx.sprites.PALETTE, F = G.gfx.sprites.fine, R = new G.core.rng.Rng(50), i, x;
        var L0 = { height: 6 }, wy = 104;
        A.reset();
        c.fillStyle = P.dusk_violet; c.fillRect(0, 0, 640, wy);
        c.fillStyle = P.water_mid; c.fillRect(0, wy, 640, 22);
        A.box(c, 'rock_dark', 0, wy - 6, 640, 6);
        var TH = [['posts', 20, { n: 4 }], ['moored', 120, {}], ['lodge', 200, {}], ['duckbox', 270, {}]];
        for (i = 0; i < TH.length; i++) { var f = TH[i][2]; f.kind = TH[i][0]; f.x = TH[i][1]; A.SHORE_THINGS[f.kind](c, f, wy, L0, R); }
        A.trunk(c, 340, wy, L0, R); A.cattails(c, 420, wy, R); A.cattails(c, 440, wy, R);
        for (i = 0; i < 4; i++) A.pad(c, 490 + i * 16, wy + 3, R);
        var LB = ['posts', 'moored', 'lodge', 'duckbox', 'trunk', 'cattails', 'pads'], LX = [20, 106, 186, 262, 330, 418, 500];
        A.reset();
        for (i = 0; i < LB.length; i++) F.drawText(c, LB[i], LX[i], wy + 26, 'fog_light');
        // The trees: every kind in the first forest layer's keys of each water that has one.
        var ty = 236, col = 0, ids = ['fog', 'creek', 'pines'];
        c.fillStyle = P.night_deep; c.fillRect(0, 140, 640, 110);
        for (var li = 0; li < ids.length; li++) {
          var lays = G.data.locations[ids[li]].layers, fl = null;
          for (var q = 0; q < lays.length && !fl; q++) if (lays[q].kind === 'forest') fl = lays[q];
          if (!fl) continue;
          for (var kind in A.TREES) {
            var keys = fl.keys[kind] || fl.keys[{ spruce: 'pine', dead: 'pine', poplar: 'round' }[kind]] || fl.keys.pine || fl.keys.round;
            x = 14 + col * 35; A.TREES[kind](c, x, ty, 70, keys, R); A.reset();
            F.drawText(c, kind.slice(0, 5), x - 10, ty + 2, 'fog_mid');
            col++;
          }
        }
        A.reset();
      });
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
        // Phase 70: every species' portrait at its native size, as the journal's plate shows it,
        // on the plate's colour; the name, and whether the real painter or a placeholder drew it.
        var p0 = +arg, fsh = G.data.fish;
        for (var pi = p0; pi < Math.min(fsh.length, p0 + PORTRAITS_PER); pi++) {
          var pc = pi - p0, pcx = 4 + (pc % 5) * (PCW + 1), pcy = 18 + Math.floor(pc / 5) * (PCH + 1), pim = FG.portrait(pi, 104, 60, false);
          ctx.fillStyle = P.night_deep; ctx.fillRect(pcx, pcy, PCW, PCH);
          ctx.drawImage(pim, pcx + ((PCW - pim.width) >> 1), pcy + 2 + ((62 - pim.height) >> 1));
          F.drawText(ctx, fsh[pi].name, pcx + 3, pcy + PCH - 21, FG.specFor(pi) ? 'bone' : 'fog_mid');
          F.drawText(ctx, (FG.specFor(pi) ? '' : 'placeholder  ') + pim.width + 'x' + pim.height, pcx + 3, pcy + PCH - 11, 'fog_mid');
        }
      } else if (name.indexOf('swimmers:') === 0) {
        var start = +arg, fish = G.data.fish;
        for (var s = start; s < Math.min(fish.length, start + SPECIES_PER); s++) {
          var cell = s - start;
          swimCell(ctx, s, '', FG.SWIM_FRAMES, fish[s].id + ' ' + FG.swimmer(s, 0, false, false).width, 8 + (cell % 4) * 158, 20 + Math.floor(cell / 4) * 66, 158, 66);
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
        // Phase 27: a swimmer's frames in a row: rest, tail away, tail near, the two turn frames,
        // then the beat and a full turn playing. Phase 72: one species of each build (were the body plans).
        var FRN = ['rest', 'away', 'near', 'turn1', 'turn2', 'roll', 'shake'], FRS = [0, 1, 3, 4, 5, 6, 7]; // roll, shake: Phase 29
        var SWIM_IDS = ['yellow_perch', 'northern_pike', 'common_carp', 'rainbow_trout', 'burbot', 'channel_catfish', 'white_sturgeon', 'pacific_halibut'];
        for (var bb = 0; bb < SWIM_IDS.length; bb++) {
          var y1 = 20 + bb * 40, base = G.data.fish.findIndex(function (f) { return f.id === SWIM_IDS[bb]; });
          F.drawText(ctx, SWIM_IDS[bb].slice(0, 12), 8, y1 + 14, 'fog_light');
          for (var fi = 0; fi < 7; fi++) ctx.drawImage(FG.swimmer(base, FRS[fi], false, false), 64 + fi * 64, y1);
          var cyc = Math.floor(t * 4) % 8, TURN = [4, 5, 5, 4]; // the beat four times, then a turn
          ctx.drawImage(cyc < 4 ? FG.swimmer(base, FG.BEAT[cyc], false, false) : FG.swimmer(base, TURN[cyc - 4], false, cyc >= 6), 528, y1);
          if (bb === 0) for (fi = 0; fi < 7; fi++) F.drawText(ctx, FRN[fi], 64 + fi * 64, 344, 'fog_mid');
        }
      } else if (name === 'shop') {
        // Phase 40: the bait shop's room as baked, and its sprites: the fisher and the dog in
        // each facing and frame, Rusty's frames (down, side, his back). Phase 56: the room with
        // its back wall (384×300) and the larger sprites (G.ui.room: 32×48, the dog 40×32 from the side).
        var SR = G.ui.shopRoom, DS = ['down', 'up', 'right', 'left'];
        ctx.drawImage(SR.bake(), 4, 18);
        F.drawText(ctx, 'room (baked)', 4, 18, 'fog_mid');
        F.drawText(ctx, 'fisher', 394, 18, 'fog_mid'); F.drawText(ctx, 'dog', 500, 18, 'fog_mid');
        for (var di = 0; di < 4; di++) for (var fr2 = 0; fr2 < 3; fr2++) {
          ctx.drawImage(SR.sprite('fisher', DS[di], fr2), 394 + fr2 * 34, 26 + di * 48);
          ctx.drawImage(SR.sprite('dog', DS[di], [0, 1, 3][fr2]), 500 + fr2 * 46, 30 + di * 40);
        }
        F.drawText(ctx, 'rusty', 394, 222, 'fog_mid');
        for (fr2 = 0; fr2 < 4; fr2++) { ctx.drawImage(SR.sprite('rusty', 'down', fr2), 394 + fr2 * 34, 228); ctx.drawImage(SR.sprite('rusty', 'right', fr2), 394 + fr2 * 34, 278); }
        ctx.drawImage(SR.sprite('rusty', 'up', 0), 534, 228);
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
          var yy0 = kk ? 20 + 4 * 46 + li2 * 34 : 20 + li2 * 46, rec = KL[kk][1][li2];               // Phase 56: rows as tall as the sprites
          F.drawText(ctx, rec.name, 8, yy0 + 14, 'fog_light');
          for (var d2 = 0; d2 < 4; d2++) for (var f2 = 0; f2 < 3; f2++) ctx.drawImage(SRl.sprite(KL[kk][0], DS2[d2], KL[kk][2][f2], rec), 84 + (d2 * 3 + f2) * (kk ? 46 : 34) - (kk && d2 > 1 ? 0 : 0), yy0 - (kk ? 0 : 2));
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
        // Phase 73: every lure's icon at its native size (the shop's item panel), and painted at
        // the list's (16x14) and the HUD chip's (16x10) sizes; its sprite under water as drawn
        // (1x, heading right, frame 0) and its type, action and sizes. 6 columns x 4 rows.
        var LGg = G.gfx.luregen, lgl = G.data.gear.lures;
        ctx.imageSmoothingEnabled = false;
        for (var li = 0; li < lgl.length; li++) {
          var lx0 = 4 + (li % 6) * 106, ly0 = 20 + Math.floor(li / 6) * 85, lic = LGg.iconImg(lgl[li].id);
          ctx.fillStyle = P.fog_dark; ctx.fillRect(lx0, ly0, 102, 82);
          F.drawText(ctx, lgl[li].name, lx0 + 2, ly0 + 2, 'bone');
          ctx.drawImage(lic, lx0 + 2 + ((54 - lic.width) >> 1), ly0 + 12 + ((46 - lic.height) >> 1));
          var s1 = LGg.iconImg(lgl[li].id, 16, 14), s2 = LGg.iconImg(lgl[li].id, 16, 10), sp0 = LGg.spriteImg(lgl[li].id, 0, 0);
          ctx.drawImage(s1, lx0 + 60, ly0 + 14); ctx.drawImage(s2, lx0 + 80, ly0 + 16);
          ctx.fillStyle = P.water_mid; ctx.fillRect(lx0 + 58, ly0 + 32, 42, 28);
          ctx.drawImage(sp0, lx0 + 79 - (sp0.width >> 1), ly0 + 46 - (sp0.height >> 1));
          F.drawText(ctx, (lgl[li].vary || lgl[li].swim) + ' ' + lgl[li].sizes.join(''), lx0 + 2, ly0 + 61, 'fog_light');
          F.drawText(ctx, lic.width + 'x' + lic.height + '  ' + LGg.frames(lgl[li].id) + 'fr', lx0 + 2, ly0 + 71, 'fog_mid');
        }
      } else if (name.indexOf('lure swim:') === 0) {
        // Phase 73: the sprites under water at 2x: each frame of its action heading right, then
        // eight headings in frame 0 (the other eight are these mirrored). 12 lures a page.
        var LGs = G.gfx.luregen, lsl = G.data.gear.lures, l0 = +name.split(':')[1];
        ctx.fillStyle = P.water_mid; ctx.fillRect(0, 18, 640, 342);
        ctx.imageSmoothingEnabled = false;
        for (var si = l0; si < lsl.length && si < l0 + 12; si++) {
          var sy0 = 20 + (si - l0) * 28, nf = LGs.frames(lsl[si].id), sbx = 0;
          F.drawText(ctx, lsl[si].name, 4, sy0 + 4, 'bone');
          F.drawText(ctx, lsl[si].vary || lsl[si].swim, 4, sy0 + 14, 'fog_light');
          for (var sf = 0; sf < nf + 8; sf++) {
            var simg = sf < nf ? LGs.spriteImg(lsl[si].id, 0, sf) : LGs.spriteImg(lsl[si].id, (sf - nf) * 2, 0), sw2 = Math.min(simg.width * 2, 52);
            ctx.drawImage(simg, 96 + sbx, sy0 + 13 - (sw2 >> 1), sw2, sw2);
            sbx += sw2 + 2 + (sf === nf - 1 ? 10 : 0);
          }
        }
      } else if (name === 'tackle') {
        // Phase 50.1: the rack (each rod's blank straight in its own keys at 2×, with its numbers
        // and the panel's bars) and every hook (its body at rest and moving, ×3, who takes it).
        var RODS = G.data.gear.rods, AC = ['slow', 'moderate', 'mod-fast', 'fast', 'x-fast'], RLEN = G.gfx.rod.K.len * 2;
        F.bold(ctx, 'RODS', 8, 20, 'bone');
        for (var ri = 0; ri < RODS.length; ri++) {
          var rd = RODS[ri], ry1 = 34 + ri * 22, rx1 = 16;
          for (var rs = -9; rs < RLEN; rs++) { // cork, seat, blank (thick on its lower half), the guides
            var k1 = rs < -8 ? 'ink' : (rs < 2 ? 'wood_lit' : (rs < 5 ? 'stone_hi' : rd.look[0])), k2 = rs < -8 ? 'ink' : (rs < 2 ? 'wood_mid' : (rs < 5 ? 'stone_dark' : rd.look[1]));
            ctx.fillStyle = P[k1]; ctx.fillRect(rx1 + (rs + 9) * 2, ry1, 2, 2);
            if (rs < RLEN / 2) { ctx.fillStyle = P[k2]; ctx.fillRect(rx1 + (rs + 9) * 2, ry1 + 2, 2, 2); }
          }
          for (var gi = 0; gi < 5; gi++) { var gs = [0.22, 0.42, 0.6, 0.75, 0.88][gi] * RLEN; ctx.fillStyle = P.ink; ctx.fillRect(rx1 + (gs + 9) * 2, ry1, 2, 2); ctx.fillStyle = P.stone_lit; ctx.fillRect(rx1 + (gs + 9) * 2, ry1 + 4 + (gi < 1 ? 2 : 0), 2, 2); }
          F.drawText(ctx, rd.name, 140, ry1 - 3, 'fog_light');
          for (var bi2 = 0; bi2 < 6; bi2++) { ctx.fillStyle = P[bi2 <= ['ultralight', 'light', 'medium light', 'medium', 'medium heavy', 'heavy'].indexOf(rd.power) ? 'teal_lit' : 'fog_dark']; ctx.fillRect(232 + bi2 * 3, ry1 - 2, 2, 2); }
          for (bi2 = 0; bi2 < 5; bi2++) { ctx.fillStyle = P[bi2 <= rd.action ? 'signal_amber' : 'fog_dark']; ctx.fillRect(232 + bi2 * 3, ry1 + 2, 2, 2); }
          F.drawText(ctx, rd.power + ' / ' + AC[rd.action] + '  ' + rd.maxMass + 'kg  cast ' + rd.castMax + '  small x' + rd.smallHook + (rd.smallBoost > 1 ? ' +' + rd.smallBoost : '') + '  ' + rd.cost + 'c', 256, ry1 - 3, 'fog_mid');
        }
        var HK = G.data.gear.baits.concat(G.data.gear.lures), UWt = G.scene.underwater;
        F.bold(ctx, 'HOOKS', 8, 168, 'bone');
        ctx.fillStyle = P.water_mid; ctx.fillRect(0, 180, 640, 180);
        ctx.imageSmoothingEnabled = false;
        for (var hi = 0; hi < HK.length; hi++) { // Phase 69: 27 hooks, four columns of seven
          var hb = HK[hi], hx1 = 4 + (hi % 4) * 159, hy1 = 183 + Math.floor(hi / 4) * 25, takers = 0;
          for (var fi2 = 0; fi2 < G.data.fish.length; fi2++) if (G.data.fish[fi2].locations.length && G.sim.fish_ai.interest(G.data.fish[fi2], hb.id, !!hb.swim) > 0) takers++; // Phase 68
          ctx.drawImage(UWt.lureImg(hb.id, 0, 0), hx1, hy1, 24, 24);
          F.drawText(ctx, hb.label === false ? '(no label)' : hb.name, hx1 + 26, hy1 + 3, 'bone');
          F.drawText(ctx, (hb.swim ? (hb.vary || hb.swim) + ' ' + hb.sizes.join('') : (hb.unlimited ? 'endless' : 'bait')) + ' ' + hb.cost + 'c ' + takers + 'sp', hx1 + 26, hy1 + 13, 'fog_light');
        }
      } else if (name === 'setup') {
        // Phase 50.1: the setup panel itself (G.ui.setup, from this save) over sky and water.
        ctx.fillStyle = P.dusk_violet; ctx.fillRect(0, 18, 640, 170);
        ctx.fillStyle = P.water_mid; ctx.fillRect(0, 188, 640, 172);
        G.ui.setup.draw(ctx);
        var Rr = G.ui.setup.rect();
        F.drawText(ctx, 'the TACKLE panel from this save at [' + Rr.join(', ') + ']: the rods owned, every hook you have', 8, 344, 'fog_light');
      } else if (name === 'life under' || name === 'life above') {
        // Phase 50.1: Phases 48-49's sprites (every frame at 1x, then 4x, then flipped) and the
        // creatures drawn in code, posed from the gallery's own records (the live ones untouched).
        var LF = G.scene.life, SP = LF.sprites(), under = name === 'life under';
        var NAMES = under ? ['cray', 'snail', 'turtle', 'tad', 'crab', 'star'] : ['duck', 'duckling', 'duckUnder', 'kingfisher', 'loon', 'frog', 'deer', 'fox', 'gull', 'heron', 'osprey', 'eagle', 'otter', 'otterSit', 'seal', 'sealHead', 'sealSwim', 'cormorant', 'cormFly', 'cormSwim', 'moose']; // Phase 79: and the sea's; Phase 83: the moose
        var Z = under ? 4 : 3, cy0 = 20, cx0 = 8, rowH = 0;
        ctx.imageSmoothingEnabled = false;
        for (var ni = 0; ni < NAMES.length; ni++) {
          var sd = SP[NAMES[ni]], lab = NAMES[ni] + ' ' + sd.w + 'x' + sd.h + ' x' + sd.cv.length, cont = sd.cv.length * (sd.w + 1) + 4 + sd.cv.length * (sd.w * Z + 4) + sd.w * Z, cw2 = Math.max(F.measure(lab) + 12, cont + 16);
          if (cx0 + cw2 > 632) { cx0 = 8; cy0 += rowH; rowH = 0; }
          F.drawText(ctx, lab, cx0, cy0, 'fog_light');
          var ix = cx0, iy = cy0 + 12;
          ctx.fillStyle = P.water_dark; ctx.fillRect(cx0 - 2, iy - 2, cont + 4, sd.h * Z + 4);
          for (var sf = 0; sf < sd.cv.length; sf++) ctx.drawImage(sd.cv[sf], ix + sf * (sd.w + 1), iy);
          ix += sd.cv.length * (sd.w + 1) + 4;
          for (sf = 0; sf < sd.cv.length; sf++) { ctx.drawImage(sd.cv[sf], ix, iy, sd.w * Z, sd.h * Z); ix += sd.w * Z + 4; }
          ctx.drawImage(sd.fl[Math.floor(t * 3) % sd.cv.length], ix, iy, sd.w * Z, sd.h * Z);
          cx0 += cw2; rowH = Math.max(rowH, sd.h * Z + 22);
        }
        var by0 = cy0 + rowH + 4, G2 = LF.gallery, SKY = under ? 0 : 96; // the heron stands 22 world px tall
        ctx.fillStyle = P.dusk_violet; ctx.fillRect(0, by0, 640, SKY);
        ctx.fillStyle = P.water_dark; ctx.fillRect(0, by0 + SKY, 640, 360 - by0 - SKY);
        ctx.setTransform(4, 0, 0, 4, 0, 0); // world px at 2x the game's scale
        var wy4 = (by0 + (under ? 10 : SKY)) / 4;
        if (under) {
          G2.eel(ctx, 30, wy4 + 6, 1, t * 4);
          G2.eel(ctx, 80, wy4 + 6, -1, t * 4 + 1);
          ctx.fillStyle = P.water_foam; for (var fq = 0; fq < 12; fq++) ctx.fillRect(110 + (fq % 4) * 2.5, wy4 + 2 + (fq >> 2) * 1.5, 1.5, 0.5); // a fry cloud
          ctx.fillStyle = P.ink; for (fq = 0; fq < 12; fq++) ctx.fillRect(111 + (fq % 4) * 2.5, wy4 + 2 + (fq >> 2) * 1.5, 0.5, 0.5);
          var cvP = G.gfx.fishgen.shadow('yellow_perch', 34, G.gfx.fishgen.BEAT[Math.floor(t * 4) & 3], false); // Phase 72
          ctx.globalAlpha = 0.85; ctx.drawImage(cvP, 130, wy4 + 1, cvP.width / 2, cvP.height / 2); ctx.globalAlpha = 1;
        } else {
          var HP = [[0, 0], [1, 0], [2, 0.5], [2, 1], [3, 0]];
          for (var hp = 0; hp < HP.length; hp++) { G2.heron(ctx, 14 + hp * 18, wy4, HP[hp][0], HP[hp][1], t, false); G2.heron(ctx, 14 + hp * 18, wy4, HP[hp][0], HP[hp][1], t, true); }
          G2.beaver(ctx, 112, wy4, 0, 0); G2.beaver(ctx, 124, wy4, 1, 0.1);
          G2.dragonfly(ctx, 136, wy4 - 6, Math.floor(t * 30) & 1); G2.strider(ctx, 146, wy4 - 0.5);
          ctx.fillStyle = P.lamp_glow; ctx.globalAlpha = 0.3; ctx.fillRect(152, wy4 - 9, 7.5, 6); ctx.globalAlpha = 1; ctx.fillRect(155, wy4 - 7, 1.5, 1); // the moored boat's lantern
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        F.drawText(ctx, under ? 'eel (both ways), a fry cloud, the darting perch: 2x the game' : 'heron: stand, stalk, strike 0.5 and 1, fly; beaver, dragonfly, strider, lantern: 2x the game', 8, 344, 'fog_mid');
      } else if (name === 'bed') {
        // Phase 50.1: each water's bed things and new weeds on a short strip of bed, 2x the game.
        var LIDS = ['fog', 'creek', 'pines', 'harts']; // Phase 74: four of the nine waters fit the page
        ctx.imageSmoothingEnabled = false;
        for (var bl = 0; bl < LIDS.length; bl++) {
          var lc = G.data.locations[LIDS[bl]], T0 = G.scene.life.table(LIDS[bl]), yb = 20 + bl * 82;
          ctx.drawImage(G.scene.underwater.galleryBed(LIDS[bl]), 0, yb);
          F.drawText(ctx, lc.name + ': mussels ' + T0.mussel + (T0.caddis ? ', caddis' : '') + ', roots ' + T0.roots + ', tree ' + T0.tree + ', litter ' + (T0.litter.join(' ') || '-') + ', ribbon ' + T0.ribbon + ', fern ' + T0.fern + ', lilies ' + T0.lily + ', algae ' + T0.algae, 8, yb + 82 - 12, 'fog_light');
        }
      } else if (name === 'touch') {
        // Phase 60.2: the touch layout's pieces at the sizes for this screen (input.layout()):
        // the keys, the boat's pad and the rooms' cross (up and held), the round button with
        // every word it says (up, then held), and with none.
        var TP = G.ui.hud.touchParts, LY = G.core.input.layout(), bs = LY.bs, ps = LY.ps, ad = LY.ad, k, gx0;
        ctx.fillStyle = P.dusk_violet; ctx.fillRect(0, 18, 640, 170);
        ctx.fillStyle = P.water_mid; ctx.fillRect(0, 188, 640, 172);
        var KEYS = ['J', 'M', 'S', 'P', 'ESC'];
        for (k = 0; k < KEYS.length; k++) {
          gx0 = 8 + k * (bs + 6);
          TP.keyBox(ctx, gx0, 26, bs, bs, k === 3);
          F.drawText(ctx, KEYS[k], gx0 + ((bs - F.measure(KEYS[k])) >> 1), 26 + ((bs - F.FONT_H) >> 1), k === 3 ? 'signal_amber' : 'fog_light');
        }
        var pad = { x: 0, y: 0, w: ps, h: ps }, DIRS = ['left', 'right', 'up', 'down'];
        for (k = 0; k < 4; k++) {
          pad.x = 8 + k * (ps + 6); pad.y = 34 + bs;
          TP.keyBox(ctx, pad.x, pad.y, ps, ps, k === 1); TP.arrow(ctx, pad, DIRS[k], k === 1 ? 'signal_amber' : 'fog_light');
        }
        var WORDS = ['CAST', 'REEL', 'HOOK', 'SELL', 'KEEP', 'RELEASE', 'PICK', 'TALK', 'LOOK', 'PLAY', 'FIX', 'READ', 'TV', 'WARM', 'SIT', 'REST', 'USE', ''];
        for (k = 0; k < WORDS.length; k++) {
          var on = k === 2, col = k % 9, rw = Math.floor(k / 9), bx = 8 + col * (ad + 8), by = 196 + rw * (ad + 10);
          ctx.globalAlpha = WORDS[k] ? 0.85 : 0.4; ctx.drawImage(TP.round(ad, on), bx, by); ctx.globalAlpha = 1;
          if (WORDS[k]) F.bold(ctx, WORDS[k], bx + ((ad - F.measureBold(WORDS[k])) >> 1), by + ((ad - F.FONT_H) >> 1), on ? 'signal_amber' : 'bone');
        }
        F.drawText(ctx, 'keys ' + bs + ' px, pad ' + ps + ', button ' + ad + ' at ' + G.core.device.scale().toFixed(2) + ' CSS px a game px; held: P, the right arrow, HOOK', 8, 344, 'fog_light');
      } else if (name === 'ui') {
        // Phase 90.5 (PLAN_PLAYABILITY.md §7): the one button in its four states, at a PC's key
        // height and a thumb's; the three text sizes; the keys' icons with their words; a list's
        // chosen and hovered rows.
        var Un = G.ui.panel, ST = ['idle', 'chosen', 'pressed', 'disabled'], q;
        Un.frame(ctx, 8, 24, 300, 150, 'BUTTONS');
        for (q = 0; q < 4; q++) {
          Un.button(ctx, 'SELL 7c', 16 + q * 72, 48, 64, Un.KEY_H, q);
          Un.button(ctx, 'KEEP', 16 + q * 72, 70, 64, 30, q);
          F.drawText(ctx, ST[q], 16 + q * 72, 108, 'fog_mid');
        }
        Un.frame(ctx, 320, 24, 312, 150, 'TEXT');
        F.bold(ctx, 'Title: the bold weight', 328, 48, 'bone');
        F.drawText(ctx, 'Body: the fine font, 7 px capitals.', 328, 64, 'fog_light');
        F.drawText(ctx, 'Small: hints and old values.', 328, 80, 'fog_mid');
        F.drawText(ctx, 'Good', 328, 100, 'moss_lit'); F.drawText(ctx, 'Too dear', 370, 100, 'rust_hi'); F.drawText(ctx, '250c', 430, 100, 'signal_amber');
        var IA = ['journal', 'map', 'setup', 'pause', 'back'];
        Un.frame(ctx, 8, 186, 300, 80, 'ICONS');
        for (q = 0; q < IA.length; q++) { ctx.drawImage(G.ui.hud.touchParts.icon(IA[q]), 20 + q * 56, 210); F.drawText(ctx, G.ui.hud.touchParts.wordFor(IA[q], 60), 16 + q * 56, 228, 'fog_light'); }
        Un.frame(ctx, 320, 186, 312, 80, 'ROWS');
        Un.row(ctx, 326, 210, 140); F.drawText(ctx, 'Chosen row', 332, 210, 'signal_amber');
        ctx.fillStyle = P.night_deep; ctx.fillRect(326, 222, 140, 11); F.drawText(ctx, 'Hovered row', 332, 224, 'fog_light');
        Un.row(ctx, 480, 210, 140, 21); F.drawText(ctx, 'A thumb\'s row', 486, 210, 'signal_amber');
        F.drawText(ctx, 'UI layer ' + (Un.on() ? 'on' : 'off') + ', capitals ' + Un.textPx() + ' CSS px', 8, 344, 'fog_light');
      } else if (name === 'badge') {
        // Phase 94.3: a badge in each size class (the first five species with that class), a
        // record and a trophy; the medallions at the badge's, the journal's and the card's sizes;
        // the milestones' marks.
        var Bd = G.ui.badge, CL = G.data.SIZE_CLASSES, bi, sp0 = 0;
        for (bi = 0; bi < CL.length; bi++) {
          var spI = 0; for (var fi = 0; fi < G.data.fish.length; fi++) { var wk = G.data.fish[fi].weightKg; if (G.data.sizeClass(wk[1]) >= bi && G.data.sizeClass(wk[0]) <= bi) { spI = fi; break; } }
          Bd.preview(ctx, 8 + (bi % 3) * 210, 20 + Math.floor(bi / 3) * 84, 200, { sp: spI, cls: CL[bi].id, kind: 'NEW SIZE: ' + CL[bi].id, size: '31.2 cm   0.42 kg', was: bi ? 'was 24.0 cm' : 'the first', trophy: false });
          if (bi === 0) sp0 = spI;
        }
        Bd.preview(ctx, 428, 104, 200, { sp: sp0, cls: 'L', kind: 'NEW RECORD', size: '38.5 cm   0.81 kg', was: 'was 31.2 cm', trophy: true });
        for (bi = 0; bi < CL.length; bi++) { Bd.medal(ctx, CL[bi].id, 16 + bi * 52, 200, 44, false); Bd.medal(ctx, CL[bi].id, 16 + bi * 52, 250, 13, bi === 4); Bd.medal(ctx, CL[bi].id, 36 + bi * 52, 250, 15, false); }
        Bd.medal(ctx, 'XL', 290, 200, 44, true); F.drawText(ctx, 'trophy rim', 290, 248, 'fog_mid');
        var MK = Object.keys(G.ui.milestones.MARKS);
        for (bi = 0; bi < MK.length; bi++) { G.ui.milestones.mark(ctx, MK[bi], 16 + bi * 48, 290); F.drawText(ctx, MK[bi], 16 + bi * 48, 304, 'fog_mid'); }
        F.drawText(ctx, 'badge: every size, a record with the trophy rim; medallions at 44 px and 15 px (the journal tiles, the card corner); the milestones\' marks', 8, 344, 'fog_light');
      } else if (name === 'notice') {
        // Phase 60.2: the portrait notice as a phone held upright sees it, and the home-screen icon.
        ctx.fillStyle = P.dusk_violet; ctx.fillRect(0, 18, 640, 170);
        ctx.fillStyle = P.water_mid; ctx.fillRect(0, 188, 640, 172);
        ctx.fillStyle = P.night_ink; ctx.fillRect(6, 24, 100, 100);                        // its edge, on this page's sky
        ctx.drawImage(G.gfx.bake.cached('gallery:icon', function () { return G.core.device.paintIcon(96); }), 8, 26);
        F.drawText(ctx, 'the icon (32 x 32 in palette keys, 3x)', 112, 30, 'fog_light');
        G.core.device.drawNotice(ctx, true);
      } else if (name === 'shore') {
        // Phase 50.1: the shore's things and the trees, painted as the
        // layers paint them (baked once here, layer px = the game's view px).
        ctx.drawImage(G.gfx.bake.cached('gallery:shore', shoreBake), 0, 18);
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

    return { native: true, enter: enter, exit: function () { G.gfx.fx.clear(); }, update: update, draw: draw, page: function () { return pages[page]; } }; // page: Phase 50.1's checks
  })();

  return { on: on, addLine: addLine, log: log, error: error, dbg: dbg, gallery: gallery };
})();
