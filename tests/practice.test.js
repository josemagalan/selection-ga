'use strict';
// Modo práctica: los datos que se dan bastan para reconstruir exactamente los padres, y la
// respuesta se lee y se corrige bien.
const test = require('node:test');
const assert = require('node:assert/strict');

const rng = require('../js/rng.js');
const S = require('../js/operators/sel-utils.js');
const P = require('../js/practice.js');
const CMP = require('../js/compare.js');
const registry = require('../js/registry.js');
const { placeCumulative } = require('../js/operators/tournament.js');

const ready = registry.families.flatMap((f) => f.operators).filter((o) => o.ready).map((o) => o.id)
  .filter((id) => !require(`../js/operators/${id}.js`).spec.replacement);

test('los datos sorteados de la práctica determinan los padres', () => {
  const r = rng.mulberry32(41);
  for (const id of ready) {
    const spec = require(`../js/operators/${id}.js`).spec;
    for (let t = 0; t < 300; t++) {
      const n = rng.randInt(r, 4, 10);
      let f;
      do f = Array.from({ length: n }, () => rng.randInt(r, 0, 40)); while (S.sum(f) === 0);
      const variant = spec.variants ? spec.variants[t % spec.variants.length] : undefined;
      const params = { k: 2 + (t % 3), p: t % 2 ? 1 : 0.7, tau: 0.3 + 0.1 * (t % 5), sp: 1.6, base: 0.7, temp: 8, shift: 500, cm: 2, c: 1.5 };
      const res = spec.run(f, { variant, params, seed: t + 1 });
      const g = P.givens(res);
      let rebuilt;
      if (g.slots.length && g.slots[0].key === 'pgPlace') {
        const cut = res.aux.top.length;
        rebuilt = g.slots.map((x) => res.aux.top[x.params.place - 1]);
        assert.ok(g.slots.every((x) => x.params.place <= cut));
      } else if (g.slots.length && g.slots[0].key.indexOf('pgTour') === 0) {
        const k = Math.min(params.k, n);
        rebuilt = g.slots.map((x) => {
          const cont = x.params.list.split(', ').map((s) => S.LABELS.indexOf(s[0]));
          assert.equal(cont.length, k);
          const ranked = cont.map((idx, m) => ({ idx, m })).sort((a, b) => f[b.idx] - f[a.idx] || a.m - b.m);
          const place = x.params.r == null ? 0 : S.firstAbove(placeCumulative(k, params.p), x.params.r);
          return ranked[place].idx;
        });
      } else if (id === 'truncation') {
        rebuilt = CMP.SAMPLERS[id](f, { variant, params }, () => { throw new Error('no debería sortear'); });
      } else {
        const draws = g.global.length ? [g.global[0].params.r] : g.slots.map((x) => x.params.r);
        rebuilt = CMP.SAMPLERS[id](f, { variant, params }, S.drawSource({ draws }).next);
      }
      assert.deepEqual(rebuilt, res.pool, `${id} ${variant}`);
    }
  }
});

test('lectura y corrección de la respuesta', () => {
  assert.deepEqual(P.parseGuess('A A d c', 4).guess, [0, 0, 3, 2]);
  assert.deepEqual(P.parseGuess('aadc', 4).guess, [0, 0, 3, 2]);
  assert.deepEqual(P.parseGuess('A, B; C · D', 4).guess, [0, 1, 2, 3]);
  assert.equal(P.parseGuess('', 4).error, 'errGuessEmpty');
  assert.equal(P.parseGuess('A B E D', 4).error, 'errGuessLetters');
  assert.equal(P.parseGuess('A B C', 4).error, 'errGuessLength');
  const cells = P.grade([0, 1, 1, 3], [0, 0, 1, 3]);
  assert.deepEqual(cells.map((c) => c.ok), [true, false, true, true]);
});
