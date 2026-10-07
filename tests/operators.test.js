'use strict';
// Lógica de los mecanismos de selección: ejemplos resueltos a mano, miles de casos al azar contra
// una implementación independiente con aritmética exacta (enteros, sin coma flotante) y
// propiedades estadísticas (copias esperadas, sesgo nulo y dispersión mínima de SUS…).
const test = require('node:test');
const assert = require('node:assert/strict');

const rng = require('../js/rng.js');
const S = require('../js/operators/sel-utils.js');
const { rouletteSelection } = require('../js/operators/roulette.js');
const { susSelection } = require('../js/operators/sus.js');
const { linearRanking, rankProb } = require('../js/operators/linear-ranking.js');
const { tournamentSelection } = require('../js/operators/tournament.js');
const { truncationSelection, cutSize } = require('../js/operators/truncation.js');

const G = S.GOLDBERG.fitness;   // [169, 576, 64, 361], Σ = 1170

// Población al azar con empates y ceros de vez en cuando
function randomPop(r, proportional) {
  const n = rng.randInt(r, 4, 10);
  const big = r() < 0.2;
  let f;
  do {
    f = Array.from({ length: n }, () => (r() < 0.1 ? 0 : rng.randInt(r, 1, big ? 999 : 40)));
    if (r() < 0.3) f[rng.randInt(r, 0, n - 1)] = f[0];
  } while (proportional && S.sum(f) === 0);
  return f;
}
const hundredths = (x) => Math.round(x * 100);
const cum = (a) => { let c = 0; return a.map((v) => (c += v)); };

// ---------- Implementaciones independientes, exactas (solo enteros) ----------

function exactWheel(weights, m) {
  // primer i con m/100 < W_i / W, es decir, m · W < 100 · W_i
  const W = S.sum(weights);
  const C = cum(weights);
  for (let i = 0; i < C.length; i++) if (m * W < 100 * C[i]) return i;
  return C.length - 1;
}
function exactSus(weights, m) {
  // puntero k en (m/100 + k) en la escala de N: (m + 100k) · W < 100 · N · W_i
  const n = weights.length;
  const W = S.sum(weights);
  const C = cum(weights);
  const out = [];
  let i = 0;
  for (let k = 0; k < n; k++) {
    while (i < n - 1 && !((m + 100 * k) * W < 100 * n * C[i])) i++;
    out.push(i);
  }
  return out;
}
// Pesos enteros del ranking lineal con s = s10 / 10: 10 · N · (N − 1) · p(j)
const rankWeights = (n, s10) => Array.from({ length: n }, (_, j) => (20 - s10) * (n - 1) + 2 * j * (s10 - 10));

// ---------- Ruleta ----------

test('ruleta: ejemplo de Goldberg resuelto a mano', () => {
  const res = rouletteSelection(G, { draws: [0.01, 0.06, 0.97, 0.69] });
  // q = 0,1444 · 0,6368 · 0,6915 · 1: 0,69 < 0,6915 → C
  assert.deepEqual(res.pool, [0, 0, 3, 2]);
  assert.equal(res.steps[res.steps.length - 1].type, 'done');
  assert.deepEqual(res.steps.map((s) => s.type), ['intro', 'sum', 'prob', 'cum', 'spin', 'spin', 'spin', 'spin', 'done']);
});

test('ruleta: empates exactos con un límite van al individuo siguiente', () => {
  // f = 25 · 25 · 25 · 25: q = 0,25 · 0,5 · 0,75 · 1; r = 0,25 no es < 0,25
  assert.deepEqual(rouletteSelection([25, 25, 25, 25], { draws: [0.25, 0.5, 0.75, 0.24] }).pool, [1, 2, 3, 0]);
  // 0,1 + 0,2 en coma flotante: q = 0,1 · 0,3 · 0,6 · 1 y r = 0,3 → tercero
  assert.deepEqual(rouletteSelection([1, 2, 3, 4], { draws: [0.3, 0.1, 0.6, 0.99] }).pool, [2, 1, 3, 3]);
});

