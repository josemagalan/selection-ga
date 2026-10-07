/*
 * Selección (μ + λ) (Schwefel; estrategias evolutivas): padres e hijos compiten juntos y
 * sobreviven los μ mejores de los μ + λ. Es elitista: el mejor nunca se pierde. A igual aptitud,
 * se prefiere al hijo (va después en el orden), para que la población no se estanque.
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const S = isNode ? require('./sel-utils.js') : root.GAX.selUtils;
  const P = isNode ? require('./repl-utils.js') : root.GAX.replUtils;

  /** opts: { offspring: [aptitudes de los λ hijos] }. Determinista. */
  function muPlusLambda(parents, opts) {
    opts = opts || {};
    const err = S.validatePopulation(parents) || P.validateOffspring(opts.offspring);
    if (err) throw new Error(err);
    const mu = parents.length;
    const g = opts.offspring;
    const lambda = g.length;
    const all = parents.concat(g);
    const lab = P.labels(mu, lambda);
    const T = S.newTrace(all);
    const sorted = P.ascendingOf(all, S.range(all.length));
    const top = sorted.slice(-mu).reverse();
    const out = sorted.slice(0, all.length - mu);

    T.snap({ type: 'intro', text: { key: 'intro', params: { mu, lambda, total: mu + lambda } } });
    T.st.order = sorted.slice();
    T.st.rows = ['rank'];
    T.snap({ type: 'sort', text: { key: 'sort', params: { total: mu + lambda, best: lab[sorted[sorted.length - 1]], worst: lab[sorted[0]] } } });
    T.st.cut = mu;
    const np = top.filter((i) => i < mu).length;
    T.snap({
      type: 'cut',
      text: { key: 'cut', params: { mu, top: top.map((i) => lab[i]).join(', '), out: out.map((i) => lab[i]).join(', ') || '—', np, nc: mu - np } },
      hl: top.slice(),
      dim: out,
    });
    top.forEach((i, k) => {
      T.st.pool.push(i);
      T.snap({ type: 'keep', text: { key: i < mu ? 'keepParent' : 'keepChild', params: { k: k + 1, who: lab[i], f: all[i] } }, hl: [i], dim: out, newSlot: k });
    });
    const next = T.st.pool.slice();
    T.snap({ type: 'done', text: { key: 'done', params: P.doneParams(all, mu, next, lab) }, dim: out });

    const rank = Array(all.length);
    sorted.forEach((idx, j) => { rank[idx] = j + 1; });
    return {
      pool: next,
      steps: T.steps,
      draws: [],
      aux: {
        rows: [{ id: 'rank', kind: 'int', values: rank, labelKey: 'row_rankAll' }],
        wheel: null, expected: null, labels: lab, groups: P.groups(mu, lambda), fitnessAll: all,
        poolSize: mu, poolLabelKey: 'rowNext', copiesLabelKey: 'row_survives',
      },
    };
  }

  const spec = {
    id: 'mu-plus-lambda',
    family: 'replacement',
    random: false,
    replacement: true,
    params: [{ id: 'lambda', min: 1, max: 12, step: 1, default: 6 }],
    offspring: (mu, params) => params.lambda,
    legend: ['parentInd', 'childInd', 'cutSurv', 'survivor'],
    run: (parents, opts) => muPlusLambda(parents, opts),
  };

  const api = { muPlusLambda, validatePopulation: S.validatePopulation, spec };
  if (isNode) module.exports = api;
  else ((root.GAX = root.GAX || {}).operators = root.GAX.operators || {})['mu-plus-lambda'] = api;
})(typeof self !== 'undefined' ? self : this);
