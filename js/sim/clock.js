var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Game clock (§0.8). Hours run 0..24; one real minute is one game hour. 07:00-17:00 are
// the grey hours, everything else is night. Clock windows ({id, from, to} in game hours,
// data/fish.js) are forgiving: a lure that lands inside one stays eligible for that
// window's fish until it is reeled in (D1).
// Pure: no DOM, no Math.random, no Date. Runs in Node through vm.
G.sim = G.sim || {};
G.sim.clock = (function () {
  var RATE = 1 / 60;            // game hours per real second
  var GREY_FROM = 7, GREY_TO = 17;
  var MIN_WINDOW = 0.5;         // game hours (30 game minutes)

  function wrap(h) { h = h % 24; return h < 0 ? h + 24 : h; }

  function advance(hour, dt) { return wrap(hour + dt * RATE); }

  // step(save, input, dt): moves save.clock forward by dt real seconds.
  function step(save, input, dt) { save.clock = advance(save.clock || 0, dt); }

  function isGrey(hour) { return hour >= GREY_FROM && hour < GREY_TO; }

  // [from, to) membership; a window with from > to wraps past midnight.
  function inWindow(hour, w) {
    return w.from <= w.to ? (hour >= w.from && hour < w.to) : (hour >= w.from || hour < w.to);
  }

  // Marks every window open at `hour` in latched (id -> true). Called when the lure lands.
  function latch(latched, hour, windows) {
    for (var i = 0; i < windows.length; i++) if (inWindow(hour, windows[i])) latched[windows[i].id] = true;
  }

  // Called when the lure is reeled in.
  function clearLatch(latched) { for (var k in latched) delete latched[k]; }

  // A window's fish can bite if the cast latched it or the window is open now.
  function eligible(latched, hour, w) { return latched[w.id] === true || inWindow(hour, w); }

  // 10.4: the index of a window whose cue (the owl's cry) falls in (prev, now], or -1.
  // A step that wraps past midnight checks both halves.
  function cueCrossed(prev, now, windows) {
    for (var i = 0; i < windows.length; i++) {
      var c = windows[i].cue;
      if (c === undefined) continue;
      if (prev <= now ? (c > prev && c <= now) : (c > prev || c <= now)) return i;
    }
    return -1;
  }

  function windowById(windows, id) {
    for (var i = 0; i < windows.length; i++) if (windows[i].id === id) return windows[i];
    return null;
  }

  // Returns a list of problems with the window data (empty when valid).
  function validateWindows(windows) {
    var errs = [];
    for (var i = 0; i < windows.length; i++) {
      var w = windows[i], width = wrap(w.to - w.from);
      if (typeof w.id !== 'string') errs.push('window ' + i + ': id');
      if (!(w.from >= 0 && w.from < 24 && w.to >= 0 && w.to <= 24)) errs.push(w.id + ': from/to outside 0..24');
      if (width < MIN_WINDOW - 1e-9) errs.push(w.id + ': narrower than 30 game minutes');
      if (w.cue !== undefined && !inWindow(w.cue, w)) errs.push(w.id + ': cue outside the window');
    }
    return errs;
  }

  return {
    RATE: RATE, GREY_FROM: GREY_FROM, GREY_TO: GREY_TO, MIN_WINDOW: MIN_WINDOW,
    wrap: wrap, advance: advance, step: step, isGrey: isGrey, inWindow: inWindow,
    latch: latch, clearLatch: clearLatch, eligible: eligible, cueCrossed: cueCrossed, windowById: windowById,
    validateWindows: validateWindows
  };
})();