test('ruleta: 4000 casos iguales que la versión exacta; nunca elige aptitud 0', () => {
  const r = rng.mulberry32(11);
  for (let t = 0; t < 4000; t++) {
    const f = randomPop(r, true);
    const res = rouletteSelection(f, { seed: t + 1 });
    assert.equal(res.pool.length, f.length);
    res.draws.forEach((d, k) => assert.equal(res.pool[k], exactWheel(f, hundredths(d)), `${f} r=${d}`));
    res.pool.forEach((i) => assert.ok(f[i] > 0));
    assert.deepEqual(rouletteSelection(f, { draws: res.draws }).pool, res.pool);
  }
});

test('ruleta: frecuencias proporcionales a la aptitud (20 000 giros)', () => {
  const f = [10, 20, 30, 40];
  const count = [0, 0, 0, 0];
  for (let t = 0; t < 5000; t++) rouletteSelection(f, { seed: t + 1 }).pool.forEach((i) => { count[i]++; });
  count.forEach((c, i) => assert.ok(Math.abs(c / 20000 - f[i] / 100) < 0.012, `${count}`));
});

test('ruleta y SUS: errores con una población no válida', () => {
  assert.throws(() => rouletteSelection([0, 0, 0, 0], { seed: 1 }), /errSumZero/);
  assert.throws(() => susSelection([1, 2, 3], { seed: 1 }), /errSize/);
  assert.throws(() => rouletteSelection([1, 2, -3, 4], { seed: 1 }), /errFitness/);
  assert.throws(() => rouletteSelection([1, 2, 3.5, 4], { seed: 1 }), /errFitness/);
});

// ---------- SUS ----------

test('SUS: ejemplo de Goldberg resuelto a mano', () => {
  // e = 0,578 · 1,969 · 0,219 · 1,234; E = 0,578 · 2,547 · 2,766 · 4; punteros 0,01 · 1,01 · 2,01 · 3,01
  assert.deepEqual(susSelection(G, { draws: [0.01] }).pool, [0, 1, 1, 3]);
  // r = 0,6: punteros 0,6 · 1,6 · 2,6 · 3,6 → B B C D
  assert.deepEqual(susSelection(G, { draws: [0.6] }).pool, [1, 1, 2, 3]);
});

test('SUS: 4000 casos iguales que la versión exacta; cada uno recibe ⌊e⌋ o ⌈e⌉ copias', () => {
  const r = rng.mulberry32(12);
  for (let t = 0; t < 4000; t++) {
    const f = randomPop(r, true);
    const n = f.length;
    const res = susSelection(f, { seed: t + 1 });
    assert.equal(res.draws.length, 1);
    assert.deepEqual(res.pool, exactSus(f, hundredths(res.draws[0])), `${f} r=${res.draws[0]}`);
    const c = S.copies(n, res.pool);
    const total = S.sum(f);
    f.forEach((fi, i) => {
      const e = (n * fi) / total;
      assert.ok(c[i] >= Math.floor(e + 1e-9) && c[i] <= Math.ceil(e - 1e-9), `${f}: ${c}`);
    });
  }
});

test('SUS: sesgo nulo (copias medias = esperadas) en 10 000 ejecuciones', () => {
  const f = [3, 17, 8, 12, 5];
  const total = S.sum(f);
  const count = Array(5).fill(0);
  for (let t = 0; t < 10000; t++) susSelection(f, { seed: t + 1 }).pool.forEach((i) => { count[i]++; });
  count.forEach((c, i) => assert.ok(Math.abs(c / 10000 - (5 * f[i]) / total) < 0.03, `${count}`));
});

// ---------- Ranking lineal ----------

test('ranking lineal: probabilidades, ejemplo resuelto y extremos de s', () => {
  for (let n = 4; n <= 10; n++) {
    for (let s10 = 10; s10 <= 20; s10++) {
      const s = s10 / 10;
      const p = Array.from({ length: n }, (_, j) => rankProb(j, n, s));
      assert.ok(Math.abs(S.sum(p) - 1) < 1e-12);
      assert.ok(Math.abs(n * p[n - 1] - s) < 1e-12 && Math.abs(n * p[0] - (2 - s)) < 1e-12);
    }
  }
  // Goldberg con s = 1,5: orden C A D B; p = 0,125 · 0,2083 · 0,2917 · 0,375; q = 0,125 · 0,333 · 0,625 · 1
  assert.deepEqual(linearRanking(G, { params: { sp: 1.5 }, draws: [0.01, 0.06, 0.97, 0.69] }).pool, [2, 2, 1, 1]);
  assert.deepEqual(linearRanking(G, { params: { sp: 1.5 }, variant: 'sus', draws: [0.01] }).pool, [2, 0, 3, 1]);
  // s = 2: el peor (C) no sale nunca
  for (let t = 0; t < 200; t++) assert.ok(!linearRanking(G, { params: { sp: 2 }, seed: t + 1 }).pool.includes(2));
});

