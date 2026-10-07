/*
 * Ruleta con escalado de la aptitud (Goldberg, 1989). Antes de girar la ruleta, la aptitud f se
 * transforma en f' para controlar la presión de selección:
 *   - escalado lineal: f' = a · f + b, con la media igual y el mejor en cm veces la media; si así
 *     el peor quedara negativo, se escala para que el peor valga 0 (manteniendo la media);
 *   - truncamiento sigma (Forrest, 1985): f' = máx(0, f − (f̄ − c · σ)).
 * Después, ruleta normal con p_i = f'_i / Σf'.
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const S = isNode ? require('./sel-utils.js') : root.GAX.selUtils;

  /** Coeficientes del escalado lineal de Goldberg: { a, b, mode: 'max' | 'min' | 'flat' }. */
  function linearCoefficients(fitness, cm) {
    const n = fitness.length;
    const avg = S.sum(fitness) / n;
    const max = Math.max.apply(null, fitness);
    const min = Math.min.apply(null, fitness);
    if (max === min) return { a: 1, b: 0, mode: 'flat', avg, max, min };
    if (min > (cm * avg - max) / (cm - 1)) {
      const delta = max - avg;
      return { a: ((cm - 1) * avg) / delta, b: (avg * (max - cm * avg)) / delta, mode: 'max', avg, max, min };
    }
    const delta = avg - min;
    return { a: avg / delta, b: (-min * avg) / delta, mode: 'min', avg, max, min };
  }

  /** Aptitud escalada f' (la misma expresión que el código descargable). */
  function scale(fitness, variant, params) {
    if (variant === 'sigma') {
      const c = params.c != null ? params.c : 2;
      const { mean, sd } = S.meanSd(fitness);
      const base = mean - c * sd;
      let fs = fitness.map((f) => Math.max(0, f - base));
      const flat = S.sum(fs) === 0;   // todas iguales: σ = 0 y nadie tendría sector
      if (flat) fs = fitness.slice();
      return { fs, mean, sd, base, c, flat };
    }
    const cm = params.cm != null ? params.cm : 2;
    const k = linearCoefficients(fitness, cm);
    return { fs: fitness.map((f) => Math.max(0, k.a * f + k.b)), cm, ...k };
  }

  /** opts: { variant: 'linear' | 'sigma', params: { cm, c }, seed | draws }. */
  function scaledRoulette(fitness, opts) {
    opts = opts || {};
    const err = S.validateProportional(fitness);
    if (err) throw new Error(err);
    const n = fitness.length;
    const variant = opts.variant === 'sigma' ? 'sigma' : 'linear';
    const sc = scale(fitness, variant, opts.params || {});
    const fs = sc.fs;
    const src = S.drawSource(opts);
    const total0 = S.sum(fitness);
    const total = S.sum(fs);
    const p = fs.map((f) => f / total);
    const q = S.cumulative(p);
    const best = fitness.indexOf(Math.max.apply(null, fitness));
    const T = S.newTrace(fitness);

    T.snap({ type: 'intro', text: { key: 'intro', params: { n } } });
    if (variant === 'linear') {
      T.snap({ type: 'stats', text: { key: 'statsLinear', params: { mean: sc.avg, max: sc.max, min: sc.min } } });
      T.st.bars = fs;
      T.st.rows = ['fs'];
      const key = sc.mode === 'flat' ? 'scaleFlat' : sc.mode === 'min' ? 'scaleLinearMin' : 'scaleLinear';
      T.snap({ type: 'scale', text: { key, params: { a: sc.a, b: sc.b, cm: sc.cm, mean: sc.avg, top: sc.cm * sc.avg, who: S.label(best), fsBest: fs[best] } } });
    } else {
      T.snap({ type: 'stats', text: { key: 'statsSigma', params: { mean: sc.mean, sd: sc.sd } } });
      T.st.bars = fs;
      T.st.rows = ['fs'];
      const zeros = S.range(n).filter((i) => !sc.flat && fs[i] === 0);
      const key = sc.flat ? 'scaleFlat' : zeros.length > 1 ? 'scaleSigmaZeros' : zeros.length ? 'scaleSigmaZero' : 'scaleSigma';
      T.snap({
        type: 'scale',
        text: { key, params: { c: sc.c, base: sc.base, zeros: zeros.map(S.label).join(', '), nz: zeros.length } },
        hl: zeros,
      });
    }
    T.st.sum = true;
    T.snap({ type: 'sum', text: { key: 'sum', params: { total } } });
    T.st.rows = ['fs', 'p'];
    T.st.wheel = true;
    T.snap({ type: 'prob', text: { key: 'prob', params: { who: S.label(best), p: p[best], p0: fitness[best] / total0 } }, hl: [best] });
    T.st.rows = ['fs', 'p', 'q'];
    T.snap({ type: 'cum', text: { key: 'cum', params: { last: S.label(n - 1) } } });
    S.spinLoop(T, src, S.range(n), q);
    const pool = T.st.pool.slice();
    T.snap({
      type: 'done',
      text: { key: 'done', params: Object.assign({ e0: (n * fitness[best]) / total0, e1: n * p[best] }, S.doneParams(fitness, pool)) },
    });

    return {
      pool,
      steps: T.steps,
      draws: src.used.slice(),
      aux: {
        rows: [
          { id: 'fs', kind: 'num', values: fs },
          { id: 'p', kind: 'prob', values: p },
          { id: 'q', kind: 'prob', values: q },
        ],
        wheel: { weights: p, scale: 'prob', total: 1, bounds: q },
        expected: p.map((x) => n * x),
        barsLabelKey: 'bars_fs',
        barsKind: 'num',
        sumSymbol: 'f′',
        sumValue: total,
      },
    };
  }

  const spec = {
    id: 'scaled-roulette',
    family: 'proportional',
    random: true,
    proportional: true,
    variants: ['linear', 'sigma'],
    defaultVariant: 'linear',
    params: [
      { id: 'cm', min: 1.2, max: 3, step: 0.1, default: 2, variants: ['linear'] },
      { id: 'c', min: 1, max: 3, step: 0.5, default: 2, variants: ['sigma'] },
    ],
    legend: ['individual', 'chosen', 'pointer', 'pool'],
    run: (fitness, opts) => scaledRoulette(fitness, opts),
  };

  const api = { scaledRoulette, linearCoefficients, scale, validatePopulation: S.validateProportional, spec };
  if (isNode) module.exports = api;
  else ((root.GAX = root.GAX || {}).operators = root.GAX.operators || {})['scaled-roulette'] = api;
})(typeof self !== 'undefined' ? self : this);
