var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Scene manager and the fishing state machine (§3).
// G.state.save is persisted; G.state.run is never saved (§0.12).
G.core = G.core || {};
G.state = G.state || { save: null, run: null };

G.core.state = (function () {
  // Legal transitions. The edges back to `sailing` are the no-fail exits:
  // cancelling a charge, reeling in early, and a snapped line or gentle escape.
  var FSM = {
    sailing:  ['charging'],
    charging: ['casting', 'sailing'],
    casting:  ['sinking'],
    sinking:  ['waiting', 'sailing'],
    waiting:  ['interest', 'sailing'],
    interest: ['hooked', 'waiting', 'sailing'],
    hooked:   ['fighting'],
    fighting: ['landing', 'sailing'],
    landing:  ['card'],
    card:     ['sailing']
  };

  function newRun() {
    // TODO(P3.2) camera, TODO(P6.7) live fish, TODO(P7.2) fight,
    // TODO(P10.1) active anomaly, TODO(P4.2) cast seed, TODO(P6.1) latched windows.
    return { fsm: 'sailing', fsmPrev: null, fsmT: 0 };
  }

  function can(from, to) {
    var next = FSM[from];
    return !!next && next.indexOf(to) !== -1;
  }

  // Moves run.fsm to `to` when the table allows it. Returns false (and logs in debug) when refused.
  function go(run, to) {
    if (!can(run.fsm, to)) {
      if (G.core.debug) G.core.debug.log('fsm refused ' + run.fsm + ' -> ' + to);
      return false;
    }
    run.fsmPrev = run.fsm;
    run.fsm = to;
    run.fsmT = 0;
    return true;
  }

  function tick(run, dt) { run.fsmT += dt; }

  var scenes = {}, current = null, currentName = null;

  function register(name, scene) { scenes[name] = scene; }

  // Calls exit(next) on the old scene, then enter(prev) on the new one.
  function change(name) {
    var next = scenes[name];
    if (!next) throw new Error('unknown scene: ' + name);
    var prevName = currentName;
    if (current) current.exit(name);
    current = next;
    currentName = name;
    next.enter(prevName);
  }

  function update(dt) { if (current) current.update(dt); }
  function draw(ctx) { if (current) current.draw(ctx); }
  function sceneName() { return currentName; }

  return {
    FSM: FSM, newRun: newRun, can: can, go: go, tick: tick,
    register: register, change: change, update: update, draw: draw, sceneName: sceneName
  };
})();

G.state.run = G.state.run || G.core.state.newRun();

if (G.core.debug) G.core.debug.addLine(function () {
  var r = G.state.run;
  return 'scene ' + G.core.state.sceneName() + '  fsm ' + r.fsm + ' (' + r.fsmT.toFixed(1) + 's)' +
    (r.fsmPrev ? '  prev ' + r.fsmPrev : '');
});
