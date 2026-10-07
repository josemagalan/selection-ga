/*
 * Ranking exponencial (Blickle y Thiele, 1996): se ordena la población de peor a mejor y el
 * individuo de rango j (0 = el peor, N − 1 = el mejor) recibe un peso w_j = c^(N − 1 − j), con
 * 0 < c < 1; p_j = w_j / Σw. Cada individuo tiene 1/c veces la probabilidad del anterior: la
 * probabilidad crece de forma geométrica con el rango. Cuanto menor es c, mayor es la presión.
 * Después se muestrea como en la ruleta (N giros) o como en SUS (un giro, N punteros).
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const S = isNode ? require('./sel-utils.js') : root.GAX.selUtils;

  /** opts: { variant: 'roulette' | 'sus', params: { base: c }, seed | draws }. */
  function exponentialRanking(fitness, opts) {
    opts = opts || {};
    const err = S.validatePopulation(fitness);
    if (err) throw new Error(err);
    const n = fitness.length;
    const c = opts.params && opts.params.base != null ? opts.params.base : 0.8;
    const useSus = opts.variant === 'sus';
    const src = S.drawSource(opts);
    const order = S.ascending(fitness);
    const wSorted = order.map((_, j) => Math.pow(c, n - 1 - j));
    const total = S.sum(wSorted);
    const pSorted = wSorted.map((x) => x / total);
    const accSorted = S.cumulative(useSus ? pSorted.map((x) => n * x) : pSorted);
    const rank = S.byIndex(order, order.map((_, j) => j + 1));
    const p = S.byIndex(order, pSorted);
    const e = p.map((x) => n * x);
    const acc = S.byIndex(order, accSorted);
    const T = S.newTrace(fitness);
    const ties = fitness.length - new Set(fitness).size > 0;
    const bi = order[n - 1];
    const wi = order[0];

    T.snap({ type: 'intro', text: { key: 'intro', params: { n } } });
    T.st.order = order.slice();
    T.st.rows = ['rank'];
    T.snap({ type: 'sort', text: { key: ties ? 'sortTies' : 'sort', params: { worst: S.label(wi), best: S.label(bi), n } } });
    T.st.rows = useSus ? ['rank', 'e'] : ['rank', 'p'];
    T.st.wheel = true;
    T.snap({
      type: 'prob',
      text: {
        key: useSus ? 'probSus' : 'prob',
        params: { base: c, inv: 1 / c, n, pBest: p[bi], pWorst: p[wi], eBest: e[bi], eWorst: e[wi], best: S.label(bi), worst: S.label(wi) },
      },
      hl: [bi, wi],
    });
    T.st.rows = useSus ? ['rank', 'e', 'E'] : ['rank', 'p', 'q'];
    T.snap({ type: 'cum', text: { key: useSus ? 'cumSus' : 'cum', params: { n, best: S.label(bi) } } });
    if (useSus) S.susLoop(T, src, order, accSorted);
    else S.spinLoop(T, src, order, accSorted);
    const pool = T.st.pool.slice();
    T.snap({ type: 'done', text: { key: 'done', params: Object.assign({ base: c }, S.doneParams(fitness, pool)) } });

    const rows = [{ id: 'rank', kind: 'int', values: rank }];
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
      },
    };
  }

  const spec = {
    id: 'exponential-ranking',
    family: 'rank',
    random: true,
    variants: ['roulette', 'sus'],
    defaultVariant: 'roulette',
    params: [{ id: 'base', min: 0.5, max: 0.95, step: 0.05, default: 0.8 }],
    legend: ['individual', 'chosen', 'pointer', 'pool'],
    run: (fitness, opts) => exponentialRanking(fitness, opts),
  };

  const api = { exponentialRanking, validatePopulation: S.validatePopulation, spec };
  if (isNode) module.exports = api;
  else ((root.GAX = root.GAX || {}).operators = root.GAX.operators || {})['exponential-ranking'] = api;
})(typeof self !== 'undefined' ? self : this);
