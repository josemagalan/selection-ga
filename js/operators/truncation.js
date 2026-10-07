/*
 * Selección por truncamiento (Mühlenbein y Schlierkamp-Voosen, 1993): se ordena la población y
 * solo los T = ⌈τ · N⌉ mejores pueden ser padres. Variante «al azar»: cada padre se
 * elige con igual probabilidad entre esos T (Blickle y Thiele, 1996). Variante «por turnos»: los
 * T mejores se copian por orden, del mejor hacia abajo, hasta llenar los N huecos, de modo que
 * cada uno recibe N/T copias (los mejores, una más si no es exacto).
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const S = isNode ? require('./sel-utils.js') : root.GAX.selUtils;

  /** Cuántos de los mejores pasan el corte: ⌈τ · N⌉ (al menos uno), como en la app Shiny SelectionMechanisms. */
  function cutSize(n, tau) {
    return Math.max(1, Math.ceil(S.r9(tau * n)));
  }

  /** opts: { variant: 'random' | 'cyclic', params: { tau }, seed | draws (u en [0, 1) por padre) }. */
  function truncationSelection(fitness, opts) {
    opts = opts || {};
    const err = S.validatePopulation(fitness);
    if (err) throw new Error(err);
    const n = fitness.length;
    const tau = opts.params && opts.params.tau != null ? opts.params.tau : 0.5;
    const cyclic = opts.variant === 'cyclic';
    const src = S.drawSource(opts);
    const order = S.ascending(fitness);
    const rank = Array(n);
    order.forEach((idx, j) => { rank[idx] = j + 1; });
    const cut = cutSize(n, tau);
    const top = order.slice(n - cut).reverse();       // del mejor hacia abajo
    const T = S.newTrace(fitness);
    const ties = fitness.length - new Set(fitness).size > 0;

    T.snap({ type: 'intro', text: { key: 'intro', params: { n } } });
    T.st.order = order.slice();
    T.st.rows = ['rank'];
    T.snap({
      type: 'sort',
      text: { key: ties ? 'sortTies' : 'sort', params: { worst: S.label(order[0]), best: S.label(order[n - 1]), n } },
    });
    T.st.cut = cut;
    const out = order.slice(0, n - cut);
    T.snap({
      type: 'cut',
      text: { key: out.length ? 'cut' : 'cutAll', params: { tau, n, cut, top: top.map(S.label).join(', '), out: out.map(S.label).join(', ') } },
      hl: top.slice(),
      dim: out,
    });

    for (let k = 0; k < n; k++) {
      let j;
      let u = null;
      if (cyclic) j = k % cut;
      else { u = src.next(); j = Math.floor(u * cut); }
      const i = top[j];
      T.st.pool.push(i);
      T.snap({
        type: 'pick',
        text: { key: cyclic ? 'pickCyclic' : 'pick', params: { k: k + 1, cut, who: S.label(i), place: j + 1 } },
        hl: [i],
        dim: out,
        newSlot: k,
      });
    }
    const pool = T.st.pool.slice();
    T.snap({ type: 'done', text: { key: 'done', params: Object.assign({ cut }, S.doneParams(fitness, pool)) }, dim: out });

    const expected = Array(n).fill(0);
    if (cyclic) pool.forEach((i) => { expected[i]++; });
    else top.forEach((i) => { expected[i] = n / cut; });
    return {
      pool,
      steps: T.steps,
      draws: src.used.slice(),
      aux: { rows: [{ id: 'rank', kind: 'int', values: rank }], wheel: null, expected, cut, top },
    };
  }

  const spec = {
    id: 'truncation',
    family: 'rank',
    random: true,
    variants: ['random', 'cyclic'],
    defaultVariant: 'random',
    params: [{ id: 'tau', min: 0.1, max: 1, step: 0.1, default: 0.5 }],
    legend: ['individual', 'cut', 'chosen', 'pool'],
    run: (fitness, opts) => truncationSelection(fitness, opts),
  };

  const api = { truncationSelection, cutSize, validatePopulation: S.validatePopulation, spec };
  if (isNode) module.exports = api;
  else ((root.GAX = root.GAX || {}).operators = root.GAX.operators || {}).truncation = api;
})(typeof self !== 'undefined' ? self : this);
