/*
 * Modo práctica («predice los padres»): los datos que el mecanismo ha sorteado, sin los cuales la
 * población de padres no tendría una única respuesta, y la corrección hueco a hueco.
 * Lo que no es azar (probabilidades, acumuladas, orden, rangos, ganador de cada torneo) lo calcula
 * quien practica.
 */
(function (root) {
  'use strict';
  const isNode = typeof module !== 'undefined' && module.exports;
  const S = isNode ? require('./operators/sel-utils.js') : root.GAX.selUtils;

  /**
   * Datos sorteados de una traza: { global: [{ key, params }], slots: [{ k, key, params }] }.
   *   spin        un r por giro de la ruleta
   *   pointers    el único r de SUS (los punteros son r, r + 1, …)
   *   tour        los contendientes de cada torneo (y su r, si es estocástico)
   *   pick        truncamiento al azar: qué puesto de entre los T mejores ha salido
   */
  function givens(result) {
    const out = { global: [], slots: [] };
    result.steps.forEach((st) => {
      const p = st.text.params || {};
      if (st.type === 'spin') out.slots.push({ k: p.k, key: 'pgSpin', params: { r: p.r } });
      else if (st.type === 'pointers') out.global.push({ key: 'pgPointers', params: { r: p.r } });
      else if (st.type === 'tour') out.slots.push({ k: p.t, key: 'pgTour', params: { list: p.list } });
      else if (st.type === 'tourStoch') out.slots.push({ k: p.t, key: 'pgTourStoch', params: { list: p.list, r: p.r } });
      else if (st.type === 'pick' && st.text.key === 'pick' && p.place != null && p.ptr == null) {
        out.slots.push({ k: p.k, key: 'pgPlace', params: { place: p.place } });
      }
    });
    return out;
  }

  /** Lee la respuesta: letras separadas o seguidas («A A D C», «a,a,d,c», «AADC»). */
  function parseGuess(text, n) {
    const clean = String(text || '').toUpperCase().replace(/[\s,;·-]+/g, '');
    if (!clean.length) return { error: 'errGuessEmpty' };
    const letters = clean.split('');
    const valid = S.LABELS.slice(0, n);
    if (letters.some((c) => valid.indexOf(c) === -1)) return { error: 'errGuessLetters' };
    if (letters.length !== n) return { error: 'errGuessLength' };
    return { guess: letters.map((c) => valid.indexOf(c)) };
  }

  /** Corrección hueco a hueco: [{ guess, correct, ok }]. */
  function grade(guess, pool) {
    return pool.map((correct, k) => ({ guess: guess[k], correct, ok: guess[k] === correct }));
  }

  const api = { givens, parseGuess, grade };
  if (isNode) module.exports = api;
  else (root.GAX = root.GAX || {}).practice = api;
})(typeof self !== 'undefined' ? self : this);
