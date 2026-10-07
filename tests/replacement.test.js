'use strict';
// Reemplazo (selección de supervivientes): ejemplos resueltos y propiedades en miles de casos
// aleatorios, contrastados con una implementación directa e independiente.
const test = require('node:test');
const assert = require('node:assert/strict');

const rng = require('../js/rng.js');
const P = require('../js/operators/repl-utils.js');
const { muPlusLambda } = require('../js/operators/mu-plus-lambda.js');
const { muCommaLambda } = require('../js/operators/mu-comma-lambda.js');
const { elitistReplacement } = require('../js/operators/elitism.js');
const { steadyState } = require('../js/operators/steady-state.js');

const fit = (all, idx) => idx.map((i) => all[i]);
const desc = (a) => a.slice().sort((x, y) => y - x);
const randPop = (r, n) => Array.from({ length: n }, () => 1 + Math.floor(r() * 40));

test('ejemplos resueltos', () => {
  assert.deepEqual(muPlusLambda([12, 30, 5, 21], { offspring: [25, 3, 18, 30] }).pool, [7, 1, 4, 3]);
  assert.deepEqual(muCommaLambda([12, 30, 5, 21], { offspring: [25, 3, 18, 9, 14, 7] }).pool, [4, 6, 8, 7]);
  assert.deepEqual(elitistReplacement([12, 30, 5, 21], { offspring: [25, 3, 18, 9], params: { elite: 1 } }).pool, [1, 4, 6, 7]);
  assert.deepEqual(steadyState([12, 30, 5, 21], { offspring: [25, 3], variant: 'oldest', ages: [2, 5, 1, 3] }).pool, [0, 4, 2, 5]);
});

test('(μ + λ): sobreviven los μ mejores de padres e hijos; el mejor nunca se pierde', () => {
  const r = rng.mulberry32(11);
  for (let t = 0; t < 2000; t++) {
    const mu = 4 + Math.floor(r() * 7);
    const lambda = 1 + Math.floor(r() * 12);
    const par = randPop(r, mu);
    const off = randPop(r, lambda);
    const all = par.concat(off);
    const res = muPlusLambda(par, { offspring: off });
    assert.equal(res.pool.length, mu);
    assert.equal(new Set(res.pool).size, mu);
    assert.deepEqual(desc(fit(all, res.pool)), desc(all).slice(0, mu));
    assert.equal(Math.max(...fit(all, res.pool)), Math.max(...all));
    assert.deepEqual(res.pool, muPlusLambda(par, { offspring: off }).pool);
  }
});

test('(μ, λ): solo sobreviven hijos, los μ mejores; exige λ ≥ μ', () => {
  const r = rng.mulberry32(12);
  for (let t = 0; t < 2000; t++) {
    const mu = 4 + Math.floor(r() * 7);
    const lambda = mu + Math.floor(r() * (13 - mu));
    const par = randPop(r, mu);
    const off = randPop(r, lambda);
    const all = par.concat(off);
    const res = muCommaLambda(par, { offspring: off });
    assert.ok(res.pool.every((i) => i >= mu));
    assert.equal(new Set(res.pool).size, mu);
    assert.deepEqual(desc(fit(all, res.pool)), desc(off).slice(0, mu));
  }
  assert.throws(() => muCommaLambda([5, 6, 7, 8], { offspring: [1, 2, 3] }), /errLambdaMu/);
});

test('generacional con elitismo: los e mejores padres sustituyen a los e peores hijos', () => {
  const r = rng.mulberry32(13);
  for (let t = 0; t < 2000; t++) {
    const mu = 4 + Math.floor(r() * 7);
    const e = Math.floor(r() * 4);
    const par = randPop(r, mu);
    const off = randPop(r, mu);
    const all = par.concat(off);
    const res = elitistReplacement(par, { offspring: off, params: { elite: e } });
    const ee = Math.min(e, mu - 1);
    assert.equal(res.pool.length, mu);
    assert.equal(res.pool.filter((i) => i < mu).length, ee);
    assert.deepEqual(desc(fit(all, res.pool.filter((i) => i < mu))), desc(par).slice(0, ee));
    assert.deepEqual(desc(fit(all, res.pool.filter((i) => i >= mu))), desc(off).slice(0, mu - ee));
    if (ee > 0) assert.ok(Math.max(...fit(all, res.pool)) >= Math.max(...par));
    if (ee === 0) assert.deepEqual(res.pool.slice().sort((a, b) => a - b), off.map((_, k) => mu + k));
  }
});

