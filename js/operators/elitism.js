/*
 * Reemplazo generacional con elitismo (De Jong, 1975): los μ hijos sustituyen a los μ padres,
 * salvo que los e mejores padres (la élite) sobreviven y ocupan el lugar de los e peores hijos.
 * Con e = 0 es el reemplazo generacional puro, en el que el mejor puede perderse; con e ≥ 1 el
 * mejor de la población nunca empeora.
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const S = isNode ? require('./sel-utils.js') : root.GAX.selUtils;
  const P = isNode ? require('./repl-utils.js') : root.GAX.replUtils;

  /** opts: { offspring: [μ aptitudes], params: { elite } }. Determinista. */
  function elitistReplacement(parents, opts) {
    opts = opts || {};
    const mu = parents.length;
    const err = S.validatePopulation(parents) || P.validateOffspring(opts.offspring, mu);
    if (err) throw new Error(err);
    const e = Math.min(mu - 1, opts.params && opts.params.elite != null ? opts.params.elite : 1);
    const g = opts.offspring;
    const all = parents.concat(g);
    const lab = P.labels(mu, mu);
    const T = S.newTrace(all);
    const children = S.range(mu).map((k) => mu + k);
    const elite = P.ascendingOf(all, S.range(mu)).slice(mu - e).reverse();   // los e mejores padres
    const dropped = P.ascendingOf(all, children).slice(0, e);                  // los e peores hijos
    const keptChildren = children.filter((i) => dropped.indexOf(i) === -1);
    const others = S.range(mu).filter((i) => elite.indexOf(i) === -1);

    T.snap({ type: 'intro', text: { key: 'intro', params: { mu } } });
    T.snap({ type: 'replace', text: { key: 'replace', params: { mu } }, hl: children.slice() });
    if (e > 0) {
      T.snap({ type: 'elite', text: { key: 'elite', params: { e, elite: elite.map((i) => lab[i]).join(', ') } }, hl: elite.slice() });
      T.snap({ type: 'drop', text: { key: 'drop', params: { e, dropped: dropped.map((i) => lab[i]).join(', ') } }, hl: elite.slice(), dim: dropped.concat(others) });
    }
    const out = dropped.concat(others);
    elite.concat(keptChildren).forEach((i, k) => {
      T.st.pool.push(i);
      T.snap({ type: 'keep', text: { key: i < mu ? 'keepParent' : 'keepChild', params: { k: k + 1, who: lab[i], f: all[i] } }, hl: [i], dim: out, newSlot: k });
    });
    const next = T.st.pool.slice();
    const dp = P.doneParams(all, mu, next, lab);
    T.snap({ type: 'done', text: { key: dp.b1 < dp.b0 ? 'doneLost' : e > 0 ? 'doneElite' : 'done', params: Object.assign({ e }, dp) }, dim: out });

    return {
      pool: next,
      steps: T.steps,
      draws: [],
      aux: {
        rows: [], wheel: null, expected: null, labels: lab, groups: P.groups(mu, mu), fitnessAll: all,
        poolSize: mu, poolLabelKey: 'rowNext', copiesLabelKey: 'row_survives',
      },
    };
  }

  const spec = {
    id: 'elitism',
    family: 'replacement',
    random: false,
    replacement: true,
    params: [{ id: 'elite', min: 0, max: 3, step: 1, default: 1 }],
    offspring: (mu) => mu,
    legend: ['parentInd', 'childInd', 'chosen', 'survivor'],
    run: (parents, opts) => elitistReplacement(parents, opts),
  };

  const api = { elitistReplacement, validatePopulation: S.validatePopulation, spec };
  if (isNode) module.exports = api;
  else ((root.GAX = root.GAX || {}).operators = root.GAX.operators || {}).elitism = api;
})(typeof self !== 'undefined' ? self : this);
