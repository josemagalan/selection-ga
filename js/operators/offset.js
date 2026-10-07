/*
 * Contraejemplo: la ruleta con la aptitud desplazada. Se suma una constante C a todas las
 * aptitudes (f + C) y se aplica la ruleta. El orden y las diferencias no cambian, pero las
 * probabilidades se igualan: con C grande la ruleta casi no distingue a los buenos de los malos.
 * Muestra por qué la selección proporcional depende de la escala de la aptitud.
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const S = isNode ? require('./sel-utils.js') : root.GAX.selUtils;

  /** opts: { params: { shift: C }, seed | draws: [r1, …, rN] }. */
  function offsetRoulette(fitness, opts) {
    opts = opts || {};
    const err = S.validateProportional(fitness);
    if (err) throw new Error(err);
    const n = fitness.length;
    const C = opts.params && opts.params.shift != null ? opts.params.shift : 1000;
    const src = S.drawSource(opts);
    const shifted = fitness.map((f) => f + C);
    const total0 = S.sum(fitness);
    const total = S.sum(shifted);
    const p0 = fitness.map((f) => f / total0);
    const p = shifted.map((f) => f / total);
    const q = S.cumulative(p);
    const best = fitness.indexOf(Math.max.apply(null, fitness));
    const worst = fitness.indexOf(Math.min.apply(null, fitness));
    const who = { who: S.label(best), worst: S.label(worst) };
    const T = S.newTrace(fitness);

    T.snap({ type: 'intro', text: { key: 'intro', params: Object.assign({ n, p0: p0[best], pw0: p0[worst] }, who) }, hl: [best] });
    T.st.bars = shifted;
    T.st.rows = ['fs'];
    T.snap({ type: 'shift', text: { key: 'shift', params: { c: C } } });
    T.st.sum = true;
    T.snap({ type: 'sum', text: { key: 'sum', params: { total } } });
    T.st.rows = ['fs', 'p'];
    T.st.wheel = true;
    T.snap({ type: 'prob', text: { key: 'prob', params: Object.assign({ p: p[best], p0: p0[best], pw: p[worst], pw0: p0[worst] }, who) }, hl: [best, worst] });
    T.st.rows = ['fs', 'p', 'q'];
    T.snap({ type: 'cum', text: { key: 'cum', params: { last: S.label(n - 1) } } });
    S.spinLoop(T, src, S.range(n), q);
    const pool = T.st.pool.slice();
    T.snap({
      type: 'done',
      text: { key: 'done', params: Object.assign({ e0: n * p0[best], e1: n * p[best] }, S.doneParams(fitness, pool)) },
    });

    return {
      pool,
      steps: T.steps,
      draws: src.used.slice(),
      aux: {
        rows: [
          { id: 'fs', kind: 'num', values: shifted, labelKey: 'row_fc' },
          { id: 'p', kind: 'prob', values: p },
          { id: 'q', kind: 'prob', values: q },
        ],
        wheel: { weights: p, scale: 'prob', total: 1, bounds: q },
        expected: p.map((x) => n * x),
        barsLabelKey: 'bars_fc',
        barsKind: 'num',
        sumSymbol: '(f + C)',
        sumValue: total,
      },
    };
  }

  const spec = {
    id: 'offset',
    family: 'proportional',
    random: true,
    proportional: true,
    params: [{ id: 'shift', min: 0, max: 2000, step: 100, default: 1000 }],
    legend: ['individual', 'chosen', 'pointer', 'pool'],
    run: (fitness, opts) => offsetRoulette(fitness, opts),
  };

  const api = { offsetRoulette, validatePopulation: S.validateProportional, spec };
  if (isNode) module.exports = api;
  else ((root.GAX = root.GAX || {}).operators = root.GAX.operators || {}).offset = api;
})(typeof self !== 'undefined' ? self : this);
