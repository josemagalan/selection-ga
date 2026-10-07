'use strict';
// Selección de Axelrod (1986) con el ajuste de Galán e Izquierdo (2005): ejemplos a mano, la regla
// de los hijos contra una versión exacta con enteros, el ajuste a N y las copias esperadas.
const test = require('node:test');
const assert = require('node:assert/strict');

const rng = require('../js/rng.js');
const S = require('../js/operators/sel-utils.js');
const A = require('../js/operators/axelrod.js');

function randomPop(r) {
  const n = rng.randInt(r, 4, 10);
  const big = r() < 0.2;
  const f = Array.from({ length: n }, () => (r() < 0.1 ? 0 : rng.randInt(r, 1, big ? 999 : 40)));
  if (r() < 0.3) f[rng.randInt(r, 0, n - 1)] = f[0];
  if (r() < 0.05) f.fill(f[0]);
  return f;
}

// Hijos con aritmética exacta: con D_i = N · f_i − Σf, z_i ≥ 1 ⇔ D_i > 0 y N · D_i² ≥ Σ D_j²
function exactKids(f) {
  const n = f.length;
  const total = S.sum(f);
  const D = f.map((x) => n * x - total);
  const SD = S.sum(D.map((d) => d * d));
  if (SD === 0) return f.map(() => 2);
  return D.map((d) => (d > 0 && n * d * d >= SD ? 2 : d < 0 && n * d * d >= SD ? 0 : 1));
}

test('ejemplo de Goldberg: B tiene 2 hijos, C ninguno y no hay que ajustar', () => {
  const res = A.axelrodSelection(S.GOLDBERG.fitness, { seed: 5 });
  assert.deepEqual(A.axelrodKids(S.GOLDBERG.fitness).kids, [1, 2, 0, 1]);
  assert.deepEqual(res.pool, [0, 1, 1, 3]);
  assert.equal(res.draws.length, 0);
  assert.ok(res.steps.some((s) => s.type === 'balanced'));
});

test('umbrales exactos: z = 1 da 2 hijos y z = −1, ninguno', () => {
  assert.deepEqual(A.axelrodKids([1, 1, 3, 3]).kids, [0, 0, 2, 2]);
  // f̄ = 5, σ = 2: z = −1,5, −0,5, −0,5, −0,5, 0, 0, 1, 2 → M = 9 y se elimina un hijo
  assert.deepEqual(A.axelrodKids([2, 4, 4, 4, 5, 5, 7, 9]).kids, [0, 1, 1, 1, 1, 1, 2, 2]);
  const res = A.axelrodSelection([2, 4, 4, 4, 5, 5, 7, 9], { draws: [0.99] });
  assert.deepEqual(res.pool, [1, 2, 3, 4, 5, 6, 6, 7]);   // sale el 9.º hijo (una copia de H)
});

test('si faltan hijos se duplican al azar; con f̄ − σ < 0 nadie se queda sin hijos', () => {
  // f̄ = 7,5, σ ≈ 4,33: f̄ + σ ≈ 11,8 está por encima de todos → M = 3 < 4
  assert.deepEqual(A.axelrodKids([0, 10, 10, 10]).kids, [0, 1, 1, 1]);
  const res = A.axelrodSelection([0, 10, 10, 10], { draws: [0.5] });   // puesto ⌊0,5 · 3⌋ + 1 = 2: C
  assert.deepEqual(res.pool, [1, 2, 2, 3]);
  // f̄ = 10, σ ≈ 17,3: f̄ − σ < 0
  assert.equal(A.axelrodSelection([0, 0, 0, 40], { seed: 1 }).steps[1].text.key, 'statsNeg');
  assert.deepEqual(A.axelrodKids([0, 0, 0, 40]).kids, [1, 1, 1, 2]);
});

test('σ = 0: todos se replican dos veces y se elimina al azar la mitad (Galán e Izquierdo, 2005, nota 4)', () => {
  const res = A.axelrodSelection([7, 7, 7, 7, 7], { draws: [0, 0, 0, 0, 0] });
  assert.deepEqual(A.axelrodKids([7, 7, 7, 7, 7]).kids, [2, 2, 2, 2, 2]);
  assert.equal(res.draws.length, 5);
  assert.deepEqual(res.pool, [2, 3, 3, 4, 4]);
  assert.ok(res.steps.some((s) => s.type === 'classifyFlat'));
  assert.deepEqual(A.axelrodSelection([0, 0, 0, 0], { seed: 3 }).pool.length, 4);
});

test('miles de poblaciones: la regla coincide con la versión exacta y el ajuste respeta los hijos', () => {
  const r = rng.mulberry32(77);
  for (let t = 0; t < 4000; t++) {
    const f = randomPop(r);
    const n = f.length;
    const kids = exactKids(f);
    assert.deepEqual(A.axelrodKids(f).kids, kids, String(f));
    // Sumar una constante o multiplicar por un positivo no cambia nada
    assert.deepEqual(A.axelrodKids(f.map((x) => x + 500)).kids, kids, `${f} + 500`);
    assert.deepEqual(A.axelrodKids(f.map((x) => 3 * x)).kids, kids, `3 · ${f}`);
    const res = A.axelrodSelection(f, { seed: t + 1 });
    const c = S.copies(n, res.pool);
    const m = S.sum(kids);
    assert.equal(res.pool.length, n);
    assert.equal(res.draws.length, Math.abs(m - n));
    assert.deepEqual(res.pool, res.pool.slice().sort((a, b) => a - b));   // ordenados por individuo
    c.forEach((x, i) => {
      if (m > n) assert.ok(x <= kids[i]);
      else assert.ok(x >= kids[i]);
      if (kids[i] === 0) assert.equal(x, 0);
    });
    // La fila del ajuste acaba en las copias finales
    const adj = res.steps.filter((st) => st.rowValues && st.rowValues.adj);
    if (m !== n) assert.deepEqual(adj[adj.length - 1].rowValues.adj, c);
    else assert.equal(adj.length, 0);
    assert.ok(Math.abs(S.sum(res.aux.expected) - n) < 1e-9);
  }
});

test('copias esperadas N · c_i / M (eliminación y duplicación al azar)', () => {
  for (const f of [[12, 30, 5, 21, 9, 40, 1, 2], [0, 10, 10, 10, 3], [7, 7, 7, 7, 7, 7]]) {
    const n = f.length;
    const reps = 20000;
    const sumC = Array(n).fill(0);
    let exp = null;
    for (let t = 0; t < reps; t++) {
      const res = A.axelrodSelection(f, { seed: t + 1 });
      exp = res.aux.expected;
      S.copies(n, res.pool).forEach((x, i) => { sumC[i] += x; });
    }
    sumC.forEach((s, i) => assert.ok(Math.abs(s / reps - exp[i]) < 0.03, `${f}: ${i} ${s / reps} ≠ ${exp[i]}`));
  }
});
