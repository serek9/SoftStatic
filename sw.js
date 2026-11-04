// SoftStatic's service worker (Phase 91.1, PLAN_PLAYABILITY.md): the game played offline.
// No library. Every file index.html loads is cached on install (the list below; node
// tools/balance.js --validate fails when it and index.html disagree). A page is served from the
// cache at once; each load also fetches every file again in the background, and when one has
// changed, the whole set is written to the cache together and the page is told, so the next load
// runs the new version and its HUD says Updated. Not registered on localhost or 127.0.0.1 unless
// the address has ?sw, so a PC served by http.server works exactly as before.
var CACHE = 'softstatic-v1';
var FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icon-192.png',
  'icon-512.png',
  'js/core/debug.js',
  'js/core/rng.js',
  'js/core/state.js',
  'js/core/input.js',
  'js/core/device.js',
  'js/core/save.js',
  'js/core/loop.js',
  'data/loc_fog.js',
  'data/loc_creek.js',
  'data/loc_pines.js',
  'data/loc_copper.js',
  'data/loc_harts.js',
  'data/loc_stone.js',
  'data/loc_russet.js',
  'data/loc_sound.js',
  'data/loc_wreck.js',
  'data/loc_tamarack.js',
  'data/loc_pond.js',
  'data/fish.js',
  'data/fishlooks.js',
  'data/lurelooks.js',
  'data/gear.js',
  'data/pond.js',
  'data/milestones.js',
  'data/dialogue.js',
  'data/anomalies.js',
  'data/looks.js',
  'js/sim/clock.js',
  'js/sim/unease.js',
  'js/sim/fish_ai.js',
  'js/sim/bite.js',
  'js/sim/fight.js',
  'js/sim/economy.js',
  'js/sim/pond.js',
  'js/sim/milestones.js',
  'js/gfx/bake.js',
  'js/gfx/sprites.js',
  'js/gfx/paint.js',
  'js/gfx/pix.js',
  'js/gfx/fx.js',
  'js/gfx/water.js',
  'js/gfx/surface.js',
  'js/gfx/rope.js',
  'js/gfx/rod.js',
  'js/gfx/fishgen.js',
  'js/gfx/luregen.js',
  'js/scene/boat.js',
  'js/scene/fisher.js',
  'js/scene/dog.js',
  'js/scene/underwater.js',
  'js/scene/life.js',
  'js/scene/scenery.js',
  'js/scene/rivers.js',
  'js/scene/lakes.js',
  'js/scene/seas.js',
  'js/scene/winter.js',
  'js/scene/pond.js',
  'js/scene/ice.js',
  'js/scene/sailing.js',
  'js/ui/hud.js',
  'js/ui/panel.js',
  'js/ui/card.js',
  'js/ui/setup.js',
  'js/ui/look.js',
  'js/ui/menu.js',
  'js/ui/journal.js',
  'js/ui/room.js',
  'js/ui/room_kit.js',
  'js/ui/shop_room.js',
  'js/ui/shop.js',
  'js/ui/map.js',
  'js/ui/dock.js',
  'js/ui/cabin.js',
  'js/ui/tips.js',
  'js/ui/controls.js',
  'js/ui/badge.js',
  'js/ui/milestones.js',
  'js/audio/engine.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES.map(function (f) { return new Request(f, { cache: 'reload' }); })); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('softstatic-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// Fetch every file afresh; if every one came and any differs from the cached copy, put them all
// (one set, never half old and half new) and tell the open pages.
var refreshing = null;
function refresh() {
  if (refreshing) return refreshing;
  refreshing = caches.open(CACHE).then(function (c) {
    return Promise.all(FILES.map(function (f) {
      return fetch(new Request(f, { cache: 'no-cache' })).then(function (r) {
        if (!r.ok) throw new Error(f + ' ' + r.status);
        return Promise.all([r.clone().arrayBuffer(), c.match(f).then(function (o) { return o ? o.arrayBuffer() : null; })]).then(function (ab) {
          var a = new Uint8Array(ab[0]), b = ab[1] ? new Uint8Array(ab[1]) : null, same = !!b && a.length === b.length;
          for (var i = 0; same && i < a.length; i++) if (a[i] !== b[i]) same = false;
          return { f: f, r: r, same: same };
        });
      });
    })).then(function (got) {
      if (got.every(function (g) { return g.same; })) return false;
      return Promise.all(got.map(function (g) { return c.put(g.f, g.r); })).then(function () {
        return self.clients.matchAll().then(function (cs) { cs.forEach(function (cl) { cl.postMessage({ type: 'updated' }); }); return true; });
      });
    });
  }).catch(function () { return false; }).then(function (v) { refreshing = null; return v; });
  return refreshing;
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  var nav = req.mode === 'navigate';
  if (nav) e.waitUntil(refresh());
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(nav ? './' : req, { ignoreSearch: true }).then(function (hit) { return hit || fetch(req); });
  }));
});

self.addEventListener('message', function (e) {
  if (e.data === 'refresh') e.waitUntil(refresh().then(function (v) { if (e.source) e.source.postMessage({ type: 'refreshed', changed: v }); }));
});
