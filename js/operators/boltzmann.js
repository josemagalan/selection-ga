/*
 * Selección de Boltzmann (de la Maza y Tidor, 1993): la aptitud se transforma en un peso
 * w_i = exp((f_i − f_max) / T) y se muestrea como en la ruleta, con p_i = w_i / Σw. La
 * temperatura T regula la presión: con T alta los pesos se parecen (casi al azar); con T baja el
 * mejor se lo lleva casi todo. Restar f_max no cambia las probabilidades y evita desbordamientos;
 * así el mejor pesa exactamente 1. Igual que la app Shiny SelectionMechanisms.
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const S = isNode ? require('./sel-utils.js') : root.GAX.selUtils;

  /** opts: { variant: 'roulette' | 'sus', params: { temp }, seed | draws }. */
  function boltzmannSelection(fitness, opts) {
    opts = opts || {};
    const err = S.validatePopulation(fitness);
    if (err) throw new Error(err);
    const n = fitness.length;
    const temp = opts.params && opts.params.temp != null ? opts.params.temp : 10;
    const useSus = opts.variant === 'sus';
    const src = S.drawSource(opts);
    const fmax = Math.max.apply(null, fitness);
    const w = fitness.map((f) => Math.exp((f - fmax) / temp));
    const total = S.sum(w);
    const p = w.map((x) => x / total);
    const e = p.map((x) => n * x);
    const acc = S.cumulative(useSus ? e : p);
    const best = fitness.indexOf(fmax);
    const worst = fitness.indexOf(Math.min.apply(null, fitness));
    const T = S.newTrace(fitness);

    T.snap({ type: 'intro', text: { key: 'intro', params: { n } } });
    T.st.bars = w;
    T.st.rows = ['w'];
    T.snap({
      type: 'weights',
      text: { key: 'weights', params: { temp, fmax, worst: S.label(worst), fw: fitness[worst], ww: w[worst] } },
      hl: [worst],
    });
    T.st.sum = true;
    T.snap({ type: 'sum', text: { key: 'sum', params: { total } } });
    T.st.rows = useSus ? ['w', 'e'] : ['w', 'p'];
    T.st.wheel = true;
    T.snap({
      type: 'prob',
      text: { key: useSus ? 'probSus' : 'prob', params: { who: S.label(best), p: p[best], e: e[best], worst: S.label(worst), pWorst: p[worst], eWorst: e[worst] } },
      hl: [best, worst],
    });
    T.st.rows = useSus ? ['w', 'e', 'E'] : ['w', 'p', 'q'];
    T.snap({ type: 'cum', text: { key: useSus ? 'cumSus' : 'cum', params: { n, last: S.label(n - 1) } } });
    if (useSus) S.susLoop(T, src, S.range(n), acc);
    else S.spinLoop(T, src, S.range(n), acc);
    const pool = T.st.pool.slice();
    T.snap({ type: 'done', text: { key: 'done', params: Object.assign({ temp }, S.doneParams(fitness, pool)) } });

    const rows = [{ id: 'w', kind: 'w', values: w }];
    if (useSus) rows.push({ id: 'e', kind: 'exp', values: e }, { id: 'E', kind: 'exp', values: acc });
    else rows.push({ id: 'p', kind: 'prob', values: p }, { id: 'q', kind: 'prob', values: acc });
    return {
      pool,
      steps: T.steps,
      draws: src.used.slice(),
      aux: {
        rows,
        wheel: useSus ? { weights: e, scale: 'exp', total: n, bounds: acc } : { weights: p, scale: 'prob', total: 1, bounds: acc },
        expected: e,
        barsLabelKey: 'bars_w',
        barsKind: 'w',
        sumSymbol: 'w',
        sumValue: total,
      },
    };
  }

  const spec = {
    id: 'boltzmann',
    family: 'proportional',
    random: true,
    variants: ['roulette', 'sus'],
    defaultVariant: 'roulette',
    params: [{ id: 'temp', min: 1, max: 50, step: 1, default: 10 }],
    legend: ['individual', 'chosen', 'pointer', 'pool'],
    run: (fitness, opts) => boltzmannSelection(fitness, opts),
  };

  const api = { boltzmannSelection, validatePopulation: S.validatePopulation, spec };
  if (isNode) module.exports = api;
  else ((root.GAX = root.GAX || {}).operators = root.GAX.operators || {}).boltzmann = api;
})(typeof self !== 'undefined' ? self : this);
