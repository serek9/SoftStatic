var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// First-time tips (Phase 88, PLAN_PLAYABILITY.md 88.1, 88.3, 88.4). One short line at a time,
// drawn small at the top of the picture under the reach's name, on a dark plate: a key cap
// (the key, or on a phone the word on the button) and what it does. Each tip shows until the
// player does the thing once, then never again (save.tipsDone, id -> true; read with defaults).
// The bite and the fight are said for the first FIGHTS fish landed (88.3): HOOK on a bite, and
// REEL or EASE with the fish (89.3), so a PC player sees the bite as the phone's button says it.
// While a lure is out and badly worked for WORK_S seconds, one line a cast says how to work it
// (88.4). Never over a panel or the card; off with the pause list's Tips row (settings.tips).
// Saves made before Phase 88 that have caught fish count the basics as done.
G.ui = G.ui || {};
G.ui.tips = (function () {
  var S = G.gfx.sprites, F = S.fine, P = S.PALETTE;
  var FIGHTS = 3, WORK_S = 3, LATE_S = 9;
  // The order they come in. when(run, save): whether it may show now; done(run, save, ev): whether
  // the player has just done it (ev: this step's events). pc / touch: [key cap, words].
  var TIPS = [
    { id: 'cast', pc: ['SPACE', 'hold to cast, let go to throw'], touch: ['CAST', 'hold the button, let go to throw'],
      when: function (r) { return r.fsm === 'sailing' && r.boat.stopped && !onIce(); }, done: function (r, s, ev) { return ev.cast; } },
    { id: 'wait', pc: ['', 'Now wait. The tip nods when something takes it.'], touch: ['', 'Now wait. The tip nods when something takes it.'],
      when: function (r) { return (r.fsm === 'waiting' || r.fsm === 'interest') && r.bite.slot < 0 && !isLure(r); }, done: function (r, s, ev) { return ev.bite; } },
    { id: 'reelin', pc: ['SPACE', 'hold to reel the line back in'], touch: ['REEL', 'hold to reel the line back in'],
      when: function (r) { return (r.fsm === 'waiting' || r.fsm === 'interest') && r.bite.slot < 0 && waitT > LATE_S; }, done: function (r, s, ev) { return ev.reeled; } },
    { id: 'journal', pc: ['J', 'the journal: where and when each fish lives'], touch: ['@journal', 'where and when each fish lives'],
      when: function (r, s) { return r.fsm === 'sailing' && caught(s) >= 1; }, done: function (r, s, ev) { return ev.journal; } },
    { id: 'tackle', pc: ['S', 'change the rod, the bait and the line'], touch: ['@setup', 'change the rod, the bait and the line'],
      when: function (r, s) { return r.fsm === 'sailing' && r.boat.stopped && (caught(s) >= 3 || hasMore(s)); }, done: function (r, s, ev) { return ev.setup; } },
    { id: 'shop', pc: ['', 'Rusty sells bait and rods: stop by the pier (W).'], touch: ['', 'Rusty sells bait and rods: stop by the pier.'],
      when: function (r, s) { return r.fsm === 'sailing' && s.coins >= 60 && r.loc === 'fog'; }, done: function (r, s, ev) { return ev.shop; } },
    { id: 'chart', pc: ['M', 'the chart: new waters open for coins'], touch: ['@map', 'the chart: new waters open for coins'],
      when: function (r, s) { return r.fsm === 'sailing' && s.coins >= 400; }, done: function (r, s, ev) { return ev.map; } }
  ];
  var BASICS = ['cast', 'wait', 'reelin'];
  // How each lure's retrieve is said (scene/underwater.js STYLE, by the lure's swim).
  var STYLE = { dive: 'steady', mid: 'steady', glide: 'steady', lift: 'stopgo', flutter: 'stopgo', top: 'top', dropshot: 'slow', wacky: 'slow' };
  var WORK_SAYS = {
    steady: 'Too still. This one wants a steady reel: hold the button.',
    stopgo: 'Too still. Stop and go: reel a moment, let it fall, again.',
    top: 'Too still. Pop it: short taps with a pause between.',
    slow: 'Too fast. Let this one sit, with a nudge now and then.',
    jig: 'Jig it: short lifts and pauses.'
  };
  var RETRIEVE = { steady: 'Reel it steady.', stopgo: 'Stop and go.', top: 'Pop it on top.', slow: 'Let it sit, nudge it.', jig: 'Jig it.' };

  var cur = null, workT = 0, workCast = -1, saidCast = -1, waitT = 0;
  var last = { fsm: '', slot: -1, menu: '', setup: false, scene: '' };
  var ev = { cast: false, bite: false, reeled: false, journal: false, setup: false, shop: false, map: false };
  var word = '', wordKey = '';            // 88.3: HOOK, REEL or EASE in the first fights

  function onIce() { var r = G.state.run, L = r && r.loc ? G.data.locations[r.loc] : null; return !!(L && L.ice); }
  function isLure(r) { return !!(r.gearFx && r.gearFx.lure && r.cast.bait === r.gearFx.bait); }
  function caught(s) { var n = 0; for (var k in s.journal) n += s.journal[k].caught || 0; return n; }
  function hasMore(s) { for (var k in s.baits) if (s.baits[k] > 0) return true; return false; }
  function enabled() { var st = G.state.save.settings; return st.tips !== false; }
  function done(id) { var d = G.state.save.tipsDone; return !!(d && d[id]); }
  function mark(id) { var s = G.state.save; if (!s.tipsDone) s.tipsDone = {}; if (!s.tipsDone[id]) { s.tipsDone[id] = true; return true; } return false; }
  function landed() { return (G.state.save.tipsDone && G.state.save.tipsDone.landed) | 0; }
  function styleOf(r) { if (!isLure(r)) return ''; return onIce() ? 'jig' : (STYLE[r.gearFx.swim] || ''); }

  // One step from the HUD's update (the sailing scene's step).
  function update(dt, run) {
    var save = G.state.save, i, sc = G.core.state.sceneName(), menu = G.ui.menu.current();
    if (!save.tipsDone) save.tipsDone = {};
    if (!save.tipsDone.seeded) { save.tipsDone.seeded = true; if (caught(save) > 0) { for (i = 0; i < BASICS.length; i++) save.tipsDone[BASICS[i]] = true; save.tipsDone.landed = FIGHTS; } }
    homeStep(dt, run);
    for (var k in ev) ev[k] = false;
    var f = run.fsm;
    if (f === 'casting' && last.fsm !== 'casting') ev.cast = true;
    if (run.bite.slot >= 0 && last.slot < 0) ev.bite = true;
    if (f === 'sailing' && (last.fsm === 'waiting' || last.fsm === 'interest' || last.fsm === 'sinking')) ev.reeled = true;
    if (menu === 'journal' && last.menu !== 'journal') ev.journal = true;
    if (menu === 'map' && last.menu !== 'map') ev.map = true;
    if (G.ui.setup.isOpen() && !last.setup) ev.setup = true;
    if (f === 'card' && last.fsm === 'landing' && landed() < FIGHTS) save.tipsDone.landed = landed() + 1; // 88.3: a fish landed
    if (save.flags && save.flags.shopVisits > 0) ev.shop = true;
    if (f === 'waiting' || f === 'interest') waitT += dt; else waitT = 0;
    last.fsm = f; last.slot = run.bite.slot; last.menu = menu; last.setup = G.ui.setup.isOpen();
    for (i = 0; i < TIPS.length; i++) if (!done(TIPS[i].id) && TIPS[i].done(run, save, ev)) mark(TIPS[i].id);
    // the tip to show: the first not done whose moment it is
    cur = null;
    if (enabled()) for (i = 0; i < TIPS.length; i++) { var t = TIPS[i]; if (!done(t.id) && t.when(run, save)) { cur = t; break; } }
    // 88.3 / 89.3: the bite and the fight said in words, for the first FIGHTS fish
    word = '';
    if (enabled() && landed() < FIGHTS) {
      if (run.bite.slot >= 0 && (f === 'waiting' || f === 'interest' || f === 'sinking')) { word = 'HOOK'; wordKey = 'now: set the hook'; }
      else if (f === 'fighting' || f === 'hooked') { var pull = run.fight && run.fight.mode === 'pull'; word = pull ? 'EASE' : 'REEL'; wordKey = pull ? 'it runs: let go' : 'it tires: hold to reel'; }
    }
    // 88.4: a lure left dead (or a slow one rushed) for WORK_S s, said once a cast
    var st = styleOf(run);
    if (st && (f === 'waiting' || f === 'interest') && run.bite.slot < 0 && (run.cast.work === undefined ? 1 : run.cast.work) < 0.2) workT += dt; else workT = 0;
    if (workCast !== run.cast.n) { workCast = run.cast.n; workT = 0; }
    if (enabled() && workT > WORK_S && saidCast !== run.cast.n) { saidCast = run.cast.n; G.ui.hud.say(WORK_SAYS[st]); }
  }

  // Phase 91.2: on an iPhone or iPad's browser (not the Home Screen app), once a save: Add to Home
  // Screen keeps the save (Safari may clear a site after 7 days away) and plays full screen. Shown
  // for HOME_S s after the first tap, on the water between casts, whatever the Tips setting says.
  var HOME_S = 8, HOME_SAYS = 'Add to Home Screen to keep your save and play full screen.', homeT = 0, homeShown = 0;
  function homeStep(dt, run) {
    if (homeT > 0) { homeT -= dt; return; }
    if (done('homescreen') || !G.core.device.wantsHomeScreen() || !G.core.input.woke() || run.fsm !== 'sailing') return;
    mark('homescreen'); homeT = HOME_S; homeShown++;
  }

  // A line on a dark plate: the key cap (if any) and the words, centred at x, top y.
  function line(ctx, cap, words, cx, y, keyLit) {
    var U = G.ui.panel, w = (cap ? U.keyW(cap) + 4 : 0) + F.measure(words), x = Math.round(cx - w / 2);
    ctx.globalAlpha = 0.72; ctx.fillStyle = P.night_ink; ctx.fillRect(x - 6, y - 3, w + 12, U.KEY_H + 6); ctx.globalAlpha = 1;
    if (cap) { U.key(ctx, cap, x, y, keyLit); x += U.keyW(cap) + 4; }
    F.drawText(ctx, words, x, y + 2, 'bone');
  }

  // Drawn by the HUD on its own context (the UI layer or the game canvas), at the picture's top centre.
  function draw(ctx, run, X, Y, pic) {
    if (!G.state.save || G.ui.setup.isOpen() || G.ui.dock.isOpen() || G.ui.menu.current() || G.ui.card.isOpen()) return;
    var touch = G.core.device.touch(), cx = pic[0] + (pic[2] >> 1), y = Y + 38;
    if (word) { line(ctx, word, wordKey, cx, y, true); return; }
    if (homeT > 0) { ctx.globalAlpha = Math.min(1, homeT); line(ctx, '', HOME_SAYS, cx, y, false); ctx.globalAlpha = 1; return; } // 91.2
    if (!cur) return;
    var s = touch ? cur.touch : cur.pc, cap = s[0];
    if (cap.charAt(0) === '@') cap = G.ui.hud.touchParts.wordFor(cap.slice(1), G.core.input.layout().bs).toUpperCase(); // the word on that key
    line(ctx, cap, s[1], cx, y, false);
  }

  // From G.ui.menu.open: a menu page opened. The scene (and so update above) does not step while
  // a menu is open, so the journal and chart tips are marked here, not by watching menu.current().
  function opened(name) {
    if (!G.state.save) return;
    var id = name === 'journal' ? 'journal' : name === 'map' ? 'chart' : '';
    if (id) { mark(id); if (cur && cur.id === id) cur = null; }
  }

  return {
    update: update, draw: draw, opened: opened, RETRIEVE: RETRIEVE, styleOf: styleOf,
    // dbg.tips(): each tip with done or not, the one showing, the fight word, how many landed
    info: function () { var o = {}; for (var i = 0; i < TIPS.length; i++) o[TIPS[i].id] = done(TIPS[i].id); return { done: o, showing: homeT > 0 ? 'homescreen' : (cur ? cur.id : ''), homeScreen: { done: done('homescreen'), shown: homeShown }, word: word, landed: landed(), on: enabled() }; },
    reset: function () { G.state.save.tipsDone = { seeded: true }; return 'tips reset'; }
  };
})();
