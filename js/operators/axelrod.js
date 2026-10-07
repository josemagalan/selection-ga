/*
 * Selección de Axelrod (1986), «An evolutionary approach to norms», tal como la describen y la
 * reimplementan Galán e Izquierdo (2005, §3.4 y nota 4). No es un mecanismo de los algoritmos
 * genéticos: viene de la simulación social, y la herramienta lo incluye como propuesta no estándar.
 *
 * Cada individuo tiene 0, 1 o 2 hijos según su distancia a la media en desviaciones típicas,
 * z = (f − f̄) / σ (σ poblacional, dividiendo entre N):
 *   z ≥ 1 → 2 hijos;   z ≤ −1 → ninguno;   el resto → 1 hijo.
 * El total M no tiene por qué ser N, y Axelrod (1986) no dice cómo se mantiene el tamaño. Como en
 * Galán e Izquierdo (2005): si sobran hijos, se eliminan al azar de uno en uno; si faltan, se
 * duplica al azar uno de los hijos, hasta tener N. Si todos tienen la misma aptitud (σ = 0), la
 * regla es ambigua; como en su código (nota 4), todos se replican dos veces y después se elimina al
 * azar la mitad de los hijos.
 *
 * Los hijos se guardan en una lista ordenada por individuo (A, A, B, D…): cada ajuste sortea u en
 * [0, 1) y toca al hijo que ocupa el puesto ⌊u · M⌋ + 1; la copia que se añade va junto al original,
 * así que la lista sigue ordenada. Los padres son esa lista final.
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const S = isNode ? require('./sel-utils.js') : root.GAX.selUtils;

  /**
   * Hijos que da la regla de Axelrod a cada individuo, antes del ajuste:
   * { mean, sd, flat, z (null si σ = 0), kids }. z se redondea con r9, como en el código descargable,
   * para que z = 1 exacto no quede en 0,9999999999.
   */
  function axelrodKids(fitness) {
    const { mean, sd } = S.meanSd(fitness);
    const flat = fitness.every((f) => f === fitness[0]);
    if (flat) return { mean, sd: 0, flat, z: null, kids: fitness.map(() => 2) };
    const z = fitness.map((f) => S.r9((f - mean) / sd));
    const kids = z.map((v) => (v >= 1 ? 2 : v <= -1 ? 0 : 1));
    return { mean, sd, flat, z, kids };
  }

  /** Lista de hijos ordenada por individuo: [0, 0, 1, 3…] a partir de las copias de cada uno. */
  function expand(kids) {
    const list = [];
    kids.forEach((c, i) => { for (let k = 0; k < c; k++) list.push(i); });
    return list;
  }

  /** opts: { seed } o { draws: [u…] } (un u en [0, 1) por ajuste). */
  function axelrodSelection(fitness, opts) {
    const err = S.validatePopulation(fitness);
    if (err) throw new Error(err);
    const n = fitness.length;
    const src = S.drawSource(opts);
    const ax = axelrodKids(fitness);
    const plus = ax.mean + ax.sd;
    const minus = ax.mean - ax.sd;
    const T = S.newTrace(fitness);
    const names = (pred) => S.range(n).filter(pred).map(S.label).join(', ') || '—';
    const lines = { lines: true };

    T.snap({ type: 'intro', text: { key: 'intro', params: { n } } });
    if (ax.flat) {
      T.snap(Object.assign({ type: 'stats', text: { key: 'statsFlat', params: { mean: ax.mean } } }, lines));
    } else {
      T.snap(Object.assign({
        type: 'stats',
        text: { key: minus < 0 ? 'statsNeg' : 'stats', params: { mean: ax.mean, sd: ax.sd, plus, minus } },
      }, lines));
      T.st.rows = ['z'];
      const best = fitness.indexOf(Math.max.apply(null, fitness));
      T.snap(Object.assign({
        type: 'z',
        text: { key: 'z', params: { who: S.label(best), f: fitness[best], zb: ax.z[best] } },
        hl: [best],
      }, lines));
    }

    T.st.rows = ax.flat ? ['kids'] : ['z', 'kids'];
    const two = S.range(n).filter((i) => ax.kids[i] === 2);
    const zero = S.range(n).filter((i) => ax.kids[i] === 0);
    let list = expand(ax.kids);
    const m0 = list.length;
    T.snap(Object.assign({
      type: ax.flat ? 'classifyFlat' : 'classify',
      text: ax.flat
        ? { key: 'classifyFlat', params: { n, m: m0 } }
        : {
          key: 'classify',
          params: { two: names((i) => ax.kids[i] === 2), one: names((i) => ax.kids[i] === 1), zero: names((i) => ax.kids[i] === 0), m: m0 },
        },
      hl: two,
      dim: zero,
    }, lines));

    // Ajuste al tamaño N: Axelrod no dice cómo; Galán e Izquierdo (2005), al azar
    const counts = ax.kids.slice();
    const rowAdj = () => ({ adj: counts.slice() });
    const dimZero = () => S.range(n).filter((i) => counts[i] === 0);
    if (m0 === n) {
      T.snap(Object.assign({ type: 'balanced', text: { key: 'balanced', params: { n } }, dim: dimZero() }, lines));
    } else {
      const removing = m0 > n;
      T.st.rows = ax.flat ? ['kids', 'adj'] : ['z', 'kids', 'adj'];
      T.snap(Object.assign({
        type: 'adjust',
        text: { key: ax.flat ? 'adjustFlat' : removing ? 'excess' : 'deficit', params: { m: m0, n, d: Math.abs(m0 - n) } },
        rowValues: rowAdj(),
        dim: dimZero(),
      }, lines));
      let k = 0;
      while (list.length !== n) {
        const m = list.length;
        const u = src.next();
        const j = Math.floor(u * m);
        const i = list[j];
        if (removing) { list.splice(j, 1); counts[i]--; } else { list.splice(j, 0, i); counts[i]++; }
        k++;
        T.snap(Object.assign({
          type: removing ? 'remove' : 'add',
          text: { key: removing ? 'remove' : 'add', params: { k, m, pos: j + 1, who: S.label(i), left: list.length } },
          rowValues: rowAdj(),
          hl: [i],
          dim: dimZero(),
        }, lines));
      }
    }

    // Los padres: la lista de hijos, en orden; las copias van llegando a lo que dejó el ajuste
    list.forEach((i, k) => {
      T.st.pool.push(i);
      T.snap(Object.assign({
        type: 'pick',
        text: { key: 'pick', params: { k: k + 1, who: S.label(i), c: counts[i] } },
        rowValues: m0 === n ? null : rowAdj(),
        hl: [i],
        dim: dimZero(),
        newSlot: k,
      }, lines));
    });
    const pool = T.st.pool.slice();
    T.snap(Object.assign({ type: 'done', text: { key: 'done', params: S.doneParams(fitness, pool) }, rowValues: m0 === n ? null : rowAdj(), dim: dimZero() }, lines));

    return {
      pool,
      steps: T.steps,
      draws: src.used.slice(),
      aux: {
        rows: [
          { id: 'z', kind: 'z', values: ax.z || fitness.map(() => null) },
          { id: 'kids', kind: 'int', values: ax.kids },
          { id: 'adj', kind: 'int', values: ax.kids },
        ],
        wheel: null,
        // Cada hijo sobrevive al ajuste con probabilidad N / M (y, si se duplican, la urna de Pólya
        // conserva la proporción esperada): copias esperadas N · c_i / M
        expected: ax.kids.map((c) => (n * c) / m0),
        sigma: { mean: ax.mean, sd: ax.sd, plus, minus, flat: ax.flat },
        barMax: Math.max(Math.max.apply(null, fitness), plus),
      },
    };
  }

  const spec = {
    id: 'axelrod',
    family: 'nonstandard',
    random: true,
    legend: ['individual', 'sigma', 'chosen', 'pool'],
    run: (fitness, opts) => axelrodSelection(fitness, opts),
  };

  const api = { axelrodSelection, axelrodKids, expand, validatePopulation: S.validatePopulation, spec };
  if (isNode) module.exports = api;
  else ((root.GAX = root.GAX || {}).operators = root.GAX.operators || {}).axelrod = api;
})(typeof self !== 'undefined' ? self : this);