test('ranking lineal: 4000 casos iguales que la versión exacta (ruleta y SUS)', () => {
  const r = rng.mulberry32(13);
  for (let t = 0; t < 4000; t++) {
    const f = randomPop(r, false);
    const n = f.length;
    const s10 = rng.randInt(r, 10, 20);
    const order = S.ascending(f);
    const w = rankWeights(n, s10);
    const resR = linearRanking(f, { params: { sp: s10 / 10 }, seed: t + 1 });
    resR.draws.forEach((d, k) => assert.equal(resR.pool[k], order[exactWheel(w, hundredths(d))], `${f} s=${s10 / 10} r=${d}`));
    const resS = linearRanking(f, { params: { sp: s10 / 10 }, variant: 'sus', seed: t + 1 });
    assert.deepEqual(resS.pool, exactSus(w, hundredths(resS.draws[0])).map((j) => order[j]), `${f} s=${s10 / 10}`);
  }
});

// ---------- Torneo ----------

test('torneo: gana el de mayor aptitud; sin reemplazo los contendientes son distintos', () => {
  const r = rng.mulberry32(14);
  for (let t = 0; t < 3000; t++) {
    const f = randomPop(r, false);
    const n = f.length;
    const k = rng.randInt(r, 2, Math.min(5, n));
    const variant = t % 2 ? 'with' : 'without';
    const res = tournamentSelection(f, { variant, params: { k, p: 1 }, seed: t + 1 });
    const tours = res.steps.filter((s) => s.type === 'tour');
    assert.equal(tours.length, n);
    tours.forEach((st, j) => {
      const cont = st.contestants.map((c) => c.idx);
      assert.equal(cont.length, k);
      if (variant === 'without') assert.equal(new Set(cont).size, k);
      const best = Math.max.apply(null, cont.map((i) => f[i]));
      assert.equal(f[res.pool[j]], best);
      // a igual aptitud gana el primero que salió en el sorteo
      assert.equal(res.pool[j], cont.find((i) => f[i] === best));
    });
    assert.deepEqual(tournamentSelection(f, { variant, params: { k, p: 1 }, draws: res.draws }).pool, res.pool);
  }
});

test('torneo binario: frecuencias (2j − 1)/N² con reemplazo y 2(j − 1)/(N(N − 1)) sin reemplazo', () => {
  const f = [5, 9, 12, 17, 21];   // ya ordenada de peor a mejor: j = 1…5
  const n = f.length;
  for (const variant of ['with', 'without']) {
    const count = Array(n).fill(0);
    for (let t = 0; t < 8000; t++) tournamentSelection(f, { variant, params: { k: 2, p: 1 }, seed: t + 1 }).pool.forEach((i) => { count[i]++; });
    count.forEach((c, i) => {
      const j = i + 1;
      const expect = variant === 'with' ? (2 * j - 1) / (n * n) : (2 * (j - 1)) / (n * (n - 1));
      assert.ok(Math.abs(c / (8000 * n) - expect) < 0.01, `${variant}: ${count}`);
    });
  }
});

test('torneo estocástico: el mejor gana con probabilidad p', () => {
  const f = [10, 20, 30, 40];
  let bestWins = 0;
  let total = 0;
  for (let t = 0; t < 4000; t++) {
    const res = tournamentSelection(f, { variant: 'without', params: { k: 2, p: 0.75 }, seed: t + 1 });
    res.steps.filter((s) => s.type === 'tourStoch').forEach((st, j) => {
      const cont = st.contestants.map((c) => c.idx);
      const best = cont.reduce((a, b) => (f[b] > f[a] ? b : a));
      if (res.pool[j] === best) bestWins++;
      total++;
    });
  }
  assert.ok(Math.abs(bestWins / total - 0.75) < 0.015, `${bestWins / total}`);
});

// ---------- Truncamiento ----------

