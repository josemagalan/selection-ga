/*
 * Motor común de las trazas de selección: una población (N individuos con su aptitud) de la que
 * se eligen, paso a paso, los N padres (la población de padres o mating pool).
 *
 * Cada mecanismo devuelve { pool, steps, draws, aux } donde pool son los índices (base 0) de los
 * individuos elegidos, en orden, y cada paso (snapshot) lleva:
 *   order        orden en que se dibujan los individuos (índices); cambia al ordenar por aptitud
 *   rows         filas de números visibles bajo la población (p, q, e, E, rank…; ver aux.rows)
 *   wheel        si se ve la ruleta (y su versión desenrollada, la tira)
 *   pointers     punteros sobre la ruleta: { pos ∈ [0, 1), value, hit, state: 'active' | 'done' }
 *   contestants  torneo: [{ idx, win }] los individuos que compiten en este paso
 *   cut          truncamiento: cuántos de los mejores pueden ser padres (o null)
 *   pool         índices ya elegidos como padres; newSlot: hueco que se acaba de llenar
 *   hl, dim      individuos resaltados o atenuados
 *   bars         alturas de las barras si no son la aptitud (aptitud escalada, desplazada…)
 *   text         { key, params } de la narración
 */
(function (root) {
  'use strict';

  const isNode = typeof module !== 'undefined' && module.exports;
  const R = isNode ? require('../rng.js') : root.GAX.rng;

  const MIN_N = 4;
  const MAX_N = 10;
  const MAX_F = 999;
  const LABELS = 'ABCDEFGHIJ'.split('');

  const label = (i) => LABELS[i];
  const range = (n) => Array.from({ length: n }, (_, i) => i);
  const sum = (a) => a.reduce((s, v) => s + v, 0);

  /**
   * Redondeo a 9 decimales para comparar números acumulados: así 0,1 + 0,2 vale 0,3 y no
   * 0,30000000000000004, y un empate exacto se resuelve como a mano. El código descargable hace
   * lo mismo, con round(x, 9) en Python.
   */
  const r9 = (x) => Math.round(x * 1e9) / 1e9;

  /** Aptitudes enteras al azar entre 1 y 40. */
  function randomFitness(rng, n) {
    return Array.from({ length: n }, () => R.randInt(rng, 1, 40));
  }

  /**
   * Ejemplo de Goldberg (1989, cap. 1): cuatro cadenas de 5 bits que codifican x y aptitud f(x) = x².
   */
  const GOLDBERG = {
    chrom: ['01101', '11000', '01000', '10011'],
    x: [13, 24, 8, 19],
    fitness: [169, 576, 64, 361],
  };

  /** Población válida: entre 4 y 10 aptitudes enteras de 0 a 999. Devuelve la clave del error o null. */
  function validatePopulation(f) {
    if (!Array.isArray(f) || f.some((v) => typeof v !== 'number' || Number.isNaN(v))) return 'errFormat';
    if (f.length < MIN_N || f.length > MAX_N) return 'errSize';
    if (f.some((v) => !Number.isInteger(v) || v < 0 || v > MAX_F)) return 'errFitness';
    return null;
  }

  /** Para los mecanismos proporcionales, además, la suma de aptitudes no puede ser 0. */
  function validateProportional(f) {
    const err = validatePopulation(f);
    if (err) return err;
    return sum(f) > 0 ? null : 'errSumZero';
  }

  /**
   * Fuente de números aleatorios. Con opts.draws (lista) los devuelve en orden (tests y modo
   * práctica); si no, los saca de mulberry32(opts.seed). next(2) redondea hacia abajo a dos
   * decimales (los r de la ruleta, que se muestran); next() los deja sin redondear (los que solo
   * sirven para elegir un individuo al azar, que se muestra por su letra). `used` guarda, en
   * orden, todos los números consumidos.
   */
  function drawSource(opts) {
    opts = opts || {};
    const given = Array.isArray(opts.draws) ? opts.draws : null;
    const rand = R.mulberry32((opts.seed >>> 0) || 1);
    const used = [];
    let k = 0;
    function next(d) {
      let v;
      if (given) {
        if (k >= given.length) throw new Error('errDraws');
        v = given[k++];
      } else if (d) {
        const f = Math.pow(10, d);
        v = Math.floor(rand() * f) / f;
      } else v = rand();
      used.push(v);
      return v;
    }
    return { next, used };
  }

  /** Valores acumulados, redondeados con r9 como en el código descargable. */
  function cumulative(values) {
    let c = 0;
    return values.map((v) => { c += v; return r9(c); });
  }

  /** Primera posición k de la lista acumulada con x < acc[k] (la última si ninguna, por seguridad). */
  function firstAbove(acc, x) {
    const xx = r9(x);
    for (let k = 0; k < acc.length; k++) if (xx < acc[k]) return k;
    return acc.length - 1;
  }

  /** Índices ordenados de menor a mayor aptitud; a igual aptitud, en el orden de la población. */
  function ascending(fitness) {
    return range(fitness.length).sort((a, b) => fitness[a] - fitness[b]);
  }

  function newTrace(fitness) {
    const n = fitness.length;
    const st = {
      order: range(n), rows: [], wheel: false, pointers: [], contestants: [], cut: null, pool: [], sum: false, bars: null,
    };
    const steps = [];
    function snap(step) {
      steps.push(Object.assign({
        order: st.order.slice(),
        rows: st.rows.slice(),
        wheel: st.wheel,
        pointers: st.pointers.map((p) => Object.assign({}, p)),
        contestants: st.contestants.map((c) => Object.assign({}, c)),
        cut: st.cut,
        pool: st.pool.slice(),
        sum: st.sum,
        bars: st.bars ? st.bars.slice() : null,
        rowValues: null,
        newSlot: null,
        hl: [],
        dim: [],
      }, step));
    }
    /** Marca como hechos los punteros activos (quedan en la ruleta, más tenues). */
    function settlePointers() { st.pointers.forEach((p) => { p.state = 'done'; }); }
    return { st, steps, snap, settlePointers };
  }

  /**
   * N giros de la ruleta sobre las acumuladas accSorted (escala de probabilidad), en el orden de
   * los individuos `order`. Cada giro es un paso «spin» de la traza. extra: parámetros añadidos.
   */
  function spinLoop(T, src, order, accSorted, extra) {
    const n = order.length;
    for (let k = 0; k < n; k++) {
      const r = src.next(2);
      const j = firstAbove(accSorted, r);
      const i = order[j];
      T.settlePointers();
      T.st.pointers.push({ pos: r, value: r, hit: i, state: 'active' });
      T.st.pool.push(i);
      T.snap({
        type: 'spin',
        text: { key: 'spin', params: Object.assign({ k: k + 1, r, who: label(i), lo: j ? accSorted[j - 1] : 0, hi: accSorted[j], rank: j + 1 }, extra) },
        hl: [i],
        newSlot: k,
      });
    }
    T.settlePointers();
  }

  /**
   * SUS sobre las copias esperadas acumuladas accSorted (escala 0…N), en el orden `order`: un paso
   * «pointers» con los N punteros y un paso «pick» por puntero.
   */
  function susLoop(T, src, order, accSorted, extra) {
    const n = order.length;
    const r = src.next(2);
    for (let k = 0; k < n; k++) T.st.pointers.push({ pos: (r + k) / n, value: r + k, hit: null, state: 'pending' });
    T.snap({ type: 'pointers', text: { key: 'pointers', params: Object.assign({ r, n, last: r + n - 1 }, extra) } });
    let j = 0;
    for (let k = 0; k < n; k++) {
      while (j < n - 1 && !(r9(r + k) < accSorted[j])) j++;
      const i = order[j];
      T.st.pointers.forEach((ptr, m) => { if (m < k) ptr.state = 'done'; });
      T.st.pointers[k].state = 'active';
      T.st.pointers[k].hit = i;
      T.st.pool.push(i);
      T.snap({
        type: 'pick',
        text: { key: 'pick', params: Object.assign({ k: k + 1, ptr: r + k, who: label(i), elo: j ? accSorted[j - 1] : 0, ehi: accSorted[j], rank: j + 1 }, extra) },
        hl: [i],
        newSlot: k,
      });
    }
    T.settlePointers();
  }

  /** Reordena una lista dada en el orden `order` para tenerla por índice de individuo. */
  function byIndex(order, sorted) {
    const out = Array(order.length);
    order.forEach((idx, j) => { out[idx] = sorted[j]; });
    return out;
  }

  /** Media y desviación típica (poblacional, dividiendo entre N). */
  function meanSd(f) {
    const m = sum(f) / f.length;
    return { mean: m, sd: Math.sqrt(sum(f.map((v) => (v - m) * (v - m))) / f.length) };
  }

  /** Copias que recibe cada individuo en la población de padres. */
  function copies(n, pool) {
    const c = Array(n).fill(0);
    pool.forEach((i) => { c[i]++; });
    return c;
  }

  /**
   * Resumen del resultado: aptitud media antes y después, individuos distintos elegidos, copias
   * del mejor y los que se quedan sin copia.
   */
  function summary(fitness, pool) {
    const n = fitness.length;
    const c = copies(n, pool);
    const best = fitness.indexOf(Math.max.apply(null, fitness));
    return {
      meanPop: sum(fitness) / n,
      meanPool: sum(pool.map((i) => fitness[i])) / pool.length,
      distinct: c.filter((x) => x > 0).length,
      best: label(best),
      bestCopies: c[best],
      lost: range(n).filter((i) => c[i] === 0).map(label).join(', '),
      copies: c,
    };
  }

  /** Parámetros de la narración final, comunes a todos los mecanismos. */
  function doneParams(fitness, pool) {
    const s = summary(fitness, pool);
    return {
      n: fitness.length,
      pool: pool.map(label).join(' '),
      m0: Math.round(s.meanPop * 10) / 10,
      m1: Math.round(s.meanPool * 10) / 10,
      distinct: s.distinct,
      best: s.best,
      bestCopies: s.bestCopies,
      lost: s.lost || '—',
      nLost: fitness.length - s.distinct,
    };
  }

  const api = {
    MIN_N, MAX_N, MAX_F, LABELS, GOLDBERG, label, range, sum, r9,
    randomFitness, validatePopulation, validateProportional, drawSource, cumulative, firstAbove,
    ascending, newTrace, copies, summary, doneParams, spinLoop, susLoop, byIndex, meanSd, R,
  };
  if (isNode) module.exports = api;
  else (root.GAX = root.GAX || {}).selUtils = api;
})(typeof self !== 'undefined' ? self : this);
