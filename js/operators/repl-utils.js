/*
 * Utilidades comunes de los mecanismos de reemplazo (selección de supervivientes). Además de la
 * población de μ padres (A, B, C…), hay λ hijos (a, b, c…) ya creados por cruce y mutación; el
 * reemplazo decide quiénes forman la generación siguiente, de μ individuos.
 *
 * En la vista, las columnas son los padres seguidos de los hijos: el índice i < μ es el padre i y
 * el índice μ + k es el hijo k.
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const S = isNode ? require('./sel-utils.js') : root.GAX.selUtils;
  const R = S.R;

  const CHILD_LABELS = 'abcdefghijkl'.split('');
  const MAX_LAMBDA = 12;

  /** Etiquetas de las columnas: los padres en mayúscula y los hijos en minúscula. */
  const labels = (mu, lambda) => S.LABELS.slice(0, mu).concat(CHILD_LABELS.slice(0, lambda));
  const groups = (mu, lambda) => Array(mu).fill('p').concat(Array(lambda).fill('o'));

  /** Hijos al azar (aptitud 1–40) y edades de los padres (1–5 generaciones), a partir de la semilla. */
  function randomOffspring(seed, lambda) {
    const r = R.mulberry32((seed * 7 + 12345) >>> 0);
    return Array.from({ length: lambda }, () => R.randInt(r, 1, 40));
  }
  function randomAges(seed, mu) {
    const r = R.mulberry32((seed * 13 + 999) >>> 0);
    return Array.from({ length: mu }, () => R.randInt(r, 1, 5));
  }

  /** Hijos válidos: entre 1 y 12 aptitudes enteras de 0 a 999. */
  function validateOffspring(g, lambda) {
    if (!Array.isArray(g) || g.some((v) => typeof v !== 'number' || Number.isNaN(v))) return 'errFormat';
    if (g.length < 1 || g.length > MAX_LAMBDA || (lambda != null && g.length !== lambda)) return 'errLambda';
    if (g.some((v) => !Number.isInteger(v) || v < 0 || v > S.MAX_F)) return 'errFitness';
    return null;
  }

  /** Índices de un subconjunto ordenados de menor a mayor aptitud; a igual aptitud, por índice. */
  function ascendingOf(all, idx) {
    return idx.slice().sort((a, b) => all[a] - all[b] || a - b);
  }

  /** Parámetros de la narración final: quién sobrevive y cómo cambia la aptitud. */
  function doneParams(all, mu, next, lab) {
    const parents = next.filter((i) => i < mu).length;
    const mean0 = S.sum(all.slice(0, mu)) / mu;
    const mean1 = S.sum(next.map((i) => all[i])) / next.length;
    const best0 = Math.max.apply(null, all.slice(0, mu));
    const best1 = Math.max.apply(null, next.map((i) => all[i]));
    return {
      next: next.map((i) => lab[i]).join(' '),
      parents,
      children: next.length - parents,
      m0: Math.round(mean0 * 10) / 10,
      m1: Math.round(mean1 * 10) / 10,
      b0: best0,
      b1: best1,
    };
  }

  const api = { CHILD_LABELS, MAX_LAMBDA, labels, groups, randomOffspring, randomAges, validateOffspring, ascendingOf, doneParams };
  if (isNode) module.exports = api;
  else (root.GAX = root.GAX || {}).replUtils = api;
})(typeof self !== 'undefined' ? self : this);