test('truncamiento: T = ⌈τ · N⌉ y solo los T mejores son padres', () => {
  for (let n = 4; n <= 10; n++) {
    for (let t10 = 1; t10 <= 10; t10++) assert.equal(cutSize(n, t10 / 10), Math.max(1, Math.ceil((t10 * n) / 10)));
  }
  const r = rng.mulberry32(15);
  for (let t = 0; t < 3000; t++) {
    const f = randomPop(r, false);
    const n = f.length;
    const tau = rng.randInt(r, 1, 10) / 10;
    const T = cutSize(n, tau);
    const top = new Set(S.ascending(f).slice(n - T));
    for (const variant of ['random', 'cyclic']) {
      const res = truncationSelection(f, { variant, params: { tau }, seed: t + 1 });
      res.pool.forEach((i) => assert.ok(top.has(i)));
      if (variant === 'cyclic') {
        const c = S.copies(n, res.pool);
        [...top].forEach((i) => assert.ok(c[i] === Math.floor(n / T) || c[i] === Math.ceil(n / T)));
      }
    }
  }
  // Goldberg, τ = 0,5, por turnos: B D B D
  assert.deepEqual(truncationSelection(G, { variant: 'cyclic', params: { tau: 0.5 } }).pool, [1, 3, 1, 3]);
});

// ---------- Traza ----------

test('trazas: la población de padres crece de uno en uno y el resumen final cuadra', () => {
  const runs = [
    (f, s) => rouletteSelection(f, { seed: s }),
    (f, s) => susSelection(f, { seed: s }),
    (f, s) => linearRanking(f, { seed: s, variant: s % 2 ? 'sus' : 'roulette', params: { sp: 1.7 } }),
    (f, s) => tournamentSelection(f, { seed: s, params: { k: 3, p: s % 2 ? 1 : 0.8 } }),
    (f, s) => truncationSelection(f, { seed: s, params: { tau: 0.4 } }),
  ];
  const r = rng.mulberry32(16);
  for (let t = 0; t < 300; t++) {
    const f = randomPop(r, true);
    for (const run of runs) {
      const res = run(f, t + 1);
      let prev = 0;
      res.steps.forEach((st) => {
        assert.ok(st.pool.length === prev || st.pool.length === prev + 1);
        if (st.pool.length === prev + 1) assert.equal(st.newSlot, prev);
        prev = st.pool.length;
        assert.equal(st.order.length, f.length);
      });
      const done = res.steps[res.steps.length - 1];
      assert.equal(done.pool.length, f.length);
      const dp = done.text.params;
      assert.equal(dp.pool, res.pool.map(S.label).join(' '));
      assert.equal(dp.distinct + dp.nLost, f.length);
    }
  }
});

// ---------- Fase 2: contraejemplo, escalado, Boltzmann y ranking exponencial ----------

const { offsetRoulette } = require('../js/operators/offset.js');
const { scaledRoulette, scale } = require('../js/operators/scaled-roulette.js');
const { boltzmannSelection } = require('../js/operators/boltzmann.js');
const { exponentialRanking } = require('../js/operators/exponential-ranking.js');

const probsOf = (res) => res.aux.rows.find((r) => r.id === 'p').values;

test('contraejemplo: con C = 0 es la ruleta; con C grande las probabilidades se igualan', () => {
  const r = rng.mulberry32(21);
  for (let t = 0; t < 500; t++) {
    const f = randomPop(r, true);
    const a = offsetRoulette(f, { params: { shift: 0 }, seed: t + 1 });
    assert.deepEqual(a.pool, rouletteSelection(f, { draws: a.draws }).pool);
    const p = probsOf(offsetRoulette(f, { params: { shift: 2000 }, seed: t + 1 }));
    p.forEach((x) => assert.ok(Math.abs(x - 1 / f.length) < 0.07));
    // el orden de las probabilidades es el de la aptitud
    for (let i = 0; i < f.length; i++) for (let j = 0; j < f.length; j++) if (f[i] > f[j]) assert.ok(p[i] > p[j]);
  }
});

