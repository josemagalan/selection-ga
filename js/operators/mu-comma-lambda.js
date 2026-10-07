/*
 * Selección (μ, λ) (Schwefel; estrategias evolutivas): los padres desaparecen y sobreviven los μ
 * mejores de los λ hijos (hace falta λ ≥ μ). No es elitista: el mejor de la generación puede
 * perderse, lo que ayuda a escapar de óptimos locales y a seguir un óptimo que se mueve.
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const S = isNode ? require('./sel-utils.js') : root.GAX.selUtils;
  const P = isNode ? require('./repl-utils.js') : root.GAX.replUtils;

  /** opts: { offspring: [aptitudes de los λ hijos, λ ≥ μ] }. Determinista. */
  function muCommaLambda(parents, opts) {
    opts = opts || {};
    const err = S.validatePopulation(parents) || P.validateOffspring(opts.offspring);
    if (err) throw new Error(err);
    const mu = parents.length;
    const g = opts.offspring;
    const lambda = g.length;
    if (lambda < mu) throw new Error('errLambdaMu');
    const all = parents.concat(g);
    const lab = P.labels(mu, lambda);
    const T = S.newTrace(all);
    const parentIdx = S.range(mu);
    const childSorted = P.ascendingOf(all, S.range(lambda).map((k) => mu + k));
    const top = childSorted.slice(-mu).reverse();
    const out = parentIdx.concat(childSorted.slice(0, lambda - mu));
    const bestParent = parents.indexOf(Math.max.apply(null, parents));

    T.snap({ type: 'intro', text: { key: 'intro', params: { mu, lambda } } });
    T.snap({ type: 'discard', text: { key: 'discard', params: { mu, best: lab[bestParent], fb: parents[bestParent] } }, dim: parentIdx });
    T.st.order = parentIdx.concat(childSorted);
    T.st.rows = ['rank'];
    T.snap({ type: 'sort', text: { key: 'sort', params: { lambda, best: lab[childSorted[lambda - 1]], worst: lab[childSorted[0]] } }, dim: parentIdx });
    T.st.cut = mu;
    T.snap({
      type: 'cut',
      text: { key: lambda > mu ? 'cut' : 'cutAll', params: { mu, lambda, top: top.map((i) => lab[i]).join(', '), out: childSorted.slice(0, lambda - mu).map((i) => lab[i]).join(', ') || '—' } },
      hl: top.slice(),
      dim: out,
    });
    top.forEach((i, k) => {
      T.st.pool.push(i);
      T.snap({ type: 'keep', text: { key: 'keepChild', params: { k: k + 1, who: lab[i], f: all[i] } }, hl: [i], dim: out, newSlot: k });
    });
    const next = T.st.pool.slice();
    const dp = P.doneParams(all, mu, next, lab);
    T.snap({ type: 'done', text: { key: dp.b1 < dp.b0 ? 'doneLost' : 'done', params: dp }, dim: out });

    const rank = Array(all.length).fill(null);
    childSorted.forEach((idx, j) => { rank[idx] = j + 1; });
    return {
      pool: next,
      steps: T.steps,
      draws: [],
      aux: {
        rows: [{ id: 'rank', kind: 'int', values: rank, labelKey: 'row_rankChildren' }],
        wheel: null, expected: null, labels: lab, groups: P.groups(mu, lambda), fitnessAll: all,
        poolSize: mu, poolLabelKey: 'rowNext', copiesLabelKey: 'row_survives',
      },
    };
  }

  const spec = {
    id: 'mu-comma-lambda',
    family: 'replacement',
    random: false,
    replacement: true,
    params: [{ id: 'lambda', min: 4, max: 12, step: 1, default: 9 }],
    offspring: (mu, params) => Math.max(mu, params.lambda),
    legend: ['parentInd', 'childInd', 'cutSurv', 'survivor'],
    run: (parents, opts) => muCommaLambda(parents, opts),
  };

  const api = { muCommaLambda, validatePopulation: S.validatePopulation, spec };
  if (isNode) module.exports = api;
  else ((root.GAX = root.GAX || {}).operators = root.GAX.operators || {})['mu-comma-lambda'] = api;
})(typeof self !== 'undefined' ? self : this);
