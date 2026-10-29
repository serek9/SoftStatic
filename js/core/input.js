var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Keyboard and mouse mapped to abstract actions (V2 controls).
// `pressed` and `released` last for exactly one fixed update step: the loop calls endStep() after each.
G.core = G.core || {};
G.core.input = (function () {
  // up, down and back move through menus (P9); sailing uses only left and right.
  var NAMES = ['left', 'right', 'action', 'pause', 'journal', 'map', 'passive', 'up', 'down', 'back', 'still'];
  var KEYS = {
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    Space: 'action', Enter: 'action',
    KeyP: 'pause', KeyJ: 'journal', KeyM: 'map', Tab: 'passive', Escape: 'back',
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

  function releaseAll() { for (var src in down) release(src); }

  // 14.6: on-screen buttons (game pixels, 640×360 since Phase 18), drawn by the HUD and hit-tested here, for
  // touch and for the mouse. Touch elsewhere maps to zones: in play, the left and right
  // edges steer and the middle is the action (hold to charge or reel); in a menu, the edges
  // are left and right, the top and bottom middle are up and down, the centre is the action.
  var BUTTONS = [
    { act: 'passive', label: 'TAB', x: 460, y: 332, w: 40, h: 22 },
    { act: 'journal', label: 'J', x: 504, y: 332, w: 28, h: 22 },
    { act: 'map', label: 'M', x: 536, y: 332, w: 28, h: 22 },
    { act: 'pause', label: 'P', x: 568, y: 332, w: 28, h: 22 },
    { act: 'back', label: 'ESC', x: 600, y: 332, w: 36, h: 22 }
  ];
  var touched = false, mouseNear = false;

  function hit(gx, gy) {
    for (var i = 0; i < BUTTONS.length; i++) {
      var b = BUTTONS[i];
      if (gx >= b.x && gx < b.x + b.w && gy >= b.y && gy < b.y + b.h) return b.act;
    }
    return '';
  }

  function inMenu() {
    var M = G.ui && G.ui.menu, sc = G.core.state.sceneName && G.core.state.sceneName();
    return !!((M && M.current()) || sc === 'shop' || sc === 'cabin');
  }

  // Which action a touch at game pixel (gx, gy) presses.
  function zone(gx, gy) {
    var b = hit(gx, gy);
    if (b) return b;
    if (gx < 128) return 'left';
    if (gx >= 512) return 'right';
    if (inMenu()) { if (gy < 108) return 'up'; if (gy >= 252) return 'down'; }
    return 'action';
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
      if (!e.repeat) press(e.code, name);
    });
    window.addEventListener('keyup', function (e) {
      if (KEYS[e.code]) { e.preventDefault(); release(e.code); }
    });
    canvas.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      gamePt(canvas, e.clientX, e.clientY, pt);
      press('mouse0', (mouseNear || touched) && hit(pt[0], pt[1]) || 'action'); // a shown button, else the cast
    });
    canvas.addEventListener('mousemove', function (e) { gamePt(canvas, e.clientX, e.clientY, pt); mouseNear = pt[1] >= 300 && pt[0] >= 440; });
    canvas.style.touchAction = 'none';
    canvas.addEventListener('touchstart', function (e) {
      e.preventDefault();
      touched = true;
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        gamePt(canvas, t.clientX, t.clientY, pt);
        press('touch' + t.identifier, zone(pt[0], pt[1]));
      }
    }, { passive: false });
    var lift = function (e) {
      e.preventDefault();
      for (var i = 0; i < e.changedTouches.length; i++) release('touch' + e.changedTouches[i].identifier);
    };
    canvas.addEventListener('touchend', lift, { passive: false });
    canvas.addEventListener('touchcancel', lift, { passive: false });
    window.addEventListener('mouseup', function (e) { if (e.button === 0) release('mouse0'); });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', function () { if (document.hidden) releaseAll(); });
  }

  // Lets tests and debug tools drive an action like a real key.
  function inject(name, isDown) {
    if (isDown) press('inject:' + name, name); else release('inject:' + name);
  }

  function endStep() {
    for (var i = 0; i < NAMES.length; i++) {
      var a = acts[NAMES[i]];
      a.pressed = false;
      a.released = false;
    }
  }

  return {
    NAMES: NAMES, acts: acts, attach: attach, inject: inject, endStep: endStep, releaseAll: releaseAll,
    held: function (name) { return acts[name].held; },
    pressed: function (name) { return acts[name].pressed; },
    released: function (name) { return acts[name].released; },
    // The `move` action as an axis: -1 left, 0 none or both, 1 right.
    BUTTONS: BUTTONS, zone: zone, hit: hit,
    // The buttons show once a touch has been seen, or while the mouse is near them.
    showButtons: function () { return touched || mouseNear; },
    // Tests: a touch at game pixel (gx, gy), down or up (id tells touches apart).
    touch: function (id, gx, gy, isDown) { touched = true; if (isDown) press('touch' + id, zone(gx, gy)); else release('touch' + id); },
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
