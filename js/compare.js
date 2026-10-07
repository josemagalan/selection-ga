/*
 * Muestreo rápido (solo los padres, sin traza) de todos los mecanismos, y las medidas que se
 * calculan con él: copias en muchas repeticiones, métricas de la comparación y la simulación de
 * varias generaciones sin cruce ni mutación (la idea de la app Shiny SelectionMechanisms).
 *
 * Cada muestreador usa exactamente la misma lógica y el mismo orden de números aleatorios que el
 * mecanismo animado (un test lo comprueba con los mismos números), pero acepta poblaciones de
 * cualquier tamaño. next(d) da el siguiente número aleatorio; en las simulaciones se usa sin
 * redondear, porque los dos decimales solo sirven para seguir los pasos a mano.
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const S = isNode ? require('./operators/sel-utils.js') : root.GAX.selUtils;
  const R = isNode ? require('./rng.js') : root.GAX.rng;
  const ops = isNode ? {
    'scaled-roulette': require('./operators/scaled-roulette.js'),
    'linear-ranking': require('./operators/linear-ranking.js'),
    tournament: require('./operators/tournament.js'),
    truncation: require('./operators/truncation.js'),
  } : root.GAX.operators;

  // Ruleta (N giros) o SUS (un giro, N punteros) sobre las acumuladas accSorted, en el orden `order`
  function wheel(order, accSorted, useSus, next) {
    const n = order.length;
    const pool = [];
    if (!useSus) {
      for (let k = 0; k < n; k++) pool.push(order[S.firstAbove(accSorted, next(2))]);
      return pool;
    }
    const r = next(2);
    let j = 0;
    for (let k = 0; k < n; k++) {
      while (j < n - 1 && !(S.r9(r + k) < accSorted[j])) j++;
      pool.push(order[j]);
    }
    return pool;
  }

  const identity = (n) => S.range(n);
  // Probabilidades p = w / Σw y sus acumuladas: de probabilidad (ruleta) o de copias N · p (SUS)
  const probs = (w) => { const total = S.sum(w); return w.map((x) => x / total); };
  const acc = (p, useSus) => S.cumulative(useSus ? p.map((x) => p.length * x) : p);

  /**
   * Muestreadores: (fitness, { variant, params }, next) → índices de los padres.
   * Las probabilidades se calculan con las mismas expresiones que los mecanismos animados.
   */
  const SAMPLERS = {
    roulette: (f, o, next) => wheel(identity(f.length), S.cumulative(probs(f)), false, next),
    sus: (f, o, next) => {
      const n = f.length;
      const total = S.sum(f);
      return wheel(identity(n), S.cumulative(f.map((x) => (n * x) / total)), true, next);
    },
    offset: (f, o, next) => {
      const shift = o.params.shift != null ? o.params.shift : 1000;
      return wheel(identity(f.length), S.cumulative(probs(f.map((x) => x + shift))), false, next);
    },
    'scaled-roulette': (f, o, next) => {
      const fs = ops['scaled-roulette'].scale(f, o.variant === 'sigma' ? 'sigma' : 'linear', o.params).fs;
      return wheel(identity(f.length), S.cumulative(probs(fs)), false, next);
    },
    boltzmann: (f, o, next) => {
      const temp = o.params.temp != null ? o.params.temp : 10;
      const fmax = Math.max.apply(null, f);
      const useSus = o.variant === 'sus';
      return wheel(identity(f.length), acc(probs(f.map((x) => Math.exp((x - fmax) / temp))), useSus), useSus, next);
    },
    'linear-ranking': (f, o, next) => {
      const n = f.length;
      const s = o.params.sp != null ? o.params.sp : 1.5;
      const useSus = o.variant === 'sus';
      const order = S.ascending(f);
      return wheel(order, acc(order.map((_, j) => ops['linear-ranking'].rankProb(j, n, s)), useSus), useSus, next);
    },
    'exponential-ranking': (f, o, next) => {
      const n = f.length;
      const c = o.params.base != null ? o.params.base : 0.8;
      const useSus = o.variant === 'sus';
      const order = S.ascending(f);
      return wheel(order, acc(probs(order.map((_, j) => Math.pow(c, n - 1 - j))), useSus), useSus, next);
    },
    tournament: (f, o, next) => {
      const n = f.length;
      const k = Math.min(o.params.k || 2, n);
      const p = o.params.p == null ? 1 : o.params.p;
      const without = o.variant === 'without';
      const thresholds = p < 1 ? ops.tournament.placeCumulative(k, p) : null;
      const pool = [];
      for (let t = 0; t < n; t++) {
        const avail = without ? S.range(n) : null;
        const cont = [];
        for (let m = 0; m < k; m++) {
          if (without) cont.push(avail.splice(Math.floor(next() * avail.length), 1)[0]);
          else cont.push(Math.floor(next() * n));
        }
        const ranked = cont.map((idx, m) => ({ idx, m })).sort((a, b) => f[b.idx] - f[a.idx] || a.m - b.m);
        pool.push(ranked[thresholds ? S.firstAbove(thresholds, next(2)) : 0].idx);
      }
      return pool;
    },
    truncation: (f, o, next) => {
      const n = f.length;
      const cut = ops.truncation.cutSize(n, o.params.tau != null ? o.params.tau : 0.5);
      const top = S.ascending(f).slice(n - cut).reverse();
      const pool = [];
      for (let k = 0; k < n; k++) pool.push(o.variant === 'cyclic' ? top[k % cut] : top[Math.floor(next() * cut)]);
      return pool;
    },
  };

  /** Números aleatorios sin redondear de mulberry32(seed). */
  function rawSource(seed) {
    const rand = R.mulberry32(seed >>> 0);
    return () => rand();
  }

  /**
   * Copias de cada individuo en `reps` repeticiones: { dist: [i][c] frecuencias relativas,
   * mean: [i] copias medias, sd: [i] desviación típica, maxC }.
   */
  function copiesDistribution(id, fitness, o, reps, seed) {
    const n = fitness.length;
    const next = rawSource(seed);
    const counts = Array.from({ length: n }, () => Array(n + 1).fill(0));
    for (let t = 0; t < reps; t++) {
      const c = S.copies(n, SAMPLERS[id](fitness, o, next));
      c.forEach((x, i) => { counts[i][x]++; });
    }
    let maxC = 0;
    counts.forEach((row) => row.forEach((x, c) => { if (x) maxC = Math.max(maxC, c); }));
    const dist = counts.map((row) => row.map((x) => x / reps));
    const mean = dist.map((row) => row.reduce((s, p, c) => s + p * c, 0));
    const sd = dist.map((row, i) => Math.sqrt(row.reduce((s, p, c) => s + p * (c - mean[i]) * (c - mean[i]), 0)));
    return { dist, mean, sd, maxC };
  }

  /**
   * Métricas de un mecanismo sobre una población, en `reps` repeticiones (Blickle y Thiele, 1996;
   * Baker, 1987):
   *   best      copias medias del mejor
   *   intensity intensidad de selección: (media de los padres − media de la población) / σ
   *   lost      pérdida de diversidad: proporción media de individuos sin ninguna copia
   *   spread    variabilidad del muestreo: desviación típica media de las copias de cada individuo
   */
  function metrics(id, fitness, o, reps, seed) {
    const n = fitness.length;
    const next = rawSource(seed);
    const { mean: m0, sd: s0 } = S.meanSd(fitness);
    const best = fitness.indexOf(Math.max.apply(null, fitness));
    const sumC = Array(n).fill(0);
    const sumC2 = Array(n).fill(0);
    let intensity = 0;
    let lost = 0;
    for (let t = 0; t < reps; t++) {
      const pool = SAMPLERS[id](fitness, o, next);
      const c = S.copies(n, pool);
      c.forEach((x, i) => { sumC[i] += x; sumC2[i] += x * x; });
      intensity += S.sum(pool.map((i) => fitness[i])) / n - m0;
      lost += c.filter((x) => x === 0).length / n;
    }
    const sd = sumC.map((s, i) => Math.sqrt(Math.max(0, sumC2[i] / reps - (s / reps) * (s / reps))));
    return {
      best: sumC[best] / reps,
      intensity: s0 > 0 ? intensity / reps / s0 : null,
      lost: lost / reps,
      spread: S.sum(sd) / n,
    };
  }

  /**
   * Simulación de varias generaciones solo con selección (sin cruce ni mutación): cada generación
   * es la población de padres de la anterior. Población de `size` individuos con aptitudes enteras
   * al azar entre 1 y 100; `runs` repeticiones con poblaciones distintas. Devuelve, por generación,
   * la media de individuos distintos y de la aptitud media, y el tiempo de toma de control (la
   * generación en que todos son copias del mejor inicial; null si no ocurre o el mejor se pierde).
   */
  function simulate(id, o, { size = 50, gens = 40, runs = 50, seed = 1 } = {}) {
    const distinct = Array(gens + 1).fill(0);
    const meanFit = Array(gens + 1).fill(0);
    const takeover = [];
    let bestLost = 0;
    for (let run = 0; run < runs; run++) {
      const rp = R.mulberry32(seed * 7919 + run);
      const fit = Array.from({ length: size }, () => R.randInt(rp, 1, 100));
      const fmax = Math.max.apply(null, fit);
      const next = rawSource(seed * 104729 + run + 1);
      let ids = S.range(size);
      let tko = null;
      for (let g = 0; g <= gens; g++) {
        const f = ids.map((i) => fit[i]);
        distinct[g] += new Set(ids).size;
        meanFit[g] += S.sum(f) / size;
        if (tko == null && f.every((x) => x === fmax)) tko = g;
        if (g === gens) break;
        const pool = SAMPLERS[id](f, o, next);
        ids = pool.map((k) => ids[k]);
      }
      if (!ids.some((i) => fit[i] === fmax)) bestLost++;
      if (tko != null) takeover.push(tko);
    }
    takeover.sort((a, b) => a - b);
    return {
      distinct: distinct.map((x) => x / runs),
      meanFit: meanFit.map((x) => x / runs),
      takeover: takeover.length > runs / 2 ? takeover[Math.floor((takeover.length - 1) / 2)] : null,
      takeoverShare: takeover.length / runs,
      bestLost: bestLost / runs,
    };
  }

  const api = { SAMPLERS, wheel, rawSource, copiesDistribution, metrics, simulate };
  if (isNode) module.exports = api;
  else (root.GAX = root.GAX || {}).compare = api;
})(typeof self !== 'undefined' ? self : this);
