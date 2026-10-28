var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Save skeleton (§0.12). Saves are stored and exported in one string format:
//   SS1.<base64 of the JSON>.<FNV-1a checksum of the JSON>
// so a damaged or hand-edited string is detected before anything is loaded.
G.core = G.core || {};
G.core.save = (function () {
  var KEY = 'softstatic_save_v1';
  var VERSION = 1;
  var PREFIX = 'SS1';

  // migrations[v](save) returns the save reshaped for version v + 1; migrate() bumps the number.
  var migrations = {};

  // TODO(P8.3): fill in the real contents of each field.
  function defaults() {
    return {
      version: VERSION,
      coins: 0,
      gear: {},
      baits: {},
      journal: {},
      kept: [],
      cabinLevel: 0,
      unlocks: {},
      unease: {},
      clock: 0,
      lastSeen: 0,
      flags: {},
      tapes: [],
      settings: {},
      rng: null
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

  // TODO(P8.3): autosave on catch, purchase and location change.
  function persist(save) {
    var ls = storage();
    if (!ls) return false;
    try { ls.setItem(KEY, encode(save)); status = 'saved'; return true; } catch (e) { return false; }
  }

  return {
    KEY: KEY, VERSION: VERSION, migrations: migrations,
    defaults: defaults, migrate: migrate, load: load, persist: persist,
    exportString: encode, importString: decode,
    status: function () { return status; }
  };
})();

if (G.core.debug) G.core.debug.addLine(function () {
  return 'save ' + G.core.save.status();
});
