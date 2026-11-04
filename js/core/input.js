var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Keyboard and mouse mapped to abstract actions (V2 controls).
// `pressed` and `released` last for exactly one fixed update step: the loop calls endStep() after each.
G.core = G.core || {};
G.core.input = (function () {
  // up, down and back move through menus (P9); sailing uses only left and right.
  // Phase 45: setup opens the tackle panel on the boat. S presses it and down together, so S
  // still moves down every menu and walks the shop; on the boat only ↓ alone (or a tap on the
  // dog) pets him.
  // Phase 59: 'none' is what a touch on a panel presses when it only moved the panel's cursor
  // (59.2's row rule: the first tap selects): it is held like any action and nothing reads it.
  var NAMES = ['left', 'right', 'action', 'pause', 'journal', 'map', 'up', 'down', 'back', 'still', 'setup', 'none'];
  var KEYS = {
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    KeyW: 'up', ArrowUp: 'up',
    KeyS: ['down', 'setup'], ArrowDown: 'down',
    Space: 'action', Enter: 'action',
    KeyP: 'pause', KeyJ: 'journal', KeyM: 'map', Escape: 'back',
    KeyH: 'still' // audit P3-2: hide the HUD for a still picture
  };

  var acts = {};
  for (var i = 0; i < NAMES.length; i++) {
    acts[NAMES[i]] = { held: false, pressed: false, released: false, sources: 0, presses: 0 };
  }
  var down = {}; // source id -> action name, while that source is held

  function press(src, name) {
    if (down[src]) return;
    down[src] = name;
    var a = acts[name];
    if (++a.sources === 1) { a.held = true; a.pressed = true; a.presses++; }
  }

  function release(src) {
    var name = down[src];
    if (!name) return;
    down[src] = null;
    var a = acts[name];
    if (--a.sources === 0) { a.held = false; a.released = true; }
  }

  // A key that presses several actions (S) holds each as its own source.
  function pressKey(code, name) {
    if (typeof name === 'string') { press(code, name); return; }
    for (var i = 0; i < name.length; i++) press(code + '#' + i, name[i]);
  }
  function releaseKey(code, name) {
    if (typeof name === 'string') { release(code); return; }
    for (var i = 0; i < name.length; i++) release(code + '#' + i);
  }

  function releaseAll() { for (var src in down) release(src); }

  // 14.6: on-screen buttons (game pixels, 640×360 since Phase 18), drawn by the HUD and hit-tested here, for
  // touch and for the mouse. Touch elsewhere maps to zones: in play, the left and right
  // edges steer and the middle is the action (hold to charge or reel); in a menu, the edges
  // are left and right, the top and bottom middle are up and down, the centre is the action.
  var BUTTONS = [
    { act: 'journal', label: 'J', x: 472, y: 332, w: 28, h: 22 },
    { act: 'map', label: 'M', x: 504, y: 332, w: 28, h: 22 },
    { act: 'setup', label: 'S', x: 536, y: 332, w: 28, h: 22 }, // Phase 45: the tackle panel, next to M
    { act: 'pause', label: 'P', x: 568, y: 332, w: 28, h: 22 },
    { act: 'back', label: 'ESC', x: 600, y: 332, w: 36, h: 22 }
  ];
  var touched = false, mouseNear = false, wakeT = -1;

  // Phase 58 (PLAN_MOBILE.md): the touch layout, in touch mode only (G.core.device.touch()); a
  // mouse-only PC keeps BUTTONS above. Phase 90.3: laid out in the UI layer's pixels
  // (G.ui.panel, which covers the whole screen on a phone), sized from CSS px so a thumb gets
  // the same size on every phone: keys BTN_CSS, the boat's pad PAD_CSS, the rooms' four-way pad
  // ROOM_CSS, the round action button ACT_CSS (Apple and Google ask 44-48). On the boat with
  // nothing open: the keys (journal, chart, tackle, menu) in a column down the right edge, in
  // the margin beside the picture where there is one; the steering pad at the bottom left (the
  // left margin); the action button at the bottom right. In a room walking: the four-way pad,
  // the action button and ESC. Anywhere else (a menu, the card, the setup panel, a room's box)
  // only ESC, and taps go to the zones and the panels as before. layout() fills these
  // preallocated records (UI px); hit() and the HUD read them.
  var BTN_CSS = 44, PAD_CSS = 52, ROOM_CSS = 44, ACT_CSS = 64, EDGE = 6, GAP = 4;
  function rec(act, label) { return { act: act, label: label, x: 0, y: 0, w: 0, h: 0, on: false }; }
  var TB = [rec('journal', 'JOURNAL'), rec('map', 'CHART'), rec('setup', 'TACKLE'), rec('pause', 'MENU'), rec('back', 'ESC')];
  var PAD = [rec('left', '<'), rec('right', '>'), rec('up', '^'), rec('down', 'v')];
  var ACT = rec('action', '');
  var LAY = { mode: '', bs: 0, ps: 0, ad: 0, rowBottom: 0, inPic: false, buttons: TB, pad: PAD, act: ACT };

  function put(r, on, x, y, w, h) { r.on = on; r.x = x; r.y = y; r.w = w; r.h = h; }

  // Where you are, for the layout: 'boat' (the boat, nothing open), 'room' (walking a room),
  // 'menu' (anything open over a scene) or '' (no touch layout: the gallery, compact).
  function where() {
    var sc = G.core.state.sceneName && G.core.state.sceneName(), U = G.ui || {};
    if (G.core.compact || (sc !== 'sailing' && sc !== 'shop' && sc !== 'cabin')) return '';
    if (U.menu && U.menu.current()) return 'menu';
    if (sc === 'sailing') return (U.card && U.card.isOpen()) || (U.setup && U.setup.isOpen()) || (U.dock && U.dock.isOpen()) ? 'menu' : 'boat';
    var room = sc === 'shop' ? U.shop : U.cabin;
    return room && room.busy && room.busy() ? 'menu' : 'room';
  }

  // 8.4 #38: ESC alone (anything open) goes to the first corner of the screen that covers none
  // of the open panels (top right, bottom right, top left, bottom left; top left is the HUD's
  // on the water), and is not shown when every corner is covered: their own ESC hint is tapped
  // instead (Phase 59). Each overlay's rects() are preallocated, in UI px (Phase 90).
  var OPEN = [], HUD_CORNER = [0, 0, 200, 40];
  function addAll(l) { if (l) for (var k = 0; k < l.length; k++) OPEN.push(l[k]); }
  function openRects() {
    var U = G.ui || {}, sc = G.core.state.sceneName && G.core.state.sceneName(), cur = U.menu && U.menu.current();
    OPEN.length = 0;
    if (cur === 'pause') OPEN.push(U.menu.rect());
    else if (cur === 'look') OPEN.push(U.look.rect());
    else if (cur === 'controls') OPEN.push(U.controls.rect());
    else if (cur === 'map') addAll(U.map.rects());
    else if (cur === 'journal') addAll(U.journal.rects());
    if (sc === 'sailing') {
      if (U.card && U.card.isOpen()) OPEN.push(U.card.rect()); if (U.setup && U.setup.isOpen()) OPEN.push(U.setup.rect()); if (U.dock && U.dock.isOpen()) addAll(U.dock.rects());
      var p = U.panel.pic(); HUD_CORNER[0] = p[0]; HUD_CORNER[1] = p[1]; OPEN.push(HUD_CORNER);
    }
    else if (sc === 'shop' && U.shop.rects) addAll(U.shop.rects());
    else if (sc === 'cabin' && U.cabin.rects) addAll(U.cabin.rects());
    return OPEN;
  }
  function clear(x, y, s, rs) {
    for (var k = 0; k < rs.length; k++) { var r = rs[k]; if (x < r[0] + r[2] && r[0] < x + s && y < r[1] + r[3] && r[1] < y + s) return false; }
    return true;
  }
  var CORNERS = [[1, 0], [1, 1], [0, 0], [0, 1]];
  function placeEsc(b, s, VW, VH, insL, insR) {
    var rs = openRects();
    for (var k = 0; k < CORNERS.length; k++) {
      var x = CORNERS[k][0] ? VW - insR - EDGE - s : insL + EDGE, y = CORNERS[k][1] ? VH - EDGE - s : EDGE;
      if (clear(x, y, s, rs)) { put(b, true, x, y, s, s); return; }
    }
    b.on = false;
  }

  function layout() {
    var Pn = G.ui && G.ui.panel, mode = where(), i;
    if (!Pn) { LAY.mode = ''; return LAY; }
    var VW = Pn.VW(), VH = Pn.VH(), pic = Pn.pic(), insL = Pn.layer.insL, insR = Pn.layer.insR;
    var bs = Pn.fromCss(BTN_CSS, 20), ps = Pn.fromCss(mode === 'room' ? ROOM_CSS : PAD_CSS, 20), ad = Pn.fromCss(ACT_CSS, 28);
    LAY.mode = mode; LAY.bs = bs; LAY.ps = ps; LAY.ad = ad;
    // the right column: journal, chart, tackle, menu down the edge on the boat; else ESC alone
    var cx = VW - insR - EDGE - bs;
    LAY.inPic = cx < pic[0] + pic[2];                                              // no margin: the column lies over the picture
    for (i = 0; i < TB.length; i++) {
      var on = mode === 'boat' ? TB[i].act !== 'back' : false;
      if (on) put(TB[i], true, cx, EDGE + i * (bs + GAP), bs, bs); else TB[i].on = false;
    }
    if (mode !== '' && mode !== 'boat') placeEsc(TB[4], bs, VW, VH, insL, insR);
    // the depth readout (top right of the picture, under water) goes under the column when it lies over the picture
    LAY.rowBottom = mode === 'boat' && LAY.inPic ? EDGE + 4 * (bs + GAP) : (mode === 'menu' && TB[4].on && TB[4].y === EDGE && TB[4].x < pic[0] + pic[2] ? EDGE + bs : 0);
    // the pad: two arrows on the boat, a cross of four in a room, at the bottom left
    var x0 = insL + EDGE, y0 = VH - EDGE - ps;
    if (mode === 'boat') {
      put(PAD[0], true, x0, y0, ps, ps); put(PAD[1], true, x0 + ps + GAP, y0, ps, ps);
      PAD[2].on = PAD[3].on = false;
    } else if (mode === 'room') {
      var top = VH - EDGE - 3 * ps;
      put(PAD[2], true, x0 + ps, top, ps, ps); put(PAD[3], true, x0 + ps, top + 2 * ps, ps, ps);
      put(PAD[0], true, x0, top + ps, ps, ps); put(PAD[1], true, x0 + 2 * ps, top + ps, ps, ps);
    } else for (i = 0; i < PAD.length; i++) PAD[i].on = false;
    if (mode === 'boat' || mode === 'room') put(ACT, true, VW - insR - EDGE - ad, VH - EDGE - ad, ad, ad); else ACT.on = false;
    return LAY;
  }

  function inRect(r, x, y, slack) { return r.on && x >= r.x - slack && x < r.x + r.w + slack && y >= r.y - slack && y < r.y + r.h + slack; }
  function inRound(r, x, y) { var h = r.w / 2 + 3, dx = x - r.x - r.w / 2, dy = y - r.y - r.h / 2; return r.on && dx * dx + dy * dy <= h * h; }

  // What an on-screen control at game pixel (gx, gy) presses ('' for none). Touch mode reads
  // the touch layout (in UI px); otherwise the PC's buttons (game px).
  function hit(gx, gy) {
    var i;
    if (G.core.device && G.core.device.touch() && G.ui && G.ui.panel) {
      layout();
      var x = G.ui.panel.ux(gx), y = G.ui.panel.uy(gy);
      for (i = 0; i < TB.length; i++) if (inRect(TB[i], x, y, 2)) return TB[i].act;
      for (i = 0; i < PAD.length; i++) if (inRect(PAD[i], x, y, 2)) return PAD[i].act;
      if (inRound(ACT, x, y)) return 'action';
      return '';
    }
    for (i = 0; i < BUTTONS.length; i++) {
      var b = BUTTONS[i];
      if (gx >= b.x && gx < b.x + b.w && gy >= b.y && gy < b.y + b.h) return b.act;
    }
    return '';
  }

  function inMenu() {
    var M = G.ui && G.ui.menu, sc = G.core.state.sceneName && G.core.state.sceneName();
    return !!((M && M.current()) || sc === 'shop' || sc === 'cabin');
  }

  // A tap on one of the catch card's keys chooses it and presses the action (Phase 46).
  function cardTap(gx, gy) { var c = G.ui && G.ui.card; return !!(c && c.tap(gx, gy)); }

  // Phase 45: a tap on the setup panel: its row ('action'), or off it ('setup' closes it).
  function setupTap(gx, gy) { var u = G.ui && G.ui.setup; return u ? u.tap(gx, gy) : ''; }
  // Phase 59.2: a tap on an open overlay (pause, map, picker, journal) or a room's box or
  // window. Each answers what to press: 'action' (choose), a direction, 'back', 'none' (it only
  // moved its cursor, or the tap missed it), or '' when it has nothing open to tap.
  function overlayTap(gx, gy) {
    var U = G.ui || {}, sc = G.core.state.sceneName && G.core.state.sceneName();
    if (U.menu && U.menu.current()) return U.menu.tap(gx, gy);
    if (sc === 'shop' && U.shop && U.shop.busy()) return U.shop.tap(gx, gy);
    if (sc === 'cabin' && U.cabin && U.cabin.busy()) return U.cabin.tap(gx, gy);
    if (sc === 'sailing' && U.dock) return U.dock.tap(gx, gy); // Phase 67: the pier's panel, or its hint
    return '';
  }

  // Phase 45: a tap on the dog in the boat pets him (down), when the scene says he can be petted.
  function dogTap(gx, gy) { var s = G.scene && G.scene.sailing; return !!(s && s.dogTap && s.dogTap(gx, gy)); }

  // Which action a touch at game pixel (gx, gy) presses.
  function zone(gx, gy) {
    var b = hit(gx, gy);
    if (b) return b;
    if (cardTap(gx, gy)) return 'action';
    var st = setupTap(gx, gy);
    if (st) return st;
    var ot = overlayTap(gx, gy);
    if (ot) return ot;
    if (dogTap(gx, gy)) return 'down';
    if (gx < 128) return 'left';
    if (gx >= 512) return 'right';
    if (inMenu()) { if (gy < 108) return 'up'; if (gy >= 252) return 'down'; }
    return 'action';
  }

  // Phase 59.3: a long press on P (LONG s) is H, the still picture; a shorter touch is P, sent
  // when it lifts. While the still picture is up nothing is drawn, but P's corner still takes
  // the long press that brings the HUD back. One pending press at a time; a timer, not a step,
  // so the long press fires while the finger is still down.
  var LONG = 0.6, pend = { id: -1, fired: false, timer: 0 };
  function stillOn() { return !!(G.ui && G.ui.hud && G.ui.hud.isStill()); }
  function pCorner(gx, gy) {
    if (!G.core.device || !G.core.device.touch() || !G.ui || !G.ui.panel) return false;
    layout();
    var p = TB[3], x = G.ui.panel.ux(gx), y = G.ui.panel.uy(gy);
    if (stillOn()) return p.w > 0 && x >= p.x - 2 && x < p.x + p.w + 2 && y >= p.y - 2 && y < p.y + p.h + 2;
    return inRect(p, x, y, 2);
  }
  function touchDown(id, gx, gy) {
    touched = true;
    if (pend.id < 0 && pCorner(gx, gy)) {
      pend.id = id; pend.fired = false;
      pend.timer = setTimeout(function () { if (pend.id === id) { pend.fired = true; press('touch' + id, 'still'); } }, LONG * 1000);
      return;
    }
    press('touch' + id, zone(gx, gy));
  }
  function touchUp(id) {
    if (pend.id === id) {
      clearTimeout(pend.timer); pend.id = -1;
      if (!pend.fired) { press('touch' + id, 'pause'); }                        // a short touch: P, pressed and let go this step
    }
    release('touch' + id);
  }

  function gamePt(canvas, cx, cy, out) {
    var r = canvas.getBoundingClientRect();
    out[0] = (cx - r.left) / r.width * 640; out[1] = (cy - r.top) / r.height * 360;
    return out;
  }
  var pt = [0, 0];

  function attach(canvas) {
    window.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      var name = KEYS[e.code];
      if (!name) return;
      e.preventDefault();
      if (!e.repeat) pressKey(e.code, name);
    });
    window.addEventListener('keyup', function (e) {
      if (KEYS[e.code]) { e.preventDefault(); releaseKey(e.code, KEYS[e.code]); }
    });
    canvas.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      gamePt(canvas, e.clientX, e.clientY, pt);
      press('mouse0', (mouseNear || touched || G.core.device.touch()) && hit(pt[0], pt[1]) || (setupTap(pt[0], pt[1]) || (dogTap(pt[0], pt[1]) ? 'down' : (cardTap(pt[0], pt[1]), 'action')))); // a shown button, the setup panel, the dog, else the cast (or the card's key)
    });
    canvas.addEventListener('mousemove', function (e) {
      gamePt(canvas, e.clientX, e.clientY, pt); mouseNear = pt[1] >= 300 && pt[0] >= 420;
      if (G.ui && G.ui.panel) G.ui.panel.pointer(G.ui.panel.ux(pt[0]), G.ui.panel.uy(pt[1])); // 90.5: hover
    });
    canvas.addEventListener('mouseleave', function () { if (G.ui && G.ui.panel) G.ui.panel.pointer(-1, -1); });
    canvas.style.touchAction = 'none';
    // Phase 90.3: touches anywhere on the page (the controls sit in the margins beside the
    // picture). 90.4: the first touch of a visit only wakes the page (full screen, sound): it
    // presses nothing, so it never casts by surprise.
    var woke = false;
    document.addEventListener('touchstart', function (e) {
      e.preventDefault();
      touched = true;
      if (!woke) { woke = true; wakeT = performance.now(); return; }
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        gamePt(canvas, t.clientX, t.clientY, pt);
        touchDown(t.identifier, pt[0], pt[1]);
      }
    }, { passive: false });
    var lift = function (e) {
      if (e.cancelable) e.preventDefault();
      for (var i = 0; i < e.changedTouches.length; i++) touchUp(e.changedTouches[i].identifier);
    };
    document.addEventListener('touchend', lift, { passive: false });
    document.addEventListener('touchcancel', lift, { passive: false });
    window.addEventListener('mouseup', function (e) { if (e.button === 0) release('mouse0'); });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', function () { if (document.hidden) releaseAll(); });
  }

  // Lets tests and debug tools drive an action like a real key.
  function inject(name, isDown) {
    if (isDown) press('inject:' + name, name); else release('inject:' + name);
  }
  // Tests: a key by its code, as the keyboard sends it (S presses down and setup).
  function key(code, isDown) {
    var name = KEYS[code];
    if (!name) return false;
    if (isDown) pressKey('key:' + code, name); else releaseKey('key:' + code, name);
    return true;
  }

  function endStep() {
    for (var i = 0; i < NAMES.length; i++) {
      var a = acts[NAMES[i]];
      a.pressed = false;
      a.released = false;
    }
  }

  return {
    NAMES: NAMES, acts: acts, attach: attach, inject: inject, key: key, endStep: endStep, releaseAll: releaseAll,
    held: function (name) { return acts[name].held; },
    pressed: function (name) { return acts[name].pressed; },
    released: function (name) { return acts[name].released; },
    // The `move` action as an axis: -1 left, 0 none or both, 1 right.
    BUTTONS: BUTTONS, zone: zone, hit: hit,
    // Phase 58: the touch layout (touch mode), refreshed for where you are now.
    layout: layout,
    // The buttons show once a touch has been seen, in touch mode, or while the mouse is near them.
    showButtons: function () { return touched || mouseNear || !!(G.core.device && G.core.device.touch()); },
    // Tests: a touch at game pixel (gx, gy), down or up (id tells touches apart).
    touch: function (id, gx, gy, isDown) { touched = true; if (isDown) touchDown(id, gx, gy); else touchUp(id); },
    woke: function () { return wakeT >= 0; }, // 90.4: the first touch has woken the page
    // True when any action is held or was pressed this step (the HUD's idle fade, P1-7).
    any: function () { for (var k in acts) if (acts[k].held || acts[k].pressed) return true; return false; },
    move: function () { return (acts.right.held ? 1 : 0) - (acts.left.held ? 1 : 0); }
  };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  var inp = G.core.input, s = 'move ' + inp.move();
  for (var i = 2; i < inp.NAMES.length; i++) {
    var a = inp.acts[inp.NAMES[i]];
    s += '  ' + inp.NAMES[i] + (a.held ? '[#]' : '[ ]') + a.presses;
  }
  return s;
});
