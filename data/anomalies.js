var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Anomalies (§2, V10): quiet, short, optional, and each one useful for fishing.
// {id, locations, uneaseMin, hours, cooldown, kind, params, effect?}
//   hours: [from, to) in game hours (wraps past midnight), or null for any hour.
//   cooldown: real seconds before the same anomaly may come back.
//   kind 'reflection': drawn only in the mirror water (gfx/water.js, 10.2). params.what
//     is figure | window | pier | empty_boat; params.dur is [min, max] seconds on screen.
//     params.place 'near' puts it within a cast of the boat (between 40 px and the rod's
//     reach, either side); 'boat' puts it on the boat itself.
//   effect 'spotBoost': a cast landing within params.r px of it, while it shows, gets the
//     rare and legendary weights × params.rare for that cast (sim/unease.js castBoost).
//   effect 'revealHint': when it ends, a true hint the player has not found is written
//     into the journal (sim/unease.js lateHint).
// The scheduler rolls every `check` s while none is active: chance × unease per roll,
// never within `gap` s of the last one ending, at most one at a time (§0.11).
G.data = G.data || {};
G.data.anomalies = {
  check: 4,
  chance: 0.12,
  gap: 45,
  list: [
    { id: 'reflected_figure', locations: ['fog', 'creek', 'pines', 'red'], uneaseMin: 0.3, hours: [19, 5], cooldown: 240, kind: 'reflection',
      params: { what: 'figure', place: 'near', dur: [14, 22], r: 26, rare: 3 }, effect: 'spotBoost' },
    { id: 'lit_window', locations: ['fog', 'creek', 'pines'], uneaseMin: 0.45, hours: [20, 5], cooldown: 300, kind: 'reflection',
      params: { what: 'window', place: 'near', dur: [16, 24], r: 30, rare: 3 }, effect: 'spotBoost' },
    { id: 'second_pier', locations: ['fog', 'pines'], uneaseMin: 0.6, hours: null, cooldown: 420, kind: 'reflection',
      params: { what: 'pier', place: 'near', dur: [18, 26], r: 40, rare: 2.5 }, effect: 'spotBoost' },
    { id: 'empty_boat', locations: ['fog', 'creek', 'pines', 'red'], uneaseMin: 0.8, hours: [1, 4], cooldown: 900, kind: 'reflection',
      params: { what: 'empty_boat', place: 'boat', dur: [8, 12] }, effect: 'revealHint' }
  ]
};

// Schema check. Returns a list of problems; empty means valid. ref: {locations}.
G.data.validateAnomalies = function (A, ref) {
  var errs = [], seen = {}, WHAT = { 'figure': 1, 'window': 1, 'pier': 1, 'empty_boat': 1 };
  function num(v) { return typeof v === 'number' && isFinite(v); }
  if (!(A.check > 0) || !(A.chance > 0 && A.chance <= 1) || !(A.gap >= 0)) errs.push('check, chance or gap');
  for (var i = 0; i < A.list.length; i++) {
    var a = A.list[i], p = (a && a.id ? a.id : '#' + i) + ': ';
    if (!a || typeof a.id !== 'string') { errs.push(p + 'id'); continue; }
    if (seen[a.id]) errs.push(p + 'duplicate id');
    seen[a.id] = true;
    if (!a.locations || !a.locations.length) errs.push(p + 'locations');
    else a.locations.forEach(function (l) { if (!ref.locations[l]) errs.push(p + 'unknown location ' + l); });
    if (!num(a.uneaseMin) || a.uneaseMin < 0 || a.uneaseMin > 1) errs.push(p + 'uneaseMin');
    if (a.hours !== null && !(a.hours && a.hours.length === 2 && a.hours[0] >= 0 && a.hours[0] < 24 && a.hours[1] >= 0 && a.hours[1] <= 24)) errs.push(p + 'hours');
    if (!num(a.cooldown) || a.cooldown < 0) errs.push(p + 'cooldown');
    if (a.kind !== 'reflection') errs.push(p + 'kind "' + a.kind + '"');
    var q = a.params || {};
    if (!WHAT[q.what]) errs.push(p + 'params.what "' + q.what + '"');
    if (q.place !== 'near' && q.place !== 'boat') errs.push(p + 'params.place');
    if (!(q.dur && q.dur.length === 2 && q.dur[0] > 0 && q.dur[0] <= q.dur[1] && q.dur[1] <= 60)) errs.push(p + 'params.dur (short: at most 60 s)');
    if (a.effect === 'spotBoost' && !(q.r > 0 && q.rare > 1)) errs.push(p + 'spotBoost needs params.r and params.rare > 1');
    if (a.effect !== undefined && a.effect !== 'spotBoost' && a.effect !== 'revealHint' && a.effect !== 'none') errs.push(p + 'effect "' + a.effect + '"');
  }
  return errs;
};