test('escalado lineal: conserva la media; el mejor vale cm · media o el peor vale 0', () => {
  const r = rng.mulberry32(22);
  for (let t = 0; t < 2000; t++) {
    const f = randomPop(r, true);
    const cm = [1.2, 1.5, 2, 2.5, 3][t % 5];
    const sc = scale(f, 'linear', { cm });
    const mean = S.sum(f) / f.length;
    if (sc.mode === 'flat') { assert.deepEqual(sc.fs, f); continue; }
    assert.ok(Math.abs(S.sum(sc.fs) / f.length - mean) < 1e-9 * Math.max(1, mean));
    sc.fs.forEach((x) => assert.ok(x >= 0));
    const best = Math.max.apply(null, sc.fs);
    if (sc.mode === 'max') assert.ok(Math.abs(best - cm * mean) < 1e-9 * Math.max(1, mean));
    else assert.ok(Math.min.apply(null, sc.fs) < 1e-9 && best <= cm * mean + 1e-9);
    // el orden se conserva
    for (let i = 0; i < f.length; i++) for (let j = 0; j < f.length; j++) if (f[i] > f[j]) assert.ok(sc.fs[i] > sc.fs[j]);
  }
  // ejemplo a mano: f = 10 · 20 · 30 · 40, media 25, máx 40, cm = 1,5 → a = 0,8333…, b = 4,1666… (el mejor vale 37,5)
  const sc = scale([10, 20, 30, 40], 'linear', { cm: 1.5 });
  assert.equal(sc.mode, 'max');
  assert.ok(Math.abs(sc.fs[3] - 37.5) < 1e-9 && Math.abs(sc.fs[0] - 12.5) < 1e-9);
});

test('truncamiento sigma: f′ = máx(0, f − (media − c·σ)) y nunca elige a los que quedan en 0', () => {
  // f = 2 · 4 · 4 · 4 · 5 · 5 · 7 · 9: media 5, σ = 2; con c = 1 la base es 3
  const f = [2, 4, 4, 4, 5, 5, 7, 9];
  const sc = scale(f, 'sigma', { c: 1 });
  assert.ok(Math.abs(sc.base - 3) < 1e-12);
  assert.deepEqual(sc.fs.map((x) => Math.round(x * 1e9) / 1e9), [0, 1, 1, 1, 2, 2, 4, 6]);
  for (let t = 0; t < 300; t++) assert.ok(!scaledRoulette(f, { variant: 'sigma', params: { c: 1 }, seed: t + 1 }).pool.includes(0));
  // todos iguales: no se escala
  assert.deepEqual(scale([7, 7, 7, 7], 'sigma', { c: 2 }).fs, [7, 7, 7, 7]);
});

test('Boltzmann: no cambia al desplazar la aptitud; con T alta casi al azar y con T baja gana el mejor', () => {
  const f = [12, 30, 5, 21, 9];
  const shifted = f.map((x) => x + 500);
  for (const temp of [1, 5, 20]) {
    const a = probsOf(boltzmannSelection(f, { params: { temp }, seed: 1 }));
    const b = probsOf(boltzmannSelection(shifted, { params: { temp }, seed: 1 }));
    a.forEach((x, i) => assert.ok(Math.abs(x - b[i]) < 1e-12));
    // cociente de probabilidades = exp(Δf / T)
    assert.ok(Math.abs(a[1] / a[3] / Math.exp((30 - 21) / temp) - 1) < 1e-9);
  }
  probsOf(boltzmannSelection(f, { params: { temp: 50 }, seed: 1 })).forEach((x) => assert.ok(Math.abs(x - 0.2) < 0.1));
  // con T = 1 el mejor (B) se lo lleva casi todo; r = 0,00 aún cae en el sector diminuto de A
  let bWins = 0;
  for (let t = 0; t < 100; t++) bWins += boltzmannSelection(f, { params: { temp: 1 }, seed: t + 1 }).pool.filter((i) => i === 1).length;
  assert.ok(bWins / 500 > 0.95, `${bWins}`);
});

test('ranking exponencial: cada rango tiene 1/c veces la probabilidad del anterior', () => {
  const r = rng.mulberry32(23);
  for (let t = 0; t < 1000; t++) {
    const f = randomPop(r, false);
    const c = [0.5, 0.65, 0.8, 0.95][t % 4];
    const res = exponentialRanking(f, { params: { base: c }, seed: t + 1, variant: t % 2 ? 'sus' : 'roulette' });
    const order = S.ascending(f);
    const p = res.aux.rows.find((x) => x.id === 'p' || x.id === 'e').values;
    for (let j = 1; j < f.length; j++) assert.ok(Math.abs(p[order[j]] / p[order[j - 1]] - 1 / c) < 1e-9);
    assert.equal(res.pool.length, f.length);
  }
});

