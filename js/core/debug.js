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
    give: todo('give', 'TODO(P7.5)'),     // TODO(P7.5)
    money: todo('money', 'TODO(P8.2)'),   // TODO(P8.2)
    hour: todo('hour', 'TODO(P6.1)'),     // TODO(P6.1)
    unease: todo('unease', 'TODO(P6.2)'), // TODO(P6.2)
    tp: todo('tp', 'TODO(P3.1)'),         // TODO(P3.1)
    caught: todo('caught', 'TODO(P8.3)')  // TODO(P8.3)
  };
  if (on) window.dbg = dbg;

  return { on: on, addLine: addLine, log: log, error: error, dbg: dbg };
})();
