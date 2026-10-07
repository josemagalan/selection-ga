/*
 * Reemplazo en estado estacionario (Whitley, 1989, GENITOR; Syswerda, 1991): en cada paso solo
 * entran unos pocos hijos (λ, de 1 a 3), y cada uno sustituye a un miembro de la población:
 *   - al peor (GENITOR): muy elitista, presión alta;
 *   - al más viejo (FIFO): cada individuo vive un número fijo de pasos;
 *   - a uno al azar: sin presión en el reemplazo, el mejor puede perderse.
 * Los hijos ya insertados también pueden ser sustituidos por los siguientes.
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const S = isNode ? require('./sel-utils.js') : root.GAX.selUtils;
  const P = isNode ? require('./repl-utils.js') : root.GAX.replUtils;

  /**
   * opts: { variant: 'worst' | 'oldest' | 'random', offspring: [λ aptitudes], ages: [edad de cada
   * padre], seed | draws: [u por hijo, en [0, 1)] (solo «al azar») }.
   */
  function steadyState(parents, opts) {
    opts = opts || {};
    const err = S.validatePopulation(parents) || P.validateOffspring(opts.offspring);
    if (err) throw new Error(err);
    const mu = parents.length;
    const g = opts.offspring;
    const lambda = g.length;
    const variant = opts.variant === 'oldest' || opts.variant === 'random' ? opts.variant : 'worst';
    const ages = Array.isArray(opts.ages) && opts.ages.length === mu ? opts.ages.slice() : Array(mu).fill(1);
    const src = S.drawSource(opts);
    const all = parents.concat(g);
    const lab = P.labels(mu, lambda);
    const T = S.newTrace(all);
    const age = ages.slice();   // edad de quien ocupa cada hueco

    T.st.rows = ['age'];
    T.snap({ type: 'intro', text: { key: 'intro', params: { mu, lambda } } });
    T.st.pool = S.range(mu);
    T.snap({ type: 'copy', text: { key: 'copy', params: { mu } } });
    const gone = [];
    for (let k = 0; k < lambda; k++) {
      const child = mu + k;
      let v;
      let u = null;
      if (variant === 'worst') {
        v = 0;
        for (let j = 1; j < mu; j++) if (all[T.st.pool[j]] < all[T.st.pool[v]]) v = j;
      } else if (variant === 'oldest') {
        v = 0;
        for (let j = 1; j < mu; j++) if (age[j] > age[v]) v = j;
      } else {
        u = src.next();
        v = Math.floor(u * mu);
      }
      const victim = T.st.pool[v];
      gone.push(victim);
      T.st.pool[v] = child;
      const key = variant === 'worst' ? 'replaceWorst' : variant === 'oldest' ? 'replaceOldest' : 'replaceRandom';
      T.snap({
        type: 'replace',
        text: { key, params: { k: k + 1, child: lab[child], fc: all[child], victim: lab[victim], fv: all[victim], slot: v + 1, age: age[v] } },
        hl: [child, victim],
        newSlot: v,
      });
      for (let j = 0; j < mu; j++) age[j]++;
      age[v] = 0;
    }
    const next = T.st.pool.slice();
    const dp = P.doneParams(all, mu, next, lab);
    T.snap({ type: 'done', text: { key: dp.b1 < dp.b0 ? 'doneLost' : 'done', params: dp }, dim: gone });

    return {
      pool: next,
      steps: T.steps,
      draws: src.used.slice(),
      aux: {
        rows: [{ id: 'age', kind: 'int', values: ages.concat(Array(lambda).fill(null)) }],
        wheel: null, expected: null, labels: lab, groups: P.groups(mu, lambda), fitnessAll: all,
        poolSize: mu, poolLabelKey: 'rowNext', copiesLabelKey: 'row_survives', ages,
      },
    };
  }

  const spec = {
    id: 'steady-state',
    family: 'replacement',
    random: true,
    randomVariants: ['random'],
    replacement: true,
    variants: ['worst', 'oldest', 'random'],
    defaultVariant: 'worst',
    params: [{ id: 'lambda', min: 1, max: 3, step: 1, default: 2 }],
    offspring: (mu, params) => params.lambda,
    legend: ['parentInd', 'childInd', 'chosen', 'survivor'],
    run: (parents, opts) => steadyState(parents, opts),
  };

  const api = { steadyState, validatePopulation: S.validatePopulation, spec };
  if (isNode) module.exports = api;
  else ((root.GAX = root.GAX || {}).operators = root.GAX.operators || {})['steady-state'] = api;
})(typeof self !== 'undefined' ? self : this);