// Implementación directa del estado estacionario, hueco a hueco
function steadyRef(par, off, variant, ages, draws) {
  const mu = par.length;
  const all = par.concat(off);
  const slot = par.map((_, i) => i);
  const age = ages.slice();
  let k = 0;
  off.forEach((_, c) => {
    let v = 0;
    if (variant === 'worst') { for (let j = 1; j < mu; j++) if (all[slot[j]] < all[slot[v]]) v = j; }
    else if (variant === 'oldest') { for (let j = 1; j < mu; j++) if (age[j] > age[v]) v = j; }
    else v = Math.floor(draws[k++] * mu);
    for (let j = 0; j < mu; j++) age[j]++;
    slot[v] = mu + c;
    age[v] = 0;
  });
  return slot;
}

test('estado estacionario: cada hijo sustituye al peor, al más viejo o a uno al azar', () => {
  const r = rng.mulberry32(14);
  for (const variant of ['worst', 'oldest', 'random']) {
    for (let t = 0; t < 1500; t++) {
      const mu = 4 + Math.floor(r() * 7);
      const lambda = 1 + Math.floor(r() * 3);
      const par = randPop(r, mu);
      const off = randPop(r, lambda);
      const ages = Array.from({ length: mu }, () => 1 + Math.floor(r() * 5));
      const draws = Array.from({ length: lambda }, () => Math.floor(r() * 100) / 100);
      const res = steadyState(par, { offspring: off, variant, ages, draws });
      assert.deepEqual(res.pool, steadyRef(par, off, variant, ages, draws), `${variant} ${par} ${off}`);
      // el último hijo siempre entra (uno anterior puede ser sustituido por otro hijo)
      assert.ok(res.pool.includes(mu + lambda - 1));
      assert.equal(res.draws.length, variant === 'random' ? lambda : 0);
    }
  }
});

test('datos aleatorios de reemplazo reproducibles y válidos', () => {
  assert.deepEqual(P.randomOffspring(7, 6), P.randomOffspring(7, 6));
  assert.deepEqual(P.randomAges(7, 5), P.randomAges(7, 5));
  P.randomOffspring(3, 12).forEach((x) => assert.ok(x >= 1 && x <= 40 && Number.isInteger(x)));
  P.randomAges(3, 10).forEach((x) => assert.ok(x >= 1 && x <= 5));
  assert.equal(P.validateOffspring([1, 2], 3), 'errLambda');
  assert.equal(P.validateOffspring('x'), 'errFormat');
  assert.equal(P.validateOffspring([1, -2]), 'errFitness');
  assert.equal(P.validateOffspring([1, 2]), null);
});

test('estado estacionario: la fila «Edad» da en cada paso la edad actual', () => {
  const r = rng.mulberry32(15);
  for (let t = 0; t < 500; t++) {
    const mu = 4 + Math.floor(r() * 7);
    const lambda = 1 + Math.floor(r() * 3);
    const par = randPop(r, mu);
    const off = randPop(r, lambda);
    const ages = Array.from({ length: mu }, () => 1 + Math.floor(r() * 5));
    const res = steadyState(par, { offspring: off, variant: 'oldest', ages });
    assert.deepEqual(res.steps[0].rowValues.age, ages.concat(Array(lambda).fill(null)));
    res.steps.filter((s) => s.type === 'replace').forEach((s) => {
      const victim = s.hl[1];
      assert.equal(s.rowValues.age[victim], s.text.params.age);
      // es el más viejo de la población en ese momento
      s.pool.filter((i) => i !== s.hl[0]).forEach((i) => assert.ok(s.rowValues.age[i] <= s.text.params.age));
    });
    const last = res.steps[res.steps.length - 1];
    assert.equal(last.rowValues.age[mu + lambda - 1], 0);
    res.pool.forEach((i) => assert.ok(last.rowValues.age[i] != null));
  }
});
