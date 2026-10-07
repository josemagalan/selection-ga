/*
 * Selección por torneo: para cada padre se toman k individuos al azar (con o sin reemplazo dentro
 * del torneo) y gana el de mayor aptitud. En el torneo estocástico (p < 1), el mejor gana con
 * probabilidad p, el segundo con p(1 − p), el tercero con p(1 − p)², … y el último con el resto;
 * se decide con un único número r: gana el puesto m si r cae en el tramo m de esas probabilidades
 * acumuladas. A igual aptitud, gana el que salió antes en el sorteo.
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const S = isNode ? require('./sel-utils.js') : root.GAX.selUtils;

  /** Probabilidades acumuladas de ganar de los puestos 1…k (la última, 1). */
  function placeCumulative(k, p) {
    const w = [];
    let rest = 1;
    for (let m = 0; m < k - 1; m++) { w.push(rest * p); rest *= 1 - p; }
    w.push(rest);
    return S.cumulative(w);
  }

  /**
   * opts: { variant: 'with' | 'without', params: { k, p }, seed | draws }.
   * draws: por torneo, k números en [0, 1) para elegir a los contendientes (⌊u · tamaño⌋ de los que
   * quedan) y, si p < 1, un número r con dos decimales.
   */
  function tournamentSelection(fitness, opts) {
    opts = opts || {};
    const err = S.validatePopulation(fitness);
    if (err) throw new Error(err);
    const n = fitness.length;
    const params = opts.params || {};
    const without = opts.variant === 'without';
    const k = Math.min(params.k || 2, n);
    const p = params.p == null ? 1 : params.p;
    const src = S.drawSource(opts);
    const thresholds = p < 1 ? placeCumulative(k, p) : null;
    const T = S.newTrace(fitness);

    T.snap({ type: 'intro', text: { key: p < 1 ? 'introStoch' : 'intro', params: { n, k, pt: p } } });

    for (let t = 0; t < n; t++) {
      const avail = S.range(n);
      const cont = [];
      for (let m = 0; m < k; m++) {
        if (without) {
          const j = Math.floor(src.next() * avail.length);
          cont.push(avail.splice(j, 1)[0]);
        } else cont.push(Math.floor(src.next() * n));
      }
      // Puestos: de mayor a menor aptitud; a igual aptitud, por orden de sorteo
      const ranked = cont.map((idx, m) => ({ idx, m })).sort((a, b) => fitness[b.idx] - fitness[a.idx] || a.m - b.m);
      let place = 0;
      let r = null;
      if (thresholds) {
        r = src.next(2);
        place = S.firstAbove(thresholds, r);
      }
      const winner = ranked[place].idx;
      T.st.contestants = cont.map((idx, m) => ({ idx, win: m === ranked[place].m }));
      T.st.pool.push(winner);
      const list = cont.map((idx) => `${S.label(idx)} (${fitness[idx]})`).join(', ');
      let key = 'tour';
      const tp = { t: t + 1, list, who: S.label(winner), f: fitness[winner], pt: p };
      if (thresholds) {
        Object.assign(tp, { r, place: place + 1, lo: place ? thresholds[place - 1] : 0, hi: thresholds[place], bestWho: S.label(ranked[0].idx) });
        key = place === 0 ? 'tourStochBest' : 'tourStochOther';
      }
      if (!thresholds && new Set(cont).size < cont.length) key = 'tourRepeat';
      T.snap({ type: thresholds ? 'tourStoch' : 'tour', text: { key, params: tp }, hl: [winner], newSlot: t });
    }
    T.st.contestants = [];
    const pool = T.st.pool.slice();
    T.snap({ type: 'done', text: { key: 'done', params: Object.assign({ k }, S.doneParams(fitness, pool)) } });

    return {
      pool,
      steps: T.steps,
      draws: src.used.slice(),
      aux: { rows: [], wheel: null, expected: null, thresholds, arena: true },
    };
  }

  const spec = {
    id: 'tournament',
    family: 'tournament',
    random: true,
    variants: ['with', 'without'],
    defaultVariant: 'with',
    params: [
      { id: 'k', min: 2, max: 5, step: 1, default: 2 },
      { id: 'p', min: 0.5, max: 1, step: 0.05, default: 1 },
    ],
    legend: ['individual', 'contestant', 'chosen', 'pool'],
    run: (fitness, opts) => tournamentSelection(fitness, opts),
  };

  const api = { tournamentSelection, placeCumulative, validatePopulation: S.validatePopulation, spec };
  if (isNode) module.exports = api;
  else ((root.GAX = root.GAX || {}).operators = root.GAX.operators || {}).tournament = api;
})(typeof self !== 'undefined' ? self : this);
