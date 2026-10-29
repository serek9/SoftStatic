var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Keyboard and mouse mapped to abstract actions (V2 controls).
// `pressed` and `released` last for exactly one fixed update step: the loop calls endStep() after each.
G.core = G.core || {};
G.core.input = (function () {
  // up, down and back move through menus (P9); sailing uses only left and right.
  var NAMES = ['left', 'right', 'action', 'pause', 'journal', 'map', 'passive', 'up', 'down', 'back'];
  var KEYS = {
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    Space: 'action', Enter: 'action',
    KeyP: 'pause', KeyJ: 'journal', KeyM: 'map', Tab: 'passive', Escape: 'back'
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
    canvas.addEventListener('mousedown', function (e) { if (e.button === 0) press('mouse0', 'action'); });
    window.addEventListener('mouseup', function (e) { if (e.button === 0) release('mouse0'); });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', function () { if (document.hidden) releaseAll(); });
    // TODO(P14.6): touch controls and on-screen buttons.
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
