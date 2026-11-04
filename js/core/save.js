var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Save skeleton (§0.12). Saves are stored and exported in one string format:
//   SS1.<base64 of the JSON>.<FNV-1a checksum of the JSON>
// so a damaged or hand-edited string is detected before anything is loaded.
G.core = G.core || {};
G.core.save = (function () {
  var KEY = 'softstatic_save_v1';
  var VERSION = 13;
  var PREFIX = 'SS1';
  // `?tour`: every water open on the chart for a look round, and nothing written to the save
  // while it is on (persist() below), so a tour never spends, unlocks or moves the real one.
  var TOUR = typeof location !== 'undefined' && /[?&]tour(=|&|$)/.test(location.search);

  // migrations[v](save) returns the save reshaped for version v + 1; migrate() bumps the number.
  var migrations = {
    // v1 -> v2: gear became tiers and flags; Fogbound is always open.
    1: function (s) {
      var d = defaults();
      s.gear = s.gear || {};
      for (var k in d.gear) if (!(k in s.gear)) s.gear[k] = d.gear[k];
      s.unlocks = s.unlocks || {};
      s.unlocks.fog = true;
      s.flags = s.flags || {};
      s.flags.windowCatch = s.flags.windowCatch || {};
      return s;
    },
    // v2 -> v3: the location you were at, settings, and the shop and journal flags (P9).
    2: function (s) {
      var d = defaults();
      s.loc = s.loc || 'fog';
      s.settings = s.settings || {};
      for (var k in d.settings) if (!(k in s.settings)) s.settings[k] = d.settings[k];
      s.flags = s.flags || {};
      for (k in d.flags) if (!(k in s.flags)) s.flags[k] = d.flags[k];
      return s;
    },
    // v3 -> v4: anomaly, dog and late-hint flags (P10).
    3: function (s) {
      var d = defaults();
      for (var k in d.flags) if (!(k in s.flags)) s.flags[k] = d.flags[k];
      return s;
    },
    // v4 -> v5 (Phase 43): rods became a rack. Every rod up the ladder to the one in hand
    // was bought on the way, so all of them are owned.
    4: function (s) {
      var r = [];
      for (var i = 0; i <= (s.gear.rod | 0); i++) r.push(i);
      s.gear.rods = r;
      return s;
    },
    // v5 -> v6 (Phase 53): line types. Every line so far was monofilament.
    5: function (s) {
      s.gear.lineType = 'mono';
      s.gear.lineTypes = ['mono'];
      return s;
    },
    // v6 -> v7 (Phase 68): the 46 invented fish became 59 real species. Everything that named
    // an old species is dropped, as the user chose: the journal (and its late hints), the
    // fish kept for the cabin's wall and the tapes. Coins, gear, baits, lures, waters opened,
    // the cabin and the settings stay.
    6: function (s) {
      s.journal = {};
      s.kept = [];
      s.tapes = [];
      s.flags = s.flags || {};
      s.flags.lateAt = 0;
      s.flags.heavy = {};
      return s;
    },
    // v7 -> v8 (Phase 69): the seven lures became the reference's 23. Each old lure's count
    // goes to the nearest new one (data/gear.js oldLures: the spinner to the Spinnerbait, the
    // plug to the Crankbait, the grub to the Wacky Worm, the popper to the Topwater, the jig to
    // the Jighead, the spoon to the Small Spoonbait; the Bobber keeps its id), and so do the
    // one on the hook and the journal's lists of what each species was caught on. A save made without the data loaded keeps its counts as they are.
    7: function (s) {
      var map = (G.data && G.data.gear && G.data.gear.oldLures) || {}, b = s.baits || {}, k;
      for (k in map) {
        if (map[k] === k || !(k in b)) continue;
        b[map[k]] = (b[map[k]] | 0) + (b[k] | 0);
        delete b[k];
      }
      s.baits = b;
      if (s.gear && map[s.gear.bait]) s.gear.bait = map[s.gear.bait];
      for (k in s.journal || {}) { // what each species was caught on (economy.recordCatch's took)
        var t = s.journal[k].took;
        if (!t) continue;
        for (var i = 0; i < t.length; i++) if (map[t[i]]) t[i] = map[t[i]];
        s.journal[k].took = t.filter(function (id, n) { return t.indexOf(id) === n; });
      }
      return s;
    },
    // v8 -> v9 (Phase 74, PLAN_WATERS.md 4.4): the Red Room Reservoir is retired. A save that
    // had it open gets back what it paid (its cost, 4800, written here: the water's data is
    // gone); one sitting in it wakes at Fogbound (the boat starts beside the pier). What named
    // it (its unease, the heavy-fish note, the dog's stare) goes; its catches stay.
    8: function (s) {
      s.unlocks = s.unlocks || {};
      if (s.unlocks.red) { delete s.unlocks.red; s.coins = (s.coins || 0) + RED_REFUND; }
      if (s.loc === 'red') s.loc = 'fog';
      if (s.unease) delete s.unease.red;
      if (s.flags && s.flags.heavy) delete s.flags.heavy.red;
      if (s.flags && s.flags.dogStare) delete s.flags.dogStare.red;
      return s;
    },
    // v9 -> v10 (Phase 79b, the user's word): the Storm Lantern and the Depth Finder are gone. A
    // save that had them gets back what each cost (250 and 180, written here: their data is gone).
    9: function (s) {
      var g = s.gear || {};
      if (g.lantern) s.coins = (s.coins || 0) + LANTERN_REFUND;
      if (g.depthFinder) s.coins = (s.coins || 0) + FINDER_REFUND;
      delete g.lantern; delete g.depthFinder;
      return s;
    },
    // v10 -> v11 (Phase 80, PLAN_WINTER.md 2.6): the ice. No Snow Machine yet, no ice rod in hand,
    // and a save that has opened a sea counts as having been out to sea (flags.seaSeen), which
    // opens Tamarack Lake on the chart. The holes are not saved.
    10: function (s) {
      s.gear = s.gear || {};
      s.gear.snow = false;
      s.gear.iceRod = -1;
      s.flags = s.flags || {};
      s.flags.seaSeen = !!(s.unlocks && (s.unlocks.sound || s.unlocks.wreck));
      return s;
    },
    // v11 -> v12 (Phase 84, PLAN_WINTER.md 2.6): the Back Pond, as it was: every piece of trash on
    // the bed, the stream jammed, the water murky, nothing stocked.
    11: function (s) {
      s.pond = { got: 0, stream: false, clear: 0, stock: [], caught: 0, watch: 0 };
      return s;
    },
    // v12 -> v13 (Phase 94.1, PLAN_PLAYABILITY.md): milestones. None is paid for the past: the
    // first check (js/sim/milestones.js) marks what the save has already done as reached, unpaid.
    12: function (s) {
      s.milestones = {};
      s.flags = s.flags || {};
      s.flags.msSeed = true;
      return s;
    }
  };
  var RED_REFUND = 4800, LANTERN_REFUND = 250, FINDER_REFUND = 180;

  function defaults() {
    return {
      version: VERSION,
      coins: 0,
      // Tier index per kind (data/gear.js), equipment owned, and the bait to put on.
      // Phase 43: rods, the rod indices owned (rod is the one in hand); bait may be a lure id.
      // Phase 53: lineType, the line spooled on (data/gear.js lineTypes), and lineTypes, the ones owned.
      // Phase 80: snow, the Snow Machine owned; iceRod, the ice rod in hand on the ice (-1: none).
      gear: { rod: 0, rods: [0], reel: 0, line: 0, lineType: 'mono', lineTypes: ['mono'], bait: 'worm', snow: false, iceRod: -1 },
      baits: {},             // bait or lure id -> count left
      journal: {},           // species id -> {caught, bestLen, bestW, hints, seen, phantom}
      kept: [],              // {id, len, w}
      cabinLevel: 0,         // restoration stage (data/gear.js cabin)
      unlocks: { fog: true },
      loc: 'fog',            // the location the game resumes at
      unease: {},            // location id -> 0..1
      clock: 19,             // a new game starts at dusk
      lastSeen: 0,           // ms timestamp of the last save (offline time, P12.3)
      // windowCatch: window id -> true once a fish was landed on a cast latched in it.
      // lines: special shopkeeper line id -> true once said (each is said once per save).
      // shopVisits: times the shop was entered. heavy: location id -> true once a fish too
      // heavy for the rod was near (the journal's margin note, D4).
      // anomalies: anomaly id -> times seen. dogStare: location id -> true once the dog has
      // stared at its hidden spot (10.3). lateAt: total catches when a journal page last
      // gained a late hint (10.5).
      // seaSeen (Phase 80): true once he has been out on a sea (it opens the ice).
      // exportAt, remindAt (Phase 91.2): when the save was last exported, and when the pause list last said to (ms).
      flags: { windowCatch: {}, lines: {}, shopVisits: 0, heavy: {}, anomalies: {}, dogStare: {}, lateAt: 0, seaSeen: false, exportAt: 0, remindAt: 0 },
      tapes: [],
      settings: { volume: 0.8, mute: false, dogBark: true, fullscreen: true, textSize: 'normal', tips: true, vibration: true,
        music: 1, world: 1, effects: 1, reduceFlashes: false, reduceMotion: false, reel: 'hold' }, // dogBark: Phase 42; fullscreen: Phase 59.3 (on a phone); textSize: Phase 90; tips: Phase 88; vibration: Phase 91.3; music..reel: Phase 92
      look: { fisher: 'red_cap', dog: 'golden' }, // Phase 47: the fisher and the dog (data/looks.js ids)
      pond: { got: 0, stream: false, clear: 0, stock: [], caught: 0, watch: 0 }, // Phase 84 (caught, watch: Phase 85): the Back Pond (js/sim/pond.js)
      milestones: {},        // Phase 94.1: milestone id -> true once reached (and paid)
      tipsDone: {},          // Phase 88: first-time tip id -> true once done ('landed': fish landed while the fight was said, up to 3)
      rng: null              // G.rng state, restored on load unless ?seed is given
    };
  }

  function migrate(s) {
    while (s.version < VERSION) {
      var m = migrations[s.version];
      if (!m) throw new Error('no migration from v' + s.version);
      s = m(s);
      s.version++;
    }
    // Fields added after a save was made start from their defaults.
    var d = defaults();
    for (var k in d) if (!(k in s)) s[k] = d[k];
    for (k in d.settings) if (!(k in s.settings)) s.settings[k] = d.settings[k]; // Phase 42: settings added later
    if (!s.flags || typeof s.flags !== 'object') s.flags = {};
    for (k in d.flags) if (!(k in s.flags)) s.flags[k] = d.flags[k]; // Phase 91.2: flags added later (exportAt, remindAt)
    // Phase 47: save.look is new in v5 saves, filled like any later field; an id that is not a
    // string goes back to the default (an unknown string is drawn as the default, data/looks.js).
    if (!s.look || typeof s.look !== 'object') s.look = d.look;
    for (k in d.look) if (typeof s.look[k] !== 'string') s.look[k] = d.look[k];
    return s;
  }

  function checksum(str) {
    var h = 0x811C9DC5;
    for (var i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193);
    return ('0000000' + (h >>> 0).toString(16)).slice(-8);
  }

  function b64enc(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function b64dec(str) {
    var bin = atob(str), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  }

  function encode(save) {
    var json = JSON.stringify(save);
    return PREFIX + '.' + b64enc(json) + '.' + checksum(json);
  }

  // Returns {ok: true, save} or {ok: false, error}. Never throws and never touches G.state.
  function decode(str) {
    try {
      if (typeof str !== 'string') return { ok: false, error: 'not a string' };
      var parts = str.trim().split('.');
      if (parts.length !== 3 || parts[0] !== PREFIX) return { ok: false, error: 'not a SoftStatic save' };
      var json = b64dec(parts[1]);
      if (checksum(json) !== parts[2]) return { ok: false, error: 'checksum mismatch' };
      var s = JSON.parse(json);
      if (!s || typeof s !== 'object' || Array.isArray(s)) return { ok: false, error: 'not an object' };
      if (typeof s.version !== 'number' || s.version < 1 || s.version % 1) return { ok: false, error: 'bad version' };
      if (s.version > VERSION) return { ok: false, error: 'save is from a newer version (v' + s.version + ')' };
      return { ok: true, save: migrate(s) };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  function storage() {
    try { return globalThis.localStorage || null; } catch (e) { return null; }
  }

  var status = 'not loaded';

  // Reads the stored save. Missing gives defaults; corrupt is copied to KEY + '_corrupt'
  // (so it is never lost) and defaults are used.
  function load() {
    var ls = storage(), raw = null;
    try { raw = ls && ls.getItem(KEY); } catch (e) { raw = null; }
    if (!raw) { status = 'new'; return defaults(); }
    var r = decode(raw);
    if (r.ok) { status = 'loaded v' + r.save.version; return r.save; }
    try { ls.setItem(KEY + '_corrupt', raw); } catch (e) {}
    status = 'corrupt (' + r.error + '), using defaults';
    if (G.core.debug) G.core.debug.log('save ' + status);
    return defaults();
  }

  // 12.5: one tab owns the save, so a ?compact tab and a normal one never write over each
  // other. The newest tab claims it; a tab that sees another claim stops saving, and its
  // loop waits (core/loop.js) until it is clicked, when it claims the save and reloads it.
  var OWNER = KEY + '_owner', tabId = '', lost = false;

  function claim() {
    var ls = storage();
    tabId = Date.now().toString(36) + '.' + Math.floor(performance.now() * 1000).toString(36);
    lost = false;
    try { if (ls) ls.setItem(OWNER, tabId); } catch (e) {}
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', function (e) { if (tabId && e.key === OWNER && e.newValue !== tabId) lost = true; });
  }

  function persist(save) {
    if (TOUR) { status = 'tour: not saved'; return false; }
    var ls = storage();
    if (!ls || lost) return false;
    save.lastSeen = Date.now();
    if (G.rng) save.rng = G.rng.getState();
    try { ls.setItem(KEY, encode(save)); status = 'saved'; return true; } catch (e) { return false; }
  }

  // Autosave (§0.12): on catch, purchase and location change, plus when the page is hidden
  // or closed so the clock and unease are not lost between catches.
  function autosave(reason) {
    var ok = G.state.save ? persist(G.state.save) : false;
    if (ok) status = 'autosaved (' + reason + ')';
    if (G.core.debug) G.core.debug.log('autosave: ' + reason + (ok ? '' : (TOUR ? ' (tour: not saved)' : ' FAILED')));
    return ok;
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', function () { autosave('page closed'); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) autosave('tab hidden'); });
  }

  return {
    KEY: KEY, VERSION: VERSION, migrations: migrations, RED_REFUND: RED_REFUND, LANTERN_REFUND: LANTERN_REFUND, FINDER_REFUND: FINDER_REFUND,
    defaults: defaults, migrate: migrate, load: load, persist: persist, autosave: autosave,
    tour: function () { return TOUR; },
    exportString: encode, importString: decode, claim: claim,
    lost: function () { return lost; },
    status: function () { return status; }
  };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  return 'save ' + G.core.save.status();
});
