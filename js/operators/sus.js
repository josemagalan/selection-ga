/*
 * Muestreo estocástico universal (SUS, Baker 1987): la ruleta se gira una sola vez. Cada individuo
 * ocupa un tramo igual a sus copias esperadas e_i = N · f_i / Σf (en total, N) y un único número
 * aleatorio r en [0, 1) coloca N punteros equiespaciados en r, r + 1, …, r + N − 1. Cada puntero
 * elige al individuo en cuyo tramo cae, así que cada uno recibe ⌊e_i⌋ o ⌈e_i⌉ copias.
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const S = isNode ? require('./sel-utils.js') : root.GAX.selUtils;

  /** opts: { seed } o { draws: [r] } (r con dos decimales). */
  function susSelection(fitness, opts) {
    const err = S.validateProportional(fitness);
    if (err) throw new Error(err);
    const n = fitness.length;
    const src = S.drawSource(opts);
    const total = S.sum(fitness);
    const e = fitness.map((f) => (n * f) / total);
    const E = S.cumulative(e);
    const T = S.newTrace(fitness);

    T.snap({ type: 'intro', text: { key: 'intro', params: { n } } });
    T.st.sum = true;
    T.snap({ type: 'sum', text: { key: 'sum', params: { expr: fitness.join(' + '), total } } });
    T.st.rows = ['e'];
    T.st.wheel = true;
    const best = fitness.indexOf(Math.max.apply(null, fitness));
    T.snap({
      type: 'expected',
      text: { key: 'expected', params: { n, total, who: S.label(best), f: fitness[best], e: e[best] } },
      hl: [best],
    });
    T.st.rows = ['e', 'E'];
    T.snap({ type: 'cum', text: { key: 'cum', params: { n, last: S.label(n - 1) } } });

    const r = src.next(2);
    for (let k = 0; k < n; k++) T.st.pointers.push({ pos: (r + k) / n, value: r + k, hit: null, state: 'pending' });
    T.snap({ type: 'pointers', text: { key: 'pointers', params: { r, n, last: r + n - 1 } } });

    let i = 0;
    for (let k = 0; k < n; k++) {
      while (i < n - 1 && !(S.r9(r + k) < E[i])) i++;
      T.st.pointers.forEach((ptr, j) => { if (j < k) ptr.state = 'done'; });
      T.st.pointers[k].state = 'active';
      T.st.pointers[k].hit = i;
      T.st.pool.push(i);
      T.snap({
        type: 'pick',
        text: { key: 'pick', params: { k: k + 1, ptr: r + k, who: S.label(i), elo: i ? E[i - 1] : 0, ehi: E[i] } },
        hl: [i],
        newSlot: k,
      });
    }
    T.settlePointers();
    const pool = T.st.pool.slice();
    T.snap({ type: 'done', text: { key: 'done', params: S.doneParams(fitness, pool) } });

    return {
      pool,
      steps: T.steps,
      draws: src.used.slice(),
      aux: {
        rows: [
          { id: 'e', kind: 'exp', values: e },
          { id: 'E', kind: 'exp', values: E },
        ],
        wheel: { weights: e, scale: 'exp', total: n, bounds: E },
        expected: e,
      },
    };
  }

  const spec = {
    id: 'sus',
    family: 'proportional',
    random: true,
    proportional: true,
    legend: ['individual', 'chosen', 'pointer', 'pool'],
    run: (fitness, opts) => susSelection(fitness, opts),
  };

  const api = { susSelection, validatePopulation: S.validateProportional, spec };
  if (isNode) module.exports = api;
  else ((root.GAX = root.GAX || {}).operators = root.GAX.operators || {}).sus = api;
})(typeof self !== 'undefined' ? self : this);
