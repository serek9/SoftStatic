var G = (typeof G !== 'undefined') ? G : (globalThis.G = {});

// Looks (Phase 47, PLAN_TACKLE.md 2.8 and §4.4): the fisher and the dog you choose, all
// open from the start, cosmetic only. A fisher is the same figure in other colours and a hat:
// coat (dark, mid, light: the jacket and sleeves), check ('' or the key of a shirt's checks),
// hat ('cap', 'knit', 'bucket' or 'lamp': a beanie with a headlamp) in hatKeys (dark, mid,
// light), hair, beard ('' or dark, mid, light), skin (dark to light, four), trousers. A dog
// is one of four breeds on the same poses: coat (dark, mid, light), ear (the ear's three
// keys), chest and muzzle (the pale front and the snout's three keys), ears ('drop',
// 'prick', 'heavy', 'pom'), tail ('feather', 'curl', 'low', 'pom'), face ('', 'mask': pale
// under the eyes, 'blaze': a pale stripe up the brow and dark round the eyes), paleLegs (the
// legs in the muzzle's keys), curly (a curled coat), bulk (the body's size against the golden
// dog's) and bark (the woof's playback rate). Names are placeholders.
// The first of each is the default and what an unknown id falls back to.
G.data = G.data || {};
G.data.looks = {
  fishers: [
    { id: 'red_cap', name: 'Red cap', coat: ['coat_dark', 'coat', 'coat_hi'], check: '', hat: 'cap', hatKeys: ['rust_dark', 'cap', 'rust_hi'],
      hair: 'stone_dark', beard: '', skin: ['flesh_dark', 'skin_shadow', 'flesh', 'skin_hi'], trousers: 'stone_dark' },
    { id: 'knit_hat', name: 'Knit hat', coat: ['wood_dark', 'wood', 'wood_hi'], check: '', hat: 'knit', hatKeys: ['teal_dark', 'teal', 'teal_hi'],
      hair: 'hair_lit', beard: ['stone_hi', 'birch', 'bone'], skin: ['flesh_dark', 'skin_shadow', 'flesh', 'skin_hi'], trousers: 'wood_deep' },
    { id: 'rain_hat', name: 'Rain hat', coat: ['slicker_dark', 'slicker', 'slicker_hi'], check: '', hat: 'bucket', hatKeys: ['slicker_dark', 'slicker', 'slicker_hi'],
      hair: 'wood_deep', beard: '', skin: ['umber_deep', 'umber_dark', 'umber', 'umber_hi'], trousers: 'denim_dark' },
    { id: 'headlamp', name: 'Headlamp', coat: ['rust_dark', 'rust', 'rust_hi'], check: 'blood', hat: 'lamp', hatKeys: ['stone_dark', 'stone', 'stone_hi'],
      hair: 'ink', beard: ['wood_deep', 'wood_dark', 'wood'], skin: ['flesh_dark', 'skin_shadow', 'flesh', 'skin_hi'], trousers: 'denim' }
  ],
  dogs: [
    { id: 'golden', name: 'Golden', coat: ['dog_dark', 'dog', 'dog_hi'], ear: ['ink', 'dog_dark', 'dog'], chest: 'dog_hi', muzzle: ['dog_dark', 'dog', 'dog_hi'],
      ears: 'drop', tail: 'feather', face: '', paleLegs: false, curly: false, bulk: 1, bark: 1 },
    { id: 'husky', name: 'Husky', coat: ['stone_dark', 'stone', 'stone_hi'], ear: ['ink', 'stone_dark', 'stone'], chest: 'bone', muzzle: ['stone_hi', 'hair_lit', 'bone'],
      ears: 'prick', tail: 'curl', face: 'mask', paleLegs: true, curly: false, bulk: 1, bark: 1.15 },
    { id: 'saint', name: 'St. Bernard', coat: ['rust_dark', 'rust', 'rust_hi'], ear: ['ink', 'rust_dark', 'rust'], chest: 'bone', muzzle: ['paper_dark', 'paper', 'bone'],
      ears: 'heavy', tail: 'low', face: 'blaze', paleLegs: true, curly: false, bulk: 1.12, bark: 0.78 },
    { id: 'poodle', name: 'Poodle', coat: ['paper_dark', 'paper', 'cream'], ear: ['reed_hi', 'paper_dark', 'paper'], chest: 'cream', muzzle: ['paper_dark', 'paper', 'cream'],
      ears: 'pom', tail: 'pom', face: '', paleLegs: false, curly: true, bulk: 0.92, bark: 1.3 }
  ],
  HATS: ['cap', 'knit', 'bucket', 'lamp'],
  EARS: ['drop', 'prick', 'heavy', 'pom'],
  TAILS: ['feather', 'curl', 'low', 'pom']
};

// The record for an id in list (fishers or dogs); the first one for an unknown id.
G.data.lookOf = function (list, id) {
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return list[0];
};

// Errors in the look records: four of each, unique ids, known shapes, and every key in palette.
G.data.validateLooks = function (L, palette) {
  var errs = [], seen = {};
  function keys(who, field, v, n) {
    if (!Array.isArray(v) || v.length !== n) { errs.push(who + ': ' + field + ' must be ' + n + ' palette keys'); return; }
    for (var i = 0; i < v.length; i++) if (!palette[v[i]]) errs.push(who + ': ' + field + ' "' + v[i] + '" is not a palette key');
  }
  function key(who, field, v, empty) {
    if (empty && v === '') return;
    if (!palette[v]) errs.push(who + ': ' + field + ' "' + v + '" is not a palette key');
  }
  function common(r, kind) {
    var who = kind + ' ' + r.id;
    if (!r.id || seen[r.id]) errs.push(who + ': needs a unique id');
    seen[r.id] = true;
    if (typeof r.name !== 'string' || !r.name) errs.push(who + ': needs a name');
    return who;
  }
  if (!L || L.fishers.length !== 4 || L.dogs.length !== 4) errs.push('looks: four fishers and four dogs');
  L.fishers.forEach(function (f) {
    var who = common(f, 'fisher');
    keys(who, 'coat', f.coat, 3); keys(who, 'hatKeys', f.hatKeys, 3); keys(who, 'skin', f.skin, 4);
    if (f.beard !== '') keys(who, 'beard', f.beard, 3);
    key(who, 'check', f.check, true); key(who, 'hair', f.hair); key(who, 'trousers', f.trousers);
    if (L.HATS.indexOf(f.hat) < 0) errs.push(who + ': hat ' + f.hat);
  });
  L.dogs.forEach(function (d) {
    var who = common(d, 'dog');
    keys(who, 'coat', d.coat, 3); keys(who, 'ear', d.ear, 3); keys(who, 'muzzle', d.muzzle, 3); key(who, 'chest', d.chest);
    if (L.EARS.indexOf(d.ears) < 0) errs.push(who + ': ears ' + d.ears);
    if (L.TAILS.indexOf(d.tail) < 0) errs.push(who + ': tail ' + d.tail);
    if (['', 'mask', 'blaze'].indexOf(d.face) < 0) errs.push(who + ': face ' + d.face);
    if (typeof d.paleLegs !== 'boolean' || typeof d.curly !== 'boolean') errs.push(who + ': paleLegs and curly are true or false');
    if (!(d.bulk >= 0.85 && d.bulk <= 1.15)) errs.push(who + ': bulk 0.85..1.15 (the poses fit their box)');
    if (!(d.bark >= 0.6 && d.bark <= 1.5)) errs.push(who + ': bark 0.6..1.5');
  });
  return errs;
};
