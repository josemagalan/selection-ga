/*
 * Ranking lineal (Baker 1985): se ordena la población de peor a mejor y cada individuo recibe un
 * rango j = 0 (el peor), …, N − 1 (el mejor). Su probabilidad solo depende del rango:
 *   p(j) = (2 − s) / N + 2 · j · (s − 1) / (N · (N − 1)),   con 1 ≤ s ≤ 2,
 * de modo que el mejor espera s copias y el peor 2 − s (Eiben y Smith, 2015, apartado 5.2.2).
 * Después se muestrea como en la ruleta (N giros) o como en SUS (un giro, N punteros).
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const S = isNode ? require('./sel-utils.js') : root.GAX.selUtils;

  /** Probabilidad del rango j (0 = peor) con presión s; la misma expresión que el código descargable. */
  function rankProb(j, n, s) {
    return (2 - s) / n + (2 * j * (s - 1)) / (n * (n - 1));
  }

  /** opts: { variant: 'roulette' | 'sus', params: { sp: s }, seed | draws }. */
  function linearRanking(fitness, opts) {
    opts = opts || {};
    const err = S.validatePopulation(fitness);
    if (err) throw new Error(err);
    const n = fitness.length;
    const s = opts.params && opts.params.sp != null ? opts.params.sp : 1.5;
    const useSus = opts.variant === 'sus';
    const src = S.drawSource(opts);
    const order = S.ascending(fitness);                 // de peor a mejor
    const rank = Array(n);
    order.forEach((idx, j) => { rank[idx] = j; });
    const p = Array(n);
    order.forEach((idx, j) => { p[idx] = rankProb(j, n, s); });
    const e = p.map((x) => n * x);
    // Acumuladas en el orden de los rangos (de peor a mejor), igual que el código descargable
    const accSorted = S.cumulative(order.map((idx) => (useSus ? n * p[idx] : p[idx])));
    const acc = Array(n);
    order.forEach((idx, j) => { acc[idx] = accSorted[j]; });
    const T = S.newTrace(fitness);
    const ties = fitness.length - new Set(fitness).size > 0;

    T.snap({ type: 'intro', text: { key: 'intro', params: { n } } });
    T.st.order = order.slice();
    T.st.rows = ['rank'];
    T.snap({
      type: 'sort',
      text: { key: ties ? 'sortTies' : 'sort', params: { worst: S.label(order[0]), best: S.label(order[n - 1]), n } },
    });
    T.st.rows = useSus ? ['rank', 'e'] : ['rank', 'p'];
    T.st.wheel = true;
    const bi = order[n - 1];
    const wi = order[0];
    T.snap({
      type: 'prob',
      text: {
        key: useSus ? 'probSus' : 'prob',
        params: { s, n, pBest: p[bi], pWorst: p[wi], eBest: e[bi], eWorst: e[wi], best: S.label(bi), worst: S.label(wi) },
      },
      hl: [bi, wi],
    });
    T.st.rows = useSus ? ['rank', 'e', 'E'] : ['rank', 'p', 'q'];
    T.snap({ type: 'cum', text: { key: useSus ? 'cumSus' : 'cum', params: { n, best: S.label(bi) } } });

    // Tramo [lo, hi) de un individuo en el orden de los rangos
    const lo = (idx) => (rank[idx] ? accSorted[rank[idx] - 1] : 0);
    if (!useSus) {
      for (let k = 0; k < n; k++) {
        const r = src.next(2);
        const j = S.firstAbove(accSorted, r);
        const i = order[j];
        T.settlePointers();
        T.st.pointers.push({ pos: r, value: r, hit: i, state: 'active' });
        T.st.pool.push(i);
        T.snap({
          type: 'spin',
          text: { key: 'spin', params: { k: k + 1, r, who: S.label(i), lo: lo(i), hi: acc[i], rank: j + 1 } },
          hl: [i],
          newSlot: k,
        });
      }
    } else {
      const r = src.next(2);
      for (let k = 0; k < n; k++) T.st.pointers.push({ pos: (r + k) / n, value: r + k, hit: null, state: 'pending' });
      T.snap({ type: 'pointers', text: { key: 'pointers', params: { r, n, last: r + n - 1 } } });
      let j = 0;
      for (let k = 0; k < n; k++) {
        while (j < n - 1 && !(S.r9(r + k) < accSorted[j])) j++;
        const i = order[j];
        T.st.pointers.forEach((ptr, m) => { if (m < k) ptr.state = 'done'; });
        T.st.pointers[k].state = 'active';
        T.st.pointers[k].hit = i;
        T.st.pool.push(i);
        T.snap({
          type: 'pick',
          text: { key: 'pick', params: { k: k + 1, ptr: r + k, who: S.label(i), elo: lo(i), ehi: acc[i], rank: j + 1 } },
          hl: [i],
          newSlot: k,
        });
      }
    }
    T.settlePointers();
    const pool = T.st.pool.slice();
    T.snap({ type: 'done', text: { key: 'done', params: Object.assign({ s }, S.doneParams(fitness, pool)) } });

    const rows = [{ id: 'rank', kind: 'int', values: rank.map((j) => j + 1) }];
    if (useSus) rows.push({ id: 'e', kind: 'exp', values: e }, { id: 'E', kind: 'exp', values: acc });
    else rows.push({ id: 'p', kind: 'prob', values: p }, { id: 'q', kind: 'prob', values: acc });
    return {
      pool,
      steps: T.steps,
      draws: src.used.slice(),
      aux: {
        rows,
        wheel: useSus
          ? { weights: e, scale: 'exp', total: n, bounds: acc }
          : { weights: p, scale: 'prob', total: 1, bounds: acc },
        expected: e,
      },
    };
  }

  const spec = {
    id: 'linear-ranking',
    family: 'rank',
    random: true,
    variants: ['roulette', 'sus'],
    defaultVariant: 'roulette',
    params: [{ id: 'sp', min: 1, max: 2, step: 0.1, default: 1.5 }],
    legend: ['individual', 'chosen', 'pointer', 'pool'],
    run: (fitness, opts) => linearRanking(fitness, opts),
  };

  const api = { linearRanking, rankProb, validatePopulation: S.validatePopulation, spec };
  if (isNode) module.exports = api;
  else ((root.GAX = root.GAX || {}).operators = root.GAX.operators || {})['linear-ranking'] = api;
})(typeof self !== 'undefined' ? self : this);
