/*
 * Selección por ruleta (proporcional a la aptitud): cada individuo i tiene probabilidad
 * p_i = f_i / Σf; con las probabilidades acumuladas q_i, cada giro saca un número aleatorio r en
 * [0, 1) y elige al primer individuo con r < q_i. Se repite N veces, una por padre.
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const S = isNode ? require('./sel-utils.js') : root.GAX.selUtils;

  /**
   * opts: { seed } o { draws: [r1, …, rN] } (r con dos decimales).
   * Devuelve { pool, steps, draws, aux }.
   */
  function rouletteSelection(fitness, opts) {
    const err = S.validateProportional(fitness);
    if (err) throw new Error(err);
    const n = fitness.length;
    const src = S.drawSource(opts);
    const total = S.sum(fitness);
    const p = fitness.map((f) => f / total);
    const q = S.cumulative(p);
    const T = S.newTrace(fitness);

    T.snap({ type: 'intro', text: { key: 'intro', params: { n } } });
    T.st.sum = true;
    T.snap({ type: 'sum', text: { key: 'sum', params: { expr: fitness.join(' + '), total } } });
    T.st.rows = ['p'];
    T.st.wheel = true;
    const best = fitness.indexOf(Math.max.apply(null, fitness));
    T.snap({
      type: 'prob',
      text: { key: 'prob', params: { total, who: S.label(best), f: fitness[best], p: p[best] } },
      hl: [best],
    });
    T.st.rows = ['p', 'q'];
    T.snap({ type: 'cum', text: { key: 'cum', params: { last: S.label(n - 1) } } });

    for (let k = 0; k < n; k++) {
      const r = src.next(2);
      const i = S.firstAbove(q, r);
      T.settlePointers();
      T.st.pointers.push({ pos: r, value: r, hit: i, state: 'active' });
      T.st.pool.push(i);
      T.snap({
        type: 'spin',
        text: { key: 'spin', params: { k: k + 1, r, who: S.label(i), lo: i ? q[i - 1] : 0, hi: q[i] } },
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
          { id: 'p', kind: 'prob', values: p },
          { id: 'q', kind: 'prob', values: q },
        ],
        wheel: { weights: p, scale: 'prob', total: 1, bounds: q },
        expected: p.map((x) => n * x),
      },
    };
  }

  const spec = {
    id: 'roulette',
    family: 'proportional',
    random: true,
    proportional: true,
    legend: ['individual', 'chosen', 'pointer', 'pool'],
    run: (fitness, opts) => rouletteSelection(fitness, opts),
  };

  const api = { rouletteSelection, validatePopulation: S.validateProportional, spec };
  if (isNode) module.exports = api;
  else ((root.GAX = root.GAX || {}).operators = root.GAX.operators || {}).roulette = api;
})(typeof self !== 'undefined' ? self : this);