// ---------- Muestreo rápido (comparación, copias y simulación) ----------

const CMP = require('../js/compare.js');
const registry = require('../js/registry.js');

test('muestreo rápido: elige los mismos padres que cada mecanismo animado con los mismos números', () => {
  const PARAMS = {
    offset: [{ shift: 0 }, { shift: 1000 }],
    'scaled-roulette': [{ cm: 1.5, c: 1 }, { cm: 2, c: 2 }],
    boltzmann: [{ temp: 3 }, { temp: 20 }],
    'linear-ranking': [{ sp: 1.2 }, { sp: 2 }],
    'exponential-ranking': [{ base: 0.5 }, { base: 0.9 }],
    tournament: [{ k: 2, p: 1 }, { k: 3, p: 0.7 }],
    truncation: [{ tau: 0.3 }, { tau: 0.8 }],
  };
  const ready = registry.families.flatMap((f) => f.operators).filter((o) => o.ready).map((o) => o.id);
  const r = rng.mulberry32(31);
  for (const id of ready) {
    assert.ok(CMP.SAMPLERS[id], `falta el muestreador de ${id}`);
    const spec = require(`../js/operators/${id}.js`).spec;
    for (let t = 0; t < 400; t++) {
      const f = randomPop(r, !!spec.proportional);
      const params = (PARAMS[id] || [{}])[t % 2];
      const variant = spec.variants ? spec.variants[t % spec.variants.length] : undefined;
      const res = spec.run(f, { variant, params, seed: t + 1 });
      const src = S.drawSource({ draws: res.draws });
      assert.deepEqual(CMP.SAMPLERS[id](f, { variant, params }, src.next), res.pool, `${id} ${variant} ${f}`);
      assert.equal(src.used.length, res.draws.length);
    }
  }
});

test('copias en muchas repeticiones: SUS solo da ⌊e⌋ o ⌈e⌉; la ruleta, más; medias ≈ esperadas', () => {
  const f = [12, 30, 5, 21, 9, 17];
  const total = S.sum(f);
  const sus = CMP.copiesDistribution('sus', f, { params: {} }, 2000, 5);
  const rou = CMP.copiesDistribution('roulette', f, { params: {} }, 2000, 5);
  f.forEach((fi, i) => {
    const e = (6 * fi) / total;
    sus.dist[i].forEach((p, c) => { if (p > 0) assert.ok(c === Math.floor(e) || c === Math.ceil(e)); });
    assert.ok(Math.abs(sus.mean[i] - e) < 0.05 && Math.abs(rou.mean[i] - e) < 0.08);
    assert.ok(sus.sd[i] < rou.sd[i]);
  });
});

test('métricas y simulación: más presión con torneo grande que con la ruleta desplazada', () => {
  const f = [12, 30, 5, 21, 9, 17, 26, 3];
  const flat = CMP.metrics('offset', f, { params: { shift: 2000 } }, 1000, 1);
  const hard = CMP.metrics('tournament', f, { params: { k: 5, p: 1 } }, 1000, 1);
  assert.ok(hard.intensity > flat.intensity + 0.5);
  assert.ok(hard.lost > flat.lost);
  assert.ok(Math.abs(CMP.metrics('sus', f, { params: {} }, 1000, 1).best - (8 * 30) / S.sum(f)) < 0.05);
  const simT = CMP.simulate('truncation', { params: { tau: 0.5 }, variant: 'random' }, { runs: 10, gens: 30, seed: 2 });
  const simO = CMP.simulate('offset', { params: { shift: 1000 } }, { runs: 10, gens: 30, seed: 2 });
  assert.equal(simT.distinct[0], 50);
  assert.ok(simT.distinct[10] < simO.distinct[10]);
  assert.ok(simT.meanFit[10] > simO.meanFit[10]);
  assert.ok(simT.takeover != null && simT.takeover < 20);
  // reproducible
  assert.deepEqual(CMP.simulate('sus', { params: {} }, { runs: 5, gens: 10, seed: 3 }), CMP.simulate('sus', { params: {} }, { runs: 5, gens: 10, seed: 3 }));
});
